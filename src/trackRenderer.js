import * as THREE from 'three';

const SUPPORT_ARC_SPACING = 2.4;
const MIN_SUPPORT_HEIGHT = 0.15;
const LARGE_SUPPORT_THRESHOLD = 5;

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

export class TrackRenderer {
  constructor(assets, style) {
    this.assets = assets;
    this.style = style;
    this.group = new THREE.Group();
    this.group.name = 'track';
    this.tieCount = 0;
    this.supportCount = 0;
  }

  setStyle(style, path) {
    this.style = style;
    if (path) this.rebuild(path);
  }

  rebuild(path) {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.tieCount = 0;
    this.supportCount = 0;

    const parts = this.assets.getStyleParts(this.style);
    const frames = path.frames;

    for (const frame of frames) {
      const tie = parts.tie();
      frame.matrix.decompose(_pos, _quat, _scale);
      tie.position.copy(_pos);
      tie.quaternion.copy(_quat);
      this.group.add(tie);
      this.tieCount++;
    }

    let lastSupportArc = -Infinity;
    for (const frame of frames) {
      if (frame.position.y <= MIN_SUPPORT_HEIGHT) continue;
      if (frame.arcLength - lastSupportArc < SUPPORT_ARC_SPACING) continue;
      lastSupportArc = frame.arcLength;
      const size = frame.position.y > LARGE_SUPPORT_THRESHOLD ? 'large' : 'small';
      const support = this.assets.getSupport(size);
      const height = Math.max(frame.position.y, 0.05);
      support.position.set(frame.position.x, 0, frame.position.z);
      support.scale.set(1, height, 1);
      this.group.add(support);
      this.supportCount++;
    }

    if (frames.length) {
      const capFront = parts.capFront();
      const startFrame = frames[0];
      startFrame.matrix.decompose(_pos, _quat, _scale);
      capFront.position.copy(_pos);
      capFront.quaternion.copy(_quat);
      capFront.rotateY(Math.PI);
      this.group.add(capFront);

      const capBack = parts.capBack();
      const endFrame = frames[frames.length - 1];
      endFrame.matrix.decompose(_pos, _quat, _scale);
      capBack.position.copy(_pos);
      capBack.quaternion.copy(_quat);
      this.group.add(capBack);
    }
  }
}
