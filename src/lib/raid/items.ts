export type ItemKind = "weapon" | "armor" | "upgrade" | "consumable" | "special" | "loot";
export type Rarity = "common" | "rare" | "epic";

export type ItemDef = {
  id: string;
  name: string;
  kind: ItemKind;
  icon: string;
  desc: string;
  use: string;
  stack: number;
  price: number;
  rarity: Rarity;
  unlock: number;
  damage?: number;
  fireRate?: number;
  spread?: number;
  pellets?: number;
  speed?: number;
  heal?: number;
  absorb?: number;
};

export type InvSlot = { def: string; qty: number } | null;

export const STASH_N = 20;
export const BAG_N = 12;
export const CON_N = 4;
export const HOT_N = CON_N;

export const ITEMS: Record<string, ItemDef> = {
  pistol: {
    id: "pistol",
    name: "Pulse Pistol",
    kind: "weapon",
    icon: "/game/icons/pistol.png",
    desc: "Starter sidearm.",
    use: "Always fires on left click. Park it in the WEAPON slot.",
    stack: 1,
    price: 0,
    rarity: "common",
    unlock: 1,
    damage: 1,
    fireRate: 6.2,
    spread: 0.045,
    speed: 920,
  },
  smg: {
    id: "smg",
    name: "Needle SMG",
    kind: "weapon",
    icon: "/game/icons/smg.png",
    desc: "High fire rate, messy spread.",
    use: "Drop on WEAPON. Mouse fires it. Better in crowds.",
    stack: 1,
    price: 280,
    rarity: "common",
    unlock: 2,
    damage: 1,
    fireRate: 11.5,
    spread: 0.14,
    speed: 860,
  },
  shotgun: {
    id: "shotgun",
    name: "Room Sweeper",
    kind: "weapon",
    icon: "/game/icons/shotgun.png",
    desc: "Five pellets. Mean up close.",
    use: "Drop on WEAPON. Wait until they are in your face.",
    stack: 1,
    price: 420,
    rarity: "rare",
    unlock: 3,
    damage: 1,
    fireRate: 1.55,
    spread: 0.32,
    pellets: 5,
    speed: 720,
  },
  rifle: {
    id: "rifle",
    name: "Rail Carbine",
    kind: "weapon",
    icon: "/game/icons/rifle.png",
    desc: "Tight beam. Two damage a hit.",
    use: "Drop on WEAPON. Best for flyers and snipers.",
    stack: 1,
    price: 560,
    rarity: "rare",
    unlock: 4,
    damage: 2,
    fireRate: 4.2,
    spread: 0.02,
    speed: 1180,
  },
  plasma: {
    id: "plasma",
    name: "Plasma Caster",
    kind: "weapon",
    icon: "/game/icons/plasma.png",
    desc: "Slow bolts that melt armor.",
    use: "Drop on WEAPON. Three damage. Lead the shot.",
    stack: 1,
    price: 740,
    rarity: "epic",
    unlock: 5,
    damage: 3,
    fireRate: 2.1,
    spread: 0.05,
    speed: 620,
  },
  jacket: {
    id: "jacket",
    name: "Synth Jacket",
    kind: "armor",
    icon: "/game/icons/armor.png",
    desc: "Soaks one hit then tears.",
    use: "Drop on ARMOR. First bullet that would kill a bar, doesn’t.",
    stack: 1,
    price: 140,
    rarity: "common",
    unlock: 1,
    absorb: 1,
  },
  vest: {
    id: "vest",
    name: "Plate Carrier",
    kind: "armor",
    icon: "/game/icons/armor.png",
    desc: "Two hit plates.",
    use: "Drop on ARMOR. Each plate eats one hit.",
    stack: 1,
    price: 260,
    rarity: "rare",
    unlock: 2,
    absorb: 2,
  },
  exo: {
    id: "exo",
    name: "Exo Harness",
    kind: "armor",
    icon: "/game/icons/armor.png",
    desc: "Three plates. Heavy chrome.",
    use: "Drop on ARMOR. Best insurance for long raids.",
    stack: 1,
    price: 420,
    rarity: "epic",
    unlock: 4,
    absorb: 3,
  },
  grenade: {
    id: "grenade",
    name: "Pulse Grenade",
    kind: "special",
    icon: "/game/icons/grenade.png",
    desc: "Arc it at the cursor.",
    use: "Park in a 1–4 slot. Press that key to throw at the crosshair.",
    stack: 4,
    price: 120,
    rarity: "rare",
    unlock: 2,
    damage: 4,
  },
  medkit: {
    id: "medkit",
    name: "Stimpack",
    kind: "consumable",
    icon: "/game/icons/medkit.png",
    desc: "Restore two health bars.",
    use: "Park in a 1–4 slot. Press that key when you’re bleeding.",
    stack: 5,
    price: 80,
    rarity: "common",
    unlock: 1,
    heal: 2,
  },
  shield: {
    id: "shield",
    name: "Hex Shield",
    kind: "special",
    icon: "/game/icons/shield.png",
    desc: "Two seconds of hard iframes.",
    use: "Park in 1–4. Press the key to go ghost.",
    stack: 3,
    price: 150,
    rarity: "rare",
    unlock: 4,
  },
  drone: {
    id: "drone",
    name: "Recon Drone",
    kind: "special",
    icon: "/game/icons/drone.png",
    desc: "Three homing needles.",
    use: "Park in 1–4. Press the key — needles chase the crosshair.",
    stack: 3,
    price: 180,
    rarity: "rare",
    unlock: 5,
    damage: 2,
  },
  chip: {
    id: "chip",
    name: "Damage Chip",
    kind: "upgrade",
    icon: "/game/icons/chip.png",
    desc: "+1 damage on your equipped gun.",
    use: "Drop on MOD. Active every raid while it sits there.",
    stack: 1,
    price: 160,
    rarity: "rare",
    unlock: 2,
  },
  speed: {
    id: "speed",
    name: "Servo Chip",
    kind: "upgrade",
    icon: "/game/icons/speed.png",
    desc: "Move and fire faster.",
    use: "Drop on MOD. Active every raid while equipped.",
    stack: 1,
    price: 150,
    rarity: "rare",
    unlock: 2,
  },
  armor: {
    id: "armor",
    name: "Plate Carrier",
    kind: "armor",
    icon: "/game/icons/armor.png",
    desc: "Two hit plates.",
    use: "Drop on ARMOR.",
    stack: 1,
    price: 260,
    rarity: "rare",
    unlock: 2,
    absorb: 2,
  },
  core: {
    id: "core",
    name: "Data Core",
    kind: "loot",
    icon: "/game/icons/core.png",
    desc: "Mission loot. Banks on extract.",
    use: "Walk over it. Extract to cash it. Cores count for heist jobs.",
    stack: 9,
    price: 90,
    rarity: "rare",
    unlock: 1,
  },
  credits: {
    id: "credits",
    name: "Credit Stack",
    kind: "loot",
    icon: "/game/icons/credits.png",
    desc: "Loose pts. Banks on extract.",
    use: "Walk over it. Sold automatically when you extract.",
    stack: 99,
    price: 40,
    rarity: "common",
    unlock: 1,
  },
};

export function item(id: string): ItemDef {
  return ITEMS[id] ?? ITEMS.pistol!;
}

export function emptyGrid(n: number): InvSlot[] {
  return Array.from({ length: n }, () => null);
}

export function padGrid(grid: InvSlot[] | undefined, n: number): InvSlot[] {
  const out: InvSlot[] = Array.isArray(grid) ? grid.slice(0, n).map((s) => (s && s.qty > 0 ? { ...s } : null)) : [];
  while (out.length < n) out.push(null);
  return out;
}

export function addToGrid(grid: InvSlot[], defId: string, qty = 1): boolean {
  const def = item(defId);
  let left = qty;
  if (def.stack > 1) {
    for (const s of grid) {
      if (!s || s.def !== defId) continue;
      const room = def.stack - s.qty;
      const take = Math.min(room, left);
      s.qty += take;
      left -= take;
      if (left <= 0) return true;
    }
  }
  for (let i = 0; i < grid.length; i++) {
    if (grid[i]) continue;
    const take = Math.min(def.stack, left);
    grid[i] = { def: defId, qty: take };
    left -= take;
    if (left <= 0) return true;
  }
  return left <= 0;
}

export function takeSlot(grid: InvSlot[], index: number, qty = 1): InvSlot {
  const s = grid[index];
  if (!s) return null;
  const take = Math.min(qty, s.qty);
  s.qty -= take;
  if (s.qty <= 0) grid[index] = null;
  return { def: s.def, qty: take };
}

export function placeSlot(grid: InvSlot[], index: number, incoming: NonNullable<InvSlot>): InvSlot {
  const cur = grid[index];
  if (!cur) {
    grid[index] = incoming;
    return null;
  }
  if (cur.def === incoming.def && item(cur.def).stack > 1) {
    const room = item(cur.def).stack - cur.qty;
    const take = Math.min(room, incoming.qty);
    cur.qty += take;
    incoming.qty -= take;
    return incoming.qty > 0 ? incoming : null;
  }
  grid[index] = incoming;
  return cur;
}

export function gridValue(grid: InvSlot[]): number {
  let n = 0;
  for (const s of grid) {
    if (!s) continue;
    n += item(s.def).price * s.qty;
  }
  return n;
}

export function xpToNext(level: number): number {
  return 180 + level * 120;
}

export function slotAccepts(bag: string, defId: string): boolean {
  const k = item(defId).kind;
  if (bag === "weapon") return k === "weapon";
  if (bag === "armor") return k === "armor";
  if (bag === "mod") return k === "upgrade";
  if (bag === "consumable") return k === "consumable" || k === "special";
  return true;
}

export const RARITY_TINT: Record<Rarity, string> = {
  common: "border-border",
  rare: "border-cyan/50",
  epic: "border-magenta/60",
};

export const RUN_SHOP: string[] = ["medkit", "grenade", "jacket", "chip", "speed", "vest", "shield", "drone"];
export const HIDEOUT_STOCK: string[] = [
  "smg",
  "shotgun",
  "rifle",
  "plasma",
  "jacket",
  "vest",
  "exo",
  "chip",
  "speed",
  "medkit",
  "grenade",
  "shield",
  "drone",
];
