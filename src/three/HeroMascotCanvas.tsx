import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DEFAULT_APPEARANCE } from '../shared/catalog';
import { buildChibiCharacter } from './characterBuilder';
import {
  createContactShadowDisc,
  createStudioRenderer,
  disposeObject3D,
  startPacedLoop,
} from './utils';

export function HeroMascotCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

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
    camera.position.set(0, 1.56, 5.15);
    camera.lookAt(0, 0.95, 0);

    // Bright stylized 3-point cartoon lighting
    const hemi = new THREE.HemisphereLight('#F3E8FF', '#2E1E59', 1.25);
    const key = new THREE.DirectionalLight('#FFF1DC', 1.85);
    key.position.set(3.2, 5.4, 4.5);
    const fill = new THREE.DirectionalLight('#93C5FD', 0.6);
    fill.position.set(-4, 2.8, 3.2);
    const rim = new THREE.DirectionalLight('#A855F7', 1.1);
    rim.position.set(-2.5, 3.8, -4.2);
    scene.add(hemi, key, fill, rim);

    // Sleek purple/indigo tiered turntable platform matching mockup
    const stage = new THREE.Group();
    const baseDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.06, 1.14, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: '#2F2160', roughness: 0.55, metalness: 0.14 }),
    );
    baseDisc.position.y = -0.07;
    const innerTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.96, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: '#453282', roughness: 0.48, metalness: 0.12 }),
    );
    innerTop.position.y = 0.005;
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.04, 0.022, 8, 28),
      new THREE.MeshStandardMaterial({ color: '#8B74D6', roughness: 0.35, metalness: 0.35 }),
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.002;
    const shadow = createContactShadowDisc(0.72, 0.52);
    shadow.position.y = 0.028;
    stage.add(baseDisc, innerTop, rimRing, shadow);

    // Confident Mafia Boss Chibi Mascot with crossed arms & tilted red-banded fedora
    const mascot = buildChibiCharacter(
      {
        ...DEFAULT_APPEARANCE,
        gender: 'male',
        suitId: 0,
        pantsId: 0,
        hatId: 0,
        hairId: 0,
        skinColor: '#F7C6A2',
        hairColor: '#3D2318',
      },
      'standing',
      { crossedArms: true },
    );
    mascot.root.position.y = 0.024;
    stage.add(mascot.root);
    scene.add(stage);

    // Drag to spin interaction
    let isDragging = false;
    let lastX = 0;
    let targetRotY = -0.24;
    let currentRotY = -0.24;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      targetRotY += dx * 0.012;
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
      if (!isDragging) {
        targetRotY = -0.24 + Math.sin(elapsed * 0.7) * 0.18;
      }
      currentRotY = THREE.MathUtils.damp(currentRotY, targetRotY, 7, dt);
      stage.rotation.y = currentRotY;
      mascot.bodyGroup.position.y = Math.sin(elapsed * 2.3) * 0.02;
      mascot.headGroup.rotation.z = Math.sin(elapsed * 1.4) * 0.035;
      renderer.render(scene, camera);
    });

    return () => {
      stopLoop();
      ro.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      stage.remove(mascot.root);
      mascot.dispose();
      disposeObject3D(scene);
      envTexture.dispose();
      renderer.dispose();
      if (dom.parentNode === container) container.removeChild(dom);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="hero-mascot-canvas"
      className="w-full h-full cursor-grab active:cursor-grabbing select-none touch-none"
    />
  );
}
