/**
 * CARGOVA — Logistics World (Three.js)
 * --------------------------------------------------------------------------
 * Replaces the reference's Rive "factory" canvas 1:1 in role and behaviour:
 *  • isometric flat-shaded illustration on the blue page
 *  • a snaking conveyor carrying units through 5 stations
 *  • units transform after every station (order → parcel → pallet → container → branded container)
 *  • the camera snaps station-to-station (driven by experience.js / GSAP)
 *
 * Station machines (logistics equivalents of the reference machines):
 *  1 Dispatch Hub + route board      (welcome)
 *  2 Smart Warehouse                 (move with us)
 *  3 Container Terminal / STS crane  (start shipping)
 *  4 Air-Cargo Hangar — under construction (track & api)
 *  5 Port: cargo ship + truck fleet  (join our network)
 */
import * as THREE from 'three';

const COL = {
  navy: 0x0a3a60,
  navyDark: 0x062a45,
  ink: 0x052338,
  orange: 0xfc5c21,
  orangeDark: 0xd9461a,
  sky: 0x6fb6ff,
  white: 0xf4f8ff,
  apron: 0x1f7be8,
  steel: 0x1d5d92,
};

// conveyor path (x, z). Segments alternate +x (screen down-right) and +z (screen down-left)
const PATH = [
  [-30, 0], [6, 0], [6, 36], [42, 36], [42, 72], [67, 72],
];
// where each station machine sits on the path
const STATIONS = [
  { x: -12, z: 0 },
  { x: 6, z: 18 },
  { x: 24, z: 36 },
  { x: 42, z: 54 },
  { x: 60, z: 72 },
];

const CAM_DIR = new THREE.Vector3(1, 0.8165, 1).normalize(); // 2:1 dimetric, like the illustration
const BELT_Y = 0.75;
const SPEED = 1.6; // world units / s

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -100, 200);
  const target = new THREE.Vector3();

  // ---------- lights (top bright / left mid / right dark, like the flat illustration)
  scene.add(new THREE.AmbientLight(0xffffff, 1.55));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(-6, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // ---------- ground (shadow catcher)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.ShadowMaterial({ color: 0x0b3f8f, opacity: 0.32 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- helpers
  const matCache = new Map();
  const mat = (c) => {
    if (!matCache.has(c)) matCache.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    return matCache.get(c);
  };
  const lineMat = new THREE.LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.85 });
  const orangeLine = new THREE.LineBasicMaterial({ color: COL.orange });

  function box(parent, w, h, d, x, y, z, color, opts = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat(color));
    m.position.set(x, y, z);
    m.castShadow = opts.shadow !== false;
    m.receiveShadow = true;
    if (opts.edges !== false) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), lineMat));
    parent.add(m);
    return m;
  }
  function cyl(parent, r, h, x, y, z, color, seg = 18, opts = {}) {
    const g = new THREE.CylinderGeometry(opts.rTop ?? r, r, h, seg, 1, false, opts.thetaStart || 0, opts.theta || Math.PI * 2);
    const m = new THREE.Mesh(g, mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    if (opts.edges !== false) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 40), lineMat));
    parent.add(m);
    return m;
  }
  function apron(x, z, w, d, r = 1.6) {
    const s = new THREE.Shape();
    const hw = w / 2, hd = d / 2;
    s.moveTo(-hw + r, -hd);
    s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r);
    s.lineTo(hw, hd - r); s.quadraticCurveTo(hw, hd, hw - r, hd);
    s.lineTo(-hw + r, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - r);
    s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: COL.apron, transparent: true, opacity: 0.55 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.01, z);
    scene.add(m);
  }

  // ---------- path math
  const segs = [];
  let total = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], b = PATH[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, len, s0: total, dx: (b[0] - a[0]) / len, dz: (b[1] - a[1]) / len });
    total += len;
  }
  function at(s) {
    s = ((s % total) + total) % total;
    const seg = segs.find((q) => s >= q.s0 && s < q.s0 + q.len) || segs[segs.length - 1];
    const t = s - seg.s0;
    return { x: seg.a[0] + seg.dx * t, z: seg.a[1] + seg.dz * t, dx: seg.dx, dz: seg.dz };
  }
  function sOf(p) {
    for (const q of segs) {
      const t = (p.x - q.a[0]) * q.dx + (p.z - q.a[1]) * q.dz;
      const px = q.a[0] + q.dx * t, pz = q.a[1] + q.dz * t;
      if (t >= 0 && t <= q.len && Math.hypot(px - p.x, pz - p.z) < 0.01) return q.s0 + t;
    }
    return 0;
  }
  const stationS = STATIONS.map(sOf);

  // ---------- conveyor
  const conveyor = new THREE.Group();
  scene.add(conveyor);
  segs.forEach((q, i) => {
    const cx = (q.a[0] + q.b[0]) / 2, cz = (q.a[1] + q.b[1]) / 2;
    const alongX = Math.abs(q.dx) > 0.5;
    const L = q.len + 1.8; // overlap corners
    const w = alongX ? L : 1.8, d = alongX ? 1.8 : L;
    box(conveyor, w, 0.34, d, cx, BELT_Y - 0.17, cz, COL.navy);
    // side rails
    const rw = alongX ? L : 0.16, rd = alongX ? 0.16 : L;
    const off = 0.98;
    box(conveyor, rw, 0.22, rd, cx + (alongX ? 0 : off), BELT_Y + 0.02, cz + (alongX ? off : 0), COL.navyDark);
    box(conveyor, rw, 0.22, rd, cx - (alongX ? 0 : off), BELT_Y + 0.02, cz - (alongX ? off : 0), COL.navyDark);
    // legs
    for (let t = 0.8; t < q.len; t += 2.4) {
      const lx = q.a[0] + q.dx * t, lz = q.a[1] + q.dz * t;
      box(conveyor, 0.22, BELT_Y - 0.34, 0.22, lx + (alongX ? 0 : 0.7), (BELT_Y - 0.34) / 2, lz + (alongX ? 0.7 : 0), COL.ink, { edges: false });
      box(conveyor, 0.22, BELT_Y - 0.34, 0.22, lx - (alongX ? 0 : 0.7), (BELT_Y - 0.34) / 2, lz - (alongX ? 0.7 : 0), COL.ink, { edges: false });
    }
    if (i === 0 || i === segs.length - 1) return;
  });

  // moving slats (instanced)
  const SLAT_GAP = 0.42;
  const slatCount = Math.floor(total / SLAT_GAP);
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.05, 1.6), mat(COL.steel), slatCount);
  slats.receiveShadow = true;
  conveyor.add(slats);
  const dummy = new THREE.Object3D();

  // ---------- units (crates) — 5 visual variants per unit
  const UNIT_GAP = 2.7;
  const units = [];
  const unitCount = Math.floor(total / UNIT_GAP);

  // ---------- CARGOVA package label (canvas texture)
  function labelTexture(kind) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f8ff'; x.fillRect(0, 0, 256, 256);
    if (kind === 'top') {
      x.fillStyle = '#fc5c21'; x.fillRect(0, 96, 256, 64);          // label band
      x.fillStyle = '#073252';
      x.font = 'bold 44px "Departure Mono", "Space Mono", monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('CARGOVA', 128, 130);
      x.fillRect(118, 0, 20, 96); x.fillRect(118, 160, 20, 96);   // tape
    } else {
      x.fillStyle = '#073252';
      x.font = 'bold 38px "Departure Mono", "Space Mono", monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('CARGOVA', 128, 110);
      x.fillStyle = '#fc5c21'; x.fillRect(40, 150, 176, 10);
      x.fillStyle = '#073252'; x.fillRect(118, 0, 20, 60);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const pkgPlain = new THREE.MeshLambertMaterial({ color: COL.white });
  const pkgTop = new THREE.MeshLambertMaterial({ map: labelTexture('top') });
  const pkgSide = new THREE.MeshLambertMaterial({ map: labelTexture('side') });
  // face order: +x, -x, +y, -y, +z, -z  → label on top and the two camera-facing sides
  const pkgMats = [pkgSide, pkgPlain, pkgTop, pkgPlain, pkgSide, pkgPlain];
  function labelledPackage(parent, w, h, d, y0) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, pkgMats);
    m.position.y = y0 + h / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), lineMat));
    parent.add(m);
    return m;
  }

  function makeUnit() {
    const g = new THREE.Group();
    const v = [];
    // v0: order (orange wire cube)
    const v0 = new THREE.Group();
    const cubeGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(cubeGeo), orangeLine);
    wire.position.y = 0.45;
    const inner = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.32)), orangeLine);
    inner.position.y = 0.45;
    v0.add(wire, inner);
    // v1: plain white package (after the dispatch hub) — no label yet
    const v1 = new THREE.Group();
    box(v1, 0.9, 0.8, 0.9, 0, 0.4, 0, COL.white);
    // v2: palletised package with the CARGOVA brand label (after the warehouse)
    const v2 = new THREE.Group();
    box(v2, 1.1, 0.16, 1.1, 0, 0.08, 0, COL.navy);
    labelledPackage(v2, 1.0, 0.75, 1.0, 0.16);
    // v3: shipping container (orange, ribbed)
    const v3 = new THREE.Group();
    box(v3, 1.7, 0.85, 0.9, 0, 0.43, 0, COL.orange);
    for (let k = -0.7; k <= 0.71; k += 0.2) box(v3, 0.04, 0.7, 0.92, k, 0.43, 0, COL.orangeDark, { edges: false, shadow: false });
    // v4: same red container after the tracking station — now sealed + tagged, heading to the truck
    const v4 = new THREE.Group();
    box(v4, 1.7, 0.85, 0.9, 0, 0.43, 0, COL.orange);
    for (let k = -0.7; k <= 0.71; k += 0.2) box(v4, 0.04, 0.7, 0.92, k, 0.43, 0, COL.orangeDark, { edges: false, shadow: false });
    box(v4, 0.5, 0.16, 0.02, -0.45, 0.62, 0.47, COL.white, { edges: false });   // tracking tag
    box(v4, 0.06, 0.6, 0.94, 0.86, 0.43, 0, COL.navy, { edges: false });        // door seal bar
    [v0, v1, v2, v3, v4].forEach((x) => { x.visible = false; g.add(x); v.push(x); });
    g.userData.v = v;
    g.position.y = BELT_Y;
    scene.add(g);
    return g;
  }
  for (let i = 0; i < unitCount; i++) units.push({ g: makeUnit(), s: i * UNIT_GAP });

  // ---------- station machines
  const anim = []; // per-frame callbacks
  const machines = [];

  // ===== 1. DISPATCH HUB =====
  (function dispatchHub() {
    const g = new THREE.Group();
    const { x, z } = STATIONS[0];
    g.position.set(x, 0, z);
    apron(x + 1, z - 2.5, 11, 9);
    // tunnel body straddling belt
    box(g, 3.6, 2.6, 3.0, 0, 1.3 + 0.2, 0, COL.navy);
    box(g, 3.62, 0.3, 3.02, 0, 2.95, 0, COL.navyDark);
    // screens
    box(g, 1.2, 1.0, 0.06, -0.8, 1.7, 1.52, COL.orange);
    box(g, 1.2, 1.0, 0.06, 0.8, 1.7, 1.52, COL.orange);
    box(g, 0.06, 1.0, 1.4, 1.82, 1.7, 0.0, COL.orange);
    // hopper / scanner tower
    cyl(g, 0.75, 1.0, -0.6, 3.6, -0.2, COL.navy);
    cyl(g, 0.85, 0.22, -0.6, 4.2, -0.2, COL.orange);
    const ring = cyl(g, 0.45, 0.12, -0.6, 4.36, -0.2, COL.white);
    anim.push((t) => { ring.rotation.y = t * 1.5; });
    // arched cable bundle (orange) to annex
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24, Math.PI), mat(COL.orange));
    arc.position.set(1.2, 2.95, -1.2);
    arc.rotation.y = Math.PI / 2;
    arc.castShadow = true;
    g.add(arc);
    // annex (sorting desk) behind
    box(g, 2.4, 1.6, 2.0, 2.6, 0.8, -2.6, COL.navy);
    box(g, 2.0, 0.6, 0.06, 2.6, 1.0, -1.58, COL.orangeDark);
    // scanner light beam on belt
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 1.4), new THREE.MeshBasicMaterial({ color: COL.orange, transparent: true, opacity: 0.25 }));
    beam.position.set(-2.3, 1.4, 0);
    g.add(beam);
    anim.push((t) => { beam.material.opacity = 0.18 + Math.sin(t * 3) * 0.08; });
    // route board (the reference's whiteboard → global route board)
    const board = new THREE.Group();
    board.position.set(4.4, 0, -5.4);
    box(board, 0.12, 2.8, 0.12, -1.3, 1.4, 0, COL.ink, { edges: false });
    box(board, 0.12, 2.8, 0.12, 1.3, 1.4, 0, COL.ink, { edges: false });
    box(board, 2.9, 1.7, 0.14, 0, 2.35, 0, COL.navy);
    box(board, 2.6, 1.4, 0.04, 0, 2.35, 0.09, COL.sky, { edges: false });
    box(board, 0.9, 0.08, 0.02, -0.5, 2.6, 0.12, COL.white, { edges: false });
    box(board, 0.08, 0.6, 0.02, 0.4, 2.3, 0.12, COL.white, { edges: false });
    box(board, 0.7, 0.08, 0.02, 0.75, 2.0, 0.12, COL.white, { edges: false });
    const dot = box(board, 0.16, 0.16, 0.04, 1.1, 2.0, 0.12, COL.orange, { edges: false });
    anim.push((t) => { dot.visible = Math.sin(t * 5) > -0.3; });
    g.add(board);
    // desk
    box(g, 1.8, 0.12, 1.0, 1.9, 1.0, -4.2, COL.navy);
    [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]].forEach(([a, b]) => box(g, 0.08, 1.0, 0.08, 1.9 + a, 0.5, -4.2 + b, COL.ink, { edges: false }));
    box(g, 0.5, 0.04, 0.35, 1.7, 1.08, -4.2, COL.white, { edges: false });
    // beacon
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: COL.orange }));
    beacon.position.set(6.2, 4.6, -3.8);
    g.add(beacon);
    anim.push((t) => { beacon.scale.setScalar(0.8 + Math.abs(Math.sin(t * 2)) * 0.4); });
    scene.add(g);
    machines.push(g);
  })();

  // ===== 2. SMART WAREHOUSE (belt along +z) =====
  (function warehouse() {
    const g = new THREE.Group();
    const { x, z } = STATIONS[1];
    g.position.set(x, 0, z);
    apron(x - 1, z, 12, 10);
    box(g, 5.2, 3.0, 5.0, -0.6, 1.5, 0, COL.navy);
    // roof
    box(g, 5.4, 0.25, 5.2, -0.6, 3.12, 0, COL.navyDark);
    box(g, 2.2, 0.5, 1.4, -1.6, 3.5, 0.4, COL.navy);
    box(g, 1.0, 0.06, 1.0, -1.6, 3.78, 0.4, COL.orange, { edges: false });
    box(g, 0.8, 0.35, 0.6, 0.8, 3.42, -1.6, COL.orange);
    // corrugated long side (+x face, faces screen-right)
    for (let k = -2.3; k <= 2.31; k += 0.32) box(g, 0.08, 2.6, 0.12, 2.04, 1.4, k, COL.steel, { edges: false });
    // strip windows (front, +z?) — on +x face light row
    for (let k = -2; k <= 2; k += 0.8) box(g, 0.05, 0.25, 0.5, 2.1, 2.55, k, COL.orange, { edges: false });
    // loading door frames at both belt ends (z faces)
    box(g, 2.2, 1.8, 0.1, 0, 1.15, 2.52, COL.orange);
    box(g, 1.7, 1.4, 0.1, 0, 1.0, 2.56, COL.navyDark, { edges: false });
    box(g, 2.2, 1.8, 0.1, 0, 1.15, -2.52, COL.orange);
    // side office annex
    box(g, 1.6, 2.2, 2.0, 2.9, 1.1, 1.2, COL.steel);
    box(g, 0.05, 1.2, 1.2, 3.72, 1.3, 1.2, COL.sky, { edges: false });
    box(g, 0.05, 0.6, 0.4, 3.72, 1.7, 0.4, COL.orange, { edges: false });
    // big corrugated canopy (left)
    box(g, 2.0, 2.4, 4.2, -4.2, 1.2, 0.3, COL.steel);
    for (let k = -1.8; k <= 1.81; k += 0.3) box(g, 2.04, 2.2, 0.06, -4.2, 1.15, 0.3 + k, COL.navy, { edges: false });
    scene.add(g);
    machines.push(g);
  })();

  // ===== 3. CONTAINER TERMINAL (belt along +x) =====
  (function terminal() {
    const g = new THREE.Group();
    const { x, z } = STATIONS[2];
    g.position.set(x, 0, z);
    apron(x, z - 0.5, 12, 11);
    // processing block
    box(g, 3.0, 2.8, 3.4, 0, 1.4, 0, COL.navy);
    box(g, 3.2, 0.2, 3.6, 0, 2.9, 0, COL.navyDark);
    box(g, 2.0, 0.08, 0.6, 0, 3.04, 0, COL.white, { edges: false });
    box(g, 0.06, 1.0, 1.0, 1.53, 1.6, -0.9, COL.orange);
    box(g, 0.06, 1.0, 1.0, 1.53, 1.6, 0.9, COL.orange);
    // twin silos
    [[-0.6, -2.6], [0.8, -2.6]].forEach(([a, b], i) => {
      cyl(g, 0.55, 3.4, a, 1.7, b, COL.white);
      cyl(g, 0.57, 0.3, a, 1.0 + i * 0.6, b, COL.orange, 18, { edges: false });
      cyl(g, 0.3, 0.3, a, 3.55, b, COL.navy);
    });
    // STS gantry crane straddling belt
    const crane = new THREE.Group();
    crane.position.set(-3.2, 0, 0);
    [[-1.1, -1.6], [1.1, -1.6], [-1.1, 1.6], [1.1, 1.6]].forEach(([a, b]) => box(crane, 0.22, 4.6, 0.22, a, 2.3, b, COL.navy));
    box(crane, 2.6, 0.3, 0.3, 0, 4.3, -1.6, COL.orange);
    box(crane, 2.6, 0.3, 0.3, 0, 4.3, 1.6, COL.orange);
    box(crane, 0.4, 0.4, 6.4, 0, 4.7, 0.8, COL.orange); // boom
    box(crane, 0.9, 0.7, 0.9, 0, 5.2, -1.6, COL.navy);  // cab
    box(crane, 0.05, 0.3, 0.5, 0.46, 5.25, -1.6, COL.sky, { edges: false });
    const trolley = new THREE.Group();
    box(trolley, 0.6, 0.25, 0.6, 0, 4.4, 0, COL.navyDark);
    const cable = box(trolley, 0.04, 1.6, 0.04, 0, 3.5, 0, COL.ink, { edges: false });
    const spreader = box(trolley, 1.4, 0.15, 0.7, 0, 2.7, 0, COL.orange);
    crane.add(trolley);
    anim.push((t) => {
      const k = (Math.sin(t * 0.8) + 1) / 2;
      trolley.position.z = -1 + k * 3.2;
      const drop = Math.sin(t * 1.6) * 0.35;
      spreader.position.y = 2.7 + drop;
      cable.scale.y = 1 - drop / 1.6;
      cable.position.y = 3.5 + drop / 2;
    });
    g.add(crane);
    // stacked containers yard
    const yard = [[2.6, 2.4, COL.orange], [2.6, 3.4, COL.white], [3.9, 2.4, COL.steel]];
    yard.forEach(([a, b, c]) => box(g, 1.2, 0.8, 0.9, a, 0.4, b, c));
    box(g, 1.2, 0.8, 0.9, 2.6, 1.2, 2.4, COL.sky);
    scene.add(g);
    machines.push(g);
  })();

  // ===== 4. AIR-CARGO HANGAR — under construction (belt along +z) =====
  (function hangar() {
    const g = new THREE.Group();
    const { x, z } = STATIONS[3];
    g.position.set(x, 0, z);
    apron(x - 0.5, z, 12, 11);
    // hangar half-cylinder
    const h = cyl(g, 2.6, 5.2, -0.4, 0, 0, COL.navy, 20, { thetaStart: -Math.PI / 2, theta: Math.PI });
    h.rotation.x = Math.PI / 2;
    h.rotation.z = Math.PI / 2;
    h.position.set(-0.6, 0, 0);
    h.rotation.set(0, 0, 0);
    // build hangar as rotated half cylinder along z
    g.remove(h);
    const hg = new THREE.CylinderGeometry(2.6, 2.6, 5.2, 22, 1, false, 0, Math.PI);
    const hm = new THREE.Mesh(hg, mat(COL.navy));
    hm.rotation.x = Math.PI / 2;
    hm.rotation.y = Math.PI / 2;
    hm.position.set(-0.4, 0, 0);
    hm.castShadow = true;
    hm.add(new THREE.LineSegments(new THREE.EdgesGeometry(hg, 30), lineMat));
    g.add(hm);
    // ribs
    for (let k = -2.4; k <= 2.41; k += 0.8) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.05, 6, 22, Math.PI), mat(COL.steel));
      rib.position.set(-0.4, 0, k);
      g.add(rib);
    }
    // door opening (front, +z) orange glow
    box(g, 2.6, 2.0, 0.08, -0.4, 1.0, 2.62, COL.orange);
    // plane tail fin sticking out the back
    const fin = new THREE.Shape();
    fin.moveTo(0, 0); fin.lineTo(1.8, 0); fin.lineTo(1.2, 2.2); fin.lineTo(0.5, 2.2); fin.lineTo(0, 0);
    const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.18, bevelEnabled: false });
    const finM = new THREE.Mesh(finGeo, mat(COL.orange));
    finM.add(new THREE.LineSegments(new THREE.EdgesGeometry(finGeo), lineMat));
    finM.rotation.y = Math.PI / 2;
    finM.position.set(-0.5, 2.3, -1.0);
    finM.castShadow = true;
    g.add(finM);
    // scaffold
    for (let k = -2; k <= 2; k += 2) box(g, 0.08, 3.4, 0.08, 2.6, 1.7, k, COL.white, { edges: false });
    for (let y = 1; y <= 3.2; y += 1.1) box(g, 0.08, 0.08, 4.1, 2.6, y, 0, COL.white, { edges: false });
    // barrier posts + tape around the site
    const posts = [[-3.6, -3.4], [3.4, -3.4], [3.4, 3.6], [-3.6, 3.6]];
    posts.forEach(([a, b]) => {
      for (let i = 0; i < 4; i++) cyl(g, 0.16, 0.25, a, 0.13 + i * 0.25, b, i % 2 ? COL.white : COL.orange, 10, { edges: false });
      cyl(g, 0.2, 0.06, a, 1.02, b, COL.ink, 10, { edges: false });
    });
    for (let i = 0; i < 4; i++) {
      const [a1, b1] = posts[i], [a2, b2] = posts[(i + 1) % 4];
      const len = Math.hypot(a2 - a1, b2 - b1);
      const tape = box(g, len, 0.16, 0.03, (a1 + a2) / 2, 0.82, (b1 + b2) / 2, COL.orange, { edges: false });
      tape.rotation.y = -Math.atan2(b2 - b1, a2 - a1);
    }
    // cones
    [[2.0, 3.0], [2.6, 2.4], [-2.8, -2.8]].forEach(([a, b]) => {
      cyl(g, 0.22, 0.55, a, 0.28, b, COL.orange, 10, { rTop: 0.04, edges: false });
      cyl(g, 0.16, 0.08, a, 0.3, b, COL.white, 10, { edges: false });
    });
    // blinking warning light
    const warn = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: COL.orange }));
    warn.position.set(-0.4, 2.85, 0);
    g.add(warn);
    anim.push((t) => { warn.visible = Math.sin(t * 6) > 0; });
    scene.add(g);
    machines.push(g);
  })();

  // ===== 5. PORT — ship + loading dock + cargo truck (belt ends at the truck) =====
  (function port() {
    const g = new THREE.Group();
    const { x, z } = STATIONS[4];
    g.position.set(x, 0, z);
    apron(x + 1, z + 1, 13, 12);
    // loading platform — tall enough that units pass fully *through* it (no poking out of the top)
    box(g, 3.0, 2.1, 3.0, 0, 1.05, 0, COL.navy);
    box(g, 3.1, 0.12, 3.1, 0, 2.16, 0, COL.orange, { edges: false });
    box(g, 0.06, 1.0, 1.9, 1.53, 1.15, 0, COL.ink, { edges: false });   // exit mouth
    box(g, 0.06, 1.0, 1.9, -1.53, 1.15, 0, COL.ink, { edges: false });  // entry mouth
    // loading dock gate at the end of the belt (units go into the truck through it)
    box(g, 1.7, 2.3, 2.4, 6.85, 1.15, 0, COL.navy);
    box(g, 1.8, 0.14, 2.5, 6.85, 2.36, 0, COL.orange, { edges: false });
    box(g, 0.06, 1.0, 1.9, 5.98, 1.15, 0, COL.ink, { edges: false });
    const dockLight = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: COL.orange }));
    dockLight.position.set(6.1, 2.6, 0.9);
    g.add(dockLight);
    // ship hull (behind, screen up-right)
    const ship = new THREE.Group();
    ship.position.set(1.5, 0, -5.4);
    box(ship, 9.5, 1.3, 2.6, 0, 0.65, 0, COL.navy);
    box(ship, 9.5, 0.14, 2.62, 0, 1.25, 0, COL.orange, { edges: false });
    const bow = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.3, 3, 1), mat(COL.navy));
    bow.rotation.y = Math.PI / 6;
    bow.scale.set(1.2, 1, 1);
    bow.position.set(5.0, 0.65, 0);
    ship.add(bow);
    box(ship, 1.4, 2.4, 2.0, -3.8, 2.5, 0, COL.white); // bridge
    box(ship, 1.42, 0.3, 2.02, -3.8, 3.2, 0, COL.navy, { edges: false });
    cyl(ship, 0.25, 1.0, -3.6, 4.1, 0.5, COL.orange);
    const deck = [COL.orange, COL.white, COL.steel, COL.sky, COL.orange, COL.white];
    deck.forEach((c, i) => {
      box(ship, 1.4, 0.75, 1.0, -2.2 + (i % 3) * 1.55 + 0.4, 1.7, i < 3 ? -0.55 : 0.55, c);
      if (i % 2 === 0) box(ship, 1.4, 0.75, 1.0, -2.2 + (i % 3) * 1.55 + 0.4, 2.45, i < 3 ? -0.55 : 0.55, deck[(i + 2) % 6]);
    });
    anim.push((t) => { ship.position.y = Math.sin(t * 1.2) * 0.06; ship.rotation.x = Math.sin(t * 0.9) * 0.01; });
    g.add(ship);
    // cargo truck — reverses up to the dock gate, gets loaded, drives off, next one backs in
    const truck = new THREE.Group();
    const DOCK_X = 9.65; // trailer rear (-1.9) meets the gate's back face (7.7)
    truck.position.set(DOCK_X, 0, 0);
    box(truck, 1.3, 1.3, 1.3, 2.2, 0.9, 0, COL.orange); // cab
    box(truck, 0.05, 0.5, 1.0, 2.86, 1.2, 0, COL.sky, { edges: false });
    box(truck, 0.12, 0.9, 0.12, 1.45, 1.6, -0.5, COL.ink, { edges: false }); // exhaust
    // trailer with CARGOVA livery on both long sides
    {
      const c = document.createElement('canvas');
      c.width = 720; c.height = 300;
      const x = c.getContext('2d');
      x.fillStyle = '#f4f8ff'; x.fillRect(0, 0, 720, 300);
      x.fillStyle = '#fc5c21'; x.fillRect(0, 205, 720, 42);           // orange band
      x.fillStyle = '#073252'; x.fillRect(0, 247, 720, 10);
      x.font = 'bold 118px "Departure Mono", "Space Mono", monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('CARGOVA', 360, 112);
      x.font = '26px "Departure Mono", "Space Mono", monospace';
      x.fillText('intelligent logistics', 360, 182);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const side = new THREE.MeshLambertMaterial({ map: tex });
      const plain = mat(COL.white);
      const geo = new THREE.BoxGeometry(3.6, 1.5, 1.4);
      // face order +x, -x, +y, -y, +z, -z
      const trailer = new THREE.Mesh(geo, [plain, plain, plain, plain, side, side]);
      trailer.position.set(-0.15, 1.05, 0);
      trailer.castShadow = true;
      trailer.receiveShadow = true;
      trailer.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat));
      truck.add(trailer);
    }
    box(truck, 3.7, 0.18, 1.0, -0.1, 0.24, 0, COL.ink, { edges: false });     // chassis
    const wheels = [];
    [[-1.4, 0.68], [-0.6, 0.68], [2.2, 0.68], [-1.4, -0.68], [-0.6, -0.68], [2.2, -0.68]].forEach(([a, b]) => {
      const wh = cyl(truck, 0.28, 0.22, a, 0.28, b, COL.ink, 12, { edges: false });
      wh.rotation.x = Math.PI / 2;
      wheels.push(wh);
    });
    g.add(truck);
    // cycle: 0–7s loading at the dock · 7–9s drive away (+x) · 9–11s next truck reverses in
    const CYCLE = 11;
    const easeIn = (k) => k * k * k;
    const easeOut = (k) => 1 - (1 - k) ** 3;
    let lastX = DOCK_X;
    anim.push((t) => {
      const c = t % CYCLE;
      let off = 0;
      if (c > 7 && c <= 9) off = easeIn((c - 7) / 2) * 22;
      else if (c > 9) off = (1 - easeOut((c - 9) / 2)) * 22;
      truck.position.x = DOCK_X + off;
      const moving = Math.abs(truck.position.x - lastX);
      wheels.forEach((w) => (w.rotation.y -= moving / 0.28));
      lastX = truck.position.x;
      truck.position.y = c <= 7 ? Math.abs(Math.sin(t * 9)) * 0.012 : Math.abs(Math.sin(t * 14)) * 0.02; // idle / driving rumble
      truck.visible = off < 21.5;
      dockLight.material.color.setHex(c <= 7 ? COL.orange : COL.sky); // orange = loading
    });
    // dock bollards
    [[-3.5, -3.6], [0, -3.6], [3.5, -3.6]].forEach(([a, b]) => cyl(g, 0.18, 0.4, a, 0.2, b, COL.ink, 10, { edges: false }));
    scene.add(g);
    machines.push(g);
  })();

  // ---------- framing / camera
  const state = { viewH: 18, mobile: false };
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  function basis() {
    right.set(1, 0, -1).normalize();
    up.crossVectors(right, CAM_DIR.clone().negate()).normalize().negate();
    // up should point screen-up
    if (up.y < 0) up.negate();
  }
  basis();

  // per-station framing nudge (station 5 frames the platform → dock → truck run)
  const NUDGE = [0, 0, 0, 0, 4.2];
  function stationFocus(i) {
    const p = new THREE.Vector3(STATIONS[i].x + NUDGE[i], 1.6, STATIONS[i].z);
    const aspect = window.innerWidth / window.innerHeight;
    const viewW = state.viewH * aspect;
    if (state.mobile) {
      // machine sits in the upper part (boxes dock at the bottom)
      return p.addScaledVector(up, -state.viewH * 0.2);
    }
    // machine sits right of centre (text column on the left)
    return p.addScaledVector(right, -viewW * 0.11).addScaledVector(up, -state.viewH * 0.02);
  }

  function applyCamera() {
    camera.position.copy(target).addScaledVector(CAM_DIR, 60);
    camera.lookAt(target);
    sun.position.copy(target).add(new THREE.Vector3(-6, 14, 9));
    sun.target.position.copy(target);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const aspect = w / h;
    state.mobile = w < 992;
    // desktop: fixed vertical extent; portrait: fit by width so machines stay legible
    state.viewH = state.mobile ? 16 : 13.5;
    if (state.mobile && aspect < 0.8) state.viewH = 11.5 / aspect;
    const hh = state.viewH / 2;
    camera.left = -hh * aspect; camera.right = hh * aspect; camera.top = hh; camera.bottom = -hh;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  // ---------- loop
  const clock = new THREE.Clock();
  let running = false;
  let flow = 0;

  function update(dt, t) {
    flow += dt * SPEED;
    // slats
    for (let i = 0; i < slatCount; i++) {
      const p = at(i * SLAT_GAP + flow);
      dummy.position.set(p.x, BELT_Y + 0.025, p.z);
      dummy.rotation.set(0, Math.atan2(-p.dz, p.dx), 0);
      dummy.updateMatrix();
      slats.setMatrixAt(i, dummy.matrix);
    }
    slats.instanceMatrix.needsUpdate = true;
    // units
    for (const u of units) {
      const s = (((u.s + flow) % total) + total) % total;
      const p = at(s);
      u.g.position.x = p.x;
      u.g.position.z = p.z;
      u.g.rotation.y = Math.atan2(-p.dz, p.dx);
      let stage = 0;
      for (let k = 0; k < stationS.length; k++) if (s > stationS[k]) stage = k + 1;
      stage = Math.min(stage, 4);
      // hide while inside a machine body
      const inside = stationS.some((ss) => Math.abs(s - ss) < 1.3) || s > total - 1.0; // last stretch: inside the dock gate → loaded into the truck
      u.g.userData.v.forEach((m, k) => (m.visible = !inside && k === stage));
      // little hop when changing over
      u.g.position.y = BELT_Y;
    }
    anim.forEach((f) => f(t));
  }

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, clock.elapsedTime);
    applyCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  resize();
  target.copy(stationFocus(0));
  applyCamera();
  update(0, 0);
  window.addEventListener('resize', () => { resize(); });

  return {
    renderer,
    camera,
    target,
    stationCount: STATIONS.length,
    /** world-space camera focus for station i (0-based) */
    focus: (i) => stationFocus(i),
    /** focus offset upward (used for the intro pan) */
    introFrom: (i) => stationFocus(i).addScaledVector(up, state.viewH * 0.9),
    /** a point between stations, used to sweep along the conveyor */
    start() { if (running) return; running = true; clock.getDelta(); frame(); },
    stop() { running = false; },
    renderOnce() { applyCamera(); renderer.render(scene, camera); },
    resize,
  };
}
