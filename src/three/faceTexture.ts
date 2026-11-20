import * as THREE from 'three';
import { Gender } from '../shared/types';

function darkenHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0.3;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Generates crisp 512x512 procedural Canvas textures (Awake + Sleeping) mapped cleanly
 * onto the front (+Z) hemisphere of the sculpted rounded chibi head.
 * STRICT PURE SKIN RULE: Draws ONLY skin tone + facial features (eyes, eyebrows, blush,
 * nose shadow, smile) — NEVER paints hair or scalp patches onto the head texture!
 */
export function createChibiFaceTextures(
  skinColor: string,
  hairColor: string,
  gender: Gender,
): { awakeMap: THREE.CanvasTexture; sleepMap: THREE.CanvasTexture } {
  const drawFace = (sleeping: boolean): THREE.CanvasTexture => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 1. Strictly pure skin base across entire UV (zero painted hair!)
    ctx.fillStyle = skinColor;
    ctx.fillRect(0, 0, size, size);

    // Subtle warm chin ambient shading
    const chinGrad = ctx.createLinearGradient(0, size * 0.7, 0, size);
    chinGrad.addColorStop(0, 'rgba(130, 58, 36, 0)');
    chinGrad.addColorStop(1, 'rgba(115, 50, 30, 0.14)');
    ctx.fillStyle = chinGrad;
    ctx.fillRect(0, size * 0.7, size, size * 0.3);

    // Mockup-accurate chibi face layout: larger glossy eyes positioned slightly LOWER on the face
    const cx = 256;
    const eyeY = 278;
    const eyeSpacing = 38;
    const isFemale = gender === 'female';

    // 2. Soft Rosy Cheek Blush (under outer lower eye edges)
    for (const side of [-1, 1]) {
      const bx = cx + side * 54;
      const by = eyeY + 42;
      const blushGrad = ctx.createRadialGradient(bx, by, 3, bx, by, 21);
      blushGrad.addColorStop(
        0,
        isFemale ? 'rgba(255, 114, 152, 0.52)' : 'rgba(255, 126, 146, 0.36)',
      );
      blushGrad.addColorStop(1, 'rgba(255, 114, 152, 0)');
      ctx.fillStyle = blushGrad;
      ctx.beginPath();
      ctx.ellipse(bx, by, 21, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Large Glossy Expressive Cartoon Eyes (Awake vs Sleeping)
    if (sleeping) {
      ctx.strokeStyle = '#24142B';
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const ex = cx + side * eyeSpacing;
        ctx.lineWidth = isFemale ? 7.5 : 6.4;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY + 4, 15.5, 15.5, 0, Math.PI * 0.14, Math.PI * 0.86);
        ctx.stroke();

        if (isFemale) {
          ctx.lineWidth = 4.4;
          ctx.beginPath();
          ctx.moveTo(ex + side * 14, eyeY + 11);
          ctx.lineTo(ex + side * 22, eyeY + 7);
          ctx.stroke();
        }
      }
    } else {
      for (const side of [-1, 1]) {
        const ex = cx + side * eyeSpacing;
        const rx = isFemale ? 17.5 : 16.5;
        const ry = isFemale ? 33.5 : 31.0;

        // Crisp white sclera base
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rich layered dark espresso-to-warm-amber iris (matches mockup vinyl eyes!)
        const irisRx = rx * 0.85;
        const irisRy = ry * 0.86;
        const irisGrad = ctx.createLinearGradient(ex, eyeY - irisRy, ex, eyeY + irisRy);
        irisGrad.addColorStop(0, '#160C1E');
        irisGrad.addColorStop(0.52, '#3D2118');
        irisGrad.addColorStop(1, '#8C5232');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(ex - side * 1.2, eyeY + 1.5, irisRx, irisRy, 0, 0, Math.PI * 2);
        ctx.fill();

        // Deep glossy pupil
        ctx.fillStyle = '#110918';
        ctx.beginPath();
        ctx.ellipse(ex - side * 1.2, eyeY, irisRx * 0.56, irisRy * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm lower amber rim crescent
        ctx.strokeStyle = 'rgba(255, 212, 156, 0.65)';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.ellipse(
          ex - side * 1.2,
          eyeY + 5,
          irisRx * 0.66,
          irisRy * 0.64,
          0,
          Math.PI * 0.2,
          Math.PI * 0.8,
        );
        ctx.stroke();

        // Dual crisp white specular catchlights
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(ex - 5.2, eyeY - 11, 5.2, 8.8, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ex + 5.0, eyeY + 11, 2.6, 4.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crisp curved upper lash line
        ctx.strokeStyle = '#180C20';
        ctx.lineWidth = isFemale ? 7.2 : 6.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY - 1.5, rx + 1.4, ry + 1.2, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();

        // Expressive winged outer eyelashes for Female
        if (isFemale) {
          ctx.lineWidth = 4.4;
          ctx.beginPath();
          ctx.moveTo(ex + side * (rx - 0.5), eyeY - 12);
          ctx.quadraticCurveTo(
            ex + side * (rx + 6.5),
            eyeY - 19,
            ex + side * (rx + 9),
            eyeY - 25,
          );
          ctx.stroke();
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(ex + side * (rx + 0.5), eyeY - 4);
          ctx.lineTo(ex + side * (rx + 7.5), eyeY - 9);
          ctx.stroke();
        }
      }
    }

    // 4. Bold Expressive Eyebrows dynamically matched to Hair Color
    const lum = getLuminance(hairColor);
    const browColor = darkenHex(hairColor, lum > 0.65 ? 0.66 : 0.82);
    ctx.strokeStyle = browColor;
    ctx.lineCap = 'round';
    ctx.lineWidth = isFemale ? 7.8 : 11.2;
    for (const side of [-1, 1]) {
      const bx = cx + side * eyeSpacing;
      const by = eyeY - (sleeping ? 34 : 47);
      ctx.beginPath();
      if (isFemale) {
        ctx.moveTo(bx - side * 15, by + 4);
        ctx.quadraticCurveTo(bx, by - 9, bx + side * 17, by + 5);
      } else {
        // Confident slightly heroic cartoon brows matching mockup
        ctx.moveTo(bx - side * 17, by + 6);
        ctx.quadraticCurveTo(bx - side * 2, by - 7, bx + side * 18, by + 2);
      }
      ctx.stroke();
    }

    // 5. Subtle Nose Shadow Dot (complements tiny 3D button nose)
    ctx.fillStyle = darkenHex(skinColor, 0.85);
    ctx.beginPath();
    ctx.ellipse(cx, eyeY + 32, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 6. Warm Confident Cartoon Smile / Grin (zero floating 3D mesh!)
    ctx.strokeStyle = isFemale ? '#B84A64' : '#7D3B32';
    ctx.lineWidth = 5.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (sleeping) {
      ctx.moveTo(cx - 12, eyeY + 56);
      ctx.quadraticCurveTo(cx, eyeY + 62, cx + 12, eyeY + 56);
    } else if (isFemale) {
      ctx.moveTo(cx - 18, eyeY + 52);
      ctx.quadraticCurveTo(cx, eyeY + 67, cx + 18, eyeY + 52);
    } else {
      // Confident friendly grin matching mockup
      ctx.moveTo(cx - 19, eyeY + 54);
      ctx.quadraticCurveTo(cx + 2, eyeY + 69, cx + 22, eyeY + 49);
    }
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  };

  return {
    awakeMap: drawFace(false),
    sleepMap: drawFace(true),
  };
}

/**
 * Procedural pinstripe fabric CanvasTexture for Mobster Pinstripe Suit & Trousers.
 */
export function createPinstripeTexture(baseHex: string, stripeHex = '#D8D4EB'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = stripeHex;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 2;
  for (let x = 8; x < 128; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/**
 * Procedural denim CanvasTexture with weave + contrast stitching for Cuffed Blue Jeans.
 */
export function createDenimTexture(baseHex: string, stitchHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle diagonal denim twill grain
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  for (let i = -128; i < 256; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
  }

  // Vertical double seam stitching
  ctx.strokeStyle = stitchHex;
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(64, 0);
  ctx.lineTo(64, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/**
 * Procedural plaid/checkered fabric CanvasTexture for Plaid Trousers.
 */
export function createPlaidTexture(baseHex: string, lineA: string, lineB: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = lineA;
  ctx.globalAlpha = 0.28;
  ctx.fillRect(0, 18, 128, 16);
  ctx.fillRect(0, 82, 128, 16);
  ctx.fillRect(18, 0, 16, 128);
  ctx.fillRect(82, 0, 16, 128);

  ctx.strokeStyle = lineB;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.lineTo(128, 56);
  ctx.moveTo(56, 0);
  ctx.lineTo(56, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}
