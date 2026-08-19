import * as THREE from "three";
import { terrainHeight, terrainNormal, mulberry32, fbm } from "./noise";
import { FOLIAGE_FRAG, FOLIAGE_VERT } from "./shaders";

function makeFrondGeo(): THREE.BufferGeometry {
  const w = 0.22;
  const len = 1.55;
  const segs = 8;
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const y = Math.sin(t * Math.PI * 0.72) * -0.35 - t * 0.08;
    const x = t * len;
    const half = w * (1 - t * 0.92) * (t < 0.08 ? t / 0.08 : 1);
    const green = 0.22 + t * 0.18;
    positions.push(x, y, -half, x, y, half);
    normals.push(0, 1, 0, 0, 1, 0);
    colors.push(0.12, green, 0.08, 0.16, green + 0.08, 0.1);
    if (i < segs) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeTrunkGeo(rng: () => number): THREE.BufferGeometry {
  const h = 1.7 + rng() * 0.7;
  const segs = 7;
  const radial = 6;
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const bend = (rng() - 0.5) * 0.35;

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const r = 0.085 * (1 - t * 0.55);
    const y = t * h;
    const ox = bend * t * t;
    for (let k = 0; k <= radial; k++) {
      const a = (k / radial) * Math.PI * 2;
      const px = Math.cos(a) * r + ox;
      const pz = Math.sin(a) * r;
      positions.push(px, y, pz);
      normals.push(Math.cos(a), 0.15, Math.sin(a));
      const shade = 0.28 + t * 0.08 + ((k + i) % 2) * 0.04;
      colors.push(shade, shade * 0.72, 0.16);
    }
    if (i < segs) {
      for (let k = 0; k < radial; k++) {
        const a = i * (radial + 1) + k;
        const b = a + radial + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createPalms(sunDir: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const rng = mulberry32(0x51a7d);
  const frondGeo = makeFrondGeo();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: sunDir },
      uCameraPos: { value: new THREE.Vector3() },
    },
    vertexShader: FOLIAGE_VERT,
    fragmentShader: FOLIAGE_FRAG,
    side: THREE.DoubleSide,
  });

  const placed: { x: number; z: number }[] = [];
  let attempts = 0;
  while (placed.length < 22 && attempts < 400) {
    attempts++;
    const ang = rng() * Math.PI * 2;
    const rad = 1.2 + rng() * 6.4;
    const x = Math.cos(ang) * rad + (rng() - 0.5) * 1.4;
    const z = Math.sin(ang) * rad + (rng() - 0.5) * 1.4;
    const h = terrainHeight(x, z);
    const n = terrainNormal(x, z);
    if (h < 0.7 || h > 2.6 || n[1] < 0.72) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 1.15)) continue;
    placed.push({ x, z });

    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(makeTrunkGeo(rng), mat);
    palm.add(trunk);
    const topY = 1.75 + rng() * 0.55;
    const fronds = 7 + Math.floor(rng() * 3);
    for (let i = 0; i < fronds; i++) {
      const frond = new THREE.Mesh(frondGeo, mat);
      frond.position.set((rng() - 0.5) * 0.08, topY, (rng() - 0.5) * 0.08);
      frond.rotation.y = (i / fronds) * Math.PI * 2 + rng() * 0.25;
      frond.rotation.z = 0.35 + rng() * 0.45;
      frond.rotation.x = (rng() - 0.5) * 0.3;
      palm.add(frond);
    }
    palm.position.set(x, h - 0.04, z);
    palm.rotation.y = rng() * Math.PI * 2;
    const s = 0.85 + rng() * 0.45;
    palm.scale.setScalar(s);
    group.add(palm);
  }

  group.userData.frondGeo = frondGeo;
  group.userData.mat = mat;
  return group;
}

export function createRocks(sunDir: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const rng = mulberry32(0xc0ffee);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: sunDir },
      uCameraPos: { value: new THREE.Vector3() },
    },
    vertexShader: FOLIAGE_VERT,
    fragmentShader: FOLIAGE_FRAG,
  });

  const spots = [
    [4.6, 1.8],
    [-5.1, 3.4],
    [2.2, -4.8],
    [-3.4, -3.6],
    [6.8, -1.2],
    [-1.8, 5.2],
    [7.1, 4.9],
    [-6.4, -5.0],
    [0.6, -6.1],
    [-7.0, 1.4],
  ];

  for (const [sx, sz] of spots) {
    const x = sx + (rng() - 0.5) * 0.6;
    const z = sz + (rng() - 0.5) * 0.6;
    const h = terrainHeight(x, z);
    if (h < -0.9) continue;
    const geo = new THREE.IcosahedronGeometry(0.28 + rng() * 0.45, 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      const n = fbm(px * 3.2 + x, pz * 3.2 + z, 3);
      pos.setXYZ(i, px * (0.8 + n * 0.55), py * (0.55 + n * 0.4), pz * (0.8 + n * 0.55));
      const shade = 0.22 + n * 0.12;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade * 0.94;
      colors[i * 3 + 2] = shade * 0.88;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h + 0.05, z);
    mesh.rotation.set(rng() * 1.2, rng() * 6, rng() * 1.2);
    group.add(mesh);
  }

  group.userData.mat = mat;
  return group;
}

export function createBirds(): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  const span = 0.28;
  const positions = new Float32Array([
    -span, 0, 0, 0, 0, 0.04, 0, 0.02, 0, span, 0, 0, 0, 0, 0.04, 0, 0.02, 0,
  ]);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex([0, 1, 2, 3, 4, 5]);
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({
    color: 0x1a1c1e,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 5; i++) {
    const bird = new THREE.Mesh(geo, mat);
    bird.userData = {
      radius: 7 + i * 1.4,
      speed: 0.22 + i * 0.05,
      height: 3.4 + (i % 3) * 0.55,
      phase: i * 1.3,
    };
    group.add(bird);
  }
  group.userData.geo = geo;
  group.userData.mat = mat;
  return group;
}

export function updateBirds(group: THREE.Group, time: number) {
  for (const child of group.children) {
    const d = child.userData as {
      radius: number;
      speed: number;
      height: number;
      phase: number;
    };
    const a = time * d.speed + d.phase;
    child.position.set(Math.cos(a) * d.radius, d.height + Math.sin(a * 3.0) * 0.2, Math.sin(a) * d.radius);
    child.rotation.y = -a + Math.PI * 0.5;
    child.rotation.z = Math.sin(time * 8.0 + d.phase) * 0.35;
  }
}
