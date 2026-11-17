/**
 * CARGOVA — Hero 3D truck (stage 5)
 * The finished unit as a real 3D model in the hero's blueprint style
 * (white faces, blue line work). Drag horizontally to spin it a full 360°
 * (with momentum), drag vertically to tilt a little; it idles with a slow spin.
 */
import * as THREE from 'three';
import { gsap } from 'gsap';
import { buildCargoTruck } from './footer-scene.js';

const BLUE = 0x288dfe;
const WHITE = 0xffffff;
const BLUEISH = new Set([0x073252, 0x052338, 0x6fb6ff, 0x288dfe]);

function blueprintLivery() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 400;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1024, 400);
  x.fillStyle = '#288dfe';
  x.fillRect(0, 300, 1024, 34);
  x.font = 'bold 170px "Departure Mono", "Space Mono", monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('CARGOVA', 512, 150);
  x.font = '38px "Departure Mono", "Space Mono", monospace';
  x.fillText('Intelligent logistics', 512, 250);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function toBlueprint(model) {
  const livery = new THREE.MeshBasicMaterial({ map: blueprintLivery() });
  const white = new THREE.MeshBasicMaterial({ color: WHITE });
  const blue = new THREE.MeshBasicMaterial({ color: BLUE });
  const edgeMat = new THREE.LineBasicMaterial({ color: BLUE });
  const pick = (m) => {
    if (m.map) return livery;
    return BLUEISH.has(m.color.getHex()) ? blue : white;
  };
  const tyre = new THREE.MeshBasicMaterial({ color: 0x111111 });
  model.traverse((o) => {
    if (!o.isMesh) return;
    // tyres (the 0.27-radius wheel cylinders) are black; hubs stay white
    if (o.geometry.type === 'CylinderGeometry' && Math.abs(o.geometry.parameters.radiusTop - 0.27) < 0.01) {
      o.material = tyre;
      o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), edgeMat));
      return;
    }
    o.material = Array.isArray(o.material) ? o.material.map(pick) : pick(o.material);
    // line work on white parts only (blue parts already read as lines)
    const isBlue = !Array.isArray(o.material) && o.material === blue;
    if (!isBlue) o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), edgeMat));
  });
  return model;
}

export function createHeroTruck(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const frustum = 2.6;
  const camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
  camera.position.set(6, 4.9, 6);
  camera.lookAt(0, -0.15, 0);

  const pivot = new THREE.Group();     // yaw (360°)
  const tiltG = new THREE.Group();     // small pitch
  const truck = toBlueprint(buildCargoTruck());
  truck.position.set(-0.3, 0.1, 0);
  tiltG.add(truck);
  pivot.add(tiltG);
  pivot.rotation.y = -0.55;            // matches the old 2D three-quarter view
  scene.add(pivot);

  // ground ring (blueprint turntable)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.45, 2.5, 96),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -1.12;
  scene.add(ring);
  const ticks = new THREE.Group();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.PlaneGeometry(i % 9 === 0 ? 0.26 : 0.12, 0.03), ring.material);
    t.rotation.x = -Math.PI / 2;
    t.rotation.z = -a;
    t.position.set(Math.cos(a) * 2.6, -1.12, Math.sin(a) * 2.6);
    ticks.add(t);
  }
  scene.add(ticks);

  // ---------- interaction: drag to spin ----------
  const st = { vel: 0.0025, dragging: false, lastX: 0, lastY: 0, tilt: 0, idle: 0.0025 };
  const onDown = (e) => {
    st.dragging = true;
    st.lastX = e.clientX; st.lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = 'grabbing';
    onDragState?.(true);
  };
  const onMove = (e) => {
    if (!st.dragging) return;
    const dx = e.clientX - st.lastX, dy = e.clientY - st.lastY;
    st.lastX = e.clientX; st.lastY = e.clientY;
    pivot.rotation.y += dx * 0.012;
    st.vel = dx * 0.012;
    st.tilt = gsap.utils.clamp(-0.28, 0.32, st.tilt + dy * 0.004);
  };
  const onUp = () => {
    if (!st.dragging) return;
    st.dragging = false;
    canvas.style.cursor = 'grab';
    onDragState?.(false);
  };
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  let onDragState = null;

  // ---------- loop ----------
  let running = false;
  function frame() {
    if (!running) return;
    if (!st.dragging) {
      st.vel += (st.idle - st.vel) * 0.03;      // momentum decays into the idle spin
      pivot.rotation.y += st.vel;
      st.tilt *= 0.92;                          // tilt eases back to level
    }
    tiltG.rotation.x = st.tilt * 0.6;
    tiltG.rotation.z = -st.tilt * 0.4;
    truck.position.y = 0.1 + Math.sin(performance.now() * 0.0016) * 0.03;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    const a = w / h;
    camera.left = -frustum * a; camera.right = frustum * a; camera.top = frustum; camera.bottom = -frustum;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    start() { if (!running) { running = true; resize(); frame(); } },
    stop() { running = false; },
    onDrag(fn) { onDragState = fn; },
    renderOnce() { resize(); renderer.render(scene, camera); },
  };
}
