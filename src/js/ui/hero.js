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

/** Hero menu: icon toggles a navigation panel (GSAP reveal, Esc / outside click closes). */
export function initHeroMenu() {
  const menu = document.getElementById('hero-menu');
  const toggle = document.getElementById('hero-menu-toggle');
  const panel = document.getElementById('hero-menu-panel');
  if (!menu || !toggle || !panel) return;
  const items = panel.querySelectorAll('.hero-menu-head, .hero-menu-link, .hero-menu-cta');
  let tl;
  const open = () => {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation');
    tl?.kill();
    tl = gsap.timeline()
      .set(panel, { visibility: 'visible' })
      .fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.45, ease: 'power3.out' })
      .fromTo(items, { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power3.out', stagger: 0.05 }, 0.1);
  };
  const close = () => {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    tl?.kill();
    tl = gsap.timeline()
      .to(panel, { clipPath: 'inset(0 0 100% 0)', duration: 0.3, ease: 'power2.in' })
      .set(panel, { visibility: 'hidden' });
  };
  toggle.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.contains('is-open') ? close() : open(); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); toggle.focus(); } });
  panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => close()));
}
