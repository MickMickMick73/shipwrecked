import * as THREE from "three";
import {
  ISLAND_SEGS_DESKTOP,
  ISLAND_SEGS_MOBILE,
  ISLAND_TEX_RES,
  TERRAIN_MAX,
  TERRAIN_MIN,
  WORLD_SIZE,
  isMobileViewport,
} from "./constants";
import { terrainHeight } from "./noise";
import { ISLAND_FRAG, ISLAND_VERT } from "./shaders";

export function createTerrainTexture(): THREE.DataTexture {
  const res = ISLAND_TEX_RES;
  const data = new Float32Array(res * res * 4);
  const range = TERRAIN_MAX - TERRAIN_MIN;
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = (u - 0.5) * WORLD_SIZE;
      const z = (v - 0.5) * WORLD_SIZE;
      const h = terrainHeight(x, z);
      const packed = (h - TERRAIN_MIN) / range;
      const idx = (j * res + i) * 4;
      data[idx] = packed;
      data[idx + 1] = packed;
      data[idx + 2] = packed;
      data[idx + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.FloatType);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.flipY = false;
  tex.needsUpdate = true;
  tex.generateMipmaps = false;
  return tex;
}

export function createIslandMesh(
  terrainTex: THREE.Texture,
  waterTex: THREE.Texture,
  sunDir: THREE.Vector3,
): THREE.Mesh {
  const segs = isMobileViewport() ? ISLAND_SEGS_MOBILE : ISLAND_SEGS_DESKTOP;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTerrain: { value: terrainTex },
      uWater: { value: waterTex },
      uSunDir: { value: sunDir },
      uTime: { value: 0 },
      uTerrainMin: { value: TERRAIN_MIN },
      uTerrainMax: { value: TERRAIN_MAX },
      uWorldSize: { value: WORLD_SIZE },
      uCameraPos: { value: new THREE.Vector3() },
    },
    vertexShader: ISLAND_VERT,
    fragmentShader: ISLAND_FRAG,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
