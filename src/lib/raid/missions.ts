import type { ChunkKind } from "./procgen";

export type MissionKind = "reach" | "kills" | "loot" | "cores" | "score";

export type DistrictPalette = {
  fog: string;
  tint: string;
  rain: number;
  name: string;
};

export type Mission = {
  id: string;
  title: string;
  brief: string;
  how: string;
  kind: MissionKind;
  target: number;
  chunks: number;
  districts: ChunkKind[];
  palette: DistrictPalette;
  xp: number;
};

const PALETTES: Record<string, DistrictPalette> = {
  street: { fog: "rgba(0,8,18,0.18)", tint: "rgba(0,80,120,0.10)", rain: 1, name: "Rain Alley" },
  rooftop: { fog: "rgba(18,0,24,0.22)", tint: "rgba(120,0,80,0.12)", rain: 0.45, name: "Neon Roofs" },
  tunnel: { fog: "rgba(0,10,28,0.35)", tint: "rgba(0,40,90,0.16)", rain: 0.15, name: "Service Tunnels" },
  overpass: { fog: "rgba(20,12,0,0.18)", tint: "rgba(90,50,0,0.12)", rain: 0.7, name: "Overpass" },
  factory: { fog: "rgba(22,8,0,0.22)", tint: "rgba(90,30,0,0.14)", rain: 0.35, name: "Foundry" },
  market: { fog: "rgba(12,0,18,0.16)", tint: "rgba(80,0,90,0.10)", rain: 0.55, name: "Night Market" },
  docks: { fog: "rgba(0,16,18,0.22)", tint: "rgba(0,70,70,0.12)", rain: 0.9, name: "Flood Docks" },
  alley: { fog: "rgba(10,0,18,0.28)", tint: "rgba(50,0,80,0.14)", rain: 0.6, name: "Back Alley" },
};

const UNLOCK: ChunkKind[][] = [
  ["street", "alley"],
  ["street", "rooftop", "alley"],
  ["street", "rooftop", "tunnel", "alley"],
  ["street", "rooftop", "tunnel", "overpass"],
  ["street", "rooftop", "tunnel", "overpass", "factory"],
  ["street", "rooftop", "tunnel", "overpass", "factory", "market"],
  ["street", "rooftop", "tunnel", "overpass", "factory", "market", "docks"],
  ["street", "rooftop", "tunnel", "overpass", "factory", "market", "docks", "alley"],
];

export function unlockedDistricts(level: number): ChunkKind[] {
  const i = Math.max(0, Math.min(UNLOCK.length - 1, level - 1));
  return UNLOCK[i]!;
}

const ROTATION: {
  kind: MissionKind;
  title: string;
  brief: (n: number) => string;
  how: (n: number) => string;
}[] = [
  {
    kind: "reach",
    title: "Ghost the route",
    brief: () => "Reach the extract pad at the end of the district.",
    how: () => "Run right. Ignore optional loot if you want. Stand on the glowing pad and hold E.",
  },
  {
    kind: "kills",
    title: "Clear the block",
    brief: (n) => `Eliminate ${n} hostiles, then extract.`,
    how: (n) => `Shoot ${n} enemies. More will drop in if the street goes quiet. The pad stays locked until the bar fills.`,
  },
  {
    kind: "cores",
    title: "Lift the cores",
    brief: (n) => `Collect ${n} data cores, then extract.`,
    how: (n) => `Cores glow on platforms and drop from elites. You need ${n}. Walk over them — they go in the raid bag.`,
  },
  {
    kind: "loot",
    title: "Sweep the drop",
    brief: (n) => `Pick up ${n} items, then extract.`,
    how: (n) => `Any pickup counts (stims, cores, credits). Grab ${n}, then hold E on the pad.`,
  },
  {
    kind: "score",
    title: "Make it loud",
    brief: (n) => `Score ${n} run pts, then extract.`,
    how: (n) => `Kills and loot add pts this raid. Hit ${n} on the counter, then extract. Dying still loses the bag.`,
  },
];

export function missionForLevel(level: number): Mission {
  const lv = Math.max(1, level);
  const rot = ROTATION[(lv - 1) % ROTATION.length]!;
  const districts = unlockedDistricts(lv);
  const lead = districts[Math.min(districts.length - 1, lv - 1)] ?? "street";
  let chunks = Math.min(8, 4 + Math.floor((lv - 1) / 2));
  let target = 1;
  if (rot.kind === "kills") {
    target = 4 + lv;
    chunks = Math.max(chunks, 5);
  }
  if (rot.kind === "cores") target = Math.min(6, 2 + Math.floor(lv / 2));
  if (rot.kind === "loot") target = 4 + lv;
  if (rot.kind === "score") target = 200 + lv * 80;
  if (rot.kind === "reach") target = 1;
  return {
    id: `lv${lv}-${rot.kind}`,
    title: rot.title,
    brief: rot.brief(target),
    how: rot.how(target),
    kind: rot.kind,
    target,
    chunks,
    districts,
    palette: PALETTES[lead] ?? PALETTES.street!,
    xp: 40 + lv * 18,
  };
}

export function missionLabel(kind: MissionKind): string {
  if (kind === "kills") return "Kills";
  if (kind === "cores") return "Cores";
  if (kind === "loot") return "Loot";
  if (kind === "score") return "Pts";
  return "Route";
}
