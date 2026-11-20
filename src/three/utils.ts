import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let cachedSoftwareGl: boolean | null = null;

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

export interface StudioRendererBundle {
  renderer: THREE.WebGLRenderer;
  envTexture: THREE.Texture;
  isSoftwareGl: boolean;
}

export function createStudioRenderer(
  container: HTMLElement,
  alpha = false,
): StudioRendererBundle {
  const isSoftwareGl = detectSoftwareGl();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  // Cap pixelRatio at 1.0 on software WebGL, or 1.5 on desktop/mobile GPUs
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = false; // Use crisp fake contact shadow discs for mobile + low-end speed

  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRt = pmrem.fromScene(new RoomEnvironment(), 0.04);
  pmrem.dispose();

  return { renderer, envTexture: envRt.texture, isSoftwareGl };
}

/**
 * Runs a continuous animation loop that uses requestAnimationFrame on GPUs
 * and WebGL2 fenceSync + afterDraw pacing on software WebGL so headless Chromium never stalls.
 */
export function startPacedLoop(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  onTick: (dt: number, elapsed: number) => void,
): () => void {
  let active = true;
  let paused = typeof document !== 'undefined' && document.hidden;
  let rafId = 0;
  let timerId = 0;
  let lastTime = performance.now();
  const startTime = lastTime;

  const afterDraw = (cb: () => void) => {
    const gl = renderer.getContext() as WebGL2RenderingContext | null;
    if (!gl || typeof gl.fenceSync !== 'function') {
      timerId = window.setTimeout(cb, 85);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!active || paused) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        timerId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        timerId = window.setTimeout(cb, 85);
      }
    };
    timerId = window.setTimeout(poll, 5);
  };

  const step = () => {
    if (!active || paused) return;
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    const elapsed = (now - startTime) / 1000;
    lastTime = now;

    onTick(dt, elapsed);

    if (!active || paused) return;
    if (isSoftwareGl) {
      afterDraw(step);
    } else {
      rafId = window.requestAnimationFrame(step);
    }
  };

  const onVisibilityChange = () => {
    if (!active) return;
    if (document.hidden) {
      paused = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = 0;
      }
    } else if (paused) {
      paused = false;
      lastTime = performance.now();
      rafId = window.requestAnimationFrame(step);
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  if (!paused) {
    rafId = window.requestAnimationFrame(step);
  }

  return () => {
    active = false;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
    if (rafId) window.cancelAnimationFrame(rafId);
    if (timerId) window.clearTimeout(timerId);
  };
}

let sharedShadowTex: THREE.CanvasTexture | null = null;
let sharedSleepZTex: THREE.CanvasTexture | null = null;

function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedShadowTex) return sharedShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(6, 4, 18, 0.65)');
  grad.addColorStop(0.55, 'rgba(6, 4, 18, 0.28)');
  grad.addColorStop(1, 'rgba(6, 4, 18, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  sharedShadowTex = new THREE.CanvasTexture(canvas);
  sharedShadowTex.colorSpace = THREE.SRGBColorSpace;
  return sharedShadowTex;
}

function getSharedSleepZTexture(): THREE.CanvasTexture {
  if (sharedSleepZTex) return sharedSleepZTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = '800 84px "Fredoka", "Poppins", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1B123A';
  ctx.strokeText('Z', 64, 68);
  ctx.fillStyle = '#C4B5FD';
  ctx.fillText('Z', 64, 68);

  sharedSleepZTex = new THREE.CanvasTexture(canvas);
  sharedSleepZTex.colorSpace = THREE.SRGBColorSpace;
  return sharedSleepZTex;
}

export function createContactShadowDisc(radius: number, opacity = 0.72): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 18);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  return mesh;
}

/**
 * Generates a crisp nameplate sprite supporting both Arabic RTL & English text shaping.
 */
export function createNameplateSprite(
  name: string,
  accentHex?: string,
  eliminated = false,
  voteCount = 0,
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rounded dark pill backing
  const padX = 28;
  const boxY = 22;
  const boxH = 82;
  const radius = 26;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(padX, boxY, canvas.width - padX * 2, boxH, radius);
  ctx.fillStyle = eliminated ? 'rgba(30, 18, 36, 0.78)' : 'rgba(20, 14, 46, 0.88)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = eliminated
    ? 'rgba(255, 59, 92, 0.45)'
    : accentHex || 'rgba(168, 85, 247, 0.72)';
  ctx.stroke();
  ctx.restore();

  // Detect Arabic characters to apply RTL text direction cleanly
  const isArabic = /[\u0600-\u06FF]/.test(name);
  ctx.direction = isArabic ? 'rtl' : 'ltr';
  ctx.font = isArabic
    ? '800 40px "Cairo", "Tajawal", sans-serif'
    : '700 38px "Fredoka", "Poppins", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const displayName = eliminated ? `✕ ${name}` : name;
  ctx.fillStyle = eliminated ? '#9CA3AF' : '#FFFFFF';
  ctx.fillText(displayName, canvas.width / 2, boxY + boxH / 2 + 2, canvas.width - 96);

  if (voteCount > 0 && !eliminated) {
    ctx.beginPath();
    ctx.arc(canvas.width - 52, 34, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#FACC15';
    ctx.fill();
    ctx.fillStyle = '#181036';
    ctx.font = '800 28px "Poppins", sans-serif';
    ctx.fillText(String(voteCount), canvas.width - 52, 36);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.65, 0.42, 1);
  return sprite;
}

export function createSleepZSprite(): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: getSharedSleepZTexture(),
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.32, 0.32, 1);
  return sprite;
}

function disposeTextureIfOwned(tex: THREE.Texture | null | undefined): void {
  if (!tex) return;
  if (tex === sharedShadowTex || tex === sharedSleepZTex) return;
  if (tex.userData?.shared) return;
  tex.dispose();
}

export function disposeObject3D(root: THREE.Object3D): void {
  const disposedGeos = new Set<THREE.BufferGeometry>();
  const disposedMats = new Set<THREE.Material>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !mesh.geometry.userData?.shared && !disposedGeos.has(mesh.geometry)) {
      disposedGeos.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat || mat.userData?.shared || disposedMats.has(mat)) continue;
        disposedMats.add(mat);
        const std = mat as THREE.MeshStandardMaterial;
        disposeTextureIfOwned(std.map);
        disposeTextureIfOwned(std.bumpMap);
        disposeTextureIfOwned(std.roughnessMap);
        disposeTextureIfOwned(std.normalMap);
        disposeTextureIfOwned(std.emissiveMap);
        disposeTextureIfOwned(std.alphaMap);
        disposeTextureIfOwned(std.aoMap);
        mat.dispose();
      }
    }
  });
}
