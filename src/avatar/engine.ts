import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CHARACTERS, RIG_LOADERS, type RigId } from '../data/characters';
import { bus } from './bus';
import { OPENNESS, VISEMES, speechFrame } from './lipsync';

/* ------------------------------ asset loading ----------------------------- */

const rigCache = new Map<RigId, Promise<THREE.Object3D>>();

function loadRig(rig: RigId): Promise<THREE.Object3D> {
  let p = rigCache.get(rig);
  if (!p) {
    p = RIG_LOADERS[rig]().then(
      (m) => new Promise<THREE.Object3D>((resolve, reject) => {
        new GLTFLoader().load(m.default, (g) => resolve(g.scene), undefined, reject);
      }),
    );
    rigCache.set(rig, p);
  }
  return p;
}

const CONTROL_BONES = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftEye', 'RightEye',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
];

type Side = 'Left' | 'Right';
const SIDES: Side[] = ['Left', 'Right'];

interface Rig {
  id: string;
  root: THREE.Group;
  bones: Record<string, THREE.Object3D>;
  rest: Map<THREE.Object3D, THREE.Quaternion>;
  morphs: Map<string, Array<[THREE.Mesh, number]>>;
  hasVisemes: boolean;
  sx: Record<Side, number>;
  headY: number;
}

async function buildRig(id: string): Promise<Rig> {
  const cfg = CHARACTERS[id];
  const src = await loadRig(cfg.rig);
  const scene = cloneSkinned(src);
  const root = new THREE.Group();
  root.add(scene);

  const bones: Record<string, THREE.Object3D> = {};
  const morphs = new Map<string, Array<[THREE.Mesh, number]>>();

  scene.traverse((o) => {
    if (o.name && !bones[o.name]) bones[o.name] = o;
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    if (cfg.hide?.some((r) => r.test(mesh.name))) mesh.visible = false;
    const rule = cfg.rules?.filter((r) => r.mesh.test(mesh.name));
    if (rule?.length && !Array.isArray(mesh.material)) {
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      for (const r of rule) {
        if (r.flat) { mat.map = null; mat.color.set(r.flat); }
        if (r.multiply) mat.color.multiply(new THREE.Color(r.multiply));
        if (r.roughness !== undefined) mat.roughness = r.roughness;
        if (r.metalness !== undefined) mat.metalness = r.metalness;
      }
      mat.needsUpdate = true;
      mesh.material = mat;
    }
    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      for (const [name, idx] of Object.entries(mesh.morphTargetDictionary)) {
        const list = morphs.get(name) ?? [];
        list.push([mesh, idx]);
        morphs.set(name, list);
      }
    }
  });

  // normalise size: head bone at 1.6 m, centred on the hips
  root.updateMatrixWorld(true);
  const headPos = new THREE.Vector3();
  bones.Head.getWorldPosition(headPos);
  const s = 1.6 / headPos.y;
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  const hipsPos = new THREE.Vector3();
  bones.Hips.getWorldPosition(hipsPos);
  root.position.x -= hipsPos.x;
  root.position.z -= hipsPos.z;
  root.updateMatrixWorld(true);

  const rest = new Map<THREE.Object3D, THREE.Quaternion>();
  for (const n of CONTROL_BONES) if (bones[n]) rest.set(bones[n], bones[n].quaternion.clone());

  const la = new THREE.Vector3();
  bones.LeftArm.getWorldPosition(la);
  const hp = new THREE.Vector3();
  bones.Hips.getWorldPosition(hp);
  const left = la.x - hp.x >= 0 ? 1 : -1;

  return {
    id, root, bones, rest, morphs,
    hasVisemes: morphs.has('viseme_aa'),
    sx: { Left: left, Right: -left },
    headY: 1.6,
  };
}

/* --------------------------------- engine --------------------------------- */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Arm { up: THREE.Vector3; fore: THREE.Vector3 }

export class AvatarEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(22, 1, 0.1, 30);
  frame = { center: 1.38, height: 0.96, width: 1.15 };
  headScreen = new THREE.Vector2(0, 0);
  rig: Rig | null = null;

  private rigs = new Map<string, Rig>();
  private w = 1;
  private h = 1;
  private raf = 0;
  private last = 0;
  private disposed = false;

  // dynamics
  private g = { x: 0, y: 0 };
  private lean = 0;
  private tilt = 0;
  private nod = 0;
  private wTalk = 0;
  private wWave = 0;
  private smile = 0.1;
  private brow = 0;
  private energy = 0;
  private vis: Record<string, number> = {};
  private nextBlink = 1.5;
  private blinkT = -1;
  private nextSaccade = 0;
  private sacc = { x: 0, y: 0 };
  private arms: Record<Side, Arm>;

  // scratch
  private pq = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private dq = new THREE.Quaternion();
  private v0 = new THREE.Vector3();
  private v1 = new THREE.Vector3();
  private dv = new THREE.Vector3();
  private eul = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(canvas: HTMLCanvasElement, opts: { preserve?: boolean } = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight(0xa9b8ff, 0x1b1236, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(1.4, 2.6, 2.8); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd0ff, 0.7); fill.position.set(-2, 1.2, 2.2); this.scene.add(fill);
    const rimV = new THREE.DirectionalLight(0x8b5cf6, 3.2); rimV.position.set(-2.4, 1.8, -1.6); this.scene.add(rimV);
    const rimC = new THREE.DirectionalLight(0x38bdf8, 2.0); rimC.position.set(2.6, 1.4, -1.4); this.scene.add(rimC);

    const mk = () => ({ up: new THREE.Vector3(0, -1, 0), fore: new THREE.Vector3(0, -1, 0.3) });
    this.arms = { Left: mk(), Right: mk() };
    for (const v of VISEMES) this.vis[v] = 0;
  }

  async show(id: string) {
    let rig = this.rigs.get(id);
    if (!rig) { rig = await buildRig(id); this.rigs.set(id, rig); }
    if (this.disposed) return;
    if (this.rig) this.scene.remove(this.rig.root);
    this.rig = rig;
    this.scene.add(rig.root);
    // seed arm directions so there is no pop on first frame
    for (const s of SIDES) {
      const sx = rig.sx[s];
      this.arms[s].up.set(sx * 0.2, -1, -0.02).normalize();
      this.arms[s].fore.set(sx * 0.08, -0.92, 0.32).normalize();
    }
    this.wWave = 0;
    this.layout();
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this.layout();
  }

  layout() {
    const f = this.frame;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dV = f.height / 2 / tanH;
    const dH = f.width / 2 / (tanH * this.camera.aspect);
    const dist = Math.max(dV, dH);
    this.camera.position.set(0, f.center + 0.03, dist);
    this.camera.lookAt(0, f.center, 0);
    this.camera.updateProjectionMatrix();
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.disposed) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt, now / 1000);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
  }

  /** Render a single settled frame and return it as a PNG data URI. */
  async portrait(id: string, w: number, h: number, frame: { center: number; height: number; width: number }) {
    await this.show(id);
    this.frame = frame;
    this.resize(w, h);
    bus.hover = true;
    bus.state = 'idle';
    for (let i = 0; i < 40; i++) this.update(0.1, 3 + i * 0.1);
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  /* ------------------------------- per frame ------------------------------ */

  private k(dt: number, rate: number) { return 1 - Math.exp(-dt * rate); }

  private delta(bone: THREE.Object3D, rig: Rig, d: THREE.Quaternion) {
    const rest = rig.rest.get(bone);
    if (!rest || !bone.parent) return;
    bone.parent.getWorldQuaternion(this.pq);
    this.q2.copy(this.pq).invert().multiply(d).multiply(this.pq).multiply(rest);
    bone.quaternion.copy(this.q2);
  }

  private euler(pitch: number, yaw: number, roll: number) {
    this.eul.set(pitch, yaw, roll, 'YXZ');
    return this.dq.setFromEuler(this.eul);
  }

  /** Rotate `bone` so that the direction towards `child` points along `desired` (world space). */
  private aim(bone: THREE.Object3D, child: THREE.Object3D, rig: Rig, desired: THREE.Vector3) {
    const rest = rig.rest.get(bone);
    if (!rest || !bone.parent) return;
    bone.parent.getWorldQuaternion(this.pq);
    this.q2.copy(this.pq).multiply(rest);
    this.v0.copy(child.position).normalize().applyQuaternion(this.q2);
    this.dq.setFromUnitVectors(this.v0, desired);
    this.q2.copy(this.pq).invert().multiply(this.dq).multiply(this.pq).multiply(rest);
    bone.quaternion.copy(this.q2);
  }

  private setMorph(rig: Rig, names: string[], v: number) {
    for (const n of names) {
      const list = rig.morphs.get(n);
      if (!list) continue;
      for (const [mesh, idx] of list) mesh.morphTargetInfluences![idx] = v;
    }
  }

  update(dt: number, t: number) {
    const rig = this.rig;
    if (!rig) return;
    const now = performance.now();
    const st = bus.state;
    const motion = !bus.animate ? 0 : bus.reduceMotion ? 0.35 : 1;
    const kk = (r: number) => this.k(dt, r);
    const B = rig.bones;

    /* ---- head screen position (for gaze) ---- */
    B.Head.getWorldPosition(this.v1);
    this.v1.y += 0.07;
    this.v1.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.headScreen.set(rect.left + (this.v1.x * 0.5 + 0.5) * rect.width, rect.top + (-this.v1.y * 0.5 + 0.5) * rect.height);

    /* ---- gaze ---- */
    let gx = 0, gy = 0;
    const p = bus.pointer;
    const pointerActive = !!p && now - p.t < 6000;
    if (pointerActive && p) {
      gx = clamp((p.x - this.headScreen.x) / (window.innerWidth * 0.38), -1, 1);
      gy = clamp((p.y - this.headScreen.y) / (window.innerHeight * 0.38), -1, 1);
    } else if (motion > 0) {
      if (now > this.nextSaccade) { this.sacc = { x: rand(-0.4, 0.4), y: rand(-0.25, 0.15) }; this.nextSaccade = now + rand(1600, 4800); }
      gx = this.sacc.x * 0.45; gy = this.sacc.y * 0.45;
    }
    if (st === 'processing') { gx = -0.5; gy = -0.7; }
    else if (st === 'listening') { gx *= 0.25; gy *= 0.25; }
    else if (st === 'speaking') { gx *= 0.55; gy *= 0.55; }
    this.g.x += (gx - this.g.x) * kk(5);
    this.g.y += (gy - this.g.y) * kk(5);
    const yaw = this.g.x * 0.62 * Math.max(motion, 0.4);
    const pitch = this.g.y * 0.36 * Math.max(motion, 0.4);

    /* ---- body dynamics ---- */
    const breath = Math.sin(t * 1.55) * 0.011 * motion;
    const sway = Math.sin(t * 0.43) * 0.02 * motion;
    const leanT = st === 'listening' ? 0.055 : st === 'processing' ? -0.025 : st === 'speaking' ? 0.02 : 0;
    this.lean += (leanT - this.lean) * kk(3);
    const tiltT = st === 'listening' ? 0.09 : st === 'processing' ? -0.12 : 0;
    this.tilt += (tiltT - this.tilt) * kk(3);
    const nodT = st === 'listening' && bus.micLevel > 0.1 ? Math.sin(t * 5.2) * 0.07 * Math.min(1, bus.micLevel * 3) : 0;
    this.nod += (nodT - this.nod) * kk(8);
    const idleHeadYaw = Math.sin(t * 0.61 + 1) * 0.035 * motion;
    const idleHeadPitch = Math.sin(t * 0.47) * 0.02 * motion;

    const wTalkT = st === 'speaking' && motion > 0 ? 1 : 0;
    this.wTalk += (wTalkT - this.wTalk) * kk(4);
    const waveActive = now - bus.waveAt < 2600 && motion > 0;
    this.wWave += ((waveActive ? 1 : 0) - this.wWave) * kk(waveActive ? 6 : 4);

    /* ---- lip sync ---- */
    const target: Record<string, number> = {};
    let done = false;
    const sp = bus.speech;
    if (sp) {
      const f = speechFrame(sp, now);
      if (f.done) { done = true; } else { target[f.v] = f.w; }
    }
    if (done && bus.speech) bus.speech = null;
    let open = 0;
    for (const v of VISEMES) {
      const cur = this.vis[v];
      this.vis[v] = cur + ((target[v] ?? 0) - cur) * kk(32);
      open += this.vis[v] * OPENNESS[v];
    }
    this.energy += (open - this.energy) * kk(10);

    /* ---- apply: spine / head / eyes ---- */
    this.delta(B.Spine, rig, this.euler(this.lean * 0.4 + breath * 0.5, sway * 0.5, sway * 0.4));
    if (B.Spine1) this.delta(B.Spine1, rig, this.euler(this.lean * 0.3 + breath * 0.5, yaw * 0.06 + sway * 0.3, -sway * 0.2));
    this.delta(B.Spine2, rig, this.euler(this.lean * 0.3 + breath, yaw * 0.1, sway * 0.2));
    this.delta(B.Neck, rig, this.euler(pitch * 0.3 + this.nod * 0.4, yaw * 0.3 + idleHeadYaw * 0.4, this.tilt * 0.4));
    this.delta(B.Head, rig, this.euler(pitch * 0.55 + this.nod * 0.6 + idleHeadPitch + this.energy * 0.03 * Math.sin(t * 7), yaw * 0.52 + idleHeadYaw * 0.6, this.tilt * 0.6 + sway * 0.3));
    const eyeYaw = this.g.x * 0.3 + (st === 'processing' ? -0.05 : 0);
    const eyePitch = this.g.y * 0.22;
    if (B.LeftEye) this.delta(B.LeftEye, rig, this.euler(eyePitch, eyeYaw, 0));
    if (B.RightEye) this.delta(B.RightEye, rig, this.euler(eyePitch, eyeYaw, 0));

    /* ---- apply: arms ---- */
    const kArm = kk(7);
    for (const s of SIDES) {
      const sx = rig.sx[s];
      const arm = this.arms[s];
      // idle
      const up = this.v0.set(sx * 0.2, -1, -0.02);
      const fore = this.v1.set(sx * 0.08, -0.92, 0.32);
      const upT = new THREE.Vector3().copy(up);
      const foreT = new THREE.Vector3().copy(fore);
      // speaking gestures (open hands, beat-driven)
      if (this.wTalk > 0.01) {
        const ph = s === 'Left' ? 0 : 2.1;
        const n1 = 0.5 * Math.sin(t * 2.3 + ph) + 0.5 * Math.sin(t * 3.7 + ph * 1.3 + 1);
        const n2 = 0.5 * Math.sin(t * 1.9 + ph + 0.6) + 0.5 * Math.sin(t * 3.1 + ph);
        const boost = 0.65 + Math.min(0.5, this.energy * 1.2);
        const tu = new THREE.Vector3(sx * (0.36 + 0.06 * n1), -0.92, 0.16 + 0.1 * n2);
        const tf = new THREE.Vector3(sx * (0.34 + 0.14 * n1 * boost), -0.3 + 0.24 * n2 * boost, 0.9);
        upT.lerp(tu, this.wTalk);
        foreT.lerp(tf, this.wTalk);
      }
      // wave with the character's right arm
      if (s === 'Right' && this.wWave > 0.01) {
        const wv = Math.sin(t * 10) * 0.45;
        const wu = new THREE.Vector3(sx * 0.78, 0.42, 0.18);
        const wf = new THREE.Vector3(sx * (0.2 + wv), 0.95, 0.12);
        upT.lerp(wu, this.wWave);
        foreT.lerp(wf, this.wWave);
      }
      arm.up.lerp(upT.normalize(), kArm).normalize();
      arm.fore.lerp(foreT.normalize(), kArm).normalize();

      const shoulder = B[`${s}Shoulder`];
      const upper = B[`${s}Arm`];
      const lower = B[`${s}ForeArm`];
      const hand = B[`${s}Hand`];
      if (shoulder && upper) this.aim(shoulder, upper, rig, this.dv.set(sx, -0.14 + 0.1 * this.wWave * (s === 'Right' ? 1 : 0), -0.02).normalize());
      if (upper && lower) this.aim(upper, lower, rig, arm.up);
      if (lower && hand) this.aim(lower, hand, rig, arm.fore);
    }

    /* ---- face ---- */
    // blink
    if (this.blinkT < 0 && t > this.nextBlink) this.blinkT = 0;
    let blink = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const bt = this.blinkT / 0.16;
      blink = bt < 1 ? Math.sin(bt * Math.PI) : 0;
      if (bt >= 1) { this.blinkT = -1; this.nextBlink = t + rand(2.2, 5.5); }
    }
    this.setMorph(rig, ['eyeBlinkLeft', 'eyeBlinkRight'], blink);

    const hover = bus.hover;
    const poked = now < bus.smileUntil;
    const smileT = poked ? 0.85 : hover ? 0.5 : st === 'listening' ? 0.3 : st === 'speaking' ? 0.2 : st === 'processing' ? 0 : 0.14;
    this.smile += (smileT - this.smile) * kk(5);
    const browT = st === 'processing' ? 0.55 : st === 'listening' ? 0.35 : st === 'speaking' ? 0.12 + this.energy * 0.5 : poked ? 0.3 : 0;
    this.brow += (browT - this.brow) * kk(6);

    const smileEff = this.smile * (1 - Math.min(0.7, this.energy * 0.9));
    if (rig.morphs.has('mouthSmileLeft')) this.setMorph(rig, ['mouthSmileLeft', 'mouthSmileRight'], smileEff * 0.8);
    else this.setMorph(rig, ['mouthSmile'], smileEff * 0.8);
    this.setMorph(rig, ['cheekSquintLeft', 'cheekSquintRight'], smileEff * 0.35);
    this.setMorph(rig, ['browInnerUp'], this.brow);
    this.setMorph(rig, ['browOuterUpLeft', 'browOuterUpRight'], this.brow * 0.5);

    if (rig.hasVisemes) {
      for (const v of VISEMES) this.setMorph(rig, [`viseme_${v}`], v === 'sil' ? 0 : this.vis[v]);
      this.setMorph(rig, ['jawOpen'], Math.min(1, open * 0.12));
    } else {
      this.setMorph(rig, ['mouthOpen'], Math.min(1, open * 0.85));
      if (rig.morphs.has('mouthSmile')) this.setMorph(rig, ['mouthSmile'], Math.min(1, smileEff * 0.8 + (this.vis.E + this.vis.I) * 0.25));
    }
  }
}
