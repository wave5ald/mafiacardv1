import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ROLE_COLORS } from '../shared/abilities';
import { GamePhase, MapId, RoomViewState } from '../shared/types';
import { buildChibiCharacter, ChibiCharacterRig } from './characterBuilder';
import { buildMapScene, BuiltMapResult, SEAT_RADIUS } from './mapBuilder';
import {
  createNameplateSprite,
  createStudioRenderer,
  disposeObject3D,
  startPacedLoop,
} from './utils';

interface GameSceneCanvasProps {
  room: RoomViewState;
  isMeSleeping: boolean;
  canPickPlayer: boolean;
  selectedPlayerIds: string[];
  onSelectPlayer: (playerId: string) => void;
  /** Increment to smoothly recenter the free-look camera (HUD button). */
  recenterSignal?: number;
}

// Free-look limits: wide enough to face the neighbours on both sides
const MAX_YAW = THREE.MathUtils.degToRad(135);
const MIN_PITCH = THREE.MathUtils.degToRad(-30);
const MAX_PITCH = THREE.MathUtils.degToRad(45);
const HOVER_YAW = THREE.MathUtils.degToRad(8);
const HOVER_PITCH = THREE.MathUtils.degToRad(4);
const DRAG_YAW_SPEED = 0.0045;
const DRAG_PITCH_SPEED = 0.0034;
const CLICK_SLOP_PX = 6;

interface SeatActor {
  playerId: string;
  appearanceKey: string;
  nameplateKey: string;
  rig: ChibiCharacterRig;
  nameplate: THREE.Sprite;
  seatIndex: number;
}

const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.1, 0);

function getAppearanceKey(p: RoomViewState['players'][number]): string {
  const a = p.appearance;
  return `${a.gender}:${a.suitId}:${a.pantsId}:${a.hatId}:${a.hairId}:${a.skinColor}:${a.hairColor}`;
}

export function GameSceneCanvas({
  room,
  isMeSleeping,
  canPickPlayer,
  selectedPlayerIds,
  onSelectPlayer,
  recenterSignal = 0,
}: GameSceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const recenterSignalRef = useRef<number>(recenterSignal);
  recenterSignalRef.current = recenterSignal;

  // Store latest React props in refs so WebGLRenderer mounts ONCE
  const roomRef = useRef<RoomViewState>(room);
  const sleepingRef = useRef<boolean>(isMeSleeping);
  const canPickRef = useRef<boolean>(canPickPlayer);
  const selectedIdsRef = useRef<string[]>(selectedPlayerIds);
  const onSelectRef = useRef(onSelectPlayer);

  roomRef.current = room;
  sleepingRef.current = isMeSleeping;
  canPickRef.current = canPickPlayer;
  selectedIdsRef.current = selectedPlayerIds;
  onSelectRef.current = onSelectPlayer;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const mapResultRef = useRef<BuiltMapResult | null>(null);
  const activeMapKeyRef = useRef<string>('');
  const actorsRef = useRef<Map<string, SeatActor>>(new Map());
  const hoveredIdRef = useRef<string | null>(null);

  // Sync map + seated chibi actors whenever players, mapId, roles, or votes change
  const syncSceneActors = (scene: THREE.Scene, state: RoomViewState) => {
    const seatCount = Math.max(4, Math.min(10, state.players.length));
    const mapKey = `${state.settings.mapId}:${seatCount}`;

    if (activeMapKeyRef.current !== mapKey) {
      if (mapResultRef.current) {
        scene.remove(mapResultRef.current.group);
        disposeObject3D(mapResultRef.current.group);
        mapResultRef.current = null;
      }
      mapResultRef.current = buildMapScene(scene, state.settings.mapId as MapId, seatCount);
      activeMapKeyRef.current = mapKey;
      // Reposition existing actors on new seat transforms
      for (const actor of actorsRef.current.values()) {
        scene.remove(actor.rig.root);
        actor.rig.dispose();
      }
      actorsRef.current.clear();
    }

    const builtMap = mapResultRef.current;
    if (!builtMap) return;

    const currentIds = new Set(state.players.map((p) => p.id));
    for (const [id, actor] of actorsRef.current.entries()) {
      if (!currentIds.has(id)) {
        scene.remove(actor.rig.root);
        actor.rig.dispose();
        actorsRef.current.delete(id);
      }
    }

    const sortedPlayers = [...state.players].sort((a, b) => a.seatIndex - b.seatIndex);

    sortedPlayers.forEach((p, idx) => {
      const seat = builtMap.seatTransforms[idx % builtMap.seatTransforms.length];
      const appKey = getAppearanceKey(p);
      const votes = state.voteTallies[p.id] ?? 0;
      const roleAccent = p.revealedRole ? ROLE_COLORS[p.revealedRole].hex : undefined;
      const npKey = `${p.name}|${roleAccent ?? ''}|${p.alive ? 1 : 0}|${votes}`;

      const isMe = p.id === state.me.playerId;
      let actor = actorsRef.current.get(p.id);
      if (!actor || actor.appearanceKey !== appKey) {
        if (actor) {
          scene.remove(actor.rig.root);
          actor.rig.dispose();
        }
        const rig = buildChibiCharacter(p.appearance, 'seated');
        rig.root.position.copy(seat.position);
        rig.root.rotation.y = seat.rotationY;
        rig.hitProxy.userData.playerId = p.id;
        // Hide viewer's own mesh when seated in first-person table view so it never blocks camera
        rig.root.visible = !isMe;

        const nameplate = createNameplateSprite(p.name, roleAccent, !p.alive, votes);
        nameplate.position.set(0, 2.52, 0);
        nameplate.visible = !isMe;
        rig.root.add(nameplate);

        scene.add(rig.root);
        actor = {
          playerId: p.id,
          appearanceKey: appKey,
          nameplateKey: npKey,
          rig,
          nameplate,
          seatIndex: idx,
        };
        actorsRef.current.set(p.id, actor);
      } else {
        actor.rig.root.position.copy(seat.position);
        actor.rig.root.rotation.y = seat.rotationY;
        actor.rig.root.visible = !isMe;
        actor.seatIndex = idx;

        if (actor.nameplateKey !== npKey) {
          actor.rig.root.remove(actor.nameplate);
          (actor.nameplate.material as THREE.SpriteMaterial).map?.dispose();
          actor.nameplate.material.dispose();
          const freshPlate = createNameplateSprite(p.name, roleAccent, !p.alive, votes);
          freshPlate.position.set(0, 2.52, 0);
          freshPlate.visible = !isMe;
          actor.rig.root.add(freshPlate);
          actor.nameplate = freshPlate;
          actor.nameplateKey = npKey;
        }
      }

      actor.rig.setEliminated(!p.alive);
    });
  };

  // Mount WebGLRenderer once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { renderer, envTexture, isSoftwareGl } = createStudioRenderer(container, false);
    const scene = new THREE.Scene();
    scene.environment = envTexture;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      48,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      100,
    );
    camera.position.set(0, 5.2, 8.2);
    camera.lookAt(0, 1.1, 0);

    syncSceneActors(scene, roomRef.current);

    // Pointer raycasting for clicking 3D players around the table
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    let lastMoveRaycast = 0;

    // ---- Free-look camera state (drag to look, hover parallax, recenter) ----
    let yaw = 0;
    let pitch = 0;
    let yawTarget = 0;
    let pitchTarget = 0;
    let hoverYaw = 0;
    let hoverPitch = 0;
    let dragging = false;
    let activePointerId: number | null = null;
    let dragDistance = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastRecenter = recenterSignalRef.current;

    const recenterView = () => {
      yawTarget = 0;
      pitchTarget = 0;
    };

    const getHitPlayerId = (clientX: number, clientY: number): string | null => {
      const rect = dom.getBoundingClientRect();
      _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointer, camera);

      const proxies: THREE.Object3D[] = [];
      for (const actor of actorsRef.current.values()) {
        proxies.push(actor.rig.hitProxy);
      }
      const hits = _raycaster.intersectObjects(proxies, false);
      if (hits.length > 0) {
        return (hits[0].object.userData.playerId as string) ?? null;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button > 0) return;
      dragging = true;
      activePointerId = e.pointerId;
      dragDistance = 0;
      dom.style.cursor = 'grabbing';
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        // capture is a nicety; ignore unsupported browsers
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();

      // Gentle idle mouse-look parallax when not dragging
      if (e.pointerType === 'mouse' && !dragging) {
        const nx = THREE.MathUtils.clamp(
          ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
          -1,
          1,
        );
        const ny = THREE.MathUtils.clamp(
          ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1,
          -1,
          1,
        );
        hoverYaw = -nx * HOVER_YAW;
        hoverPitch = -ny * HOVER_PITCH;
      }

      if (dragging) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        dragDistance += Math.hypot(dx, dy);

        // Sleeping players cannot peek: drags are ignored entirely
        if (!sleepingRef.current) {
          yawTarget = THREE.MathUtils.clamp(
            yawTarget + dx * DRAG_YAW_SPEED,
            -MAX_YAW,
            MAX_YAW,
          );
          pitchTarget = THREE.MathUtils.clamp(
            pitchTarget - dy * DRAG_PITCH_SPEED,
            MIN_PITCH,
            MAX_PITCH,
          );
        }
        return;
      }

      const now = performance.now();
      if (now - lastMoveRaycast < 65) return;
      lastMoveRaycast = now;
      if (!canPickRef.current) {
        hoveredIdRef.current = null;
        dom.style.cursor = 'default';
        return;
      }
      const hitId = getHitPlayerId(e.clientX, e.clientY);
      hoveredIdRef.current = hitId;
      dom.style.cursor = hitId ? 'pointer' : 'default';
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== activePointerId) return;
      dragging = false;
      activePointerId = null;
      dom.style.cursor = 'default';
      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      // Drag vs. click: only a near-stationary tap selects a player
      if (dragDistance < CLICK_SLOP_PX) {
        if (canPickRef.current && !sleepingRef.current) {
          const hitId = getHitPlayerId(e.clientX, e.clientY);
          if (hitId && hitId !== roomRef.current.me.playerId) {
            onSelectRef.current(hitId);
          }
        }
      }
      dragDistance = 0;
    };

    const onPointerCancel = () => {
      dragging = false;
      activePointerId = null;
      dragDistance = 0;
    };

    const onPointerLeave = () => {
      if (!dragging) {
        hoverYaw = 0;
        hoverPitch = 0;
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      // Double-clicking empty scenery smoothly recenters the view
      if (getHitPlayerId(e.clientX, e.clientY)) return;
      recenterView();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      recenterView();
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerCancel);
    dom.addEventListener('pointerleave', onPointerLeave);
    dom.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('keydown', onKeyDown);

    const ro = new ResizeObserver(() => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    ro.observe(container);

    let sleepBlend = 0;

    const stopLoop = startPacedLoop(renderer, isSoftwareGl, (dt, elapsed) => {
      const state = roomRef.current;
      const sleeping = sleepingRef.current;
      const selectedIds = selectedIdsRef.current;
      const hoveredId = hoveredIdRef.current;

      // Smooth sleep blend for camera tilt & character eyelids
      sleepBlend = THREE.MathUtils.damp(sleepBlend, sleeping ? 1 : 0, 5, dt);

      // Compute viewer's seat camera angle so we look across the table from our seat
      const myActor = actorsRef.current.get(state.me.playerId);
      const seatCount = Math.max(4, Math.min(10, state.players.length));
      const myIdx = myActor?.seatIndex ?? 0;
      const myAngle = (myIdx / seatCount) * Math.PI * 2;

      // Recenter requests coming from the HUD button
      if (recenterSignalRef.current !== lastRecenter) {
        lastRecenter = recenterSignalRef.current;
        recenterView();
      }

      // Sleeping locks free-look and gently settles the camera back to centre
      if (sleeping) {
        yawTarget = 0;
        pitchTarget = 0;
        hoverYaw = 0;
        hoverPitch = 0;
      }
      yaw = THREE.MathUtils.damp(yaw, yawTarget + hoverYaw, 9, dt);
      pitch = THREE.MathUtils.damp(pitch, pitchTarget + hoverPitch, 9, dt);

      // Seated perspective from the viewer's own armchair
      const camDist = SEAT_RADIUS + 1.55 - sleepBlend * 0.45;
      const camY = 3.55 - sleepBlend * 1.45;
      _camTargetPos.set(
        Math.sin(myAngle) * camDist,
        camY,
        Math.cos(myAngle) * camDist,
      );

      // Base direction looks across the circular table, then free-look rotates
      // that heading around the seat (yaw) and tilts it (pitch).
      const toCenterX = -_camTargetPos.x;
      const toCenterY = 1.25 - _camTargetPos.y;
      const toCenterZ = -_camTargetPos.z;
      const flatDist = Math.max(0.0001, Math.hypot(toCenterX, toCenterZ));
      const baseYaw = Math.atan2(toCenterX, toCenterZ);
      const basePitch = Math.atan2(toCenterY, flatDist);
      const lookYaw = baseYaw + yaw;
      const userPitch = THREE.MathUtils.clamp(basePitch + pitch, MIN_PITCH, MAX_PITCH);
      // Sleep adds a scripted downward tilt beyond the player-controlled clamp
      const finalPitch = THREE.MathUtils.clamp(
        userPitch - sleepBlend * 0.5,
        -1.15,
        MAX_PITCH,
      );
      const cosPitch = Math.cos(finalPitch);
      _camTargetLook.set(
        _camTargetPos.x + Math.sin(lookYaw) * cosPitch * 4.6,
        _camTargetPos.y + Math.sin(finalPitch) * 4.6,
        _camTargetPos.z + Math.cos(lookYaw) * cosPitch * 4.6,
      );

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 4.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 4.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 4.5, dt);
      _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _camTargetLook.x, 6, dt);
      _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _camTargetLook.y, 6, dt);
      _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _camTargetLook.z, 6, dt);
      camera.lookAt(_currentLook);

      // Update seated players (sleep animation, idle breathing, highlight rings)
      const phase: GamePhase = state.phase;
      const isNight =
        phase === 'NIGHT_SLEEP' ||
        phase === 'NIGHT_MAFIA' ||
        phase === 'NIGHT_DOCTOR' ||
        phase === 'NIGHT_DETECTIVE';

      for (const actor of actorsRef.current.values()) {
        const player = state.players.find((p) => p.id === actor.playerId);
        if (!player) continue;

        let actorShouldSleep = false;
        if (isNight && player.alive) {
          if (phase === 'NIGHT_SLEEP') {
            actorShouldSleep = true;
          } else if (phase === 'NIGHT_MAFIA') {
            actorShouldSleep = player.revealedRole !== 'mafia';
          } else if (phase === 'NIGHT_DOCTOR') {
            actorShouldSleep = player.revealedRole !== 'doctor';
          } else if (phase === 'NIGHT_DETECTIVE') {
            actorShouldSleep = player.revealedRole !== 'detective';
          }
        }

        actor.rig.setSleeping(actorShouldSleep ? 1 : 0, elapsed + actor.seatIndex * 0.7, dt);
        if (player.alive) {
          actor.rig.bodyGroup.position.y = Math.sin(elapsed * 2 + actor.seatIndex) * 0.015;
        }

        const isSelected = selectedIds.includes(player.id);
        const isPartnerPicked = Object.values(state.me.mafiaSelections).includes(player.id);
        const isHovered = hoveredId === player.id && canPickRef.current && player.alive;

        if (isSelected) {
          actor.rig.setHighlighted('#FACC15');
        } else if (isPartnerPicked) {
          actor.rig.setHighlighted('#FF3B5C');
        } else if (isHovered) {
          actor.rig.setHighlighted('#38B6FF');
        } else if (player.publiclyCleared) {
          actor.rig.setHighlighted('#22E58B');
        } else {
          actor.rig.setHighlighted(null);
        }
      }

      mapResultRef.current?.update(elapsed);
      renderer.render(scene, camera);
    });

    return () => {
      stopLoop();
      ro.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerCancel);
      dom.removeEventListener('pointerleave', onPointerLeave);
      dom.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKeyDown);
      for (const actor of actorsRef.current.values()) {
        scene.remove(actor.rig.root);
        actor.rig.dispose();
      }
      actorsRef.current.clear();
      disposeObject3D(scene);
      envTexture.dispose();
      renderer.dispose();
      sceneRef.current = null;
      mapResultRef.current = null;
      if (dom.parentNode === container) container.removeChild(dom);
    };
  }, []);

  // Re-sync seated actors & map when room state changes
  useEffect(() => {
    if (sceneRef.current) {
      syncSceneActors(sceneRef.current, room);
    }
  }, [room]);

  return (
    <div
      ref={containerRef}
      data-testid="game-scene-canvas"
      className="fixed inset-0 w-full h-full select-none touch-none"
    />
  );
}
