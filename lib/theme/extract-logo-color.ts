function rgbToHueSat(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function pixelScore(r: number, g: number, b: number, a: number): number {
  if (a < 40) return 0;
  const { s, l } = rgbToHueSat(r, g, b);
  if (l > 92 || l < 8) return 0;
  if (s < 12) return 0.15;
  const satWeight = Math.min(s / 55, 1.2);
  const lightWeight = 1 - Math.abs(l - 48) / 55;
  return satWeight * Math.max(lightWeight, 0.35);
}

function extractFromImageData(data: Uint8ClampedArray, width: number, height: number): string | null {
  const buckets = new Map<
    number,
    { r: number; g: number; b: number; weight: number; satSum: number }
  >();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const w = pixelScore(r, g, b, a);
      if (w <= 0) continue;

      const { h, s } = rgbToHueSat(r, g, b);
      const hueKey = Math.round(h / 12);
      const prev = buckets.get(hueKey);
      if (prev) {
        prev.r += r * w;
        prev.g += g * w;
        prev.b += b * w;
        prev.weight += w;
        prev.satSum += s * w;
      } else {
        buckets.set(hueKey, { r: r * w, g: g * w, b: b * w, weight: w, satSum: s * w });
      }
    }
  }

  let best: { r: number; g: number; b: number; weight: number; satSum: number } | null = null;
  for (const v of buckets.values()) {
    if (!best || v.weight > best.weight) best = v;
  }

  if (!best || best.weight < 2) return null;

  const r = Math.round(best.r / best.weight);
  const g = Math.round(best.g / best.weight);
  const b = Math.round(best.b / best.weight);
  return `#${[r, g, b].map((x) => Math.min(255, Math.max(0, x)).toString(16).padStart(2, "0")).join("")}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

async function extractFromImage(img: HTMLImageElement): Promise<string | null> {
  const canvas = document.createElement("canvas");
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const scale = Math.min(size / img.width, size / img.height);
  const w = Math.max(1, Math.floor(img.width * scale));
  const h = Math.max(1, Math.floor(img.height * scale));
  const ox = (size - w) / 2;
  const oy = (size - h) / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, ox, oy, w, h);
  const { data } = ctx.getImageData(0, 0, size, size);
  return extractFromImageData(data, size, size);
}

/** Extrai cor dominante de um arquivo (PNG, JPG, WebP, SVG renderizado). */
export async function extractDominantColorFromFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return await extractFromImage(img);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Fallback: extrai cor a partir da URL pública (após upload no storage). */
export async function extractDominantColorFromUrl(url: string): Promise<string | null> {
  try {
    const img = await loadImage(url);
    return await extractFromImage(img);
  } catch {
    return null;
  }
}
