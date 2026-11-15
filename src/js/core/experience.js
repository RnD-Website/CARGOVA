/**
 * CARGOVA — Experience controller
 * --------------------------------------------------------------------------
 * State machine reproducing the reference flow:
 *   preloader → HERO (blueprint, station list) → "start dispatch"
 *   → STATIONS 1-5 (wheel / swipe / keys snap camera station-to-station along the conveyor,
 *     text boxes leave → camera travels → new boxes type/slide in)
 *   → FOOTER (mask wipe up, 3D unit) → "back to the dock" returns to hero.
 * Input is captured with GSAP Observer (no native scroll), transitions are locked while running.
 */
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import { CONFIG, STATIONS } from '../data/config.js';
import { typewrite, resetTyped, scramble } from '../ui/text-effects.js';
import { setActiveStationIcon } from '../ui/hero.js';
import { initDraggables } from '../ui/boxes.js';

gsap.registerPlugin(Observer);

export function createExperience({ world, footer }) {
  const st = { mode: 'hero', index: 0, busy: false };
  const stationEls = [...document.querySelectorAll('.station')];
  const selector = document.getElementById('station-selection');
  const worldEl = document.getElementById('world-container');
  const tiles = document.querySelector('.background-tiles');

  /* ---------- per-station element groups ---------- */
  const boxesOf = (i) => [...stationEls[i].querySelectorAll('.station-boxes > :not(.white-text-box)')];
  const textOf = (i) => [...stationEls[i].querySelectorAll('[data-type]')];
  const textBoxOf = (i) => stationEls[i].querySelector('.white-text-box');

  stationEls.forEach((_, i) => gsap.set([textBoxOf(i), ...boxesOf(i)], { autoAlpha: 0 }));

  function updateSelector(i) {
    const s = STATIONS[i];
    document.getElementById('active-station-label').textContent = s.label;
    scramble(document.getElementById('active-station-title'), s.title, { duration: 0.6 });
    setActiveStationIcon(i + 1);
    selector.querySelectorAll('.dropdown').forEach((a) => a.classList.toggle('is-current', Number(a.dataset.station) === i + 1));
  }

  function showStation(i) {
    const el = stationEls[i];
    el.classList.add('is-active');
    const texts = textOf(i);
    texts.forEach((t) => { if (!t.dataset.text) t.dataset.text = t.textContent; t.textContent = ''; });
    gsap.set(textBoxOf(i), { autoAlpha: 1 });
    texts.forEach((t, k) => typewrite(t, { speed: t.classList.contains('label') ? 0.03 : 0.035, delay: k * 0.18 }));
    const boxes = boxesOf(i);
    const tl = gsap.timeline();
    tl.fromTo(boxes, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: CONFIG.TEXT_IN_STAGGER }, 0.15);
    const community = el.querySelectorAll('.community-buttons .button');
    if (community.length) tl.fromTo(community, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.1 }, 0.45);
    updateSelector(i);
    return tl;
  }

  function hideStation(i) {
    const el = stationEls[i];
    const boxes = boxesOf(i);
    const tl = gsap.timeline({
      onComplete: () => {
        el.classList.remove('is-active');
        gsap.set(boxes, { x: 0, y: 0 });
        textOf(i).forEach(resetTyped);
      },
    });
    tl.to(boxes, { autoAlpha: 0, y: -30, duration: CONFIG.TEXT_OUT_DURATION, ease: 'power2.in', stagger: 0.04 }, 0)
      .to(textBoxOf(i), { autoAlpha: 0, y: -20, duration: CONFIG.TEXT_OUT_DURATION, ease: 'power2.in' }, 0)
      .set(textBoxOf(i), { y: 0 });
    return tl;
  }

  function tweenCamera(to, duration = CONFIG.STATION_DURATION, ease = CONFIG.STATION_EASE) {
    return gsap.to(world.target, { x: to.x, y: to.y, z: to.z, duration, ease });
  }

  /* ---------- HERO → STATIONS ---------- */
  function start(index = 0) {
    if (st.busy || st.mode !== 'hero') return;
    st.busy = true;
    st.index = index;
    world.target.copy(world.introFrom(index));
    world.start();
    const tl = gsap.timeline({ onComplete: () => { st.mode = 'stations'; st.busy = false; } });
    tl.to('.hero-unit', { autoAlpha: 0, scale: 0.92, duration: 0.6, ease: 'power3.in' }, 0)
      .to('.specification-box', { autoAlpha: 0, y: 40, duration: 0.6, ease: 'power3.in' }, 0.05)
      .to('.hero-sidebar, #hero-button-tablet', { autoAlpha: 0, x: 40, duration: 0.6, ease: 'power3.in' }, 0.1)
      .to('#hero', { autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0.55)
      .to('#logo-blueprint', { autoAlpha: 0, duration: 0.4 }, 0.55)
      .to('#logo', { autoAlpha: 1, duration: 0.4 }, 0.55)
      .fromTo('.navigation:not(.is-mobile), #nav-button, #mobile-menu', { y: -10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', stagger: 0.08 }, 0.7)
      .to(worldEl, { autoAlpha: 1, duration: 0.6 }, 0.45)
      .to(tiles, { opacity: 0.5, duration: 0.6 }, 0.45)
      .add(tweenCamera(world.focus(index), 1.6, 'power3.out'), 0.45)
      .add(() => { showStation(index); selector.classList.add('is-visible'); }, 1.5)
      .to(selector, { autoAlpha: 1, duration: 0.5 }, 1.5);
  }

  /* ---------- STATIONS → HERO ---------- */
  function backToHero() {
    if (st.busy) return;
    st.busy = true;
    const from = st.mode === 'footer' ? null : st.index;
    const tl = gsap.timeline({
      onComplete: () => { st.mode = 'hero'; st.busy = false; world.stop(); },
    });
    if (st.mode === 'footer') tl.add(footerOut(), 0);
    if (from !== null) tl.add(hideStation(from), 0);
    tl.to(selector, { autoAlpha: 0, duration: 0.3 }, 0)
      .add(() => selector.classList.remove('is-visible', 'is-open'), 0.3)
      .to('.navigation:not(.is-mobile), #nav-button, #mobile-menu', { autoAlpha: 0, duration: 0.3 }, 0)
      .to('#logo', { autoAlpha: 0, duration: 0.3 }, 0.1)
      .to('#logo-blueprint', { autoAlpha: 1, duration: 0.3 }, 0.1)
      .add(tweenCamera(world.introFrom(st.index), 0.9, 'power3.in'), 0.1)
      .to(worldEl, { autoAlpha: 0, duration: 0.4 }, 0.6)
      .to(tiles, { opacity: 0, duration: 0.4 }, 0.6)
      .to('#hero', { autoAlpha: 1, duration: 0.4 }, 0.7)
      .to('.hero-unit', { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 0.8)
      .to('.specification-box', { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.85)
      .to('.hero-sidebar, #hero-button-tablet', { autoAlpha: 1, x: 0, duration: 0.7, ease: 'power3.out' }, 0.9);
    st.index = 0;
  }

  /* ---------- STATION → STATION ---------- */
  function goTo(i) {
    if (st.busy || st.mode !== 'stations' || i === st.index || i < 0 || i >= stationEls.length) return;
    st.busy = true;
    const prev = st.index;
    st.index = i;
    selector.classList.remove('is-open');
    const dist = Math.abs(i - prev);
    const dur = CONFIG.STATION_DURATION + (dist - 1) * 0.45;
    gsap.timeline({ onComplete: () => { st.busy = false; } })
      .add(hideStation(prev), 0)
      .add(tweenCamera(world.focus(i), dur), 0.15)
      .add(() => showStation(i), 0.15 + dur * 0.72);
  }

  /* ---------- FOOTER ---------- */
  const footerEl = document.getElementById('footer');
  const maskEl = document.getElementById('footer-mask');
  gsap.set([footerEl, maskEl], { yPercent: 100 });
  function footerIn() {
    footer.setInView(true);
    return gsap.timeline()
      .set([footerEl, maskEl], { visibility: 'visible' })
      .fromTo(maskEl, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'power3.inOut' }, 0)
      .fromTo(footerEl, { yPercent: 100 }, { yPercent: 0, duration: 0.9, ease: 'power3.inOut' }, 0.15)
      .from('.footer-top-part > *, .footer-bottom > *', { y: 30, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, 0.7);
  }
  function footerOut() {
    return gsap.timeline({ onComplete: () => { footer.setInView(false); gsap.set([footerEl, maskEl], { visibility: 'hidden' }); } })
      .to(footerEl, { yPercent: 100, duration: 0.8, ease: 'power3.inOut' }, 0)
      .to(maskEl, { yPercent: 100, duration: 0.7, ease: 'power3.inOut' }, 0.15);
  }
  function toFooter() {
    if (st.busy || st.mode !== 'stations') return;
    st.busy = true;
    gsap.timeline({ onComplete: () => { st.mode = 'footer'; st.busy = false; world.stop(); } })
      .add(hideStation(st.index), 0)
      .to(selector, { autoAlpha: 0, duration: 0.3 }, 0)
      .add(footerIn(), 0.2);
  }
  function fromFooter() {
    if (st.busy || st.mode !== 'footer') return;
    st.busy = true;
    world.start();
    gsap.timeline({ onComplete: () => { st.mode = 'stations'; st.busy = false; } })
      .add(footerOut(), 0)
      .to(selector, { autoAlpha: 1, duration: 0.4 }, 0.6)
      .add(() => showStation(st.index), 0.6);
  }

  /* ---------- input ---------- */
  const next = () => {
    if (st.mode === 'hero') return start(0);
    if (st.mode === 'stations') return st.index < stationEls.length - 1 ? goTo(st.index + 1) : toFooter();
  };
  const prev = () => {
    if (st.mode === 'footer') return fromFooter();
    if (st.mode === 'stations') return st.index > 0 ? goTo(st.index - 1) : backToHero();
  };

  Observer.create({
    target: window,
    type: 'wheel,touch',
    wheelSpeed: -1,
    tolerance: 12,
    preventDefault: true,
    onUp: next,     // wheel down / swipe up
    onDown: prev,   // wheel up / swipe down
    ignore: '.marquee-track',
  });

  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next(); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
  });

  /* ---------- station selector ---------- */
  document.getElementById('active-station-button').addEventListener('click', () => selector.classList.toggle('is-open'));
  selector.querySelectorAll('.dropdown').forEach((a) =>
    a.addEventListener('click', (e) => { e.preventDefault(); goTo(Number(a.dataset.station) - 1); })
  );
  document.addEventListener('click', (e) => { if (!selector.contains(e.target)) selector.classList.remove('is-open'); });

  /* ---------- logo / back-to-top ---------- */
  document.querySelectorAll('[data-goto="hero"], [data-goto="top"]').forEach((a) =>
    a.addEventListener('click', (e) => { e.preventDefault(); if (st.mode !== 'hero') backToHero(); })
  );

  /* ---------- resize ---------- */
  window.addEventListener('resize', () => {
    if (st.mode === 'stations' && !st.busy) world.target.copy(world.focus(st.index));
    initDraggables();
  });

  return { start, goTo, state: st };
}
