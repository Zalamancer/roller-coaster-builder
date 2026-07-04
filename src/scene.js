import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Filmic tone mapping desaturates flat cartoon colors (its rolloff curve is built for
  // photorealistic HDR footage) — it was turning saturated greens pastel/lime. Plain linear
  // response keeps the kit's bright, poster-flat colors true instead of washed out.
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5ec8f8);
  // Pushed way out (and lightened) so the play area reads crisp and colorful up close —
  // fog starting nearby was the main thing making everything look hazy/gray.
  scene.fog = new THREE.Fog(0x8fdcff, 160, 420);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(22, 18, 22);

  // Bright, saturated sky/ground fill so shadows stay soft and colorful instead of murky.
  // Kept moderate (not blazing) now that there's no tone-mapping rolloff to cushion overexposure —
  // pushing these too hot clips bright surfaces to washed-out white instead of true color.
  const hemi = new THREE.HemisphereLight(0xbfe9ff, 0x9adf7a, 1.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3d6, 1.7);
  sun.position.set(35, 45, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  scene.add(sun.target);

  const groundGeo = new THREE.PlaneGeometry(500, 500);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x7ed957, roughness: 0.85 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3, 0);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 4;
  controls.maxDistance = 180;
  controls.update();

  // OrbitControls' built-in wheel zoom divides the delta by devicePixelRatio, making it barely
  // perceptible on a Retina trackpad no matter how high zoomSpeed goes. Handle it ourselves instead.
  controls.enableZoom = false;
  const zoomOffset = new THREE.Vector3();
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const pct = THREE.MathUtils.clamp(event.deltaY * 0.012, -0.3, 0.3);
    zoomOffset.copy(camera.position).sub(controls.target);
    const dist = THREE.MathUtils.clamp(zoomOffset.length() * (1 + pct), controls.minDistance, controls.maxDistance);
    zoomOffset.setLength(dist);
    camera.position.copy(controls.target).add(zoomOffset);
    controls.update();
  }, { passive: false });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, controls, ground, sun };
}
