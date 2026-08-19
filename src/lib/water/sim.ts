import * as THREE from "three";
import {
  SIM_DROP_FRAG,
  SIM_NORMAL_FRAG,
  SIM_SPHERE_FRAG,
  SIM_UPDATE_FRAG,
  SIM_VERT,
  SIM_WIND_FRAG,
} from "./shaders";

function makeTarget(size: number): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  rt.texture.flipY = false;
  rt.texture.generateMipmaps = false;
  return rt;
}

export class HeightfieldSim {
  readonly texture: THREE.Texture;
  private a: THREE.WebGLRenderTarget;
  private b: THREE.WebGLRenderTarget;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly quad: THREE.Mesh;
  private readonly updateMat: THREE.ShaderMaterial;
  private readonly dropMat: THREE.ShaderMaterial;
  private readonly normalMat: THREE.ShaderMaterial;
  private readonly sphereMat: THREE.ShaderMaterial;
  private readonly windMat: THREE.ShaderMaterial;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly delta: THREE.Vector2;
  private readonly size: number;

  constructor(
    renderer: THREE.WebGLRenderer,
    size: number,
    terrain: THREE.Texture,
    worldSize: number,
    terrainMin: number,
    terrainMax: number,
  ) {
    this.renderer = renderer;
    this.size = size;
    this.delta = new THREE.Vector2(1 / size, 1 / size);
    this.a = makeTarget(size);
    this.b = makeTarget(size);
    this.texture = this.a.texture;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this.scene.add(this.quad);

    const common = {
      uTexture: { value: this.a.texture },
      uDelta: { value: this.delta },
    };

    this.updateMat = new THREE.ShaderMaterial({
      uniforms: {
        ...common,
        uTerrain: { value: terrain },
        uWorldSize: { value: worldSize },
        uTerrainMin: { value: terrainMin },
        uTerrainMax: { value: terrainMax },
      },
      vertexShader: SIM_VERT,
      fragmentShader: SIM_UPDATE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.dropMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.a.texture },
        uCenter: { value: new THREE.Vector2() },
        uRadius: { value: 0.03 },
        uStrength: { value: 0.08 },
      },
      vertexShader: SIM_VERT,
      fragmentShader: SIM_DROP_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.normalMat = new THREE.ShaderMaterial({
      uniforms: { ...common },
      vertexShader: SIM_VERT,
      fragmentShader: SIM_NORMAL_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.sphereMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.a.texture },
        uOldCenter: { value: new THREE.Vector3() },
        uNewCenter: { value: new THREE.Vector3() },
        uRadius: { value: 0.5 },
        uWorldSize: { value: worldSize },
      },
      vertexShader: SIM_VERT,
      fragmentShader: SIM_SPHERE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.windMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.a.texture },
        uTime: { value: 0 },
        uStrength: { value: 0.00035 },
      },
      vertexShader: SIM_VERT,
      fragmentShader: SIM_WIND_FRAG,
      depthTest: false,
      depthWrite: false,
    });
  }

  get current(): THREE.Texture {
    return this.a.texture;
  }

  private pass(mat: THREE.ShaderMaterial) {
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

  addDrop(u: number, v: number, radius: number, strength: number) {
    this.dropMat.uniforms.uCenter.value.set(u, v);
    this.dropMat.uniforms.uRadius.value = radius;
    this.dropMat.uniforms.uStrength.value = strength;
    this.pass(this.dropMat);
  }

  moveSphere(oldCenter: THREE.Vector3, newCenter: THREE.Vector3, radius: number) {
    this.sphereMat.uniforms.uOldCenter.value.copy(oldCenter);
    this.sphereMat.uniforms.uNewCenter.value.copy(newCenter);
    this.sphereMat.uniforms.uRadius.value = radius;
    this.pass(this.sphereMat);
  }

  applyWind(time: number, strength: number) {
    this.windMat.uniforms.uTime.value = time;
    this.windMat.uniforms.uStrength.value = strength;
    this.pass(this.windMat);
  }

  reset() {
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.a);
    this.renderer.setClearColor(0x000000, 0);
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
    (this.quad.geometry as THREE.BufferGeometry).dispose();
  }
}
