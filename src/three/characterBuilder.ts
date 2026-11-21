import * as THREE from 'three';
import { HAIR_CATALOG, HAT_CATALOG } from '../shared/catalog';
import { CharacterAppearance, Gender } from '../shared/types';
import { createChibiFaceTextures } from './faceTexture';
import { buildPantsAndShoesMesh, buildSuitMesh } from './outfitBuilder';
import { createSleepZSprite, disposeObject3D } from './utils';

export interface ChibiCharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  hairGroup: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  sleepZs: THREE.Sprite[];
  hitProxy: THREE.Mesh;
  selectionRing: THREE.Mesh;
  rebuildHair: (gender: Gender, hairId: number, hairColor: string, hatMode: boolean) => void;
  setSleeping: (factor: number, elapsed: number, dt?: number) => void;
  setHighlighted: (colorHex: string | null) => void;
  setEliminated: (eliminated: boolean) => void;
  dispose: () => void;
}

interface HatPlacement {
  y: number;
  z: number;
  tiltX: number;
  tiltZ: number;
}

const HAT_PLACEMENTS: Record<string, HatPlacement> = {
  fedora: { y: 0.22, z: 0.008, tiltX: -0.055, tiltZ: -0.075 },
  bowler: { y: 0.22, z: 0.0, tiltX: -0.02, tiltZ: -0.04 },
  top_hat: { y: 0.23, z: 0.0, tiltX: -0.03, tiltZ: -0.05 },
  beret: { y: 0.235, z: -0.015, tiltX: -0.06, tiltZ: -0.14 },
  cap: { y: 0.215, z: 0.012, tiltX: -0.04, tiltZ: 0.0 },
  beanie: { y: 0.205, z: -0.008, tiltX: -0.075, tiltZ: 0.0 },
  deerstalker: { y: 0.22, z: 0.0, tiltX: -0.02, tiltZ: 0.0 },
  cowboy: { y: 0.225, z: 0.006, tiltX: -0.055, tiltZ: -0.05 },
  crown: { y: 0.305, z: 0.0, tiltX: -0.04, tiltZ: 0.0 },
  sun_hat: { y: 0.22, z: 0.0, tiltX: -0.06, tiltZ: -0.045 },
};

// Shared head ellipsoid constants used by BOTH the head mesh and the seamless scalp cap
// so hair-to-skin clearance is mathematically exact with zero clipping or z-fighting.
const HEAD_R_BASE = 0.415;
const HEAD_Y_BASE = 0.395;
const HEAD_SCALE_X = 1.06;
const HEAD_SCALE_Y = 0.94;
const HEAD_SCALE_Z = 0.98;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Exact radial & vertical profile of the chibi head at normalized latitude t in [0, 1]
 * (0 = chin bottom, 0.5 = equator, 1 = top crown).
 */
function getHeadProfile(t: number): { r: number; y: number } {
  const angle = -Math.PI / 2 + t * Math.PI;
  const y = Math.sin(angle) * HEAD_Y_BASE;
  let r = Math.cos(angle) * HEAD_R_BASE;
  // Smooth, continuous chibi cheek fullness (no hard seam step)
  const cheekBell = smoothstep(0.08, 0.23, t) * (1 - smoothstep(0.36, 0.54, t));
  r *= 1 + 0.036 * cheekBell;
  return { r: Math.max(0.002, r), y };
}

/**
 * Evaluates a point and outward unit normal on the chibi head surface.
 * phi = 0 is dead-center front (+Z), +PI/2 is left (+X), -PI/2 is right (-X), ±PI is back (-Z).
 */
function evalHeadPointAndNormal(
  t: number,
  phi: number,
  outPos: THREE.Vector3,
  outNorm: THREE.Vector3,
): void {
  const { r, y } = getHeadProfile(t);
  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);
  outPos.set(r * sinP * HEAD_SCALE_X, y * HEAD_SCALE_Y, r * cosP * HEAD_SCALE_Z);

  // Numerical tangent along t for smooth analytical-grade normal
  const eps = 0.004;
  const pA = getHeadProfile(Math.max(0, t - eps));
  const pB = getHeadProfile(Math.min(1, t + eps));
  const dr = pB.r - pA.r;
  const dy = pB.y - pA.y;

  // Outward normal on scaled surface of revolution
  const nx = (dy * sinP) / HEAD_SCALE_X;
  const ny = (-dr) / HEAD_SCALE_Y;
  const nz = (dy * cosP) / HEAD_SCALE_Z;
  outNorm.set(nx, ny, nz);
  if (outNorm.lengthSq() < 1e-8) {
    outNorm.set(0, t > 0.5 ? 1 : -1, 0);
  } else {
    outNorm.normalize();
  }
}

// ============================================================================
// MAFIA-CARDS VINYL-TOY MATERIAL THEME
// ============================================================================

function makeVinylSkinMat(color: string | number): THREE.MeshPhysicalMaterial {
  const base = new THREE.Color(color);
  const sheenTint = base.clone().offsetHSL(-0.015, 0.14, 0.12);
  return new THREE.MeshPhysicalMaterial({
    color: base,
    roughness: 0.52,
    metalness: 0.0,
    sheen: 0.38,
    sheenRoughness: 0.65,
    sheenColor: sheenTint,
    clearcoat: 0.08,
    clearcoatRoughness: 0.55,
  });
}

function makeVinylHairMat(color: string | number): THREE.MeshPhysicalMaterial {
  const base = new THREE.Color(color);
  const sheenTint = base.clone().lerp(new THREE.Color('#FFFFFF'), 0.28);
  return new THREE.MeshPhysicalMaterial({
    color: base,
    roughness: 0.4,
    metalness: 0.04,
    sheen: 0.48,
    sheenRoughness: 0.48,
    sheenColor: sheenTint,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42,
    side: THREE.FrontSide,
  });
}

function makeSatinMat(
  color: string | number,
  roughness = 0.48,
  metalness = 0.06,
): THREE.MeshPhysicalMaterial {
  const base = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: base,
    roughness,
    metalness,
    sheen: metalness > 0.35 ? 0.0 : 0.3,
    sheenRoughness: 0.58,
    sheenColor: base.clone().lerp(new THREE.Color('#FFFFFF'), 0.2),
    clearcoat: metalness > 0.35 ? 0.35 : 0.1,
    clearcoatRoughness: 0.35,
  });
}

/**
 * Applies the cohesive MafiaCards vinyl-toy shading theme onto outfit & lower-body meshes
 * returned by outfitBuilder without altering their assigned colors or textures.
 */
function applyMafiaVinylTheme(group: THREE.Object3D): void {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial) {
        // Soften overly matte/chalky materials into warm vinyl-toy satin
        m.roughness = THREE.MathUtils.clamp(m.roughness * 0.86, 0.22, 0.58);
        m.metalness = THREE.MathUtils.clamp(m.metalness, 0.02, 0.75);
        m.needsUpdate = true;
      }
    }
  });
}

// ============================================================================
// SCULPTED HATS (MATCHING MAFIA-CARDS SILHOUETTE)
// ============================================================================

function buildHat(hatId: number): { group: THREE.Group; placement: HatPlacement } {
  const style = HAT_CATALOG[hatId % HAT_CATALOG.length];
  const placement = HAT_PLACEMENTS[style.variant] ?? HAT_PLACEMENTS.fedora;
  const group = new THREE.Group();
  const mainMat = makeSatinMat(style.primary, 0.44, 0.06);
  const bandMat = makeSatinMat(style.secondary, 0.32, 0.12);
  const accentMat = makeSatinMat(style.accent, 0.22, 0.72);

  switch (style.variant) {
    case 'fedora': {
      // Iconic MafiaCards sleek pinched fedora with curved brim & bold satin band
      const brimPts = [
        new THREE.Vector2(0.37, 0.008),
        new THREE.Vector2(0.52, -0.015),
        new THREE.Vector2(0.64, 0.024),
        new THREE.Vector2(0.625, 0.056),
        new THREE.Vector2(0.385, 0.048),
      ];
      const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 32), mainMat);
      brim.scale.set(1.06, 1, 1.1);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.415, 0.3, 28), mainMat);
      crown.position.y = 0.165;
      crown.scale.set(1.02, 1, 1.08);

      const crownCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.322, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.44),
        mainMat,
      );
      crownCap.position.y = 0.285;
      crownCap.scale.set(1.02, 0.38, 1.08);

      // Subtle top center crease for authentic mobster fedora look
      const crease = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 12), mainMat);
      crease.rotation.x = Math.PI / 2;
      crease.position.set(0, 0.345, 0.01);
      crease.scale.set(0.85, 0.45, 1);

      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.416, 0.082, 28), bandMat);
      band.position.y = 0.082;
      band.scale.set(1.025, 1, 1.085);

      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.052, 0.032), accentMat);
      pin.position.set(0.33, 0.082, 0.235);
      pin.rotation.y = 0.95;

      group.add(brim, crown, crownCap, crease, band, pin);
      break;
    }
    case 'bowler': {
      const brimPts = [
        new THREE.Vector2(0.37, 0.01),
        new THREE.Vector2(0.5, 0.008),
        new THREE.Vector2(0.57, 0.068),
        new THREE.Vector2(0.54, 0.086),
        new THREE.Vector2(0.38, 0.042),
      ];
      const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 28), mainMat);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.415, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
        mainMat,
      );
      dome.position.y = 0.03;
      dome.scale.set(1.03, 0.97, 1.03);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.42, 0.07, 28), bandMat);
      band.position.y = 0.072;
      group.add(brim, dome, band);
      break;
    }
    case 'top_hat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.57, 0.04, 28), mainMat);
      brim.position.y = 0.02;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.38, 0.5, 26), mainMat);
      cyl.position.y = 0.27;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.386, 0.09, 26), bandMat);
      band.position.y = 0.088;
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.038), accentMat);
      buckle.position.set(0, 0.088, 0.382);
      group.add(brim, cyl, band, buckle);
      break;
    }
    case 'beret': {
      const disk = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), mainMat);
      disk.scale.set(1.13, 0.42, 1.09);
      disk.position.set(0.05, 0.125, -0.02);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.042, 12, 28), bandMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.032;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.09, 10), bandMat);
      stem.position.set(0.05, 0.32, -0.02);
      group.add(disk, rim, stem);
      break;
    }
    case 'cap': {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mainMat,
      );
      dome.scale.set(1.05, 0.96, 1.03);
      const bill = new THREE.Mesh(
        new THREE.CylinderGeometry(0.37, 0.4, 0.044, 22, 1, false, -Math.PI * 0.38, Math.PI * 0.76),
        bandMat,
      );
      bill.position.set(0, 0.02, 0.265);
      bill.rotation.x = 0.1;
      const frontPatch = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), bandMat);
      frontPatch.scale.set(1.2, 0.9, 0.3);
      frontPatch.position.set(0, 0.185, 0.425);
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 10), accentMat);
      button.position.y = 0.425;
      group.add(dome, bill, frontPatch, button);
      break;
    }
    case 'beanie': {
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.078, 12, 28), bandMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = 0.048;
      const knit = new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
        mainMat,
      );
      knit.scale.set(1.05, 0.96, 1.03);
      knit.position.y = 0.048;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12), accentMat);
      pom.position.y = 0.485;
      group.add(cuff, knit, pom);
      break;
    }
    case 'deerstalker': {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.435, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
        mainMat,
      );
      dome.scale.set(1.05, 0.96, 1.03);
      const frontBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.345, 0.042, 20), bandMat);
      frontBrim.scale.set(1.05, 1, 0.72);
      frontBrim.position.set(0, 0.015, 0.305);
      const backBrim = frontBrim.clone();
      backBrim.position.z = -0.305;
      const earFlapL = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.145, 8, 10), bandMat);
      earFlapL.position.set(-0.43, 0.06, 0);
      earFlapL.rotation.z = 0.25;
      const earFlapR = earFlapL.clone();
      earFlapR.position.x = 0.43;
      earFlapR.rotation.z = -0.25;
      group.add(dome, frontBrim, backBrim, earFlapL, earFlapR);
      break;
    }
    case 'cowboy': {
      const brimPts = [
        new THREE.Vector2(0.38, 0.0),
        new THREE.Vector2(0.55, -0.02),
        new THREE.Vector2(0.67, 0.082),
        new THREE.Vector2(0.65, 0.114),
        new THREE.Vector2(0.395, 0.042),
      ];
      const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 28), mainMat);
      brim.scale.set(1.1, 1, 0.97);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.41, 0.325, 24), mainMat);
      crown.position.y = 0.175;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.395, 0.415, 0.072, 24), bandMat);
      band.position.y = 0.072;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), accentMat);
      star.position.set(0, 0.142, 0.39);
      group.add(brim, crown, band, star);
      break;
    }
    case 'crown': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.325, 0.165, 24), accentMat);
      base.position.y = 0.082;
      const innerVelvet = new THREE.Mesh(new THREE.SphereGeometry(0.305, 18, 12), bandMat);
      innerVelvet.scale.set(1, 0.55, 1);
      innerVelvet.position.y = 0.145;
      group.add(base, innerVelvet);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.205, 8), accentMat);
        spike.position.set(Math.sin(angle) * 0.3, 0.245, Math.cos(angle) * 0.3);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), accentMat);
        orb.position.set(Math.sin(angle) * 0.3, 0.358, Math.cos(angle) * 0.3);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 0), bandMat);
        gem.position.set(Math.sin(angle) * 0.346, 0.092, Math.cos(angle) * 0.346);
        group.add(spike, orb, gem);
      }
      break;
    }
    case 'sun_hat':
    default: {
      const brimPts = [
        new THREE.Vector2(0.38, 0.02),
        new THREE.Vector2(0.59, 0.01),
        new THREE.Vector2(0.72, -0.04),
        new THREE.Vector2(0.7, -0.01),
        new THREE.Vector2(0.395, 0.052),
      ];
      const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 28), mainMat);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.425, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
        mainMat,
      );
      dome.scale.set(1.04, 0.96, 1.02);
      dome.position.y = 0.02;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.43, 0.078, 24), bandMat);
      ribbon.position.y = 0.072;
      group.add(brim, dome, ribbon);
      break;
    }
  }

  return { group, placement };
}

// ============================================================================
// CHIBI HEAD GEOMETRY (PURE SKIN, EXACT SHARED PROFILE)
// ============================================================================

/**
 * Smooth vinyl-toy chibi head LatheGeometry (pure skin mesh — ZERO hair baked in).
 * Built with phiStart = -Math.PI so UV u = 0.50 lands dead-center on front (+Z)
 * and the UV seam sits invisibly behind the head (-Z).
 */
function createChibiHeadGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { r, y } = getHeadProfile(t);
    pts.push(new THREE.Vector2(r, y));
  }
  const geo = new THREE.LatheGeometry(pts, 36, -Math.PI, Math.PI * 2);
  geo.scale(HEAD_SCALE_X, HEAD_SCALE_Y, HEAD_SCALE_Z);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// GLITCH-FREE SCULPTED HAIR GEOMETRY PRIMITIVES
// ============================================================================

interface ScalpCapOptions {
  /** Minimum latitude t at center forehead (phi=0). Higher = higher forehead. */
  frontT: number;
  /** Minimum latitude t around temples (|phi| ~ 0.36*PI). */
  templeT: number;
  /** Minimum latitude t behind ears (|phi| ~ 0.58*PI). */
  sideT: number;
  /** Minimum latitude t at rear nape (|phi| = PI). */
  napeT: number;
  /** Outward radial thickness over the skull surface. */
  thickness: number;
  /** Extra top crown loft (set to 0 in hatMode so hats never clip). */
  crownBoost?: number;
  /** Optional center or side part notch in the hairline. */
  partPhi?: number | null;
  partDepth?: number;
  /** Optional forehead dip / widow's peak. */
  frontPeak?: number;
}

/**
 * Builds ONE single, watertight, seamless, solid-rimmed scalp cap directly from
 * `evalHeadPointAndNormal`.
 * - ZERO overlapping zones (eliminates all coplanar z-fighting).
 * - Guaranteed outward offset over the exact head profile (eliminates skin poke-through).
 * - Smoothly rolled tucked hairline rim (eliminates paper-thin DoubleSide edges).
 * - Welded seam and crown pole normals (eliminates vertical crease artifacts).
 */
function createSeamlessScalpCap(opts: ScalpCapOptions): THREE.BufferGeometry {
  const phiSegs = 48;
  const ringSegs = 22;
  const {
    frontT,
    templeT,
    sideT,
    napeT,
    thickness,
    crownBoost = 0,
    partPhi = null,
    partDepth = 0.045,
    frontPeak = 0,
  } = opts;

  const hairlineT = (phi: number): number => {
    const a = Math.abs(phi) / Math.PI; // 0 = front (+Z), 0.5 = ear (±X), 1 = back (-Z)
    const wTemple = smoothstep(0.08, 0.34, a);
    const wSide = smoothstep(0.38, 0.58, a);
    const wNape = smoothstep(0.62, 0.9, a);

    let tMin = THREE.MathUtils.lerp(frontT, templeT, wTemple);
    tMin = THREE.MathUtils.lerp(tMin, sideT, wSide);
    tMin = THREE.MathUtils.lerp(tMin, napeT, wNape);

    // Optional soft V-dip at center forehead
    if (frontPeak !== 0) {
      const peakW = 1 - smoothstep(0, 0.16, a);
      tMin -= frontPeak * peakW;
    }

    // Optional gentle hairline part notch
    if (partPhi !== null) {
      const dPart = Math.abs(phi - partPhi);
      const partW = 1 - smoothstep(0, 0.22, dPart);
      tMin += partDepth * partW;
    }

    return THREE.MathUtils.clamp(tMin, 0.12, 0.85);
  };

  // Ring 0 is the crown pole (single vertex), rings 1..ringSegs have phiSegs vertices each.
  const vertCount = 1 + ringSegs * phiSegs;
  const positions = new Float32Array(vertCount * 3);
  const pos = new THREE.Vector3();
  const norm = new THREE.Vector3();

  // Crown pole (vertex 0)
  evalHeadPointAndNormal(1.0, 0, pos, norm);
  const poleOffset = thickness + crownBoost;
  positions[0] = pos.x + norm.x * poleOffset;
  positions[1] = pos.y + norm.y * poleOffset;
  positions[2] = pos.z + norm.z * poleOffset;

  for (let r = 1; r <= ringSegs; r++) {
    const v = r / ringSegs; // 0 = crown, 1 = tucked hairline rim
    // Last 2 rings roll smoothly inward into the head so the rim looks plump and watertight
    let latProgress: number;
    let offsetScale: number;
    if (v <= 0.86) {
      latProgress = v / 0.86;
      // Gentle dome bevel approaching the rim
      offsetScale = 1 - 0.12 * smoothstep(0.65, 0.86, v);
    } else {
      const rimU = (v - 0.86) / 0.14; // 0..1 across rolled rim
      latProgress = 1.0 + 0.015 * Math.sin(rimU * Math.PI);
      // Roll from 0.88 * thickness smoothly down to -0.005 inside the head
      offsetScale = THREE.MathUtils.lerp(0.88, -0.22, smoothstep(0, 1, rimU));
    }

    const crownW = Math.pow(Math.max(0, 1 - latProgress), 1.8);

    for (let s = 0; s < phiSegs; s++) {
      const phi = -Math.PI + (s / phiSegs) * Math.PI * 2;
      const tMin = hairlineT(phi);
      const t = THREE.MathUtils.clamp(1.0 - latProgress * (1.0 - tMin), 0.06, 0.999);
      evalHeadPointAndNormal(t, phi, pos, norm);

      const outOffset = thickness * offsetScale + crownBoost * crownW * Math.max(0, offsetScale);
      const idx = (1 + (r - 1) * phiSegs + s) * 3;
      positions[idx] = pos.x + norm.x * outOffset;
      positions[idx + 1] = pos.y + norm.y * outOffset;
      positions[idx + 2] = pos.z + norm.z * outOffset;
    }
  }

  const indices: number[] = [];
  // Crown fan (outward +Y FrontSide winding)
  for (let s = 0; s < phiSegs; s++) {
    const sNext = (s + 1) % phiSegs;
    indices.push(0, 1 + s, 1 + sNext);
  }
  // Ring quads
  for (let r = 1; r < ringSegs; r++) {
    const rowA = 1 + (r - 1) * phiSegs;
    const rowB = 1 + r * phiSegs;
    for (let s = 0; s < phiSegs; s++) {
      const sNext = (s + 1) % phiSegs;
      const a = rowA + s;
      const b = rowA + sNext;
      const c = rowB + s;
      const d = rowB + sNext;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

interface SculptedStrandOptions {
  radius: number;
  widthScale?: number;
  depthScale?: number;
  segments?: number;
  radialSegments?: number;
  tipSharpness?: number;
  rootBulge?: number;
  /** Cross-section ridge crest for crisp vinyl-toy hair locks (0 = round, 0.25 = sculpted). */
  ridge?: number;
}

/**
 * Builds a watertight, closed, manifold 3D sculpted hair lock along a smooth CatmullRomCurve3
 * using a twist-free parallel-transport frame.
 * Eliminates all flat shards, open edges, and Frenet twisting artifacts.
 */
function createSculptedStrandGeometry(
  points: [number, number, number][],
  opts: SculptedStrandOptions,
): THREE.BufferGeometry {
  const {
    radius,
    widthScale = 1.25,
    depthScale = 0.78,
    segments = 18,
    radialSegments = 10,
    tipSharpness = 0.85,
    rootBulge = 0.35,
    ridge = 0.16,
  } = opts;

  const curvePts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(curvePts, false, 'centripetal', 0.5);

  const centers: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    centers.push(curve.getPoint(u));
    tangents.push(curve.getTangent(u).normalize());
  }

  // Twist-free Bishop (parallel transport) frame oriented outward from head center
  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];

  const firstOut = centers[0].clone().normalize();
  if (firstOut.lengthSq() < 0.01) firstOut.set(0, 0, 1);
  let n0 = firstOut.clone().addScaledVector(tangents[0], -firstOut.dot(tangents[0]));
  if (n0.lengthSq() < 1e-4) {
    const fallback = Math.abs(tangents[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    n0 = fallback.clone().addScaledVector(tangents[0], -fallback.dot(tangents[0]));
  }
  n0.normalize();
  const b0 = new THREE.Vector3().crossVectors(tangents[0], n0).normalize();
  normals.push(n0);
  binormals.push(b0);

  const rotAxis = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  for (let i = 1; i <= segments; i++) {
    const prevT = tangents[i - 1];
    const currT = tangents[i];
    const prevN = normals[i - 1];
    rotAxis.crossVectors(prevT, currT);
    const axisLen = rotAxis.length();
    let currN: THREE.Vector3;
    if (axisLen > 1e-5) {
      rotAxis.divideScalar(axisLen);
      const angle = Math.acos(THREE.MathUtils.clamp(prevT.dot(currT), -1, 1));
      quat.setFromAxisAngle(rotAxis, angle);
      currN = prevN.clone().applyQuaternion(quat).normalize();
    } else {
      currN = prevN.clone();
    }
    // Re-orthogonalize
    currN.addScaledVector(currT, -currN.dot(currT)).normalize();
    const currB = new THREE.Vector3().crossVectors(currT, currN).normalize();
    normals.push(currN);
    binormals.push(currB);
  }

  // Vertices: start pole + (segments - 1) interior rings + end pole
  const innerRings = segments - 1;
  const vertCount = 2 + innerRings * radialSegments;
  const positions = new Float32Array(vertCount * 3);

  // Start pole (index 0)
  positions[0] = centers[0].x;
  positions[1] = centers[0].y;
  positions[2] = centers[0].z;

  // End pole (index vertCount - 1)
  const lastIdx = (vertCount - 1) * 3;
  positions[lastIdx] = centers[segments].x;
  positions[lastIdx + 1] = centers[segments].y;
  positions[lastIdx + 2] = centers[segments].z;

  const pTmp = new THREE.Vector3();
  for (let i = 1; i < segments; i++) {
    const u = i / segments;
    // Plump cartoon lock profile: soft rounded root -> full mid-body -> crisp tapered tip
    const rootRamp = Math.pow(Math.sin(Math.min(1, u / rootBulge) * (Math.PI / 2)), 0.72);
    const tipFalloff = Math.pow(Math.max(0, 1 - Math.max(0, u - 0.22) / 0.78), tipSharpness);
    const rProfile = radius * rootRamp * tipFalloff;

    const c = centers[i];
    const n = normals[i];
    const b = binormals[i];

    for (let j = 0; j < radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      // Subtle stylized sculpted ridge on the outer face (cosA > 0)
      const ridgeBoost = cosA > 0 ? 1 + ridge * Math.pow(cosA, 2) : 1 - ridge * 0.35;
      const localN = cosA * depthScale * ridgeBoost * rProfile;
      const localB = sinA * widthScale * rProfile;

      pTmp.copy(c).addScaledVector(n, localN).addScaledVector(b, localB);
      const idx = (1 + (i - 1) * radialSegments + j) * 3;
      positions[idx] = pTmp.x;
      positions[idx + 1] = pTmp.y;
      positions[idx + 2] = pTmp.z;
    }
  }

  const indices: number[] = [];
  // Start cap (outward FrontSide)
  for (let j = 0; j < radialSegments; j++) {
    const jNext = (j + 1) % radialSegments;
    indices.push(0, 1 + jNext, 1 + j);
  }
  // Middle rings
  for (let i = 0; i < innerRings - 1; i++) {
    const rowA = 1 + i * radialSegments;
    const rowB = 1 + (i + 1) * radialSegments;
    for (let j = 0; j < radialSegments; j++) {
      const jNext = (j + 1) % radialSegments;
      const a = rowA + j;
      const b = rowA + jNext;
      const c = rowB + j;
      const d = rowB + jNext;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  // End cap
  const endPole = vertCount - 1;
  const lastRow = 1 + (innerRings - 1) * radialSegments;
  for (let j = 0; j < radialSegments; j++) {
    const jNext = (j + 1) % radialSegments;
    indices.push(endPole, lastRow + j, lastRow + jNext);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

interface SculptedCurtainOptions {
  topY: number;
  bottomY: number;
  /** Half-angular span from back center (-Z). e.g. 0.55*PI wraps past ears. */
  halfArc: number;
  topRadiusX: number;
  topRadiusZ: number;
  /** Bottom flare (>1 flares out, <1 curls inward like a bob). */
  bottomScale: number;
  /** Thickness of the solid double-walled drape. */
  thickness: number;
  /** Subtle stylized vertical wave flutes along the circumference. */
  waveCount?: number;
  waveAmp?: number;
  /** Forward/backward curve shift at bottom hem. */
  zShiftBottom?: number;
}

/**
 * Builds a closed, solid, double-walled sculpted hair curtain for bobs, shoulder cuts,
 * and long flowing hair. Zero open hollow cylinder edges or DoubleSide artifacts.
 */
function createSculptedCurtainGeometry(opts: SculptedCurtainOptions): THREE.BufferGeometry {
  const {
    topY,
    bottomY,
    halfArc,
    topRadiusX,
    topRadiusZ,
    bottomScale,
    thickness,
    waveCount = 7,
    waveAmp = 0.018,
    zShiftBottom = -0.02,
  } = opts;

  const uSegs = 32; // around back arc
  const vSegs = 16; // top to bottom

  // We build a closed loop cross-section around the thickness (outer face -> rounded bottom -> inner face -> top)
  // For clean shading, we parameterize a closed profile loop of `loopSegs` samples in (v, side)
  // around the vertical slice, repeated for each azimuth `u`, and capped smoothly at both side edges (`u=0` and `u=1`).
  const profilePts: Array<{ v: number; off: number }> = [];
  // Outer wall: top (v=0) -> bottom (v=1)
  for (let i = 0; i <= vSegs; i++) {
    const v = i / vSegs;
    const edgeRound = Math.sin(Math.min(1, v / 0.12) * (Math.PI / 2)) * Math.sin(Math.min(1, (1 - v) / 0.14) * (Math.PI / 2));
    profilePts.push({ v, off: thickness * 0.5 * (0.25 + 0.75 * edgeRound) });
  }
  // Inner wall: bottom (v=1) -> top (v=0)
  for (let i = vSegs - 1; i >= 1; i--) {
    const v = i / vSegs;
    const edgeRound = Math.sin(Math.min(1, v / 0.12) * (Math.PI / 2)) * Math.sin(Math.min(1, (1 - v) / 0.14) * (Math.PI / 2));
    profilePts.push({ v, off: -thickness * 0.5 * (0.25 + 0.75 * edgeRound) });
  }

  const pLen = profilePts.length;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iu = 0; iu <= uSegs; iu++) {
    const u = iu / uSegs; // 0..1 across arc
    const phi = Math.PI - halfArc + u * (halfArc * 2); // centered around PI (-Z)
    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);
    // Taper thickness smoothly to 0 at left/right arc edges so edges close cleanly
    const edgePinch = Math.sin(u * Math.PI);
    const edgeFactor = Math.pow(edgePinch, 0.45);
    const flute = Math.sin(u * Math.PI * waveCount) * waveAmp * edgePinch;

    for (let ip = 0; ip < pLen; ip++) {
      const { v, off } = profilePts[ip];
      // Smooth S-curve vertical drape
      const y = THREE.MathUtils.lerp(topY, bottomY, v);
      const midBulge = Math.sin(v * Math.PI) * 0.04;
      const scaleV = THREE.MathUtils.lerp(1.0, bottomScale, smoothstep(0, 1, v)) + midBulge;
      const waveV = flute * smoothstep(0.15, 0.85, v);
      const radOff = off * edgeFactor + waveV;

      const rx = topRadiusX * scaleV + radOff;
      const rz = topRadiusZ * scaleV + radOff;
      const x = sinP * rx;
      const z = cosP * rz + zShiftBottom * v * v;
      positions.push(x, y, z);
    }
  }

  for (let iu = 0; iu < uSegs; iu++) {
    const rowA = iu * pLen;
    const rowB = (iu + 1) * pLen;
    for (let ip = 0; ip < pLen; ip++) {
      const ipNext = (ip + 1) % pLen;
      const a = rowA + ip;
      const b = rowA + ipNext;
      const c = rowB + ip;
      const d = rowB + ipNext;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// SINGLE REACTIVE HAIR BUILDER (ALL 10 MALE + ALL 10 FEMALE + BALD)
// ============================================================================

function populateHairGroup(
  hairGroup: THREE.Group,
  gender: Gender,
  hairId: number,
  hairColor: string,
  hatMode: boolean,
): void {
  while (hairGroup.children.length > 0) {
    const child = hairGroup.children[0];
    hairGroup.remove(child);
    disposeObject3D(child);
  }

  const catalog = HAIR_CATALOG[gender];
  const style = catalog[hairId % catalog.length];

  if (style.variant === 'bald') {
    return;
  }

  const hairMat = makeVinylHairMat(hairColor);

  const addCap = (opts: ScalpCapOptions) => {
    const capGeo = createSeamlessScalpCap({
      ...opts,
      thickness: hatMode ? Math.min(opts.thickness, 0.017) : opts.thickness,
      crownBoost: hatMode ? 0 : (opts.crownBoost ?? 0),
    });
    const mesh = new THREE.Mesh(capGeo, hairMat);
    hairGroup.add(mesh);
    return mesh;
  };

  const addStrand = (points: [number, number, number][], opts: SculptedStrandOptions) => {
    const mesh = new THREE.Mesh(createSculptedStrandGeometry(points, opts), hairMat);
    hairGroup.add(mesh);
    return mesh;
  };

  const addCurtain = (opts: SculptedCurtainOptions) => {
    const mesh = new THREE.Mesh(createSculptedCurtainGeometry(opts), hairMat);
    hairGroup.add(mesh);
    return mesh;
  };

  const addVolume = (
    pos: [number, number, number],
    radius: number,
    scale: [number, number, number] = [1, 1, 1],
    rot: [number, number, number] = [0, 0, 0],
  ) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 16), hairMat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    hairGroup.add(mesh);
    return mesh;
  };

  const addSideburns = (length: number, thick = 0.044) => {
    for (const side of [-1, 1]) {
      addStrand(
        [
          [side * 0.405, 0.145, 0.13],
          [side * 0.432, 0.055, 0.105],
          [side * 0.422, 0.055 - length, 0.085],
        ],
        { radius: thick, widthScale: 1.15, depthScale: 0.62, segments: 10, radialSegments: 8 },
      );
    }
  };

  const addTie = (
    color: string,
    pos: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
    radius = 0.082,
    tube = 0.028,
  ) => {
    const tieMat = makeSatinMat(color, 0.3, 0.14);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 22), tieMat);
    tie.position.set(pos[0], pos[1], pos[2]);
    tie.rotation.set(rot[0], rot[1], rot[2]);
    hairGroup.add(tie);
    return tie;
  };

  const addSculptedBow = (pos: [number, number, number], size = 1, color = '#FF3B5C') => {
    const bowMat = makeSatinMat(color, 0.28, 0.16);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.048 * size, 16, 12), bowMat);
    knot.scale.set(1.05, 0.9, 0.85);
    knot.position.set(pos[0], pos[1], pos[2]);
    hairGroup.add(knot);

    for (const side of [-1, 1]) {
      // Plush curved ribbon loop
      const loopCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pos[0], pos[1], pos[2]),
        new THREE.Vector3(pos[0] + side * 0.095 * size, pos[1] + 0.055 * size, pos[2] - 0.015 * size),
        new THREE.Vector3(pos[0] + side * 0.155 * size, pos[1] + 0.008 * size, pos[2] - 0.025 * size),
        new THREE.Vector3(pos[0] + side * 0.09 * size, pos[1] - 0.045 * size, pos[2] - 0.015 * size),
        new THREE.Vector3(pos[0], pos[1], pos[2]),
      ]);
      const loopMesh = new THREE.Mesh(new THREE.TubeGeometry(loopCurve, 18, 0.028 * size, 10, false), bowMat);
      loopMesh.scale.set(1, 1, 0.72);
      hairGroup.add(loopMesh);

      // Soft curved ribbon tail (replaces blocky BoxGeometry)
      const tailGeo = createSculptedStrandGeometry(
        [
          [pos[0] + side * 0.012 * size, pos[1] - 0.01 * size, pos[2] - 0.006 * size],
          [pos[0] + side * 0.055 * size, pos[1] - 0.085 * size, pos[2] - 0.02 * size],
          [pos[0] + side * 0.095 * size, pos[1] - 0.165 * size, pos[2] - 0.01 * size],
        ],
        { radius: 0.028 * size, widthScale: 1.45, depthScale: 0.45, segments: 12, radialSegments: 8, tipSharpness: 0.5 },
      );
      hairGroup.add(new THREE.Mesh(tailGeo, bowMat));
    }
  };

  // Helper: Signature MafiaCards layered swept bangs (like the Customize preview character!)
  const addMafiaSweptBangs = (dir: 1 | -1 = 1, fuller = true) => {
    const yOff = hatMode ? -0.025 : 0;
    const rScale = hatMode ? 0.84 : fuller ? 1.05 : 0.94;

    // Primary lush sweeping forehead lock
    addStrand(
      [
        [-dir * 0.22, 0.31 + yOff, 0.25],
        [-dir * 0.04, 0.265 + yOff, 0.375],
        [dir * 0.15, 0.195 + yOff, 0.388],
        [dir * 0.29, 0.125 + yOff, 0.31],
      ],
      { radius: 0.072 * rScale, widthScale: 1.35, depthScale: 0.76, segments: 18 },
    );

    // Secondary lower overlapping cartoon bang tuft
    addStrand(
      [
        [-dir * 0.16, 0.26 + yOff, 0.315],
        [dir * 0.02, 0.2 + yOff, 0.398],
        [dir * 0.18, 0.13 + yOff, 0.372],
      ],
      { radius: 0.056 * rScale, widthScale: 1.3, depthScale: 0.72, segments: 16 },
    );

    // Soft center-left accent wisp giving the charming V-part silhouette
    addStrand(
      [
        [-dir * 0.2, 0.27 + yOff, 0.295],
        [-dir * 0.28, 0.195 + yOff, 0.318],
        [-dir * 0.35, 0.115 + yOff, 0.26],
      ],
      { radius: 0.054 * rScale, widthScale: 1.22, depthScale: 0.72, segments: 14 },
    );

    // Temple-framing side locks hugging cleanly above the ears
    addStrand(
      [
        [dir * 0.24, 0.24 + yOff, 0.26],
        [dir * 0.37, 0.145 + yOff, 0.215],
        [dir * 0.415, 0.04 + yOff, 0.145],
      ],
      { radius: 0.052 * rScale, widthScale: 1.2, depthScale: 0.7, segments: 14 },
    );
  };

  if (gender === 'male') {
    switch (style.variant) {
      // 1. SIDE PART — Signature MafiaCards Customize-screen lush layered side-swept waves
      case 'side_part': {
        addCap({
          frontT: 0.66,
          templeT: 0.56,
          sideT: 0.44,
          napeT: 0.24,
          thickness: 0.032,
          crownBoost: 0.032,
          partPhi: -0.42,
          partDepth: 0.04,
        });
        addSideburns(0.115, 0.044);
        addMafiaSweptBangs(1, true);

        if (!hatMode) {
          // Layered sculpted waves flowing over the crown (matching Customize character)
          addStrand(
            [
              [-0.22, 0.33, 0.1],
              [-0.02, 0.415, 0.16],
              [0.2, 0.375, 0.14],
              [0.37, 0.24, 0.05],
            ],
            { radius: 0.085, widthScale: 1.45, depthScale: 0.78, segments: 18 },
          );
          addStrand(
            [
              [-0.18, 0.355, -0.04],
              [0.04, 0.425, 0.0],
              [0.25, 0.36, -0.05],
              [0.39, 0.2, -0.1],
            ],
            { radius: 0.082, widthScale: 1.42, depthScale: 0.76, segments: 18 },
          );
          addStrand(
            [
              [-0.24, 0.3, 0.12],
              [-0.36, 0.25, 0.04],
              [-0.41, 0.14, -0.05],
            ],
            { radius: 0.064, widthScale: 1.25, depthScale: 0.74, segments: 14 },
          );
        }

        // Clean sculpted nape feathers
        for (let i = -2; i <= 2; i++) {
          const x = i * 0.115;
          const z = -0.395 + Math.abs(i) * 0.032;
          addStrand(
            [
              [x * 0.9, -0.04, z + 0.02],
              [x, -0.14, z - 0.015],
              [x * 1.05, -0.225, z + 0.01],
            ],
            { radius: 0.046, widthScale: 1.25, depthScale: 0.65, segments: 10, radialSegments: 8 },
          );
        }
        break;
      }

      // 2. SPIKY — Mafia's Turn left-card dynamic sculpted anime spikes & layered bangs
      case 'spiky': {
        addCap({
          frontT: 0.67,
          templeT: 0.56,
          sideT: 0.44,
          napeT: 0.25,
          thickness: 0.03,
          crownBoost: 0.02,
        });
        addSideburns(0.11, 0.042);

        // Crisp jagged forehead bangs
        const bangDefs: Array<[number, number, number]> = [
          [-0.24, 0.145, 0.31],
          [-0.12, 0.135, 0.375],
          [0.01, 0.125, 0.395],
          [0.14, 0.14, 0.37],
          [0.25, 0.155, 0.305],
        ];
        const yOff = hatMode ? -0.025 : 0;
        for (const [bx, by, bz] of bangDefs) {
          addStrand(
            [
              [bx * 0.78, 0.28 + yOff, bz - 0.075],
              [bx * 0.94, by + 0.07 + yOff, bz + 0.015],
              [bx * 1.04, by + yOff, bz - 0.01],
            ],
            { radius: hatMode ? 0.048 : 0.056, widthScale: 1.25, depthScale: 0.72, segments: 12 },
          );
        }

        if (!hatMode) {
          // Sculpted curved upward & swept spikes (clean solid roots inside cap)
          const spikes: [number, number, number][][] = [
            [[0.0, 0.31, 0.1], [0.02, 0.44, 0.15], [0.06, 0.52, 0.11]],
            [[-0.14, 0.29, 0.12], [-0.21, 0.42, 0.16], [-0.28, 0.49, 0.12]],
            [[0.15, 0.29, 0.1], [0.23, 0.42, 0.13], [0.3, 0.48, 0.08]],
            [[-0.2, 0.28, -0.06], [-0.31, 0.38, -0.09], [-0.39, 0.43, -0.14]],
            [[0.2, 0.28, -0.06], [0.31, 0.38, -0.09], [0.39, 0.43, -0.14]],
            [[0.0, 0.31, -0.1], [0.0, 0.44, -0.17], [-0.03, 0.49, -0.25]],
            [[-0.13, 0.25, -0.22], [-0.18, 0.31, -0.34], [-0.22, 0.32, -0.43]],
            [[0.13, 0.25, -0.22], [0.18, 0.31, -0.34], [0.22, 0.32, -0.43]],
          ];
          for (const pts of spikes) {
            addStrand(pts, { radius: 0.072, widthScale: 1.25, depthScale: 0.85, segments: 14, tipSharpness: 0.95 });
          }
        }
        break;
      }

      // 3. POMPADOUR — Sleek sculpted mobster/rockabilly wave crest
      case 'pompadour': {
        addCap({
          frontT: 0.69,
          templeT: 0.57,
          sideT: 0.46,
          napeT: 0.28,
          thickness: 0.028,
          crownBoost: 0.015,
        });
        addSideburns(0.11, 0.04);

        if (!hatMode) {
          // Central sweeping rockabilly wave rising forward and rolling back over crown
          addStrand(
            [
              [0, 0.21, 0.345],
              [0, 0.365, 0.415],
              [0, 0.475, 0.22],
              [0, 0.435, -0.08],
              [0, 0.33, -0.31],
            ],
            { radius: 0.135, widthScale: 1.48, depthScale: 0.9, segments: 24, rootBulge: 0.28, tipSharpness: 0.7 },
          );
          for (const side of [-1, 1]) {
            // Swept-back side wings blending smoothly into the crest
            addStrand(
              [
                [side * 0.2, 0.22, 0.3],
                [side * 0.26, 0.35, 0.18],
                [side * 0.24, 0.38, -0.05],
                [side * 0.18, 0.28, -0.28],
              ],
              { radius: 0.084, widthScale: 1.32, depthScale: 0.75, segments: 18 },
            );
          }
        } else {
          // Neat tucked front wave under hat brim
          addStrand(
            [
              [-0.18, 0.22, 0.32],
              [0, 0.245, 0.38],
              [0.18, 0.21, 0.32],
            ],
            { radius: 0.055, widthScale: 1.35, depthScale: 0.7, segments: 14 },
          );
        }
        break;
      }

      // 4. CURLY TOP — Lush sculpted bouncy curls (zero disconnected grape balls)
      case 'curly_top': {
        addCap({
          frontT: 0.67,
          templeT: 0.56,
          sideT: 0.46,
          napeT: 0.27,
          thickness: 0.028,
          crownBoost: 0.022,
        });
        addSideburns(0.1, 0.04);

        const yOff = hatMode ? -0.025 : 0;
        // Soft curved S-curls along the forehead
        const frontAngles = [-0.62, -0.31, 0, 0.31, 0.62];
        for (let i = 0; i < frontAngles.length; i++) {
          const a = frontAngles[i];
          const s = i % 2 === 0 ? 1 : -1;
          const x0 = Math.sin(a) * 0.35;
          const z0 = Math.cos(a) * 0.36;
          addStrand(
            [
              [x0 * 0.85, 0.27 + yOff, z0 * 0.88],
              [x0 + s * 0.045, 0.21 + yOff, z0 + 0.048],
              [x0 - s * 0.03, 0.145 + yOff, z0 + 0.025],
            ],
            { radius: hatMode ? 0.052 : 0.064, widthScale: 1.2, depthScale: 1.0, segments: 14, tipSharpness: 0.55 },
          );
        }

        if (!hatMode) {
          // Layered sculpted curl coils across crown
          for (let i = 0; i < 8; i++) {
            const phi = (i / 8) * Math.PI * 2;
            const cx = Math.sin(phi) * 0.2;
            const cz = Math.cos(phi) * 0.18 + 0.02;
            const nx = Math.sin(phi + 0.6) * 0.24;
            const nz = Math.cos(phi + 0.6) * 0.22 + 0.02;
            addStrand(
              [
                [cx * 0.6, 0.34, cz * 0.6],
                [cx, 0.445 + (i % 2) * 0.03, cz],
                [nx, 0.39, nz],
              ],
              { radius: 0.088, widthScale: 1.15, depthScale: 1.0, segments: 14, tipSharpness: 0.5 },
            );
          }
          addVolume([0, 0.405, 0.02], 0.14, [1.2, 0.72, 1.15]);
        }
        break;
      }

      // 5. BUZZ — Ultra-clean tight sculpted buzz cut with crisp hairline (zero torus glitch!)
      case 'buzz': {
        addCap({
          frontT: 0.665,
          templeT: 0.56,
          sideT: 0.47,
          napeT: 0.29,
          thickness: 0.017,
          crownBoost: 0,
          frontPeak: 0.015,
        });
        addSideburns(0.075, 0.034);
        break;
      }

      // 6. MESSY — Playful windswept tousled locks in layered dynamic arcs
      case 'messy': {
        addCap({
          frontT: 0.66,
          templeT: 0.55,
          sideT: 0.43,
          napeT: 0.23,
          thickness: 0.032,
          crownBoost: 0.025,
        });
        addSideburns(0.125, 0.044);
        addMafiaSweptBangs(-1, false);

        const yOff = hatMode ? -0.02 : 0;
        // Extra tousled forehead cross-wisps
        addStrand(
          [
            [-0.08, 0.28 + yOff, 0.31],
            [0.06, 0.21 + yOff, 0.405],
            [0.14, 0.125 + yOff, 0.375],
          ],
          { radius: 0.052, widthScale: 1.25, depthScale: 0.75, segments: 14 },
        );
        addStrand(
          [
            [0.12, 0.28 + yOff, 0.3],
            [-0.04, 0.205 + yOff, 0.4],
            [-0.17, 0.13 + yOff, 0.355],
          ],
          { radius: 0.052, widthScale: 1.25, depthScale: 0.75, segments: 14 },
        );

        if (!hatMode) {
          const tousled: [number, number, number][][] = [
            [[-0.14, 0.34, 0.12], [0.06, 0.445, 0.18], [0.24, 0.39, 0.08]],
            [[0.16, 0.34, 0.08], [-0.04, 0.45, 0.02], [-0.26, 0.37, -0.06]],
            [[-0.08, 0.35, -0.08], [0.12, 0.435, -0.14], [0.29, 0.33, -0.22]],
            [[0.05, 0.32, -0.18], [-0.14, 0.38, -0.28], [-0.28, 0.26, -0.34]],
            [[-0.22, 0.26, 0.06], [-0.39, 0.25, -0.02], [-0.45, 0.12, -0.1]],
            [[0.22, 0.26, 0.06], [0.39, 0.24, -0.04], [0.45, 0.1, -0.12]],
          ];
          for (const pts of tousled) {
            addStrand(pts, { radius: 0.072, widthScale: 1.32, depthScale: 0.76, segments: 16 });
          }
        }
        break;
      }

      // 7. SLICK BACK — Suave Mobster slicked-back sculpted waves
      case 'slick_back': {
        addCap({
          frontT: 0.695,
          templeT: 0.57,
          sideT: 0.45,
          napeT: 0.24,
          thickness: 0.03,
          crownBoost: 0.018,
          frontPeak: 0.02,
        });
        addSideburns(0.11, 0.04);

        const yLift = hatMode ? -0.035 : 0;
        for (let i = -2; i <= 2; i++) {
          const x = i * 0.115;
          const arch = 1 - Math.abs(i) * 0.16;
          addStrand(
            [
              [x * 0.9, 0.225 + yLift * 0.4, 0.325 - Math.abs(i) * 0.038],
              [x * 1.02, 0.345 + 0.06 * arch + yLift, 0.12],
              [x * 1.05, 0.32 + 0.05 * arch + yLift, -0.14],
              [x * 0.95, 0.08, -0.39 + Math.abs(i) * 0.035],
            ],
            {
              radius: hatMode ? 0.056 : 0.068,
              widthScale: 1.38,
              depthScale: 0.68,
              segments: 20,
              tipSharpness: 0.65,
            },
          );
        }
        break;
      }

      // 8. UNDERCUT — Tight shaved sides & nape + lofty asymmetric swept-over top wave
      case 'undercut': {
        addCap({
          frontT: 0.68,
          templeT: 0.58,
          sideT: 0.5,
          napeT: 0.32,
          thickness: 0.018,
          crownBoost: 0.008,
        });
        addSideburns(0.08, 0.034);
        addMafiaSweptBangs(1, false);

        if (!hatMode) {
          addStrand(
            [
              [-0.22, 0.31, 0.18],
              [-0.02, 0.455, 0.21],
              [0.2, 0.42, 0.14],
              [0.34, 0.28, 0.04],
            ],
            { radius: 0.095, widthScale: 1.48, depthScale: 0.82, segments: 20 },
          );
          addStrand(
            [
              [-0.2, 0.33, 0.0],
              [0.02, 0.465, 0.02],
              [0.24, 0.4, -0.05],
              [0.36, 0.24, -0.14],
            ],
            { radius: 0.09, widthScale: 1.42, depthScale: 0.8, segments: 20 },
          );
          addStrand(
            [
              [-0.14, 0.32, -0.16],
              [0.08, 0.41, -0.2],
              [0.26, 0.28, -0.27],
            ],
            { radius: 0.076, widthScale: 1.35, depthScale: 0.78, segments: 16 },
          );
        }
        break;
      }

      // 9. AFRO — Seamless, lush, rounded cloud afro (zero scalp gaps!)
      case 'afro': {
        addCap({
          frontT: 0.67,
          templeT: 0.55,
          sideT: 0.43,
          napeT: 0.24,
          thickness: hatMode ? 0.022 : 0.045,
          crownBoost: hatMode ? 0 : 0.06,
        });

        // Core lush cloud volume (tucked smoothly in hatMode)
        if (!hatMode) {
          addVolume([0, 0.18, -0.05], 0.515, [1.08, 0.96, 1.02]);
          // Sculpted cloud puffs blended into the core silhouette for rich texture
          const rings = [
            { y: 0.12, r: 0.46, puffR: 0.165, count: 12 },
            { y: 0.31, r: 0.38, puffR: 0.16, count: 10 },
            { y: 0.46, r: 0.2, puffR: 0.155, count: 6 },
          ];
          for (const ring of rings) {
            for (let i = 0; i < ring.count; i++) {
              const phi = (i / ring.count) * Math.PI * 2 + ring.y * 2;
              const x = Math.sin(phi) * ring.r;
              const z = Math.cos(phi) * ring.r - 0.05;
              // Keep the face clear
              if (z > 0.26 && ring.y < 0.22) continue;
              addVolume([x, ring.y, z], ring.puffR);
            }
          }
          addVolume([0, 0.52, -0.04], 0.175);
        } else {
          // Hat-friendly lower afro cloud peeking out cleanly beneath the hat brim
          for (let i = 0; i < 10; i++) {
            const phi = (i / 10) * Math.PI * 2;
            const z = Math.cos(phi) * 0.41 - 0.04;
            if (z > 0.2) continue;
            addVolume([Math.sin(phi) * 0.44, 0.05 + (i % 2) * 0.04, z], 0.14);
          }
        }

        // Soft curly hairline edge across forehead
        for (let i = -2; i <= 2; i++) {
          addVolume(
            [i * 0.115, hatMode ? 0.195 : 0.24, 0.35 - Math.abs(i) * 0.042],
            hatMode ? 0.072 : 0.092,
          );
        }
        break;
      }

      // 10. LONG LAYERED — Shoulder-grazing curtain bangs + feathered side & rear cascade
      case 'long_layered':
      default: {
        addCap({
          frontT: 0.66,
          templeT: 0.55,
          sideT: 0.43,
          napeT: 0.22,
          thickness: 0.032,
          crownBoost: 0.024,
          partPhi: 0,
          partDepth: 0.045,
        });

        const yOff = hatMode ? -0.02 : 0;
        // Center-parted curtain bangs & jaw-framing locks
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.04, 0.285 + yOff, 0.315],
              [side * 0.21, 0.2 + yOff, 0.355],
              [side * 0.355, 0.06, 0.265],
              [side * 0.38, -0.14, 0.17],
            ],
            { radius: 0.064, widthScale: 1.32, depthScale: 0.72, segments: 18 },
          );
          addStrand(
            [
              [side * 0.26, 0.22 + yOff, 0.2],
              [side * 0.43, 0.04, 0.09],
              [side * 0.44, -0.22, 0.02],
            ],
            { radius: 0.068, widthScale: 1.3, depthScale: 0.76, segments: 16 },
          );
        }

        // Solid sculpted rear shoulder-length drape + feathered tips
        addCurtain({
          topY: 0.08,
          bottomY: -0.34,
          halfArc: Math.PI * 0.46,
          topRadiusX: 0.445,
          topRadiusZ: 0.415,
          bottomScale: 1.06,
          thickness: 0.085,
          waveCount: 6,
          waveAmp: 0.016,
          zShiftBottom: -0.03,
        });
        break;
      }
    }
  } else {
    // =========================================================================
    // ALL 10 FEMALE HAIRSTYLES (SCULPTED VINYL-TOY STYLE LIKE MAFIA-CARDS)
    // =========================================================================

    // Helper: Cute MafiaCards female wispy/swept bangs (like Mafia's Turn right card!)
    const addFemaleBangs = (mode: 'swept' | 'parted' | 'wispy' = 'swept') => {
      const yOff = hatMode ? -0.025 : 0;
      const s = hatMode ? 0.86 : 1.0;

      if (mode === 'parted') {
        // Soft center-parted curtain bangs
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.03, 0.29 + yOff, 0.315],
              [side * 0.175, 0.22 + yOff, 0.375],
              [side * 0.32, 0.11 + yOff, 0.305],
              [side * 0.385, -0.03, 0.195],
            ],
            { radius: 0.064 * s, widthScale: 1.35, depthScale: 0.72, segments: 18 },
          );
          addStrand(
            [
              [side * 0.09, 0.255 + yOff, 0.345],
              [side * 0.23, 0.165 + yOff, 0.355],
              [side * 0.325, 0.065 + yOff, 0.275],
            ],
            { radius: 0.048 * s, widthScale: 1.28, depthScale: 0.68, segments: 14 },
          );
        }
      } else if (mode === 'wispy') {
        // Adorable airy wispy fringe (Mafia's Turn female character look)
        addStrand(
          [
            [-0.18, 0.29 + yOff, 0.295],
            [-0.08, 0.21 + yOff, 0.39],
            [-0.03, 0.125 + yOff, 0.395],
          ],
          { radius: 0.05 * s, widthScale: 1.3, depthScale: 0.68, segments: 14 },
        );
        addStrand(
          [
            [0.06, 0.29 + yOff, 0.32],
            [0.11, 0.205 + yOff, 0.39],
            [0.16, 0.125 + yOff, 0.365],
          ],
          { radius: 0.048 * s, widthScale: 1.28, depthScale: 0.68, segments: 14 },
        );
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.18, 0.27 + yOff, 0.295],
              [side * 0.31, 0.175 + yOff, 0.295],
              [side * 0.39, 0.03, 0.195],
            ],
            { radius: 0.056 * s, widthScale: 1.3, depthScale: 0.72, segments: 16 },
          );
        }
      } else {
        // Lush side-swept cartoon bangs
        addStrand(
          [
            [-0.21, 0.3 + yOff, 0.26],
            [-0.02, 0.255 + yOff, 0.382],
            [0.18, 0.185 + yOff, 0.378],
            [0.33, 0.085 + yOff, 0.28],
          ],
          { radius: 0.068 * s, widthScale: 1.38, depthScale: 0.74, segments: 18 },
        );
        addStrand(
          [
            [-0.14, 0.255 + yOff, 0.33],
            [0.05, 0.195 + yOff, 0.395],
            [0.21, 0.125 + yOff, 0.355],
          ],
          { radius: 0.052 * s, widthScale: 1.3, depthScale: 0.68, segments: 14 },
        );
        addStrand(
          [
            [-0.2, 0.275 + yOff, 0.29],
            [-0.31, 0.18 + yOff, 0.295],
            [-0.39, 0.04, 0.195],
          ],
          { radius: 0.056 * s, widthScale: 1.28, depthScale: 0.72, segments: 16 },
        );
      }
    };

    switch (style.variant) {
      // 1. LONG WAVY — Lush wispy bangs + face-framing tendrils + solid layered wavy back cascade
      case 'long_wavy': {
        addCap({
          frontT: 0.66,
          templeT: 0.54,
          sideT: 0.4,
          napeT: 0.2,
          thickness: 0.032,
          crownBoost: 0.022,
        });
        addFemaleBangs('wispy');

        // Soft wavy face-framing tendrils draping past the shoulders
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.31, 0.18, 0.21],
              [side * 0.425, -0.02, 0.14],
              [side * 0.4, -0.24, 0.175],
              [side * 0.435, -0.44, 0.13],
            ],
            { radius: 0.066, widthScale: 1.28, depthScale: 0.78, segments: 20 },
          );
          addStrand(
            [
              [side * 0.36, 0.12, 0.05],
              [side * 0.465, -0.14, 0.0],
              [side * 0.455, -0.42, -0.02],
              [side * 0.48, -0.58, 0.02],
            ],
            { radius: 0.072, widthScale: 1.3, depthScale: 0.82, segments: 20 },
          );
        }

        // Solid sculpted wavy back cascade
        addCurtain({
          topY: 0.1,
          bottomY: -0.66,
          halfArc: Math.PI * 0.5,
          topRadiusX: 0.455,
          topRadiusZ: 0.425,
          bottomScale: 1.18,
          thickness: 0.105,
          waveCount: 7,
          waveAmp: 0.024,
          zShiftBottom: -0.055,
        });
        break;
      }

      // 2. PONYTAIL — Smooth swept crown + satin scrunchie + lush multi-strand bouncy tail
      case 'ponytail': {
        addCap({
          frontT: 0.67,
          templeT: 0.55,
          sideT: 0.44,
          napeT: 0.25,
          thickness: 0.03,
          crownBoost: 0.02,
        });
        addFemaleBangs('swept');

        // Soft cheek-framing wisps
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.34, 0.12, 0.18],
              [side * 0.415, -0.03, 0.155],
              [side * 0.39, -0.18, 0.15],
            ],
            { radius: 0.044, widthScale: 1.2, depthScale: 0.72, segments: 12 },
          );
        }

        const tieY = hatMode ? 0.02 : 0.14;
        const tieZ = hatMode ? -0.425 : -0.415;
        addVolume([0, tieY + 0.02, tieZ + 0.04], 0.125, [1.1, 1.0, 0.95]);
        addTie('#FF4B6A', [0, tieY, tieZ - 0.025], [Math.PI / 2 - 0.25, 0, 0], 0.092, 0.032);

        // Main sweeping S-curved ponytail + flanking side locks
        addStrand(
          [
            [0, tieY, tieZ - 0.02],
            [0, tieY + 0.06, tieZ - 0.17],
            [0, tieY - 0.18, tieZ - 0.25],
            [0, tieY - 0.48, tieZ - 0.18],
            [0, tieY - 0.7, tieZ - 0.26],
          ],
          { radius: 0.125, widthScale: 1.25, depthScale: 1.05, segments: 24, rootBulge: 0.25 },
        );
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.03, tieY, tieZ - 0.02],
              [side * 0.12, tieY - 0.02, tieZ - 0.15],
              [side * 0.15, tieY - 0.28, tieZ - 0.19],
              [side * 0.1, tieY - 0.56, tieZ - 0.16],
            ],
            { radius: 0.078, widthScale: 1.2, depthScale: 0.92, segments: 18 },
          );
        }
        break;
      }

      // 3. TWIN BUNS — Center-parted fringe + plush sculpted twin space buns + satin ties
      case 'twin_buns': {
        addCap({
          frontT: 0.66,
          templeT: 0.55,
          sideT: 0.43,
          napeT: 0.24,
          thickness: 0.03,
          crownBoost: 0.02,
          partPhi: 0,
          partDepth: 0.045,
        });
        addFemaleBangs('parted');

        const bunY = hatMode ? 0.08 : 0.31;
        const bunX = hatMode ? 0.42 : 0.3;
        const bunZ = hatMode ? -0.18 : -0.15;
        const bunR = hatMode ? 0.135 : 0.165;

        for (const side of [-1, 1]) {
          // Base cuff + plush bun sphere + subtle swirl wrap
          addVolume([side * bunX, bunY, bunZ], bunR, [1.04, 0.98, 1.02]);
          addTie(
            '#FACC15',
            [side * (bunX * 0.86), bunY - (hatMode ? 0.01 : 0.075), bunZ + 0.02],
            [0.2, -side * 0.35, side * (hatMode ? 1.25 : 0.62)],
            bunR * 0.68,
            0.028,
          );
          // Cute loose wisp behind each ear
          addStrand(
            [
              [side * 0.36, 0.08, 0.12],
              [side * 0.42, -0.06, 0.11],
              [side * 0.38, -0.2, 0.13],
            ],
            { radius: 0.044, widthScale: 1.2, depthScale: 0.72, segments: 12 },
          );
        }
        break;
      }

      // 4. BOB CUT — Chic voluminous chin-length rounded bob hugging the jawline smoothly
      case 'bob_cut': {
        addCap({
          frontT: 0.66,
          templeT: 0.54,
          sideT: 0.42,
          napeT: 0.24,
          thickness: 0.034,
          crownBoost: 0.024,
        });
        addFemaleBangs('swept');

        // Solid rounded inward-curling bob shell wrapping smoothly around back & cheeks
        addCurtain({
          topY: 0.12,
          bottomY: -0.28,
          halfArc: Math.PI * 0.58,
          topRadiusX: 0.455,
          topRadiusZ: 0.43,
          bottomScale: 0.93, // curls softly INWARD under the jaw!
          thickness: 0.095,
          waveCount: 5,
          waveAmp: 0.012,
          zShiftBottom: 0.015,
        });

        // Smooth curved front cheek-hugging bob panels
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.34, 0.16, 0.18],
              [side * 0.445, -0.02, 0.13],
              [side * 0.38, -0.23, 0.16],
              [side * 0.28, -0.28, 0.21],
            ],
            { radius: 0.072, widthScale: 1.38, depthScale: 0.82, segments: 16, tipSharpness: 0.6 },
          );
        }
        break;
      }

      // 5. SIDE BRAID — Swept bangs + sculpted woven braid draping smoothly over shoulder
      case 'side_braid': {
        addCap({
          frontT: 0.66,
          templeT: 0.54,
          sideT: 0.42,
          napeT: 0.24,
          thickness: 0.032,
          crownBoost: 0.022,
        });
        addFemaleBangs('swept');

        // Smooth gathering sweep from left back into the right-side braid
        addStrand(
          [
            [-0.24, 0.06, -0.36],
            [0.08, -0.06, -0.41],
            [0.36, -0.04, -0.2],
            [0.42, -0.04, 0.05],
          ],
          { radius: 0.082, widthScale: 1.35, depthScale: 0.82, segments: 16, tipSharpness: 0.5 },
        );

        // Woven alternating sculpted braid links draping forward over the shoulder
        const linkCount = 7;
        for (let b = 0; b < linkCount; b++) {
          const t = b / (linkCount - 1);
          const bx = 0.41 - t * 0.055;
          const by = 0.0 - b * 0.084;
          const bz = 0.05 + t * 0.125;
          const linkR = 0.084 - t * 0.022;
          const sideSign = b % 2 === 0 ? 1 : -1;
          addVolume(
            [bx + sideSign * 0.016, by, bz],
            linkR,
            [1.18, 0.88, 0.92],
            [0.12, 0.32, sideSign * 0.42],
          );
        }

        // Hair tie + tapered silky tassel at bottom of braid
        addTie('#FF4B6A', [0.355, -0.565, 0.18], [Math.PI / 2 - 0.18, 0, 0.1], 0.058, 0.022);
        addStrand(
          [
            [0.355, -0.56, 0.18],
            [0.35, -0.65, 0.195],
            [0.335, -0.74, 0.205],
          ],
          { radius: 0.056, widthScale: 1.1, depthScale: 1.0, segments: 10 },
        );
        break;
      }

      // 6. CURLY VOLUME — Lush sculpted wavy curls framing the face & shoulders
      case 'curly_volume': {
        addCap({
          frontT: 0.66,
          templeT: 0.54,
          sideT: 0.42,
          napeT: 0.22,
          thickness: 0.035,
          crownBoost: 0.032,
        });
        addFemaleBangs('wispy');

        // Voluminous sculpted core drape
        addCurtain({
          topY: 0.12,
          bottomY: -0.44,
          halfArc: Math.PI * 0.54,
          topRadiusX: 0.48,
          topRadiusZ: 0.45,
          bottomScale: 1.18,
          thickness: 0.12,
          waveCount: 9,
          waveAmp: 0.028,
          zShiftBottom: -0.03,
        });

        // Sculpted corkscrew curl strands framing the outer silhouette
        const curlPhis = [-0.55, -0.78, -1.05, -1.35, 1.35, 1.05, 0.78, 0.55];
        for (let i = 0; i < curlPhis.length; i++) {
          const phi = curlPhis[i] * Math.PI;
          const rBase = 0.46;
          const x = Math.sin(phi) * rBase;
          const z = Math.cos(phi) * rBase;
          const sway = (i % 2 === 0 ? 1 : -1) * 0.055;
          addStrand(
            [
              [x * 0.88, 0.16, z * 0.88],
              [x * 1.08 + sway, -0.04, z * 1.06],
              [x * 1.04 - sway, -0.24, z * 1.04],
              [x * 1.12 + sway * 0.6, -0.44, z * 1.08],
            ],
            { radius: 0.082, widthScale: 1.18, depthScale: 1.05, segments: 18, tipSharpness: 0.55 },
          );
        }

        if (!hatMode) {
          // Soft fluffy crown curls
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + 0.3;
            addVolume([Math.sin(a) * 0.22, 0.37, Math.cos(a) * 0.2 - 0.02], 0.13, [1.15, 0.85, 1.1]);
          }
        }
        break;
      }

      // 7. PIGTAILS — Neat parted bangs + symmetric satin ties + lush curved twin pigtails
      case 'pigtails': {
        addCap({
          frontT: 0.66,
          templeT: 0.55,
          sideT: 0.44,
          napeT: 0.24,
          thickness: 0.03,
          crownBoost: 0.02,
          partPhi: 0,
          partDepth: 0.045,
        });
        addFemaleBangs('parted');

        const py = hatMode ? -0.01 : 0.1;
        const px = 0.425;
        const pz = -0.06;

        for (const side of [-1, 1]) {
          addVolume([side * (px - 0.015), py + 0.01, pz], 0.1, [0.95, 1.0, 1.0]);
          addTie('#38B6FF', [side * (px + 0.035), py, pz], [0, 0, Math.PI / 2 - side * 0.2], 0.076, 0.028);

          // Main lush S-curved pigtail
          addStrand(
            [
              [side * (px + 0.03), py, pz],
              [side * (px + 0.155), py - 0.04, pz - 0.015],
              [side * (px + 0.175), py - 0.28, pz + 0.02],
              [side * (px + 0.135), py - 0.54, pz + 0.05],
            ],
            { radius: 0.105, widthScale: 1.2, depthScale: 1.02, segments: 20, rootBulge: 0.25 },
          );
          // Secondary playful accent lock on each pigtail
          addStrand(
            [
              [side * (px + 0.04), py - 0.01, pz - 0.02],
              [side * (px + 0.145), py - 0.12, pz - 0.11],
              [side * (px + 0.18), py - 0.38, pz - 0.09],
            ],
            { radius: 0.068, widthScale: 1.18, depthScale: 0.92, segments: 16 },
          );
        }
        break;
      }

      // 8. LAYERED SHOULDER — Wispy bangs + layered inward-curving shoulder cut
      case 'layered_shoulder': {
        addCap({
          frontT: 0.66,
          templeT: 0.54,
          sideT: 0.42,
          napeT: 0.22,
          thickness: 0.032,
          crownBoost: 0.022,
        });
        addFemaleBangs('wispy');

        addCurtain({
          topY: 0.1,
          bottomY: -0.44,
          halfArc: Math.PI * 0.52,
          topRadiusX: 0.455,
          topRadiusZ: 0.425,
          bottomScale: 1.04,
          thickness: 0.096,
          waveCount: 6,
          waveAmp: 0.018,
          zShiftBottom: -0.01,
        });

        for (const side of [-1, 1]) {
          // Layered face-framing inward-sweeping locks
          addStrand(
            [
              [side * 0.32, 0.17, 0.2],
              [side * 0.43, -0.02, 0.14],
              [side * 0.385, -0.26, 0.17],
              [side * 0.31, -0.37, 0.2],
            ],
            { radius: 0.064, widthScale: 1.32, depthScale: 0.78, segments: 18 },
          );
          addStrand(
            [
              [side * 0.36, 0.12, 0.04],
              [side * 0.46, -0.1, -0.02],
              [side * 0.43, -0.36, 0.02],
            ],
            { radius: 0.068, widthScale: 1.3, depthScale: 0.8, segments: 16 },
          );
        }
        break;
      }

      // 9. PIXIE — Chic cropped pixie with feathered swept bangs & sculpted crown
      case 'pixie': {
        addCap({
          frontT: 0.66,
          templeT: 0.55,
          sideT: 0.45,
          napeT: 0.25,
          thickness: 0.028,
          crownBoost: 0.024,
        });
        addFemaleBangs('swept');

        // Feathered ear-tucking side wisps
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.36, 0.15, 0.14],
              [side * 0.43, 0.04, 0.09],
              [side * 0.4, -0.08, 0.06],
            ],
            { radius: 0.045, widthScale: 1.25, depthScale: 0.68, segments: 12 },
          );
        }

        if (!hatMode) {
          addStrand(
            [
              [-0.18, 0.33, 0.12],
              [0.02, 0.415, 0.13],
              [0.24, 0.35, 0.06],
            ],
            { radius: 0.076, widthScale: 1.4, depthScale: 0.72, segments: 16 },
          );
          addStrand(
            [
              [-0.14, 0.35, -0.05],
              [0.08, 0.41, -0.08],
              [0.28, 0.31, -0.14],
            ],
            { radius: 0.072, widthScale: 1.36, depthScale: 0.72, segments: 16 },
          );
        }
        break;
      }

      // 10. HALF-UP BOW — Pulled-back upper strands + sculpted satin ribbon bow + flowing lower waves
      case 'half_up_bow':
      default: {
        addCap({
          frontT: 0.66,
          templeT: 0.54,
          sideT: 0.41,
          napeT: 0.21,
          thickness: 0.032,
          crownBoost: 0.022,
        });
        addFemaleBangs('swept');

        // Flowing lower curtain
        addCurtain({
          topY: 0.08,
          bottomY: -0.58,
          halfArc: Math.PI * 0.5,
          topRadiusX: 0.455,
          topRadiusZ: 0.425,
          bottomScale: 1.15,
          thickness: 0.1,
          waveCount: 7,
          waveAmp: 0.022,
          zShiftBottom: -0.045,
        });

        const bowY = hatMode ? 0.06 : 0.175;
        const bowZ = hatMode ? -0.455 : -0.445;

        // Pulled-back upper side strands meeting cleanly at the bow
        for (const side of [-1, 1]) {
          addStrand(
            [
              [side * 0.34, 0.18, 0.16],
              [side * 0.42, 0.16, -0.06],
              [side * 0.28, bowY + 0.02, -0.34],
              [0, bowY, bowZ + 0.03],
            ],
            { radius: 0.06, widthScale: 1.35, depthScale: 0.72, segments: 16, tipSharpness: 0.45 },
          );
          // Soft face-framing front tendrils
          addStrand(
            [
              [side * 0.33, 0.14, 0.19],
              [side * 0.42, -0.06, 0.145],
              [side * 0.39, -0.3, 0.16],
            ],
            { radius: 0.056, widthScale: 1.25, depthScale: 0.74, segments: 16 },
          );
        }

        addSculptedBow([0, bowY, bowZ], hatMode ? 0.82 : 1.0, '#FF3B5C');
        break;
      }
    }
  }
}

// ============================================================================
// ARTICULATED CHIBI ARMS & HANDS
// ============================================================================

function buildArticulatedArm(
  side: -1 | 1,
  isFemale: boolean,
  upperMat: THREE.Material,
  forearmMat: THREE.Material,
  cuffMat: THREE.Material,
  skinMat: THREE.Material,
  opts: {
    isRolledSleeves: boolean;
    isPufferSleeves: boolean;
    isPuffedShoulders: boolean;
    hasEpaulets: boolean;
    epauletMat?: THREE.Material;
  },
): { shoulder: THREE.Group; elbow: THREE.Group } {
  const shoulder = new THREE.Group();

  const baseShoulderR = isFemale ? 0.076 : 0.088;
  const shoulderR = opts.isPuffedShoulders ? baseShoulderR * 1.38 : baseShoulderR;
  const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(shoulderR, 16, 12), upperMat);
  shoulder.add(shoulderCap);

  if (opts.hasEpaulets && opts.epauletMat) {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.032, 0.092), opts.epauletMat);
    ep.position.set(side * 0.01, 0.078, 0);
    ep.rotation.z = side * -0.18;
    shoulder.add(ep);
  }

  const upperLen = 0.21;
  const armScale = isFemale ? 0.9 : 1.0;
  if (opts.isPufferSleeves) {
    for (const py of [-0.055, -0.145]) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.088 * armScale, 14, 12), upperMat);
      puff.scale.set(1.04, 0.72, 1.04);
      puff.position.y = py;
      shoulder.add(puff);
    }
  } else {
    const upperMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.073 * armScale, 0.066 * armScale, upperLen, 16),
      upperMat,
    );
    upperMesh.position.y = -upperLen / 2;
    shoulder.add(upperMesh);
  }

  const elbow = new THREE.Group();
  elbow.position.set(0, -upperLen, 0);
  const elbowJoint = new THREE.Mesh(
    new THREE.SphereGeometry((opts.isRolledSleeves ? 0.068 : 0.065) * armScale, 12, 10),
    opts.isRolledSleeves ? cuffMat : forearmMat,
  );
  elbow.add(elbowJoint);

  if (opts.isRolledSleeves) {
    const rollBand = new THREE.Mesh(new THREE.TorusGeometry(0.068 * armScale, 0.02, 10, 16), cuffMat);
    rollBand.rotation.x = Math.PI / 2;
    rollBand.position.y = -0.015;
    elbow.add(rollBand);
  }

  const foreLen = 0.2;
  if (opts.isPufferSleeves) {
    for (const py of [-0.065, -0.15]) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.082 * armScale, 14, 12), forearmMat);
      puff.scale.set(1.02, 0.7, 1.02);
      puff.position.y = py;
      elbow.add(puff);
    }
  } else {
    const foreRTop = (opts.isRolledSleeves ? 0.056 : 0.065) * armScale;
    const foreRBot = (opts.isRolledSleeves ? 0.05 : 0.058) * armScale;
    const foreMesh = new THREE.Mesh(new THREE.CylinderGeometry(foreRTop, foreRBot, foreLen, 16), forearmMat);
    foreMesh.position.y = -foreLen / 2;
    elbow.add(foreMesh);
  }

  if (!opts.isRolledSleeves) {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.062 * armScale, 0.017, 10, 18), cuffMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -foreLen + 0.018;
    elbow.add(cuff);
  }

  // Cute Vinyl-Toy Mitten Hand + Thumb
  const handGroup = new THREE.Group();
  handGroup.position.set(0, -foreLen - 0.04, 0);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.067 * armScale, 16, 12), skinMat);
  palm.scale.set(0.96, 1.04, 0.86);
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.027 * armScale, 10, 8), skinMat);
  thumb.position.set(-side * 0.049 * armScale, 0.012, 0.034);
  handGroup.add(palm, thumb);
  elbow.add(handGroup);

  shoulder.add(elbow);
  return { shoulder, elbow };
}

// ============================================================================
// MAIN CHIBI CHARACTER BUILDER
// ============================================================================

export function buildChibiCharacter(
  appearance: CharacterAppearance,
  pose: 'standing' | 'seated' = 'standing',
  options?: { hideHat?: boolean; crossedArms?: boolean },
): ChibiCharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isFemale = appearance.gender === 'female';
  const skinMat = makeVinylSkinMat(appearance.skinColor);
  const earInnerColor = new THREE.Color(appearance.skinColor).offsetHSL(-0.015, 0.15, -0.075);
  const earInnerMat = makeVinylSkinMat(earInnerColor.getHex());

  // 1. 3D SUIT / TOP GEOMETRY + MAFIA-CARDS VINYL THEME PASS
  const suit = buildSuitMesh(appearance.gender, appearance.suitId, appearance.skinColor);
  suit.torsoGroup.position.y = 0.62;
  applyMafiaVinylTheme(suit.torsoGroup);
  bodyGroup.add(suit.torsoGroup);

  // 2. 3D PANTS / SKIRT + SHOES + MAFIA-CARDS VINYL THEME PASS
  const lowerBody = buildPantsAndShoesMesh(
    appearance.gender,
    appearance.pantsId,
    appearance.skinColor,
    pose,
    suit.coversLowerBody,
  );
  applyMafiaVinylTheme(lowerBody);
  bodyGroup.add(lowerBody);

  // 3. TUCKED-IN ARTICULATED ARMS
  const shoulderX = isFemale ? 0.218 : 0.246;
  const shoulderY = 1.045;

  const leftArmRig = buildArticulatedArm(
    -1,
    isFemale,
    suit.sleeveUpperMat,
    suit.sleeveForearmMat,
    suit.cuffMat,
    skinMat,
    suit,
  );
  leftArmRig.shoulder.position.set(-shoulderX, shoulderY, 0.01);

  const rightArmRig = buildArticulatedArm(
    1,
    isFemale,
    suit.sleeveUpperMat,
    suit.sleeveForearmMat,
    suit.cuffMat,
    skinMat,
    suit,
  );
  rightArmRig.shoulder.position.set(shoulderX, shoulderY, 0.01);

  const restPose = (() => {
    if (options?.crossedArms) {
      return {
        lShX: -0.78,
        lShZ: 0.2,
        lShY: 0.28,
        lElX: -0.44,
        lElZ: 0.96,
        rShX: -0.78,
        rShZ: -0.2,
        rShY: -0.28,
        rElX: -0.44,
        rElZ: -0.96,
      };
    }
    if (pose === 'seated') {
      return {
        lShX: -0.48,
        lShZ: -0.1,
        lShY: 0.14,
        lElX: -0.58,
        lElZ: 0.12,
        rShX: -0.48,
        rShZ: 0.1,
        rShY: -0.14,
        rElX: -0.58,
        rElZ: -0.12,
      };
    }
    return {
      lShX: 0.02,
      lShZ: -0.22,
      lShY: 0.0,
      lElX: -0.1,
      lElZ: -0.04,
      rShX: 0.02,
      rShZ: 0.22,
      rShY: 0.0,
      rElX: -0.1,
      rElZ: 0.04,
    };
  })();

  const applyArmPose = (s: number) => {
    const sleepLShX = -2.36;
    const sleepLShZ = 0.18;
    const sleepLShY = 0.22;
    const sleepLElX = -0.34;
    const sleepLElZ = 0.54;

    const sleepRShX = -2.36;
    const sleepRShZ = -0.18;
    const sleepRShY = -0.22;
    const sleepRElX = -0.34;
    const sleepRElZ = -0.54;

    leftArmRig.shoulder.rotation.x = THREE.MathUtils.lerp(restPose.lShX, sleepLShX, s);
    leftArmRig.shoulder.rotation.z = THREE.MathUtils.lerp(restPose.lShZ, sleepLShZ, s);
    leftArmRig.shoulder.rotation.y = THREE.MathUtils.lerp(restPose.lShY, sleepLShY, s);
    leftArmRig.elbow.rotation.x = THREE.MathUtils.lerp(restPose.lElX, sleepLElX, s);
    leftArmRig.elbow.rotation.z = THREE.MathUtils.lerp(restPose.lElZ, sleepLElZ, s);

    rightArmRig.shoulder.rotation.x = THREE.MathUtils.lerp(restPose.rShX, sleepRShX, s);
    rightArmRig.shoulder.rotation.z = THREE.MathUtils.lerp(restPose.rShZ, sleepRShZ, s);
    rightArmRig.shoulder.rotation.y = THREE.MathUtils.lerp(restPose.rShY, sleepRShY, s);
    rightArmRig.elbow.rotation.x = THREE.MathUtils.lerp(restPose.rElX, sleepRElX, s);
    rightArmRig.elbow.rotation.z = THREE.MathUtils.lerp(restPose.rElZ, sleepRElZ, s);
  };
  applyArmPose(0);

  bodyGroup.add(leftArmRig.shoulder, rightArmRig.shoulder);

  // 4. SHORT NECK & PURE-SKIN VINYL CHIBI HEAD
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.128, 0.135, 16), skinMat);
  neck.position.y = 1.185;
  bodyGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.56, 0);
  bodyGroup.add(headGroup);

  const { awakeMap, sleepMap } = createChibiFaceTextures(
    appearance.skinColor,
    appearance.hairColor,
    appearance.gender,
  );

  const headSkinTint = new THREE.Color(appearance.skinColor).offsetHSL(-0.015, 0.14, 0.12);
  const headMat = new THREE.MeshPhysicalMaterial({
    map: awakeMap,
    roughness: 0.52,
    metalness: 0.0,
    sheen: 0.36,
    sheenRoughness: 0.65,
    sheenColor: headSkinTint,
    clearcoat: 0.08,
    clearcoatRoughness: 0.55,
  });

  const headMesh = new THREE.Mesh(createChibiHeadGeometry(), headMat);
  headGroup.add(headMesh);

  // Cute vinyl-toy rounded ears with subtle warm inner-ear dimple
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.086, 16, 12), skinMat);
    ear.scale.set(0.54, 0.86, 0.64);
    ear.position.set(side * 0.436, -0.042, -0.01);
    headGroup.add(ear);

    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 10), earInnerMat);
    earInner.scale.set(0.42, 0.72, 0.42);
    earInner.position.set(side * 0.456, -0.045, 0.012);
    headGroup.add(earInner);
  }

  // Smooth rounded cartoon button nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.033, 12, 10), skinMat);
  nose.scale.set(1.06, 0.76, 0.68);
  nose.position.set(0, -0.068, 0.402);
  headGroup.add(nose);

  // 5. SINGLE REACTIVE HAIR GROUP
  const hasHat = appearance.hatId !== 'none' && !options?.hideHat;
  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);

  const rebuildHair = (gender: Gender, hairId: number, hairColor: string, hatMode: boolean) => {
    populateHairGroup(hairGroup, gender, hairId, hairColor, hatMode);
  };
  rebuildHair(appearance.gender, appearance.hairId, appearance.hairColor, hasHat);

  // 6. CRISP CARTOON HAT
  if (hasHat && typeof appearance.hatId === 'number') {
    const { group: hatGroup, placement } = buildHat(appearance.hatId);
    hatGroup.position.set(0, placement.y, placement.z);
    hatGroup.rotation.x = placement.tiltX;
    hatGroup.rotation.z = placement.tiltZ;
    headGroup.add(hatGroup);
  }

  // 7. FLOATING SLEEP 'Z' SPRITES
  const sleepZs: THREE.Sprite[] = [];
  for (let i = 0; i < 3; i++) {
    const zSprite = createSleepZSprite();
    zSprite.scale.set(0.28 + i * 0.06, 0.28 + i * 0.06, 1);
    zSprite.position.set(0.32 + i * 0.14, 2.2 + i * 0.24, 0.15);
    zSprite.visible = false;
    root.add(zSprite);
    sleepZs.push(zSprite);
  }

  // 8. GLOWING SELECTION RING & RAYCAST HIT PROXY
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#FACC15',
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.66, 44), ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.04;
  selectionRing.visible = false;
  root.add(selectionRing);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 2.25, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.position.y = 1.12;
  root.add(hitProxy);

  // Smooth stateful sleep animation blending
  let currentSleep = 0;
  let isCurrentlySleepTex = false;

  const setSleeping = (targetFactor: number, elapsed: number, dt?: number) => {
    const clampedTarget = THREE.MathUtils.clamp(targetFactor, 0, 1);
    const blendAlpha = dt !== undefined ? 1 - Math.exp(-8.5 * Math.min(dt, 0.35)) : 0.25;
    currentSleep = THREE.MathUtils.lerp(currentSleep, clampedTarget, blendAlpha);
    const shouldUseSleepTex = currentSleep > 0.35;
    if (shouldUseSleepTex !== isCurrentlySleepTex) {
      isCurrentlySleepTex = shouldUseSleepTex;
      headMat.map = shouldUseSleepTex ? sleepMap : awakeMap;
      headMat.needsUpdate = true;
    }

    applyArmPose(currentSleep);

    const breathBob = Math.sin(elapsed * 1.45) * 0.032 * currentSleep;
    headGroup.rotation.x = currentSleep * 0.16 + breathBob;
    headGroup.rotation.z = Math.sin(elapsed * 0.9) * 0.04 * currentSleep;

    const showZ = currentSleep > 0.55;
    sleepZs.forEach((sprite, idx) => {
      sprite.visible = showZ;
      if (showZ) {
        const cycle = (elapsed * 0.55 + idx * 0.33) % 1;
        sprite.position.y = 2.14 + cycle * 0.78;
        sprite.position.x = 0.28 + Math.sin(elapsed * 1.8 + idx) * 0.1 + idx * 0.08;
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.opacity = Math.sin(cycle * Math.PI) * 0.92;
      }
    });
  };

  const setHighlighted = (colorHex: string | null) => {
    if (!colorHex) {
      selectionRing.visible = false;
      return;
    }
    selectionRing.visible = true;
    (selectionRing.material as THREE.MeshBasicMaterial).color.set(colorHex);
  };

  const setEliminated = (eliminated: boolean) => {
    bodyGroup.rotation.x = eliminated ? -0.35 : 0;
    bodyGroup.position.y = eliminated ? -0.18 : 0;
    bodyGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = (obj as THREE.Mesh).material as THREE.Material;
        if (m && 'opacity' in m && m !== ringMat) {
          m.transparent = eliminated;
          m.opacity = eliminated ? 0.38 : 1;
        }
      }
    });
  };

  const dispose = () => {
    awakeMap.dispose();
    sleepMap.dispose();
    disposeObject3D(root);
  };

  return {
    root,
    bodyGroup,
    headGroup,
    hairGroup,
    leftShoulder: leftArmRig.shoulder,
    leftElbow: leftArmRig.elbow,
    rightShoulder: rightArmRig.shoulder,
    rightElbow: rightArmRig.elbow,
    sleepZs,
    hitProxy,
    selectionRing,
    rebuildHair,
    setSleeping,
    setHighlighted,
    setEliminated,
    dispose,
  };
}