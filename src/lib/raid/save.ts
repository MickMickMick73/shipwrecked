import { addToGrid, emptyGrid, item, padGrid, CON_N, STASH_N, type InvSlot } from "./items";

const KEY = "neon-raid-save-v1";

export type Profile = {
  v: 2;
  credits: number;
  xp: number;
  level: number;
  stash: InvSlot[];
  weapon: InvSlot[];
  armor: InvSlot[];
  mod: InvSlot[];
  consumable: InvSlot[];
  extracts: number;
  deaths: number;
  best: number;
};

export function defaultProfile(): Profile {
  const weapon = emptyGrid(1);
  weapon[0] = { def: "pistol", qty: 1 };
  const consumable = emptyGrid(CON_N);
  consumable[0] = { def: "medkit", qty: 3 };
  return {
    v: 2,
    credits: 80,
    xp: 0,
    level: 1,
    stash: emptyGrid(STASH_N),
    weapon,
    armor: emptyGrid(1),
    mod: emptyGrid(1),
    consumable,
    extracts: 0,
    deaths: 0,
    best: 0,
  };
}

function migrate(raw: Record<string, unknown>): Profile {
  const base = defaultProfile();
  if (typeof raw.credits === "number") base.credits = raw.credits;
  if (typeof raw.xp === "number") base.xp = raw.xp;
  if (typeof raw.level === "number") base.level = raw.level;
  if (typeof raw.extracts === "number") base.extracts = raw.extracts;
  if (typeof raw.deaths === "number") base.deaths = raw.deaths;
  if (typeof raw.best === "number") base.best = raw.best;
  if (Array.isArray(raw.stash)) base.stash = padGrid(raw.stash as InvSlot[], STASH_N);
  if (Array.isArray(raw.weapon)) base.weapon = padGrid(raw.weapon as InvSlot[], 1);
  if (Array.isArray(raw.armor)) base.armor = padGrid(raw.armor as InvSlot[], 1);
  if (Array.isArray(raw.mod)) base.mod = padGrid(raw.mod as InvSlot[], 1);
  if (Array.isArray(raw.consumable)) base.consumable = padGrid(raw.consumable as InvSlot[], CON_N);
  const oldBar = Array.isArray(raw.hotbar) ? (raw.hotbar as InvSlot[]) : [];
  for (const s of oldBar) {
    if (!s) continue;
    const k = item(s.def).kind;
    if (k === "weapon" && !base.weapon[0]) base.weapon[0] = { ...s };
    else if (k === "armor" && !base.armor[0]) base.armor[0] = { ...s };
    else if (k === "upgrade" && !base.mod[0]) base.mod[0] = { ...s };
    else if (k === "consumable" || k === "special") addToGrid(base.consumable, s.def, s.qty);
    else addToGrid(base.stash, s.def, s.qty);
  }
  if (!base.weapon[0]) base.weapon[0] = { def: "pistol", qty: 1 };
  base.v = 2;
  return base;
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p) return defaultProfile();
    return migrate(p);
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function cloneGrid(g: InvSlot[]): InvSlot[] {
  return g.map((s) => (s ? { ...s } : null));
}
