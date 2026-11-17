/**
 * Hero — assembly-stage previews, station list hover swap, hex scramble.
 */
import { assemblyStage, stationIcon, logoMark, preloaderTruck } from './iso-svg.js';
import { scramble } from './text-effects.js';
import { setDashboardStage } from './hero-dashboard.js';
import { gsap } from 'gsap';
import { createHeroTruck } from '../three/hero-truck.js';

export function mountIllustrations() {
  document.querySelectorAll('.unit-big-preview:not([data-3d])').forEach((el) => {
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
 * Stage 5 is a real 3D truck: drag to spin it 360°. Part callouts fade while dragging.
 */
function initTruckDrag() {
  const canvas = document.getElementById('hero-truck-canvas');
  if (!canvas) return;
  {
    const truck = createHeroTruck(canvas);
    const callouts = document.querySelectorAll('.hud-callout');
    truck.onDrag((on) => gsap.to(callouts, { autoAlpha: on ? 0 : 1, duration: on ? 0.2 : 0.4, delay: on ? 0 : 0.4 }));
    const hero = document.getElementById('hero');
    // only render while the hero is on screen
    const sync = () => (getComputedStyle(hero).visibility === 'hidden' || Number(getComputedStyle(hero).opacity) === 0 ? truck.stop() : truck.start());
    sync();
    new MutationObserver(sync).observe(hero, { attributes: true, attributeFilter: ['style'] });
  }
}
