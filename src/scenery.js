const NATURE_FILES = ['tree.glb', 'tree-large.glb', 'grass.glb', 'flowers.glb'];
const REST_AREA_FILES = ['bench.glb', 'trash.glb', 'stall-food.glb', 'stall-drinks.glb', 'stall-information.glb', 'stall-toilets.glb'];

const CENTER_EXCLUDE_RADIUS = 6;
const PLAZA_RADIUS = 12;
const PLAZA_CLUSTER_COUNT = 6;
const PLAZA_CLUSTER_SPREAD = 3.5;
const PLAZA_ITEMS_PER_CLUSTER = 3;

function isClear(x, z, avoidPoints, avoidRadius) {
  if (Math.sqrt(x * x + z * z) < CENTER_EXCLUDE_RADIUS) return false;
  for (const p of avoidPoints) {
    const px = p.x !== undefined ? p.x : p.position?.x;
    const pz = p.z !== undefined ? p.z : p.position?.z;
    const dx = x - px;
    const dz = z - pz;
    if (Math.sqrt(dx * dx + dz * dz) < avoidRadius) return false;
  }
  return true;
}

function placeProp(group, assets, file, x, z, scaleJitter) {
  const prop = assets.getScenery(file);
  prop.position.set(x, 0, z);
  prop.rotation.y = Math.random() * Math.PI * 2;
  if (scaleJitter) {
    const s = 0.85 + Math.random() * 0.3;
    prop.scale.set(s, s, s);
  }
  group.add(prop);
  return prop;
}

export function scatterScenery(group, assets, options = {}) {
  const groundSize = options.groundSize ?? 80;
  const avoidPoints = options.avoidPoints ?? [];
  const avoidRadius = options.avoidRadius ?? 3;

  const areaScale = (groundSize * groundSize) / (80 * 80);
  const natureCount = Math.round(140 * areaScale);
  const restClusterCount = Math.max(1, Math.round(PLAZA_CLUSTER_COUNT * areaScale));

  const placed = [];
  const half = groundSize / 2;

  let attempts = 0;
  while (placed.length < natureCount && attempts < natureCount * 8) {
    attempts++;
    const x = (Math.random() * 2 - 1) * half;
    const z = (Math.random() * 2 - 1) * half;
    if (!isClear(x, z, avoidPoints, avoidRadius)) continue;
    const file = NATURE_FILES[Math.floor(Math.random() * NATURE_FILES.length)];
    placed.push(placeProp(group, assets, file, x, z, true));
  }

  for (let c = 0; c < restClusterCount; c++) {
    let cx, cz, tries = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const dist = CENTER_EXCLUDE_RADIUS + Math.random() * (PLAZA_RADIUS - CENTER_EXCLUDE_RADIUS);
      cx = Math.cos(angle) * dist;
      cz = Math.sin(angle) * dist;
      tries++;
    } while (!isClear(cx, cz, avoidPoints, avoidRadius) && tries < 20);
    if (tries >= 20) continue;

    for (let i = 0; i < PLAZA_ITEMS_PER_CLUSTER; i++) {
      const ox = cx + (Math.random() * 2 - 1) * PLAZA_CLUSTER_SPREAD;
      const oz = cz + (Math.random() * 2 - 1) * PLAZA_CLUSTER_SPREAD;
      if (Math.abs(ox) > half || Math.abs(oz) > half) continue;
      if (!isClear(ox, oz, avoidPoints, avoidRadius)) continue;
      const file = REST_AREA_FILES[Math.floor(Math.random() * REST_AREA_FILES.length)];
      placed.push(placeProp(group, assets, file, ox, oz, false));
    }
  }

  return placed;
}
