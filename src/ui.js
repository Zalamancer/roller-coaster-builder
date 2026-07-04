import { TRACK_STYLES } from './assets.js';
import { PIECE_CATALOG } from './trackPath.js';

export function createUI(root, callbacks) {
  const loading = document.createElement('div');
  loading.className = 'loading-screen panel';
  loading.innerHTML = `
    <div>Loading assets…</div>
    <div class="bar"><div></div></div>
  `;
  const loadingBarFill = loading.querySelector('.bar > div');
  root.appendChild(loading);

  const hudTop = document.createElement('div');
  hudTop.className = 'hud-top panel';

  const styleSwitcher = document.createElement('div');
  styleSwitcher.className = 'style-switcher';
  const styleButtons = new Map();
  TRACK_STYLES.forEach((style) => {
    const btn = document.createElement('button');
    btn.textContent = style;
    btn.addEventListener('click', () => callbacks.onStyleChange(style));
    styleSwitcher.appendChild(btn);
    styleButtons.set(style, btn);
  });

  const rightCluster = document.createElement('div');
  rightCluster.style.display = 'flex';
  rightCluster.style.flexDirection = 'column';
  rightCluster.style.gap = '8px';
  rightCluster.style.alignItems = 'flex-end';

  const statsPanel = document.createElement('div');
  statsPanel.className = 'stats-panel';
  statsPanel.innerHTML = 'Length: <b>0</b> m<br>Pieces: <b>0</b>';
  const statsLength = statsPanel.querySelectorAll('b')[0];
  const statsPieceCount = statsPanel.querySelectorAll('b')[1];

  const rideBtn = document.createElement('button');
  rideBtn.className = 'ride-btn';
  rideBtn.textContent = 'Test Ride';
  rideBtn.addEventListener('click', () => callbacks.onStartRide());

  rightCluster.appendChild(statsPanel);
  rightCluster.appendChild(rideBtn);

  hudTop.appendChild(styleSwitcher);
  hudTop.appendChild(rightCluster);
  root.appendChild(hudTop);

  const instructions = document.createElement('div');
  instructions.className = 'instructions panel';
  instructions.textContent = 'Pick a piece below to extend your coaster — press Test Ride when you\'re happy with it!';
  root.appendChild(instructions);
  let instructionsDismissed = false;
  function dismissInstructions() {
    if (instructionsDismissed) return;
    instructionsDismissed = true;
    instructions.classList.add('hidden');
  }
  const instructionsTimer = setTimeout(dismissInstructions, 6000);

  const palette = document.createElement('div');
  palette.className = 'palette panel';

  const pieceGroup = document.createElement('div');
  pieceGroup.className = 'group';
  PIECE_CATALOG.forEach((piece) => {
    const btn = document.createElement('button');
    btn.title = `${piece.label} (${piece.key})`;
    btn.innerHTML = `<span>${piece.icon}</span><span class="label">${piece.label}</span>`;
    btn.addEventListener('click', () => callbacks.onPieceSelect(piece.type));
    pieceGroup.appendChild(btn);
  });
  palette.appendChild(pieceGroup);

  const editGroup = document.createElement('div');
  editGroup.className = 'group';
  const undoBtn = document.createElement('button');
  undoBtn.className = 'danger';
  undoBtn.innerHTML = '<span>↺</span><span class="label">Undo</span>';
  undoBtn.addEventListener('click', () => callbacks.onUndo());
  const clearBtn = document.createElement('button');
  clearBtn.className = 'danger';
  clearBtn.innerHTML = '<span>✕</span><span class="label">Clear</span>';
  clearBtn.addEventListener('click', () => callbacks.onClear());
  editGroup.appendChild(undoBtn);
  editGroup.appendChild(clearBtn);
  palette.appendChild(editGroup);

  root.appendChild(palette);

  const rideHud = document.createElement('div');
  rideHud.className = 'ride-hud panel';
  rideHud.innerHTML = '<span>Speed: <b>0</b> km/h</span>';
  const rideSpeedEl = rideHud.querySelector('b');
  const exitBtn = document.createElement('button');
  exitBtn.className = 'ride-btn exit';
  exitBtn.textContent = 'Exit Ride';
  exitBtn.addEventListener('click', () => callbacks.onExitRide());
  rideHud.appendChild(exitBtn);
  rideHud.style.display = 'none';
  root.appendChild(rideHud);

  function setLoadingProgress(done, total) {
    const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
    loadingBarFill.style.width = pct + '%';
  }

  function hideLoading() {
    loading.classList.add('hidden');
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 400);
  }

  function setActiveStyle(style) {
    styleButtons.forEach((btn, s) => btn.classList.toggle('active', s === style));
  }

  function updateStats({ length, pieceCount }) {
    statsLength.textContent = length.toFixed(1);
    statsPieceCount.textContent = pieceCount;
  }

  function showRideUI() {
    palette.style.display = 'none';
    styleSwitcher.style.display = 'none';
    rideBtn.style.display = 'none';
    rideHud.style.display = 'flex';
  }

  function showBuildUI() {
    palette.style.display = 'flex';
    styleSwitcher.style.display = 'flex';
    rideBtn.style.display = 'block';
    rideHud.style.display = 'none';
  }

  function updateRideHud({ speedKmh }) {
    rideSpeedEl.textContent = speedKmh.toFixed(0);
  }

  return {
    setLoadingProgress,
    hideLoading,
    dismissInstructions,
    setActiveStyle,
    updateStats,
    showRideUI,
    showBuildUI,
    updateRideHud,
  };
}
