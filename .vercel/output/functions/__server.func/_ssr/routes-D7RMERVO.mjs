import { o as __toESM } from "../_runtime.mjs";
import { R as require_react, _ as Link, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as signOut, t as authClient } from "./client-Dj8M1g9N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D7RMERVO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SHEET_GRID = {
	"hero-idle": {
		cols: 2,
		rows: 2
	},
	"hero-run": {
		cols: 3,
		rows: 2
	},
	"hero-jump": {
		cols: 2,
		rows: 2
	},
	"hero-shoot": {
		cols: 2,
		rows: 2
	},
	"hero-hurt": {
		cols: 2,
		rows: 2
	},
	drone: {
		cols: 2,
		rows: 2
	},
	enforcer: {
		cols: 2,
		rows: 2
	},
	flyer: {
		cols: 2,
		rows: 2
	},
	bullet: {
		cols: 2,
		rows: 2
	},
	impact: {
		cols: 2,
		rows: 2
	},
	muzzle: {
		cols: 2,
		rows: 2
	},
	platforms: {
		cols: 4,
		rows: 1
	},
	floors: {
		cols: 4,
		rows: 1
	},
	props: {
		cols: 3,
		rows: 3
	},
	tunnel: {
		cols: 1,
		rows: 1
	}
};
function loadImg(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error(`Failed to load ${src}`));
		img.src = src;
	});
}
var SHEETS = [
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
	"tunnel"
];
var MAPS = [
	"sky",
	"far",
	"mid",
	"near",
	"title"
];
async function loadRaidArt() {
	const [sheetImgs, mapImgs, plat, floor, prop, tunnel] = await Promise.all([
		Promise.all(SHEETS.map((n) => loadImg(`/game/sheets/${n}.png`))),
		Promise.all(MAPS.map((n) => loadImg(`/game/map/${n}.jpg`))),
		Promise.all([
			0,
			1,
			2,
			3
		].map((i) => loadImg(`/game/tiles/plat-${i}.png`))),
		Promise.all([
			0,
			1,
			2,
			3
		].map((i) => loadImg(`/game/tiles/floor-${i}.png`))),
		Promise.all([
			0,
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8
		].map((i) => loadImg(`/game/tiles/prop-${i}.png`))),
		loadImg("/game/tiles/tunnel-0.png")
	]);
	const sheets = {};
	SHEETS.forEach((n, i) => {
		sheets[n] = sheetImgs[i];
	});
	const maps = {};
	MAPS.forEach((n, i) => {
		maps[n] = mapImgs[i];
	});
	return {
		sheets,
		maps,
		plat,
		floor,
		prop,
		tunnel
	};
}
function drawCell(ctx, img, cols, rows, frame, dx, dy, dw, dh, flip = false, inset = .04) {
	const n = cols * rows;
	const f = (frame % n + n) % n;
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
	} else ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
	ctx.restore();
}
/** Tiny WebAudio synth. Unlock on first gesture. */
var ctx = null;
function ac() {
	if (typeof window === "undefined") return null;
	if (!ctx) ctx = new AudioContext();
	if (ctx.state === "suspended") ctx.resume();
	return ctx;
}
function unlockAudio() {
	ac();
}
function beep(freq, dur, type, gain = .06, slide = 0) {
	const c = ac();
	if (!c) return;
	const t = c.currentTime;
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = type;
	o.frequency.setValueAtTime(freq, t);
	if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
	g.gain.setValueAtTime(gain, t);
	g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
	o.connect(g).connect(c.destination);
	o.start(t);
	o.stop(t + dur + .02);
}
var sfx = {
	shoot: () => beep(880, .06, "square", .035, -420),
	jump: () => beep(240, .09, "triangle", .05, 180),
	hit: () => beep(140, .12, "sawtooth", .07, -80),
	hurt: () => beep(90, .18, "square", .06, -40),
	pickup: () => beep(660, .14, "sine", .05, 400),
	boom: () => beep(70, .28, "sawtooth", .08, -30),
	ui: () => beep(520, .08, "triangle", .04, 80)
};
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		let t = a += 1831565813;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function randInt(rng, a, b) {
	return a + Math.floor(rng() * (b - a + 1));
}
function pick(rng, arr) {
	return arr[Math.floor(rng() * arr.length)];
}
var VW = 1280;
var CHUNK_W = 1180;
function makeWorldGen(seed) {
	return {
		seed,
		terrain: mulberry32(seed),
		loot: mulberry32(seed ^ 2654435769),
		foes: mulberry32(seed ^ 2246822507)
	};
}
function floorRun(x, y, w, tile = 1) {
	return {
		x,
		y,
		w,
		h: 52,
		kind: "floor",
		tile,
		oneway: false
	};
}
function plat(x, y, w, tile = 1, oneway = true) {
	return {
		x,
		y,
		w,
		h: 30,
		kind: oneway ? "oneway" : "plat",
		tile,
		oneway
	};
}
var KINDS = [
	"street",
	"rooftop",
	"tunnel",
	"overpass",
	"factory"
];
function generateChunk(gen, i) {
	const x0 = i * CHUNK_W;
	const kind = i === 0 ? "street" : pick(gen.terrain, KINDS);
	const solids = [];
	const props = [];
	const spawns = [];
	const pickups = [];
	const deco = [];
	solids.push(floorRun(x0, 602, 140, 0));
	solids.push(floorRun(x0 + CHUNK_W - 140, 602, 140, 2));
	const addCrate = (x, y) => {
		props.push({
			x,
			y,
			w: 54,
			h: 54,
			frame: randInt(gen.loot, 0, 2)
		});
	};
	if (kind === "street") {
		solids.push(floorRun(x0 + 120, 602, 940, 1));
		const nPlat = i === 0 ? 1 : randInt(gen.terrain, 1, 3);
		for (let k = 0; k < nPlat; k++) {
			const px = x0 + 220 + k * 280 + randInt(gen.terrain, 0, 40);
			const py = 602 - randInt(gen.terrain, 110, 210);
			solids.push(plat(px, py, randInt(gen.terrain, 160, 260), k % 3));
		}
		for (let k = 0; k < 4; k++) addCrate(x0 + 200 + k * 220 + randInt(gen.loot, 0, 40), 548);
		if (i > 0) {
			spawns.push({
				x: x0 + 520,
				y: 524,
				kind: "enforcer"
			});
			if (gen.foes() > .45) spawns.push({
				x: x0 + 880,
				y: 524,
				kind: "enforcer"
			});
			if (gen.foes() > .55) spawns.push({
				x: x0 + 700,
				y: 362,
				kind: "drone"
			});
		}
		if (gen.loot() > .5) pickups.push({
			x: x0 + 640,
			y: 402,
			frame: 8
		});
	}
	if (kind === "rooftop") {
		solids.push(floorRun(x0 + 120, 602, 280, 1));
		solids.push(floorRun(x0 + CHUNK_W - 360, 602, 220, 1));
		solids.push(plat(x0 + 360, 452, 220, 1));
		solids.push(plat(x0 + 560, 332, 240, 0, false));
		solids.push(plat(x0 + 820, 442, 200, 2));
		if (gen.terrain() > .4) solids.push(plat(x0 + 430, 212, 180, 1));
		spawns.push({
			x: x0 + 600,
			y: 272,
			kind: "drone"
		});
		spawns.push({
			x: x0 + 880,
			y: 382,
			kind: "flyer"
		});
		if (gen.foes() > .5) spawns.push({
			x: x0 + 200,
			y: 524,
			kind: "enforcer"
		});
		pickups.push({
			x: x0 + 640,
			y: 282,
			frame: 8
		});
		props.push({
			x: x0 + 150,
			y: 532,
			w: 44,
			h: 70,
			frame: 5
		});
	}
	if (kind === "tunnel") {
		solids.push(floorRun(x0 + 120, 602, 940, 3));
		solids.push({
			x: x0 + 180,
			y: 210,
			w: 820,
			h: 48,
			kind: "plat",
			tile: 1,
			oneway: false
		});
		solids.push(plat(x0 + 260, 472, 200, 1, false));
		solids.push(plat(x0 + 620, 472, 220, 2, false));
		deco.push({
			x: x0 + 80,
			y: 248,
			w: 340,
			h: 360,
			kind: "tunnel"
		});
		spawns.push({
			x: x0 + 500,
			y: 524,
			kind: "enforcer"
		});
		spawns.push({
			x: x0 + 780,
			y: 400,
			kind: "flyer"
		});
		if (gen.foes() > .4) spawns.push({
			x: x0 + 960,
			y: 402,
			kind: "drone"
		});
		props.push({
			x: x0 + 400,
			y: 554,
			w: 52,
			h: 48,
			frame: 6
		});
	}
	if (kind === "overpass") {
		solids.push(floorRun(x0 + 120, 602, 360, 1));
		solids.push(floorRun(x0 + 820, 602, 220, 1));
		solids.push(plat(x0 + 300, 422, 280, 0, false));
		solids.push(plat(x0 + 560, 302, 260, 1, false));
		solids.push(plat(x0 + 780, 422, 240, 2));
		spawns.push({
			x: x0 + 420,
			y: 352,
			kind: "enforcer"
		});
		spawns.push({
			x: x0 + 700,
			y: 232,
			kind: "drone"
		});
		spawns.push({
			x: x0 + 940,
			y: 352,
			kind: "flyer"
		});
		pickups.push({
			x: x0 + 650,
			y: 252,
			frame: 8
		});
	}
	if (kind === "factory") {
		solids.push(floorRun(x0 + 120, 602, 940, 3));
		for (let k = 0; k < 4; k++) {
			const px = x0 + 180 + k * 230;
			const py = 602 - (k % 2 === 0 ? 140 : 240);
			solids.push(plat(px, py, 170, k % 4, k !== 1));
		}
		for (let k = 0; k < 3; k++) addCrate(x0 + 260 + k * 280, 548);
		props.push({
			x: x0 + 980,
			y: 516,
			w: 48,
			h: 86,
			frame: 7
		});
		spawns.push({
			x: x0 + 480,
			y: 524,
			kind: "enforcer"
		});
		spawns.push({
			x: x0 + 740,
			y: 292,
			kind: "drone"
		});
		if (gen.foes() > .35) spawns.push({
			x: x0 + 1e3,
			y: 360,
			kind: "flyer"
		});
	}
	return {
		i,
		kind,
		x: x0,
		w: CHUNK_W,
		solids,
		props,
		spawns,
		pickups,
		deco
	};
}
function reachableSolids(chunks) {
	const out = [];
	for (const c of chunks) out.push(...c.solids);
	return out;
}
var GRAV_UP = 1680;
var GRAV_DOWN = 2650;
var JUMP_V = -640;
var TERM = 980;
var RUN = 310;
var AIR = 250;
var COYOTE = .1;
var BUFFER = .12;
var PLAYER_W = 34;
var PLAYER_H = 70;
var DRAW_W = 96;
var DRAW_H = 124;
function aabb(ax, ay, aw, ah, b) {
	return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}
var NeonRaid = class {
	canvas;
	ctx;
	art = null;
	keys = /* @__PURE__ */ new Set();
	stickX = 0;
	jumpHeld = false;
	jumpPressed = false;
	shootHeld = false;
	dropHeld = false;
	phase = "title";
	seed = (Date.now() ^ 2654435769) >>> 0;
	gen = makeWorldGen(this.seed);
	chunks = [];
	spawned = /* @__PURE__ */ new Set();
	player;
	bullets = [];
	enemies = [];
	sparks = [];
	pickups = [];
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
	cutJump = false;
	shootCd = 0;
	hurtT = 0;
	muzzleT = 0;
	best = 0;
	rain = [];
	last = 0;
	acc = 0;
	raf = 0;
	running = false;
	listeners = [];
	onHud(fn) {
		this.listeners.push(fn);
		fn(this.snap());
		return () => {
			this.listeners = this.listeners.filter((f) => f !== fn);
		};
	}
	constructor(canvas) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("2d");
		this.ctx = ctx;
		this.player = this.freshPlayer();
		try {
			this.best = Number(localStorage.getItem("neon-raid-best") || "0") || 0;
		} catch {
			this.best = 0;
		}
		for (let i = 0; i < 70; i++) this.rain.push({
			x: Math.random() * VW,
			y: Math.random() * 720,
			z: .6 + Math.random() * 1.4
		});
	}
	freshPlayer() {
		return {
			x: 180,
			y: 602 - PLAYER_H,
			w: PLAYER_W,
			h: PLAYER_H,
			vx: 0,
			vy: 0,
			facing: 1,
			hp: this.hpMax,
			grounded: true,
			anim: "idle",
			frame: 0,
			t: 0
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
	keyDown = (e) => {
		if ([
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Space"
		].includes(e.code)) e.preventDefault();
		this.keys.add(e.code);
		if (e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp") {
			if (!this.jumpHeld) this.jumpPressed = true;
			this.jumpHeld = true;
		}
		if (e.code === "KeyJ" || e.code === "KeyK" || e.code === "KeyX" || e.code === "KeyC") this.shootHeld = true;
		if (e.code === "KeyS" || e.code === "ArrowDown") this.dropHeld = true;
		if (this.phase === "title" && (e.code === "Enter" || e.code === "Space")) this.startRun();
		if (this.phase === "dead" && (e.code === "Enter" || e.code === "Space" || e.code === "KeyR")) this.startRun();
	};
	keyUp = (e) => {
		this.keys.delete(e.code);
		if (e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp") this.jumpHeld = false;
		if (e.code === "KeyJ" || e.code === "KeyK" || e.code === "KeyX" || e.code === "KeyC") this.shootHeld = false;
		if (e.code === "KeyS" || e.code === "ArrowDown") this.dropHeld = false;
	};
	blur = () => {
		this.keys.clear();
		this.jumpHeld = false;
		this.shootHeld = false;
		this.stickX = 0;
	};
	bound = false;
	ptrDown = (e) => {
		if (e.button !== 0) return;
		if (this.phase === "play") this.shootHeld = true;
	};
	ptrUp = () => {
		this.shootHeld = false;
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
		window.__controlsTest = {
			getX: () => this.player.x,
			getVx: () => this.player.vx,
			getSpeed: () => Math.abs(this.player.vx),
			setKeys: (codes) => {
				this.keys = new Set(codes);
				this.stickX = 0;
				if (codes.includes("KeyA") || codes.includes("ArrowLeft")) this.stickX -= 1;
				if (codes.includes("KeyD") || codes.includes("ArrowRight")) this.stickX += 1;
			}
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
		delete window.__controlsTest;
	}
	startRun(seed = (Date.now() ^ Math.random() * 4294967295) >>> 0) {
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
		this.hp = this.hpMax;
		this.score = 0;
		this.combo = 0;
		this.comboT = 0;
		this.iframes = 0;
		this.player = this.freshPlayer();
		this.camX = 0;
		this.camY = 0;
		this.ensureChunks();
		this.phase = "play";
		this.emit();
	}
	rerollSeed() {
		this.seed = this.seed + 2654435769 >>> 0;
		this.emit();
	}
	snap() {
		const kind = this.chunks.find((c) => this.player.x >= c.x && this.player.x < c.x + c.w)?.kind ?? "street";
		return {
			phase: this.phase,
			hp: this.hp,
			hpMax: this.hpMax,
			score: this.score,
			combo: this.combo,
			dist: Math.max(0, this.player.x - 180),
			seed: this.seed,
			best: this.best,
			kind
		};
	}
	emit() {
		const s = this.snap();
		for (const f of this.listeners) f(s);
	}
	setStick(x) {
		this.stickX = Math.max(-1, Math.min(1, x));
	}
	setJump(held, pressed) {
		if (pressed) this.jumpPressed = true;
		this.jumpHeld = held;
	}
	setShoot(held) {
		this.shootHeld = held;
	}
	setDrop(held) {
		this.dropHeld = held;
	}
	loop = (now) => {
		if (!this.running) return;
		const raw = Math.min(.05, (now - this.last) / 1e3);
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
	inputX() {
		let x = this.stickX;
		if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
		if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
		return Math.max(-1, Math.min(1, x));
	}
	solids() {
		return reachableSolids(this.chunks);
	}
	ensureChunks() {
		const need = Math.floor(this.player.x / CHUNK_W) + 3;
		while (this.chunks.length <= need) {
			const i = this.chunks.length;
			const ch = generateChunk(this.gen, i);
			this.chunks.push(ch);
			for (const s of ch.spawns) {
				const key = `${i}:${s.x}:${s.kind}`;
				if (this.spawned.has(key)) continue;
				this.spawned.add(key);
				this.enemies.push(this.mkEnemy(s.kind, s.x, s.y));
			}
			for (const p of ch.pickups) this.pickups.push({
				...p,
				live: true
			});
		}
		const minI = Math.max(0, Math.floor(this.camX / CHUNK_W) - 1);
		if (minI > 0 && this.chunks[0] && this.chunks[0].i < minI) {
			this.chunks = this.chunks.filter((c) => c.i >= minI);
			this.enemies = this.enemies.filter((e) => e.x > minI * CHUNK_W - 200);
		}
	}
	mkEnemy(kind, x, y) {
		const size = kind === "enforcer" ? {
			w: 36,
			h: 74
		} : {
			w: 42,
			h: 36
		};
		return {
			x,
			y,
			w: size.w,
			h: size.h,
			vx: kind === "enforcer" ? -70 : 0,
			vy: 0,
			facing: -1,
			hp: kind === "flyer" ? 2 : kind === "drone" ? 2 : 3,
			grounded: kind === "enforcer",
			anim: "idle",
			frame: 0,
			t: 0,
			kind,
			shootCd: .6 + Math.random(),
			hurtT: 0,
			live: true
		};
	}
	moveSolid(a, dt, onewayPass) {
		const solids = this.solids();
		const steps = Math.max(1, Math.ceil(Math.abs(a.vx) * dt / 24), Math.ceil(Math.abs(a.vy) * dt / 24));
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
	tick(dt) {
		if (this.phase !== "play") {
			this.jumpPressed = false;
			return;
		}
		this.ensureChunks();
		const p = this.player;
		const ix = this.inputX();
		if (ix < 0) p.facing = -1;
		if (ix > 0) p.facing = 1;
		const target = ix * (p.grounded ? RUN : AIR);
		const acc = p.grounded ? 2400 : 1400;
		if (ix === 0 && p.grounded) p.vx += (0 - p.vx) * Math.min(1, dt * 14);
		else if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
		else p.vx = Math.max(target, p.vx - acc * dt);
		if (p.grounded) this.coyote = COYOTE;
		else this.coyote -= dt;
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
		}
		if (!this.jumpHeld && p.vy < 0 && !this.cutJump) {
			p.vy *= .48;
			this.cutJump = true;
		}
		const apex = p.vy > -80 && p.vy < 90 && !p.grounded;
		const g = p.vy < 0 ? GRAV_UP : GRAV_DOWN;
		p.vy += (apex ? g * .5 : g) * dt;
		if (p.vy > TERM) p.vy = TERM;
		this.moveSolid(p, dt, this.dropHeld && this.jumpHeld);
		if (p.x < this.camX - 40) p.x = this.camX - 40;
		this.shootCd -= dt;
		this.muzzleT -= dt;
		if (this.shootHeld && this.shootCd <= 0 && this.hurtT <= 0) {
			this.firePlayer();
			this.shootCd = .11;
			this.muzzleT = .08;
		}
		this.iframes -= dt;
		this.hurtT -= dt;
		this.comboT -= dt;
		if (this.comboT <= 0) this.combo = 0;
		this.shake *= Math.max(0, 1 - dt * 8);
		this.tickEnemies(dt);
		this.tickBullets(dt);
		this.tickSparks(dt);
		this.tickPickups();
		p.t += dt;
		if (this.hurtT > 0) p.anim = "hurt";
		else if (!p.grounded) p.anim = "jump";
		else if (this.shootHeld) p.anim = "shoot";
		else if (Math.abs(p.vx) > 40) p.anim = "run";
		else p.anim = "idle";
		const fps = p.anim === "run" ? 12 : p.anim === "shoot" ? 10 : 7;
		p.frame += dt * fps;
		const look = p.facing * 160;
		const tx = p.x - VW * .32 + look;
		const ty = p.y - 720 * .55;
		this.camX += (tx - this.camX) * Math.min(1, dt * 5.5);
		this.camY += (ty - this.camY) * Math.min(1, dt * 3.2);
		if (this.camX < 0) this.camX = 0;
		this.camY = Math.max(-80, Math.min(80, this.camY));
		if (p.y > 800) this.kill();
		this.emit();
	}
	firePlayer() {
		const p = this.player;
		const up = this.keys.has("KeyW") || this.keys.has("ArrowUp");
		const down = this.keys.has("KeyS") || this.keys.has("ArrowDown");
		let vx = p.facing * 780;
		let vy = 0;
		if (up && Math.abs(this.inputX()) < .2) {
			vx = 0;
			vy = -780;
		} else if (up) vy = -420;
		else if (down && !p.grounded) vy = 420;
		this.spawnBullet(p.x + p.w * .5 + p.facing * 26, p.y + p.h * .38, vx, vy, "player");
		sfx.shoot();
	}
	spawnBullet(x, y, vx, vy, from) {
		const slot = this.bullets.find((b) => !b.live);
		const b = slot ?? {
			x,
			y,
			vx,
			vy,
			life: 1.1,
			from,
			live: true
		};
		b.x = x;
		b.y = y;
		b.vx = vx;
		b.vy = vy;
		b.life = from === "player" ? .9 : 1.4;
		b.from = from;
		b.live = true;
		if (!slot) this.bullets.push(b);
	}
	tickBullets(dt) {
		for (const b of this.bullets) {
			if (!b.live) continue;
			b.x += b.vx * dt;
			b.y += b.vy * dt;
			b.life -= dt;
			if (b.life <= 0) {
				b.live = false;
				continue;
			}
			if (b.from === "player") for (const e of this.enemies) {
				if (!e.live) continue;
				if (!aabb(b.x - 6, b.y - 6, 12, 12, e)) continue;
				b.live = false;
				this.hurtEnemy(e);
				this.spark(b.x, b.y);
				break;
			}
			else if (this.iframes <= 0 && aabb(b.x - 6, b.y - 6, 12, 12, this.player)) {
				b.live = false;
				this.hurtPlayer();
				this.spark(b.x, b.y);
			}
		}
	}
	hurtEnemy(e) {
		e.hp -= 1;
		e.hurtT = .12;
		e.vx += this.player.facing * 80;
		this.shake = Math.max(this.shake, 4);
		sfx.hit();
		if (e.hp <= 0) {
			e.live = false;
			this.combo += 1;
			this.comboT = 2.4;
			const base = e.kind === "flyer" ? 200 : e.kind === "drone" ? 150 : 100;
			this.score += base * Math.max(1, this.combo);
			sfx.boom();
			this.shake = 8;
			for (let i = 0; i < 10; i++) this.spark(e.x + e.w / 2, e.y + e.h / 2);
		}
	}
	hurtPlayer() {
		if (this.iframes > 0) return;
		this.hp -= 1;
		this.iframes = .9;
		this.hurtT = .28;
		this.player.vy = -240;
		this.player.vx = -this.player.facing * 180;
		this.shake = 10;
		this.combo = 0;
		sfx.hurt();
		if (this.hp <= 0) this.kill();
	}
	kill() {
		if (this.phase !== "play") return;
		this.phase = "dead";
		if (this.score > this.best) {
			this.best = this.score;
			try {
				localStorage.setItem("neon-raid-best", String(this.best));
			} catch {}
		}
		sfx.boom();
		this.emit();
	}
	tickEnemies(dt) {
		const p = this.player;
		for (const e of this.enemies) {
			if (!e.live) continue;
			e.t += dt;
			e.shootCd -= dt;
			e.hurtT -= dt;
			e.frame += dt * 8;
			if (e.kind === "enforcer") {
				if (e.grounded && Math.abs(e.x - p.x) < 420) {
					e.facing = p.x < e.x ? -1 : 1;
					e.vx = e.facing * 70;
				}
				e.vy += GRAV_DOWN * dt;
				this.moveSolid(e, dt, false);
				if (e.shootCd <= 0 && Math.abs(e.x - p.x) < 520 && Math.abs(e.y - p.y) < 140) {
					this.spawnBullet(e.x + e.w / 2, e.y + 28, e.facing * 360, 0, "enemy");
					e.shootCd = 1.35;
				}
			} else if (e.kind === "drone") {
				e.y += Math.sin(e.t * 2.2) * 18 * dt;
				e.x += Math.sin(e.t * .7) * 24 * dt;
				e.facing = p.x < e.x ? -1 : 1;
				if (e.shootCd <= 0 && Math.abs(e.x - p.x) < 560) {
					const dx = p.x - e.x;
					const dy = p.y - e.y;
					const m = Math.hypot(dx, dy) || 1;
					this.spawnBullet(e.x + e.w / 2, e.y + e.h / 2, dx / m * 280, dy / m * 280, "enemy");
					e.shootCd = 1.7;
				}
			} else {
				e.facing = p.x < e.x ? -1 : 1;
				e.x += e.facing * 90 * dt;
				e.y += Math.sin(e.t * 3.1) * 40 * dt;
				if (e.shootCd <= 0 && Math.abs(e.x - p.x) < 480) {
					this.spawnBullet(e.x, e.y + 10, e.facing * 400, 40, "enemy");
					e.shootCd = 1.5;
				}
			}
			if (this.iframes <= 0 && aabb(p.x, p.y, p.w, p.h, e)) this.hurtPlayer();
		}
	}
	spark(x, y) {
		this.sparks.push({
			x,
			y,
			vx: (Math.random() - .5) * 260,
			vy: (Math.random() - .8) * 220,
			life: .28,
			max: .28,
			frame: 0
		});
	}
	tickSparks(dt) {
		for (const s of this.sparks) {
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			s.vy += 400 * dt;
			s.life -= dt;
			s.frame += dt * 16;
		}
		this.sparks = this.sparks.filter((s) => s.life > 0);
	}
	tickPickups() {
		for (const p of this.pickups) {
			if (!p.live) continue;
			if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, {
				x: p.x,
				y: p.y,
				w: 36,
				h: 36
			})) {
				p.live = false;
				this.hp = Math.min(this.hpMax, this.hp + 1);
				this.score += 50 * Math.max(1, this.combo);
				sfx.pickup();
			}
		}
	}
	draw() {
		const ctx = this.ctx;
		const { width: W, height: H } = this.canvas;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const sx = W / VW;
		const sy = H / 720;
		ctx.setTransform(sx, 0, 0, sy, 0, 0);
		const art = this.art;
		if (!art) {
			ctx.fillStyle = "#07080f";
			ctx.fillRect(0, 0, VW, 720);
			return;
		}
		const shx = (Math.random() - .5) * this.shake;
		const shy = (Math.random() - .5) * this.shake;
		const camX = this.camX + shx;
		const camY = this.camY + shy;
		const drawMap = (img, factor, yOff = 0) => {
			const w = VW;
			const h = 720;
			const ox = -(camX * factor % w);
			ctx.drawImage(img, ox, yOff - camY * factor * .15, w, h);
			ctx.drawImage(img, ox + w, yOff - camY * factor * .15, w, h);
		};
		if (this.phase === "title") {
			ctx.drawImage(art.maps.title, 0, 0, VW, 720);
			ctx.fillStyle = "rgba(7,8,15,0.35)";
			ctx.fillRect(0, 0, VW, 720);
			this.drawRain(ctx, 0);
			return;
		}
		drawMap(art.maps.sky, .05, 0);
		drawMap(art.maps.far, .18, 8);
		drawMap(art.maps.mid, .38, 16);
		drawMap(art.maps.near, .62, 24);
		ctx.save();
		ctx.translate(-camX, -camY);
		for (const ch of this.chunks) {
			for (const d of ch.deco) ctx.drawImage(art.tunnel, d.x, d.y, d.w, d.h);
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
					const img = s.kind === "floor" ? art.floor[frame] : art.plat[frame];
					ctx.drawImage(img, s.x + i * tw, visY, tw, visH);
				}
			}
			for (const pr of ch.props) {
				const img = art.prop[pr.frame] ?? art.prop[0];
				ctx.drawImage(img, pr.x, pr.y, pr.w, pr.h);
			}
		}
		for (const pk of this.pickups) {
			if (!pk.live) continue;
			const bob = Math.sin(performance.now() / 280 + pk.x) * 6;
			ctx.drawImage(art.prop[8], pk.x, pk.y + bob, 36, 36);
		}
		for (const e of this.enemies) {
			if (!e.live) continue;
			const sheet = e.kind === "enforcer" ? "enforcer" : e.kind === "drone" ? "drone" : "flyer";
			const g = SHEET_GRID[sheet];
			const dw = e.kind === "enforcer" ? 100 : 72;
			const dh = e.kind === "enforcer" ? 120 : 64;
			ctx.save();
			if (e.hurtT > 0) ctx.globalAlpha = .65;
			drawCell(ctx, art.sheets[sheet], g.cols, g.rows, Math.floor(e.frame), e.x - (dw - e.w) / 2, e.y - (dh - e.h), dw, dh, e.facing > 0, .08);
			ctx.restore();
		}
		const p = this.player;
		const sheetName = p.anim === "run" ? "hero-run" : p.anim === "jump" ? "hero-jump" : p.anim === "shoot" ? "hero-shoot" : p.anim === "hurt" ? "hero-hurt" : "hero-idle";
		const g = SHEET_GRID[sheetName];
		ctx.save();
		if (this.iframes > 0 && Math.floor(this.iframes * 20) % 2 === 0) ctx.globalAlpha = .45;
		drawCell(ctx, art.sheets[sheetName], g.cols, g.rows, Math.floor(p.frame), p.x - (DRAW_W - p.w) / 2, p.y - (DRAW_H - p.h), DRAW_W, DRAW_H, p.facing < 0, .06);
		if (this.muzzleT > 0) drawCell(ctx, art.sheets.muzzle, 2, 2, Math.floor((.08 - this.muzzleT) * 40), p.x + p.w * .5 + p.facing * 18 - 16, p.y + 18, 48, 48, p.facing < 0, .15);
		ctx.restore();
		for (const b of this.bullets) {
			if (!b.live) continue;
			const ang = Math.atan2(b.vy, b.vx);
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.rotate(ang);
			drawCell(ctx, art.sheets.bullet, 2, 2, Math.floor(performance.now() / 60), -16, -10, 32, 20, false, .2);
			ctx.restore();
		}
		for (const s of this.sparks) drawCell(ctx, art.sheets.impact, 2, 2, Math.floor(s.frame) % 4, s.x - 18, s.y - 18, 36, 36, false, .12);
		ctx.restore();
		this.drawRain(ctx, camX);
	}
	drawRain(ctx, camX) {
		ctx.strokeStyle = "rgba(180,220,255,0.28)";
		ctx.lineWidth = 1;
		for (const r of this.rain) {
			r.y += r.z * 14;
			r.x -= r.z * 2;
			if (r.y > 720) {
				r.y = -10;
				r.x = (r.x + VW + camX * .02) % VW;
			}
			ctx.beginPath();
			ctx.moveTo(r.x, r.y);
			ctx.lineTo(r.x + 2, r.y + 10 * r.z);
			ctx.stroke();
		}
	}
};
function RaidCanvas({ onReady }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const parent = canvas.parentElement;
		const fit = () => {
			const w = parent?.clientWidth ?? window.innerWidth;
			const h = parent?.clientHeight ?? window.innerHeight;
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
		};
		fit();
		const game = new NeonRaid(canvas);
		game.boot().then(() => onReady(game));
		const ro = new ResizeObserver(fit);
		if (parent) ro.observe(parent);
		window.addEventListener("resize", fit);
		return () => {
			game.destroy();
			ro.disconnect();
			window.removeEventListener("resize", fit);
		};
	}, [onReady]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		className: "absolute inset-0 h-full w-full touch-none bg-bg",
		onContextMenu: (e) => e.preventDefault()
	});
}
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled (default) -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
/** Render children only when a user is present (real session, or the disabled-auth dev user). */
function SignedIn({ children }) {
	const { user } = useCurrentUserState();
	return user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children }) : null;
}
/**
* Render children only once we KNOW the visitor is signed out (`isPending` has
* cleared and there is no user). Hidden while the session is still loading.
*/
function SignedOut({ children }) {
	const { user, isPending } = useCurrentUserState();
	if (isPending || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of).
*/
function UserButton() {
	const user = useCurrentUser();
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => void signOut(),
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline",
				children: "Sign out"
			})
		]
	});
}
function AuthSlot() {
	const { user, isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-9 w-9 animate-pulse rounded-full bg-surface" });
	return user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/login",
		className: "inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted",
		children: "Sign in"
	});
}
function RaidHud({ game }) {
	const [hud, setHud] = (0, import_react.useState)(game?.snap() ?? null);
	(0, import_react.useEffect)(() => {
		if (!game) return;
		return game.onHud(setHud);
	}, [game]);
	if (!hud || hud.phase === "title") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-start justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[10px] uppercase tracking-[0.28em] text-cyan",
				children: "Grid online"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSlot, {})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-lg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-5xl font-semibold tracking-display text-fg sm:text-7xl",
					children: "NEON RAID"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-md text-base leading-relaxed text-muted sm:text-lg",
					children: "Side-scroll the megacity. Jump the rails. Cut down drones before the block runs out. Every run is a new seed."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-subtle",
					children: [
						"Seed ",
						hud?.seed ?? "—",
						" · best ",
						hud?.best ?? 0
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto mt-6 flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 rounded-full bg-cyan px-6 text-sm font-semibold text-cyan-fg",
							onClick: () => {
								unlockAudio();
								game?.startRun(hud?.seed);
							},
							children: "Jack in"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 rounded-full border border-border bg-surface px-5 text-sm font-medium text-fg",
							onClick: () => game?.rerollSeed(),
							children: "New seed"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/login",
							className: "inline-flex h-11 items-center rounded-full border border-border px-5 text-sm text-muted",
							children: "Sign in"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-flex h-11 items-center text-sm text-muted",
							children: "Logged in"
						}) })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 text-xs text-subtle",
					children: "WASD / arrows move · Space jump · J or tap fire · S + jump drop"
				})
			]
		})]
	});
	if (hud.phase === "dead") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-0 z-20 grid place-items-center bg-bg/55 p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-sm text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[10px] uppercase tracking-[0.28em] text-magenta",
					children: "Signal lost"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-display text-4xl text-fg",
					children: "Flatlined"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-muted",
					children: [
						hud.score,
						" pts · ",
						Math.round(hud.dist),
						" m · best ",
						hud.best
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "pointer-events-auto mt-6 h-11 rounded-full bg-cyan px-6 text-sm font-semibold text-cyan-fg",
					onClick: () => game?.startRun(),
					children: "Rerun"
				})
			]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-1",
			children: Array.from({ length: hud.hpMax }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `block h-2.5 w-5 rounded-sm ${i < hud.hp ? "bg-cyan" : "bg-surface"}` }, i))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-2 font-mono text-xs uppercase tracking-[0.16em] text-muted",
			children: [hud.score.toString().padStart(6, "0"), hud.combo > 1 ? `  ×${hud.combo}` : ""]
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "font-mono text-[11px] uppercase tracking-[0.2em] text-subtle",
			children: [
				hud.kind,
				" · ",
				Math.round(hud.dist),
				" m"
			]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchPad, { game })] });
}
function TouchPad({ game }) {
	const moveRef = (0, import_react.useRef)(null);
	if (!game) return null;
	const aim = (e, el) => {
		const r = el.getBoundingClientRect();
		const x = (e.clientX - r.left) / r.width;
		game.setStick(x * 2 - 1);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 z-30 sm:hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: moveRef,
			className: "pointer-events-auto absolute bottom-4 left-4 h-28 w-36 rounded-2xl border border-border bg-surface/60",
			onPointerDown: (e) => {
				e.target.setPointerCapture(e.pointerId);
				aim(e, moveRef.current);
			},
			onPointerMove: (e) => {
				if (e.buttons) aim(e, moveRef.current);
			},
			onPointerUp: () => game.setStick(0),
			onPointerCancel: () => game.setStick(0)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto absolute bottom-4 right-4 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "h-16 w-16 rounded-full border border-border bg-surface/80 text-[11px] font-semibold uppercase tracking-wide text-fg",
				onPointerDown: () => game.setJump(true, true),
				onPointerUp: () => game.setJump(false),
				onPointerCancel: () => game.setJump(false),
				children: "Jump"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "h-16 w-16 rounded-full bg-cyan text-[11px] font-semibold uppercase tracking-wide text-cyan-fg",
				onPointerDown: () => game.setShoot(true),
				onPointerUp: () => game.setShoot(false),
				onPointerCancel: () => game.setShoot(false),
				children: "Fire"
			})]
		})]
	});
}
function Home() {
	const [game, setGame] = (0, import_react.useState)(null);
	const onReady = (0, import_react.useCallback)((g) => setGame(g), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RaidCanvas, { onReady }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RaidHud, { game })]
	});
}
//#endregion
export { Home as component };
