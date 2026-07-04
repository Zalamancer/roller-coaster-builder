import { createScene } from './scene.js';
import { AssetLibrary } from './assets.js';
import { createUI } from './ui.js';
import { BuildMode } from './buildMode.js';
import { RideMode } from './rideMode.js';
import { scatterScenery } from './scenery.js';
import { PIECE_CATALOG } from './trackPath.js';

const canvas = document.getElementById('game');
const uiRoot = document.getElementById('ui-root');
const ctx = createScene(canvas);

let buildMode = null;
let rideMode = null;
let currentStyle = 'steel';

const ui = createUI(uiRoot, {
  onPieceSelect: (type) => buildMode.appendPiece(type),
  onUndo: () => buildMode.undo(),
  onClear: () => buildMode.clear(),
  onStyleChange: (style) => {
    currentStyle = style;
    buildMode.setStyle(style);
    ui.setActiveStyle(style);
  },
  onStartRide: () => {
    const parts = assets.getStyleParts(currentStyle);
    rideMode.start(buildMode.path, () => parts.train(), buildMode.trackGroup);
  },
  onExitRide: () => rideMode.stop(),
});

const assets = new AssetLibrary();

assets.loadAll((done, total) => ui.setLoadingProgress(done, total)).then(() => {
  ui.hideLoading();

  const station = assets.getScenery('station.glb');
  ctx.scene.add(station);

  buildMode = new BuildMode({ scene: ctx.scene, assets, ui, initialStyle: currentStyle });
  rideMode = new RideMode({ scene: ctx.scene, camera: ctx.camera, controls: ctx.controls, ui });
  ui.setActiveStyle(currentStyle);

  scatterScenery(ctx.scene, assets, { groundSize: 90, avoidRadius: 3.5 });

  window.addEventListener('keydown', (e) => {
    if (rideMode.active) return;
    if (e.key === 'Backspace' || e.key === 'u') { buildMode.undo(); return; }
    const piece = PIECE_CATALOG.find((p) => p.key === e.key.toLowerCase());
    if (piece) buildMode.appendPiece(piece.type);
  });

  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (rideMode.active) {
      rideMode.update(dt);
    } else {
      ctx.controls.update();
    }
    ctx.renderer.render(ctx.scene, ctx.camera);
  }
  requestAnimationFrame(animate);

  window.__coaster = { ctx, assets, buildMode, rideMode };
});
