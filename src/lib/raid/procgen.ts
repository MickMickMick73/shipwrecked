import { mulberry32, pick, randInt, type Rng } from "./rng";

export const VW = 1280;
export const VH = 720;
export const CHUNK_W = 1180;
export const GROUND = 602;
export const FLOOR_H = 52;
export const PLAT_H = 30;

export type SolidKind = "floor" | "plat" | "oneway";
export type EnemyKind = "enforcer" | "drone" | "flyer" | "bruiser" | "sniper" | "crawler" | "bomber";
export type ChunkKind = "street" | "rooftop" | "tunnel" | "overpass" | "factory" | "market" | "docks" | "alley";

export type Solid = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: SolidKind;
  tile: number;
  oneway: boolean;
};

export type Prop = { x: number; y: number; w: number; h: number; frame: number };
export type Spawn = { x: number; y: number; kind: EnemyKind };
export type Pickup = { x: number; y: number; frame: number; def?: string };
export type Deco = { x: number; y: number; w: number; h: number; kind: "tunnel" | "sign" | "pipe" | "crane" | "wall" };
export type Landmark = { x: number; y: number; w: number; h: number; kind: "shop" | "extract" };

export type Chunk = {
  i: number;
  kind: ChunkKind;
  x: number;
  w: number;
  solids: Solid[];
  props: Prop[];
  spawns: Spawn[];
  pickups: Pickup[];
  deco: Deco[];
  landmarks: Landmark[];
};

export type WorldGen = {
  seed: number;
  terrain: Rng;
  loot: Rng;
  foes: Rng;
};

export function makeWorldGen(seed: number): WorldGen {
  return {
    seed,
    terrain: mulberry32(seed),
    loot: mulberry32(seed ^ 0x9e3779b9),
    foes: mulberry32(seed ^ 0x85ebca6b),
  };
}

function floorRun(x: number, y: number, w: number, tile = 1): Solid {
  return { x, y, w, h: FLOOR_H, kind: "floor", tile, oneway: false };
}
function plat(x: number, y: number, w: number, tile = 1, oneway = true): Solid {
  return { x, y, w, h: PLAT_H, kind: oneway ? "oneway" : "plat", tile, oneway };
}

const KINDS: ChunkKind[] = ["street", "rooftop", "tunnel", "overpass", "factory", "market", "docks", "alley"];

export type ChunkOpts = {
  kind?: ChunkKind;
  isStart?: boolean;
  isEnd?: boolean;
  shop?: boolean;
};

export function generateChunk(gen: WorldGen, i: number, opts: ChunkOpts = {}): Chunk {
  const x0 = i * CHUNK_W;
  const kind: ChunkKind = opts.kind ?? (i === 0 ? "street" : pick(gen.terrain, KINDS));
  const variant = randInt(gen.terrain, 0, 2);
  const solids: Solid[] = [];
  const props: Prop[] = [];
  const spawns: Spawn[] = [];
  const pickups: Pickup[] = [];
  const deco: Deco[] = [];
  const landmarks: Landmark[] = [];
  const shift = variant * 36;

  solids.push(floorRun(x0, GROUND, 140, 0));
  solids.push(floorRun(x0 + CHUNK_W - 140, GROUND, 140, 2));

  const addCrate = (x: number, y: number) => {
    props.push({ x, y, w: 48 + variant * 4, h: 48 + variant * 4, frame: randInt(gen.loot, 0, 2) });
  };

  if (kind === "street") {
    solids.push(floorRun(x0 + 120, GROUND, CHUNK_W - 240, 1));
    solids.push(plat(x0 + 240 + shift, GROUND - 108 - variant * 12, 190, 1));
    if (!opts.isStart || gen.terrain() > 0.25) solids.push(plat(x0 + 500 + shift, GROUND - 196 - variant * 16, 200, 0));
    if (!opts.isStart) solids.push(plat(x0 + 780, GROUND - 118, 180, 2));
    for (let k = 0; k < 3 + variant; k++) addCrate(x0 + 180 + k * 210 + randInt(gen.loot, 0, 40), GROUND - 50);
    if (!opts.isStart) {
      spawns.push({ x: x0 + 500, y: GROUND - 78, kind: "enforcer" });
      if (gen.foes() > 0.4) spawns.push({ x: x0 + 860, y: GROUND - 78, kind: "crawler" });
      if (gen.foes() > 0.5) spawns.push({ x: x0 + 680, y: GROUND - 250, kind: "drone" });
      if (gen.foes() > 0.7) spawns.push({ x: x0 + 720, y: GROUND - 78, kind: "bruiser" });
    }
    if (gen.loot() > 0.42) pickups.push({ x: x0 + 540, y: GROUND - 240, frame: 8 });
    deco.push({ x: x0 + 300, y: GROUND - 210, w: 90, h: 28, kind: "sign" });
  }

  if (kind === "rooftop") {
    solids.push(floorRun(x0 + 120, GROUND, 260, 1));
    solids.push(floorRun(x0 + CHUNK_W - 340, GROUND, 200, 1));
    solids.push(plat(x0 + 320 + shift, GROUND - 118, 220, 1));
    solids.push(plat(x0 + 540, GROUND - 214 - variant * 20, 230, 0, false));
    solids.push(plat(x0 + 800, GROUND - 118, 200, 2));
    solids.push(plat(x0 + 580, GROUND - 318 - variant * 12, 170, 1));
    spawns.push({ x: x0 + 600, y: GROUND - 268, kind: "drone" });
    spawns.push({ x: x0 + 860, y: GROUND - 180, kind: "flyer" });
    if (gen.foes() > 0.45) spawns.push({ x: x0 + 200, y: GROUND - 78, kind: "sniper" });
    pickups.push({ x: x0 + 630, y: GROUND - 360, frame: 8 });
    props.push({ x: x0 + 150, y: GROUND - 70, w: 44, h: 70, frame: 5 });
    deco.push({ x: x0 + 700, y: 240, w: 70, h: 160, kind: "crane" });
  }

  if (kind === "tunnel") {
    solids.push(floorRun(x0 + 120, GROUND, CHUNK_W - 240, 3));
    solids.push({ x: x0 + 160, y: 176 + variant * 10, w: CHUNK_W - 320, h: 48, kind: "plat", tile: 1, oneway: false });
    solids.push(plat(x0 + 240 + shift, GROUND - 112, 200, 1, false));
    solids.push(plat(x0 + 600, GROUND - 112 - variant * 18, 210, 2, false));
    deco.push({ x: x0 + 70, y: 220, w: 360, h: 380, kind: "tunnel" });
    deco.push({ x: x0 + 500, y: GROUND - 90, w: 180, h: 16, kind: "pipe" });
    spawns.push({ x: x0 + 480, y: GROUND - 78, kind: "enforcer" });
    spawns.push({ x: x0 + 760, y: 390, kind: "flyer" });
    if (gen.foes() > 0.38) spawns.push({ x: x0 + 940, y: GROUND - 180, kind: "drone" });
    props.push({ x: x0 + 400, y: GROUND - 48, w: 52, h: 48, frame: 6 });
  }

  if (kind === "overpass") {
    solids.push(floorRun(x0 + 120, GROUND, 340, 1));
    solids.push(floorRun(x0 + 800, GROUND, 240, 1));
    solids.push(plat(x0 + 260 + shift, GROUND - 118, 250, 0, false));
    solids.push(plat(x0 + 520, GROUND - 224 - variant * 14, 240, 1, false));
    solids.push(plat(x0 + 770, GROUND - 118, 220, 2));
    spawns.push({ x: x0 + 380, y: GROUND - 188, kind: "enforcer" });
    spawns.push({ x: x0 + 660, y: GROUND - 280, kind: "drone" });
    spawns.push({ x: x0 + 920, y: GROUND - 180, kind: "flyer" });
    pickups.push({ x: x0 + 600, y: GROUND - 268, frame: 8 });
    deco.push({ x: x0 + 480, y: 200, w: 80, h: 200, kind: "crane" });
  }

  if (kind === "factory") {
    solids.push(floorRun(x0 + 120, GROUND, CHUNK_W - 240, 3));
    solids.push(plat(x0 + 180 + shift, GROUND - 108, 170, 0));
    solids.push(plat(x0 + 410, GROUND - 196 - variant * 16, 170, 1, false));
    solids.push(plat(x0 + 640, GROUND - 108, 170, 2));
    solids.push(plat(x0 + 870, GROUND - 196, 160, 3));
    for (let k = 0; k < 3; k++) addCrate(x0 + 250 + k * 270, GROUND - 52);
    props.push({ x: x0 + 960, y: GROUND - 86, w: 48, h: 86, frame: 7 });
    spawns.push({ x: x0 + 460, y: GROUND - 78, kind: "enforcer" });
    spawns.push({ x: x0 + 720, y: GROUND - 250, kind: "drone" });
    if (gen.foes() > 0.32) spawns.push({ x: x0 + 980, y: 360, kind: "flyer" });
    deco.push({ x: x0 + 300, y: GROUND - 70, w: 140, h: 14, kind: "pipe" });
  }

  if (kind === "market") {
    solids.push(floorRun(x0 + 120, GROUND, CHUNK_W - 240, 1));
    solids.push(plat(x0 + 220, GROUND - 92, 140, 1));
    solids.push(plat(x0 + 400 + shift, GROUND - 92, 140, 2));
    solids.push(plat(x0 + 580, GROUND - 168, 160, 0));
    solids.push(plat(x0 + 780, GROUND - 92, 150, 1));
    for (let k = 0; k < 6; k++) addCrate(x0 + 160 + k * 150, GROUND - 50);
    spawns.push({ x: x0 + 360, y: GROUND - 78, kind: "enforcer" });
    spawns.push({ x: x0 + 700, y: GROUND - 78, kind: "enforcer" });
    if (gen.foes() > 0.4) spawns.push({ x: x0 + 560, y: GROUND - 210, kind: "drone" });
    pickups.push({ x: x0 + 600, y: GROUND - 210, frame: 8 });
    deco.push({ x: x0 + 250, y: GROUND - 160, w: 100, h: 26, kind: "sign" });
    deco.push({ x: x0 + 820, y: GROUND - 160, w: 90, h: 26, kind: "sign" });
  }

  if (kind === "docks") {
    solids.push(floorRun(x0 + 120, GROUND, 220, 2));
    solids.push(floorRun(x0 + 520, GROUND, 200, 2));
    solids.push(floorRun(x0 + 900, GROUND, 160, 2));
    solids.push(plat(x0 + 300, GROUND - 130, 180, 0, false));
    solids.push(plat(x0 + 680, GROUND - 200 - variant * 10, 190, 1, false));
    solids.push(plat(x0 + 860, GROUND - 108, 160, 2));
    spawns.push({ x: x0 + 560, y: GROUND - 78, kind: "enforcer" });
    spawns.push({ x: x0 + 740, y: GROUND - 250, kind: "drone" });
    spawns.push({ x: x0 + 980, y: GROUND - 180, kind: "flyer" });
    pickups.push({ x: x0 + 700, y: GROUND - 244, frame: 8 });
    deco.push({ x: x0 + 400, y: 250, w: 90, h: 180, kind: "crane" });
  }

  if (kind === "alley") {
    solids.push(floorRun(x0 + 120, GROUND, CHUNK_W - 240, 1));
    solids.push(plat(x0 + 200, GROUND - 96, 120, 1, false));
    solids.push(plat(x0 + 360 + shift, GROUND - 170, 130, 0, false));
    solids.push(plat(x0 + 530, GROUND - 250, 130, 2, false));
    solids.push(plat(x0 + 700, GROUND - 170, 140, 1, false));
    solids.push(plat(x0 + 880, GROUND - 96, 130, 3));
    spawns.push({ x: x0 + 420, y: GROUND - 78, kind: "enforcer" });
    spawns.push({ x: x0 + 640, y: GROUND - 300, kind: "drone" });
    spawns.push({ x: x0 + 900, y: GROUND - 160, kind: "flyer" });
    pickups.push({ x: x0 + 540, y: GROUND - 294, frame: 8 });
    deco.push({ x: x0 + 140, y: 210, w: 40, h: 380, kind: "wall" });
    deco.push({ x: x0 + 980, y: 210, w: 40, h: 380, kind: "wall" });
  }

  if (opts.shop) {
    solids.push(floorRun(x0 + 380, GROUND, 280, 1));
    landmarks.push({ x: x0 + 450, y: GROUND - 176, w: 120, h: 180, kind: "shop" });
  }

  if (opts.isEnd) {
    solids.push(floorRun(x0 + 200, GROUND, CHUNK_W - 200, 1));
    landmarks.push({ x: x0 + 620, y: GROUND - 52, w: 280, h: 56, kind: "extract" });
    deco.push({ x: x0 + CHUNK_W - 48, y: 120, w: 48, h: GROUND - 80, kind: "wall" });
    solids.push({ x: x0 + CHUNK_W - 36, y: 80, w: 48, h: GROUND, kind: "plat", tile: 3, oneway: false });
  }

  if (opts.isStart) pickups.push({ x: x0 + 400, y: GROUND - 44, frame: 8, def: "medkit" });

  return { i, kind, x: x0, w: CHUNK_W, solids, props, spawns, pickups, deco, landmarks };
}

export function generateRun(
  gen: WorldGen,
  districts: ChunkKind[],
  n: number,
  extras?: { kills?: number; cores?: number; loot?: number },
): Chunk[] {
  const chunks: Chunk[] = [];
  const shopAt = n >= 4 ? Math.floor(n / 2) : -1;
  for (let i = 0; i < n; i++) {
    const isStart = i === 0;
    const isEnd = i === n - 1;
    let kind: ChunkKind = "street";
    if (isStart) kind = districts[0] ?? "street";
    else if (isEnd) kind = districts[districts.length - 1] ?? "street";
    else kind = pick(gen.terrain, districts);
    chunks.push(generateChunk(gen, i, { kind, isStart, isEnd, shop: i === shopAt && !isEnd }));
  }

  const mid = chunks.filter((c) => !c.landmarks.some((l) => l.kind === "extract"));
  const pool: EnemyKind[] = ["enforcer", "crawler", "drone", "bruiser", "sniper", "flyer", "bomber"];
  const needKills = extras?.kills ?? 8;
  let spawned = chunks.reduce((a, c) => a + c.spawns.length, 0);
  let k = 0;
  while (spawned < needKills && mid.length) {
    const ch = mid[k % mid.length]!;
    const kind = pool[k % pool.length]!;
    const x = ch.x + 160 + ((k * 173) % (CHUNK_W - 280));
    const air = kind === "flyer" || kind === "drone" || kind === "bomber";
    ch.spawns.push({ x, y: air ? GROUND - 220 - (k % 3) * 30 : GROUND - (kind === "crawler" ? 32 : 78), kind });
    spawned += 1;
    k += 1;
  }
  const needCores = extras?.cores ?? 0;
  for (let i = 0; i < needCores; i++) {
    const ch = mid[i % Math.max(1, mid.length)] ?? chunks[0]!;
    ch.pickups.push({ x: ch.x + 240 + (i * 210) % 700, y: GROUND - 140 - (i % 3) * 50, frame: 8, def: "core" });
  }
  const needLoot = extras?.loot ?? 0;
  for (let i = 0; i < needLoot; i++) {
    const ch = mid[i % Math.max(1, mid.length)] ?? chunks[0]!;
    ch.pickups.push({
      x: ch.x + 180 + (i * 190) % 800,
      y: GROUND - 50,
      frame: 8,
      def: i % 2 ? "credits" : "medkit",
    });
  }
  return chunks;
}

export function reachableSolids(chunks: Chunk[]): Solid[] {
  const out: Solid[] = [];
  for (const c of chunks) out.push(...c.solids);
  return out;
}
