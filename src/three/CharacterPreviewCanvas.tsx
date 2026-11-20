import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterAppearance } from '../shared/types';
import { buildChibiCharacter, ChibiCharacterRig } from './characterBuilder';
import {
  createContactShadowDisc,
  createStudioRenderer,
  disposeObject3D,
  startPacedLoop,
} from './utils';

interface CharacterPreviewCanvasProps {
  appearance: CharacterAppearance;
  rotationStepSignal: { dir: -1 | 1; seq: number };
}

export function CharacterPreviewCanvas({
  appearance,
  rotationStepSignal,
}: CharacterPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<THREE.Group | null>(null);
  const charRigRef = useRef<ChibiCharacterRig | null>(null);
  const targetRotYRef = useRef<number>(0);

  useEffect(() => {
    if (rotationStepSignal.seq > 0) {
      targetRotYRef.current += rotationStepSignal.dir * (Math.PI / 3);
    }
  }, [rotationStepSignal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { renderer, envTexture, isSoftwareGl } = createStudioRenderer(container, true);
    const scene = new THREE.Scene();
    scene.environment = envTexture;

    const camera = new THREE.PerspectiveCamera(
      32,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      50,
    );
    camera.position.set(0, 1.56, 5.18);
    camera.lookAt(0, 0.94, 0);

    // Bright stylized 3-point lighting matching the cartoon mockup
    const hemi = new THREE.HemisphereLight('#F3E8FF', '#2E1E59', 1.25);
    const key = new THREE.DirectionalLight('#FFF1DC', 1.85);
    key.position.set(3.2, 5.2, 4.5);
    const fill = new THREE.DirectionalLight('#93C5FD', 0.58);
    fill.position.set(-3.8, 2.8, 3.0);
    const rim = new THREE.DirectionalLight('#A855F7', 1.05);
    rim.position.set(-2.5, 3.8, -4.0);
    scene.add(hemi, key, fill, rim);

    // Sleek purple/indigo turntable platform (matches Lobby mockup)
    const stage = new THREE.Group();
    stageRef.current = stage;

    const baseDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.04, 1.12, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: '#2F2160', roughness: 0.55, metalness: 0.14 }),
    );
    baseDisc.position.y = -0.07;
    const innerTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.94, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: '#453282', roughness: 0.48, metalness: 0.12 }),
    );
    innerTop.position.y = 0.005;
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.02, 0.022, 8, 28),
      new THREE.MeshStandardMaterial({ color: '#8B74D6', roughness: 0.35, metalness: 0.35 }),
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.002;
    const shadow = createContactShadowDisc(0.7, 0.52);
    shadow.position.y = 0.028;
    stage.add(baseDisc, innerTop, rimRing, shadow);
    scene.add(stage);

    const initialRig = buildChibiCharacter(appearance, 'standing');
    initialRig.root.position.y = 0.024;
    stage.add(initialRig.root);
    charRigRef.current = initialRig;

    let isDragging = false;
    let lastX = 0;
    let currentRotY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      targetRotYRef.current += dx * 0.013;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    const syncSize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);
    syncSize();

    const stopLoop = startPacedLoop(renderer, isSoftwareGl, (dt, elapsed) => {
      currentRotY = THREE.MathUtils.damp(currentRotY, targetRotYRef.current, 10, dt);
      stage.rotation.y = currentRotY;
      if (charRigRef.current) {
        charRigRef.current.bodyGroup.position.y = Math.sin(elapsed * 2.4) * 0.018;
        charRigRef.current.headGroup.rotation.y = Math.sin(elapsed * 1.1) * 0.05;
      }
      renderer.render(scene, camera);
    });

    return () => {
      stopLoop();
      ro.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (charRigRef.current) {
        stage.remove(charRigRef.current.root);
        charRigRef.current.dispose();
        charRigRef.current = null;
      }
      disposeObject3D(scene);
      envTexture.dispose();
      renderer.dispose();
      stageRef.current = null;
      if (dom.parentNode === container) container.removeChild(dom);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if (charRigRef.current) {
      stage.remove(charRigRef.current.root);
      charRigRef.current.dispose();
      charRigRef.current = null;
    }

    const rig = buildChibiCharacter(appearance, 'standing');
    rig.root.position.y = 0.024;
    stage.add(rig.root);
    charRigRef.current = rig;
  }, [appearance]);

  return (
    <div
      ref={containerRef}
      data-testid="character-preview-canvas"
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing select-none touch-none"
    />
  );
}
