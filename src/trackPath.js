import * as THREE from 'three';

// Arc-length spacing between rendered ties. Small enough that curves/loops read smoothly.
const TIE_STEP = 0.4;

const STRAIGHT_LENGTH = 4;
const TURN_RADIUS = 5;
const TURN_ANGLE = Math.PI / 2; // 90 degrees
const TURN_BANK_MAX = THREE.MathUtils.degToRad(22);
const HILL_RADIUS = 7;
const HILL_ANGLE = THREE.MathUtils.degToRad(28);
const LOOP_RADIUS = 5;
const BANK_LENGTH = 2.5;
const BANK_ROLL = THREE.MathUtils.degToRad(24);

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);

function frameMatrix(position, tangent, up) {
  const t = tangent.clone().normalize();
  const right = new THREE.Vector3().crossVectors(up, t).normalize();
  const fixedUp = new THREE.Vector3().crossVectors(t, right).normalize();
  const m = new THREE.Matrix4().makeBasis(right, fixedUp, t);
  m.setPosition(position);
  return m;
}

function stepsFor(arcLength) {
  return Math.max(2, Math.round(arcLength / TIE_STEP));
}

// theta-domain arc helpers, all starting at local origin with tangent=+Z, up=+Y -----

function straightPiece(length = STRAIGHT_LENGTH) {
  const steps = stepsFor(length);
  const samples = [];
  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * length;
    samples.push({ matrix: frameMatrix(new THREE.Vector3(0, 0, s), FORWARD.clone(), UP.clone()), arc: s });
  }
  return { samples, length };
}

// dir = +1 turns right (curves toward +X), -1 turns left (curves toward -X)
function yawTurnPiece(dir) {
  const arcLength = TURN_RADIUS * TURN_ANGLE;
  const steps = stepsFor(arcLength);
  const samples = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * TURN_ANGLE;
    const pos = new THREE.Vector3(dir * TURN_RADIUS * (1 - Math.cos(theta)), 0, TURN_RADIUS * Math.sin(theta));
    const tangent = new THREE.Vector3(dir * Math.sin(theta), 0, Math.cos(theta));
    const bank = TURN_BANK_MAX * Math.sin(Math.PI * (theta / TURN_ANGLE)) * -dir;
    const up = UP.clone().applyAxisAngle(tangent, bank);
    samples.push({ matrix: frameMatrix(pos, tangent, up), arc: (i / steps) * arcLength });
  }
  return { samples, length: arcLength };
}

// climbSign = -1 climbs (hill up), +1 descends (hill down)
// climbSign = +1 climbs (hill up), -1 descends (hill down)
function pitchArcPiece(climbSign) {
  const arcLength = HILL_RADIUS * HILL_ANGLE;
  const steps = stepsFor(arcLength);
  const samples = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * HILL_ANGLE;
    const pos = new THREE.Vector3(0, climbSign * HILL_RADIUS * (1 - Math.cos(theta)), HILL_RADIUS * Math.sin(theta));
    const tangent = new THREE.Vector3(0, climbSign * Math.sin(theta), Math.cos(theta));
    const up = new THREE.Vector3(0, Math.cos(theta), -climbSign * Math.sin(theta));
    samples.push({ matrix: frameMatrix(pos, tangent, up), arc: (i / steps) * arcLength });
  }
  return { samples, length: arcLength };
}

function loopPiece() {
  const angle = Math.PI * 2;
  const arcLength = LOOP_RADIUS * angle;
  const steps = stepsFor(arcLength) * 2;
  const samples = [];
  const climbSign = 1;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * angle;
    const pos = new THREE.Vector3(0, climbSign * LOOP_RADIUS * (1 - Math.cos(theta)), LOOP_RADIUS * Math.sin(theta));
    const tangent = new THREE.Vector3(0, climbSign * Math.sin(theta), Math.cos(theta));
    const up = new THREE.Vector3(0, Math.cos(theta), -climbSign * Math.sin(theta));
    samples.push({ matrix: frameMatrix(pos, tangent, up), arc: (i / steps) * arcLength });
  }
  return { samples, length: arcLength };
}

// rollSign = +1 banks right, -1 banks left, holding heading and position straight
function bankPiece(rollSign) {
  const length = BANK_LENGTH;
  const steps = stepsFor(length);
  const samples = [];
  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * length;
    const phi = rollSign * BANK_ROLL * (i / steps);
    const up = UP.clone().applyAxisAngle(FORWARD, phi);
    samples.push({ matrix: frameMatrix(new THREE.Vector3(0, 0, s), FORWARD.clone(), up), arc: s });
  }
  return { samples, length };
}

export const PIECE_CATALOG = [
  { type: 'straight', label: 'Straight', icon: '│', key: 'w', generate: () => straightPiece() },
  { type: 'turnLeft', label: 'Turn L', icon: '↖', key: 'a', generate: () => yawTurnPiece(-1) },
  { type: 'turnRight', label: 'Turn R', icon: '↗', key: 'd', generate: () => yawTurnPiece(1) },
  { type: 'hillUp', label: 'Hill Up', icon: '↗', key: 'e', generate: () => pitchArcPiece(1) },
  { type: 'hillDown', label: 'Hill Down', icon: '↘', key: 'q', generate: () => pitchArcPiece(-1) },
  { type: 'loop', label: 'Loop', icon: '⟳', key: 'l', generate: () => loopPiece() },
  { type: 'bankLeft', label: 'Bank L', icon: '↰', key: 'z', generate: () => bankPiece(-1) },
  { type: 'bankRight', label: 'Bank R', icon: '↱', key: 'c', generate: () => bankPiece(1) },
];

const PIECES_BY_TYPE = Object.fromEntries(PIECE_CATALOG.map((p) => [p.type, p]));

export class TrackPath {
  constructor(startMatrix = new THREE.Matrix4()) {
    this.startMatrix = startMatrix.clone();
    this.pieces = [];
    this.frames = [];
    this.totalLength = 0;
    this._rebuild();
  }

  append(type) {
    const def = PIECES_BY_TYPE[type];
    if (!def) throw new Error(`Unknown piece type: ${type}`);
    const local = def.generate();
    const prevEnd = this.pieces.length ? this.pieces[this.pieces.length - 1].worldEndMatrix : this.startMatrix;
    const worldStartMatrix = prevEnd.clone();
    const exitLocal = local.samples[local.samples.length - 1].matrix;
    const worldEndMatrix = worldStartMatrix.clone().multiply(exitLocal);
    this.pieces.push({ type, local, worldStartMatrix, worldEndMatrix });
    this._rebuild();
  }

  undo() {
    this.pieces.pop();
    this._rebuild();
  }

  clear() {
    this.pieces = [];
    this._rebuild();
  }

  get endMatrix() {
    return this.pieces.length ? this.pieces[this.pieces.length - 1].worldEndMatrix : this.startMatrix;
  }

  _rebuild() {
    const frames = [];
    let arcOffset = 0;
    this.pieces.forEach((piece, pieceIndex) => {
      piece.local.samples.forEach((s, sampleIndex) => {
        if (pieceIndex > 0 && sampleIndex === 0) return; // shared with previous piece's last sample
        const m = piece.worldStartMatrix.clone().multiply(s.matrix);
        const position = new THREE.Vector3().setFromMatrixPosition(m);
        const tangent = new THREE.Vector3(0, 0, 1).transformDirection(m);
        const up = new THREE.Vector3(0, 1, 0).transformDirection(m);
        frames.push({ position, tangent, up, matrix: m, arcLength: arcOffset + s.arc, pieceType: piece.type, pieceIndex });
      });
      arcOffset += piece.local.length;
    });
    if (frames.length === 0) {
      const m = this.startMatrix.clone();
      frames.push({
        position: new THREE.Vector3().setFromMatrixPosition(m),
        tangent: new THREE.Vector3(0, 0, 1).transformDirection(m),
        up: new THREE.Vector3(0, 1, 0).transformDirection(m),
        matrix: m,
        arcLength: 0,
        pieceType: null,
        pieceIndex: -1,
      });
    }
    this.frames = frames;
    this.totalLength = arcOffset;
  }

  // Returns an interpolated frame at the given arc-length distance from the start.
  frameAt(distance) {
    const frames = this.frames;
    if (distance <= frames[0].arcLength) return frames[0];
    if (distance >= frames[frames.length - 1].arcLength) return frames[frames.length - 1];
    let lo = 0, hi = frames.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].arcLength <= distance) lo = mid; else hi = mid;
    }
    const a = frames[lo], b = frames[hi];
    const span = b.arcLength - a.arcLength;
    const t = span > 1e-6 ? (distance - a.arcLength) / span : 0;
    const position = a.position.clone().lerp(b.position, t);
    const tangent = a.tangent.clone().lerp(b.tangent, t).normalize();
    const up = a.up.clone().lerp(b.up, t).normalize();
    const matrix = frameMatrix(position, tangent, up);
    return { position, tangent, up, matrix, arcLength: distance, pieceType: b.pieceType };
  }
}

export { frameMatrix };
