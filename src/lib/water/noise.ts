export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x: number, y: number, octaves = 5): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * noise2(x * f, y * f);
    a *= 0.5;
    f *= 2.02;
  }
  return v;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function peak(dx: number, dz: number, radius: number, height: number): number {
  const r = Math.hypot(dx, dz) / radius;
  if (r >= 1) return 0;
  const w = 1 - r * r;
  return height * w * w;
}

/** World-space terrain height. Water surface is y = 0. */
export function terrainHeight(x: number, z: number): number {
  const n = fbm(x * 0.16, z * 0.16, 5);
  const n2 = fbm(x * 0.41 + 20, z * 0.41, 4);
  const r = Math.hypot(x, z);

  const volcano = peak(x + 1.6, z - 0.4, 6.4, 4.6);
  const shoulder = peak(x - 1.9, z + 1.7, 5.1, 2.7);
  const spit = peak(x - 3.6, z - 2.8, 4.4, 1.15);
  const knoll = peak(x + 3.1, z + 2.4, 3.2, 1.35);
  const ridge = volcano + shoulder * 0.82 + spit * 0.7 + knoll * 0.55;

  const crater = peak(x + 1.55, z - 0.35, 1.55, 1.35);
  let land = ridge - crater * 0.55;
  land += (n - 0.45) * 1.15;
  land += (n2 - 0.5) * 0.28;

  const coast = smoothstep(10.8, 4.6, r - (n - 0.5) * 2.6);
  land *= coast;

  const stack = peak(x - 7.2, z - 5.1, 1.15, 2.05) + (n2 - 0.5) * 0.25;
  const stack2 = peak(x + 8.4, z - 3.2, 0.85, 1.35);
  land = Math.max(land, stack * 0.95, stack2 * 0.9);

  const bedRipple = (n - 0.5) * 0.42 + Math.sin(x * 1.7) * Math.sin(z * 1.3) * 0.04;
  const bed = -1.35 + bedRipple - r * 0.01;
  const shelf = -0.16 + (n2 - 0.5) * 0.08 + Math.sin(x * 2.4 + z * 1.6) * 0.03;
  const shelfMask = smoothstep(13.2, 6.8, r - (n - 0.5) * 1.8);

  let h = land - 0.08;
  h = Math.max(h, lerp(bed, shelf, shelfMask));

  return h;
}

export function terrainNormal(x: number, z: number, eps = 0.14): [number, number, number] {
  const l = terrainHeight(x - eps, z);
  const r = terrainHeight(x + eps, z);
  const d = terrainHeight(x, z - eps);
  const u = terrainHeight(x, z + eps);
  const nx = l - r;
  const ny = 2 * eps;
  const nz = d - u;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
