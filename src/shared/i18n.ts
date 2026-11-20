import { AbilityId, Gender, Language, MapId, Role, ValidationErrorPayload } from './types';

export interface AbilityCopy {
  name: string;
  desc: string;
  shortHint: string;
}

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  langEnglish: string;
  langArabic: string;
  // Home
  playerNameLabel: string;
  playerNamePlaceholder: string;
  playerNameHint: string;
  createRoom: string;
  createRoomSub: string;
  joinRoom: string;
  joinRoomSub: string;
  enterRoomCode: string;
  roomCodePlaceholder: string;
  joinNow: string;
  cancel: string;
  rulesAndCards: string;
  soundOn: string;
  soundOff: string;
  quickSoloDemo: string;
  // Validation & Errors
  errors: Record<ValidationErrorPayload['code'], string>;
  // Lobby
  back: string;
  roomCode: string;
  copyCode: string;
  copied: string;
  players: string;
  host: string;
  bot: string;
  ready: string;
  notReady: string;
  addBot: string;
  fillLobby: string;
  removeBot: string;
  rotateLeft: string;
  rotateRight: string;
  dragToRotate: string;
  customizeCharacter: string;
  wardrobe: string;
  tabSuits: string;
  tabPants: string;
  tabHats: string;
  tabHair: string;
  mapSelection: string;
  maps: Record<MapId, { name: string; desc: string }>;
  appearance: string;
  gender: string;
  male: string;
  female: string;
  skinTone: string;
  hairColor: string;
  gameSettings: string;
  mafiaCount: string;
  mafiaLockedHint: string;
  minPlayers: string;
  mafiaTime: string;
  doctorTime: string;
  detectiveTime: string;
  votingTime: string;
  skipVoteSetting: string;
  on: string;
  off: string;
  saveAndReady: string;
  readyConfirmed: string;
  startGame: string;
  needMorePlayers: string;
  waitingAllReady: string;
  waitingHostStart: string;
  secondsShort: string;
  // Wardrobe item names
  suits: Record<Gender, string[]>;
  pants: Record<Gender, string[]>;
  noHat: string;
  hats: string[];
  hairs: Record<Gender, string[]>;
  // Roles
  roles: Record<Role, { name: string; objective: string }>;
  // Phases & In-Game HUD
  roundLabel: string;
  yourRoleIs: string;
  yourAbilityCard: string;
  noAbilityCard: string;
  sleepingTitle: string;
  everyoneAsleep: string;
  mafiaTurn: string;
  doctorTurn: string;
  detectiveTurn: string;
  dayAnnounce: string;
  votingTimeTitle: string;
  mafiaPrompt: string;
  mafiaPartnerNote: string;
  doctorPrompt: string;
  doctorDoublePrompt: string;
  detectivePrompt: string;
  detectiveDoublePrompt: string;
  dayVotePrompt: string;
  silencedNotice: string;
  skipVote: string;
  confirmTarget: string;
  targetSelected: string;
  waitingOthers: string;
  youAreEliminated: string;
  spectating: string;
  abilityTrayTitle: string;
  myCardButton: string;
  myCardReadyBadge: string;
  whenToUseLabel: string;
  useCardNow: string;
  cardStatusReadyNow: string;
  cardStatusWaitFor: string;
  cardStatusUsed: string;
  timingMafia: string;
  timingDoctor: string;
  timingDetective: string;
  timingDayVote: string;
  timingPassive: string;
  continueFast: string;
  lockTargetHint: string;
  activateCard: string;
  cancelAbility: string;
  cardUsed: string;
  cardReady: string;
  cardPassiveArmed: string;
  selectAbilityTarget: string;
  selectSecondAbilityTarget: string;
  pickVictimVote: string;
  pickRedirectTo: string;
  abilityActivatedBanner: string;
  secretEffectBanner: string;
  leaveMatch: string;
  // Intel & Announcements
  intelTitle: string;
  intelIsMafia: string;
  intelNotMafia: string;
  intelExactRole: string;
  intelTrackerVisited: string;
  intelTrackerStayed: string;
  intelNightWatchDanger: string;
  intelNightWatchSafe: string;
  announcements: {
    night_killed: string;
    night_saved: string;
    night_quiet: string;
    day_eliminated: string;
    day_tie: string;
    day_skipped: string;
    last_will_reveal_mafia: string;
    last_will_reveal_clean: string;
    public_innocent: string;
    player_silenced: string;
    time_frozen: string;
  };
  // Game Over
  civiliansWin: string;
  mafiaWin: string;
  civiliansWinDesc: string;
  mafiaWinDesc: string;
  finalRoles: string;
  aliveTag: string;
  eliminatedTag: string;
  playAgain: string;
  returnToLobby: string;
  // Rules Modal
  rulesTitle: string;
  rulesOverviewTab: string;
  rulesCardsTab: string;
  rulesSteps: string[];
  close: string;
  // 21 Ability Cards
  abilities: Record<AbilityId, AbilityCopy>;
}

export const DICTIONARY: Record<Language, TranslationDictionary> = {
  en: {
    appName: 'MafiaCards',
    tagline: 'Play. Deduce. Survive.',
    langEnglish: 'English',
    langArabic: 'العربية',
    playerNameLabel: 'Player Name',
    playerNamePlaceholder: 'Enter your name...',
    playerNameHint: '2–16 characters (English or Arabic)',
    createRoom: 'Create Room',
    createRoomSub: 'Host a new 3D table & customize rules',
    joinRoom: 'Join Room',
    joinRoomSub: 'Enter a friend’s room code to sit down',
    enterRoomCode: 'Enter Room Code',
    roomCodePlaceholder: 'e.g. K7M4P',
    joinNow: 'Join Table',
    cancel: 'Cancel',
    rulesAndCards: 'Rules & 21 Cards',
    soundOn: 'Audio On',
    soundOff: 'Muted',
    quickSoloDemo: 'Instant 5-Player Demo',
    errors: {
      NAME_REQUIRED: 'Please enter your name first.',
      NAME_TOO_SHORT: 'Name must be at least 2 characters.',
      NAME_TOO_LONG: 'Name must be 16 characters or fewer.',
      NAME_INVALID: 'Use English/Arabic letters, numbers, or spaces only.',
      ROOM_NOT_FOUND: 'Room not found. Check the code and try again.',
      ROOM_FULL: 'This table is full (10/10 players).',
      GAME_ALREADY_STARTED: 'Match already in progress.',
      MIN_PLAYERS_REQUIRED: 'Need at least {min} players to start.',
      NOT_ALL_READY: 'All players must click Save & Ready first.',
      NOT_HOST: 'Only the room host can change this.',
      INVALID_ACTION: 'That action is not available right now.',
      CONSECUTIVE_PROTECT_BLOCKED: 'Cannot protect the same player two nights in a row.',
      SILENCED_BLOCKED: 'You have been silenced this round.',
    },
    back: 'Leave',
    roomCode: 'Room',
    copyCode: 'Copy',
    copied: 'Copied!',
    players: 'Players',
    host: 'Host',
    bot: 'Bot',
    ready: 'Ready',
    notReady: 'Customizing',
    addBot: '+ Add Bot',
    fillLobby: 'Fill to 5',
    removeBot: 'Remove Bot',
    rotateLeft: 'Rotate Left',
    rotateRight: 'Rotate Right',
    dragToRotate: 'Drag to spin 360°',
    customizeCharacter: 'Customize Your Character',
    wardrobe: 'Wardrobe',
    tabSuits: 'Suits',
    tabPants: 'Pants',
    tabHats: 'Hats',
    tabHair: 'Hair',
    mapSelection: 'Map',
    maps: {
      city: { name: 'City', desc: 'Midnight rooftop courtyard & warm skyline' },
      office: { name: 'Office', desc: 'Dark-wood Mafia headquarters & desk lamps' },
      beach: { name: 'Beach', desc: 'Twilight tropical boardwalk & tiki torches' },
    },
    appearance: 'Appearance',
    gender: 'Character',
    male: 'Male',
    female: 'Female',
    skinTone: 'Skin Tone',
    hairColor: 'Hair Color',
    gameSettings: 'Match Settings',
    mafiaCount: 'Mafia Count',
    mafiaLockedHint: 'Locked to 1 when 6 or fewer players',
    minPlayers: 'Min Players',
    mafiaTime: 'Mafia Turn',
    doctorTime: 'Doctor Turn',
    detectiveTime: 'Detective Turn',
    votingTime: 'Voting Time',
    skipVoteSetting: 'Skip Vote',
    on: 'ON',
    off: 'OFF',
    saveAndReady: 'Save & Ready',
    readyConfirmed: 'Ready!',
    startGame: 'Start Game',
    needMorePlayers: 'Add {count} more player(s)',
    waitingAllReady: 'Waiting for all players to ready up',
    waitingHostStart: 'Waiting for host to start...',
    secondsShort: 's',
    suits: {
      male: [
        'Classic Tuxedo',
        'Detective Trench',
        'Mobster Pinstripe',
        'Street Hoodie',
        'Biker Leather',
        'Royal Admiral',
        'Detective Vest',
        'Cozy Puffer',
        'Crimson Velvet',
        'Varsity Bomber',
      ],
      female: [
        'Tuxedo Blazer',
        'Detective Trench',
        'Mobster Pinstripe',
        'Street Hoodie',
        'Biker Leather',
        'Royal Admiral',
        'Detective Vest',
        'Cozy Puffer',
        'Velvet Gown',
        'Varsity Bomber',
      ],
    },
    pants: {
      male: [
        'Dress Slacks',
        'Pinstripe Cut',
        'Cargo Pants',
        'Cuffed Jeans',
        'Track Joggers',
        'Plaid Trousers',
        'Formal Shorts',
        'Belted Wide-Leg',
        'Suspenders',
        'Gala Trousers',
      ],
      female: [
        'Pleated Midi',
        'Pinstripe Mini',
        'Ivory Culottes',
        'Cuffed Jeans',
        'Track Joggers',
        'Ruffled Skirt',
        'Flared Mini',
        'Belted Wide-Leg',
        'Suspender Skirt',
        'Gala Ruffled',
      ],
    },
    noHat: 'No Hat',
    hats: [
      'Classic Fedora',
      'Bowler Hat',
      'Top Hat',
      'Crimson Beret',
      'Street Cap',
      'Cozy Beanie',
      'Deerstalker',
      'Cowboy Hat',
      'Gold Crown',
      'Resort Sun Hat',
    ],
    hairs: {
      male: [
        'Swept Side-Part',
        'Spiky Anime',
        'Pompadour',
        'Curly Top',
        'Buzz Fade',
        'Messy Fringe',
        'Slicked Back',
        'Undercut',
        'Afro',
        'Long Layered',
      ],
      female: [
        'Long Wavy',
        'High Ponytail',
        'Twin Buns',
        'Sleek Bob',
        'Side Braid',
        'Curly Volume',
        'Pigtails',
        'Layered Shoulder',
        'Pixie Cut',
        'Half-Up Bow',
      ],
    },
    roles: {
      mafia: {
        name: 'Mafia',
        objective: 'Eliminate players at night and blend in during the day until Mafia equals or outnumbers Civilians.',
      },
      doctor: {
        name: 'Doctor',
        objective: 'Wake each night to shield one player from Mafia attacks and keep the town alive.',
      },
      detective: {
        name: 'Detective',
        objective: 'Inspect one suspect each night to uncover who belongs to the Mafia.',
      },
      civilian: {
        name: 'Civilian',
        objective: 'Deduce the hidden Mafia during Day Voting and leverage your special ability card.',
      },
    },
    roundLabel: 'Round',
    yourRoleIs: 'Your Secret Role',
    yourAbilityCard: 'Once-Per-Game Ability Card',
    noAbilityCard: 'No special card this match — rely on pure deduction!',
    sleepingTitle: 'Sleeping...',
    everyoneAsleep: 'Everyone is now asleep...',
    mafiaTurn: "Mafia's Turn",
    doctorTurn: "Doctor's Turn",
    detectiveTurn: "Detective's Turn",
    dayAnnounce: 'Dawn Breaks',
    votingTimeTitle: 'Voting Time',
    mafiaPrompt: 'Choose a player to eliminate tonight',
    mafiaPartnerNote: 'Agree on 1 target with your partner',
    doctorPrompt: 'Choose a player to protect tonight',
    doctorDoublePrompt: 'Double Shield active! Choose 2 different players to protect',
    detectivePrompt: 'Choose a player to inspect tonight',
    detectiveDoublePrompt: 'Double Investigation active! Choose 2 players to inspect',
    dayVotePrompt: 'Vote to eliminate a suspect, or Skip Vote',
    silencedNotice: 'Silenced this round — your ability card is disabled!',
    skipVote: 'Skip Vote',
    confirmTarget: 'Confirm',
    targetSelected: 'Locked In',
    waitingOthers: 'Waiting for other players...',
    youAreEliminated: 'You were eliminated',
    spectating: 'Spectating the table',
    abilityTrayTitle: 'Ability Card',
    myCardButton: 'My Card',
    myCardReadyBadge: 'READY!',
    whenToUseLabel: 'When to use',
    useCardNow: 'Use Card',
    cardStatusReadyNow: 'Ready Now',
    cardStatusWaitFor: 'Wait for {phase}',
    cardStatusUsed: 'Used',
    timingMafia: "Mafia's Turn",
    timingDoctor: "Doctor's Turn",
    timingDetective: "Detective's Turn",
    timingDayVote: 'Day Voting',
    timingPassive: "Auto-Armed / Doctor's Turn",
    continueFast: 'Continue',
    lockTargetHint: 'Select a target, use your card if you wish, then confirm',
    activateCard: 'Activate',
    cancelAbility: 'Cancel',
    cardUsed: 'Spent',
    cardReady: 'Ready',
    cardPassiveArmed: 'Armed (Auto / Activate)',
    selectAbilityTarget: 'Tap a player to target with this card',
    selectSecondAbilityTarget: 'Now tap the player to receive the stolen vote',
    pickVictimVote: '1. Tap player whose vote to steal',
    pickRedirectTo: '2. Tap who their vote counts for',
    abilityActivatedBanner: 'Ability Card Activated!',
    secretEffectBanner: 'Secret Card Triggered',
    leaveMatch: 'Exit',
    intelTitle: 'Private Intel',
    intelIsMafia: '{name} IS MAFIA!',
    intelNotMafia: '{name} is NOT Mafia.',
    intelExactRole: '{name} is the {role}!',
    intelTrackerVisited: '{name} visited {visited} last night.',
    intelTrackerStayed: '{name} stayed in their seat last night.',
    intelNightWatchDanger: 'Alert! The Mafia targeted one of your seat neighbors last night!',
    intelNightWatchSafe: 'All quiet — neither of your immediate seat neighbors was targeted.',
    announcements: {
      night_killed: '{name} was eliminated during the night!',
      night_saved: 'Someone was saved by the Doctor during the night!',
      night_quiet: 'A quiet night passed — everyone survived!',
      day_eliminated: '{name} was voted out by the table!',
      day_tie: 'The vote ended in a tie — nobody was eliminated.',
      day_skipped: 'The table chose to skip voting.',
      last_will_reveal_mafia: 'Last Will revealed: {name} IS MAFIA!',
      last_will_reveal_clean: 'Last Will revealed: {name} is NOT Mafia.',
      public_innocent: 'Public Reveal confirmed: {name} is innocent!',
      player_silenced: '{name} was silenced for this round!',
      time_frozen: 'Time Freeze! +20 seconds added to Voting Time.',
    },
    civiliansWin: 'Civilians Win!',
    mafiaWin: 'Mafia Wins!',
    civiliansWinDesc: 'Every Mafia member has been unmasked and removed from the table.',
    mafiaWinDesc: 'The Mafia took control of the table in the shadows.',
    finalRoles: 'Revealed Table Roles',
    aliveTag: 'Alive',
    eliminatedTag: 'Out',
    playAgain: 'Play Again',
    returnToLobby: 'Back to Lobby',
    rulesTitle: 'How to Play & 21 Ability Cards',
    rulesOverviewTab: 'Match Flow',
    rulesCardsTab: 'All 21 Cards',
    rulesSteps: [
      '4–10 players sit around a 3D table. With 6 or fewer players, there is strictly 1 Mafia. With 7–10 players, the host may allow 1 or 2 Mafias.',
      'Each match deals 1 Doctor, 1 Detective, 1–2 Mafias, and Civilians, plus once-per-game Ability Cards.',
      'Night Phase: Everyone sleeps while Mafia, Doctor, and Detective wake up one by one to act.',
      'Day Phase: Night results are announced, players activate Day Ability Cards, and vote to eliminate a suspect or Skip Vote.',
      'Civilians win when all Mafias are eliminated. Mafia wins when living Mafias equal or outnumber living non-Mafias.',
    ],
    close: 'Close',
    abilities: {
      vote_thief: {
        name: 'Vote Thief',
        desc: "Steal a target player's vote during Day Voting so it counts toward your chosen target.",
        shortHint: 'Day · Redirect 1 vote',
      },
      silencer: {
        name: 'Silencer',
        desc: 'Mute a target player during the next Day phase and disable their ability card for that round.',
        shortHint: 'Night · Mute & lock card',
      },
      false_trail: {
        name: 'False Trail',
        desc: 'Frame a target player for one night—if the Detective inspects them, they appear as Mafia.',
        shortHint: 'Night · Frame suspect',
      },
      shadow_swap: {
        name: 'Shadow Swap',
        desc: "Force the Doctor's protection to fail on one chosen target this night.",
        shortHint: 'Night · Break shield',
      },
      double_ballot: {
        name: 'Double Ballot',
        desc: 'Your vote counts as 2 votes during the current Day Voting phase.',
        shortHint: 'Day · 2x vote weight',
      },
      double_shield: {
        name: 'Double Shield',
        desc: 'Protect 2 different players during a single night phase.',
        shortHint: 'Night · Guard 2 players',
      },
      emergency_self_revive: {
        name: 'Emergency Self-Revive',
        desc: 'Automatically survive a Mafia elimination attempt on yourself once.',
        shortHint: 'Passive / Night · Self-save',
      },
      cleanse_guard: {
        name: 'Cleanse Guard',
        desc: 'Protect a player from elimination and cancel any Mafia ability targeting them this night.',
        shortHint: 'Night · Guard + purify',
      },
      true_identity: {
        name: 'True Identity',
        desc: "Reveal a player's exact role (Mafia, Doctor, or Civilian) instead of only Mafia/Not Mafia.",
        shortHint: 'Night · Exact role scan',
      },
      double_investigation: {
        name: 'Double Investigation',
        desc: 'Inspect 2 players during a single Detective turn.',
        shortHint: 'Night · Inspect 2 players',
      },
      suspect_tracker: {
        name: 'Suspect Tracker',
        desc: 'Discover who a target player selected or visited during the previous night.',
        shortHint: 'Night · Track movement',
      },
      force_skip: {
        name: 'Force Skip',
        desc: 'Force a chosen player to skip their vote this Day phase.',
        shortHint: 'Day · Cancel 1 vote',
      },
      shielded_vote: {
        name: 'Shielded Vote',
        desc: 'Make yourself immune from receiving votes during one Day phase.',
        shortHint: 'Day · Vote immunity',
      },
      double_vote: {
        name: 'Double Vote',
        desc: 'Your Day vote counts twice for one round.',
        shortHint: 'Day · 2x vote weight',
      },
      last_will: {
        name: 'Last Will',
        desc: 'Choose a suspect—if you are eliminated, publicly reveal whether they are Mafia or Not Mafia.',
        shortHint: 'Day · Reveal on death',
      },
      bodyguard: {
        name: 'Bodyguard',
        desc: 'Secretly guard a player tonight; if Mafia targets them, they survive and you remain safe.',
        shortHint: 'Day · Guard for night',
      },
      public_reveal: {
        name: 'Public Reveal',
        desc: "Force one random non-Mafia player's innocence to be publicly confirmed (excludes yourself).",
        shortHint: 'Day · Clear 1 innocent',
      },
      time_freeze: {
        name: 'Time Freeze',
        desc: 'Add +20 seconds to the current Day voting timer for deeper discussion.',
        shortHint: 'Day · +20s timer',
      },
      vote_redirect: {
        name: 'Vote Redirect',
        desc: 'Secretly redirect all votes cast against you this round onto another chosen player.',
        shortHint: 'Day · Bounce votes',
      },
      night_watch: {
        name: 'Night Watch',
        desc: 'Receive a private alert if the Mafia targeted one of your two immediate seat neighbors last night.',
        shortHint: 'Day · Check neighbors',
      },
      tiebreaker: {
        name: 'Tiebreaker',
        desc: 'If the current Day vote ends in a tie, your vote automatically breaks the tie.',
        shortHint: 'Day · Break ties',
      },
    },
  },

  ar: {
    appName: 'مافيا كاردز',
    tagline: 'العب. استنتج. انجُ.',
    langEnglish: 'English',
    langArabic: 'العربية',
    playerNameLabel: 'اسم اللاعب',
    playerNamePlaceholder: 'أدخل اسمك...',
    playerNameHint: 'من 2 إلى 16 حرفاً (عربي أو إنجليزي)',
    createRoom: 'إنشاء غرفة',
    createRoomSub: 'استضف طاولة ثلاثية الأبعاد وخصص القوانين',
    joinRoom: 'انضمام لغرفة',
    joinRoomSub: 'أدخل رمز غرفة صديقك للجلوس على الطاولة',
    enterRoomCode: 'أدخل رمز الغرفة',
    roomCodePlaceholder: 'مثال: K7M4P',
    joinNow: 'انضم للطاولة',
    cancel: 'إلغاء',
    rulesAndCards: 'القوانين و21 بطاقة',
    soundOn: 'الصوت مفعل',
    soundOff: 'صامت',
    quickSoloDemo: 'تجربة فورية (5 لاعبين)',
    errors: {
      NAME_REQUIRED: 'يرجى كتابة اسمك أولاً.',
      NAME_TOO_SHORT: 'يجب أن يتكون الاسم من حرفين على الأقل.',
      NAME_TOO_LONG: 'يجب ألا يتجاوز الاسم 16 حرفاً.',
      NAME_INVALID: 'استخدم الحروف العربية أو الإنجليزية والأرقام فقط.',
      ROOM_NOT_FOUND: 'لم يتم العثور على الغرفة. تحقق من الرمز وحاول مجدداً.',
      ROOM_FULL: 'الطاولة ممتلئة بالكامل (10/10 لاعبين).',
      GAME_ALREADY_STARTED: 'المباراة قيد التشغيل بالفعل.',
      MIN_PLAYERS_REQUIRED: 'يلزم وجود {min} لاعبين على الأقل لبدء اللعبة.',
      NOT_ALL_READY: 'يجب أن يضغط جميع اللاعبين على حفظ وجاهز أولاً.',
      NOT_HOST: 'المضيف فقط يمكنه تعديل هذا الإعداد.',
      INVALID_ACTION: 'هذا الإجراء غير متاح في الوقت الحالي.',
      CONSECUTIVE_PROTECT_BLOCKED: 'لا يمكنك حماية نفس اللاعب ليلتين متتاليتين.',
      SILENCED_BLOCKED: 'تم إسكاتك في هذه الجولة.',
    },
    back: 'خروج',
    roomCode: 'الغرفة',
    copyCode: 'نسخ',
    copied: 'تم النسخ!',
    players: 'اللاعبون',
    host: 'المضيف',
    bot: 'بوت',
    ready: 'جاهز',
    notReady: 'يخصص',
    addBot: '+ إضافة بوت',
    fillLobby: 'تعبئة لـ 5',
    removeBot: 'حذف بوت',
    rotateLeft: 'تدوير لليسار',
    rotateRight: 'تدوير لليمين',
    dragToRotate: 'اسحب للتدوير 360°',
    customizeCharacter: 'خصص شخصيتك',
    wardrobe: 'خزانة الملابس',
    tabSuits: 'بدلات',
    tabPants: 'بناطيل',
    tabHats: 'قبعات',
    tabHair: 'شعر',
    mapSelection: 'الخريطة',
    maps: {
      city: { name: 'المدينة', desc: 'ساحة ليلية فوق الأسطح بإضاءة دافئة' },
      office: { name: 'المكتب', desc: 'مقر المافيا الخشبي الفخم ومصابيح المكتب' },
      beach: { name: 'الشاطئ', desc: 'ممشى استوائي وقت الغسق ومشاعل مضيئة' },
    },
    appearance: 'المظهر',
    gender: 'الشخصية',
    male: 'ذكر',
    female: 'أنثى',
    skinTone: 'لون البشرة',
    hairColor: 'لون الشعر',
    gameSettings: 'إعدادات المباراة',
    mafiaCount: 'عدد المافيا',
    mafiaLockedHint: 'مغلق على 1 عند وجود 6 لاعبين أو أقل',
    minPlayers: 'الحد الأدنى',
    mafiaTime: 'وقت المافيا',
    doctorTime: 'وقت الطبيب',
    detectiveTime: 'وقت المحقق',
    votingTime: 'وقت التصويت',
    skipVoteSetting: 'تخطي التصويت',
    on: 'مفعل',
    off: 'معطل',
    saveAndReady: 'حفظ وجاهز',
    readyConfirmed: 'أنت جاهز!',
    startGame: 'بدء اللعبة',
    needMorePlayers: 'أضف {count} لاعب/لاعبين للبدء',
    waitingAllReady: 'بانتظار استعداد جميع اللاعبين',
    waitingHostStart: 'بانتظار المضيف لبدء اللعبة...',
    secondsShort: 'ث',
    suits: {
      male: [
        'بدلة رسمية كلاسيك',
        'معطف المحقق',
        'بدلة مقلمة فخمة',
        'هودي عصري',
        'جاكيت جلد دراج',
        'سترة الأدميرال',
        'صدرية المحقق',
        'جاكيت منفوخ دافئ',
        'سترة مخمل قرمزي',
        'جاكيت جامعي رياضي',
      ],
      female: [
        'بليزر رسمي أنيق',
        'معطف المحققة',
        'بدلة مقلمة كلاسيك',
        'هودي عصري',
        'جاكيت جلد جريء',
        'سترة الأدميرال',
        'صدرية المحققة',
        'جاكيت منفوخ دافئ',
        'فستان مخمل قرمزي',
        'جاكيت جامعي رياضي',
      ],
    },
    pants: {
      male: [
        'بنطال رسمي أنيق',
        'بنطال مقلم كلاسيك',
        'بنطال كارغو',
        'جينز مطوي الحافة',
        'بنطال رياضي عصري',
        'بنطال كاروهات',
        'شورت برمودا رسمي',
        'بنطال واسع بحزام',
        'بنطال بحمالات',
        'بنطال الحفل الرسمي',
      ],
      female: [
        'تنورة ميدي مطوية',
        'تنورة مقلمة قصيرة',
        'كولوت واسع عاجي',
        'جينز مطوي الحافة',
        'بنطال رياضي عصري',
        'تنورة طبقات مكشكشة',
        'تنورة قصيرة واسعة',
        'بنطال واسع بحزام',
        'تنورة بحمالات',
        'تنورة سهرة فاخرة',
      ],
    },
    noHat: 'بدون قبعة',
    hats: [
      'قبعة فيدورا كلاسيك',
      'قبعة بولر دائرية',
      'قبعة عالية رسمية',
      'بيريه قرمزي',
      'كاب رياضي',
      'قبعة صوف دافئة',
      'قبعة المحقق',
      'قبعة راعي بقر',
      'تاج ذهبي ملكي',
      'قبعة شمس صيفية',
    ],
    hairs: {
      male: [
        'فرق جانبي أنيق',
        'شعر شائك أنمي',
        'بومبادور كلاسيك',
        'مجعد كثيف',
        'حلاقة قصيرة',
        'غرة عفوية',
        'مسحوب للخلف',
        'قصة عصرية',
        'أفرو مجعد',
        'طويل متدرج',
      ],
      female: [
        'طويل مموج',
        'ذيل حصان مرتفع',
        'كعكتان لطيفان',
        'قصة بوب ناعمة',
        'ضفيرة جانبية',
        'مجعد كثيف',
        'ذيلان جانبيان',
        'متدرج للكتف',
        'قصة قصيرة عصرية',
        'نصف مرفوع بفيونكة',
      ],
    },
    roles: {
      mafia: {
        name: 'المافيا',
        objective: 'أقصِ اللاعبين ليلاً واندس بينهم نهاراً حتى يتساوى عدد المافيا مع المدنيين أو يتفوق عليهم.',
      },
      doctor: {
        name: 'الطبيب',
        objective: 'استيقظ كل ليلة لحماية لاعب واحد من هجوم المافيا والحفاظ على بقاء الأبرياء.',
      },
      detective: {
        name: 'المحقق',
        objective: 'افحص مشتبهاً به كل ليلة لتكتشف من ينتمي إلى عصابة المافيا.',
      },
      civilian: {
        name: 'مدني',
        objective: 'اكشف المافيا بالتحليل والتصويت نهاراً واستثمر بطاقة قدرتك الخاصة بذكاء.',
      },
    },
    roundLabel: 'الجولة',
    yourRoleIs: 'دورك السري',
    yourAbilityCard: 'بطاقة القدرة (مرة واحدة بالمباراة)',
    noAbilityCard: 'لا توجد بطاقة خاصة لك هذه المباراة — اعتمد على ذكائك!',
    sleepingTitle: 'جاري النوم...',
    everyoneAsleep: 'الجميع نائم الآن...',
    mafiaTurn: 'دور المافيا',
    doctorTurn: 'دور الطبيب',
    detectiveTurn: 'دور المحقق',
    dayAnnounce: 'بزوغ الفجر',
    votingTimeTitle: 'وقت التصويت',
    mafiaPrompt: 'اختر لاعباً لإقصائه هذه الليلة',
    mafiaPartnerNote: 'اتفق مع شريكك على هدف واحد',
    doctorPrompt: 'اختر لاعباً لحمايته هذه الليلة',
    doctorDoublePrompt: 'الدرع المزدوج مفعل! اختر لاعبين مختلفين للحماية',
    detectivePrompt: 'اختر لاعباً للتحقيق في هويته',
    detectiveDoublePrompt: 'التحقيق المزدوج مفعل! اختر لاعبين للفحص',
    dayVotePrompt: 'صوّت لإقصاء المشتبه به أو اضغط تخطي التصويت',
    silencedNotice: 'تم إسكاتك هذه الجولة — بطاقة قدرتك معطلة!',
    skipVote: 'تخطي التصويت',
    confirmTarget: 'تأكيد',
    targetSelected: 'تم الاختيار',
    waitingOthers: 'بانتظار بقية اللاعبين...',
    youAreEliminated: 'تم إقصاؤك من الطاولة',
    spectating: 'وضع المشاهدة',
    abilityTrayTitle: 'بطاقة القدرة',
    myCardButton: 'بطاقتي',
    myCardReadyBadge: 'جاهز!',
    whenToUseLabel: 'متى تُستخدم',
    useCardNow: 'استخدم البطاقة',
    cardStatusReadyNow: 'جاهز الآن',
    cardStatusWaitFor: 'انتظر {phase}',
    cardStatusUsed: 'مستخدمة',
    timingMafia: 'دور المافيا',
    timingDoctor: 'دور الطبيب',
    timingDetective: 'دور المحقق',
    timingDayVote: 'التصويت النهاري',
    timingPassive: 'تلقائي / دور الطبيب',
    continueFast: 'متابعة',
    lockTargetHint: 'اختر هدفاً، واستخدم بطاقتك إن رغبت ثم اضغط تأكيد',
    activateCard: 'تفعيل',
    cancelAbility: 'إلغاء',
    cardUsed: 'مستخدمة',
    cardReady: 'جاهزة',
    cardPassiveArmed: 'مجهزة (تلقائي / تفعيل)',
    selectAbilityTarget: 'اضغط على لاعب لاستهدافه بهذه البطاقة',
    selectSecondAbilityTarget: 'الآن اختر اللاعب الذي سيُحسب الصوت ضده',
    pickVictimVote: '1. اختر اللاعب الذي ستسرق صوته',
    pickRedirectTo: '2. اختر الهدف الذي سيذهب إليه الصوت',
    abilityActivatedBanner: 'تم تفعيل بطاقة قدرة!',
    secretEffectBanner: 'تم تفعيل قدرة سرية',
    leaveMatch: 'خروج',
    intelTitle: 'معلومات سرية',
    intelIsMafia: '{name} من المافيا!',
    intelNotMafia: '{name} ليس من المافيا.',
    intelExactRole: 'هوية {name} الحقيقية: {role}!',
    intelTrackerVisited: 'قام {name} بزيارة {visited} الليلة الماضية.',
    intelTrackerStayed: 'بقي {name} في مقعده الليلة الماضية.',
    intelNightWatchDanger: 'تنبيه! استهدفت المافيا أحد جيرانك المباشرين الليلة الماضية!',
    intelNightWatchSafe: 'هدوء تام — لم يتعرض أي من جيرانك المباشرين للهجوم.',
    announcements: {
      night_killed: 'تم إقصاء {name} خلال الليل!',
      night_saved: 'تم إنقاذ أحد اللاعبين ببراعة خلال الليل!',
      night_quiet: 'مرّت ليلة هادئة — نجا جميع اللاعبين!',
      day_eliminated: 'قررت الطاولة إقصاء {name} بالتصويت!',
      day_tie: 'تعادلت الأصوات — لم يتم إقصاء أحد.',
      day_skipped: 'قررت الأغلبية تخطي التصويت.',
      last_will_reveal_mafia: 'كشفت الوصية الأخيرة: {name} من المافيا!',
      last_will_reveal_clean: 'كشفت الوصية الأخيرة: {name} ليس من المافيا.',
      public_innocent: 'تأكيد علني: {name} بريء وليس من المافيا!',
      player_silenced: 'تم إسكات {name} خلال هذه الجولة!',
      time_frozen: 'تجميد الوقت! تمت إضافة 20 ثانية لوقت التصويت.',
    },
    civiliansWin: 'انتصار المدنيين!',
    mafiaWin: 'انتصار المافيا!',
    civiliansWinDesc: 'تم كشف وإقصاء جميع أفراد المافيا من الطاولة بنجاح.',
    mafiaWinDesc: 'سيطرت عصابة المافيا على الطاولة من خلف الظلال.',
    finalRoles: 'كشف جميع الأدوار',
    aliveTag: 'ناجٍ',
    eliminatedTag: 'مُقصى',
    playAgain: 'العب مجدداً',
    returnToLobby: 'العودة للوبي',
    rulesTitle: 'طريقة اللعب وبطاقات القدرات الـ 21',
    rulesOverviewTab: 'مسار المباراة',
    rulesCardsTab: 'البطاقات الـ 21',
    rulesSteps: [
      'يجلس من 4 إلى 10 لاعبين حول طاولة ثلاثية الأبعاد. عند وجود 6 لاعبين أو أقل يُقفل عدد المافيا على 1 فقط، ومن 7 إلى 10 يمكن للمضيف اختيار 1 أو 2.',
      'تُوزّع الأدوار سراً: طبيب، محقق، 1–2 مافيا، ومدنيون، مع بطاقة قدرة تُستخدم مرة واحدة طوال المباراة.',
      'مرحلة الليل: ينام الجميع ثم يستيقظ المافيا فالطبيب فالمحقق بالترتيب لتنفيذ أدوارهم.',
      'مرحلة النهار: يُعلن ما حدث ليلاً ثم تبدأ المناقشة وتفعيل البطاقات والتصويت لإقصاء مشتبه به أو تخطي التصويت.',
      'يفوز المدنيون بإقصاء جميع المافيا، وتفوز المافيا عندما يتساوى عددها مع عدد غير المافيا الأحياء أو يتجاوزه.',
    ],
    close: 'إغلاق',
    abilities: {
      vote_thief: {
        name: 'سارق الصوت',
        desc: 'اسرق صوت لاعب محدد أثناء تصويت النهار ليُحسب لصالح الهدف الذي تختاره أنت.',
        shortHint: 'نهار · تحويل صوت لاعب',
      },
      silencer: {
        name: 'المُسكِت',
        desc: 'أخرس لاعباً خلال النهار التالي وعطّل بطاقة قدرته لتلك الجولة.',
        shortHint: 'ليل · إسكات وتعطيل',
      },
      false_trail: {
        name: 'الأثر الكاذب',
        desc: 'ورّط لاعباً لليلة واحدة؛ إذا فحصه المحقق سيظهر له كعضو في المافيا.',
        shortHint: 'ليل · تضليل المحقق',
      },
      shadow_swap: {
        name: 'تبديل الظل',
        desc: 'أفشل حماية الطبيب على هدف واحد تختاره خلال هذه الليلة.',
        shortHint: 'ليل · اختراق الحماية',
      },
      double_ballot: {
        name: 'الاقتراع المزدوج',
        desc: 'يُحسب صوتك كصوتين كاملين خلال جولة التصويت الحالية.',
        shortHint: 'نهار · صوتان',
      },
      double_shield: {
        name: 'الدرع المزدوج',
        desc: 'احمِ لاعبين مختلفين خلال ليلة واحدة.',
        shortHint: 'ليل · حماية لاعبين',
      },
      emergency_self_revive: {
        name: 'الإنعاش الطارئ',
        desc: 'انجُ تلقائياً من محاولة إقصاء المافيا لك مرة واحدة في المباراة.',
        shortHint: 'تلقائي / ليل · نجاة ذاتية',
      },
      cleanse_guard: {
        name: 'حارس التطهير',
        desc: 'احمِ لاعباً من الإقصاء وأبطِل أي بطاقة مافيا تستهدفه هذه الليلة.',
        shortHint: 'ليل · حماية وتطهير',
      },
      true_identity: {
        name: 'الهوية الحقيقية',
        desc: 'اكشف الدور الدقيق للاعب (مافيا، طبيب، أو مدني) بدلاً من مجرد مافيا أو لا.',
        shortHint: 'ليل · كشف الدور الدقيق',
      },
      double_investigation: {
        name: 'التحقيق المزدوج',
        desc: 'افحص لاعبين اثنين خلال دور محقق واحد.',
        shortHint: 'ليل · فحص لاعبين',
      },
      suspect_tracker: {
        name: 'متعقب المشتبه',
        desc: 'اكتشف من قام اللاعب المستهدف بزيارته أو اختياره في الليلة السابقة.',
        shortHint: 'ليل · تتبع الحركة',
      },
      force_skip: {
        name: 'تخطي قسري',
        desc: 'أجبر لاعباً تختاره على تخطي تصويته في هذا النهار.',
        shortHint: 'نهار · إلغاء صوت لاعب',
      },
      shielded_vote: {
        name: 'التصويت المحصّن',
        desc: 'اجعل نفسك محصّناً تماماً ضد تلقي أي أصوات خلال جولة نهار واحدة.',
        shortHint: 'نهار · حصانة تصويت',
      },
      double_vote: {
        name: 'الصوت المزدوج',
        desc: 'يُحسب صوتك النهاري بصوتين في هذه الجولة.',
        shortHint: 'نهار · صوتان',
      },
      last_will: {
        name: 'الوصية الأخيرة',
        desc: 'اختر لاعباً؛ إذا تم إقصاؤك فستُكشف حقيقته علناً للجميع (مافيا أم لا).',
        shortHint: 'نهار · كشف عند الإقصاء',
      },
      bodyguard: {
        name: 'الحارس الشخصي',
        desc: 'اختر لاعباً سراً؛ إذا هاجمته المافيا الليلة فسينجو وتبقى أنت آمناً أيضاً.',
        shortHint: 'نهار · حماية ليلية',
      },
      public_reveal: {
        name: 'الكشف العلني',
        desc: 'أعلن براءة لاعب عشوائي من غير المافيا أمام جميع اللاعبين (باستثنائك).',
        shortHint: 'نهار · تبرئة بريء',
      },
      time_freeze: {
        name: 'تجميد الوقت',
        desc: 'أضف 20 ثانية إضافية لعداد التصويت الحالي لمزيد من النقاش.',
        shortHint: 'نهار · +20 ثانية',
      },
      vote_redirect: {
        name: 'تحويل الأصوات',
        desc: 'حوّل سراً جميع الأصوات المصوّتة ضدك هذه الجولة نحو لاعب آخر تختاره.',
        shortHint: 'نهار · عكس الأصوات',
      },
      night_watch: {
        name: 'حارس الليل',
        desc: 'تلقَّ تنبيهاً سرياً إذا هاجمت المافيا أحد جاريك المباشرين الليلة الماضية.',
        shortHint: 'نهار · فحص الجيران',
      },
      tiebreaker: {
        name: 'كاسر التعادل',
        desc: 'إذا انتهى تصويت النهار بالتعادل، فإن صوتك يحسم النتيجة تلقائياً.',
        shortHint: 'نهار · حسم التعادل',
      },
    },
  },
};

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem('mafiacards_lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    // ignore storage errors
  }
  return 'en';
}

export function applyLanguageToDocument(lang: Language): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  try {
    window.localStorage.setItem('mafiacards_lang', lang);
  } catch {
    // ignore
  }
}
