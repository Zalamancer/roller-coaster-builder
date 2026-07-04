import { TrackPath } from './trackPath.js';
import { TrackRenderer } from './trackRenderer.js';

export class BuildMode {
  constructor({ scene, assets, ui, initialStyle = 'steel' }) {
    this.ui = ui;
    this.trackPath = new TrackPath();
    this.renderer = new TrackRenderer(assets, initialStyle);
    scene.add(this.renderer.group);
    this.renderer.rebuild(this.trackPath);
    this._updateStats();
  }

  appendPiece(type) {
    this.trackPath.append(type);
    this.renderer.rebuild(this.trackPath);
    this._updateStats();
    this.ui.dismissInstructions();
  }

  undo() {
    this.trackPath.undo();
    this.renderer.rebuild(this.trackPath);
    this._updateStats();
  }

  clear() {
    this.trackPath.clear();
    this.renderer.rebuild(this.trackPath);
    this._updateStats();
  }

  setStyle(style) {
    this.renderer.setStyle(style, this.trackPath);
  }

  get path() {
    return this.trackPath;
  }

  get trackGroup() {
    return this.renderer.group;
  }

  _updateStats() {
    this.ui.updateStats({ length: this.trackPath.totalLength, pieceCount: this.trackPath.pieces.length });
  }
}
