/**
 * Hero — assembly-stage previews, station list hover swap, hex scramble.
 */
import { assemblyStage, stationIcon, logoMark, preloaderTruck } from './iso-svg.js';
import { scramble } from './text-effects.js';

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
  const show = (stage) => previews.forEach((p) => p.classList.toggle('is-active', Number(p.dataset.stage) === stage));

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

  const hexBox = document.getElementById('hex-code');
  const hex = hexBox?.querySelector('.hex');
  hexBox?.addEventListener('mouseenter', () => scramble(hex, hex.dataset.hex, { duration: 0.7, chars: '0123456789ABCDEF' }));
}
