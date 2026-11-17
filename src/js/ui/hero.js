/**
 * Hero — assembly-stage previews, station list hover swap, hex scramble.
 */
import { assemblyStage, stationIcon, logoMark, preloaderTruck } from './iso-svg.js';
import { scramble } from './text-effects.js';
import { setDashboardStage } from './hero-dashboard.js';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

export function mountIllustrations() {
  document.querySelectorAll('.unit-big-preview').forEach((el) => {
    el.innerHTML = assemblyStage(Number(el.dataset.stage));
  });
  document.querySelectorAll('.station-icon').forEach((el) => {
    el.innerHTML = stationIcon(Number(el.dataset.stage), 48);
  });
  document.querySelectorAll('.logo-mark').forEach((el) => {
    el.innerHTML = logoMark(el.dataset.logo === 'color' ? 'color' : 'blueprint');
  });
  document.querySelectorAll('.preloader-unit').forEach((el) => {
    el.innerHTML = preloaderTruck(Number(el.dataset.variant), 124);
  });
}

export function setActiveStationIcon(stage) {
  const el = document.querySelector('.active-icon');
  if (el) { el.dataset.stage = stage; el.innerHTML = stationIcon(stage, 48); }
}

export function initHeroInteractions({ onStart }) {
  const previews = [...document.querySelectorAll('.unit-big-preview')];
  const show = (stage) => {
    previews.forEach((p) => p.classList.toggle('is-active', Number(p.dataset.stage) === stage));
    setDashboardStage(stage);
  };

  const list = document.getElementById('station-nav-list');
  list?.querySelectorAll('.station-nav-link').forEach((link) => {
    const n = Number(link.dataset.station);
    link.addEventListener('mouseenter', () => show(n));
    link.addEventListener('focus', () => show(n));
    link.addEventListener('click', (e) => { e.preventDefault(); onStart(n - 1); });
  });
  list?.addEventListener('mouseleave', () => show(5));

  document.querySelectorAll('[data-start]').forEach((b) =>
    b.addEventListener('click', (e) => { e.preventDefault(); onStart(0); })
  );

  initTruckDrag();

  const hexBox = document.getElementById('hex-code');
  const hex = hexBox?.querySelector('.hex');
  hexBox?.addEventListener('mouseenter', () => scramble(hex, hex.dataset.hex, { duration: 0.7, chars: '0123456789ABCDEF' }));
}

/**
 * Drag the hero unit around its viewport. While dragging it tilts in the
 * direction of travel and the part callouts fade; on release it drives back
 * to the centre with a soft elastic settle.
 */
function initTruckDrag() {
  const unit = document.querySelector('.hud-viewport .hero-units-list');
  const viewport = document.querySelector('.hud-viewport');
  if (!unit || !viewport) return;
  const callouts = viewport.querySelectorAll('.hud-callout');
  let lastX = 0;
  Draggable.create(unit, {
    type: 'x,y',
    bounds: viewport,
    edgeResistance: 0.85,
    cursor: 'grab',
    activeCursor: 'grabbing',
    onPress() {
      lastX = this.x;
      gsap.to(callouts, { autoAlpha: 0, duration: 0.2 });
      gsap.to(unit, { scale: 1.04, duration: 0.25, ease: 'power2.out' });
    },
    onDrag() {
      const vx = this.x - lastX;
      lastX = this.x;
      gsap.to(unit, { rotation: gsap.utils.clamp(-8, 8, vx * 0.9), duration: 0.3, ease: 'power2.out' });
    },
    onRelease() {
      gsap.to(unit, { x: 0, y: 0, rotation: 0, scale: 1, duration: 1.1, ease: 'elastic.out(1, 0.55)' });
      gsap.to(callouts, { autoAlpha: 1, duration: 0.3, delay: 0.7 });
    },
  });
}
