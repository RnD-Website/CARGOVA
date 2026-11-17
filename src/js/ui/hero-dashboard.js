/**
 * Hero dashboard HUD — live clock, ticking KPIs, sparkline, shipment log,
 * animated route map, and stage readouts synced to the station hover.
 * All figures are illustrative demo data for the marketing site.
 */
import { gsap } from 'gsap';

const STAGES = [
  { label: 'Stage 1/5 · Order received', c1: 'Manifest · Created', c2: 'Frame · 40 ft HC' },
  { label: 'Stage 2/5 · Warehousing', c1: 'Slot · Aisle B-14', c2: 'Floor · Loaded 38%' },
  { label: 'Stage 3/5 · Consolidated', c1: 'Seal · CGV-88213', c2: 'Doors · Locked' },
  { label: 'Stage 4/5 · Customs cleared', c1: 'Telemetry · Tagged', c2: 'Docs · E-filed' },
  { label: 'Stage 5/5 · Ready to dispatch', c1: 'Telemetry · Live GPS', c2: 'Cab · EV drive 92%' },
];

const CITIES = ['Rotterdam', 'Singapore', 'Shanghai', 'Dubai', 'Hamburg', 'Los Angeles', 'Chittagong', 'Mumbai', 'Santos', 'Busan', 'Antwerp', 'Felixstowe', 'Jebel Ali', 'Tokyo', 'Lagos'];
const STATUS = [['In transit', ''], ['Departed', 'go'], ['Delivered', 'ok'], ['At customs', ''], ['Loading', 'go'], ['On time', 'ok']];
const MODES = ['Sea', 'Air', 'Road', 'Rail'];

const pick = (a) => a[(Math.random() * a.length) | 0];
const fmt = (n) => n.toLocaleString('en-US');

function logItem() {
  let a = pick(CITIES), b = pick(CITIES);
  while (b === a) b = pick(CITIES);
  const [st, cls] = pick(STATUS);
  const li = document.createElement('li');
  li.innerHTML = `<span class="id">CGV-${(20000 + Math.random() * 79999) | 0}</span><span class="st ${cls}">${st}</span><span class="rt">${pick(MODES)} · ${a} → ${b}</span>`;
  return li;
}

function initLog() {
  const list = document.getElementById('hud-log-list');
  if (!list) return;
  for (let i = 0; i < 6; i++) list.appendChild(logItem());
  setInterval(() => {
    if (document.hidden || !list.offsetParent) return;
    const li = logItem();
    list.prepend(li);
    gsap.from(li, { height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0, duration: 0.5, ease: 'power3.out' });
    while (list.children.length > 8) list.lastElementChild.remove();
  }, 2600);
}

function initClock() {
  const el = document.getElementById('hud-clock');
  if (!el) return;
  const tick = () => { el.textContent = new Date().toISOString().slice(11, 19) + ' UTC'; };
  tick();
  setInterval(tick, 1000);
}

function initKpis() {
  const transit = document.getElementById('kpi-transit');
  const spark = document.querySelector('[data-spark="transit"]');
  const bars = [];
  if (spark) {
    for (let i = 0; i < 18; i++) {
      const b = document.createElement('i');
      b.style.height = `${30 + Math.random() * 60}%`;
      spark.appendChild(b);
      bars.push(b);
    }
  }
  let value = Number(transit?.dataset.value || 12486);
  setInterval(() => {
    if (document.hidden) return;
    const next = value + ((Math.random() * 9) | 0) - 2;
    const o = { v: value };
    gsap.to(o, { v: next, duration: 0.8, ease: 'power2.out', onUpdate: () => (transit.textContent = fmt(Math.round(o.v))) });
    value = next;
    // shift sparkline
    for (let i = 0; i < bars.length - 1; i++) bars[i].style.height = bars[i + 1].style.height;
    if (bars.length) bars[bars.length - 1].style.height = `${40 + Math.random() * 60}%`;
  }, 1800);
}

function initMap() {
  const svg = document.querySelector('.hud-map-svg');
  if (!svg) return;
  // dotted world silhouette (coarse lat/long mask)
  const rows = [
    '.......#####..###.........................................',
    '...##########################.......###..#############....',
    '..#############################...########################',
    '....#######################......#########################',
    '......#################.........#######################...',
    '.......############.............##########..##########....',
    '........#########...............#######......#######......',
    '..........######................######........###...#.....',
    '...........#####................######.........#..###.....',
    '............#######.............#####...............##....',
    '.............#######.............###...............####...',
    '..............######.............##...............######..',
    '...............####...............................######..',
    '................###...................................#...',
    '................##........................................',
  ];
  let dots = '';
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (c === '#') dots += `<circle class="dot" cx="${4 + x * 5.1}" cy="${6 + y * 8.2}" r="1.5"/>`;
  }));
  const hubs = [[60, 30], [175, 22], [205, 50], [232, 42], [262, 96], [92, 98], [222, 70], [283, 38]];
  const lanes = [[0, 1], [1, 3], [3, 4], [1, 2], [2, 6], [0, 5], [6, 4], [3, 7], [0, 7]];
  let paths = '';
  lanes.forEach(([a, b]) => {
    const [x1, y1] = hubs[a], [x2, y2] = hubs[b];
    const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 18;
    paths += `<path class="lane" d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}"/>`;
  });
  const hubDots = hubs.map(([x, y]) => `<circle class="hub" cx="${x}" cy="${y}" r="3.2"/>`).join('');
  svg.innerHTML = dots + paths + hubDots;
}

export function setDashboardStage(stage) {
  const s = STAGES[stage - 1];
  if (!s) return;
  const label = document.getElementById('hud-stage-label');
  if (label) label.textContent = s.label;
  document.getElementById('hud-callout-1').textContent = s.c1;
  document.getElementById('hud-callout-2').textContent = s.c2;
  document.querySelectorAll('.hud-stage-bar i').forEach((i, k) => {
    i.classList.toggle('on', k < stage);
    i.classList.toggle('current', k === stage - 1);
  });
}

function syncScanHeight() {
  const vp = document.querySelector('.hud-viewport');
  if (vp) vp.style.setProperty('--scan-h', `${vp.offsetHeight}px`);
}

export function initHeroDashboard() {
  initClock();
  initKpis();
  initLog();
  initMap();
  setDashboardStage(5);
  syncScanHeight();
  window.addEventListener('resize', syncScanHeight);
}
