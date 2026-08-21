import { drawCell, drawPacked, loadRaidArt, type RaidArt, type SheetName } from "./assets";
import { sfx, unlockAudio } from "./audio";
import {
  addToGrid,
  BAG_N,
  emptyGrid,
  gridValue,
  CON_N,
  item,
  ITEMS,
  padGrid,
  placeSlot,
  RUN_SHOP,
  slotAccepts,
  takeSlot,
  xpToNext,
  type InvSlot,
} from "./items";
import { cloneGrid, loadProfile, saveProfile, type Profile } from "./save";
import {
  CHUNK_W,
  GROUND,
  generateRun,
  makeWorldGen,
  reachableSolids,
  type Chunk,
  type EnemyKind,
  type Landmark,
  type Solid,
  type WorldGen,
  VH,
  VW,
} from "./procgen";
import { missionForLevel, missionLabel, type Mission } from "./missions";

export type Phase = "hideout" | "play" | "dead" | "extracted";
export type Modal = null | "inv" | "shop";
export type BagId = "stash" | "bag" | "consumable" | "weapon" | "armor" | "mod";
export type DragState = { from: BagId; index: number } | null;

export type HudSnap = {
  phase: Phase;
  modal: Modal;
  hp: number;
  hpMax: number;
  score: number;
  combo: number;
  dist: number;
  seed: number;
  best: number;
  kind: string;
  level: number;
  xp: number;
  xpNext: number;
  credits: number;
  extracts: number;
  deaths: number;
  hotbar: InvSlot[];
  stash: InvSlot[];
  bag: InvSlot[];
  equipped: number;
  weaponSlot: number;
  weapon: InvSlot;
  armor: InvSlot;
  mod: InvSlot;
  consumable: InvSlot[];
  armorHp: number;
  armorMax: number;
  briefing: boolean;
  missionHow: string;
  interact: "shop" | "extract" | null;
  extractT: number;
  prompt: string;
  lootValue: number;
  shopStock: { def: string; price: number }[];
  leveled: boolean;
  drag: DragState;
  missionTitle: string;
  missionBrief: string;
  missionLabel: string;
  missionCur: number;
  missionTarget: number;
  missionDone: boolean;
  district: string;
};

type Actor = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  grounded: boolean;
  anim: string;
  frame: number;
  t: number;
};

type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  from: "player" | "enemy";
  live: boolean;
  dmg: number;
  kind: "bolt" | "grenade" | "needle";
};
type Enemy = Actor & { kind: EnemyKind; shootCd: number; hurtT: number; live: boolean };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; frame: number };
type PickupA = { x: number; y: number; frame: number; live: boolean; def: string };
type LootPop = { x: number; y: number; def: string; t: number; life: number; vy: number };

const GRAV_UP = 1500;
const GRAV_DOWN = 2480;
const JUMP_V = -710;
const DOUBLE_V = -650;
const TERM = 980;
const RUN = 310;
const AIR = 255;
const COYOTE = 0.11;
const BUFFER = 0.13;
const PLAYER_W = 34;
const PLAYER_H = 70;
const HERO_H = 92;

function aabb(ax: number, ay: number, aw: number, ah: number, b: { x: number; y: number; w: number; h: number }) {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

export class NeonRaid {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  art: RaidArt | null = null;
  keys = new Set<string>();
  stickX = 0;
  jumpHeld = false;
  jumpPressed = false;
  shootHeld = false;
  dropHeld = false;
  interactHeld = false;
  phase: Phase = "hideout";
  modal: Modal = null;
  seed = (Date.now() ^ 0x9e3779b9) >>> 0;
  gen: WorldGen = makeWorldGen(this.seed);
  chunks: Chunk[] = [];
  spawned = new Set<string>();
  player: Actor;
  bullets: Bullet[] = [];
  enemies: Enemy[] = [];
  sparks: Spark[] = [];
  pickups: PickupA[] = [];
  lootPops: LootPop[] = [];
  camX = 0;
  camY = 0;
  shake = 0;
  hp = 5;
  hpMax = 5;
  score = 0;
  combo = 0;
  comboT = 0;
  iframes = 0;
  coyote = 0;
  buffer = 0;
  airJumps = 1;
  cutJump = false;
  shootCd = 0;
  hurtT = 0;
  muzzleT = 0;
  best = 0;
  rain: { x: number; y: number; z: number }[] = [];
  last = 0;
  acc = 0;
  raf = 0;
  running = false;
  profile: Profile = loadProfile();
  bag: InvSlot[] = emptyGrid(BAG_N);
  runWeapon: InvSlot[] = emptyGrid(1);
  runArmor: InvSlot[] = emptyGrid(1);
  runMod: InvSlot[] = emptyGrid(1);
  runConsumable: InvSlot[] = emptyGrid(CON_N);
  equipped = 0;
  weaponSlot = 0;
  armorHp = 0;
  armorMax = 0;
  briefing = false;
  drag: DragState = null;
  aimX = 400;
  aimY = 360;
  mouseOn = false;
  upgrades = { dmg: 0, spd: 0, rate: 0 };
  extractT = 0;
  interact: "shop" | "extract" | null = null;
  shopStock: { def: string; price: number }[] = [];
  leveled = false;
  runXp = 0;
  mission: Mission = missionForLevel(1);
  runKills = 0;
  runLoot = 0;
  runCores = 0;
  runMaxX = 4000;
  reinforceT = 0;
  listeners: ((h: HudSnap) => void)[] = [];
  private iconCache = new Map<string, HTMLImageElement>();
  private bound = false;

  onHud(fn: (h: HudSnap) => void) {
    this.listeners.push(fn);
    fn(this.snap());
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d");
    this.ctx = ctx;
    this.player = this.freshPlayer();
    this.profile = loadProfile();
    this.mission = missionForLevel(this.profile.level);
    this.best = this.profile.best;
    this.hpMax = 5 + Math.floor((this.profile.level - 1) / 2);
    this.hp = this.hpMax;
    try {
      this.best = Math.max(this.best, Number(localStorage.getItem("neon-raid-best") || "0") || 0);
    } catch {
      /* ignore */
    }
    for (let i = 0; i < 70; i++) {
      this.rain.push({ x: Math.random() * VW, y: Math.random() * VH, z: 0.6 + Math.random() * 1.4 });
    }
  }

  freshPlayer(): Actor {
    return {
      x: 180,
      y: GROUND - PLAYER_H,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 0,
      vy: 0,
      facing: 1,
      hp: this.hpMax,
      grounded: true,
      anim: "idle",
      frame: 0,
      t: 0,
    };
  }

  async boot() {
    this.art = await loadRaidArt();
    this.bind();
    this.running = true;
    this.last = performance.now();
    this.loop(this.last);
    this.emit();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unbind();
  }

  private keyDown = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp") {
      if (!this.jumpHeld) this.jumpPressed = true;
      this.jumpHeld = true;
    }
    if (e.code === "KeyJ" || e.code === "KeyK" || e.code === "KeyX" || e.code === "KeyC") this.shootHeld = true;
    if (e.code === "KeyS" || e.code === "ArrowDown") this.dropHeld = true;
    if (e.code === "KeyE") this.interactHeld = true;
    if (e.code === "KeyI" || e.code === "Tab") {
      e.preventDefault();
      this.toggleInv();
    }
    if (e.code === "Escape") {
      this.modal = null;
      this.emit();
    }
    const digit = e.code.match(/^Digit([1-4])$/);
    if (digit) this.tapHotbar(Number(digit[1]) - 1);
    if (this.briefing && (e.code === "Space" || e.code === "Enter" || e.code === "KeyE" || e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyD")) {
      this.briefing = false;
      this.emit();
    }
    if (this.phase === "hideout" && e.code === "Enter") this.startRun();
    if (this.phase === "dead" && e.code === "KeyR") this.goHideout();
    if (this.phase === "extracted" && (e.code === "Enter" || e.code === "Space")) this.goHideout();
  };
  private keyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp") this.jumpHeld = false;
    if (e.code === "KeyJ" || e.code === "KeyK" || e.code === "KeyX" || e.code === "KeyC") this.shootHeld = false;
    if (e.code === "KeyS" || e.code === "ArrowDown") this.dropHeld = false;
    if (e.code === "KeyE") this.interactHeld = false;
  };
  private blur = () => {
    this.keys.clear();
    this.jumpHeld = false;
    this.shootHeld = false;
    this.stickX = 0;
    this.interactHeld = false;
  };

  private ptrDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.updateAim(e);
    if (this.briefing) {
      this.briefing = false;
      this.emit();
      return;
    }
    if (this.phase === "play" && !this.modal) this.shootHeld = true;
  };
  private ptrUp = () => {
    this.shootHeld = false;
  };
  private ptrMove = (e: PointerEvent) => {
    this.updateAim(e);
  };
  private updateAim(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width;
    const sy = (e.clientY - r.top) / r.height;
    this.aimX = this.camX + sx * VW;
    this.aimY = this.camY + sy * VH;
    this.mouseOn = true;
  }
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
  };

  bind() {
    if (this.bound) return;
    this.bound = true;
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.blur);
    this.canvas.addEventListener("pointerdown", this.ptrDown);
    this.canvas.addEventListener("pointerup", this.ptrUp);
    this.canvas.addEventListener("pointercancel", this.ptrUp);
    this.canvas.addEventListener("pointermove", this.ptrMove);
    window.addEventListener("pointermove", this.ptrMove);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.__controlsTest = {
      getX: () => this.player.x,
      getVx: () => this.player.vx,
      getSpeed: () => Math.abs(this.player.vx),
      setKeys: (codes: string[]) => {
        this.keys = new Set(codes);
        this.stickX = 0;
        if (codes.includes("KeyA") || codes.includes("ArrowLeft")) this.stickX -= 1;
        if (codes.includes("KeyD") || codes.includes("ArrowRight")) this.stickX += 1;
      },
    };
  }
  unbind() {
    this.bound = false;
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.blur);
    this.canvas.removeEventListener("pointerdown", this.ptrDown);
    this.canvas.removeEventListener("pointerup", this.ptrUp);
    this.canvas.removeEventListener("pointercancel", this.ptrUp);
    this.canvas.removeEventListener("pointermove", this.ptrMove);
    window.removeEventListener("pointermove", this.ptrMove);
    this.canvas.removeEventListener("wheel", this.onWheel);
    delete window.__controlsTest;
  }

  startRun(seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) {
    unlockAudio();
    sfx.ui();
    this.seed = seed >>> 0;
    this.gen = makeWorldGen(this.seed);
    this.chunks = [];
    this.spawned.clear();
    this.enemies = [];
    this.bullets = [];
    this.sparks = [];
    this.pickups = [];
    this.lootPops = [];
    this.hpMax = 5 + Math.floor((this.profile.level - 1) / 2);
    this.hp = this.hpMax;
    this.score = 0;
    this.combo = 0;
    this.comboT = 0;
    this.iframes = 0;
    this.airJumps = 1;
    this.player = this.freshPlayer();
    this.camX = 0;
    this.camY = 0;
    this.bag = emptyGrid(BAG_N);
    this.runWeapon = padGrid(this.profile.weapon, 1);
    if (!this.runWeapon[0]) this.runWeapon[0] = { def: "pistol", qty: 1 };
    this.runArmor = padGrid(this.profile.armor, 1);
    this.runMod = padGrid(this.profile.mod, 1);
    this.runConsumable = padGrid(this.profile.consumable, CON_N);
    this.weaponSlot = 0;
    this.equipped = 0;
    this.drag = null;
    this.upgrades = { dmg: 0, spd: 0, rate: 0 };
    const mod = this.runMod[0]?.def;
    if (mod === "chip") this.upgrades.dmg += 1;
    if (mod === "speed") {
      this.upgrades.spd += 1;
      this.upgrades.rate += 1;
    }
    const absorb = this.runArmor[0] ? (item(this.runArmor[0].def).absorb ?? 0) : 0;
    this.armorMax = absorb;
    this.armorHp = absorb;
    this.extractT = 0;
    this.modal = null;
    this.shopStock = [];
    this.leveled = false;
    this.runXp = 0;
    this.runKills = 0;
    this.runLoot = 0;
    this.runCores = 0;
    this.reinforceT = 0;
    this.mission = missionForLevel(this.profile.level);
    this.chunks = generateRun(this.gen, this.mission.districts, this.mission.chunks, {
      kills: this.mission.kind === "kills" ? this.mission.target + 8 : 10,
      cores: this.mission.kind === "cores" ? this.mission.target + 2 : 0,
      loot: this.mission.kind === "loot" ? this.mission.target + 2 : 0,
    });
    this.spawned.clear();
    for (const ch of this.chunks) {
      for (const s of ch.spawns) {
        const key = `${ch.i}:${s.x}:${s.kind}`;
        if (this.spawned.has(key)) continue;
        this.spawned.add(key);
        this.enemies.push(this.mkEnemy(s.kind, s.x, s.y));
      }
      for (const p of ch.pickups) {
        const def = p.def ?? (this.mission.kind === "cores" && Math.random() < 0.55 ? "core" : "medkit");
        this.pickups.push({ ...p, live: true, def });
      }
    }
    const extract = this.landmarks().find((m) => m.kind === "extract");
    this.runMaxX = extract ? extract.x + extract.w - 24 : this.chunks.length * CHUNK_W - 80;
    this.phase = "play";
    this.briefing = true;
    this.canvas.style.cursor = "none";
    this.emit();
  }

  dismissBriefing() {
    if (!this.briefing) return;
    this.briefing = false;
    this.emit();
  }

  goHideout() {
    this.phase = "hideout";
    this.modal = null;
    this.canvas.style.cursor = "";
    this.mission = missionForLevel(this.profile.level);
    this.emit();
  }

  rerollSeed() {
    this.seed = (this.seed + 0x9e3779b9) >>> 0;
    this.emit();
  }

  snap(): HudSnap {
    const kind = this.chunks.find((c) => this.player.x >= c.x && this.player.x < c.x + c.w)?.kind ?? "street";
    const hotbar = padGrid(this.phase === "play" ? this.runConsumable : this.profile.consumable, CON_N);
    const weapon = (this.phase === "play" ? this.runWeapon : this.profile.weapon)[0] ?? null;
    const armor = (this.phase === "play" ? this.runArmor : this.profile.armor)[0] ?? null;
    const mod = (this.phase === "play" ? this.runMod : this.profile.mod)[0] ?? null;
    let prompt = "";
    if (this.phase === "play" && this.interact === "shop") prompt = "E  open shop";
    if (this.phase === "play" && this.interact === "extract") {
      prompt = this.missionComplete() ? "Hold E  extract" : `Mission incomplete · ${this.missionHint()}`;
    }
    const prog = this.missionProgress();
    return {
      phase: this.phase,
      modal: this.modal,
      hp: this.hp,
      hpMax: this.hpMax,
      score: this.score,
      combo: this.combo,
      dist: Math.max(0, this.player.x - 180),
      seed: this.seed,
      best: this.best,
      kind,
      level: this.profile.level,
      xp: this.profile.xp,
      xpNext: xpToNext(this.profile.level),
      credits: this.profile.credits,
      extracts: this.profile.extracts,
      deaths: this.profile.deaths,
      hotbar,
      stash: padGrid(this.profile.stash, 20),
      bag: padGrid(this.bag, BAG_N),
      equipped: this.equipped,
      weaponSlot: this.weaponSlot,
      weapon,
      armor,
      mod,
      consumable: hotbar,
      armorHp: this.armorHp,
      armorMax: this.armorMax,
      briefing: this.briefing,
      missionHow: this.mission.how,
      interact: this.interact,
      extractT: this.extractT,
      prompt,
      lootValue: gridValue(this.bag),
      shopStock: this.shopStock,
      leveled: this.leveled,
      drag: this.drag,
      missionTitle: this.mission.title,
      missionBrief: this.mission.brief,
      missionLabel: missionLabel(this.mission.kind),
      missionCur: prog.cur,
      missionTarget: prog.target,
      missionDone: prog.done,
      district: this.mission.palette.name,
    };
  }
  emit() {
    const s = this.snap();
    for (const f of this.listeners) f(s);
  }

  setStick(x: number) {
    this.stickX = Math.max(-1, Math.min(1, x));
  }
  setJump(held: boolean, pressed?: boolean) {
    if (pressed) this.jumpPressed = true;
    this.jumpHeld = held;
  }
  setShoot(held: boolean) {
    this.shootHeld = held;
  }
  setDrop(held: boolean) {
    this.dropHeld = held;
  }
  setInteract(held: boolean) {
    this.interactHeld = held;
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += raw;
    const step = 1 / 60;
    while (this.acc >= step) {
      this.tick(step);
      this.acc -= step;
    }
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private inputX() {
    let x = this.stickX;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    return Math.max(-1, Math.min(1, x));
  }

  private solids(): Solid[] {
    return reachableSolids(this.chunks);
  }

  private ensureChunks() {
    /* finite run — generated in startRun */
  }

  private tickReinforce(dt: number) {
    if (this.mission.kind !== "kills") return;
    const need = this.mission.target - this.runKills;
    if (need <= 0) return;
    const live = this.enemies.filter((e) => e.live).length;
    this.reinforceT -= dt;
    if (live >= Math.min(5, need) || this.reinforceT > 0) return;
    if (this.player.x > this.runMaxX - 260) return;
    this.reinforceT = 2.4;
    const kinds: EnemyKind[] = ["enforcer", "crawler", "drone", "bruiser", "sniper", "bomber", "flyer"];
    const n = Math.min(2, Math.max(1, need - live));
    for (let i = 0; i < n; i++) {
      const kind = kinds[(this.runKills + i) % kinds.length]!;
      const ahead = this.player.x + 420 + i * 80;
      const air = kind === "flyer" || kind === "drone" || kind === "bomber";
      this.enemies.push(
        this.mkEnemy(kind, Math.min(ahead, this.runMaxX - 80), air ? this.player.y - 80 : GROUND - (kind === "crawler" ? 32 : 78)),
      );
    }
  }

  private missionProgress() {
    const target = this.mission.target;
    let cur = 0;
    if (this.mission.kind === "kills") cur = this.runKills;
    else if (this.mission.kind === "cores") cur = this.runCores;
    else if (this.mission.kind === "loot") cur = this.runLoot;
    else if (this.mission.kind === "score") cur = this.score;
    else cur = this.interact === "extract" || this.player.x >= this.runMaxX - 120 ? 1 : 0;
    return { cur: Math.min(cur, target), target, done: cur >= target };
  }

  missionComplete() {
    return this.missionProgress().done;
  }

  private missionHint() {
    const p = this.missionProgress();
    if (this.mission.kind === "reach") return "Reach the pad";
    return `${p.cur}/${p.target} ${missionLabel(this.mission.kind).toLowerCase()}`;
  }

  private mkEnemy(kind: EnemyKind, x: number, y: number): Enemy {
    const spec: Record<EnemyKind, { w: number; h: number; hp: number; grounded: boolean; vx: number }> = {
      enforcer: { w: 36, h: 74, hp: 3, grounded: true, vx: -70 },
      bruiser: { w: 52, h: 86, hp: 6, grounded: true, vx: -40 },
      sniper: { w: 36, h: 74, hp: 3, grounded: true, vx: 0 },
      crawler: { w: 46, h: 28, hp: 2, grounded: true, vx: -140 },
      drone: { w: 42, h: 36, hp: 2, grounded: false, vx: 0 },
      flyer: { w: 42, h: 36, hp: 2, grounded: false, vx: 0 },
      bomber: { w: 40, h: 36, hp: 2, grounded: false, vx: 0 },
    };
    const s = spec[kind];
    return {
      x,
      y,
      w: s.w,
      h: s.h,
      vx: s.vx,
      vy: 0,
      facing: -1,
      hp: s.hp,
      grounded: s.grounded,
      anim: "idle",
      frame: 0,
      t: 0,
      kind,
      shootCd: 0.4 + Math.random(),
      hurtT: 0,
      live: true,
    };
  }

  private moveSolid(a: Actor, dt: number, onewayPass: boolean) {
    const solids = this.solids();
    const steps = Math.max(1, Math.ceil((Math.abs(a.vx) * dt) / 24), Math.ceil((Math.abs(a.vy) * dt) / 24));
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      a.x += a.vx * sdt;
      for (const b of solids) {
        if (b.oneway) continue;
        if (!aabb(a.x, a.y, a.w, a.h, b)) continue;
        if (a.vx > 0) a.x = b.x - a.w;
        else if (a.vx < 0) a.x = b.x + b.w;
        a.vx = 0;
      }
      const prevBottom = a.y + a.h;
      a.y += a.vy * sdt;
      a.grounded = false;
      for (const b of solids) {
        if (!aabb(a.x, a.y, a.w, a.h, b)) continue;
        if (b.oneway) {
          if (a.vy < 0 || onewayPass) continue;
          if (prevBottom > b.y + 8) continue;
        }
        if (a.vy >= 0) {
          a.y = b.y - a.h;
          a.vy = 0;
          a.grounded = true;
        } else if (!b.oneway) {
          a.y = b.y + b.h;
          a.vy = 0;
        }
      }
    }
  }

  private tick(dt: number) {
    if (this.phase !== "play" || this.modal || this.briefing) {
      this.jumpPressed = false;
      return;
    }
    this.ensureChunks();
    this.tickReinforce(dt);
    const p = this.player;
    const ix = this.inputX();
    const mx = this.aimX;
    if (this.mouseOn && Math.abs(mx - (p.x + p.w / 2)) > 10) {
      p.facing = mx >= p.x + p.w / 2 ? 1 : -1;
    } else {
      if (ix < 0) p.facing = -1;
      if (ix > 0) p.facing = 1;
    }

    const spdMul = 1 + this.upgrades.spd * 0.12;
    const spd = (p.grounded ? RUN : AIR) * spdMul;
    const target = ix * spd;
    const acc = p.grounded ? 2400 : 1400;
    if (ix === 0 && p.grounded) p.vx += (0 - p.vx) * Math.min(1, dt * 14);
    else if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
    else p.vx = Math.max(target, p.vx - acc * dt);

    if (p.grounded) {
      this.coyote = COYOTE;
      this.airJumps = 1;
    } else this.coyote -= dt;
    if (this.jumpPressed) this.buffer = BUFFER;
    this.buffer -= dt;
    this.jumpPressed = false;
    if (this.buffer > 0 && this.coyote > 0) {
      p.vy = JUMP_V;
      p.grounded = false;
      this.coyote = 0;
      this.buffer = 0;
      this.cutJump = false;
      sfx.jump();
    } else if (this.buffer > 0 && this.airJumps > 0 && !p.grounded) {
      p.vy = DOUBLE_V;
      this.airJumps = 0;
      this.buffer = 0;
      this.cutJump = false;
      sfx.jump();
    }
    if (!this.jumpHeld && p.vy < 0 && !this.cutJump) {
      p.vy *= 0.48;
      this.cutJump = true;
    }
    const apex = p.vy > -80 && p.vy < 90 && !p.grounded;
    const g = p.vy < 0 ? GRAV_UP : GRAV_DOWN;
    p.vy += (apex ? g * 0.5 : g) * dt;
    if (p.vy > TERM) p.vy = TERM;

    this.moveSolid(p, dt, this.dropHeld && this.jumpHeld);
    if (p.x > this.runMaxX) {
      p.x = this.runMaxX;
      if (p.vx > 0) p.vx = 0;
    }
    if (p.x < 40) p.x = 40;

    this.shootCd -= dt;
    this.muzzleT -= dt;
    if (this.shootHeld && this.shootCd <= 0 && this.hurtT <= 0) {
      this.fireEquipped();
    }

    this.iframes -= dt;
    this.hurtT -= dt;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    this.shake *= Math.max(0, 1 - dt * 8);

    this.tickEnemies(dt);
    this.tickBullets(dt);
    this.tickSparks(dt);
    this.tickPickups(dt);
    this.tickInteract(dt);

    p.t += dt;
    let next = p.anim;
    if (this.hurtT > 0) next = "hurt";
    else if (!p.grounded) next = "jump";
    else if (this.muzzleT > 0 && Math.abs(p.vx) < 36) next = "shoot";
    else if (Math.abs(p.vx) > (p.anim === "run" ? 22 : 48)) next = "run";
    else next = "idle";
    if (next !== p.anim) {
      p.anim = next;
      p.frame = 0;
    }
    if (p.anim === "jump") {
      if (p.vy < -300) p.frame = 1;
      else if (p.vy < 90) p.frame = 2;
      else p.frame = 3;
    } else if (p.anim === "hurt") {
      p.frame = Math.min(3, (0.28 - this.hurtT) * 14);
    } else {
      p.frame += dt * (p.anim === "run" ? 9 : 5.5);
    }

    const look = p.facing * 160;
    const tx = p.x - VW * 0.32 + look;
    const ty = p.y - VH * 0.55;
    this.camX += (tx - this.camX) * Math.min(1, dt * 5.5);
    this.camY += (ty - this.camY) * Math.min(1, dt * 3.2);
    if (this.camX < 0) this.camX = 0;
    this.camY = Math.max(-80, Math.min(80, this.camY));

    if (p.y > VH + 80) this.kill();
    this.emit();
  }

  private fireEquipped() {
    const slot = this.runWeapon[0];
    if (!slot) {
      this.shootCd = 0.2;
      return;
    }
    const w = item(slot.def);
    const p = this.player;
    const ox = p.x + p.w * 0.5;
    const oy = p.y + p.h * 0.38;
    const ang = Math.atan2(this.aimY - oy, this.aimX - ox);
    const n = w.pellets ?? 1;
    const dmg = (w.damage ?? 1) + this.upgrades.dmg;
    const spd = w.speed ?? 800;
    for (let i = 0; i < n; i++) {
      const a = ang + (Math.random() - 0.5) * (w.spread ?? 0) * 2;
      this.spawnBullet(ox + Math.cos(a) * 26, oy + Math.sin(a) * 18, Math.cos(a) * spd, Math.sin(a) * spd, "player", dmg);
    }
    const rate = (w.fireRate ?? 6) * (1 + this.upgrades.rate * 0.16);
    this.shootCd = 1 / Math.max(0.8, rate);
    this.muzzleT = 0.07;
    sfx.shoot();
  }

  tapHotbar(i: number) {
    if (i < 0 || i >= CON_N) return;
    this.equipped = i;
    if (this.phase === "play") this.activateSlot(i);
    this.emit();
  }

  private activateSlot(index: number) {
    const slot = this.runConsumable[index];
    if (!slot) return;
    const def = item(slot.def);
    const p = this.player;
    const ox = p.x + p.w * 0.5;
    const oy = p.y + p.h * 0.38;
    const ang = Math.atan2(this.aimY - oy, this.aimX - ox);
    if (def.kind === "consumable") this.useConsumable(index);
    else if (def.kind === "special") {
      this.useSpecial(def.id, ang, ox, oy);
      takeSlot(this.runConsumable, index, 1);
    }
  }

  private useConsumable(index: number) {
    const slot = this.runConsumable[index];
    if (!slot) return;
    const def = item(slot.def);
    if (def.heal) {
      this.hp = Math.min(this.hpMax, this.hp + def.heal);
      takeSlot(this.runConsumable, index, 1);
      sfx.pickup();
      this.emit();
    }
  }

  private useUpgrade(id: string) {
    if (id === "chip") this.upgrades.dmg += 1;
    if (id === "speed") {
      this.upgrades.spd += 1;
      this.upgrades.rate += 1;
    }
  }

  private useSpecial(id: string, ang: number, ox: number, oy: number) {
    if (id === "grenade") {
      const spd = 420;
      this.spawnBullet(ox, oy, Math.cos(ang) * spd, Math.sin(ang) * spd - 120, "player", item("grenade").damage ?? 4, "grenade");
      sfx.boom();
    } else if (id === "shield") {
      this.iframes = Math.max(this.iframes, 2.2);
      sfx.shop();
    } else if (id === "drone") {
      const dmg = item("drone").damage ?? 2;
      for (let i = -1; i <= 1; i++) {
        const a = ang + i * 0.18;
        this.spawnBullet(ox, oy, Math.cos(a) * 640, Math.sin(a) * 640, "player", dmg, "needle");
      }
      sfx.shoot();
    }
  }

  private spawnBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    from: "player" | "enemy",
    dmg = 1,
    kind: Bullet["kind"] = "bolt",
  ) {
    const slot = this.bullets.find((b) => !b.live);
    const b: Bullet = slot ?? { x, y, vx, vy, life: 1.1, from, live: true, dmg, kind };
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.life = kind === "grenade" ? 0.85 : from === "player" ? 0.95 : 1.4;
    b.from = from;
    b.live = true;
    b.dmg = dmg;
    b.kind = kind;
    if (!slot) this.bullets.push(b);
  }

  private tickBullets(dt: number) {
    for (const b of this.bullets) {
      if (!b.live) continue;
      if (b.kind === "grenade") b.vy += 980 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.kind === "grenade" && b.life <= 0) {
        this.explode(b.x, b.y, b.dmg, 110);
        b.live = false;
        continue;
      }
      if (b.life <= 0) {
        b.live = false;
        continue;
      }
      if (b.from === "player") {
        for (const e of this.enemies) {
          if (!e.live) continue;
          if (!aabb(b.x - 8, b.y - 8, 16, 16, e)) continue;
          if (b.kind === "grenade") {
            this.explode(b.x, b.y, b.dmg, 110);
            b.live = false;
            break;
          }
          b.live = false;
          this.hurtEnemy(e, b.dmg);
          this.spark(b.x, b.y);
          break;
        }
      } else if (this.iframes <= 0 && aabb(b.x - 6, b.y - 6, 12, 12, this.player)) {
        b.live = false;
        this.hurtPlayer();
        this.spark(b.x, b.y);
      }
    }
  }

  private explode(x: number, y: number, dmg: number, r: number) {
    sfx.boom();
    this.shake = 12;
    for (let i = 0; i < 16; i++) this.spark(x, y);
    for (const e of this.enemies) {
      if (!e.live) continue;
      const dx = e.x + e.w / 2 - x;
      const dy = e.y + e.h / 2 - y;
      if (dx * dx + dy * dy < r * r) this.hurtEnemy(e, dmg);
    }
  }

  private hurtEnemy(e: Enemy, dmg = 1) {
    e.hp -= dmg;
    e.hurtT = 0.12;
    e.vx += this.player.facing * 80;
    this.shake = Math.max(this.shake, 4);
    sfx.hit();
    if (e.hp <= 0) {
      e.live = false;
      this.runKills += 1;
      this.combo += 1;
      this.comboT = 2.4;
      const base = e.kind === "flyer" ? 200 : e.kind === "drone" ? 150 : 100;
      this.score += base * Math.max(1, this.combo);
      this.grantXp(e.kind === "bruiser" ? 28 : e.kind === "sniper" ? 22 : e.kind === "flyer" ? 22 : e.kind === "drone" || e.kind === "bomber" ? 18 : 14);
      sfx.boom();
      this.shake = 8;
      for (let i = 0; i < 10; i++) this.spark(e.x + e.w / 2, e.y + e.h / 2);
      this.dropFromEnemy(e);
    }
  }

  private hurtPlayer() {
    if (this.iframes > 0) return;
    if (this.armorHp > 0) {
      this.armorHp -= 1;
      this.iframes = 0.7;
      this.hurtT = 0.18;
      this.shake = 8;
      sfx.hurt();
      this.emit();
      return;
    }
    this.hp -= 1;
    this.iframes = 0.9;
    this.hurtT = 0.28;
    this.player.vy = -240;
    this.player.vx = -this.player.facing * 180;
    this.shake = 10;
    this.combo = 0;
    sfx.hurt();
    if (this.hp <= 0) this.kill();
  }

  private kill() {
    if (this.phase !== "play") return;
    this.phase = "dead";
    this.modal = null;
    this.canvas.style.cursor = "";
    this.profile.deaths += 1;
    if (this.score > this.best) {
      this.best = this.score;
      this.profile.best = this.best;
    }
    this.bag = emptyGrid(BAG_N);
    saveProfile(this.profile);
    sfx.boom();
    this.emit();
  }

  private tickEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.live) continue;
      e.t += dt;
      e.shootCd -= dt;
      e.hurtT -= dt;
      e.frame += dt * 8;
      if (e.kind === "enforcer" || e.kind === "bruiser" || e.kind === "sniper" || e.kind === "crawler") {
        if (e.grounded && Math.abs(e.x - p.x) < 520) {
          e.facing = p.x < e.x ? -1 : 1;
          if (e.kind === "enforcer") e.vx = e.facing * 70;
          if (e.kind === "bruiser") e.vx = e.facing * 42;
          if (e.kind === "crawler") e.vx = e.facing * 150;
          if (e.kind === "sniper") e.vx = 0;
        }
        e.vy += GRAV_DOWN * dt;
        this.moveSolid(e, dt, false);
        if (e.shootCd <= 0 && Math.abs(e.x - p.x) < (e.kind === "sniper" ? 780 : 520) && Math.abs(e.y - p.y) < (e.kind === "sniper" ? 260 : 140)) {
          if (e.kind === "bruiser") {
            for (let k = -1; k <= 1; k++) this.spawnBullet(e.x + e.w / 2, e.y + 30, e.facing * 320, k * 70, "enemy", 1);
            e.shootCd = 1.8;
          } else if (e.kind === "sniper") {
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const m = Math.hypot(dx, dy) || 1;
            this.spawnBullet(e.x + e.w / 2, e.y + 22, (dx / m) * 520, (dy / m) * 520, "enemy", 1);
            e.shootCd = 2.1;
          } else if (e.kind === "crawler") {
            e.shootCd = 0.8;
          } else {
            this.spawnBullet(e.x + e.w / 2, e.y + 28, e.facing * 360, 0, "enemy", 1);
            e.shootCd = 1.35;
          }
        }
      } else if (e.kind === "drone") {
        e.y += Math.sin(e.t * 2.2) * 18 * dt;
        e.x += Math.sin(e.t * 0.7) * 24 * dt;
        e.facing = p.x < e.x ? -1 : 1;
        if (e.shootCd <= 0 && Math.abs(e.x - p.x) < 560) {
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          const m = Math.hypot(dx, dy) || 1;
          this.spawnBullet(e.x + e.w / 2, e.y + e.h / 2, (dx / m) * 280, (dy / m) * 280, "enemy", 1);
          e.shootCd = 1.7;
        }
      } else if (e.kind === "bomber") {
        e.facing = p.x < e.x ? -1 : 1;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const m = Math.hypot(dx, dy) || 1;
        e.x += (dx / m) * 70 * dt;
        e.y += (dy / m) * 50 * dt + Math.sin(e.t * 4) * 10 * dt;
        if (e.shootCd <= 0 && m < 220) {
          this.spawnBullet(e.x + 10, e.y + 10, (dx / m) * 120, 220, "enemy", 2, "grenade");
          e.shootCd = 2.4;
        }
      } else {
        e.facing = p.x < e.x ? -1 : 1;
        e.x += e.facing * 90 * dt;
        e.y += Math.sin(e.t * 3.1) * 40 * dt;
        if (e.shootCd <= 0 && Math.abs(e.x - p.x) < 480) {
          this.spawnBullet(e.x, e.y + 10, e.facing * 400, 40, "enemy", 1);
          e.shootCd = 1.5;
        }
      }
      if (this.iframes <= 0 && aabb(p.x, p.y, p.w, p.h, e)) this.hurtPlayer();
    }
  }

  private spark(x: number, y: number) {
    this.sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 260,
      vy: (Math.random() - 0.8) * 220,
      life: 0.28,
      max: 0.28,
      frame: 0,
    });
  }
  private tickSparks(dt: number) {
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 400 * dt;
      s.life -= dt;
      s.frame += dt * 16;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  private tickPickups(dt: number) {
    for (const p of this.pickups) {
      if (!p.live) continue;
      if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, { x: p.x, y: p.y, w: 40, h: 40 })) {
        if (addToGrid(this.bag, p.def, 1)) {
          p.live = false;
          this.score += 40;
          this.runLoot += 1;
          if (p.def === "core") this.runCores += 1;
          sfx.pickup();
          this.lootPops.push({ x: p.x + 18, y: p.y + 8, def: p.def, t: 0, life: 1.15, vy: -210 });
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            this.sparks.push({
              x: p.x + 18,
              y: p.y + 18,
              vx: Math.cos(a) * (80 + Math.random() * 140),
              vy: Math.sin(a) * (80 + Math.random() * 140) - 40,
              life: 0.28 + Math.random() * 0.2,
              max: 0.45,
              frame: 0,
            });
          }
          this.emit();
        }
      }
    }
    for (const pop of this.lootPops) {
      pop.t += dt;
      pop.y += pop.vy * dt;
      pop.vy += 240 * dt;
    }
    this.lootPops = this.lootPops.filter((p) => p.t < p.life);
  }

  private dropFromEnemy(e: Enemy) {
    const roll = Math.random();
    let def = "";
    if (this.mission.kind === "cores" && roll < 0.55) def = "core";
    else if (roll < 0.28) def = "core";
    else if (roll < 0.4) def = "credits";
    else if (roll < 0.48) def = "medkit";
    else if (roll < 0.52) def = "grenade";
    if (!def) return;
    this.pickups.push({ x: e.x + 8, y: e.y + e.h - 36, frame: 8, live: true, def });
  }

  private landmarks(): Landmark[] {
    const out: Landmark[] = [];
    for (const c of this.chunks) out.push(...c.landmarks);
    return out;
  }

  private tickInteract(dt: number) {
    const p = this.player;
    this.interact = null;
    for (const m of this.landmarks()) {
      if (aabb(p.x, p.y, p.w, p.h, { x: m.x - 20, y: m.y, w: m.w + 40, h: m.h + 20 })) {
        this.interact = m.kind;
        break;
      }
    }
    if (this.interact === "extract" && this.interactHeld) {
      if (!this.missionComplete()) {
        this.extractT = 0;
      } else {
        this.extractT += dt;
        if (this.extractT >= 1.8) this.doExtract();
      }
    } else if (this.interact === "shop" && this.interactHeld) {
      this.openShop();
      this.interactHeld = false;
    } else if (this.interact !== "extract") {
      this.extractT = Math.max(0, this.extractT - dt * 1.6);
    }
  }

  private openShop() {
    if (this.modal === "shop") return;
    const pool = RUN_SHOP.filter((id) => item(id).unlock <= this.profile.level);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    this.shopStock = shuffled.slice(0, 5).map((id) => ({ def: id, price: item(id).price }));
    this.modal = "shop";
    sfx.shop();
    this.emit();
  }

  buyShop(defId: string) {
    const row = this.shopStock.find((s) => s.def === defId);
    if (!row) return;
    if (this.score < row.price) return;
    if (!addToGrid(this.bag, defId, 1)) return;
    this.score -= row.price;
    sfx.pickup();
    this.emit();
  }

  buyHideout(defId: string) {
    const def = item(defId);
    if (this.profile.level < def.unlock) return;
    if (this.profile.credits < def.price) return;
    if (!addToGrid(this.profile.stash, defId, 1)) return;
    this.profile.credits -= def.price;
    saveProfile(this.profile);
    sfx.shop();
    this.emit();
  }

  private doExtract() {
    if (this.phase !== "play") return;
    if (!this.missionComplete()) return;
    this.phase = "extracted";
    this.modal = null;
    this.canvas.style.cursor = "";
    const loot = gridValue(this.bag);
    const bonus = Math.round(this.score * 0.6) + loot + Math.round(this.player.x / 8);
    this.profile.credits += bonus;
    for (const s of this.bag) {
      if (s) addToGrid(this.profile.stash, s.def, s.qty);
    }
    this.bag = emptyGrid(BAG_N);
    this.profile.extracts += 1;
    this.grantXp(this.mission.xp + Math.round(this.player.x / 40));
    if (this.score > this.best) {
      this.best = this.score;
      this.profile.best = this.best;
    }
    saveProfile(this.profile);
    sfx.extract();
    this.emit();
  }

  private grantXp(n: number) {
    this.runXp += n;
    this.profile.xp += n;
    let guard = 0;
    while (this.profile.xp >= xpToNext(this.profile.level) && guard++ < 8) {
      this.profile.xp -= xpToNext(this.profile.level);
      this.profile.level += 1;
      this.leveled = true;
      this.hpMax = 5 + Math.floor((this.profile.level - 1) / 2);
      this.hp = Math.min(this.hpMax, this.hp + 1);
      sfx.level();
    }
  }

  toggleInv() {
    if (this.phase === "dead" || this.phase === "extracted") return;
    if (this.modal === "inv" || this.modal === "shop") this.modal = null;
    else this.modal = "inv";
    this.emit();
  }

  closeModal() {
    this.modal = null;
    this.emit();
  }

  setEquipped(i: number) {
    this.tapHotbar(i);
  }

  beginDrag(from: BagId, index: number) {
    const g = this.bagOf(from);
    if (!g[index]) return;
    this.drag = { from, index };
  }

  dropTo(to: BagId, index: number) {
    if (!this.drag) return;
    if (!(this.drag.from === to && this.drag.index === index)) {
      this.moveItem(this.drag.from, this.drag.index, to, index);
    }
    this.drag = null;
    this.emit();
  }

  cancelDrag() {
    if (!this.drag) return;
    this.drag = null;
  }

  sendToHotbar(from: BagId, index: number) {
    const s = this.bagOf(from)[index];
    if (!s) return;
    const k = item(s.def).kind;
    let dest: BagId = "stash";
    if (k === "weapon") dest = "weapon";
    else if (k === "armor") dest = "armor";
    else if (k === "upgrade") dest = "mod";
    else if (k === "consumable" || k === "special") dest = "consumable";
    else dest = "stash";
    const grid = this.bagOf(dest);
    let ti = grid.findIndex((x) => !x);
    if (ti < 0) ti = dest === "consumable" ? CON_N - 1 : 0;
    this.moveItem(from, index, dest, ti);
  }

  bagOf(which: BagId): InvSlot[] {
    return this.grid(which);
  }

  moveItem(from: BagId, fi: number, to: BagId, ti: number) {
    if (from === to && fi === ti) return;
    const src = this.grid(from);
    const dst = this.grid(to);
    if (ti < 0 || ti >= dst.length || fi < 0 || fi >= src.length) return;
    const moving = src[fi];
    if (!moving) return;
    if (!slotAccepts(to, moving.def)) return;
    const taken = takeSlot(src, fi, moving.qty);
    if (!taken) return;
    const leftover = placeSlot(dst, ti, taken);
    if (leftover) {
      if (src[fi]) addToGrid(src, leftover.def, leftover.qty);
      else src[fi] = leftover;
    }
    this.syncGear();
    if (this.weaponSlot < 0 || !this.weaponAt(this.weaponSlot)) this.weaponSlot = 0;
    if (this.phase !== "play") saveProfile(this.profile);
    sfx.ui();
    this.emit();
  }

  private syncGear() {
    this.profile.weapon = padGrid(this.profile.weapon, 1);
    this.profile.armor = padGrid(this.profile.armor, 1);
    this.profile.mod = padGrid(this.profile.mod, 1);
    this.profile.consumable = padGrid(this.profile.consumable, CON_N);
    this.runWeapon = padGrid(this.runWeapon, 1);
    this.runArmor = padGrid(this.runArmor, 1);
    this.runMod = padGrid(this.runMod, 1);
    this.runConsumable = padGrid(this.runConsumable, CON_N);
  }

  private weaponAt(_i: number) {
    const g = this.phase === "play" ? this.runWeapon : this.profile.weapon;
    return !!(g[0] && item(g[0].def).kind === "weapon");
  }

  private grid(which: BagId): InvSlot[] {
    if (which === "stash") return this.profile.stash;
    if (which === "bag") return this.bag;
    if (which === "weapon") return this.phase === "play" ? this.runWeapon : this.profile.weapon;
    if (which === "armor") return this.phase === "play" ? this.runArmor : this.profile.armor;
    if (which === "mod") return this.phase === "play" ? this.runMod : this.profile.mod;
    return this.phase === "play" ? this.runConsumable : this.profile.consumable;
  }

  private draw() {
    const ctx = this.ctx;
    const { width: W, height: H } = this.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sx = W / VW;
    const sy = H / VH;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    const art = this.art;
    if (!art) {
      ctx.fillStyle = "#07080f";
      ctx.fillRect(0, 0, VW, VH);
      return;
    }
    const shx = (Math.random() - 0.5) * this.shake;
    const shy = (Math.random() - 0.5) * this.shake;
    const camX = this.camX + shx;
    const camY = this.camY + shy;

    const drawMap = (img: HTMLImageElement, factor: number, yOff = 0) => {
      const w = VW;
      const h = VH;
      const ox = -((camX * factor) % w);
      ctx.drawImage(img, ox, yOff - camY * factor * 0.15, w, h);
      ctx.drawImage(img, ox + w, yOff - camY * factor * 0.15, w, h);
    };

    if (this.phase === "hideout" || this.phase === "extracted" || this.phase === "dead") {
      ctx.drawImage(art.maps.title, 0, 0, VW, VH);
      ctx.fillStyle = "rgba(7,8,15,0.42)";
      ctx.fillRect(0, 0, VW, VH);
      this.drawRain(ctx, 0);
      return;
    }

    drawMap(art.maps.sky, 0.05, 0);
    drawMap(art.maps.far, 0.18, 8);
    drawMap(art.maps.mid, 0.38, 16);
    drawMap(art.maps.near, 0.62, 24);
    ctx.fillStyle = this.mission.palette.tint;
    ctx.fillRect(0, 0, VW, VH);

    ctx.save();
    ctx.translate(-camX, -camY);

    for (const ch of this.chunks) {
      for (const d of ch.deco) {
        this.drawDeco(ctx, art, d);
      }
      for (const s of ch.solids) {
        const tiles = Math.max(1, Math.round(s.w / 150));
        const tw = s.w / tiles;
        const visH = s.kind === "floor" ? s.h + 36 : s.h + 22;
        const visY = s.y - (s.kind === "floor" ? 8 : 4);
        for (let i = 0; i < tiles; i++) {
          let frame = 1;
          if (i === 0) frame = 0;
          else if (i === tiles - 1) frame = 2;
          else frame = s.tile === 3 ? 3 : 1;
          const img = s.kind === "floor" ? art.floor[frame]! : art.plat[frame]!;
          ctx.drawImage(img, s.x + i * tw, visY, tw, visH);
        }
      }
      for (const pr of ch.props) {
        const img = art.prop[pr.frame] ?? art.prop[0]!;
        ctx.drawImage(img, pr.x, pr.y, pr.w, pr.h);
      }
      for (const m of ch.landmarks) {
        const floorY = m.y + m.h;
        if (m.kind === "shop") this.drawShopKiosk(ctx, m.x + m.w / 2, floorY);
        else this.drawExtractPad(ctx, m.x + m.w / 2, floorY);
      }
    }

    for (const pk of this.pickups) {
      if (!pk.live) continue;
      const bob = Math.sin(performance.now() / 280 + pk.x) * 5;
      const ic = this.iconOf(pk.def);
      const px = pk.x;
      const py = pk.y + bob;
      ctx.save();
      ctx.fillStyle = "rgba(0,231,255,0.18)";
      ctx.beginPath();
      ctx.arc(px + 20, py + 22, 18, 0, Math.PI * 2);
      ctx.fill();
      if (ic && ic.complete && ic.naturalWidth > 0) ctx.drawImage(ic, px, py, 40, 40);
      else ctx.drawImage(art.prop[8]!, px, py, 40, 40);
      ctx.restore();
    }

    for (const pop of this.lootPops) {
      const k = 1 - pop.t / pop.life;
      const ic = this.iconOf(pop.def);
      const s = 36 + (1 - k) * 28;
      ctx.save();
      ctx.globalAlpha = Math.max(0, k);
      if (ic && ic.complete) ctx.drawImage(ic, pop.x - s / 2, pop.y - s / 2, s, s);
      ctx.fillStyle = "#00e7ff";
      ctx.font = "700 13px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(item(pop.def).name, pop.x, pop.y - s / 2 - 8);
      ctx.restore();
    }

    for (const e of this.enemies) {
      if (!e.live) continue;
      const sheet: SheetName =
        e.kind === "drone" || e.kind === "bomber" ? "drone" : e.kind === "flyer" ? "flyer" : "enforcer";
      const pack = art.packed[sheet];
      ctx.save();
      if (e.hurtT > 0) ctx.globalAlpha = 0.65;
      if (e.kind === "bruiser") ctx.filter = "sepia(0.6) saturate(1.8) hue-rotate(-20deg)";
      if (e.kind === "sniper") ctx.filter = "hue-rotate(160deg) saturate(1.4)";
      if (e.kind === "crawler") ctx.filter = "hue-rotate(90deg) saturate(1.6)";
      if (e.kind === "bomber") ctx.filter = "hue-rotate(-40deg) saturate(1.8)";
      if (pack) {
        drawPacked(
          ctx,
          art.sheets[sheet],
          pack,
          e.frame,
          e.x,
          e.y,
          e.w,
          e.h,
          e.facing > 0,
          sheet === "enforcer" ? 94 : 48,
        );
      }
      ctx.filter = "none";
      ctx.restore();
    }

    const p = this.player;
    const sheetName: SheetName =
      p.anim === "run"
        ? "hero-run"
        : p.anim === "jump"
          ? "hero-jump"
          : p.anim === "shoot"
            ? "hero-shoot"
            : p.anim === "hurt"
              ? "hero-hurt"
              : "hero-idle";
    ctx.save();
    if (this.iframes > 0 && Math.floor(this.iframes * 16) % 2 === 0) ctx.globalAlpha = 0.5;
    const hpack = art.packed[sheetName];
    if (hpack) {
      drawPacked(ctx, art.sheets[sheetName], hpack, p.frame, p.x, p.y, p.w, p.h, p.facing < 0, HERO_H);
    }
    if (this.muzzleT > 0) {
      const ox = p.x + p.w * 0.5;
      const oy = p.y + p.h * 0.38;
      const ang = Math.atan2(this.aimY - oy, this.aimX - ox);
      drawCell(
        ctx,
        art.sheets.muzzle,
        2,
        2,
        Math.floor((0.08 - this.muzzleT) * 40),
        ox + Math.cos(ang) * 28 - 16,
        oy + Math.sin(ang) * 20 - 16,
        42,
        42,
        Math.cos(ang) < 0,
        0.18,
      );
    }
    ctx.restore();

    for (const b of this.bullets) {
      if (!b.live) continue;
      const ang = Math.atan2(b.vy, b.vx);
      const size = b.kind === "grenade" ? 28 : 32;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      drawCell(ctx, art.sheets.bullet, 2, 2, Math.floor(performance.now() / 60), -size / 2, -10, size, 20, false, 0.2);
      ctx.restore();
    }
    for (const s of this.sparks) {
      drawCell(ctx, art.sheets.impact, 2, 2, Math.floor(s.frame) % 4, s.x - 18, s.y - 18, 36, 36, false, 0.12);
    }

    ctx.restore();
    ctx.fillStyle = this.mission.palette.fog;
    ctx.fillRect(0, 0, VW, VH);
    this.drawRain(ctx, camX);
    this.drawCrosshair(ctx);
  }

  private drawDeco(
    ctx: CanvasRenderingContext2D,
    art: RaidArt,
    d: { x: number; y: number; w: number; h: number; kind: string },
  ) {
    if (d.kind === "tunnel") {
      ctx.drawImage(art.tunnel, d.x, d.y, d.w, d.h);
      return;
    }
    ctx.save();
    if (d.kind === "sign") {
      ctx.fillStyle = "#0b0d14";
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = "#00e7ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
      ctx.fillStyle = "#ff2bd6";
      ctx.fillRect(d.x + 8, d.y + 8, d.w - 16, 6);
    } else if (d.kind === "pipe") {
      ctx.fillStyle = "#2a3344";
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = "#00e7ff";
      ctx.fillRect(d.x, d.y, d.w, 2);
    } else if (d.kind === "crane") {
      ctx.fillStyle = "#1c2230";
      ctx.fillRect(d.x + d.w * 0.45, d.y, 8, d.h);
      ctx.fillRect(d.x, d.y + 10, d.w, 8);
      ctx.strokeStyle = "#ff2bd6";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x + d.w, d.y + 18);
      ctx.lineTo(d.x + d.w, d.y + d.h * 0.6);
      ctx.stroke();
    } else if (d.kind === "wall") {
      ctx.fillStyle = "#10141c";
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = "rgba(0,231,255,0.25)";
      for (let y = d.y + 20; y < d.y + d.h; y += 36) ctx.fillRect(d.x + 6, y, d.w - 12, 4);
    }
    ctx.restore();
  }

  private drawShopKiosk(ctx: CanvasRenderingContext2D, cx: number, floorY: number) {
    const t = performance.now() / 1000;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, floorY + 3, 42, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // legs planted in the street
    ctx.fillStyle = "#12141c";
    ctx.fillRect(cx - 28, floorY - 38, 8, 40);
    ctx.fillRect(cx + 20, floorY - 38, 8, 40);
    ctx.fillStyle = "#00e7ff";
    ctx.fillRect(cx - 28, floorY - 38, 8, 2);
    ctx.fillRect(cx + 20, floorY - 38, 8, 2);
    // cabinet
    const x = cx - 46;
    const y = floorY - 148;
    ctx.fillStyle = "#141822";
    ctx.fillRect(x, y, 92, 112);
    ctx.strokeStyle = "#00e7ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, 90, 110);
    // window
    ctx.fillStyle = `rgba(255,43,214,${0.18 + Math.sin(t * 3) * 0.06})`;
    ctx.fillRect(x + 10, y + 36, 72, 48);
    ctx.strokeStyle = "rgba(0,231,255,0.7)";
    ctx.strokeRect(x + 10, y + 36, 72, 48);
    // shelves
    ctx.fillStyle = "rgba(0,231,255,0.35)";
    ctx.fillRect(x + 16, y + 52, 18, 8);
    ctx.fillRect(x + 38, y + 58, 18, 8);
    ctx.fillRect(x + 60, y + 50, 16, 10);
    // awning
    ctx.fillStyle = "#ff2bd6";
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 22);
    ctx.lineTo(x + 100, y + 22);
    ctx.lineTo(x + 92, y + 34);
    ctx.lineTo(x, y + 34);
    ctx.closePath();
    ctx.fill();
    // sign
    ctx.fillStyle = "#0b0d14";
    ctx.fillRect(x + 8, y - 22, 76, 22);
    ctx.strokeStyle = "#00e7ff";
    ctx.strokeRect(x + 8, y - 22, 76, 22);
    ctx.fillStyle = "#00e7ff";
    ctx.font = "700 11px Oxanium, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("KIOSK", cx, y - 7);
    // roof lamp
    ctx.fillStyle = `rgba(0,231,255,${0.55 + Math.sin(t * 6) * 0.25})`;
    ctx.beginPath();
    ctx.arc(cx, y - 28, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawExtractPad(ctx: CanvasRenderingContext2D, cx: number, floorY: number) {
    const pulse = 1 + Math.sin(performance.now() / 260) * 0.08;
    ctx.save();
    ctx.fillStyle = "rgba(0, 12, 18, 0.72)";
    ctx.beginPath();
    ctx.ellipse(cx, floorY - 2, 88, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(0,231,255,${0.55 + pulse * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, floorY - 2, 80 * pulse, 15 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,43,214,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, floorY - 2, 52, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#00e7ff";
    ctx.font = "700 11px Oxanium, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("EXTRACT", cx, floorY - 6);
    ctx.restore();
  }

  private iconOf(defId: string) {
    const src = ITEMS[defId]?.icon;
    if (!src) return null;
    let im = this.iconCache.get(src);
    if (!im) {
      im = new Image();
      im.src = src;
      this.iconCache.set(src, im);
    }
    return im;
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D) {
    if (this.phase !== "play" || this.modal) return;
    const x = this.aimX - this.camX;
    const y = this.aimY - this.camY;
    ctx.save();
    ctx.strokeStyle = "#00e7ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x - 5, y);
    ctx.moveTo(x + 5, y);
    ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x, y + 16);
    ctx.stroke();
    ctx.strokeStyle = "#ff2bd6";
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.stroke();
    if (this.interact === "extract" && this.extractT > 0) {
      ctx.strokeStyle = "#00e7ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.extractT / 1.8));
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawRain(ctx: CanvasRenderingContext2D, camX: number) {
    ctx.strokeStyle = `rgba(180,220,255,${0.12 + this.mission.palette.rain * 0.22})`;
    ctx.lineWidth = 1;
    for (const r of this.rain) {
      r.y += r.z * 14;
      r.x -= r.z * 2;
      if (r.y > VH) {
        r.y = -10;
        r.x = (r.x + VW + camX * 0.02) % VW;
      }
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + 2, r.y + 10 * r.z);
      ctx.stroke();
    }
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getX: () => number;
      getVx: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
    };
  }
}
