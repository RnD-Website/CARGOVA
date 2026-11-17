/**
 * CARGOVA — isometric SVG generator
 * Produces the blueprint-style "assembly stage" illustrations used in the hero
 * (replaces the reference's 5 progressive "fridge" previews), the station
 * nav icons and the preloader units. Pure functions → SVG strings.
 */

const C = Math.cos(Math.PI / 6);
const S = 0.5;

function makeProjector(scale, ox, oy) {
  return (x, y, z) => [ox + (x - y) * C * scale, oy + (x + y) * S * scale - z * scale];
}

const pts = (arr) => arr.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');

function boxFaces(P, x, y, z, w, d, h) {
  return {
    top: [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)],
    left: [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)],
    right: [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)],
  };
}

function box(P, b, style) {
  const f = boxFaces(P, b.x, b.y, b.z, b.w, b.d, b.h);
  const s = `stroke="${style.stroke}" stroke-width="${style.sw}" stroke-linejoin="round"`;
  return (
    `<polygon points="${pts(f.left)}" fill="${style.left}" ${s}/>` +
    `<polygon points="${pts(f.right)}" fill="${style.right}" ${s}/>` +
    `<polygon points="${pts(f.top)}" fill="${style.top}" ${s}/>`
  );
}

function line(P, a, b, stroke, sw) {
  const A = P(...a);
  const B = P(...b);
  return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

function poly(P, list, fill, stroke, sw) {
  return `<polygon points="${pts(list.map((p) => P(...p)))}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

/* Wireframe edges of a box (stage 1 = bare container frame) */
function frame(P, b, stroke, sw) {
  const { x, y, z, w, d, h } = b;
  const v = [
    [x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z],
    [x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h],
  ];
  const e = [[1, 2], [2, 3], [5, 6], [6, 7], [4, 5], [4, 7], [1, 5], [2, 6], [3, 7], [0, 1], [0, 3], [0, 4]];
  // skip hidden back edges for the blueprint look (0-1, 0-3, 0-4 drawn dashed)
  return e
    .map(([a, c], i) => {
      const dash = i >= 9 ? ' stroke-dasharray="6 8" opacity="0.55"' : '';
      const A = P(...v[a]);
      const B = P(...v[c]);
      return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${dash}/>`;
    })
    .join('');
}

/**
 * Hero assembly stage (1 → 5): a CARGOVA freight unit being assembled.
 * 1 frame · 2 floor + corrugated side · 3 roof + doors · 4 lock bars + side crate · 5 finished, branded.
 */
export function assemblyStage(stage, opts = {}) {
  const size = opts.size || 529;
  const k = size / 21; // world → px
  const P = makeProjector(k, size * 0.5 - k * 1.2, size * 0.36);
  const white = '#ffffff';
  const blue = opts.blue || '#288DFE';
  const sw = Math.max(1.2, k * 0.34);
  const thin = Math.max(0.8, k * 0.2);
  const solid = stage >= 5;
  const faceFill = solid ? white : 'rgba(255,255,255,0.10)';
  const detail = solid ? blue : white;
  const st = { stroke: white, sw, top: faceFill, left: faceFill, right: faceFill };

  const body = { x: 0, y: 0, z: 0, w: 11, d: 6.5, h: 6.5 };
  let out = '';

  if (stage === 1) {
    out += frame(P, body, white, sw);
    // corner castings
    [[11, 0, 6.5], [11, 6.5, 6.5], [0, 6.5, 6.5], [11, 6.5, 0], [11, 0, 0], [0, 6.5, 0]].forEach(([x, y, z]) => {
      const p = P(x, y, z);
      out += `<rect x="${(p[0] - k * 0.35).toFixed(1)}" y="${(p[1] - k * 0.35).toFixed(1)}" width="${(k * 0.7).toFixed(1)}" height="${(k * 0.7).toFixed(1)}" fill="${blue}" stroke="${white}" stroke-width="${thin}"/>`;
    });
    // floor guide
    out += poly(P, [[0, 0, 0], [11, 0, 0], [11, 6.5, 0], [0, 6.5, 0]], 'rgba(255,255,255,0.06)', 'none', 0);
    return wrap(size, out);
  }

  // stage ≥2 : floor + left corrugated wall
  if (stage === 2) {
    out += frame(P, body, white, sw);
    out += poly(P, [[0, 6.5, 0], [11, 6.5, 0], [11, 6.5, 6.5], [0, 6.5, 6.5]], faceFill, white, sw);
    for (let u = 0.8; u < 11; u += 0.8) out += line(P, [u, 6.5, 0.5], [u, 6.5, 6], white, thin);
    out += poly(P, [[0, 0, 0], [11, 0, 0], [11, 6.5, 0], [0, 6.5, 0]], 'rgba(255,255,255,0.08)', white, thin);
    return wrap(size, out);
  }

  // stage 5 : the finished unit rides on a CARGOVA cargo truck
  if (solid) {
    const PT = makeProjector(k * 0.9, size * 0.5 - k * 1.9, size * 0.44); // re-centred: truck is taller + longer
    return wrap(size, truckUnit(PT, k, { white, blue, sw, thin, faceFill, detail, st }));
  }

  // stage ≥3 : closed body
  // side crate behind (stage 4+)
  if (stage >= 4) {
    out += box(P, { x: 11.6, y: 1.2, z: 0, w: 3.4, d: 3.4, h: 2.8 }, st);
    if (solid) {
      // pallet slats on crate
      out += line(P, [11.6, 4.6, 1.4], [15, 4.6, 1.4], detail, thin);
      out += line(P, [15, 1.2, 1.4], [15, 4.6, 1.4], detail, thin);
    }
  }
  out += box(P, body, st);

  // corrugation on long (left) face
  for (let u = 0.8; u < 11; u += 0.8) out += line(P, [u, 6.5, 0.5], [u, 6.5, 6], detail, thin);
  // door end (right face): two leaves
  out += line(P, [11, 3.25, 0.4], [11, 3.25, 6.1], detail, thin * 1.4);
  out += poly(P, [[11, 0.4, 0.4], [11, 6.1, 0.4], [11, 6.1, 6.1], [11, 0.4, 6.1]], 'none', detail, thin);
  // roof ribs
  for (let u = 1.4; u < 11; u += 1.4) out += line(P, [u, 0.3, 6.5], [u, 6.2, 6.5], detail, thin * 0.8);

  if (stage >= 4) {
    // lock bars + handles
    [1.3, 2.5, 4.0, 5.2].forEach((v) => {
      out += line(P, [11, v, 0.6], [11, v, 5.9], detail, thin * 1.3);
      out += line(P, [11, v, 2.8], [11, v + 0.5, 2.6], detail, thin * 1.3);
    });
    // id plate on long face
    out += poly(P, [[1.2, 6.5, 4.4], [4.6, 6.5, 4.4], [4.6, 6.5, 5.6], [1.2, 6.5, 5.6]], solid ? blue : 'rgba(255,255,255,0.25)', detail, thin);
    // front step crate (like the reference's side modules)
    out += box(P, { x: 7.6, y: 7.1, z: 0, w: 2.6, d: 2.6, h: 2.2 }, st);
  }

  if (solid) {
    // CARGOVA mark on roof: a "C" route chevron with hub node
    const cx = 5.5;
    const cy = 3.25;
    out += poly(P, [[cx - 2.4, cy - 1.6, 6.52], [cx + 1.6, cy - 1.6, 6.52], [cx + 1.6, cy - 0.7, 6.52], [cx - 1.4, cy - 0.7, 6.52], [cx - 1.4, cy + 0.7, 6.52], [cx + 1.6, cy + 0.7, 6.52], [cx + 1.6, cy + 1.6, 6.52], [cx - 2.4, cy + 1.6, 6.52]], blue, blue, thin);
    out += poly(P, [[cx + 2.0, cy - 0.45, 6.52], [cx + 2.9, cy - 0.45, 6.52], [cx + 2.9, cy + 0.45, 6.52], [cx + 2.0, cy + 0.45, 6.52]], blue, blue, thin);
    // CARGOVA letters plate on long side
    out += poly(P, [[6.2, 6.5, 1.0], [10.2, 6.5, 1.0], [10.2, 6.5, 2.0], [6.2, 6.5, 2.0]], blue, blue, thin);
  }
  return wrap(size, out);
}

/* iso circle on a y = const plane (wheels seen from the near side) */
function wheel(P, cx, y, cz, r, fill, stroke, sw) {
  const pts2 = [];
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    pts2.push(P(cx + Math.cos(t) * r, y, cz + Math.sin(t) * r));
  }
  return `<polygon points="${pts(pts2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

/** Stage 5: branded container on a cargo truck (chassis, wheels, cab) */
function truckUnit(P, k, c) {
  const { white, blue, sw, thin, detail, st } = c;
  const lift = 1.7;
  const L = (x, y, z) => P(x, y, z + lift); // container sits on the chassis
  const body = { x: 0, y: 0, z: 0, w: 11, d: 6.5, h: 6.5 };
  let out = '';
  // chassis rail + rear bumper
  out += box(P, { x: -0.3, y: 1.0, z: 0.9, w: 15.2, d: 4.5, h: 0.8 }, st);
  out += line(P, [-0.3, 5.5, 1.3], [14.9, 5.5, 1.3], detail, thin);
  // container
  out += box(L, body, st);
  for (let u = 0.8; u < 11; u += 0.8) out += line(L, [u, 6.5, 0.5], [u, 6.5, 6], detail, thin);
  out += line(L, [11, 3.25, 0.4], [11, 3.25, 6.1], detail, thin * 1.4);
  out += poly(L, [[11, 0.4, 0.4], [11, 6.1, 0.4], [11, 6.1, 6.1], [11, 0.4, 6.1]], 'none', detail, thin);
  for (let u = 1.4; u < 11; u += 1.4) out += line(L, [u, 0.3, 6.5], [u, 6.2, 6.5], detail, thin * 0.8);
  // CARGOVA mark on roof
  const cx = 5.5, cy = 3.25, z = 6.52;
  out += poly(L, [[cx - 2.4, cy - 1.6, z], [cx + 1.6, cy - 1.6, z], [cx + 1.6, cy - 0.7, z], [cx - 1.4, cy - 0.7, z], [cx - 1.4, cy + 0.7, z], [cx + 1.6, cy + 0.7, z], [cx + 1.6, cy + 1.6, z], [cx - 2.4, cy + 1.6, z]], blue, blue, thin);
  out += poly(L, [[cx + 2.0, cy - 0.45, z], [cx + 2.9, cy - 0.45, z], [cx + 2.9, cy + 0.45, z], [cx + 2.0, cy + 0.45, z]], blue, blue, thin);
  // name plate on long side
  out += poly(L, [[1.2, 6.5, 4.4], [4.6, 6.5, 4.4], [4.6, 6.5, 5.6], [1.2, 6.5, 5.6]], blue, blue, thin);
  // cab (behind the door end): tall cabin + hood
  out += box(P, { x: 11.5, y: 0.4, z: 1.0, w: 2.4, d: 5.7, h: 5.0 }, st);
  out += box(P, { x: 13.9, y: 0.6, z: 1.0, w: 1.7, d: 5.3, h: 2.5 }, st);
  // windscreen + side window + grille + headlight
  out += poly(P, [[13.9, 0.9, 3.9], [13.9, 5.8, 3.9], [13.9, 5.8, 5.6], [13.9, 0.9, 5.6]], blue, blue, thin);
  out += poly(P, [[11.9, 6.1, 3.9], [13.5, 6.1, 3.9], [13.5, 6.1, 5.6], [11.9, 6.1, 5.6]], blue, blue, thin);
  [1.3, 1.9, 2.5].forEach((v) => (out += line(P, [15.6, 1.4, v], [15.6, 4.7, v], detail, thin)));
  out += poly(P, [[15.6, 5.0, 2.2], [15.6, 5.6, 2.2], [15.6, 5.6, 2.8], [15.6, 5.0, 2.8]], blue, blue, thin);
  // exhaust stack
  out += box(P, { x: 11.2, y: 0.6, z: 3.0, w: 0.3, d: 0.3, h: 3.6 }, st);
  // near-side wheels (tyre + hub)
  [[1.6, 0.85], [3.6, 0.85], [13.4, 0.85]].forEach(([wx, wz]) => {
    out += wheel(P, wx, 6.1, wz, 0.95, blue, white, thin);
    out += wheel(P, wx, 6.12, wz, 0.38, white, blue, thin * 0.8);
  });
  return out;
}

function wrap(size, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" aria-hidden="true">${inner}</svg>`;
}

/** Small colored unit for the preloader (orange / navy illustration style) */
export function preloaderUnit(variant = 0, size = 120) {
  const k = size / 14;
  const P = makeProjector(k, size * 0.5 - k * 0.8, size * 0.42);
  const navy = '#073252';
  const orange = '#FC5C21';
  const st = { stroke: navy, sw: 2, top: orange, left: '#E04A14', right: '#FF7A45' };
  let out = '';
  const body = { x: 0, y: 0, z: 0, w: 6, d: 4.5, h: 4.5 };
  out += box(P, { x: 6.4, y: 0.8, z: 0, w: 2.2, d: 2.2, h: 1.8 }, st);
  out += box(P, body, st);
  for (let u = 0.6; u < 6; u += 0.6) out += line(P, [u, 4.5, 0.4], [u, 4.5, 4.1], navy, 1.4);
  const marks = [
    () => poly(P, [[1.6, 1.2, 4.52], [4.4, 1.2, 4.52], [4.4, 1.8, 4.52], [2.3, 1.8, 4.52], [2.3, 2.7, 4.52], [4.4, 2.7, 4.52], [4.4, 3.3, 4.52], [1.6, 3.3, 4.52]], navy, navy, 1),
    () => [1.2, 2.2, 3.2].map((v) => line(P, [1, v, 4.52], [5, v, 4.52], navy, 2)).join(''),
    () => poly(P, [[3, 0.8, 4.52], [4.6, 2.25, 4.52], [3, 3.7, 4.52], [1.4, 2.25, 4.52]], navy, navy, 1),
    () => line(P, [1.2, 1.2, 4.52], [4.8, 3.3, 4.52], navy, 3) + line(P, [4.8, 1.2, 4.52], [1.2, 3.3, 4.52], navy, 3),
  ];
  out += marks[variant % 4]();
  [1.2, 2.2, 3.3].forEach((v) => (out += line(P, [6, v, 0.5], [6, v, 4], navy, 1.6)));
  return wrap(size, out);
}

/** Preloader cargo truck (orange / navy illustration style) — 4 load variants */
export function preloaderTruck(variant = 0, size = 124) {
  const k = size / 19;
  const P = makeProjector(k, size * 0.5 - k * 2.6, size * 0.47);
  const navy = '#073252';
  const orange = { stroke: navy, sw: 1.8, top: '#FC5C21', left: '#E04A14', right: '#FF7A45' };
  const white = { stroke: navy, sw: 1.8, top: '#ffffff', left: '#dfe9f7', right: '#f4f8ff' };
  const dark = { stroke: navy, sw: 1.8, top: '#1d5d92', left: '#0a3a60', right: '#134b78' };
  let out = '';
  // chassis
  out += box(P, { x: 0, y: 0.6, z: 0.7, w: 11.4, d: 3.2, h: 0.6 }, dark);
  // load
  const load = [
    () => { // container
      let o = box(P, { x: 0, y: 0, z: 1.3, w: 8, d: 4.4, h: 4.2 }, orange);
      for (let u = 0.7; u < 8; u += 0.7) o += line(P, [u, 4.4, 1.6], [u, 4.4, 5.2], navy, 1.2);
      return o;
    },
    () => { // CARGOVA box trailer
      let o = box(P, { x: 0, y: 0, z: 1.3, w: 8, d: 4.4, h: 4.2 }, white);
      o += poly(P, [[0, 4.4, 2.2], [8, 4.4, 2.2], [8, 4.4, 2.8], [0, 4.4, 2.8]], '#FC5C21', navy, 1);
      o += poly(P, [[1.2, 4.4, 3.4], [6.8, 4.4, 3.4], [6.8, 4.4, 4.6], [1.2, 4.4, 4.6]], navy, navy, 1);
      return o;
    },
    () => { // stacked parcels on flatbed
      let o = box(P, { x: 0, y: 0, z: 1.3, w: 8, d: 4.4, h: 0.4 }, dark);
      [[0.4, 0.4], [3.0, 0.4], [5.6, 0.4], [0.4, 2.3], [3.0, 2.3], [5.6, 2.3]].forEach(([a, b]) => (o += box(P, { x: a, y: b, z: 1.7, w: 2.1, d: 1.7, h: 1.7 }, white)));
      [[1.6, 1.3], [4.4, 1.3]].forEach(([a, b]) => (o += box(P, { x: a, y: b, z: 3.4, w: 2.1, d: 1.7, h: 1.6 }, orange)));
      return o;
    },
    () => { // tanker
      let o = box(P, { x: 0, y: 0.4, z: 1.3, w: 8, d: 3.6, h: 0.5 }, dark);
      o += box(P, { x: 0.3, y: 0.2, z: 1.8, w: 7.4, d: 4.0, h: 3.2 }, white);
      [2, 4, 6].forEach((u) => (o += line(P, [u, 4.2, 1.9], [u, 4.2, 4.9], navy, 1.4)));
      o += poly(P, [[0.3, 4.2, 3.0], [7.7, 4.2, 3.0], [7.7, 4.2, 3.5], [0.3, 4.2, 3.5]], '#FC5C21', navy, 1);
      return o;
    },
  ];
  out += load[variant % 4]();
  // cab
  out += box(P, { x: 8.4, y: 0.2, z: 1.0, w: 2.2, d: 4.0, h: 4.0 }, orange);
  out += box(P, { x: 10.6, y: 0.4, z: 1.0, w: 1.3, d: 3.6, h: 2.0 }, orange);
  out += poly(P, [[10.6, 0.6, 3.3], [10.6, 4.0, 3.3], [10.6, 4.0, 4.6], [10.6, 0.6, 4.6]], '#6FB6FF', navy, 1.2);
  out += poly(P, [[8.8, 4.2, 3.2], [10.2, 4.2, 3.2], [10.2, 4.2, 4.6], [8.8, 4.2, 4.6]], '#6FB6FF', navy, 1.2);
  // wheels (near side)
  [1.4, 3.2, 9.8].forEach((wx) => {
    out += wheel(P, wx, 3.8, 0.75, 0.8, navy, navy, 1);
    out += wheel(P, wx, 3.82, 0.75, 0.3, '#ffffff', navy, 0.8);
  });
  return wrap(size, out);
}

/** Tiny blueprint icon (station nav / station selector) — stage 1..5 at 40px */
export function stationIcon(stage, size = 40) {
  return assemblyStage(stage, { size });
}

/** CARGOVA logo mark (isometric container with route "C") */
export function logoMark(mode = 'blueprint') {
  const size = 48;
  const k = 3.1;
  const P = makeProjector(k, 21, 16);
  const color = mode === 'blueprint' ? '#ffffff' : '#FC5C21';
  const navy = '#073252';
  const fill = mode === 'blueprint' ? 'rgba(255,255,255,0.08)' : color;
  const stroke = mode === 'blueprint' ? '#ffffff' : navy;
  const st = { stroke, sw: 1.6, top: fill, left: mode === 'blueprint' ? fill : '#E04A14', right: mode === 'blueprint' ? fill : '#FF7A45' };
  let out = box(P, { x: 0, y: 0, z: 0, w: 7, d: 5, h: 5 }, st);
  for (let u = 0.9; u < 7; u += 0.9) out += line(P, [u, 5, 0.6], [u, 5, 4.4], stroke, 1);
  out += poly(P, [[1.6, 1.2, 5.02], [5, 1.2, 5.02], [5, 2, 5.02], [2.5, 2, 5.02], [2.5, 3, 5.02], [5, 3, 5.02], [5, 3.8, 5.02], [1.6, 3.8, 5.02]], mode === 'blueprint' ? '#ffffff' : navy, 'none', 0);
  // fit the viewBox tightly around the drawing so the mark is optically centred
  const corners = [];
  [0, 7].forEach((x) => [0, 5].forEach((y) => [0, 5].forEach((z) => corners.push(P(x, y, z)))));
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  const pad = 1.5;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const side = Math.max(w, h);
  const vx = minX - (side - w) / 2, vy = minY - (side - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}" width="100%" height="100%" aria-hidden="true">${out}</svg>`;
}
