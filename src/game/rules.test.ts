import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRolesAndCards,
  checkWinner,
  enforceMafiaCount,
  resolveDayVotes,
  resolveNightPhase,
  validatePlayerName,
} from './rules';
import { GameRoomEngine } from './engine';
import { ALL_ABILITY_IDS } from '../shared/abilities';
import { DEFAULT_APPEARANCE, getDefaultAppearanceForGender } from '../shared/catalog';
import { DICTIONARY } from '../shared/i18n';

test('strict player name validation enforces empty, length, and EN/AR support', () => {
  assert.equal(validatePlayerName('').valid, false);
  assert.equal(validatePlayerName('   ').error, 'NAME_REQUIRED');
  assert.equal(validatePlayerName('A').error, 'NAME_TOO_SHORT');
  assert.equal(validatePlayerName('ThisNameIsWayTooLongForMafia').error, 'NAME_TOO_LONG');
  assert.equal(validatePlayerName('Bad@Name!').error, 'NAME_INVALID');

  const en = validatePlayerName('  Don Vito  ');
  assert.equal(en.valid, true);
  assert.equal(en.trimmed, 'Don Vito');

  const ar = validatePlayerName('  طارق المافيا  ');
  assert.equal(ar.valid, true);
  assert.equal(ar.trimmed, 'طارق المافيا');
});

test('mafia scaling rule strictly locks mafia count to 1 whenever players <= 6', () => {
  for (let count = 1; count <= 6; count++) {
    assert.equal(enforceMafiaCount(count, 2), 1);
    assert.equal(enforceMafiaCount(count, 1), 1);
  }
  assert.equal(enforceMafiaCount(7, 2), 2);
  assert.equal(enforceMafiaCount(10, 2), 2);
  assert.equal(enforceMafiaCount(8, 1), 1);
});

test('role and ability card distribution enforces exact pools and uniqueness', () => {
  // 6 players requesting 2 mafias -> must force 1 mafia, 1 doctor, 1 detective, 3 civilians
  const sixIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const six = assignRolesAndCards(sixIds, 2);
  const sixRoles = Object.values(six.roles);
  assert.equal(sixRoles.filter((r) => r === 'mafia').length, 1);
  assert.equal(sixRoles.filter((r) => r === 'doctor').length, 1);
  assert.equal(sixRoles.filter((r) => r === 'detective').length, 1);
  assert.equal(sixRoles.filter((r) => r === 'civilian').length, 3);

  // 10 players with 1 mafia -> 7 civilians, max 6 unique civilian cards dealt
  const tenIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
  const tenOneMafia = assignRolesAndCards(tenIds, 1);
  const civs = tenIds.filter((id) => tenOneMafia.roles[id] === 'civilian');
  assert.equal(civs.length, 7);
  const civCards = civs.map((id) => tenOneMafia.abilities[id]).filter(Boolean);
  assert.equal(civCards.length, 6);
  assert.equal(new Set(civCards).size, 6);

  // 8 players with 2 mafias -> 2 distinct mafia ability cards
  const eightIds = tenIds.slice(0, 8);
  const eightTwoMafia = assignRolesAndCards(eightIds, 2);
  const mafias = eightIds.filter((id) => eightTwoMafia.roles[id] === 'mafia');
  assert.equal(mafias.length, 2);
  assert.notEqual(eightTwoMafia.abilities[mafias[0]], eightTwoMafia.abilities[mafias[1]]);
});

test('night resolution handles doctor save, shadow swap break, cleanse guard override, and self-revive', () => {
  // Normal doctor protection saves target
  const saved = resolveNightPhase({
    mafiaSelections: { m1: 'c1' },
    doctorId: 'doc',
    doctorProtectedIds: ['c1'],
    doctorCleanseTargetId: null,
    doctorSelfReviveArmed: false,
    bodyguardTargetId: null,
    shadowSwapTargetId: null,
    silencerTargetId: null,
    falseTrailTargetId: null,
  });
  assert.equal(saved.eliminatedId, null);
  assert.equal(saved.saved, true);

  // Shadow Swap breaks normal Doctor shield
  const broken = resolveNightPhase({
    mafiaSelections: { m1: 'c1' },
    doctorId: 'doc',
    doctorProtectedIds: ['c1'],
    doctorCleanseTargetId: null,
    doctorSelfReviveArmed: false,
    bodyguardTargetId: null,
    shadowSwapTargetId: 'c1',
    silencerTargetId: null,
    falseTrailTargetId: null,
  });
  assert.equal(broken.eliminatedId, 'c1');
  assert.equal(broken.saved, false);

  // Cleanse Guard cancels Shadow Swap AND Silencer targeting the cleansed player
  const cleansed = resolveNightPhase({
    mafiaSelections: { m1: 'c1' },
    doctorId: 'doc',
    doctorProtectedIds: ['c1'],
    doctorCleanseTargetId: 'c1',
    doctorSelfReviveArmed: false,
    bodyguardTargetId: null,
    shadowSwapTargetId: 'c1',
    silencerTargetId: 'c1',
    falseTrailTargetId: null,
  });
  assert.equal(cleansed.eliminatedId, null);
  assert.equal(cleansed.saved, true);
  assert.equal(cleansed.silencedId, null);

  // Doctor Emergency Self-Revive saves doctor once
  const selfRevive = resolveNightPhase({
    mafiaSelections: { m1: 'doc' },
    doctorId: 'doc',
    doctorProtectedIds: ['c1'],
    doctorCleanseTargetId: null,
    doctorSelfReviveArmed: true,
    bodyguardTargetId: null,
    shadowSwapTargetId: null,
    silencerTargetId: null,
    falseTrailTargetId: null,
  });
  assert.equal(selfRevive.eliminatedId, null);
  assert.equal(selfRevive.saved, true);
  assert.equal(selfRevive.selfReviveConsumed, true);
});

test('day vote resolution handles vote thief, shielded vote, redirect, skip majority, and tiebreaker', () => {
  // Vote Thief steals p2 vote from p1 and puts it on p3
  const stolen = resolveDayVotes({
    alivePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    rawVotes: { p1: 'p3', p2: 'p1', p3: 'p1', p4: 'SKIP' },
    doubleVoters: [],
    voteThief: { victimId: 'p2', forcedTargetId: 'p3' },
    shieldedPlayerIds: [],
    voteRedirects: {},
  });
  assert.equal(stolen.outcome, 'eliminated');
  assert.equal(stolen.eliminatedId, 'p3');

  // Shielded vote prevents votes against p1
  const shielded = resolveDayVotes({
    alivePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    rawVotes: { p2: 'p1', p3: 'p1', p4: 'p2', p1: 'p2' },
    doubleVoters: [],
    shieldedPlayerIds: ['p1'],
    voteRedirects: {},
  });
  assert.equal(shielded.eliminatedId, 'p2');

  // Tie broken by Tiebreaker card holder
  const tiebreak = resolveDayVotes({
    alivePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    rawVotes: { p1: 'p2', p2: 'p1', p3: 'p2', p4: 'p1' },
    doubleVoters: [],
    shieldedPlayerIds: [],
    voteRedirects: {},
    tiebreakerVoterId: 'p3',
  });
  assert.equal(tiebreak.outcome, 'eliminated');
  assert.equal(tiebreak.eliminatedId, 'p2');

  // Skip majority prevents elimination
  const skipped = resolveDayVotes({
    alivePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    rawVotes: { p1: 'SKIP', p2: 'SKIP', p3: 'p4', p4: 'SKIP' },
    doubleVoters: [],
    shieldedPlayerIds: [],
    voteRedirects: {},
  });
  assert.equal(skipped.outcome, 'skipped');
  assert.equal(skipped.eliminatedId, null);
});

test('win condition triggers correctly for civilians and mafia', () => {
  assert.equal(
    checkWinner([
      { alive: true, role: 'civilian' },
      { alive: true, role: 'doctor' },
      { alive: false, role: 'mafia' },
    ]),
    'civilians',
  );
  assert.equal(
    checkWinner([
      { alive: true, role: 'mafia' },
      { alive: true, role: 'doctor' },
    ]),
    'mafia',
  );
  assert.equal(
    checkWinner([
      { alive: true, role: 'mafia' },
      { alive: true, role: 'doctor' },
      { alive: true, role: 'civilian' },
    ]),
    null,
  );
});

test('engine enforces name gate, minimum 4 players, and zero role leaks in views', () => {
  let latestViews = new Map();
  const engine = new GameRoomEngine((_code, views) => {
    latestViews = views;
  });

  // Empty name rejected
  const bad = engine.createRoom('u1', '   ');
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'NAME_REQUIRED');

  const created = engine.createRoom('u1', 'Alex');
  assert.equal(created.ok, true);
  assert.ok(created.data?.roomCode);

  // Cannot start with < 4 players
  engine.setReady('u1', true);
  const tooFew = engine.startGame('u1');
  assert.equal(tooFew.ok, false);
  assert.equal(tooFew.error, 'MIN_PLAYERS_REQUIRED');

  // Add 3 bots -> 4 players total -> start succeeds
  engine.addBot('u1', 'en');
  engine.addBot('u1', 'en');
  engine.addBot('u1', 'en');
  const started = engine.startGame('u1');
  assert.equal(started.ok, true);

  // Check zero role leaks in human view
  const view = latestViews.get('u1');
  assert.ok(view);
  assert.ok(view.me.role !== null);
  for (const p of view.players) {
    if (p.id !== 'u1' && !(view.me.role === 'mafia' && p.revealedRole === 'mafia')) {
      assert.equal(p.revealedRole, undefined);
    }
  }

  engine.dispose();
});

test('all 21 ability cards have non-empty English and Arabic translations', () => {
  assert.equal(ALL_ABILITY_IDS.length, 21);
  for (const id of ALL_ABILITY_IDS) {
    assert.ok(DICTIONARY.en.abilities[id]?.name.length > 0, `Missing EN name for ${id}`);
    assert.ok(DICTIONARY.en.abilities[id]?.desc.length > 0, `Missing EN desc for ${id}`);
    assert.ok(DICTIONARY.ar.abilities[id]?.name.length > 0, `Missing AR name for ${id}`);
    assert.ok(DICTIONARY.ar.abilities[id]?.desc.length > 0, `Missing AR desc for ${id}`);
  }
});

test('bots are registered in engine playerToRoom so bot turns and auto-skip succeed', () => {
  let latestViews = new Map();
  const engine = new GameRoomEngine((_code, views) => {
    latestViews = views;
  });

  const created = engine.createRoom('host1', 'Commander');
  assert.equal(created.ok, true);
  engine.addBot('host1', 'en');
  engine.addBot('host1', 'en');
  engine.addBot('host1', 'en');

  const view = latestViews.get('host1');
  assert.ok(view);
  const bots = view.players.filter((p: { isBot: boolean }) => p.isBot);
  assert.equal(bots.length, 3);
  for (const b of bots) {
    assert.equal(engine.getRoomCodeForPlayer(b.id), created.data?.roomCode);
  }

  engine.dispose();
});

test('default appearance starts with No Hat and gender switch resets curated starter outfit cleanly', () => {
  assert.equal(DEFAULT_APPEARANCE.gender, 'male');
  assert.equal(DEFAULT_APPEARANCE.hatId, 'none');
  assert.equal(DEFAULT_APPEARANCE.suitId, 0);
  assert.equal(DEFAULT_APPEARANCE.pantsId, 0);
  assert.equal(DEFAULT_APPEARANCE.hairId, 0);

  const femaleReset = getDefaultAppearanceForGender('female', {
    skinColor: '#A96B45',
    hairColor: '#9333EA',
  });
  assert.equal(femaleReset.gender, 'female');
  assert.equal(femaleReset.suitId, 0);
  assert.equal(femaleReset.pantsId, 0);
  assert.equal(femaleReset.hairId, 0);
  assert.equal(femaleReset.hatId, 'none');
  assert.equal(femaleReset.skinColor, '#A96B45');
  assert.equal(femaleReset.hairColor, '#9333EA');

  let latestViews = new Map();
  const engine = new GameRoomEngine((_code, views) => {
    latestViews = views;
  });
  const created = engine.createRoom('u1', 'Vito');
  assert.equal(created.ok, true);

  // Equip hat -> switch back to 'none' -> switch gender
  engine.updateAppearance('u1', { ...DEFAULT_APPEARANCE, hatId: 3, suitId: 5, hairId: 4 });
  assert.equal(latestViews.get('u1')?.players[0].appearance.hatId, 3);

  engine.updateAppearance('u1', femaleReset);
  const updated = latestViews.get('u1')?.players[0].appearance;
  assert.equal(updated?.gender, 'female');
  assert.equal(updated?.hatId, 'none');
  assert.equal(updated?.suitId, 0);
  assert.equal(updated?.hairId, 0);

  engine.dispose();
});
