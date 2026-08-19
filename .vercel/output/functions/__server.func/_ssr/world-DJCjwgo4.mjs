import { C as ShaderMaterial, D as WebGLRenderTarget, E as Vector3, S as Scene, T as Vector2, _ as Plane, a as DataTexture, b as Raycaster, c as Group, d as LinearFilter, f as MathUtils, g as PerspectiveCamera, h as OrthographicCamera, i as ClampToEdgeWrapping, l as HalfFloatType, m as MeshBasicMaterial, n as BufferAttribute, o as Float32BufferAttribute, p as Mesh, r as BufferGeometry, s as FloatType, t as WebGLRenderer, u as IcosahedronGeometry, v as PlaneGeometry, w as SphereGeometry, x as SRGBColorSpace, y as RGBAFormat } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/world-DJCjwgo4.js
var TERRAIN_MIN = -2.8;
var TERRAIN_MAX = 6.4;
var SPHERE_RADIUS = .52;
var HEIGHT_SCALE = 1.35;
function isMobileViewport() {
	if (typeof window === "undefined") return false;
	return window.innerWidth < 760 || window.matchMedia("(pointer: coarse)").matches;
}
function worldToUv(x, z) {
	return [x / 32 + .5, z / 32 + .5];
}
function hash2(x, y) {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
	return s - Math.floor(s);
}
function noise2(x, y) {
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
function fbm(x, y, octaves = 5) {
	let v = 0;
	let a = .5;
	let f = 1;
	for (let i = 0; i < octaves; i++) {
		v += a * noise2(x * f, y * f);
		a *= .5;
		f *= 2.02;
	}
	return v;
}
function smoothstep(edge0, edge1, x) {
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}
function lerp(a, b, t) {
	return a + (b - a) * t;
}
function peak(dx, dz, radius, height) {
	const r = Math.hypot(dx, dz) / radius;
	if (r >= 1) return 0;
	const w = 1 - r * r;
	return height * w * w;
}
/** World-space terrain height. Water surface is y = 0. */
function terrainHeight(x, z) {
	const n = fbm(x * .16, z * .16, 5);
	const n2 = fbm(x * .41 + 20, z * .41, 4);
	const r = Math.hypot(x, z);
	const volcano = peak(x + 1.6, z - .4, 6.4, 4.6);
	const shoulder = peak(x - 1.9, z + 1.7, 5.1, 2.7);
	const spit = peak(x - 3.6, z - 2.8, 4.4, 1.15);
	const knoll = peak(x + 3.1, z + 2.4, 3.2, 1.35);
	let land = volcano + shoulder * .82 + spit * .7 + knoll * .55 - peak(x + 1.55, z - .35, 1.55, 1.35) * .55;
	land += (n - .45) * 1.15;
	land += (n2 - .5) * .28;
	const coast = smoothstep(10.8, 4.6, r - (n - .5) * 2.6);
	land *= coast;
	const stack = peak(x - 7.2, z - 5.1, 1.15, 2.05) + (n2 - .5) * .25;
	const stack2 = peak(x + 8.4, z - 3.2, .85, 1.35);
	land = Math.max(land, stack * .95, stack2 * .9);
	const bed = -1.35 + ((n - .5) * .42 + Math.sin(x * 1.7) * Math.sin(z * 1.3) * .04) - r * .01;
	const shelf = -.16 + (n2 - .5) * .08 + Math.sin(x * 2.4 + z * 1.6) * .03;
	const shelfMask = smoothstep(13.2, 6.8, r - (n - .5) * 1.8);
	let h = land - .08;
	h = Math.max(h, lerp(bed, shelf, shelfMask));
	return h;
}
function terrainNormal(x, z, eps = .14) {
	const l = terrainHeight(x - eps, z);
	const r = terrainHeight(x + eps, z);
	const d = terrainHeight(x, z - eps);
	const u = terrainHeight(x, z + eps);
	const nx = l - r;
	const ny = 2 * eps;
	const nz = d - u;
	const len = Math.hypot(nx, ny, nz) || 1;
	return [
		nx / len,
		ny / len,
		nz / len
	];
}
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a += 1831565813;
		let t = a;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
/** Shared GLSL helpers used by the water and island materials. */
var COMMON_GLSL = `
uniform sampler2D uTerrain;
uniform sampler2D uWater;
uniform vec3 uSunDir;
uniform float uTime;
uniform float uTerrainMin;
uniform float uTerrainMax;
uniform float uWorldSize;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec2 worldToUv(vec2 xz) {
  return xz / uWorldSize + 0.5;
}

float terrainH(vec2 xz) {
  vec2 uv = worldToUv(xz);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return uTerrainMin;
  return mix(uTerrainMin, uTerrainMax, texture2D(uTerrain, uv).r);
}

vec3 terrainN(vec2 xz) {
  float e = 0.13;
  float hL = terrainH(xz - vec2(e, 0.0));
  float hR = terrainH(xz + vec2(e, 0.0));
  float hD = terrainH(xz - vec2(0.0, e));
  float hU = terrainH(xz + vec2(0.0, e));
  return normalize(vec3(hL - hR, 2.0 * e, hD - hU));
}

vec3 skyColor(vec3 dir) {
  vec3 d = normalize(dir);
  float up = d.y;
  vec3 zenith = vec3(0.09, 0.24, 0.56);
  vec3 mid = vec3(0.32, 0.58, 0.86);
  vec3 horizon = vec3(0.78, 0.86, 0.92);
  vec3 ground = vec3(0.22, 0.36, 0.44);
  vec3 col;
  if (up > 0.0) {
    float t = smoothstep(0.0, 0.22, up);
    col = mix(horizon, mix(mid, zenith, smoothstep(0.05, 0.7, up)), t);
  } else {
    col = mix(horizon, ground, smoothstep(0.0, 0.45, -up));
  }
  float sun = pow(max(dot(d, uSunDir), 0.0), 12.0);
  float disc = pow(max(dot(d, uSunDir), 0.0), 1600.0);
  col += vec3(1.0, 0.82, 0.52) * sun * 0.42;
  col += vec3(1.0, 0.96, 0.88) * disc * 3.6;
  col += vec3(1.0, 0.62, 0.32) * 0.10 * pow(1.0 - abs(up), 10.0);
  return col;
}

vec3 terrainAlbedo(vec3 pos, vec3 n) {
  float h = pos.y;
  float slope = 1.0 - n.y;
  float g = fbm2(pos.xz * 1.9);
  float g2 = fbm2(pos.xz * 7.5 + 8.0);

  vec3 sandWet = vec3(0.40, 0.34, 0.24);
  vec3 sandDry = vec3(0.78, 0.70, 0.50);
  vec3 sand = mix(sandWet, sandDry, clamp(smoothstep(-0.04, 0.38, h) + (g - 0.5) * 0.12, 0.0, 1.0));
  vec3 grass = vec3(0.20, 0.36, 0.14) * (0.82 + g * 0.36);
  vec3 grassDry = vec3(0.42, 0.40, 0.18);
  grass = mix(grass, grassDry, smoothstep(1.5, 2.9, h));
  vec3 rock = vec3(0.27, 0.25, 0.23) + g2 * 0.07;
  vec3 rockDark = vec3(0.14, 0.13, 0.12);
  vec3 cliff = mix(rock, rockDark, smoothstep(0.34, 0.72, slope));
  vec3 subSand = vec3(0.18, 0.30, 0.26);

  vec3 col = sand;
  col = mix(subSand, col, smoothstep(-0.7, 0.06, h));
  col = mix(col, grass, smoothstep(0.42, 0.92, h) * (1.0 - smoothstep(0.30, 0.55, slope)));
  col = mix(col, cliff, smoothstep(0.36, 0.62, slope));
  col = mix(col, rock, smoothstep(2.5, 3.7, h));
  return col;
}

float waterCaustics(vec3 pos) {
  vec2 uv = worldToUv(pos.xz);
  vec2 texel = vec2(1.0 / 256.0);
  float h = texture2D(uWater, uv).r;
  float lap =
    texture2D(uWater, uv + vec2(texel.x, 0.0)).r +
    texture2D(uWater, uv - vec2(texel.x, 0.0)).r +
    texture2D(uWater, uv + vec2(0.0, texel.x)).r +
    texture2D(uWater, uv - vec2(0.0, texel.x)).r -
    4.0 * h;
  float focus = pow(max(0.0, 1.0 + lap * 22.0), 2.4);
  vec2 w1 = pos.xz * 1.7 + vec2(uTime * 0.35, -uTime * 0.22);
  vec2 w2 = pos.xz * 2.9 + vec2(-uTime * 0.18, uTime * 0.31);
  float n = 0.55 + 0.45 * sin(w1.x + sin(w1.y)) * sin(w2.y + cos(w2.x));
  return focus * n;
}

vec3 shadeLand(vec3 pos, vec3 n, bool underwater) {
  vec3 albedo = terrainAlbedo(pos, n);
  float ndl = max(dot(n, uSunDir), 0.0);
  float wrap = ndl * 0.55 + 0.45;
  float ao = 0.55 + 0.45 * n.y;
  vec3 amb = vec3(0.16, 0.24, 0.34) * ao;
  vec3 sun = vec3(1.0, 0.94, 0.80) * wrap;
  vec3 col = albedo * (amb + sun);

  float wet = 1.0 - smoothstep(0.0, 0.42, pos.y);
  col *= 1.0 - wet * 0.22;

  if (underwater) {
    float depth = max(0.0, -pos.y);
    vec3 absorb = exp(-vec3(0.50, 0.14, 0.08) * (depth * 2.4 + 0.08));
    col *= mix(vec3(0.55, 0.85, 0.88), absorb, 0.7);
    float c = waterCaustics(pos);
    col += c * absorb * vec3(0.50, 0.90, 0.80) * 0.5;
  }
  return col;
}

bool marchTerrain(vec3 ro, vec3 rd, float maxDist, out float tHit, out vec3 hit) {
  float t = 0.06;
  for (int i = 0; i < 18; i++) {
    vec3 p = ro + rd * t;
    float h = terrainH(p.xz);
    float d = p.y - h;
    if (d < 0.04) {
      tHit = t;
      hit = vec3(p.x, h, p.z);
      return true;
    }
    t += clamp(d * 0.9, 0.12, 0.7);
    if (t > maxDist) break;
  }
  tHit = maxDist;
  hit = ro + rd * maxDist;
  return false;
}

bool intersectSphere(vec3 ro, vec3 rd, vec3 ce, float ra, out float t) {
  vec3 oc = ro - ce;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - ra * ra;
  float h = b * b - c;
  if (h < 0.0) return false;
  h = sqrt(h);
  t = -b - h;
  if (t < 0.001) t = -b + h;
  return t > 0.001;
}
`;
var SIM_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
var SIM_UPDATE_FRAG = `
uniform sampler2D uTexture;
uniform sampler2D uTerrain;
uniform vec2 uDelta;
uniform float uWorldSize;
uniform float uTerrainMin;
uniform float uTerrainMax;
varying vec2 vUv;

void main() {
  vec4 info = texture2D(uTexture, vUv);
  vec2 dx = vec2(uDelta.x, 0.0);
  vec2 dy = vec2(0.0, uDelta.y);
  float average = (
    texture2D(uTexture, vUv - dx).r +
    texture2D(uTexture, vUv + dx).r +
    texture2D(uTexture, vUv - dy).r +
    texture2D(uTexture, vUv + dy).r
  ) * 0.25;

  info.g += (average - info.r) * 2.0;
  info.g *= 0.995;
  info.r += info.g;

  float edge = min(min(vUv.x, vUv.y), min(1.0 - vUv.x, 1.0 - vUv.y));
  float absorb = smoothstep(0.0, 0.07, edge);
  info.g *= mix(0.88, 1.0, absorb);
  info.r *= mix(0.94, 1.0, absorb);

  float land = mix(uTerrainMin, uTerrainMax, texture2D(uTerrain, vUv).r);
  if (land > 0.18) {
    info.r *= 0.45;
    info.g *= 0.25;
  }

  gl_FragColor = info;
}
`;
var SIM_DROP_FRAG = `
uniform sampler2D uTexture;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;
varying vec2 vUv;

void main() {
  vec4 info = texture2D(uTexture, vUv);
  float drop = max(0.0, 1.0 - length(uCenter - vUv) / uRadius);
  drop = 0.5 - cos(drop * 3.14159265) * 0.5;
  info.r += drop * uStrength;
  gl_FragColor = info;
}
`;
var SIM_NORMAL_FRAG = `
uniform sampler2D uTexture;
uniform vec2 uDelta;
varying vec2 vUv;

void main() {
  vec4 info = texture2D(uTexture, vUv);
  vec3 dx = vec3(uDelta.x, texture2D(uTexture, vec2(vUv.x + uDelta.x, vUv.y)).r - info.r, 0.0);
  vec3 dy = vec3(0.0, texture2D(uTexture, vec2(vUv.x, vUv.y + uDelta.y)).r - info.r, uDelta.y);
  info.ba = normalize(cross(dy, dx)).xz;
  gl_FragColor = info;
}
`;
var SIM_SPHERE_FRAG = `
uniform sampler2D uTexture;
uniform vec3 uOldCenter;
uniform vec3 uNewCenter;
uniform float uRadius;
uniform float uWorldSize;
varying vec2 vUv;

float volumeUnder(vec3 center) {
  vec2 xz = (vUv - 0.5) * uWorldSize;
  vec3 p = vec3(xz.x, 0.0, xz.y);
  float d = length(p - vec3(center.x, 0.0, center.z));
  if (d > uRadius) return 0.0;
  float y = center.y - sqrt(max(uRadius * uRadius - d * d, 0.0));
  return max(0.0, -y);
}

void main() {
  vec4 info = texture2D(uTexture, vUv);
  float oldV = volumeUnder(uOldCenter);
  float newV = volumeUnder(uNewCenter);
  info.r += (newV - oldV) * 0.55;
  gl_FragColor = info;
}
`;
var SIM_WIND_FRAG = `
uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;
varying vec2 vUv;

void main() {
  vec4 info = texture2D(uTexture, vUv);
  float wave = sin(vUv.x * 38.0 + vUv.y * 12.0 - uTime * 2.6);
  info.g += wave * uStrength;
  gl_FragColor = info;
}
`;
var WATER_VERT = `
uniform sampler2D uWater;
uniform float uHeightScale;
uniform float uWorldSize;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = position.xz / uWorldSize + 0.5;
  vec4 info = texture2D(uWater, vUv);
  vec3 pos = position;
  pos.y += info.r * uHeightScale;
  vNormal = normalize(vec3(-info.b, 1.0, -info.a));
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
var WATER_FRAG = `
${COMMON_GLSL}

uniform vec3 uCameraPos;
uniform vec3 uSpherePos;
uniform float uSphereRadius;
uniform float uHeightScale;

varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec4 info = texture2D(uWater, vUv);
  vec3 N = normalize(vec3(-info.b, 1.0, -info.a));
  vec3 V = normalize(uCameraPos - vWorldPos);
  if (dot(N, V) < 0.0) N = -N;

  float fresnel = mix(0.02, 0.72, pow(1.0 - max(dot(N, V), 0.0), 4.5));

  vec3 reflDir = reflect(-V, N);
  vec3 refrDir = refract(-V, N, 0.75);
  bool tir = dot(refrDir, refrDir) < 1e-5;
  if (tir) {
    fresnel = 1.0;
    refrDir = reflDir;
  }

  vec3 ro = vWorldPos + N * 0.03;
  float tLand, tSph;
  vec3 landHit;
  bool hitLand = marchTerrain(ro, reflDir, 22.0, tLand, landHit);
  bool hitSph = intersectSphere(ro, reflDir, uSpherePos, uSphereRadius, tSph);

  vec3 refl = skyColor(reflDir);
  if (hitLand && (!hitSph || tLand < tSph)) {
    vec3 nL = terrainN(landHit.xz);
    refl = shadeLand(landHit, nL, landHit.y < 0.0);
  } else if (hitSph) {
    vec3 sp = ro + reflDir * tSph;
    vec3 sn = normalize(sp - uSpherePos);
    vec3 bounce = reflect(reflDir, sn);
    refl = mix(skyColor(bounce), vec3(0.75, 0.88, 0.92), 0.18);
    refl += pow(max(dot(sn, uSunDir), 0.0), 80.0) * vec3(1.0, 0.95, 0.85) * 0.8;
  }

  vec3 ro2 = vWorldPos - N * 0.02;
  float tLand2, tSph2;
  vec3 landHit2;
  bool hitLand2 = marchTerrain(ro2, refrDir, 16.0, tLand2, landHit2);
  bool hitSph2 = intersectSphere(ro2, refrDir, uSpherePos, uSphereRadius, tSph2);

  vec3 refr = vec3(0.02, 0.10, 0.14);
  vec3 hitP = ro2 + refrDir * 8.0;
  if (hitLand2 && (!hitSph2 || tLand2 < tSph2)) {
    hitP = landHit2;
    vec3 nL = terrainN(hitP.xz);
    refr = shadeLand(hitP, nL, true);
  } else if (hitSph2) {
    hitP = ro2 + refrDir * tSph2;
    vec3 sn = normalize(hitP - uSpherePos);
    vec3 through = refract(refrDir, sn, 1.333 / 1.0);
    if (dot(through, through) < 1e-5) through = reflect(refrDir, sn);
    refr = skyColor(through) * 0.55 + vec3(0.08, 0.22, 0.24);
  } else {
    hitP.y = terrainH(hitP.xz);
    vec3 nL = terrainN(hitP.xz);
    refr = shadeLand(hitP, nL, true);
  }

  float path = length(hitP - vWorldPos);
  float shallow = smoothstep(1.1, 0.05, max(0.0, -hitP.y));
  vec3 absorb = exp(-vec3(0.45, 0.12, 0.07) * (path * mix(0.95, 0.25, shallow) + max(0.0, -hitP.y) * 1.8));
  vec3 waterBody = mix(vec3(0.015, 0.16, 0.20), vec3(0.08, 0.42, 0.40), shallow);
  refr = mix(waterBody, refr, absorb);
  refr += waterCaustics(hitP) * absorb * vec3(0.45, 0.88, 0.78) * mix(0.35, 0.85, shallow);

  vec3 col = mix(refr, refl, fresnel);

  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 180.0);
  col += vec3(1.0, 0.95, 0.85) * spec * 0.95;

  float landHere = terrainH(vWorldPos.xz);
  float shore = 1.0 - smoothstep(0.0, 0.16, abs(landHere));
  shore *= smoothstep(-0.12, 0.05, landHere);
  float peak = smoothstep(0.04, 0.14, info.r);
  float foamNoise = fbm2(vWorldPos.xz * 14.0 + uTime * 0.4);
  float foam = max(shore * (0.35 + 0.4 * foamNoise), peak * 0.45);
  col = mix(col, vec3(0.92, 0.96, 0.97), clamp(foam, 0.0, 1.0) * 0.85);

  float dist = length(uCameraPos - vWorldPos);
  float fog = smoothstep(16.0, 28.0, dist);
  col = mix(col, skyColor(normalize(vWorldPos - uCameraPos)), fog * 0.55);

  gl_FragColor = vec4(col, 1.0);
}
`;
var ISLAND_VERT = `
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
var ISLAND_FRAG = `
${COMMON_GLSL}

uniform vec3 uCameraPos;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 n = normalize(vNormal);
  vec3 nH = terrainN(vWorldPos.xz);
  n = normalize(mix(n, nH, 0.65));
  bool underwater = vWorldPos.y < 0.02;
  vec3 col = shadeLand(vWorldPos, n, underwater);

  vec3 V = normalize(uCameraPos - vWorldPos);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
  if (vWorldPos.y < 0.35) {
    col += fres * vec3(0.25, 0.45, 0.5) * 0.18;
  }

  float dist = length(uCameraPos - vWorldPos);
  float fog = smoothstep(16.0, 28.0, dist);
  col = mix(col, skyColor(-V), fog * 0.5);

  gl_FragColor = vec4(col, 1.0);
}
`;
var SKY_VERT = `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = position;
  gl_Position = projectionMatrix * viewMatrix * world;
  gl_Position.z = gl_Position.w;
}
`;
var SKY_FRAG = `
uniform vec3 uSunDir;
varying vec3 vDir;

vec3 skyColor(vec3 dir) {
  vec3 d = normalize(dir);
  float up = d.y;
  vec3 zenith = vec3(0.09, 0.24, 0.56);
  vec3 mid = vec3(0.32, 0.58, 0.86);
  vec3 horizon = vec3(0.78, 0.86, 0.92);
  vec3 ground = vec3(0.18, 0.32, 0.40);
  vec3 col;
  if (up > 0.0) {
    float t = smoothstep(0.0, 0.22, up);
    col = mix(horizon, mix(mid, zenith, smoothstep(0.05, 0.7, up)), t);
  } else {
    col = mix(horizon, ground, smoothstep(0.0, 0.45, -up));
  }
  float sun = pow(max(dot(d, uSunDir), 0.0), 10.0);
  float disc = pow(max(dot(d, uSunDir), 0.0), 1400.0);
  col += vec3(1.0, 0.82, 0.52) * sun * 0.5;
  col += vec3(1.0, 0.96, 0.88) * disc * 4.2;
  col += vec3(1.0, 0.62, 0.32) * 0.12 * pow(1.0 - abs(up), 10.0);
  return col;
}

void main() {
  gl_FragColor = vec4(skyColor(vDir), 1.0);
}
`;
var FOLIAGE_VERT = `
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vColor;
attribute vec3 color;

void main() {
  vColor = color;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
var FOLIAGE_FRAG = `
uniform vec3 uSunDir;
uniform vec3 uCameraPos;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vColor;

void main() {
  vec3 n = normalize(vNormal);
  float ndl = max(dot(n, uSunDir), 0.0);
  float wrap = ndl * 0.55 + 0.45;
  float back = pow(max(dot(-n, uSunDir), 0.0), 1.4) * 0.35;
  vec3 amb = vec3(0.18, 0.28, 0.22);
  vec3 col = vColor * (amb + vec3(1.0, 0.95, 0.78) * wrap + vec3(0.15, 0.35, 0.12) * back);
  vec3 V = normalize(uCameraPos - vWorldPos);
  float fres = pow(1.0 - max(abs(dot(n, V)), 0.0), 3.0);
  col += fres * vec3(0.2, 0.4, 0.15) * 0.2;
  gl_FragColor = vec4(col, 1.0);
}
`;
var SPHERE_VERT = `
varying vec3 vWorldPos;
varying vec3 vNormal;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
var SPHERE_FRAG = `
uniform vec3 uSunDir;
uniform vec3 uCameraPos;
varying vec3 vWorldPos;
varying vec3 vNormal;

vec3 skyColor(vec3 dir) {
  vec3 d = normalize(dir);
  float up = d.y;
  vec3 zenith = vec3(0.09, 0.24, 0.56);
  vec3 mid = vec3(0.32, 0.58, 0.86);
  vec3 horizon = vec3(0.78, 0.86, 0.92);
  vec3 col = mix(horizon, mix(mid, zenith, smoothstep(0.05, 0.7, up)), smoothstep(0.0, 0.22, max(up, 0.0)));
  float sun = pow(max(dot(d, uSunDir), 0.0), 12.0);
  float disc = pow(max(dot(d, uSunDir), 0.0), 1400.0);
  col += vec3(1.0, 0.82, 0.52) * sun * 0.45;
  col += vec3(1.0, 0.96, 0.88) * disc * 3.8;
  return col;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 R = reflect(-V, N);
  float fres = mix(0.08, 1.0, pow(1.0 - max(dot(N, V), 0.0), 4.0));
  vec3 glass = vec3(0.42, 0.66, 0.68);
  vec3 col = mix(glass, skyColor(R), fres);
  col += pow(max(dot(N, uSunDir), 0.0), 90.0) * vec3(1.0, 0.95, 0.85) * 0.7;
  gl_FragColor = vec4(col, 0.88);
}
`;
function makeFrondGeo() {
	const w = .22;
	const len = 1.55;
	const segs = 8;
	const positions = [];
	const normals = [];
	const colors = [];
	const indices = [];
	for (let i = 0; i <= segs; i++) {
		const t = i / segs;
		const y = Math.sin(t * Math.PI * .72) * -.35 - t * .08;
		const x = t * len;
		const half = w * (1 - t * .92) * (t < .08 ? t / .08 : 1);
		const green = .22 + t * .18;
		positions.push(x, y, -half, x, y, half);
		normals.push(0, 1, 0, 0, 1, 0);
		colors.push(.12, green, .08, .16, green + .08, .1);
		if (i < segs) {
			const a = i * 2;
			indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
		}
	}
	const geo = new BufferGeometry();
	geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
	geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
	geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
	geo.setIndex(indices);
	geo.computeVertexNormals();
	return geo;
}
function makeTrunkGeo(rng) {
	const h = 1.7 + rng() * .7;
	const segs = 7;
	const radial = 6;
	const positions = [];
	const normals = [];
	const colors = [];
	const indices = [];
	const bend = (rng() - .5) * .35;
	for (let i = 0; i <= segs; i++) {
		const t = i / segs;
		const r = .085 * (1 - t * .55);
		const y = t * h;
		const ox = bend * t * t;
		for (let k = 0; k <= radial; k++) {
			const a = k / radial * Math.PI * 2;
			const px = Math.cos(a) * r + ox;
			const pz = Math.sin(a) * r;
			positions.push(px, y, pz);
			normals.push(Math.cos(a), .15, Math.sin(a));
			const shade = .28 + t * .08 + (k + i) % 2 * .04;
			colors.push(shade, shade * .72, .16);
		}
		if (i < segs) for (let k = 0; k < radial; k++) {
			const a = i * 7 + k;
			const b = a + radial + 1;
			indices.push(a, b, a + 1, a + 1, b, b + 1);
		}
	}
	const geo = new BufferGeometry();
	geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
	geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
	geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
	geo.setIndex(indices);
	geo.computeVertexNormals();
	return geo;
}
function createPalms(sunDir) {
	const group = new Group();
	const rng = mulberry32(334461);
	const frondGeo = makeFrondGeo();
	const mat = new ShaderMaterial({
		uniforms: {
			uSunDir: { value: sunDir },
			uCameraPos: { value: new Vector3() }
		},
		vertexShader: FOLIAGE_VERT,
		fragmentShader: FOLIAGE_FRAG,
		side: 2
	});
	const placed = [];
	let attempts = 0;
	while (placed.length < 22 && attempts < 400) {
		attempts++;
		const ang = rng() * Math.PI * 2;
		const rad = 1.2 + rng() * 6.4;
		const x = Math.cos(ang) * rad + (rng() - .5) * 1.4;
		const z = Math.sin(ang) * rad + (rng() - .5) * 1.4;
		const h = terrainHeight(x, z);
		const n = terrainNormal(x, z);
		if (h < .7 || h > 2.6 || n[1] < .72) continue;
		if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 1.15)) continue;
		placed.push({
			x,
			z
		});
		const palm = new Group();
		const trunk = new Mesh(makeTrunkGeo(rng), mat);
		palm.add(trunk);
		const topY = 1.75 + rng() * .55;
		const fronds = 7 + Math.floor(rng() * 3);
		for (let i = 0; i < fronds; i++) {
			const frond = new Mesh(frondGeo, mat);
			frond.position.set((rng() - .5) * .08, topY, (rng() - .5) * .08);
			frond.rotation.y = i / fronds * Math.PI * 2 + rng() * .25;
			frond.rotation.z = .35 + rng() * .45;
			frond.rotation.x = (rng() - .5) * .3;
			palm.add(frond);
		}
		palm.position.set(x, h - .04, z);
		palm.rotation.y = rng() * Math.PI * 2;
		const s = .85 + rng() * .45;
		palm.scale.setScalar(s);
		group.add(palm);
	}
	group.userData.frondGeo = frondGeo;
	group.userData.mat = mat;
	return group;
}
function createRocks(sunDir) {
	const group = new Group();
	const rng = mulberry32(12648430);
	const mat = new ShaderMaterial({
		uniforms: {
			uSunDir: { value: sunDir },
			uCameraPos: { value: new Vector3() }
		},
		vertexShader: FOLIAGE_VERT,
		fragmentShader: FOLIAGE_FRAG
	});
	for (const [sx, sz] of [
		[4.6, 1.8],
		[-5.1, 3.4],
		[2.2, -4.8],
		[-3.4, -3.6],
		[6.8, -1.2],
		[-1.8, 5.2],
		[7.1, 4.9],
		[-6.4, -5],
		[.6, -6.1],
		[-7, 1.4]
	]) {
		const x = sx + (rng() - .5) * .6;
		const z = sz + (rng() - .5) * .6;
		const h = terrainHeight(x, z);
		if (h < -.9) continue;
		const geo = new IcosahedronGeometry(.28 + rng() * .45, 2);
		const pos = geo.attributes.position;
		const colors = new Float32Array(pos.count * 3);
		for (let i = 0; i < pos.count; i++) {
			const px = pos.getX(i);
			const py = pos.getY(i);
			const pz = pos.getZ(i);
			const n = fbm(px * 3.2 + x, pz * 3.2 + z, 3);
			pos.setXYZ(i, px * (.8 + n * .55), py * (.55 + n * .4), pz * (.8 + n * .55));
			const shade = .22 + n * .12;
			colors[i * 3] = shade;
			colors[i * 3 + 1] = shade * .94;
			colors[i * 3 + 2] = shade * .88;
		}
		geo.setAttribute("color", new BufferAttribute(colors, 3));
		geo.computeVertexNormals();
		const mesh = new Mesh(geo, mat);
		mesh.position.set(x, h + .05, z);
		mesh.rotation.set(rng() * 1.2, rng() * 6, rng() * 1.2);
		group.add(mesh);
	}
	group.userData.mat = mat;
	return group;
}
function createBirds() {
	const group = new Group();
	const geo = new BufferGeometry();
	const positions = new Float32Array([
		-.28,
		0,
		0,
		0,
		0,
		.04,
		0,
		.02,
		0,
		.28,
		0,
		0,
		0,
		0,
		.04,
		0,
		.02,
		0
	]);
	geo.setAttribute("position", new BufferAttribute(positions, 3));
	geo.setIndex([
		0,
		1,
		2,
		3,
		4,
		5
	]);
	geo.computeVertexNormals();
	const mat = new MeshBasicMaterial({
		color: 1711134,
		side: 2
	});
	for (let i = 0; i < 5; i++) {
		const bird = new Mesh(geo, mat);
		bird.userData = {
			radius: 7 + i * 1.4,
			speed: .22 + i * .05,
			height: 3.4 + i % 3 * .55,
			phase: i * 1.3
		};
		group.add(bird);
	}
	group.userData.geo = geo;
	group.userData.mat = mat;
	return group;
}
function updateBirds(group, time) {
	for (const child of group.children) {
		const d = child.userData;
		const a = time * d.speed + d.phase;
		child.position.set(Math.cos(a) * d.radius, d.height + Math.sin(a * 3) * .2, Math.sin(a) * d.radius);
		child.rotation.y = -a + Math.PI * .5;
		child.rotation.z = Math.sin(time * 8 + d.phase) * .35;
	}
}
function createTerrainTexture() {
	const res = 256;
	const data = new Float32Array(res * res * 4);
	const range = TERRAIN_MAX - TERRAIN_MIN;
	for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
		const u = i / 255;
		const v = j / 255;
		const packed = (terrainHeight((u - .5) * 32, (v - .5) * 32) - TERRAIN_MIN) / range;
		const idx = (j * res + i) * 4;
		data[idx] = packed;
		data[idx + 1] = packed;
		data[idx + 2] = packed;
		data[idx + 3] = 1;
	}
	const tex = new DataTexture(data, res, res, RGBAFormat, FloatType);
	tex.wrapS = ClampToEdgeWrapping;
	tex.wrapT = ClampToEdgeWrapping;
	tex.minFilter = LinearFilter;
	tex.magFilter = LinearFilter;
	tex.flipY = false;
	tex.needsUpdate = true;
	tex.generateMipmaps = false;
	return tex;
}
function createIslandMesh(terrainTex, waterTex, sunDir) {
	const segs = isMobileViewport() ? 96 : 160;
	const geo = new PlaneGeometry(32, 32, segs, segs);
	geo.rotateX(-Math.PI / 2);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i);
		pos.setY(i, terrainHeight(x, z));
	}
	pos.needsUpdate = true;
	geo.computeVertexNormals();
	const mat = new ShaderMaterial({
		uniforms: {
			uTerrain: { value: terrainTex },
			uWater: { value: waterTex },
			uSunDir: { value: sunDir },
			uTime: { value: 0 },
			uTerrainMin: { value: TERRAIN_MIN },
			uTerrainMax: { value: TERRAIN_MAX },
			uWorldSize: { value: 32 },
			uCameraPos: { value: new Vector3() }
		},
		vertexShader: ISLAND_VERT,
		fragmentShader: ISLAND_FRAG
	});
	const mesh = new Mesh(geo, mat);
	mesh.frustumCulled = false;
	return mesh;
}
function makeTarget(size) {
	const rt = new WebGLRenderTarget(size, size, {
		type: HalfFloatType,
		format: RGBAFormat,
		minFilter: LinearFilter,
		magFilter: LinearFilter,
		depthBuffer: false,
		stencilBuffer: false,
		wrapS: ClampToEdgeWrapping,
		wrapT: ClampToEdgeWrapping
	});
	rt.texture.flipY = false;
	rt.texture.generateMipmaps = false;
	return rt;
}
var HeightfieldSim = class {
	texture;
	a;
	b;
	scene;
	camera;
	quad;
	updateMat;
	dropMat;
	normalMat;
	sphereMat;
	windMat;
	renderer;
	delta;
	size;
	constructor(renderer, size, terrain, worldSize, terrainMin, terrainMax) {
		this.renderer = renderer;
		this.size = size;
		this.delta = new Vector2(1 / size, 1 / size);
		this.a = makeTarget(size);
		this.b = makeTarget(size);
		this.texture = this.a.texture;
		this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
		this.scene = new Scene();
		const geo = new PlaneGeometry(2, 2);
		this.quad = new Mesh(geo, new MeshBasicMaterial());
		this.scene.add(this.quad);
		const common = {
			uTexture: { value: this.a.texture },
			uDelta: { value: this.delta }
		};
		this.updateMat = new ShaderMaterial({
			uniforms: {
				...common,
				uTerrain: { value: terrain },
				uWorldSize: { value: worldSize },
				uTerrainMin: { value: terrainMin },
				uTerrainMax: { value: terrainMax }
			},
			vertexShader: SIM_VERT,
			fragmentShader: SIM_UPDATE_FRAG,
			depthTest: false,
			depthWrite: false
		});
		this.dropMat = new ShaderMaterial({
			uniforms: {
				uTexture: { value: this.a.texture },
				uCenter: { value: new Vector2() },
				uRadius: { value: .03 },
				uStrength: { value: .08 }
			},
			vertexShader: SIM_VERT,
			fragmentShader: SIM_DROP_FRAG,
			depthTest: false,
			depthWrite: false
		});
		this.normalMat = new ShaderMaterial({
			uniforms: { ...common },
			vertexShader: SIM_VERT,
			fragmentShader: SIM_NORMAL_FRAG,
			depthTest: false,
			depthWrite: false
		});
		this.sphereMat = new ShaderMaterial({
			uniforms: {
				uTexture: { value: this.a.texture },
				uOldCenter: { value: new Vector3() },
				uNewCenter: { value: new Vector3() },
				uRadius: { value: .5 },
				uWorldSize: { value: worldSize }
			},
			vertexShader: SIM_VERT,
			fragmentShader: SIM_SPHERE_FRAG,
			depthTest: false,
			depthWrite: false
		});
		this.windMat = new ShaderMaterial({
			uniforms: {
				uTexture: { value: this.a.texture },
				uTime: { value: 0 },
				uStrength: { value: 35e-5 }
			},
			vertexShader: SIM_VERT,
			fragmentShader: SIM_WIND_FRAG,
			depthTest: false,
			depthWrite: false
		});
	}
	get current() {
		return this.a.texture;
	}
	pass(mat) {
		mat.uniforms.uTexture.value = this.a.texture;
		this.quad.material = mat;
		this.renderer.setRenderTarget(this.b);
		this.renderer.render(this.scene, this.camera);
		const tmp = this.a;
		this.a = this.b;
		this.b = tmp;
	}
	step() {
		this.pass(this.updateMat);
	}
	updateNormals() {
		this.pass(this.normalMat);
	}
	addDrop(u, v, radius, strength) {
		this.dropMat.uniforms.uCenter.value.set(u, v);
		this.dropMat.uniforms.uRadius.value = radius;
		this.dropMat.uniforms.uStrength.value = strength;
		this.pass(this.dropMat);
	}
	moveSphere(oldCenter, newCenter, radius) {
		this.sphereMat.uniforms.uOldCenter.value.copy(oldCenter);
		this.sphereMat.uniforms.uNewCenter.value.copy(newCenter);
		this.sphereMat.uniforms.uRadius.value = radius;
		this.pass(this.sphereMat);
	}
	applyWind(time, strength) {
		this.windMat.uniforms.uTime.value = time;
		this.windMat.uniforms.uStrength.value = strength;
		this.pass(this.windMat);
	}
	reset() {
		const prev = this.renderer.getRenderTarget();
		this.renderer.setRenderTarget(this.a);
		this.renderer.setClearColor(0, 0);
		this.renderer.clear();
		this.renderer.setRenderTarget(this.b);
		this.renderer.clear();
		this.renderer.setRenderTarget(prev);
	}
	dispose() {
		this.a.dispose();
		this.b.dispose();
		this.updateMat.dispose();
		this.dropMat.dispose();
		this.normalMat.dispose();
		this.sphereMat.dispose();
		this.windMat.dispose();
		this.quad.geometry.dispose();
	}
};
var GRAVITY = 6.4;
var BUOYANCY = 14.5;
var DRAG = 1.8;
var WaterWorld = class {
	renderer;
	scene;
	camera;
	sim;
	waterMat;
	island;
	skyMat;
	sphere;
	palms;
	rocks;
	birds;
	sunDir = new Vector3(-.42, .74, .38).normalize();
	spherePos = new Vector3(5.1, .55, 2.4);
	sphereVel = new Vector3();
	prevSphere = new Vector3(5.1, .55, 2.4);
	raycaster = new Raycaster();
	pointer = new Vector2();
	waterPlane = new Plane(new Vector3(0, 1, 0), 0);
	hit = new Vector3();
	canvas;
	terrainTex;
	azimuth = .72;
	polar = .88;
	radius = 16.2;
	targetRadius = 16.2;
	lookAt = new Vector3(.2, .55, .1);
	userOrbited = false;
	paused = false;
	rain = false;
	wind = true;
	gravity = true;
	draggingSphere = false;
	drawing = false;
	orbiting = false;
	aimingLight = false;
	lastPointerX = 0;
	lastPointerY = 0;
	lastDrawU = 0;
	lastDrawV = 0;
	pointers = /* @__PURE__ */ new Map();
	pinchDist = 0;
	raf = null;
	lastTime = 0;
	acc = 0;
	elapsed = 0;
	disposed = false;
	ro = null;
	constructor(canvas, options = {}) {
		this.canvas = canvas;
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance"
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		this.renderer.setClearColor(8890564, 1);
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = 4;
		this.renderer.toneMappingExposure = 1.05;
		this.scene = new Scene();
		this.camera = new PerspectiveCamera(52, 1, .12, 120);
		this.placeCamera();
		this.terrainTex = createTerrainTexture();
		const mobile = isMobileViewport();
		const simRes = mobile ? 160 : 256;
		this.sim = new HeightfieldSim(this.renderer, simRes, this.terrainTex, 32, TERRAIN_MIN, TERRAIN_MAX);
		this.skyMat = new ShaderMaterial({
			uniforms: { uSunDir: { value: this.sunDir } },
			vertexShader: SKY_VERT,
			fragmentShader: SKY_FRAG,
			side: 1,
			depthWrite: false
		});
		const sky = new Mesh(new SphereGeometry(60, 32, 20), this.skyMat);
		sky.frustumCulled = false;
		this.scene.add(sky);
		this.island = createIslandMesh(this.terrainTex, this.sim.current, this.sunDir);
		this.scene.add(this.island);
		const waterSegs = mobile ? 80 : 140;
		const waterGeo = new PlaneGeometry(32, 32, waterSegs, waterSegs);
		waterGeo.rotateX(-Math.PI / 2);
		this.waterMat = new ShaderMaterial({
			uniforms: {
				uWater: { value: this.sim.current },
				uTerrain: { value: this.terrainTex },
				uSunDir: { value: this.sunDir },
				uTime: { value: 0 },
				uTerrainMin: { value: TERRAIN_MIN },
				uTerrainMax: { value: TERRAIN_MAX },
				uWorldSize: { value: 32 },
				uCameraPos: { value: this.camera.position },
				uSpherePos: { value: this.spherePos },
				uSphereRadius: { value: SPHERE_RADIUS },
				uHeightScale: { value: HEIGHT_SCALE }
			},
			vertexShader: WATER_VERT,
			fragmentShader: WATER_FRAG
		});
		const water = new Mesh(waterGeo, this.waterMat);
		water.position.y = .015;
		this.scene.add(water);
		this.sphere = new Mesh(new SphereGeometry(SPHERE_RADIUS, 40, 28), new ShaderMaterial({
			uniforms: {
				uSunDir: { value: this.sunDir },
				uCameraPos: { value: this.camera.position }
			},
			vertexShader: SPHERE_VERT,
			fragmentShader: SPHERE_FRAG,
			transparent: true
		}));
		this.sphere.position.copy(this.spherePos);
		this.scene.add(this.sphere);
		this.palms = createPalms(this.sunDir);
		this.rocks = createRocks(this.sunDir);
		this.birds = createBirds();
		this.scene.add(this.palms, this.rocks, this.birds);
		this.resize();
		this.bind();
		this.seedWaves();
		options.onReady?.({
			setPaused: (v) => {
				this.paused = v;
			},
			setRain: (v) => {
				this.rain = v;
			},
			setWind: (v) => {
				this.wind = v;
			},
			setGravity: (v) => {
				this.gravity = v;
			},
			reset: () => this.reset(),
			splash: () => this.bigSplash(),
			dispose: () => this.dispose()
		});
		this.lastTime = performance.now();
		this.renderer.setAnimationLoop(this.tick);
	}
	seedWaves() {
		this.sim.addDrop(.64, .57, .055, .16);
		this.sim.addDrop(.36, .42, .04, .11);
		this.sim.addDrop(.72, .38, .05, -.1);
		this.sim.addDrop(.48, .68, .035, .09);
		this.sim.addDrop(.58, .48, .03, -.07);
		this.sim.updateNormals();
	}
	reset() {
		this.sim.reset();
		this.spherePos.set(5.1, .55, 2.4);
		this.prevSphere.copy(this.spherePos);
		this.sphereVel.set(0, 0, 0);
		this.sphere.position.copy(this.spherePos);
		this.seedWaves();
	}
	bigSplash() {
		for (let i = 0; i < 7; i++) this.sim.addDrop(.35 + Math.random() * .3, .35 + Math.random() * .3, .04, .1);
		this.sim.updateNormals();
	}
	placeCamera() {
		const sinP = Math.sin(this.polar);
		this.camera.position.set(this.lookAt.x + Math.cos(this.azimuth) * sinP * this.radius, this.lookAt.y + Math.cos(this.polar) * this.radius, this.lookAt.z + Math.sin(this.azimuth) * sinP * this.radius);
		this.camera.lookAt(this.lookAt);
	}
	resize = () => {
		const parent = this.canvas.parentElement ?? this.canvas;
		const w = Math.max(1, parent.clientWidth);
		const h = Math.max(1, parent.clientHeight);
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
	};
	ndcFromEvent(e) {
		const rect = this.canvas.getBoundingClientRect();
		this.pointer.x = (e.clientX - rect.left) / rect.width * 2 - 1;
		this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
	}
	waterUvFromEvent(e) {
		this.ndcFromEvent(e);
		this.raycaster.setFromCamera(this.pointer, this.camera);
		if (!this.raycaster.ray.intersectPlane(this.waterPlane, this.hit)) return null;
		if (Math.abs(this.hit.x) > 15.36 || Math.abs(this.hit.z) > 15.36) return null;
		if (terrainHeight(this.hit.x, this.hit.z) > .12) return null;
		return worldToUv(this.hit.x, this.hit.z);
	}
	hitSphere(e) {
		this.ndcFromEvent(e);
		this.raycaster.setFromCamera(this.pointer, this.camera);
		return this.raycaster.intersectObject(this.sphere).length > 0;
	}
	bind() {
		this.ro = new ResizeObserver(this.resize);
		this.ro.observe(this.canvas.parentElement ?? this.canvas);
		this.canvas.addEventListener("pointerdown", this.onPointerDown);
		this.canvas.addEventListener("pointermove", this.onPointerMove);
		this.canvas.addEventListener("pointerup", this.onPointerUp);
		this.canvas.addEventListener("pointercancel", this.onPointerUp);
		this.canvas.addEventListener("pointerleave", this.onPointerUp);
		this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
		this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
	}
	unbind() {
		this.ro?.disconnect();
		this.canvas.removeEventListener("pointerdown", this.onPointerDown);
		this.canvas.removeEventListener("pointermove", this.onPointerMove);
		this.canvas.removeEventListener("pointerup", this.onPointerUp);
		this.canvas.removeEventListener("pointercancel", this.onPointerUp);
		this.canvas.removeEventListener("pointerleave", this.onPointerUp);
		this.canvas.removeEventListener("wheel", this.onWheel);
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
	}
	onPointerDown = (e) => {
		this.canvas.setPointerCapture(e.pointerId);
		this.pointers.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY
		});
		this.lastPointerX = e.clientX;
		this.lastPointerY = e.clientY;
		if (this.pointers.size === 2) {
			const pts = [...this.pointers.values()];
			this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
			this.drawing = false;
			this.draggingSphere = false;
			this.orbiting = true;
			return;
		}
		if (this.aimingLight) return;
		if (this.hitSphere(e)) {
			this.draggingSphere = true;
			this.sphereVel.set(0, 0, 0);
			return;
		}
		const uv = this.waterUvFromEvent(e);
		if (uv) {
			this.drawing = true;
			this.lastDrawU = uv[0];
			this.lastDrawV = uv[1];
			this.sim.addDrop(uv[0], uv[1], .028, .085);
			return;
		}
		this.orbiting = true;
		this.userOrbited = true;
	};
	onPointerMove = (e) => {
		if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY
		});
		if (this.aimingLight && this.pointers.size > 0) {
			const rect = this.canvas.getBoundingClientRect();
			const nx = (e.clientX - rect.left) / rect.width * 2 - 1;
			const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			this.sunDir.set(-nx, .45 + (1 - Math.abs(ny)) * .45, -ny).normalize();
			return;
		}
		if (this.pointers.size === 2) {
			const pts = [...this.pointers.values()];
			const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
			if (this.pinchDist > 0) {
				const scale = this.pinchDist / dist;
				this.targetRadius = MathUtils.clamp(this.targetRadius * scale, 6.5, 26);
			}
			this.pinchDist = dist;
			const dx = e.movementX;
			const dy = e.movementY;
			this.azimuth += dx * .006;
			this.polar = MathUtils.clamp(this.polar + dy * .005, .22, 1.42);
			this.userOrbited = true;
			return;
		}
		if (this.draggingSphere) {
			this.ndcFromEvent(e);
			this.raycaster.setFromCamera(this.pointer, this.camera);
			if (this.raycaster.ray.intersectPlane(this.waterPlane, this.hit)) {
				this.prevSphere.copy(this.spherePos);
				this.spherePos.x = this.hit.x;
				this.spherePos.z = this.hit.z;
				this.spherePos.y = Math.max(SPHERE_RADIUS * .35, this.spherePos.y);
			}
			return;
		}
		if (this.drawing) {
			const uv = this.waterUvFromEvent(e);
			if (uv) {
				const dist = Math.hypot(uv[0] - this.lastDrawU, uv[1] - this.lastDrawV);
				const strength = MathUtils.clamp(.03 + dist * 1.6, .03, .12);
				this.sim.addDrop(uv[0], uv[1], .026, strength);
				this.lastDrawU = uv[0];
				this.lastDrawV = uv[1];
			}
			return;
		}
		if (this.orbiting) {
			const dx = e.clientX - this.lastPointerX;
			const dy = e.clientY - this.lastPointerY;
			this.azimuth += dx * .0065;
			this.polar = MathUtils.clamp(this.polar + dy * .0055, .22, 1.42);
			this.userOrbited = true;
		}
		this.lastPointerX = e.clientX;
		this.lastPointerY = e.clientY;
	};
	onPointerUp = (e) => {
		this.pointers.delete(e.pointerId);
		if (this.pointers.size < 2) this.pinchDist = 0;
		if (this.pointers.size === 0) {
			this.draggingSphere = false;
			this.drawing = false;
			this.orbiting = false;
		}
	};
	onWheel = (e) => {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 1.08 : .92;
		this.targetRadius = MathUtils.clamp(this.targetRadius * delta, 6.5, 26);
		this.userOrbited = true;
	};
	onKeyDown = (e) => {
		if (e.code === "Space") {
			e.preventDefault();
			this.paused = !this.paused;
		} else if (e.code === "KeyR") this.rain = !this.rain;
		else if (e.code === "KeyN") this.wind = !this.wind;
		else if (e.code === "KeyG") this.gravity = !this.gravity;
		else if (e.code === "KeyL") this.aimingLight = true;
	};
	onKeyUp = (e) => {
		if (e.code === "KeyL") this.aimingLight = false;
	};
	stepPhysics(dt) {
		if (this.draggingSphere) return;
		if (this.gravity) {
			this.sphereVel.y -= GRAVITY * dt;
			const land = terrainHeight(this.spherePos.x, this.spherePos.z);
			const waterH = 0;
			const bottom = this.spherePos.y - SPHERE_RADIUS;
			const submerged = MathUtils.clamp((waterH + SPHERE_RADIUS - this.spherePos.y) / (2 * SPHERE_RADIUS), 0, 1);
			if (bottom < waterH) {
				this.sphereVel.y += BUOYANCY * submerged * dt;
				this.sphereVel.multiplyScalar(1 - DRAG * submerged * dt);
			}
			this.spherePos.addScaledVector(this.sphereVel, dt);
			const minY = Math.max(land + SPHERE_RADIUS * .65, SPHERE_RADIUS * .2);
			if (this.spherePos.y < minY) {
				this.spherePos.y = minY;
				this.sphereVel.y *= -.25;
			}
		}
	}
	tick = (now) => {
		if (this.disposed) return;
		const dt = Math.min((now - this.lastTime) / 1e3, .1);
		this.lastTime = now;
		this.elapsed += dt;
		if (!this.userOrbited) this.azimuth += dt * .045;
		this.radius += (this.targetRadius - this.radius) * (1 - Math.exp(-dt * 6));
		this.placeCamera();
		if (!this.paused) {
			this.acc += dt;
			const step = 1 / 60;
			let guard = 0;
			while (this.acc >= step && guard < 3) {
				this.sim.step();
				if (this.wind) this.sim.applyWind(this.elapsed, 7e-4);
				if (this.rain && Math.random() < .55) this.sim.addDrop(Math.random(), Math.random(), .012, .018);
				this.stepPhysics(step);
				if (this.prevSphere.distanceToSquared(this.spherePos) > 1e-6) {
					this.sim.moveSphere(this.prevSphere, this.spherePos, SPHERE_RADIUS);
					this.prevSphere.copy(this.spherePos);
				}
				this.acc -= step;
				guard++;
			}
			this.sim.updateNormals();
		}
		this.sphere.position.copy(this.spherePos);
		const sphereMat = this.sphere.material;
		if (sphereMat.uniforms?.uCameraPos) sphereMat.uniforms.uCameraPos.value.copy(this.camera.position);
		updateBirds(this.birds, this.elapsed);
		this.waterMat.uniforms.uWater.value = this.sim.current;
		this.waterMat.uniforms.uTime.value = this.elapsed;
		this.waterMat.uniforms.uCameraPos.value.copy(this.camera.position);
		this.waterMat.uniforms.uSpherePos.value.copy(this.spherePos);
		const islandMat = this.island.material;
		islandMat.uniforms.uWater.value = this.sim.current;
		islandMat.uniforms.uTime.value = this.elapsed;
		islandMat.uniforms.uCameraPos.value.copy(this.camera.position);
		const palmMat = this.palms.userData.mat;
		if (palmMat) palmMat.uniforms.uCameraPos.value.copy(this.camera.position);
		const rockMat = this.rocks.userData.mat;
		if (rockMat) rockMat.uniforms.uCameraPos.value.copy(this.camera.position);
		this.renderer.setRenderTarget(null);
		this.renderer.render(this.scene, this.camera);
	};
	dispose() {
		this.disposed = true;
		this.renderer.setAnimationLoop(null);
		this.unbind();
		this.sim.dispose();
		this.terrainTex.dispose();
		this.waterMat.dispose();
		this.skyMat.dispose();
		this.island.geometry.dispose();
		this.island.material.dispose();
		this.sphere.geometry.dispose();
		this.sphere.material.dispose();
		this.palms.userData.frondGeo?.dispose();
		this.palms.userData.mat?.dispose();
		this.rocks.userData.mat?.dispose();
		this.birds.userData.geo?.dispose();
		this.birds.userData.mat?.dispose();
		this.scene.environment?.dispose();
		this.renderer.dispose();
	}
};
//#endregion
export { WaterWorld };
