export type SheetName =
  | "hero-idle"
  | "hero-run"
  | "hero-jump"
  | "hero-shoot"
  | "hero-hurt"
  | "drone"
  | "enforcer"
  | "flyer"
  | "bullet"
  | "impact"
  | "muzzle"
  | "platforms"
  | "floors"
  | "props"
  | "tunnel";

export type MapName = "sky" | "far" | "mid" | "near" | "title";

export const SHEET_GRID: Record<SheetName, { cols: number; rows: number }> = {
  "hero-idle": { cols: 2, rows: 2 },
  "hero-run": { cols: 3, rows: 2 },
  "hero-jump": { cols: 2, rows: 2 },
  "hero-shoot": { cols: 2, rows: 2 },
  "hero-hurt": { cols: 2, rows: 2 },
  drone: { cols: 2, rows: 2 },
  enforcer: { cols: 2, rows: 2 },
  flyer: { cols: 2, rows: 2 },
  bullet: { cols: 2, rows: 2 },
  impact: { cols: 2, rows: 2 },
  muzzle: { cols: 2, rows: 2 },
  platforms: { cols: 4, rows: 1 },
  floors: { cols: 4, rows: 1 },
  props: { cols: 3, rows: 3 },
  tunnel: { cols: 1, rows: 1 },
};

export type SpriteBox = { sx: number; sy: number; sw: number; sh: number };

export function contentBox(
  img: HTMLImageElement,
  minLuma = 42,
  minChroma = 28,
  minA = 24,
): SpriteBox {
  const cv = document.createElement("canvas");
  cv.width = img.width;
  cv.height = img.height;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return { sx: 0, sy: 0, sw: img.width, sh: img.height };
  c.drawImage(img, 0, 0);
  const { data, width: w, height: h } = c.getImageData(0, 0, img.width, img.height);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (a < minA) continue;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (luma < minLuma && chroma < minChroma) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return { sx: 0, sy: 0, sw: w, sh: h };
  const pad = 2;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);
  return { sx, sy, sw, sh };
}

export type PackedFrame = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  cx: number;
  ok: boolean;
};

export type PackedSheet = {
  frames: PackedFrame[];
  valid: number[];
  refH: number;
};

export type RaidArt = {
  sheets: Record<SheetName, HTMLImageElement>;
  maps: Record<MapName, HTMLImageElement>;
  plat: HTMLImageElement[];
  floor: HTMLImageElement[];
  prop: HTMLImageElement[];
  tunnel: HTMLImageElement;
  packed: Record<SheetName, PackedSheet>;
  shop: HTMLImageElement;
  extract: HTMLImageElement;
  shopBox: SpriteBox;
  extractBox: SpriteBox;
};

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

const SHEETS: SheetName[] = [
  "hero-idle",
  "hero-run",
  "hero-jump",
  "hero-shoot",
  "hero-hurt",
  "drone",
  "enforcer",
  "flyer",
  "bullet",
  "impact",
  "muzzle",
  "platforms",
  "floors",
  "props",
  "tunnel",
];
const MAPS: MapName[] = ["sky", "far", "mid", "near", "title"];
const PACK: SheetName[] = [
  "hero-idle",
  "hero-run",
  "hero-jump",
  "hero-shoot",
  "hero-hurt",
  "drone",
  "enforcer",
  "flyer",
  "bullet",
  "impact",
  "muzzle",
];

export function packSheet(img: HTMLImageElement, cols: number, rows: number): PackedSheet {
  const cv = document.createElement("canvas");
  cv.width = img.width;
  cv.height = img.height;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return { frames: [], valid: [], refH: 1 };
  c.drawImage(img, 0, 0);
  const pix = c.getImageData(0, 0, img.width, img.height).data;
  const cw = img.width / cols;
  const ch = img.height / rows;
  const frames: PackedFrame[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x0 = Math.floor(col * cw);
    const y0 = Math.floor(row * ch);
    const x1 = Math.floor(x0 + cw);
    const y1 = Math.floor(y0 + ch);
    let minX = x1;
    let minY = y1;
    let maxX = x0;
    let maxY = y0;
    let found = false;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (pix[(y * img.width + x) * 4 + 3] > 28) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) {
      frames.push({ sx: x0, sy: y0, sw: cw, sh: ch, cx: cw / 2, ok: false });
      continue;
    }
    frames.push({
      sx: minX,
      sy: minY,
      sw: maxX - minX + 1,
      sh: maxY - minY + 1,
      cx: (minX + maxX) / 2 - minX,
      ok: true,
    });
  }
  const areas = frames.filter((f) => f.ok).map((f) => f.sw * f.sh).sort((a, b) => a - b);
  const median = areas[Math.floor(areas.length / 2)] ?? 1;
  for (const f of frames) {
    if (f.sw * f.sh < median * 0.42) f.ok = false;
  }
  const valid = frames.map((f, i) => (f.ok ? i : -1)).filter((i) => i >= 0);
  const refH = Math.max(1, ...valid.map((i) => frames[i]!.sh));
  return { frames, valid, refH };
}

export async function loadRaidArt(): Promise<RaidArt> {
  const [sheetImgs, mapImgs, plat, floor, prop, tunnel, shop, extract] = await Promise.all([
    Promise.all(SHEETS.map((n) => loadImg(`/game/sheets/${n}.png`))),
    Promise.all(MAPS.map((n) => loadImg(`/game/map/${n}.jpg`))),
    Promise.all([0, 1, 2, 3].map((i) => loadImg(`/game/tiles/plat-${i}.png`))),
    Promise.all([0, 1, 2, 3].map((i) => loadImg(`/game/tiles/floor-${i}.png`))),
    Promise.all([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => loadImg(`/game/tiles/prop-${i}.png`))),
    loadImg("/game/tiles/tunnel-0.png"),
    loadImg("/game/world/shop.png"),
    loadImg("/game/world/extract.png"),
  ]);
  const sheets = {} as Record<SheetName, HTMLImageElement>;
  SHEETS.forEach((n, i) => {
    sheets[n] = sheetImgs[i]!;
  });
  const maps = {} as Record<MapName, HTMLImageElement>;
  MAPS.forEach((n, i) => {
    maps[n] = mapImgs[i]!;
  });
  const packed = {} as Record<SheetName, PackedSheet>;
  for (const n of PACK) {
    const g = SHEET_GRID[n];
    packed[n] = packSheet(sheets[n]!, g.cols, g.rows);
  }
  return {
    sheets,
    maps,
    plat,
    floor,
    prop,
    tunnel,
    packed,
    shop,
    extract,
    shopBox: contentBox(shop, 55, 40),
    extractBox: contentBox(extract, 36, 22),
  };
}

export function drawPacked(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  pack: PackedSheet,
  frame: number,
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  flip: boolean,
  targetH: number,
) {
  const ids = pack.valid.length ? pack.valid : pack.frames.map((_, i) => i);
  const idx = ids[((Math.floor(frame) % ids.length) + ids.length) % ids.length] ?? 0;
  const f = pack.frames[idx];
  if (!f) return;
  const scale = targetH / pack.refH;
  const dw = f.sw * scale;
  const dh = f.sh * scale;
  const feetX = f.cx * scale;
  const dx = ax + aw / 2 - feetX;
  const dy = ay + ah - dh;
  ctx.save();
  if (flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, f.sx, f.sy, f.sw, f.sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, f.sx, f.sy, f.sw, f.sh, dx, dy, dw, dh);
  }
  ctx.restore();
}

export function drawCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cols: number,
  rows: number,
  frame: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  flip = false,
  inset = 0.04,
) {
  const n = cols * rows;
  const f = ((frame % n) + n) % n;
  const c = f % cols;
  const r = Math.floor(f / cols);
  const cw = img.width / cols;
  const ch = img.height / rows;
  const sx = c * cw + cw * inset;
  const sy = r * ch + ch * inset;
  const sw = cw * (1 - inset * 2);
  const sh = ch * (1 - inset * 2);
  ctx.save();
  if (flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  ctx.restore();
}
