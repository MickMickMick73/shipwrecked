import * as THREE from "three";
import {
  HEIGHT_SCALE,
  SIM_RES_DESKTOP,
  SIM_RES_MOBILE,
  SPHERE_RADIUS,
  TERRAIN_MAX,
  TERRAIN_MIN,
  WATER_SEGS_DESKTOP,
  WATER_SEGS_MOBILE,
  WORLD_SIZE,
  isMobileViewport,
  worldToUv,
} from "./constants";
import { createBirds, createPalms, createRocks, updateBirds } from "./foliage";
import { createIslandMesh, createTerrainTexture } from "./island";
import { terrainHeight } from "./noise";
import { SKY_FRAG, SKY_VERT, SPHERE_FRAG, SPHERE_VERT, WATER_FRAG, WATER_VERT } from "./shaders";
import { HeightfieldSim } from "./sim";
import type { WorldHandle, WorldOptions } from "./types";

const GRAVITY = 6.4;
const BUOYANCY = 14.5;
const DRAG = 1.8;

export class WaterWorld {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sim: HeightfieldSim;
  private readonly waterMat: THREE.ShaderMaterial;
  private readonly island: THREE.Mesh;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly sphere: THREE.Mesh;
  private readonly palms: THREE.Group;
  private readonly rocks: THREE.Group;
  private readonly birds: THREE.Group;
  private readonly sunDir = new THREE.Vector3(-0.42, 0.74, 0.38).normalize();
  private readonly spherePos = new THREE.Vector3(5.1, 0.55, 2.4);
  private readonly sphereVel = new THREE.Vector3();
  private readonly prevSphere = new THREE.Vector3(5.1, 0.55, 2.4);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly hit = new THREE.Vector3();
  private readonly canvas: HTMLCanvasElement;
  private readonly terrainTex: THREE.DataTexture;

  private azimuth = 0.72;
  private polar = 0.88;
  private radius = 16.2;
  private targetRadius = 16.2;
  private readonly lookAt = new THREE.Vector3(0.2, 0.55, 0.1);
  private userOrbited = false;

  private paused = false;
  private rain = false;
  private wind = true;
  private gravity = true;
  private draggingSphere = false;
  private drawing = false;
  private orbiting = false;
  private aimingLight = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastDrawU = 0;
  private lastDrawV = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;

  private raf: number | null = null;
  private lastTime = 0;
  private acc = 0;
  private elapsed = 0;
  private disposed = false;
  private ro: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, options: WorldOptions = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x87a8c4, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.12, 120);
    this.placeCamera();

    this.terrainTex = createTerrainTexture();
    const mobile = isMobileViewport();
    const simRes = mobile ? SIM_RES_MOBILE : SIM_RES_DESKTOP;

    this.sim = new HeightfieldSim(
      this.renderer,
      simRes,
      this.terrainTex,
      WORLD_SIZE,
      TERRAIN_MIN,
      TERRAIN_MAX,
    );

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { uSunDir: { value: this.sunDir } },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 20), this.skyMat);
    sky.frustumCulled = false;
    this.scene.add(sky);

    this.island = createIslandMesh(this.terrainTex, this.sim.current, this.sunDir);
    this.scene.add(this.island);

    const waterSegs = mobile ? WATER_SEGS_MOBILE : WATER_SEGS_DESKTOP;
    const waterGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, waterSegs, waterSegs);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uWater: { value: this.sim.current },
        uTerrain: { value: this.terrainTex },
        uSunDir: { value: this.sunDir },
        uTime: { value: 0 },
        uTerrainMin: { value: TERRAIN_MIN },
        uTerrainMax: { value: TERRAIN_MAX },
        uWorldSize: { value: WORLD_SIZE },
        uCameraPos: { value: this.camera.position },
        uSpherePos: { value: this.spherePos },
        uSphereRadius: { value: SPHERE_RADIUS },
        uHeightScale: { value: HEIGHT_SCALE },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
    });
    const water = new THREE.Mesh(waterGeo, this.waterMat);
    water.position.y = 0.015;
    this.scene.add(water);

    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(SPHERE_RADIUS, 40, 28),
      new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: { value: this.sunDir },
          uCameraPos: { value: this.camera.position },
        },
        vertexShader: SPHERE_VERT,
        fragmentShader: SPHERE_FRAG,
        transparent: true,
      }),
    );
    this.sphere.position.copy(this.spherePos);
    this.scene.add(this.sphere);

    this.palms = createPalms(this.sunDir);
    this.rocks = createRocks(this.sunDir);
    this.birds = createBirds();
    this.scene.add(this.palms, this.rocks, this.birds);

    this.resize();
    this.bind();
    this.seedWaves();

    const handle: WorldHandle = {
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
      dispose: () => this.dispose(),
    };
    options.onReady?.(handle);

    this.lastTime = performance.now();
    this.renderer.setAnimationLoop(this.tick);
  }

  private seedWaves() {
    this.sim.addDrop(0.64, 0.57, 0.055, 0.16);
    this.sim.addDrop(0.36, 0.42, 0.04, 0.11);
    this.sim.addDrop(0.72, 0.38, 0.05, -0.1);
    this.sim.addDrop(0.48, 0.68, 0.035, 0.09);
    this.sim.addDrop(0.58, 0.48, 0.03, -0.07);
    this.sim.updateNormals();
  }

  private reset() {
    this.sim.reset();
    this.spherePos.set(5.1, 0.55, 2.4);
    this.prevSphere.copy(this.spherePos);
    this.sphereVel.set(0, 0, 0);
    this.sphere.position.copy(this.spherePos);
    this.seedWaves();
  }

  private bigSplash() {
    for (let i = 0; i < 7; i++) {
      this.sim.addDrop(0.35 + Math.random() * 0.3, 0.35 + Math.random() * 0.3, 0.04, 0.1);
    }
    this.sim.updateNormals();
  }

  private placeCamera() {
    const sinP = Math.sin(this.polar);
    this.camera.position.set(
      this.lookAt.x + Math.cos(this.azimuth) * sinP * this.radius,
      this.lookAt.y + Math.cos(this.polar) * this.radius,
      this.lookAt.z + Math.sin(this.azimuth) * sinP * this.radius,
    );
    this.camera.lookAt(this.lookAt);
  }

  private resize = () => {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private ndcFromEvent(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private waterUvFromEvent(e: PointerEvent): [number, number] | null {
    this.ndcFromEvent(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.waterPlane, this.hit)) return null;
    if (Math.abs(this.hit.x) > WORLD_SIZE * 0.48 || Math.abs(this.hit.z) > WORLD_SIZE * 0.48) {
      return null;
    }
    const land = terrainHeight(this.hit.x, this.hit.z);
    if (land > 0.12) return null;
    return worldToUv(this.hit.x, this.hit.z);
  }

  private hitSphere(e: PointerEvent): boolean {
    this.ndcFromEvent(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.sphere);
    return hits.length > 0;
  }

  private bind() {
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

  private unbind() {
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

  private onPointerDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
      this.sim.addDrop(uv[0], uv[1], 0.028, 0.085);
      return;
    }

    this.orbiting = true;
    this.userOrbited = true;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (this.aimingLight && this.pointers.size > 0) {
      const rect = this.canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.sunDir.set(-nx, 0.45 + (1 - Math.abs(ny)) * 0.45, -ny).normalize();
      return;
    }

    if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.pinchDist > 0) {
        const scale = this.pinchDist / dist;
        this.targetRadius = THREE.MathUtils.clamp(this.targetRadius * scale, 6.5, 26);
      }
      this.pinchDist = dist;
      const dx = e.movementX;
      const dy = e.movementY;
      this.azimuth += dx * 0.006;
      this.polar = THREE.MathUtils.clamp(this.polar + dy * 0.005, 0.22, 1.42);
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
        this.spherePos.y = Math.max(SPHERE_RADIUS * 0.35, this.spherePos.y);
      }
      return;
    }

    if (this.drawing) {
      const uv = this.waterUvFromEvent(e);
      if (uv) {
        const dist = Math.hypot(uv[0] - this.lastDrawU, uv[1] - this.lastDrawV);
        const strength = THREE.MathUtils.clamp(0.03 + dist * 1.6, 0.03, 0.12);
        this.sim.addDrop(uv[0], uv[1], 0.026, strength);
        this.lastDrawU = uv[0];
        this.lastDrawV = uv[1];
      }
      return;
    }

    if (this.orbiting) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.azimuth += dx * 0.0065;
      this.polar = THREE.MathUtils.clamp(this.polar + dy * 0.0055, 0.22, 1.42);
      this.userOrbited = true;
    }

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size === 0) {
      this.draggingSphere = false;
      this.drawing = false;
      this.orbiting = false;
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.08 : 0.92;
    this.targetRadius = THREE.MathUtils.clamp(this.targetRadius * delta, 6.5, 26);
    this.userOrbited = true;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      this.paused = !this.paused;
    } else if (e.code === "KeyR") {
      this.rain = !this.rain;
    } else if (e.code === "KeyN") {
      this.wind = !this.wind;
    } else if (e.code === "KeyG") {
      this.gravity = !this.gravity;
    } else if (e.code === "KeyL") {
      this.aimingLight = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "KeyL") this.aimingLight = false;
  };

  private stepPhysics(dt: number) {
    if (this.draggingSphere) return;
    if (this.gravity) {
      this.sphereVel.y -= GRAVITY * dt;
      const land = terrainHeight(this.spherePos.x, this.spherePos.z);
      const waterH = 0;
      const bottom = this.spherePos.y - SPHERE_RADIUS;
      const submerged = THREE.MathUtils.clamp((waterH + SPHERE_RADIUS - this.spherePos.y) / (2 * SPHERE_RADIUS), 0, 1);
      if (bottom < waterH) {
        this.sphereVel.y += BUOYANCY * submerged * dt;
        this.sphereVel.multiplyScalar(1 - DRAG * submerged * dt);
      }
      this.spherePos.addScaledVector(this.sphereVel, dt);
      const minY = Math.max(land + SPHERE_RADIUS * 0.65, SPHERE_RADIUS * 0.2);
      if (this.spherePos.y < minY) {
        this.spherePos.y = minY;
        this.sphereVel.y *= -0.25;
      }
    }
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.elapsed += dt;

    if (!this.userOrbited) this.azimuth += dt * 0.045;
    this.radius += (this.targetRadius - this.radius) * (1 - Math.exp(-dt * 6));
    this.placeCamera();

    if (!this.paused) {
      this.acc += dt;
      const step = 1 / 60;
      let guard = 0;
      while (this.acc >= step && guard < 3) {
        this.sim.step();
        if (this.wind) this.sim.applyWind(this.elapsed, 0.0007);
        if (this.rain && Math.random() < 0.55) {
          this.sim.addDrop(Math.random(), Math.random(), 0.012, 0.018);
        }
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
    const sphereMat = this.sphere.material as THREE.ShaderMaterial;
    if (sphereMat.uniforms?.uCameraPos) {
      sphereMat.uniforms.uCameraPos.value.copy(this.camera.position);
    }
    updateBirds(this.birds, this.elapsed);

    this.waterMat.uniforms.uWater.value = this.sim.current;
    this.waterMat.uniforms.uTime.value = this.elapsed;
    this.waterMat.uniforms.uCameraPos.value.copy(this.camera.position);
    this.waterMat.uniforms.uSpherePos.value.copy(this.spherePos);

    const islandMat = this.island.material as THREE.ShaderMaterial;
    islandMat.uniforms.uWater.value = this.sim.current;
    islandMat.uniforms.uTime.value = this.elapsed;
    islandMat.uniforms.uCameraPos.value.copy(this.camera.position);

    const palmMat = this.palms.userData.mat as THREE.ShaderMaterial | undefined;
    if (palmMat) palmMat.uniforms.uCameraPos.value.copy(this.camera.position);
    const rockMat = this.rocks.userData.mat as THREE.ShaderMaterial | undefined;
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
    (this.island.material as THREE.Material).dispose();
    this.sphere.geometry.dispose();
    (this.sphere.material as THREE.Material).dispose();
    (this.palms.userData.frondGeo as THREE.BufferGeometry | undefined)?.dispose();
    (this.palms.userData.mat as THREE.Material | undefined)?.dispose();
    (this.rocks.userData.mat as THREE.Material | undefined)?.dispose();
    (this.birds.userData.geo as THREE.BufferGeometry | undefined)?.dispose();
    (this.birds.userData.mat as THREE.Material | undefined)?.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
