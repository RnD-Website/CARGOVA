/**
 * Station box behaviours: accordions, GSAP Draggable boxes, partner marquee.
 */
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

/* ---------- Accordions (one open per box, height tween) ---------- */
export function initAccordions() {
  document.querySelectorAll('.draggable-box').forEach((boxEl) => {
    const items = [...boxEl.querySelectorAll('.accordeon-wrapper:not(.is-no-accordion), .split-text-box')];
    if (!items.length) return;
    const contentOf = (it) => it.querySelector('.accordion-content');
    items.forEach((it) => {
      const c = contentOf(it);
      gsap.set(c, { height: it.classList.contains('is-open') ? 'auto' : 0, opacity: it.classList.contains('is-open') ? 1 : 0 });
      const header = it.querySelector('.accordion-header');
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = it.classList.contains('is-open');
        items.forEach((o) => {
          if (o !== it && o.classList.contains('is-open')) {
            o.classList.remove('is-open');
            gsap.to(contentOf(o), { height: 0, opacity: 0, duration: 0.4, ease: 'power3.inOut' });
          }
        });
        it.classList.toggle('is-open', !open);
        gsap.to(c, { height: open ? 0 : 'auto', opacity: open ? 0 : 1, duration: 0.4, ease: 'power3.inOut' });
      });
    });
  });
}

/* ---------- Draggable boxes (desktop) ---------- */
let draggables = [];
export function initDraggables() {
  draggables.forEach((d) => d.kill());
  draggables = [];
  if (window.innerWidth < 992) {
    gsap.set('.draggable-box', { x: 0, y: 0 });
    return;
  }
  document.querySelectorAll('.draggable-box').forEach((el) => {
    const [d] = Draggable.create(el, {
      type: 'x,y',
      bounds: window,
      inertia: false,
      dragClickables: false,
      zIndexBoost: true,
      onPress() { el.classList.add('is-dragging'); },
      onRelease() { el.classList.remove('is-dragging'); },
    });
    draggables.push(d);
  });
}

/* ---------- Partner marquee (seamless loop, hover slow-down) ---------- */
export function initMarquee() {
  const content = document.querySelector('.marquee-content');
  if (!content || content.dataset.ready) return;
  content.dataset.ready = '1';
  content.innerHTML += content.innerHTML; // duplicate for seamless loop
  const tween = gsap.to(content, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  content.addEventListener('mouseenter', () => gsap.to(tween, { timeScale: 0.2, duration: 0.4 }));
  content.addEventListener('mouseleave', () => gsap.to(tween, { timeScale: 1, duration: 0.4 }));
}
