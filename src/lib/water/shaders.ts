/** Shared GLSL helpers used by the water and island materials. */
export const COMMON_GLSL = /* glsl */ `
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

export const SIM_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const SIM_UPDATE_FRAG = /* glsl */ `
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

export const SIM_DROP_FRAG = /* glsl */ `
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

export const SIM_NORMAL_FRAG = /* glsl */ `
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

export const SIM_SPHERE_FRAG = /* glsl */ `
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

export const SIM_WIND_FRAG = /* glsl */ `
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

export const WATER_VERT = /* glsl */ `
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

export const WATER_FRAG = /* glsl */ `
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

export const ISLAND_VERT = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const ISLAND_FRAG = /* glsl */ `
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

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = position;
  gl_Position = projectionMatrix * viewMatrix * world;
  gl_Position.z = gl_Position.w;
}
`;

export const SKY_FRAG = /* glsl */ `
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

export const FOLIAGE_VERT = /* glsl */ `
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

export const FOLIAGE_FRAG = /* glsl */ `
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

export const SPHERE_VERT = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SPHERE_FRAG = /* glsl */ `
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
