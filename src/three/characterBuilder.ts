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
  fedora: { y: 0.215, z: 0.005, tiltX: -0.05, tiltZ: -0.08 },
  bowler: { y: 0.215, z: 0.0, tiltX: -0.02, tiltZ: -0.04 },
  top_hat: { y: 0.225, z: 0.0, tiltX: -0.03, tiltZ: -0.05 },
  beret: { y: 0.23, z: -0.02, tiltX: -0.06, tiltZ: -0.14 },
  cap: { y: 0.21, z: 0.01, tiltX: -0.04, tiltZ: 0.0 },
  beanie: { y: 0.2, z: -0.01, tiltX: -0.08, tiltZ: 0.0 },
  deerstalker: { y: 0.215, z: 0.0, tiltX: -0.02, tiltZ: 0.0 },
  cowboy: { y: 0.22, z: 0.005, tiltX: -0.06, tiltZ: -0.05 },
  crown: { y: 0.295, z: 0.0, tiltX: -0.04, tiltZ: 0.0 },
  sun_hat: { y: 0.215, z: 0.0, tiltX: -0.06, tiltZ: -0.05 },
};

function makeSatinMat(
  color: string | number,
  roughness = 0.56,
  metalness = 0.05,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

function buildHat(hatId: number): { group: THREE.Group; placement: HatPlacement } {
  const style = HAT_CATALOG[hatId % HAT_CATALOG.length];
  const placement = HAT_PLACEMENTS[style.variant] ?? HAT_PLACEMENTS.fedora;
  const group = new THREE.Group();
  const mainMat = makeSatinMat(style.primary, 0.52, 0.08);
  const bandMat = makeSatinMat(style.secondary, 0.38, 0.14);
  const accentMat = makeSatinMat(style.accent, 0.26, 0.65);

  switch (style.variant) {
    case 'fedora': {
      const brimPts = [
        new THREE.Vector2(0.37, 0.01),
        new THREE.Vector2(0.51, -0.012),
        new THREE.Vector2(0.62, 0.026),
        new THREE.Vector2(0.6, 0.052),
        new THREE.Vector2(0.38, 0.044),
      ];
      const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 20), mainMat);
      brim.scale.set(1.06, 1, 1.08);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.405, 0.29, 20), mainMat);
      crown.position.y = 0.16;
      const crownCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.315, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
        mainMat,
      );
      crownCap.position.y = 0.27;
      crownCap.scale.set(1, 0.4, 1.06);

      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.408, 0.072, 20), bandMat);
      band.position.y = 0.075;
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.03), accentMat);
      pin.position.set(0.32, 0.075, 0.22);
      pin.rotation.y = 0.95;

      group.add(brim, crown, crownCap, band, pin);
      break;
    }
    case 'bowler': {
      const brimPts = [
        new THREE.Vector2(0.37, 0.01),
        new THREE.Vector2(0.49, 0.01),
        new THREE.Vector2(0.56, 0.065),
        new THREE.Vector2(0.53, 0.08),
        new THREE.Vector2(0.38, 0.04),
      ];
      const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 20), mainMat);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.41, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
        mainMat,
      );
      dome.position.y = 0.03;
      dome.scale.set(1.03, 0.96, 1.03);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.415, 0.065, 20), bandMat);
      band.position.y = 0.07;
      group.add(brim, dome, band);
      break;
    }
    case 'top_hat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.56, 0.038, 20), mainMat);
      brim.position.y = 0.02;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.375, 0.48, 18), mainMat);
      cyl.position.y = 0.26;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.382, 0.085, 18), bandMat);
      band.position.y = 0.085;
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.085, 0.035), accentMat);
      buckle.position.set(0, 0.085, 0.375);
      group.add(brim, cyl, band, buckle);
      break;
    }
    case 'beret': {
      const disk = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 12), mainMat);
      disk.scale.set(1.12, 0.42, 1.08);
      disk.position.set(0.05, 0.12, -0.02);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.04, 8, 20), bandMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.03;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.085, 8), bandMat);
      stem.position.set(0.05, 0.31, -0.02);
      group.add(disk, rim, stem);
      break;
    }
    case 'cap': {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.435, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.54),
        mainMat,
      );
      dome.scale.set(1.04, 0.96, 1.02);
      const bill = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.39, 0.042, 16, 1, false, -Math.PI * 0.38, Math.PI * 0.76),
        bandMat,
      );
      bill.position.set(0, 0.02, 0.26);
      bill.rotation.x = 0.1;
      const frontPatch = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bandMat);
      frontPatch.scale.set(1.2, 0.9, 0.3);
      frontPatch.position.set(0, 0.18, 0.415);
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), accentMat);
      button.position.y = 0.42;
      group.add(dome, bill, frontPatch, button);
      break;
    }
    case 'beanie': {
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.415, 0.075, 10, 20), bandMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = 0.045;
      const knit = new THREE.Mesh(
        new THREE.SphereGeometry(0.435, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
        mainMat,
      );
      knit.scale.set(1.04, 0.96, 1.02);
      knit.position.y = 0.045;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), accentMat);
      pom.position.y = 0.48;
      group.add(cuff, knit, pom);
      break;
    }
    case 'deerstalker': {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.43, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.54),
        mainMat,
      );
      dome.scale.set(1.04, 0.96, 1.02);
      const frontBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.34, 0.04, 16), bandMat);
      frontBrim.scale.set(1.05, 1, 0.72);
      frontBrim.position.set(0, 0.015, 0.3);
      const backBrim = frontBrim.clone();
      backBrim.position.z = -0.3;
      const earFlapL = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.14, 6, 8), bandMat);
      earFlapL.position.set(-0.425, 0.06, 0);
      earFlapL.rotation.z = 0.25;
      const earFlapR = earFlapL.clone();
      earFlapR.position.x = 0.425;
      earFlapR.rotation.z = -0.25;
      group.add(dome, frontBrim, backBrim, earFlapL, earFlapR);
      break;
    }
    case 'cowboy': {
      const brimPts = [
        new THREE.Vector2(0.38, 0.0),
        new THREE.Vector2(0.54, -0.02),
        new THREE.Vector2(0.66, 0.08),
        new THREE.Vector2(0.64, 0.11),
        new THREE.Vector2(0.39, 0.04),
      ];
      const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 20), mainMat);
      brim.scale.set(1.1, 1, 0.96);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.405, 0.32, 18), mainMat);
      crown.position.y = 0.17;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.41, 0.07, 18), bandMat);
      band.position.y = 0.07;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), accentMat);
      star.position.set(0, 0.14, 0.385);
      group.add(brim, crown, band, star);
      break;
    }
    case 'crown': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.16, 18), accentMat);
      base.position.y = 0.08;
      const innerVelvet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), bandMat);
      innerVelvet.scale.set(1, 0.55, 1);
      innerVelvet.position.y = 0.14;
      group.add(base, innerVelvet);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), accentMat);
        spike.position.set(Math.sin(angle) * 0.295, 0.24, Math.cos(angle) * 0.295);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), accentMat);
        orb.position.set(Math.sin(angle) * 0.295, 0.35, Math.cos(angle) * 0.295);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), bandMat);
        gem.position.set(Math.sin(angle) * 0.34, 0.09, Math.cos(angle) * 0.34);
        group.add(spike, orb, gem);
      }
      break;
    }
    case 'sun_hat':
    default: {
      const brimPts = [
        new THREE.Vector2(0.38, 0.02),
        new THREE.Vector2(0.58, 0.01),
        new THREE.Vector2(0.71, -0.04),
        new THREE.Vector2(0.69, -0.01),
        new THREE.Vector2(0.39, 0.05),
      ];
      const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 20), mainMat);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        mainMat,
      );
      dome.scale.set(1.04, 0.96, 1.02);
      dome.position.y = 0.02;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.415, 0.425, 0.075, 18), bandMat);
      ribbon.position.y = 0.07;
      group.add(brim, dome, ribbon);
      break;
    }
  }

  return { group, placement };
}

/**
 * Wider, cute vinyl-toy chibi head LatheGeometry (pure skin mesh — ZERO hair baked in).
 * Built with phiStart = -Math.PI so UV u = 0.50 lands dead-center on front (+Z)
 * and the UV seam sits invisibly behind the head (-Z).
 */
function createChibiHeadGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = chin bottom, 1 = top crown
    const angle = -Math.PI / 2 + t * Math.PI;
    const y = Math.sin(angle) * 0.395;
    let r = Math.cos(angle) * 0.415;
    // Soft rounded chibi cheek fullness on lower half & clean chin taper
    if (t < 0.48 && t > 0.09) {
      r *= 1.032;
    }
    pts.push(new THREE.Vector2(Math.max(0.002, r), y));
  }
  const geo = new THREE.LatheGeometry(pts, 24, -Math.PI, Math.PI * 2);
  geo.scale(1.06, 0.94, 0.98);
  return geo;
}

/**
 * Sculpted tapered curved cartoon hair lock (plump root tapering to a crisp soft tip).
 * Eliminates lumpy clay sausages and provides stylish anime/vinyl-toy hair tufts.
 */
function createTaperedStrandGeometry(curveAmount = 0.14): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.003, 0.0), // soft root tip
    new THREE.Vector2(0.088, 0.1),
    new THREE.Vector2(0.115, 0.28),
    new THREE.Vector2(0.105, 0.52),
    new THREE.Vector2(0.074, 0.76),
    new THREE.Vector2(0.036, 0.92),
    new THREE.Vector2(0.003, 1.0), // tapered cartoon point
  ];
  const geo = new THREE.LatheGeometry(pts, 10);
  // Shift along X gently as Y progresses for a natural curved lock sweep
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const bend = curveAmount * y * y;
    pos.setX(i, pos.getX(i) + bend);
  }
  geo.translate(0, -0.35, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * SINGLE REACTIVE HAIR BUILDER:
 * - Uses ONE shared dynamically-tinted `hairMat` strictly bound to `hairColor`.
 * - Form-fitting upper-skull scalp cap + strictly rear-only back-nape contour (NEVER wraps onto cheeks or chin!).
 * - All 10 Male & 10 Female hairstyles sculpted with tapered curved cartoon hair locks.
 * - Clean `hatMode` crown tucking so zero hair ever clips through hats.
 */
function populateHairGroup(
  hairGroup: THREE.Group,
  gender: Gender,
  hairId: number,
  hairColor: string,
  hatMode: boolean,
): void {
  // Dispose and remove every existing child before rebuilding cleanly
  while (hairGroup.children.length > 0) {
    const child = hairGroup.children[0];
    hairGroup.remove(child);
    disposeObject3D(child);
  }

  const catalog = HAIR_CATALOG[gender];
  const style = catalog[hairId % catalog.length];

  // BALD: build absolutely zero hair meshes so the clean skin head + ears show
  // through with no scalp shells, leftover patches or z-fighting. Eyebrows stay
  // tinted by `hairColor` because they are painted by the face texture.
  if (style.variant === 'bald') {
    return;
  }

  const hairMat = makeSatinMat(hairColor, 0.46, 0.06);
  hairMat.side = THREE.DoubleSide;

  // Shared tapered strand geometries (lean 10-segment meshes) reused across locks
  const curvedTuftGeo = createTaperedStrandGeometry(0.16);
  const straightTuftGeo = createTaperedStrandGeometry(0.05);

  const addTuft = (
    geo: THREE.BufferGeometry,
    pos: [number, number, number],
    rot: [number, number, number],
    scale: [number, number, number],
  ) => {
    const mesh = new THREE.Mesh(geo, hairMat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    hairGroup.add(mesh);
    return mesh;
  };

  // 1. Seamless 3-Zone Form-Fitting Skull Coverage (ZERO temple gaps, ZERO cheek bowl, ZERO lumpy shelf!)
  // SphereGeometry coords: phi=0 is -X (right ear), phi=0.5*PI is +Z (face), phi=PI is +X (left ear), phi=1.5*PI is -Z (back).
  const isBuzz = gender === 'male' && style.variant === 'buzz';
  const capRadius = isBuzz ? 0.415 : 0.424;
  const shellScaleY = hatMode ? 0.91 : isBuzz ? 0.94 : 0.98;
  const shellPos: [number, number, number] = [0, 0.012, -0.004];

  // Zone A: Upper Crown Cap (full 360° over top down to forehead hairline)
  const scalpCap = new THREE.Mesh(
    new THREE.SphereGeometry(capRadius, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.37),
    hairMat,
  );
  scalpCap.scale.set(1.08, shellScaleY, 1.02);
  scalpCap.position.set(...shellPos);
  hairGroup.add(scalpCap);

  // Zone B: Upper Temple Band (wraps around sides ABOVE ears from right temple to left temple — closes temple triangle!)
  const templeBand = new THREE.Mesh(
    new THREE.SphereGeometry(
      capRadius,
      20,
      8,
      Math.PI * 0.78,
      Math.PI * 1.44,
      Math.PI * 0.28,
      Math.PI * 0.24,
    ),
    hairMat,
  );
  templeBand.scale.set(1.08, 0.96, 1.02);
  templeBand.position.set(...shellPos);
  hairGroup.add(templeBand);

  // Zone C: Strictly Rear-Only Lower Back-Nape Shell (strictly BEHIND both ears down to nape — zero cheek wrap!)
  const backNape = new THREE.Mesh(
    new THREE.SphereGeometry(
      capRadius,
      18,
      10,
      Math.PI * 1.01,
      Math.PI * 0.98,
      Math.PI * 0.44,
      Math.PI * 0.29,
    ),
    hairMat,
  );
  backNape.scale.set(1.08, 0.96, 1.02);
  backNape.position.set(...shellPos);
  hairGroup.add(backNape);

  // Crisp tapered sideburns hugging flush just in front of ears
  for (const side of [-1, 1]) {
    addTuft(
      straightTuftGeo,
      [side * 0.422, 0.055, 0.065],
      [0.14, side * 0.12, Math.PI + side * 0.16],
      [0.64, isBuzz ? 0.18 : 0.25, 0.68],
    );
  }

  // Helper: Styled Cartoon Swept Bangs (hugging forehead curvature smoothly like the target mockup!)
  const addCartoonSweptBangs = (dir: 1 | -1 = 1, fuller = false) => {
    const by = hatMode ? 0.165 : 0.21;
    const bz = hatMode ? 0.325 : 0.348;
    const s = hatMode ? 0.86 : fuller ? 1.06 : 0.96;

    // Main forehead swoop tuft hugging across brow
    addTuft(
      curvedTuftGeo,
      [-dir * 0.07, by + 0.02, bz],
      [0.24, dir * 0.16, -dir * 1.38],
      [0.98 * s, 0.42 * s, 0.7],
    );
    // Secondary overlapping lower bang tip (charming cartoon fringe!)
    addTuft(
      curvedTuftGeo,
      [dir * 0.09, by + 0.005, bz - 0.012],
      [0.26, -dir * 0.18, -dir * 1.54],
      [0.84 * s, 0.34 * s, 0.66],
    );
    // Opposite counter-part lock: short, close to the brow so the fringe keeps
    // a clean V-part notch without any spike above the crown silhouette.
    addTuft(
      curvedTuftGeo,
      [-dir * 0.185, by - 0.03, bz - 0.035],
      [0.2, dir * 0.42, dir * 1.48],
      [0.62 * s, 0.17 * s, 0.56],
    );
    // Smooth temple-bridging fringe wisps tucked cleanly along sides
    addTuft(
      curvedTuftGeo,
      [dir * 0.275, by - 0.035, bz - 0.105],
      [0.14, -dir * 0.56, Math.PI - dir * 0.24],
      [0.72 * s, 0.25 * s, 0.64],
    );
    addTuft(
      curvedTuftGeo,
      [-dir * 0.285, by - 0.035, bz - 0.11],
      [0.14, dir * 0.56, Math.PI + dir * 0.24],
      [0.7 * s, 0.24 * s, 0.64],
    );
  };

  if (gender === 'male') {
    switch (style.variant) {
      case 'side_part': {
        // Signature Mockup Look: lush rounded side-swept waves hugging the skull (no pointy horns!)
        addCartoonSweptBangs(1, true);
        if (!hatMode) {
          // Smooth volumetric side-swept top cushion following skull contour
          const topSweep = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), hairMat);
          topSweep.scale.set(1.24, 0.56, 1.06);
          topSweep.position.set(0.03, 0.305, 0.04);
          topSweep.rotation.z = -0.14;
          hairGroup.add(topSweep);

          // Layered softly-curved horizontal cartoon wave tufts hugging the crown
          addTuft(curvedTuftGeo, [-0.14, 0.345, 0.16], [0.18, 0.12, -1.35], [1.15, 0.44, 0.85]);
          addTuft(curvedTuftGeo, [0.04, 0.365, 0.06], [0.06, -0.08, -1.52], [1.08, 0.4, 0.82]);
          addTuft(curvedTuftGeo, [-0.18, 0.315, -0.02], [-0.08, 0.22, 1.28], [0.95, 0.34, 0.8]);
          // Subtle side-sweep feather on right crown (angled horizontally, NOT vertical!)
          addTuft(curvedTuftGeo, [0.16, 0.325, -0.02], [-0.1, -0.2, -1.36], [0.9, 0.32, 0.78]);
        }
        // Subtle skull-hugging rear nape fringe
        for (let i = -2; i <= 2; i++) {
          addTuft(
            straightTuftGeo,
            [i * 0.12, -0.12, -0.375 + Math.abs(i) * 0.034],
            [-0.14, i * 0.28, Math.PI - i * 0.06],
            [0.62, 0.19, 0.5],
          );
        }
        break;
      }

      case 'spiky': {
        // Dynamic anime-style spiky crown & sharp forehead bangs
        for (let i = -2; i <= 2; i++) {
          addTuft(
            straightTuftGeo,
            [i * 0.115, hatMode ? 0.18 : 0.22, 0.355 - Math.abs(i) * 0.038],
            [0.35, i * 0.24, Math.PI - i * 0.14],
            [0.72, 0.26, 0.62],
          );
        }
        if (!hatMode) {
          const spikeDefs: Array<[[number, number, number], [number, number, number], number]> = [
            [[0, 0.42, 0.12], [0.22, 0, -0.12], 0.44],
            [[-0.18, 0.39, 0.1], [0.18, 0.2, 0.48], 0.42],
            [[0.19, 0.39, 0.08], [0.15, -0.2, -0.52], 0.42],
            [[-0.24, 0.34, -0.1], [-0.25, 0.15, 0.65], 0.38],
            [[0.24, 0.34, -0.1], [-0.25, -0.15, -0.65], 0.38],
            [[0, 0.4, -0.14], [-0.45, 0, 0.05], 0.42],
            [[-0.12, 0.35, -0.24], [-0.72, 0.1, 0.25], 0.36],
            [[0.12, 0.35, -0.24], [-0.72, -0.1, -0.25], 0.36],
          ];
          for (const [p, r, len] of spikeDefs) {
            addTuft(curvedTuftGeo, p, r, [0.95, len, 0.85]);
          }
        }
        break;
      }

      case 'pompadour': {
        addCartoonSweptBangs(-1, false);
        if (!hatMode) {
          // Big sleek sculpted rockabilly wave crest swept forward & up
          const pompMain = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), hairMat);
          pompMain.scale.set(1.18, 0.86, 1.62);
          pompMain.position.set(0, 0.39, 0.15);
          pompMain.rotation.x = -0.24;
          hairGroup.add(pompMain);

          addTuft(curvedTuftGeo, [0, 0.43, 0.27], [-0.92, 0, 0.05], [1.35, 0.42, 1.05]);
          addTuft(curvedTuftGeo, [-0.14, 0.37, 0.16], [-0.75, 0.18, 0.28], [0.95, 0.36, 0.85]);
          addTuft(curvedTuftGeo, [0.14, 0.37, 0.16], [-0.75, -0.18, -0.28], [0.95, 0.36, 0.85]);
        }
        break;
      }

      case 'curly_top': {
        // Bouncy textured curls across the forehead & upper crown
        const frontCurls = [
          [-0.22, 0.21, 0.32, 0.105],
          [-0.08, 0.24, 0.36, 0.12],
          [0.08, 0.24, 0.36, 0.12],
          [0.22, 0.21, 0.32, 0.105],
        ];
        for (const [cx, cy, cz, cr] of frontCurls) {
          const curl = new THREE.Mesh(new THREE.SphereGeometry(cr, 10, 8), hairMat);
          curl.position.set(cx, hatMode ? cy - 0.03 : cy, cz);
          hairGroup.add(curl);
        }
        if (!hatMode) {
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            const ringR = i % 2 === 0 ? 0.22 : 0.11;
            const puff = new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8), hairMat);
            puff.position.set(
              Math.cos(a) * ringR,
              0.38 + (i % 2) * 0.055,
              Math.sin(a) * ringR + 0.04,
            );
            hairGroup.add(puff);
          }
        }
        break;
      }

      case 'buzz': {
        // Ultra-clean short buzz cut — neat rounded hairline ridge only
        const hairline = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.032, 8, 18, Math.PI * 0.72), hairMat);
        hairline.rotation.x = Math.PI / 2 - 0.28;
        hairline.rotation.z = Math.PI * 0.14;
        hairline.position.set(0, 0.2, 0.08);
        hairGroup.add(hairline);
        break;
      }

      case 'messy': {
        // Playful windswept tousled locks in every direction
        addCartoonSweptBangs(-1, false);
        for (let i = -2; i <= 2; i++) {
          addTuft(
            curvedTuftGeo,
            [i * 0.115, hatMode ? 0.185 : 0.23, 0.34 - Math.abs(i) * 0.04],
            [0.26, i * 0.22, Math.PI + (i % 2 === 0 ? 0.28 : -0.32)],
            [0.78, 0.29, 0.65],
          );
        }
        if (!hatMode) {
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + 0.3;
            addTuft(
              curvedTuftGeo,
              [Math.cos(a) * 0.2, 0.37, Math.sin(a) * 0.18],
              [Math.sin(a) * 0.55, a * 0.2, -Math.cos(a) * 0.75],
              [0.92, 0.36, 0.8],
            );
          }
        }
        break;
      }

      case 'slick_back': {
        // Classy Mobster slicked-back ridges flowing smoothly from forehead to nape
        const ridgeCount = 5;
        for (let i = 0; i < ridgeCount; i++) {
          const offset = (i - 2) * 0.11;
          addTuft(
            straightTuftGeo,
            [offset, hatMode ? 0.24 : 0.345 - Math.abs(offset) * 0.22, 0.06],
            [-Math.PI / 2 + 0.22, -offset * 0.35, 0],
            [0.9, 0.52, 0.78],
          );
        }
        // Subtle swept forehead crest
        addTuft(
          curvedTuftGeo,
          [0, hatMode ? 0.2 : 0.25, 0.33],
          [-0.65, 0, -0.15],
          [1.2, 0.28, 0.75],
        );
        break;
      }

      case 'undercut': {
        // Tight cropped sides + lofty asymmetric swept-over top wave
        addCartoonSweptBangs(1, false);
        if (!hatMode) {
          addTuft(curvedTuftGeo, [-0.12, 0.385, 0.15], [-0.28, 0.08, -1.12], [1.35, 0.52, 1.0]);
          addTuft(curvedTuftGeo, [0.04, 0.405, 0.04], [-0.32, -0.05, -1.28], [1.22, 0.46, 0.94]);
          addTuft(curvedTuftGeo, [0.16, 0.35, 0.1], [-0.15, -0.22, -1.52], [0.95, 0.36, 0.82]);
        }
        break;
      }

      case 'afro': {
        // Lush volumetric rounded afro cloud
        const ringCount = hatMode ? 8 : 12;
        for (let i = 0; i < ringCount; i++) {
          const a = (i / ringCount) * Math.PI * 2;
          const x = Math.sin(a) * (hatMode ? 0.4 : 0.44);
          const z = Math.cos(a) * (hatMode ? 0.36 : 0.38) - 0.06;
          if (z > 0.24) continue;
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry(hatMode ? 0.135 : 0.185, 10, 8),
            hairMat,
          );
          puff.position.set(x, hatMode ? 0.08 : 0.2 + (i % 2) * 0.12, z);
          hairGroup.add(puff);
        }
        if (!hatMode) {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const topPuff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), hairMat);
            topPuff.position.set(Math.sin(a) * 0.2, 0.42, Math.cos(a) * 0.18 - 0.03);
            hairGroup.add(topPuff);
          }
          const crownPuff = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), hairMat);
          crownPuff.position.set(0, 0.46, -0.02);
          hairGroup.add(crownPuff);
        }
        // Soft curly hairline edge
        for (let i = -2; i <= 2; i++) {
          const fPuff = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), hairMat);
          fPuff.position.set(i * 0.11, hatMode ? 0.2 : 0.24, 0.34 - Math.abs(i) * 0.04);
          hairGroup.add(fPuff);
        }
        break;
      }

      case 'long_layered':
      default: {
        // Shoulder-grazing layered curtain bangs + feathered rear cascade
        for (const side of [-1, 1]) {
          addTuft(
            curvedTuftGeo,
            [side * 0.22, hatMode ? 0.15 : 0.19, 0.31],
            [0.12, -side * 0.32, Math.PI - side * 0.28],
            [0.88, 0.42, 0.72],
          );
          addTuft(
            curvedTuftGeo,
            [side * 0.39, -0.02, 0.02],
            [0.05, -side * 0.2, Math.PI - side * 0.12],
            [0.82, 0.48, 0.72],
          );
        }
        for (let i = -2; i <= 2; i++) {
          addTuft(
            curvedTuftGeo,
            [i * 0.155, -0.14, -0.34 + Math.abs(i) * 0.055],
            [-0.14, i * 0.26, Math.PI - i * 0.12],
            [1.05, 0.56, 0.8],
          );
        }
        break;
      }
    }
  } else {
    // ============================================================
    // FEMALE HAIRSTYLES — soft, sculpted, 360° clean silhouettes.
    // Every style shares the form-fitting scalp cap above, then layers
    // smooth tapered locks so front / 3-4 / side / back all read cleanly.
    // `hatMode` compresses only the top crown and keeps bangs + length.
    // ============================================================
    const isPixie = style.variant === 'pixie';
    const crownLift = hatMode ? 0.055 : 0;

    // Reusable soft curl blob (low-poly sphere, shared material)
    const addCurl = (
      pos: [number, number, number],
      radius: number,
      scale: [number, number, number] = [1, 1, 1],
      rot: [number, number, number] = [0, 0, 0],
    ) => {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 9), hairMat);
      curl.position.set(pos[0], pos[1], pos[2]);
      curl.scale.set(scale[0], scale[1], scale[2]);
      curl.rotation.set(rot[0], rot[1], rot[2]);
      hairGroup.add(curl);
      return curl;
    };

    // Smooth rear shell that hugs the skull (never a floating bowl)
    const addBackShell = (
      topTheta: number,
      thetaLength: number,
      y: number,
      z: number,
      scale: [number, number, number],
    ) => {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.428,
          20,
          14,
          // Exclude a wide wedge around the face (+Z) so cheeks/eyes stay clear
          Math.PI * 0.78,
          Math.PI * 1.44,
          topTheta,
          thetaLength,
        ),
        hairMat,
      );
      shell.position.set(0, y, z);
      shell.scale.set(scale[0], scale[1], scale[2]);
      hairGroup.add(shell);
      return shell;
    };

    // Matching hair tie / scrunchie
    const addTie = (color: string, pos: [number, number, number], rotX = 0.2) => {
      const tieMat = makeSatinMat(color, 0.34, 0.22);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.028, 8, 14), tieMat);
      tie.position.set(pos[0], pos[1], pos[2]);
      tie.rotation.x = rotX;
      hairGroup.add(tie);
      return tie;
    };

    // Sculpted satin bow (knot + two loops + two tails)
    const addBow = (pos: [number, number, number], size = 1, color = '#FF3B5C') => {
      const bowMat = makeSatinMat(color, 0.32, 0.18);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05 * size, 10, 8), bowMat);
      knot.position.set(pos[0], pos[1], pos[2]);
      hairGroup.add(knot);
      for (const side of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.SphereGeometry(0.086 * size, 12, 9), bowMat);
        loop.scale.set(1.3, 0.72, 0.5);
        loop.position.set(pos[0] + side * 0.1 * size, pos[1] + 0.012, pos[2] - 0.008);
        loop.rotation.z = side * 0.24;
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.042 * size, 0.14 * size, 0.02), bowMat);
        tail.position.set(pos[0] + side * 0.05 * size, pos[1] - 0.085 * size, pos[2] - 0.012);
        tail.rotation.z = -side * 0.22;
        hairGroup.add(loop, tail);
      }
    };

    // Soft side-swept curtain lock framing the cheek (shared by most styles)
    const addFaceFraming = (depth = 0.1, length = 0.46, outward = 0.36) => {
      for (const side of [-1, 1]) {
        addTuft(
          curvedTuftGeo,
          [side * outward, -0.03, depth],
          [0.06, -side * 0.16, Math.PI + side * 0.12],
          [0.82, length, 0.72],
        );
      }
    };

    switch (style.variant) {
      // 1. LONG FLOWING WAVES — side curtain bangs + layered back cascade
      case 'long_wavy': {
        addCartoonSweptBangs(1, true);
        addFaceFraming(0.1, 0.52, 0.375);

        // Smooth nape drape that flows from the scalp instead of a floating tube
        // Cylinder theta: 0 = +Z (face), PI/2..3PI/2 wraps the back half only
        const drape = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.405,
            0.475,
            0.66,
            18,
            1,
            true,
            Math.PI * 0.52,
            Math.PI * 0.96,
          ),
          hairMat,
        );
        drape.position.set(0, -0.27, -0.02);
        drape.scale.set(1.04, 1, 0.94);
        hairGroup.add(drape);

        // Alternating layered waves give the back a soft, non-tubular fall
        for (let i = -3; i <= 3; i++) {
          const lean = i * 0.128;
          addTuft(
            curvedTuftGeo,
            [lean, -0.24 - Math.abs(i) * 0.012, -0.365 + Math.abs(i) * 0.032],
            [-0.08, i * 0.14, Math.PI - i * 0.09],
            [1.06, 0.58 - Math.abs(i) * 0.028, 0.82],
          );
        }
        // Gentle over-shoulder flips
        for (const side of [-1, 1]) {
          addTuft(
            curvedTuftGeo,
            [side * 0.4, -0.28, 0.015],
            [0.14, -side * 0.3, Math.PI - side * 0.2],
            [0.88, 0.44, 0.8],
          );
        }
        break;
      }

      // 2. HIGH SLEEK PONYTAIL — pulled-back crown + bouncy tapered pony
      case 'ponytail': {
        // Slicked crown sweeps flowing back toward the tie
        for (const i of [-1, 0, 1]) {
          addTuft(
            straightTuftGeo,
            [i * 0.125, 0.315 - Math.abs(i) * 0.02 + crownLift, -0.02],
            [-Math.PI / 2 + 0.38, -i * 0.22, 0],
            [0.9, 0.54, 0.78],
          );
        }
        // Cute face-framing wisps
        for (const side of [-1, 1]) {
          addTuft(
            curvedTuftGeo,
            [side * 0.335, -0.05, 0.215],
            [0.1, -side * 0.32, Math.PI + side * 0.3],
            [0.6, 0.4, 0.6],
          );
        }

        const py = (hatMode ? 0.03 : 0.15) + crownLift;
        addTie('#FF4B6A', [0, py, -0.435], 0.24);

        // Bouncy curved pony built from nested tapered locks
        addTuft(curvedTuftGeo, [0.02, py - 0.15, -0.525], [-0.5, 0.06, Math.PI + 0.1], [1.48, 0.8, 1.16]);
        addTuft(curvedTuftGeo, [-0.06, py - 0.17, -0.55], [-0.44, 0.18, Math.PI + 0.22], [1, 0.68, 0.94]);
        addTuft(curvedTuftGeo, [0.09, py - 0.16, -0.55], [-0.48, -0.16, Math.PI - 0.2], [0.98, 0.64, 0.92]);
        addTuft(curvedTuftGeo, [0.01, py - 0.3, -0.6], [-0.3, 0.02, Math.PI + 0.04], [1.1, 0.52, 0.92]);
        break;
      }

      // 3. CUTE TWIN BUNS — center-parted bangs + symmetric rounded buns
      case 'twin_buns': {
        addCartoonSweptBangs(1, false);
        addCartoonSweptBangs(-1, false);

        const bunY = (hatMode ? 0.02 : 0.22) + crownLift;
        const bunX = hatMode ? 0.4 : 0.375;
        for (const side of [-1, 1]) {
          // Base wrap blends the bun softly into the scalp
          addCurl([side * (bunX - 0.045), bunY - 0.075, -0.1], 0.135, [1.1, 0.9, 1]);
          addCurl([side * bunX, bunY, -0.115], 0.165, [1.05, 1, 0.98]);
          const ring = addTie('#FACC15', [side * (bunX - 0.02), bunY - 0.155, -0.105], 0.1);
          ring.rotation.y = Math.PI / 2;
          ring.rotation.x = side * 0.42;
        }
        // Soft nape coverage under the buns
        addBackShell(Math.PI * 0.58, Math.PI * 0.3, -0.03, -0.01, [1.06, 1, 1.02]);
        break;
      }

      // 4. CHIC CHIN-LENGTH BOB — smooth jaw-framing curve + side part
      case 'bob_cut': {
        addCartoonSweptBangs(1, false);
        addBackShell(Math.PI * 0.42, Math.PI * 0.38, -0.055, -0.015, [1.14, 1, 1.08]);

        for (const side of [-1, 1]) {
          // Cheek-length panels curving gently inward at the jaw
          addTuft(
            curvedTuftGeo,
            [side * 0.405, -0.075, 0.055],
            [0.04, -side * 0.12, Math.PI + side * 0.16],
            [1.1, 0.46, 1.02],
          );
          addTuft(
            curvedTuftGeo,
            [side * 0.355, -0.145, -0.13],
            [-0.06, -side * 0.3, Math.PI + side * 0.1],
            [1.02, 0.4, 0.94],
          );
        }
        // Rounded back volume closing the bob silhouette
        addCurl([0, -0.2, -0.24], 0.3, [1.22, 0.72, 0.86]);
        break;
      }

      // 5. SIDE BRAID — swept front hair flowing into a layered braid
      case 'side_braid': {
        addCartoonSweptBangs(1, true);
        // Sweep everything toward the braid side for a natural parted look
        addTuft(curvedTuftGeo, [0.34, 0.06, 0.16], [0.16, -0.24, Math.PI + 0.34], [0.92, 0.5, 0.8]);
        addTuft(curvedTuftGeo, [-0.3, 0.1, 0.1], [0.2, 0.3, Math.PI - 0.26], [0.86, 0.46, 0.78]);
        addBackShell(Math.PI * 0.46, Math.PI * 0.34, -0.05, -0.02, [1.08, 1, 1.05]);

        // Sculpted braid: overlapping flattened segments hugging the shoulder
        for (let b = 0; b < 6; b++) {
          const t = b / 6;
          addCurl(
            [0.365 + Math.sin(b * 0.75) * 0.022, -0.09 - b * 0.098, 0.03 + t * 0.115],
            0.098 - b * 0.007,
            [1.12, 0.92, 0.88],
            [0.2, 0.35, b % 2 === 0 ? 0.2 : -0.2],
          );
        }
        addTie('#FF4B6A', [0.385, -0.665, 0.15], Math.PI / 2);
        addTuft(curvedTuftGeo, [0.385, -0.7, 0.155], [0.2, 0, Math.PI], [0.66, 0.22, 0.62]);
        break;
      }

      // 6. FLUFFY CURLY VOLUME — harmonious layered clusters (no floating balls)
      case 'curly_volume': {
        addCartoonSweptBangs(1, true);
        // Smooth base so the curls read as one soft mass
        addBackShell(Math.PI * 0.4, Math.PI * 0.42, -0.04, -0.02, [1.12, 1.04, 1.08]);

        // Side clusters, mirrored and layered downward
        for (const side of [-1, 1]) {
          for (let c = 0; c < 3; c++) {
            addCurl(
              [side * (0.335 + c * 0.018), 0.09 - c * 0.145, -0.06 - (c % 2) * 0.055],
              0.145 - c * 0.012,
              [1.02, 0.96, 1],
            );
          }
        }
        // Back curls forming a soft rounded silhouette
        for (let i = -2; i <= 2; i++) {
          addCurl(
            [i * 0.135, -0.235 - (Math.abs(i) % 2) * 0.055, -0.3 + Math.abs(i) * 0.04],
            0.145,
            [1, 0.94, 1],
          );
        }
        if (!hatMode) {
          for (let i = -1; i <= 1; i++) {
            addCurl([i * 0.155, 0.345, 0.015], 0.15, [1.05, 0.86, 1.02]);
          }
          addCurl([0, 0.375, -0.1], 0.155, [1.1, 0.9, 1.02]);
        }
        break;
      }

      // 7. TWIN PIGTAILS — neat parted bangs + tapered curving pigtails
      case 'pigtails': {
        addCartoonSweptBangs(1, false);
        addCartoonSweptBangs(-1, false);

        const py = (hatMode ? -0.01 : 0.1) + crownLift;
        for (const side of [-1, 1]) {
          addTie('#38B6FF', [side * 0.425, py, -0.13], 0.15);
          addTuft(
            curvedTuftGeo,
            [side * 0.505, py - 0.19, -0.155],
            [-0.1, 0, Math.PI + side * 0.3],
            [1.1, 0.66, 0.98],
          );
          addTuft(
            curvedTuftGeo,
            [side * 0.475, py - 0.235, -0.215],
            [-0.16, 0, Math.PI + side * 0.18],
            [0.86, 0.52, 0.84],
          );
        }
        // Soft nape bridging the two tails
        addBackShell(Math.PI * 0.52, Math.PI * 0.32, -0.04, -0.02, [1.06, 1, 1.04]);
        break;
      }

      // 8. LAYERED SHOULDER CUT — wispy bangs + inward-curving layers
      case 'layered_shoulder': {
        addCartoonSweptBangs(1, false);
        addFaceFraming(0.11, 0.44, 0.36);
        addBackShell(Math.PI * 0.44, Math.PI * 0.36, -0.06, -0.02, [1.1, 1, 1.06]);

        // Feathered layers flip softly outward then in toward the shoulders
        for (let i = -3; i <= 3; i++) {
          const lean = i * 0.132;
          addTuft(
            curvedTuftGeo,
            [lean, -0.215, -0.34 + Math.abs(i) * 0.045],
            [-0.16, i * 0.2, Math.PI + (i === 0 ? 0 : Math.sign(i) * 0.2)],
            [0.98, 0.5, 0.8],
          );
        }
        for (const side of [-1, 1]) {
          addTuft(
            curvedTuftGeo,
            [side * 0.405, -0.22, -0.01],
            [0.06, -side * 0.22, Math.PI - side * 0.24],
            [0.92, 0.48, 0.82],
          );
        }
        break;
      }

      // 9. STYLISH PIXIE CUT — short crop, feathered top, tapered nape
      case 'pixie': {
        // Short side-swept fringe hugging the brow
        addCartoonSweptBangs(1, false);
        for (const side of [-1, 1]) {
          addTuft(
            straightTuftGeo,
            [side * 0.335, -0.045, 0.185],
            [0.08, -side * 0.3, Math.PI + side * 0.34],
            [0.58, 0.34, 0.56],
          );
        }
        if (!hatMode) {
          // Feathered crown tufts swept back and to one side
          addTuft(curvedTuftGeo, [-0.1, 0.36, 0.09], [-0.16, 0.16, -1.2], [0.92, 0.34, 0.8]);
          addTuft(curvedTuftGeo, [0.1, 0.35, 0.03], [-0.22, -0.14, -1.36], [0.86, 0.3, 0.76]);
          addTuft(curvedTuftGeo, [0.02, 0.375, -0.1], [-0.3, 0.04, -1.48], [0.88, 0.3, 0.78]);
        }
        // Tapered nape hairline
        for (let i = -2; i <= 2; i++) {
          addTuft(
            straightTuftGeo,
            [i * 0.112, -0.115, -0.35 + Math.abs(i) * 0.032],
            [-0.22, i * 0.26, Math.PI - i * 0.1],
            [0.6, 0.2, 0.55],
          );
        }
        break;
      }

      // 10. HALF-UP BOW — pulled-back upper + flowing lower waves + ribbon
      case 'half_up_bow':
      default: {
        addCartoonSweptBangs(1, true);
        // Upper hair swept smoothly back over the crown
        for (let i = -1; i <= 1; i++) {
          addTuft(
            straightTuftGeo,
            [i * 0.125, 0.315 - Math.abs(i) * 0.02 + crownLift, -0.03],
            [-Math.PI / 2 + 0.42, -i * 0.22, 0],
            [0.88, 0.5, 0.76],
          );
        }
        addBackShell(Math.PI * 0.42, Math.PI * 0.36, -0.055, -0.02, [1.1, 1, 1.06]);

        // Lower flowing waves, slightly narrower than the long-wavy cascade
        for (let i = -3; i <= 3; i++) {
          addTuft(
            curvedTuftGeo,
            [i * 0.13, -0.245, -0.355 + Math.abs(i) * 0.04],
            [-0.1, i * 0.18, Math.PI - i * 0.1],
            [1.02, 0.54, 0.8],
          );
        }
        // Cute satin bow pinned at the back crown
        addBow([0, (hatMode ? 0.13 : 0.235) + crownLift, -0.435], hatMode ? 0.78 : 1);
        break;
      }
    }

    // Delicate face-framing wisps for every non-pixie style that didn't add its own
    if (
      !isPixie &&
      style.variant !== 'long_wavy' &&
      style.variant !== 'layered_shoulder' &&
      style.variant !== 'ponytail'
    ) {
      for (const side of [-1, 1]) {
        addTuft(
          curvedTuftGeo,
          [side * 0.405, 0.005, 0.115],
          [0.08, -side * 0.2, Math.PI + side * 0.1],
          [0.66, 0.4, 0.64],
        );
      }
    }
  }
}

/**
 * Builds an articulated chibi arm (Shoulder -> Upper Arm -> Elbow -> Forearm -> Cuff -> Mitten Hand)
 * with tucked-in rounded shoulder cap and crisp non-z-fighting cuffs.
 */
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

  // Tucked-in rounded shoulder cap matching torso silhouette smoothly
  const baseShoulderR = isFemale ? 0.076 : 0.086;
  const shoulderR = opts.isPuffedShoulders ? baseShoulderR * 1.38 : baseShoulderR;
  const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(shoulderR, 14, 10), upperMat);
  shoulder.add(shoulderCap);

  if (opts.hasEpaulets && opts.epauletMat) {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.032, 0.092), opts.epauletMat);
    ep.position.set(side * 0.01, 0.078, 0);
    ep.rotation.z = side * -0.18;
    shoulder.add(ep);
  }

  // Upper arm
  const upperLen = 0.21;
  const armScale = isFemale ? 0.9 : 1.0;
  if (opts.isPufferSleeves) {
    for (const py of [-0.055, -0.145]) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.088 * armScale, 12, 10), upperMat);
      puff.scale.set(1.04, 0.72, 1.04);
      puff.position.y = py;
      shoulder.add(puff);
    }
  } else {
    const upperMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072 * armScale, 0.065 * armScale, upperLen, 14),
      upperMat,
    );
    upperMesh.position.y = -upperLen / 2;
    shoulder.add(upperMesh);
  }

  // Elbow pivot + joint sphere
  const elbow = new THREE.Group();
  elbow.position.set(0, -upperLen, 0);
  const elbowJoint = new THREE.Mesh(
    new THREE.SphereGeometry((opts.isRolledSleeves ? 0.068 : 0.064) * armScale, 10, 8),
    opts.isRolledSleeves ? cuffMat : forearmMat,
  );
  elbow.add(elbowJoint);

  // Rolled sleeve band at elbow for Sleeveless Detective Vest
  if (opts.isRolledSleeves) {
    const rollBand = new THREE.Mesh(new THREE.TorusGeometry(0.068 * armScale, 0.02, 8, 14), cuffMat);
    rollBand.rotation.x = Math.PI / 2;
    rollBand.position.y = -0.015;
    elbow.add(rollBand);
  }

  // Forearm
  const foreLen = 0.2;
  if (opts.isPufferSleeves) {
    for (const py of [-0.065, -0.15]) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.082 * armScale, 12, 10), forearmMat);
      puff.scale.set(1.02, 0.7, 1.02);
      puff.position.y = py;
      elbow.add(puff);
    }
  } else {
    const foreRTop = (opts.isRolledSleeves ? 0.056 : 0.064) * armScale;
    const foreRBot = (opts.isRolledSleeves ? 0.05 : 0.058) * armScale;
    const foreMesh = new THREE.Mesh(new THREE.CylinderGeometry(foreRTop, foreRBot, foreLen, 14), forearmMat);
    foreMesh.position.y = -foreLen / 2;
    elbow.add(foreMesh);
  }

  // Crisp non-z-fighting Wrist Cuff
  if (!opts.isRolledSleeves) {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.062 * armScale, 0.017, 8, 14), cuffMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -foreLen + 0.018;
    elbow.add(cuff);
  }

  // Cute Rounded Mitten Hand + Subtle Thumb
  const handGroup = new THREE.Group();
  handGroup.position.set(0, -foreLen - 0.04, 0);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.065 * armScale, 14, 10), skinMat);
  palm.scale.set(0.96, 1.04, 0.86);
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.026 * armScale, 8, 8), skinMat);
  thumb.position.set(-side * 0.048 * armScale, 0.012, 0.034);
  handGroup.add(palm, thumb);
  elbow.add(handGroup);

  shoulder.add(elbow);
  return { shoulder, elbow };
}

export function buildChibiCharacter(
  appearance: CharacterAppearance,
  pose: 'standing' | 'seated' = 'standing',
  options?: { hideHat?: boolean; crossedArms?: boolean },
): ChibiCharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isFemale = appearance.gender === 'female';
  const skinMat = makeSatinMat(appearance.skinColor, 0.6, 0.02);

  // 1. DISTINCT 3D SUIT / TOP GEOMETRY (tapered silhouette matching mockup)
  const suit = buildSuitMesh(appearance.gender, appearance.suitId, appearance.skinColor);
  suit.torsoGroup.position.y = 0.62;
  bodyGroup.add(suit.torsoGroup);

  // 2. DISTINCT 3D PANTS / SKIRT + MATCHING SHOES
  const lowerBody = buildPantsAndShoesMesh(
    appearance.gender,
    appearance.pantsId,
    appearance.skinColor,
    pose,
    suit.coversLowerBody,
  );
  bodyGroup.add(lowerBody);

  // 3. TUCKED-IN ARTICULATED ARMS (Natural ~12-13° A-pose standing, zero detached shoulders!)
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

  // Default relaxed pose targets (used as base for lerping into Hands-Over-Eyes sleep!)
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
    // Natural ~12.6° outward A-pose matching the cute cartoon silhouette in the mockup
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
    // Hands-Over-Eyes sleep pose targets: both arms lift smoothly upward & inward so palms cover the eyes!
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

  // 4. SHORT NECK & PURE-SKIN CHIBI HEAD WITH HIGH-RES CANVAS FACE TEXTURE (ZERO HAIR ON HEAD!)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.128, 0.13, 14), skinMat);
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

  const headMat = new THREE.MeshStandardMaterial({
    map: awakeMap,
    roughness: 0.6,
    metalness: 0.02,
  });

  const headMesh = new THREE.Mesh(createChibiHeadGeometry(), headMat);
  headGroup.add(headMesh);

  // Subtle rounded ears & tiny smooth button nose
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), skinMat);
    ear.scale.set(0.52, 0.84, 0.62);
    ear.position.set(side * 0.432, -0.042, -0.012);
    headGroup.add(ear);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), skinMat);
  nose.scale.set(1.05, 0.76, 0.68);
  nose.position.set(0, -0.068, 0.4);
  headGroup.add(nose);

  // 5. SINGLE REACTIVE HAIR GROUP (fully disposable & rebuilt from scratch with 100% reactive hairColor)
  const hasHat = appearance.hatId !== 'none' && !options?.hideHat;
  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);

  const rebuildHair = (gender: Gender, hairId: number, hairColor: string, hatMode: boolean) => {
    populateHairGroup(hairGroup, gender, hairId, hairColor, hatMode);
  };
  rebuildHair(appearance.gender, appearance.hairId, appearance.hairColor, hasHat);

  // 6. CRISP CARTOON HAT (only rendered when hatId !== 'none')
  if (hasHat && typeof appearance.hatId === 'number') {
    const { group: hatGroup, placement } = buildHat(appearance.hatId);
    hatGroup.position.set(0, placement.y, placement.z);
    hatGroup.rotation.x = placement.tiltX;
    hatGroup.rotation.z = placement.tiltZ;
    headGroup.add(hatGroup);
  }

  // 7. FLOATING SLEEP 'Z' SPRITES (pooled shared CanvasTexture)
  const sleepZs: THREE.Sprite[] = [];
  for (let i = 0; i < 3; i++) {
    const zSprite = createSleepZSprite();
    zSprite.scale.set(0.28 + i * 0.06, 0.28 + i * 0.06, 1);
    zSprite.position.set(0.32 + i * 0.14, 2.2 + i * 0.24, 0.15);
    zSprite.visible = false;
    root.add(zSprite);
    sleepZs.push(zSprite);
  }

  // 8. SELECTION RING & RAYCAST HIT PROXY
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#FACC15',
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.66, 22), ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.04;
  selectionRing.visible = false;
  root.add(selectionRing);

  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 2.25, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.position.y = 1.12;
  root.add(hitProxy);

  // Smooth stateful sleep animation blending (Hands-Over-Eyes + closed-eye canvas face + head bow)
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
