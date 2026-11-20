import * as THREE from 'three';
import { PANTS_CATALOG, SUIT_CATALOG, WardrobeItemStyle } from '../shared/catalog';
import { Gender } from '../shared/types';
import {
  createDenimTexture,
  createPlaidTexture,
  createPinstripeTexture,
} from './faceTexture';

function makeMat(
  color: string | number,
  roughness = 0.6,
  metalness = 0.05,
  map?: THREE.Texture,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: map ? '#FFFFFF' : color,
    ...(map ? { map } : {}),
    roughness,
    metalness,
  });
}

function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export interface SuitBuildResult {
  torsoGroup: THREE.Group;
  sleeveUpperMat: THREE.Material;
  sleeveForearmMat: THREE.Material;
  cuffMat: THREE.Material;
  isRolledSleeves: boolean;
  isPufferSleeves: boolean;
  isPuffedShoulders: boolean;
  hasEpaulets: boolean;
  epauletMat?: THREE.Material;
  coversLowerBody: boolean;
}

/**
 * Builds 10 completely distinct 3D Suit / Top geometries (never just recolored tubes!).
 * Torso local origin sits at hip line (y = 0) up to shoulders (y = 0.54).
 */
export function buildSuitMesh(
  gender: Gender,
  suitId: number,
  skinColor: string,
): SuitBuildResult {
  const style: WardrobeItemStyle = SUIT_CATALOG[gender][suitId % 10];
  const isFemale = gender === 'female';
  const torsoGroup = new THREE.Group();

  const skinMat = makeMat(skinColor, 0.64, 0.02);
  let primaryMat = makeMat(style.primary, 0.62, 0.05);
  const darkMat = makeMat(shadeHex(style.primary, 0.72), 0.64, 0.05);
  const lightMat = makeMat(shadeHex(style.primary, 1.24), 0.56, 0.08);
  const secondaryMat = makeMat(style.secondary, 0.58, 0.04);
  const accentMat = makeMat(style.accent, 0.36, 0.25);
  const goldMat = makeMat('#FACC15', 0.24, 0.78);
  const silverMat = makeMat('#CBD5E1', 0.24, 0.82);

  let sleeveUpperMat: THREE.Material = primaryMat;
  let sleeveForearmMat: THREE.Material = primaryMat;
  let cuffMat: THREE.Material = secondaryMat;
  let isRolledSleeves = false;
  let isPufferSleeves = false;
  let isPuffedShoulders = false;
  let hasEpaulets = false;
  let epMat: THREE.Material | undefined;
  let coversLowerBody = false;

  const topR = isFemale ? 0.214 : 0.244;
  const waistR = isFemale ? 0.176 : 0.208;
  const hipR = isFemale ? 0.224 : 0.22;

  // Shared tapered smooth chibi torso (natural broader shoulders tapering cleanly to waist, zero barrel look!)
  const makeTaperedBody = (
    rBot: number,
    rMid: number,
    rTop: number,
    height: number,
    mat: THREE.Material,
    yOffset = 0,
  ) => {
    const pts = [
      new THREE.Vector2(0.01, yOffset),
      new THREE.Vector2(rBot, yOffset),
      new THREE.Vector2(rBot * 1.01, yOffset + height * 0.14),
      new THREE.Vector2(rMid, yOffset + height * 0.44),
      new THREE.Vector2(rTop, yOffset + height * 0.84),
      new THREE.Vector2(rTop * 0.93, yOffset + height * 0.95),
      new THREE.Vector2(rTop * 0.62, yOffset + height),
      new THREE.Vector2(0.01, yOffset + height),
    ];
    const geo = new THREE.LatheGeometry(pts, 18);
    geo.scale(1.06, 1, 0.8);
    return new THREE.Mesh(geo, mat);
  };

  // Helper for V-shirt front insert cleanly curved outside chest (+0.008 clearance, zero z-fighting)
  const addVShirt = (mat: THREE.Material, yTop = 0.5, yBot = 0.24, halfW = 0.11) => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, yTop);
    shape.lineTo(halfW, yTop);
    shape.lineTo(0, yBot);
    shape.closePath();
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false }),
      mat,
    );
    mesh.position.set(0, 0, topR * 0.82 - 0.006);
    torsoGroup.add(mesh);
  };

  // Helper for crisp 3D lapels
  const addLapels = (mat: THREE.Material, wide = false) => {
    const w = wide ? 0.068 : 0.048;
    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(w, 0.26, 0.036), mat);
      lapel.position.set(side * (wide ? 0.085 : 0.075), 0.37, topR * 0.82 + 0.006);
      lapel.rotation.z = side * -0.32;
      lapel.rotation.y = side * 0.22;
      torsoGroup.add(lapel);
    }
  };

  // Helper for sculpted 3D tie or bowtie
  const addBowtie = (mat: THREE.Material) => {
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, 0.485, topR * 0.82 + 0.022);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), mat);
    bowGroup.add(knot);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.072, 6), mat);
      wing.rotation.z = side * (Math.PI / 2);
      wing.scale.set(1, 1, 0.45);
      wing.position.x = side * 0.042;
      bowGroup.add(wing);
    }
    torsoGroup.add(bowGroup);
  };

  const addNecktie = (mat: THREE.Material, loose = false) => {
    const tieZ = topR * 0.82 + 0.02;
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.04, 0.028), mat);
    knot.position.set(0, loose ? 0.46 : 0.48, tieZ);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.19, 0.022), mat);
    blade.position.set(loose ? 0.015 : 0, 0.355, tieZ);
    blade.rotation.z = loose ? 0.14 : 0;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.052, 4), mat);
    tip.rotation.z = Math.PI + (loose ? 0.14 : 0);
    tip.rotation.y = Math.PI / 4;
    tip.scale.set(1, 1, 0.4);
    tip.position.set(loose ? 0.028 : 0, 0.24, tieZ);
    torsoGroup.add(knot, blade, tip);
  };

  switch (style.variant) {
    case 'tuxedo': {
      // Mockup Hero Suit: Crisp Charcoal-Black Tailored Suit + Peaked Satin Lapels + Vibrant Red Tie!
      const satinLapelMat = makeMat(shadeHex(style.primary, 1.38), 0.3, 0.22);
      torsoGroup.add(makeTaperedBody(hipR, waistR, topR, 0.52, primaryMat));
      addVShirt(secondaryMat, 0.5, 0.21, 0.11);
      addLapels(satinLapelMat, false);
      if (isFemale) {
        addBowtie(accentMat);
      } else {
        addNecktie(accentMat, false);
      }

      // Crisp crimson pocket square
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.026, 0.018), accentMat);
      pocket.position.set(0.115, 0.33, topR * 0.8 + 0.008);
      pocket.rotation.z = 0.2;
      torsoGroup.add(pocket);

      // Tailored coat hem or feminine peplum flare
      if (isFemale) {
        const peplum = new THREE.Mesh(
          new THREE.CylinderGeometry(waistR * 1.04, hipR * 1.18, 0.13, 18),
          primaryMat,
        );
        peplum.scale.set(1.06, 1, 0.8);
        peplum.position.y = 0.02;
        torsoGroup.add(peplum);
      } else {
        // Subtle tailored jacket hem split at back
        const hemBand = new THREE.Mesh(
          new THREE.CylinderGeometry(hipR * 1.02, hipR * 1.06, 0.09, 18),
          primaryMat,
        );
        hemBand.scale.set(1.06, 1, 0.8);
        hemBand.position.y = 0.02;
        torsoGroup.add(hemBand);
      }

      // Crisp suit buttons
      for (const y of [0.18, 0.1]) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), silverMat);
        btn.position.set(0, y, waistR * 0.82 + 0.015);
        torsoGroup.add(btn);
      }
      break;
    }

    case 'trench': {
      // Long knee-length flared belted Detective Trench Coat!
      const coatPoints = [
        new THREE.Vector2(0.01, -0.34),
        new THREE.Vector2(hipR * 1.38, -0.34),
        new THREE.Vector2(hipR * 1.24, -0.14),
        new THREE.Vector2(waistR * 1.02, 0.12),
        new THREE.Vector2(topR * 1.06, 0.48),
        new THREE.Vector2(topR * 0.78, 0.55),
        new THREE.Vector2(0.01, 0.55),
      ];
      const coatGeo = new THREE.LatheGeometry(coatPoints, 28);
      coatGeo.scale(1.06, 1, 0.84);
      torsoGroup.add(new THREE.Mesh(coatGeo, primaryMat));

      // Storm shoulder capelet draped over upper chest & back
      const cape = new THREE.Mesh(
        new THREE.CylinderGeometry(topR * 0.84, topR * 1.22, 0.17, 24),
        lightMat,
      );
      cape.scale.set(1.08, 1, 0.88);
      cape.position.y = 0.44;
      torsoGroup.add(cape);

      // Wide popped detective collar flaps around the neck
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.185, 0.16, 0.11, 20, 1, true, Math.PI * 0.25, Math.PI * 1.5),
        darkMat,
      );
      collar.material.side = THREE.DoubleSide;
      collar.position.y = 0.56;
      torsoGroup.add(collar);

      // Inner shirt & dark tie peeking through front V
      addVShirt(secondaryMat, 0.5, 0.26, 0.085);
      addNecktie(accentMat, false);

      // Double-breasted buttons
      for (const side of [-1, 1]) {
        for (const y of [0.27, 0.17, 0.03, -0.09]) {
          const btn = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), darkMat);
          btn.position.set(side * 0.075, y, hipR * 0.86 + (y < 0 ? 0.035 : 0.01));
          torsoGroup.add(btn);
        }
      }

      // Belted waist + brass buckle + hanging belt tail
      const belt = new THREE.Mesh(
        new THREE.CylinderGeometry(waistR * 1.08, waistR * 1.1, 0.068, 24),
        accentMat,
      );
      belt.scale.set(1.07, 1, 0.86);
      belt.position.y = 0.11;
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.035), goldMat);
      buckle.position.set(0, 0.11, waistR * 0.88 + 0.015);
      const beltTail = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.16, 0.02), accentMat);
      beltTail.position.set(-0.08, 0.02, waistR * 0.89 + 0.01);
      beltTail.rotation.z = -0.18;
      torsoGroup.add(belt, buckle, beltTail);

      cuffMat = accentMat;
      break;
    }

    case 'pinstripe': {
      const pinTex = createPinstripeTexture(style.primary, '#D8D4EB');
      primaryMat = makeMat(style.primary, 0.58, 0.06, pinTex);
      sleeveUpperMat = primaryMat;
      sleeveForearmMat = primaryMat;

      // Broad double-breasted mobster silhouette
      torsoGroup.add(makeTaperedBody(hipR * 1.06, waistR * 1.05, topR * 1.09, 0.55, primaryMat));
      addVShirt(secondaryMat, 0.51, 0.22, 0.11);
      addLapels(primaryMat, true);
      addNecktie(accentMat, false);

      // Silk crimson pocket square
      const sq = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.038, 0.024), accentMat);
      sq.position.set(0.13, 0.35, topR * 0.86 + 0.008);
      sq.rotation.z = 0.24;
      torsoGroup.add(sq);

      // Gold pocket-watch chain draped across the lower jacket
      const chainCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.01, 0.18, waistR * 0.88 + 0.015),
        new THREE.Vector3(0.08, 0.12, waistR * 0.88 + 0.022),
        new THREE.Vector3(0.17, 0.17, waistR * 0.8 + 0.015),
      ]);
      const chain = new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 12, 0.009, 6, false), goldMat);
      torsoGroup.add(chain);

      // Double-breasted gold buttons
      for (const side of [-1, 1]) {
        for (const y of [0.22, 0.12]) {
          const btn = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 8), goldMat);
          btn.position.set(side * 0.068, y, waistR * 0.87 + 0.014);
          torsoGroup.add(btn);
        }
      }
      break;
    }

    case 'hoodie': {
      // Chunky oversized streetwear hoodie with sculpted 3D back hood, kangaroo pocket & drawstrings!
      torsoGroup.add(makeTaperedBody(hipR * 1.14, waistR * 1.16, topR * 1.12, 0.54, primaryMat));

      // Ribbed bottom hem band
      const ribHem = new THREE.Mesh(
        new THREE.CylinderGeometry(hipR * 1.12, hipR * 1.04, 0.075, 24),
        darkMat,
      );
      ribHem.scale.set(1.06, 1, 0.84);
      ribHem.position.y = 0.03;
      torsoGroup.add(ribHem);

      // Chunky sculpted 3D hood resting behind the neck/shoulders
      const hoodRing = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.068, 12, 22), darkMat);
      hoodRing.rotation.x = Math.PI / 2 + 0.28;
      hoodRing.position.set(0, 0.52, -0.05);
      const hoodBack = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), primaryMat);
      hoodBack.scale.set(1.15, 0.72, 0.92);
      hoodBack.position.set(0, 0.47, -0.18);
      torsoGroup.add(hoodRing, hoodBack);

      // Front kangaroo pouch pocket
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.055), darkMat);
      pocket.position.set(0, 0.155, waistR * 0.92 + 0.01);
      torsoGroup.add(pocket);

      // Hanging white hoodie drawstrings with neon aglets
      for (const side of [-1, 1]) {
        const stringMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.011, 0.011, 0.18, 8),
          secondaryMat,
        );
        stringMesh.position.set(side * 0.055, 0.4, topR * 0.9 + 0.018);
        stringMesh.rotation.z = side * -0.08;
        const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.032, 8), accentMat);
        aglet.position.set(side * 0.062, 0.305, topR * 0.9 + 0.018);
        torsoGroup.add(stringMesh, aglet);
      }

      // Chest street graphic stripe
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.042, 0.02), accentMat);
      stripe.position.set(0, 0.31, topR * 0.91 + 0.008);
      torsoGroup.add(stripe);

      cuffMat = darkMat;
      break;
    }

    case 'biker': {
      // Cropped asymmetrical leather moto jacket with angled metallic zipper & notched lapels
      const leatherMat = makeMat(style.primary, 0.32, 0.18);
      primaryMat = leatherMat;
      sleeveUpperMat = leatherMat;
      sleeveForearmMat = leatherMat;

      // Inner crew-neck tee extending slightly below cropped jacket hem
      const tee = makeTaperedBody(hipR * 0.96, waistR * 0.94, topR * 0.94, 0.52, secondaryMat, 0.0);
      torsoGroup.add(tee);

      // Cropped leather moto shell sitting cleanly above waist
      const jacket = makeTaperedBody(
        waistR * 1.07,
        waistR * 1.05,
        topR * 1.06,
        0.45,
        leatherMat,
        0.09,
      );
      torsoGroup.add(jacket);

      // Wide notched leather lapels with silver snaps
      addLapels(makeMat('#2B2A36', 0.28, 0.25), true);
      for (const side of [-1, 1]) {
        const snap = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), silverMat);
        snap.position.set(side * 0.105, 0.43, topR * 0.86 + 0.02);
        torsoGroup.add(snap);
      }

      // Diagonal silver metallic zipper + waist belt buckle
      const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.34, 0.022), silverMat);
      zipper.position.set(0.038, 0.27, waistR * 0.86 + 0.018);
      zipper.rotation.z = -0.18;
      const motoBelt = new THREE.Mesh(
        new THREE.CylinderGeometry(waistR * 1.09, waistR * 1.09, 0.052, 24),
        leatherMat,
      );
      motoBelt.scale.set(1.07, 1, 0.85);
      motoBelt.position.y = 0.11;
      const motoBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.056, 0.032), silverMat);
      motoBuckle.position.set(0, 0.11, waistR * 0.89 + 0.014);
      torsoGroup.add(zipper, motoBelt, motoBuckle);

      hasEpaulets = true;
      epMat = silverMat;
      cuffMat = silverMat;
      break;
    }

    case 'admiral': {
      // Structured Royal Gala Admiral coat with gold shoulder epaulets, diagonal sash & mandarin collar!
      torsoGroup.add(makeTaperedBody(hipR * 1.08, waistR * 1.02, topR * 1.06, 0.54, primaryMat));

      // Standing mandarin royal collar with gold trim
      const mandarin = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.17, 0.095, 20), primaryMat);
      mandarin.position.y = 0.56;
      const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.156, 0.012, 8, 22), goldMat);
      collarTrim.rotation.x = Math.PI / 2;
      collarTrim.position.y = 0.602;
      torsoGroup.add(mandarin, collarTrim);

      // Diagonal ceremonial gold-trimmed crimson sash
      const sashMat = makeMat('#D92648', 0.42, 0.18);
      const sash = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.54, 0.042), sashMat);
      sash.position.set(0, 0.3, topR * 0.84 + 0.012);
      sash.rotation.z = 0.62;
      const medal = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), goldMat);
      medal.position.set(-0.11, 0.38, topR * 0.84 + 0.032);
      torsoGroup.add(sash, medal);

      // Double-breasted brass buttons & ceremonial gold belt
      for (const side of [-1, 1]) {
        for (const y of [0.38, 0.28, 0.18]) {
          const btn = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 8), goldMat);
          btn.position.set(side * 0.068, y, topR * 0.85 + 0.012);
          torsoGroup.add(btn);
        }
      }
      const galaBelt = new THREE.Mesh(
        new THREE.CylinderGeometry(waistR * 1.06, waistR * 1.06, 0.058, 24),
        goldMat,
      );
      galaBelt.scale.set(1.07, 1, 0.85);
      galaBelt.position.y = 0.08;
      torsoGroup.add(galaBelt);

      hasEpaulets = true;
      epMat = goldMat;
      cuffMat = goldMat;
      break;
    }

    case 'vest': {
      // Sleeveless Detective Waistcoat over crisp white dress shirt with rolled-up forearms & loosened tie!
      // White dress shirt base
      torsoGroup.add(makeTaperedBody(hipR * 0.96, waistR * 0.94, topR * 0.98, 0.54, secondaryMat));
      // Fitted buttoned waistcoat shell over torso
      const waistcoat = makeTaperedBody(hipR * 1.04, waistR * 1.03, topR * 1.03, 0.46, primaryMat, 0.03);
      torsoGroup.add(waistcoat);

      addVShirt(secondaryMat, 0.52, 0.25, 0.11);
      addNecktie(accentMat, true);

      // Waistcoat buttons & pocket flaps
      for (const y of [0.22, 0.14, 0.06]) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), goldMat);
        btn.position.set(0, y, waistR * 0.86 + 0.016);
        torsoGroup.add(btn);
      }
      for (const side of [-1, 1]) {
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.02), darkMat);
        pocket.position.set(side * 0.11, 0.14, waistR * 0.85 + 0.012);
        torsoGroup.add(pocket);
      }

      sleeveUpperMat = secondaryMat;
      sleeveForearmMat = skinMat; // rolled-up shirt forearms showing skin!
      cuffMat = secondaryMat;
      isRolledSleeves = true;
      break;
    }

    case 'puffer': {
      // Cozy Puffer Jacket: 4 stacked glossy quilted horizontal puffer rings + high zip collar!
      const pufferMat = makeMat(style.primary, 0.36, 0.12);
      primaryMat = pufferMat;
      sleeveUpperMat = pufferMat;
      sleeveForearmMat = pufferMat;

      // Inner solid core so zero gaps show between quilted rings
      torsoGroup.add(makeTaperedBody(hipR * 0.96, waistR * 0.98, topR * 0.96, 0.52, darkMat));

      // 4 plump quilted horizontal rings
      const ringSpecs = [
        { y: 0.09, r: hipR * 1.02, tube: 0.072 },
        { y: 0.21, r: waistR * 1.04, tube: 0.076 },
        { y: 0.33, r: topR * 1.02, tube: 0.078 },
        { y: 0.45, r: topR * 0.92, tube: 0.074 },
      ];
      for (const spec of ringSpecs) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(spec.r, spec.tube, 12, 26), pufferMat);
        ring.rotation.x = Math.PI / 2;
        ring.scale.set(1.06, 0.84, 1);
        ring.position.y = spec.y;
        torsoGroup.add(ring);
      }

      // Chunky high stand-up zip collar + bright front zipper
      const highCollar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.062, 12, 22), secondaryMat);
      highCollar.rotation.x = Math.PI / 2;
      highCollar.position.y = 0.54;
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.48, 0.03), accentMat);
      zip.position.set(0, 0.28, topR * 0.95 + 0.03);
      torsoGroup.add(highCollar, zip);

      isPufferSleeves = true;
      cuffMat = secondaryMat;
      break;
    }

    case 'velvet': {
      // Plush Crimson Velvet Smoking Jacket (Male) OR Stylized Flared Evening Gown (Female)!
      const velvetMat = makeMat(style.primary, 0.78, 0.02);
      const satinTrim = makeMat(shadeHex(style.primary, 0.58), 0.28, 0.2);
      primaryMat = velvetMat;
      sleeveUpperMat = velvetMat;
      sleeveForearmMat = velvetMat;

      if (isFemale) {
        // Flared evening gown extending smoothly down to calves + gold waist belt + puffed sleeves!
        const gownPts = [
          new THREE.Vector2(0.01, -0.4),
          new THREE.Vector2(hipR * 1.56, -0.4),
          new THREE.Vector2(hipR * 1.38, -0.18),
          new THREE.Vector2(waistR * 0.96, 0.14),
          new THREE.Vector2(topR * 1.0, 0.46),
          new THREE.Vector2(topR * 0.72, 0.54),
          new THREE.Vector2(0.01, 0.54),
        ];
        const gownGeo = new THREE.LatheGeometry(gownPts, 30);
        gownGeo.scale(1.06, 1, 0.88);
        torsoGroup.add(new THREE.Mesh(gownGeo, velvetMat));

        // Sweetheart neckline accent & golden waist belt with gem
        const belt = new THREE.Mesh(new THREE.TorusGeometry(waistR * 1.0, 0.026, 10, 26), goldMat);
        belt.rotation.x = Math.PI / 2;
        belt.scale.set(1.06, 0.88, 1);
        belt.position.y = 0.14;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), goldMat);
        gem.position.set(0, 0.14, waistR * 0.9 + 0.015);
        torsoGroup.add(belt, gem);

        isPuffedShoulders = true;
        coversLowerBody = true;
        cuffMat = goldMat;
      } else {
        // Male Plush Shawl-Collar Velvet Smoking Jacket + silk gold waist sash
        torsoGroup.add(makeTaperedBody(hipR * 1.06, waistR * 1.04, topR * 1.05, 0.54, velvetMat));
        addVShirt(secondaryMat, 0.5, 0.24, 0.11);
        // Rounded plush shawl collar
        const shawl = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.044, 10, 22), satinTrim);
        shawl.rotation.x = Math.PI / 2 + 0.4;
        shawl.position.set(0, 0.48, 0.04);
        torsoGroup.add(shawl);
        addBowtie(satinTrim);

        // Silk waist sash with hanging gold tassels
        const sash = new THREE.Mesh(
          new THREE.CylinderGeometry(waistR * 1.08, waistR * 1.09, 0.068, 24),
          accentMat,
        );
        sash.scale.set(1.07, 1, 0.85);
        sash.position.y = 0.09;
        for (const side of [-1, 1]) {
          const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.16, 10), accentMat);
          tassel.position.set(side * 0.05, -0.02, waistR * 0.89 + 0.012);
          tassel.rotation.z = side * -0.14;
          torsoGroup.add(tassel);
        }
        torsoGroup.add(sash);
        cuffMat = satinTrim;
      }
      break;
    }

    case 'varsity':
    default: {
      // Rounded Athletic Varsity Bomber Jacket with contrasting cream sleeves, striped bands & chest emblem!
      torsoGroup.add(makeTaperedBody(hipR * 1.06, waistR * 1.12, topR * 1.08, 0.53, primaryMat));

      // Striped ribbed collar & bottom waist hem
      const neckRib = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.032, 10, 22), darkMat);
      neckRib.rotation.x = Math.PI / 2;
      neckRib.position.y = 0.525;
      const neckStripe = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.011, 8, 22), accentMat);
      neckStripe.rotation.x = Math.PI / 2;
      neckStripe.position.y = 0.532;

      const hemRib = new THREE.Mesh(
        new THREE.CylinderGeometry(hipR * 1.08, hipR * 1.0, 0.07, 24),
        darkMat,
      );
      hemRib.scale.set(1.07, 1, 0.84);
      hemRib.position.y = 0.035;
      const hemStripe = new THREE.Mesh(new THREE.TorusGeometry(hipR * 1.06, 0.011, 8, 24), accentMat);
      hemStripe.rotation.x = Math.PI / 2;
      hemStripe.scale.set(1.07, 0.84, 1);
      hemStripe.position.y = 0.04;
      torsoGroup.add(neckRib, neckStripe, hemRib, hemStripe);

      // Center snap buttons
      for (const y of [0.43, 0.34, 0.25, 0.16]) {
        const snap = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), secondaryMat);
        snap.position.set(0, y, topR * 0.88 + 0.012);
        torsoGroup.add(snap);
      }

      // Bold golden varsity chest emblem badge (M / Diamond)
      const patch = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.088, 0.024), accentMat);
      patch.position.set(0.115, 0.36, topR * 0.85 + 0.012);
      patch.rotation.z = Math.PI / 4;
      torsoGroup.add(patch);

      // Contrasting cream sleeves!
      sleeveUpperMat = secondaryMat;
      sleeveForearmMat = secondaryMat;
      cuffMat = darkMat;
      break;
    }
  }

  return {
    torsoGroup,
    sleeveUpperMat,
    sleeveForearmMat,
    cuffMat,
    isRolledSleeves,
    isPufferSleeves,
    isPuffedShoulders,
    hasEpaulets,
    epauletMat: epMat,
    coversLowerBody,
  };
}

/**
 * Builds 10 distinct Lower-Body Pants / Skirts + matching distinct Shoe styles
 * planted firmly at y = 0 (standing) or comfortably bent at hip level (seated).
 */
export function buildPantsAndShoesMesh(
  gender: Gender,
  pantsId: number,
  skinColor: string,
  pose: 'standing' | 'seated',
  coveredByLongGown: boolean,
): THREE.Group {
  const style: WardrobeItemStyle = PANTS_CATALOG[gender][pantsId % 10];
  const isFemale = gender === 'female';
  const group = new THREE.Group();

  const skinMat = makeMat(skinColor, 0.64, 0.02);
  let mainMat = makeMat(style.primary, 0.64, 0.04);
  const secMat = makeMat(style.secondary, 0.6, 0.05);
  const accentMat = makeMat(style.accent, 0.4, 0.22);
  const whiteMat = makeMat('#F8FAFC', 0.52, 0.04);
  const darkShoeMat = makeMat('#181624', 0.34, 0.14);
  const bootMat = makeMat('#4A2C1D', 0.46, 0.1);

  if (style.variant === 'pinstripe' || style.variant === 'pinstripe_mini') {
    mainMat = makeMat(style.primary, 0.6, 0.05, createPinstripeTexture(style.primary, '#D8D4EB'));
  } else if (style.variant === 'jeans') {
    mainMat = makeMat(style.primary, 0.7, 0.03, createDenimTexture(style.primary, style.accent));
  } else if (style.variant === 'plaid') {
    mainMat = makeMat(
      style.primary,
      0.66,
      0.03,
      createPlaidTexture(style.primary, style.secondary, style.accent),
    );
  }

  // Determine shoe style per variant
  const shoeType: 'loafer' | 'sneaker' | 'boot' | 'heel' = (() => {
    if (style.variant === 'jeans' || style.variant === 'joggers' || style.variant === 'shorts') {
      return 'sneaker';
    }
    if (
      style.variant === 'cargo' ||
      style.variant === 'suspenders' ||
      style.variant === 'flared_mini'
    ) {
      return 'boot';
    }
    if (
      isFemale &&
      (style.variant === 'pinstripe_mini' ||
        style.variant === 'wide_belted' ||
        style.variant === 'gala_ruffled')
    ) {
      return 'heel';
    }
    return 'loafer';
  })();

  const buildShoe = (x: number, y: number, z: number) => {
    const shoe = new THREE.Group();
    shoe.position.set(x, y, z);

    if (shoeType === 'sneaker') {
      // Chunky cartoon white-soled sneakers with colored upper
      const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.104, 0.042, 14), whiteMat);
      sole.scale.set(0.95, 1, 1.44);
      sole.position.set(0, 0.021, 0.036);
      const upper = new THREE.Mesh(
        new THREE.SphereGeometry(0.094, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
        secMat,
      );
      upper.scale.set(0.92, 0.88, 1.38);
      upper.position.set(0, 0.036, 0.036);
      const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 8), whiteMat);
      toeCap.scale.set(1.05, 0.72, 0.9);
      toeCap.position.set(0, 0.05, 0.112);
      shoe.add(sole, upper, toeCap);
    } else if (shoeType === 'boot') {
      // Rugged chunky cartoon ankle boots
      const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.108, 0.05, 14), darkShoeMat);
      sole.scale.set(0.96, 1, 1.44);
      sole.position.set(0, 0.025, 0.036);
      const vamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.096, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        bootMat,
      );
      vamp.scale.set(0.95, 0.9, 1.38);
      vamp.position.set(0, 0.04, 0.036);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.09, 0.135, 14), bootMat);
      shaft.position.set(0, 0.118, 0.0);
      shoe.add(sole, vamp, shaft);
    } else if (shoeType === 'heel') {
      // Stylized cute Mary-Jane / dress heels
      const base = new THREE.Mesh(
        new THREE.SphereGeometry(0.088, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
        darkShoeMat,
      );
      base.scale.set(0.88, 0.76, 1.36);
      base.position.set(0, 0.042, 0.038);
      const heelBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.05, 10), darkShoeMat);
      heelBlock.position.set(0, 0.025, -0.055);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 8, 14), accentMat);
      strap.rotation.x = Math.PI / 2;
      strap.position.set(0, 0.092, 0.01);
      shoe.add(base, heelBlock, strap);
    } else {
      // Crisp chunky stylized dress shoes / white-trimmed cartoon sneakers (matches mockup!)
      const isMockupDefault = !isFemale && style.variant === 'slacks';
      const sole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.096, 0.104, 0.04, 14),
        isMockupDefault ? whiteMat : darkShoeMat,
      );
      sole.scale.set(0.95, 1, 1.44);
      sole.position.set(0, 0.02, 0.038);
      const upper = new THREE.Mesh(
        new THREE.SphereGeometry(0.094, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
        isMockupDefault ? whiteMat : darkShoeMat,
      );
      upper.scale.set(0.93, 0.84, 1.4);
      upper.position.set(0, 0.034, 0.038);
      const accent = new THREE.Mesh(
        new THREE.BoxGeometry(0.056, 0.018, 0.022),
        isMockupDefault ? darkShoeMat : accentMat,
      );
      accent.position.set(0, 0.092, 0.088);
      shoe.add(sole, upper, accent);
    }
    return shoe;
  };

  const isSkirt =
    isFemale &&
    (style.variant === 'pleated_midi' ||
      style.variant === 'pinstripe_mini' ||
      style.variant === 'ruffled_skirt' ||
      style.variant === 'flared_mini' ||
      style.variant === 'suspenders_skirt' ||
      style.variant === 'gala_ruffled');

  const isWide = style.variant === 'wide_belted' || style.variant === 'culottes' || style.variant === 'cargo';
  const isShorts = style.variant === 'shorts';

  // Pelvis / Waist base
  if (!coveredByLongGown) {
    const pelvis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.225, isSkirt ? 0.24 : 0.22, 0.15, 22),
      mainMat,
    );
    pelvis.scale.set(1.06, 1, 0.82);
    pelvis.position.y = 0.56;
    group.add(pelvis);

    // Optional stylish belt for belted/jeans/slacks
    if (style.variant === 'wide_belted' || style.variant === 'jeans') {
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.242, 0.242, 0.05, 24), accentMat);
      belt.scale.set(1.06, 1, 0.84);
      belt.position.y = 0.625;
      group.add(belt);
    }

    // Optional 3D Suspenders straps arching cleanly over the chest/back!
    if (style.variant === 'suspenders' || style.variant === 'suspenders_skirt') {
      for (const side of [-1, 1]) {
        const frontStrap = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.48, 0.024), accentMat);
        frontStrap.position.set(side * 0.115, 0.88, 0.215);
        const backStrap = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.48, 0.024), accentMat);
        backStrap.position.set(side * 0.115, 0.88, -0.205);
        const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.026, 0.43), accentMat);
        topStrap.position.set(side * 0.115, 1.12, 0.005);
        group.add(frontStrap, backStrap, topStrap);
      }
    }
  }

  // Build Female Skirts
  if (isSkirt && !coveredByLongGown) {
    const isMini = style.variant === 'pinstripe_mini' || style.variant === 'flared_mini';
    const isRuffled = style.variant === 'ruffled_skirt' || style.variant === 'gala_ruffled';
    const skirtLen = isMini ? 0.24 : 0.34;
    const botR = isMini ? 0.34 : 0.37;

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.225, botR, skirtLen, 26),
      mainMat,
    );
    skirt.scale.set(1.06, 1, 0.88);
    skirt.position.set(0, 0.6 - skirtLen / 2, pose === 'seated' ? 0.06 : 0);
    group.add(skirt);

    // 3D pleats or multi-tier ruffles
    if (isRuffled) {
      const tier2 = new THREE.Mesh(
        new THREE.CylinderGeometry(botR * 0.86, botR * 1.12, 0.12, 26),
        secMat,
      );
      tier2.scale.set(1.06, 1, 0.88);
      tier2.position.set(0, 0.6 - skirtLen - 0.03, pose === 'seated' ? 0.08 : 0);
      group.add(tier2);
    } else {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const pleat = new THREE.Mesh(new THREE.BoxGeometry(0.024, skirtLen * 0.96, 0.032), secMat);
        pleat.position.set(
          Math.sin(angle) * (botR * 0.84),
          0.6 - skirtLen / 2,
          Math.cos(angle) * (botR * 0.72) + (pose === 'seated' ? 0.06 : 0),
        );
        pleat.rotation.y = angle;
        group.add(pleat);
      }
    }
  }

  // Legs + Pants Details + Shoes
  const legX = isFemale ? 0.115 : 0.132;
  const legTopR = isWide ? 0.118 : isSkirt ? 0.072 : 0.096;
  const legBotR = isWide ? 0.116 : style.variant === 'joggers' ? 0.072 : isSkirt ? 0.062 : 0.086;

  for (const side of [-1, 1]) {
    if (pose === 'standing') {
      if (isSkirt || coveredByLongGown) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.44, 14), skinMat);
        leg.position.set(side * legX, 0.28, 0);
        group.add(leg);
      } else if (isShorts) {
        // Formal shorts + visible lower calf + white sock cuff
        const shortTube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.106, 0.102, 0.24, 16),
          mainMat,
        );
        shortTube.position.set(side * legX, 0.44, 0);
        const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.058, 0.26, 14), skinMat);
        calf.position.set(side * legX, 0.22, 0);
        const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.062, 0.09, 14), whiteMat);
        sock.position.set(side * legX, 0.12, 0);
        group.add(shortTube, calf, sock);
      } else {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(legTopR, legBotR, 0.46, 16), mainMat);
        leg.position.set(side * legX, 0.31, 0);
        group.add(leg);

        // Distinct 3D Pants Details!
        if (style.variant === 'cargo') {
          // Chunky 3D side thigh cargo pockets
          const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.11), secMat);
          pocket.position.set(side * (legX + legTopR * 0.92), 0.38, 0.01);
          const flap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.032, 0.114), accentMat);
          flap.position.set(side * (legX + legTopR * 0.92), 0.44, 0.01);
          group.add(pocket, flap);
        } else if (style.variant === 'jeans') {
          // Rolled lighter denim folded cuff at ankle (strictly larger radius -> zero z-fighting!)
          const cuff = new THREE.Mesh(
            new THREE.CylinderGeometry(legBotR + 0.014, legBotR + 0.012, 0.075, 16),
            secMat,
          );
          cuff.position.set(side * legX, 0.12, 0);
          group.add(cuff);
        } else if (style.variant === 'joggers') {
          // Neon athletic side stripe + snug ribbed ankle cuff
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.42, 0.026), accentMat);
          stripe.position.set(side * (legX + legTopR * 0.92), 0.32, 0);
          const ankle = new THREE.Mesh(
            new THREE.CylinderGeometry(legBotR + 0.012, legBotR + 0.008, 0.06, 16),
            secMat,
          );
          ankle.position.set(side * legX, 0.11, 0);
          group.add(stripe, ankle);
        } else if (style.variant === 'gala') {
          const goldStripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.43, 0.022), accentMat);
          goldStripe.position.set(side * (legX + legTopR * 0.94), 0.31, 0);
          group.add(goldStripe);
        }
      }

      group.add(buildShoe(side * legX, 0, 0));
    } else {
      // Seated pose around the 3D table
      const thighMat = isSkirt || coveredByLongGown ? skinMat : mainMat;
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.2, 6, 12), thighMat);
      thigh.rotation.x = Math.PI / 2;
      thigh.position.set(side * legX, 0.52, 0.19);
      const shinMat = isSkirt || isShorts || coveredByLongGown ? skinMat : mainMat;
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 6, 12), shinMat);
      shin.position.set(side * legX, 0.28, 0.31);
      group.add(thigh, shin);
      group.add(buildShoe(side * legX, 0.06, 0.31));
    }
  }

  return group;
}
