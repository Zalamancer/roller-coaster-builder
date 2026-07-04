import * as THREE from 'three';

const GRAVITY = 20;
const FRICTION = 0.12;
const MIN_SPEED = 4;
const PEAK_SPEED_MARGIN = 14; // extra energy above the bare minimum, so even the highest point isn't crawling
const CAMERA_BACK = 11;
const CAMERA_UP = 5.5;
const LOOKAHEAD = 4;
const FINISH_DELAY_MS = 1400;
const MIN_FLAT_TANGENT_LENGTH = 0.15;
const CAMERA_COLLISION_SKIN = 1.5;
const CAMERA_COLLISION_MARGIN = 1;
const CAMERA_MIN_DISTANCE = 2.5;

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _flat = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

export class RideMode {
  constructor({ scene, camera, controls, ui }) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.ui = ui;
    this.train = null;
    this.trackGroup = null;
    this.active = false;
    this._finished = false;
    this._lookTarget = new THREE.Vector3();
    this._flatHeading = new THREE.Vector3(0, 0, 1);
  }

  start(path, makeTrain, trackGroup) {
    if (!path.frames.length || path.totalLength < 1) return false;
    this.path = path;
    this.trackGroup = trackGroup || null;
    this.distance = 0;
    const peakHeight = path.frames.reduce((m, f) => Math.max(m, f.position.y), path.frames[0].position.y);
    // Simulates a chain lift hauling the train to the track's highest point before releasing it,
    // so speed is governed by real height-relative-to-peak for the whole ride, not just the start.
    this.energy = 0.5 * MIN_SPEED * MIN_SPEED + GRAVITY * peakHeight + PEAK_SPEED_MARGIN;
    this._finished = false;

    this.train = makeTrain();
    this.scene.add(this.train);
    const startTangent = path.frames[0].tangent;
    this._flatHeading.set(startTangent.x, 0, startTangent.z);
    if (this._flatHeading.lengthSq() < MIN_FLAT_TANGENT_LENGTH * MIN_FLAT_TANGENT_LENGTH) this._flatHeading.set(0, 0, 1);
    this._flatHeading.normalize();
    this.controls.enabled = false;
    this.active = true;
    this.ui.showRideUI();
    this._placeTrain(0);
    return true;
  }

  stop() {
    if (this.train) {
      this.scene.remove(this.train);
      this.train = null;
    }
    this.controls.enabled = true;
    this.active = false;
    this.ui.showBuildUI();
  }

  update(dt) {
    if (!this.active) return;
    dt = Math.min(dt, 0.05);

    if (!this._finished) {
      const frame = this.path.frameAt(this.distance);
      const speed = Math.sqrt(Math.max(2 * (this.energy - GRAVITY * frame.position.y), MIN_SPEED * MIN_SPEED));
      const ds = speed * dt;
      this.energy -= FRICTION * ds;
      this.distance += ds;
      if (this.distance >= this.path.totalLength) {
        this.distance = this.path.totalLength;
        this._finished = true;
        setTimeout(() => { if (this.active) this.stop(); }, FINISH_DELAY_MS);
      }
      this.ui.updateRideHud({ speedKmh: speed * 3.6 });
    }

    this._placeTrain(dt);
  }

  _placeTrain(dt) {
    const frame = this.path.frameAt(this.distance);
    if (this.train) {
      frame.matrix.decompose(_pos, _quat, _scale);
      this.train.position.copy(_pos);
      this.train.quaternion.copy(_quat);
    }

    const flat = _flat.set(frame.tangent.x, 0, frame.tangent.z);
    if (flat.lengthSq() >= MIN_FLAT_TANGENT_LENGTH * MIN_FLAT_TANGENT_LENGTH) {
      flat.normalize();
      this._flatHeading.lerp(flat, 0.15).normalize();
    }

    const eye = frame.position.clone().addScaledVector(WORLD_UP, 1.2);
    const camPos = frame.position.clone()
      .addScaledVector(this._flatHeading, -CAMERA_BACK)
      .addScaledVector(WORLD_UP, CAMERA_UP);
    this._resolveCameraCollision(eye, camPos);
    const smoothing = 1 - Math.pow(0.0005, dt || 0.016);
    this.camera.position.lerp(camPos, smoothing);

    const lookTarget = frame.position.clone()
      .addScaledVector(frame.tangent, LOOKAHEAD)
      .addScaledVector(WORLD_UP, 1);
    this._lookTarget.lerp(lookTarget, smoothing);
    this.camera.lookAt(this._lookTarget);
  }

  // Pulls camPos in front of any track geometry between eye and camPos, in place.
  _resolveCameraCollision(eye, camPos) {
    if (!this.trackGroup) return;
    const toCam = camPos.clone().sub(eye);
    const dist = toCam.length();
    if (dist < 0.01) return;
    const dir = toCam.normalize();
    _raycaster.set(eye, dir);
    _raycaster.near = CAMERA_COLLISION_SKIN;
    _raycaster.far = dist;
    const hits = _raycaster.intersectObject(this.trackGroup, true);
    if (!hits.length) return;
    const clamped = Math.max(hits[0].distance - CAMERA_COLLISION_MARGIN, CAMERA_MIN_DISTANCE);
    camPos.copy(eye).addScaledVector(dir, clamped);
  }
}
