/**
 * CARGOVA — entry point (bundled by Webpack → dist/cargova.bundle.js)
 */
import '../css/base.css';
import '../css/preloader.css';
import '../css/nav.css';
import '../css/hero.css';
import '../css/stations.css';
import '../css/footer.css';
import '../css/responsive.css';

import { gsap } from 'gsap';
import { createPreloader } from './ui/preloader.js';
import { mountIllustrations, initHeroInteractions } from './ui/hero.js';
import { mountIcons } from './ui/icons.js';
import { initScrambleButtons } from './ui/text-effects.js';
import { initAccordions, initDraggables, initMarquee } from './ui/boxes.js';
import { createWorld } from './three/world.js';
import { createFooterScene } from './three/footer-scene.js';
import { createExperience } from './core/experience.js';

function heroIntro() {
  const items = '.specification-box > *, .station-nav-link, #hero-button, #hero-button-tablet';
  return gsap.timeline()
    .fromTo('.border-frame', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0)
    .fromTo('#logo-blueprint', { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.1)
    .fromTo('.hero-unit', { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: 'power3.out' }, 0.1)
    .fromTo(items, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, 0.25);
}

function initMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const toggle = menu?.querySelector('.mobile-menu-toggle');
  toggle?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

async function boot() {
  const preloader = createPreloader();
  mountIllustrations();
  mountIcons();
  preloader.set(20);

  if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  preloader.set(55);

  const world = createWorld(document.getElementById('world-canvas'));
  world.renderOnce(); // compile shaders while the preloader is up
  preloader.set(85);

  const footer = createFooterScene(document.getElementById('footer-canvas'), document.getElementById('canvas-container'));
  preloader.set(95);

  initScrambleButtons();
  initAccordions();
  initDraggables();
  initMarquee();
  initMobileMenu();

  const experience = createExperience({ world, footer });
  initHeroInteractions({ onStart: (i) => experience.start(i) });

  await preloader.done();
  document.body.classList.remove('is-loading');
  heroIntro();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
