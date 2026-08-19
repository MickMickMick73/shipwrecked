export const WORLD_SIZE = 32;
export const HALF = WORLD_SIZE * 0.5;
export const WATER_Y = 0;
export const TERRAIN_MIN = -2.8;
export const TERRAIN_MAX = 6.4;

export const SIM_RES_DESKTOP = 256;
export const SIM_RES_MOBILE = 160;
export const WATER_SEGS_DESKTOP = 140;
export const WATER_SEGS_MOBILE = 80;
export const ISLAND_SEGS_DESKTOP = 160;
export const ISLAND_SEGS_MOBILE = 96;
export const ISLAND_TEX_RES = 256;

export const SPHERE_RADIUS = 0.52;
export const HEIGHT_SCALE = 1.35;

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 760 || window.matchMedia("(pointer: coarse)").matches;
}

export function worldToUv(x: number, z: number): [number, number] {
  return [x / WORLD_SIZE + 0.5, z / WORLD_SIZE + 0.5];
}

export function uvToWorld(u: number, v: number): [number, number] {
  return [(u - 0.5) * WORLD_SIZE, (v - 0.5) * WORLD_SIZE];
}
