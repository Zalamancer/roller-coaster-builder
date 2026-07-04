import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_BASE = './assets/models/';

export const TRACK_STYLES = ['steel', 'wood', 'mouse', 'hanging', 'monorail', 'flume'];

const TRAIN_OVERRIDE = {
  steel: 'coaster-train.glb',
  wood: 'coaster-train-wooden.glb',
  mouse: 'coaster-train-front.glb',
  hanging: 'coaster-train-hanging.glb',
  monorail: 'train-monorail.glb',
  flume: 'train-log-flume.glb',
};

export const SCENERY_FILES = [
  'tree.glb', 'tree-large.glb', 'grass.glb', 'flowers.glb', 'bench.glb', 'trash.glb',
  'path-straight.glb', 'path-corner.glb', 'path-crossing.glb', 'path-split.glb', 'path-steps.glb', 'path-exit.glb',
  'queue-straight.glb', 'queue-corner.glb', 'queue-entrance.glb',
  'stall-drinks.glb', 'stall-food.glb', 'stall-information.glb', 'stall-toilets.glb',
  'station.glb', 'station-fence.glb', 'station-gate.glb', 'park-entrance.glb', 'ride-entrance.glb', 'ride-exit.glb',
];

const SUPPORT_FILES = ['support-small.glb', 'support-large.glb'];

// The "wood" style ships without cap-front/cap-back meshes in the kit; reuse steel's caps for it.
const CAP_STYLE_OVERRIDE = { wood: 'steel' };

function fileListForStyle(style) {
  const capStyle = CAP_STYLE_OVERRIDE[style] || style;
  return {
    tie: `coaster-${style}-segment.glb`,
    capFront: `coaster-${capStyle}-cap-front.glb`,
    capBack: `coaster-${capStyle}-cap-back.glb`,
    train: TRAIN_OVERRIDE[style] || 'coaster-train.glb',
  };
}

export class AssetLibrary {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
  }

  async loadAll(onProgress) {
    const files = new Set(SUPPORT_FILES.concat(SCENERY_FILES));
    for (const style of TRACK_STYLES) {
      Object.values(fileListForStyle(style)).forEach((name) => files.add(name));
    }
    const list = [...files];
    let done = 0;
    await Promise.all(list.map((name) =>
      this._load(name).then(() => { done++; onProgress?.(done, list.length); })
    ));
  }

  _load(name) {
    if (this.cache.has(name)) return Promise.resolve(this.cache.get(name));
    return new Promise((resolve, reject) => {
      this.loader.load(
        MODEL_BASE + name,
        (gltf) => {
          const template = gltf.scene;
          template.traverse((o) => {
            if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
          });
          this.cache.set(name, template);
          resolve(template);
        },
        undefined,
        (err) => reject(new Error(`Failed to load ${name}: ${err?.message || err}`))
      );
    });
  }

  get(name) {
    const template = this.cache.get(name);
    if (!template) throw new Error(`Asset not loaded: ${name}`);
    return template.clone(true);
  }

  getStyleParts(style) {
    const f = fileListForStyle(style);
    return {
      tie: () => this.get(f.tie),
      capFront: () => this.get(f.capFront),
      capBack: () => this.get(f.capBack),
      train: () => this.get(f.train),
    };
  }

  getSupport(size = 'small') {
    return this.get(size === 'large' ? 'support-large.glb' : 'support-small.glb');
  }

  getScenery(name) {
    return this.get(name);
  }
}
