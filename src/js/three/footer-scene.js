/**
 * CARGOVA — Footer 3D object
 * Mirrors the reference footer embed: orthographic camera (frustum 2.5) at (5,5,5),
 * OrbitControls (damped, no zoom, desktop only), white OutlinePass edges, gentle
 * sine bob + yaw, renders only while in view.
 * The reference loads a GLB from Supabase storage; CARGOVA builds its hero object
 * procedurally (a CARGOVA cargo truck with branded trailer). To use a GLB
 * instead, set FOOTER_MODEL_URL in src/js/data/config.js (e.g. a Supabase public URL).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../data/config.js';

const isMobileUA = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function liveryTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 400;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1024, 400);
  x.fillStyle = '#fc5c21'; x.fillRect(0, 290, 1024, 50);
  x.fillStyle = '#073252'; x.fillRect(0, 340, 1024, 14);
  x.font = 'bold 170px "Departure Mono", "Space Mono", monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('CARGOVA', 512, 150);
  x.font = '38px "Departure Mono", "Space Mono", monospace';
  x.fillText('intelligent logistics', 512, 250);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function containerTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 440;
  const x = c.getContext('2d');
  x.fillStyle = '#fc5c21'; x.fillRect(0, 0, 1024, 440);
  x.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 18; i < 1024; i += 52) x.fillRect(i, 0, 14, 440);           // corrugation ribs
  x.fillStyle = '#ffffff';
  x.font = 'bold 150px "Departure Mono", "Space Mono", monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('CARGOVA', 512, 200);
  x.fillRect(70, 300, 170, 50);                                            // tracking tag
  x.fillStyle = '#073252'; x.font = '30px "Departure Mono", monospace';
  x.fillText('CGV-0517', 155, 326);
  x.fillStyle = '#073252'; x.fillRect(0, 410, 1024, 30);                   // bottom rail
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** CARGOVA cargo truck — branded box trailer (default) or flatbed carrying the red CARGOVA container ({ loaded: true }) */
export function buildCargoTruck(opts = {}) {
  const root = new THREE.Group();
  const M = (c) => new THREE.MeshBasicMaterial({ color: c });
  const add = (w, h, d, x, y, z, m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m instanceof THREE.Material || Array.isArray(m) ? m : M(m));
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const navy = 0x073252, orange = 0xfc5c21, white = 0xffffff, sky = 0x6fb6ff, ink = 0x052338;

  // chassis
  add(4.3, 0.22, 1.1, 0.15, -0.72, 0, navy);
  if (opts.loaded) {
    // flatbed deck + the red CARGOVA container that was loaded at the port dock (station 5)
    add(3.0, 0.12, 1.3, -0.55, -0.55, 0, navy);
    [-1.95, 0.85].forEach((x) => add(0.1, 0.18, 1.32, x, -0.45, 0, ink));           // bolsters
    const box = new THREE.MeshBasicMaterial({ map: containerTexture() });
    const plainO = M(orange), dark = M(0xd9461a);
    add(2.85, 1.2, 1.25, -0.55, 0.11, 0, [dark, dark, plainO, plainO, box, box]);
    [-0.32, 0.0, 0.32].forEach((z) => add(0.03, 1.05, 0.05, -1.99, 0.11, z, navy)); // door lock bars
    add(0.06, 1.1, 0.06, -1.98, 0.11, 0.6, navy);
    [[-1.94, 0.58], [-1.94, -0.58], [0.84, 0.58], [0.84, -0.58]].forEach(([x, z]) => add(0.12, 0.08, 0.12, x, -0.43, z, 0xffffff)); // twist locks
  } else {
    // trailer with livery on both long sides (face order +x, -x, +y, -y, +z, -z)
    const liv = new THREE.MeshBasicMaterial({ map: liveryTexture() });
    const plainW = M(0xf4f8ff);
    add(2.9, 1.35, 1.35, -0.55, 0.08, 0, [M(0xdfe9f7), M(0xdfe9f7), plainW, plainW, liv, liv]);
    // rear doors
    [-0.3, 0.0, 0.3].forEach((z) => add(0.03, 1.2, 0.04, -2.01, 0.08, z, navy));
    // CARGOVA mark on the roof
    add(0.9, 0.03, 0.75, -0.55, 0.77, 0, 0x288dfe);
    add(0.16, 0.04, 0.55, -0.9, 0.79, 0, white);
    add(0.5, 0.04, 0.14, -0.7, 0.79, -0.2, white);
    add(0.5, 0.04, 0.14, -0.7, 0.79, 0.2, white);
  }
  // cab
  add(0.95, 1.15, 1.25, 1.45, -0.03, 0, orange);
  add(0.6, 0.6, 1.15, 2.2, -0.3, 0, orange);           // hood
  add(0.03, 0.42, 1.05, 1.94, 0.28, 0, sky);            // windscreen
  add(0.55, 0.38, 0.03, 1.45, 0.25, 0.63, sky);         // side windows
  add(0.55, 0.38, 0.03, 1.45, 0.25, -0.63, sky);
  [-0.42, -0.3, -0.18].forEach((y) => add(0.03, 0.05, 0.8, 2.51, y, 0, navy)); // grille
  add(0.03, 0.12, 0.18, 2.51, -0.42, 0.45, white);      // headlights
  add(0.03, 0.12, 0.18, 2.51, -0.42, -0.45, white);
  add(0.08, 0.7, 0.08, 1.0, 0.45, -0.55, ink);          // exhaust stack
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.22, 20);
  const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.24, 12);
  [[-1.5, 0.6], [-0.95, 0.6], [1.9, 0.6], [-1.5, -0.6], [-0.95, -0.6], [1.9, -0.6]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, M(ink));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, -0.83, z);
    const h = new THREE.Mesh(hubGeo, M(white));
    h.rotation.x = Math.PI / 2;
    h.position.set(x, -0.83, z);
    root.add(w, h);
  });
  return root;
}

export function createFooterScene(canvas, container) {
  const scene = new THREE.Scene();
  const frustum = 2.5;
  const aspect = () => container.offsetWidth / Math.max(1, container.offsetHeight);
  const camera = new THREE.OrthographicCamera(-frustum * aspect(), frustum * aspect(), frustum, -frustum, 0.1, 1000);
  camera.position.set(5, 4.3, 5);
  camera.lookAt(0, -0.7, 0);       // frame the truck + road with room for the road to fade out below

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.offsetWidth, container.offsetHeight, false);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enabled = !isMobileUA();
  controls.target.set(0, -0.7, 0);  // same framing point as camera.lookAt above
  controls.update();
  // turntable only: lock the viewing height so the truck can't be flipped into a top-down view
  const polar = controls.getPolarAngle();
  controls.minPolarAngle = polar - 0.12;
  controls.maxPolarAngle = polar + 0.08;

  const key = new THREE.DirectionalLight(0xffffff, 5); key.position.set(5, 10, 5);
  scene.add(key);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(container.offsetWidth, container.offsetHeight), scene, camera);
  outline.edgeStrength = 100;
  outline.edgeGlow = 0;
  outline.edgeThickness = 5;
  outline.pulsePeriod = 0;
  outline.visibleEdgeColor.set('#ffffff');
  outline.hiddenEdgeColor.set('#02314D');
  composer.addPass(outline);
  composer.addPass(new OutputPass());

  // ---------- road (isometric strip with moving lane markings) ----------
  const ROAD_Y = -0.96;               // top of the road = bottom of the wheels
  const road = new THREE.Group();
  // alpha ramp along the road's length: ends dissolve into the page instead of a hard cut
  const fadeTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 4;
    const g = c.getContext('2d').createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, '#000'); g.addColorStop(0.4, '#fff'); g.addColorStop(0.62, '#fff'); g.addColorStop(1, '#000');
    const x = c.getContext('2d'); x.fillStyle = g; x.fillRect(0, 0, 256, 4);
    return new THREE.CanvasTexture(c);
  })();
  const ROAD_HALF = 3.8;
  const roadMat = (c) => new THREE.MeshBasicMaterial({ color: c, alphaMap: fadeTex, transparent: true, depthWrite: false });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.12, 2.5), roadMat(0x0a3a60));
  slab.position.y = ROAD_Y - 0.06;
  const kerbA = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.16, 0.14), roadMat(0x1d5d92));
  kerbA.position.set(0, ROAD_Y - 0.04, 1.32);
  const kerbB = kerbA.clone(); kerbB.position.z = -1.32;
  const edgeMat = roadMat(0xffffff);
  const edgeA = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.012, 0.05), edgeMat);
  edgeA.position.set(0, ROAD_Y + 0.006, 1.08);
  const edgeB = edgeA.clone(); edgeB.position.z = -1.08;
  road.add(slab, kerbA, kerbB, edgeA, edgeB);
  const DASH_GAP = 0.9;
  const dashes = [];
  for (let x = -3.7; x < 3.7; x += DASH_GAP) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.014, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
    d.position.set(x, ROAD_Y + 0.007, 0);
    road.add(d); dashes.push(d);
  }
  road.position.x = 0.25;            // centred under the truck; both ends fully fade inside the canvas
  scene.add(road);

  // white CARGOVA box trailer + orange cab: the same truck that was loaded at the station-5 dock
  let model = buildCargoTruck();
  model.scale.setScalar(1.05);
  scene.add(model);
  outline.selectedObjects = [model];

  if (CONFIG.FOOTER_MODEL_URL) {
    new GLTFLoader().load(CONFIG.FOOTER_MODEL_URL, (gltf) => {
      scene.remove(model);
      model = gltf.scene;
      model.traverse((c) => { if (c.isMesh) c.material = new THREE.MeshBasicMaterial({ map: c.material.map, color: c.material.color }); });
      scene.add(model);
      outline.selectedObjects = [model];
    });
  }

  let inView = false;
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!inView) return;
    if (controls.enabled) controls.update();
    const t = Date.now() * 0.001;
    // driving: lane markings scroll under the truck, small suspension bounce + gentle sway
    dashes.forEach((d) => {
      d.position.x -= 0.03;
      if (d.position.x < -3.7) d.position.x += dashes.length * DASH_GAP;
      const k = Math.abs(d.position.x) / ROAD_HALF;          // same fade as the road surface
      d.material.opacity = k < 0.4 ? 1 : Math.max(0, 1 - (k - 0.4) / 0.6);
    });
    model.rotation.y = -0.06 * Math.sin(t * 0.7);
    model.position.y = 0.2 + Math.abs(Math.sin(t * 6)) * 0.012;
    isMobileUA() ? renderer.render(scene, camera) : composer.render();
  }

  function resize() {
    const a = aspect();
    // wide canvas: fixed height; narrow (mobile) canvas: fit truck + road to the width
    // keep the whole truck (≈4.9 long) in frame at any turntable angle
    const f = Math.max(frustum, 3.1 / a);
    camera.left = -f * a; camera.right = f * a; camera.top = f; camera.bottom = -f;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight, false);
    composer.setSize(container.offsetWidth, container.offsetHeight);
  }
  window.addEventListener('resize', resize);

  return {
    setInView(v) {
      inView = v;
      if (v) { resize(); if (!raf) loop(); }
    },
    resize,
  };
}
