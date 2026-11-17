/**
 * CARGOVA — shared truck model
 * The exact truck that backs into the station-5 dock in the logistics world.
 * The footer uses the same builder, so the truck that gets loaded is the one you see driving away.
 * Faces +x, wheels touch y = 0. Lambert (shaded) materials with thin ink edges.
 */
import * as THREE from 'three';

const COL = { orange: 0xfc5c21, white: 0xf4f8ff, sky: 0x6fb6ff, ink: 0x052338, tyre: 0x111111 };

function liveryTexture() {
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
  return tex;
}

export function buildDockTruck({ lineMat, mat } = {}) {
  const lm = lineMat || new THREE.LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.85 });
  const cache = new Map();
  const m = mat || ((c) => {
    if (!cache.has(c)) cache.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    return cache.get(c);
  });
  const truck = new THREE.Group();
  const box = (w, h, d, x, y, z, c, edges = true) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(g, m(c));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), lm));
    truck.add(mesh);
    return mesh;
  };

  box(1.3, 1.3, 1.3, 2.2, 0.9, 0, COL.orange);                 // cab
  box(0.05, 0.5, 1.0, 2.86, 1.2, 0, COL.sky, false);            // windscreen
  box(0.12, 0.9, 0.12, 1.45, 1.6, -0.5, COL.ink, false);        // exhaust
  // trailer with CARGOVA livery on both long sides (face order +x, -x, +y, -y, +z, -z)
  const side = new THREE.MeshLambertMaterial({ map: liveryTexture() });
  const plain = m(COL.white);
  const geo = new THREE.BoxGeometry(3.6, 1.5, 1.4);
  const trailer = new THREE.Mesh(geo, [plain, plain, plain, plain, side, side]);
  trailer.position.set(-0.15, 1.05, 0);
  trailer.castShadow = true;
  trailer.receiveShadow = true;
  trailer.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm));
  truck.add(trailer);
  box(3.7, 0.18, 1.0, -0.1, 0.24, 0, COL.ink, false);          // chassis

  const wheels = [];
  const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12);
  [[-1.4, 0.68], [-0.6, 0.68], [2.2, 0.68], [-1.4, -0.68], [-0.6, -0.68], [2.2, -0.68]].forEach(([a, b]) => {
    const wh = new THREE.Mesh(wGeo, m(COL.tyre));             // black tyres
    wh.position.set(a, 0.28, b);
    wh.rotation.x = Math.PI / 2;
    wh.castShadow = true;
    truck.add(wh);
    wheels.push(wh);
  });
  return { truck, wheels };
}
