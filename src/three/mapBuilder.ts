import * as THREE from 'three';
import { MAP_THEMES } from '../shared/catalog';
import { MapId } from '../shared/types';
import { createContactShadowDisc } from './utils';

export interface BuiltMapResult {
  group: THREE.Group;
  seatTransforms: Array<{ position: THREE.Vector3; rotationY: number }>;
  update: (elapsed: number) => void;
}

export const TABLE_RADIUS = 2.55;
export const SEAT_RADIUS = 4.15;

interface ChairSharedAssets {
  fabricMat: THREE.MeshStandardMaterial;
  cushionMat: THREE.MeshStandardMaterial;
  woodMat: THREE.MeshStandardMaterial;
  seatGeo: THREE.BoxGeometry;
  cushionGeo: THREE.BoxGeometry;
  backGeo: THREE.BoxGeometry;
  backCapGeo: THREE.CylinderGeometry;
  armGeo: THREE.BoxGeometry;
  legGeo: THREE.CylinderGeometry;
}

function createChairSharedAssets(
  primaryHex: string,
  woodHex: string,
  cushionHex: string,
): ChairSharedAssets {
  return {
    fabricMat: new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.78, metalness: 0.04 }),
    cushionMat: new THREE.MeshStandardMaterial({ color: cushionHex, roughness: 0.82, metalness: 0.02 }),
    woodMat: new THREE.MeshStandardMaterial({ color: woodHex, roughness: 0.45, metalness: 0.1 }),
    seatGeo: new THREE.BoxGeometry(1.15, 0.24, 1.05),
    cushionGeo: new THREE.BoxGeometry(0.92, 0.14, 0.88),
    backGeo: new THREE.BoxGeometry(1.12, 1.08, 0.24),
    backCapGeo: new THREE.CylinderGeometry(0.13, 0.13, 1.12, 10),
    armGeo: new THREE.BoxGeometry(0.22, 0.46, 0.95),
    legGeo: new THREE.CylinderGeometry(0.055, 0.04, 0.26, 8),
  };
}

function createArmchair(assets: ChairSharedAssets): THREE.Group {
  const chair = new THREE.Group();

  // Seat base
  const seat = new THREE.Mesh(assets.seatGeo, assets.fabricMat);
  seat.position.set(0, 0.36, 0);
  // Plush cushion
  const cushion = new THREE.Mesh(assets.cushionGeo, assets.cushionMat);
  cushion.position.set(0, 0.51, 0.04);
  // High plush backrest
  const back = new THREE.Mesh(assets.backGeo, assets.fabricMat);
  back.position.set(0, 0.94, -0.44);
  const backCap = new THREE.Mesh(assets.backCapGeo, assets.fabricMat);
  backCap.rotation.z = Math.PI / 2;
  backCap.position.set(0, 1.48, -0.44);

  // Armrests
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(assets.armGeo, assets.fabricMat);
    arm.position.set(side * 0.54, 0.62, -0.02);
    chair.add(arm);
  }

  // 4 grounded wood legs
  for (const sx of [-0.46, 0.46]) {
    for (const sz of [-0.42, 0.42]) {
      const leg = new THREE.Mesh(assets.legGeo, assets.woodMat);
      leg.position.set(sx, 0.13, sz);
      chair.add(leg);
    }
  }

  // Contact shadow disc grounded at y = 0.015
  const shadow = createContactShadowDisc(0.95, 0.65);
  shadow.position.y = 0.015;

  chair.add(seat, cushion, back, backCap, shadow);
  return chair;
}

function buildCentralTable(mapId: MapId): THREE.Group {
  const table = new THREE.Group();

  const topHex = mapId === 'office' ? '#4C2818' : mapId === 'beach' ? '#7E5233' : '#2C2054';
  const feltHex = mapId === 'office' ? '#174C38' : mapId === 'beach' ? '#1D5E70' : '#3B2378';
  const rimHex = mapId === 'beach' ? '#D99B52' : '#EAB308';

  const woodMat = new THREE.MeshStandardMaterial({ color: topHex, roughness: 0.42, metalness: 0.14 });
  const feltMat = new THREE.MeshStandardMaterial({ color: feltHex, roughness: 0.85, metalness: 0.02 });
  const goldMat = new THREE.MeshStandardMaterial({ color: rimHex, roughness: 0.26, metalness: 0.72 });

  // Heavy central pedestal
  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.38, 0.18, 20), woodMat);
  baseDisc.position.y = 0.09;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 0.74, 16), woodMat);
  pillar.position.y = 0.54;
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS * 0.96, 0.2, 24),
    woodMat,
  );
  tableTop.position.y = 0.95;

  // Inner velvet/felt surface offset cleanly above tabletop (no z-fighting)
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS - 0.22, TABLE_RADIUS - 0.22, 0.04, 24),
    feltMat,
  );
  felt.position.y = 1.06;

  // Decorative gold ring inlay
  const goldRing = new THREE.Mesh(new THREE.TorusGeometry(TABLE_RADIUS - 0.2, 0.04, 8, 28), goldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 1.07;

  // Center MafiaCards deck stack + lantern candle
  const cardMat = new THREE.MeshStandardMaterial({ color: '#F8F7FF', roughness: 0.5 });
  const cardBackMat = new THREE.MeshStandardMaterial({ color: '#FF3B5C', roughness: 0.4, metalness: 0.2 });
  for (let i = 0; i < 5; i++) {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.46), i === 4 ? cardBackMat : cardMat);
    card.position.set(-0.35 + i * 0.012, 1.09 + i * 0.022, 0.12);
    card.rotation.y = 0.2 + i * 0.06;
    table.add(card);
  }

  // Warm centerpiece lamp/candle
  const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 16), goldMat);
  lanternBase.position.set(0.22, 1.14, -0.08);
  const lanternGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.32, 14),
    new THREE.MeshStandardMaterial({
      color: '#FDE68A',
      emissive: '#F59E0B',
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
  );
  lanternGlow.position.set(0.22, 1.36, -0.08);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 16), goldMat);
  lanternCap.position.set(0.22, 1.58, -0.08);

  const shadow = createContactShadowDisc(TABLE_RADIUS + 0.35, 0.55);
  shadow.position.y = 0.015;

  table.add(baseDisc, pillar, tableTop, felt, goldRing, lanternBase, lanternGlow, lanternCap, shadow);
  return table;
}

function buildCityEnvironment(group: THREE.Group): (elapsed: number) => void {
  // Rooftop courtyard floor
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(13, 13.5, 0.6, 24),
    new THREE.MeshStandardMaterial({ color: '#241B44', roughness: 0.82, metalness: 0.08 }),
  );
  floor.position.y = -0.3;
  group.add(floor);

  // Decorative inner stone terrace ring
  const innerFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 6.9, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: '#2F2359', roughness: 0.75 }),
  );
  innerFloor.position.y = 0.0;
  group.add(innerFloor);

  // Low perimeter stone balustrade pillars + warm streetlamps
  const parapetMat = new THREE.MeshStandardMaterial({ color: '#392A68', roughness: 0.72 });
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1B1630', roughness: 0.38, metalness: 0.65 });
  const globeMat = new THREE.MeshStandardMaterial({
    color: '#FEF3C7',
    emissive: '#FBBF24',
    emissiveIntensity: 1.8,
    roughness: 0.15,
  });

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.2;
    const r = 9.4;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.85), parapetMat);
    pillar.position.set(x, 0.6, z);
    group.add(pillar);

    if (i % 2 === 0) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.6, 8), poleMat);
      pole.position.set(x, 2.8, z);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), globeMat);
      globe.position.set(x, 4.7, z);
      group.add(pole, globe);
    }
  }

  // Stylized cartoon city skyline ring with glowing warm windows
  const buildingColors = ['#1D153B', '#251B4D', '#191333', '#2D1E5A'];
  const winMat = new THREE.MeshStandardMaterial({
    color: '#FDE68A',
    emissive: '#F59E0B',
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: '#FF6B84',
    emissive: '#FF3B5C',
    emissiveIntensity: 1.3,
  });

  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const dist = 16 + (i % 3) * 3.5;
    const h = 7 + ((i * 7) % 11);
    const w = 2.6 + (i % 3) * 0.9;
    const bMat = new THREE.MeshStandardMaterial({
      color: buildingColors[i % buildingColors.length],
      roughness: 0.82,
    });
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), bMat);
    bldg.position.set(Math.cos(angle) * dist, h / 2 - 2.2, Math.sin(angle) * dist);
    bldg.lookAt(0, bldg.position.y, 0);
    group.add(bldg);

    // Add 3 glowing window strips facing the table
    for (let row = 0; row < 3; row++) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.68, 0.36, 0.12),
        row === 0 && i % 4 === 0 ? neonMat : winMat,
      );
      strip.position.set(0, h * 0.28 - row * 1.4, w / 2 + 0.04);
      bldg.add(strip);
    }
  }

  return () => {};
}

function buildOfficeEnvironment(group: THREE.Group): (elapsed: number) => void {
  // Polished dark wood parquet floor
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(11.5, 11.5, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: '#382015', roughness: 0.55, metalness: 0.08 }),
  );
  floor.position.y = -0.2;
  group.add(floor);

  // Plush crimson-and-gold circular Persian rug offset cleanly at y = 0.02
  const rug = new THREE.Mesh(
    new THREE.CylinderGeometry(6.3, 6.3, 0.04, 36),
    new THREE.MeshStandardMaterial({ color: '#6E1D30', roughness: 0.92 }),
  );
  rug.position.y = 0.01;
  const rugTrim = new THREE.Mesh(
    new THREE.RingGeometry(5.65, 6.0, 36),
    new THREE.MeshStandardMaterial({ color: '#D99B38', roughness: 0.6, side: THREE.DoubleSide }),
  );
  rugTrim.rotation.x = -Math.PI / 2;
  rugTrim.position.y = 0.036;
  group.add(rug, rugTrim);

  // Circular wood-paneled Mafia boardroom wall segments + bookshelves + banker lamps
  const wallMat = new THREE.MeshStandardMaterial({ color: '#2B1814', roughness: 0.72 });
  const shelfWood = new THREE.MeshStandardMaterial({ color: '#4B2A1B', roughness: 0.58 });
  const bookColors = ['#B91C1C', '#1D4ED8', '#15803D', '#D97706', '#6D28D9'];
  const windowGlow = new THREE.MeshStandardMaterial({
    color: '#3B2870',
    emissive: '#2B1F54',
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const panelCount = 12;
  for (let i = 0; i < panelCount; i++) {
    const angle = (i / panelCount) * Math.PI * 2;
    const r = 10.6;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 7.2, 0.45), wallMat);
    wall.position.set(Math.cos(angle) * r, 3.6, Math.sin(angle) * r);
    wall.lookAt(0, 3.6, 0);
    group.add(wall);

    if (i % 2 === 0) {
      // Bookshelf flush against wall
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.2, 0.55), shelfWood);
      shelf.position.set(0, -1.4, 0.42);
      wall.add(shelf);
      for (let row = 0; row < 4; row++) {
        const bookRow = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.42, 0.38),
          new THREE.MeshStandardMaterial({
            color: bookColors[(i + row) % bookColors.length],
            roughness: 0.78,
          }),
        );
        bookRow.position.set(0, -1.2 + row * 0.85, 0.18);
        shelf.add(bookRow);
      }
    } else {
      // Tall evening skyline window frame
      const pane = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.8, 0.14), windowGlow);
      pane.position.set(0, 0.2, 0.24);
      wall.add(pane);
    }
  }

  return () => {};
}

function buildBeachEnvironment(group: THREE.Group): (elapsed: number) => void {
  // Endless twilight ocean water plane
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#16466B',
    emissive: '#0B243D',
    emissiveIntensity: 0.35,
    roughness: 0.22,
    metalness: 0.45,
  });
  const ocean = new THREE.Mesh(new THREE.CylinderGeometry(36, 36, 0.2, 32), waterMat);
  ocean.position.y = -0.65;
  group.add(ocean);

  // Sand island + circular wooden boardwalk deck
  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(11.5, 13.8, 0.6, 28),
    new THREE.MeshStandardMaterial({ color: '#D4A56A', roughness: 0.92 }),
  );
  sand.position.y = -0.35;
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.4, 0.22, 28),
    new THREE.MeshStandardMaterial({ color: '#7D5132', roughness: 0.78 }),
  );
  deck.position.y = -0.06;
  group.add(sand, deck);

  // Palm trees & flickering tiki torches
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6E482A', roughness: 0.85 });
  const frondMat = new THREE.MeshStandardMaterial({ color: '#1F7A4D', roughness: 0.7 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: '#FDE047',
    emissive: '#F97316',
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  const flames: THREE.Mesh[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.3;
    const r = 9.4;
    const palm = new THREE.Group();
    palm.position.set(Math.cos(angle) * r, -0.05, Math.sin(angle) * r);
    palm.lookAt(0, 0, 0);

    for (let s = 0; s < 5; s++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24 - s * 0.025, 0.28 - s * 0.025, 0.95, 8),
        trunkMat,
      );
      seg.position.set(0, 0.45 + s * 0.86, s * 0.14);
      seg.rotation.x = 0.12;
      palm.add(seg);
    }

    const crownY = 4.6;
    const crownZ = 0.65;
    for (let f = 0; f < 6; f++) {
      const fAngle = (f / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 5), frondMat);
      frond.position.set(
        Math.cos(fAngle) * 0.95,
        crownY - 0.15,
        crownZ + Math.sin(fAngle) * 0.95,
      );
      frond.rotation.z = -Math.cos(fAngle) * 1.15;
      frond.rotation.x = Math.sin(fAngle) * 1.15;
      palm.add(frond);
    }
    group.add(palm);

    // Tiki torch between palms
    const tAngle = angle + Math.PI / 6;
    const tx = Math.cos(tAngle) * 7.6;
    const tz = Math.sin(tAngle) * 7.6;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.1, 8), trunkMat);
    post.position.set(tx, 1.0, tz);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.11, 0.3, 8), trunkMat);
    cup.position.set(tx, 2.15, tz);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 8), flameMat);
    flame.position.set(tx, 2.48, tz);
    flames.push(flame);
    group.add(post, cup, flame);
  }

  return (elapsed: number) => {
    ocean.position.y = -0.65 + Math.sin(elapsed * 1.3) * 0.05;
    for (let i = 0; i < flames.length; i++) {
      const pulse = 1 + Math.sin(elapsed * 8 + i * 1.7) * 0.14;
      flames[i].scale.set(1, pulse, 1);
    }
  };
}

export function buildMapScene(
  scene: THREE.Scene,
  mapId: MapId,
  seatCount: number,
): BuiltMapResult {
  const theme = MAP_THEMES[mapId];
  scene.background = new THREE.Color(theme.skyHex);
  scene.fog = new THREE.FogExp2(theme.fogHex, mapId === 'office' ? 0.022 : 0.026);

  const group = new THREE.Group();

  // Warm/Cool studio lighting rig
  const hemi = new THREE.HemisphereLight('#C4B5FD', '#2A1B47', 1.15);
  group.add(hemi);

  const keyLight = new THREE.DirectionalLight(
    mapId === 'beach' ? '#FFD4A3' : '#FFE4B5',
    1.55,
  );
  keyLight.position.set(8, 14, 9);
  group.add(keyLight);

  const rimLight = new THREE.DirectionalLight('#60A5FA', 0.72);
  rimLight.position.set(-10, 9, -8);
  group.add(rimLight);

  const tableLampLight = new THREE.PointLight('#FBBF24', 2.4, 14, 1.4);
  tableLampLight.position.set(0, 2.4, 0);
  group.add(tableLampLight);

  // Central circular table
  group.add(buildCentralTable(mapId));

  // Plush radial armchairs (up to 10)
  const count = Math.max(4, Math.min(10, seatCount));
  const seatTransforms: Array<{ position: THREE.Vector3; rotationY: number }> = [];

  const chairPrimary = mapId === 'office' ? '#5E1B2B' : mapId === 'beach' ? '#1E5B70' : '#3C2875';
  const chairCushion = mapId === 'office' ? '#7D2439' : mapId === 'beach' ? '#2A7A94' : '#533899';
  const chairWood = mapId === 'beach' ? '#8C5E39' : '#2E1A16';
  const sharedChairAssets = createChairSharedAssets(chairPrimary, chairWood, chairCushion);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.sin(angle) * SEAT_RADIUS;
    const z = Math.cos(angle) * SEAT_RADIUS;
    const rotationY = angle + Math.PI; // face table center

    const chair = createArmchair(sharedChairAssets);
    chair.position.set(x, 0, z);
    chair.rotation.y = rotationY;
    group.add(chair);

    seatTransforms.push({
      position: new THREE.Vector3(x, 0.14, z),
      rotationY,
    });
  }

  let updateEnv: (elapsed: number) => void;
  if (mapId === 'office') {
    updateEnv = buildOfficeEnvironment(group);
  } else if (mapId === 'beach') {
    updateEnv = buildBeachEnvironment(group);
  } else {
    updateEnv = buildCityEnvironment(group);
  }

  scene.add(group);

  return {
    group,
    seatTransforms,
    update: updateEnv,
  };
}
