/**
 * Preloader — four bobbing units, "loading NN%" counter, bottom progress bar.
 * Progress blends real milestones (fonts, world init) with a smoothed counter,
 * then hands over to the hero intro.
 */
import { gsap } from 'gsap';

export function createPreloader() {
  const root = document.getElementById('preloader');
  const num = document.getElementById('preloader-progress');
  const bar = root.querySelector('.preloader-bar');
  const units = root.querySelectorAll('.preloader-unit');

  const bob = gsap.to(units, { y: -14, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: 0.15 } });
  const shown = { v: 0 };
  let targetV = 0;

  const ticker = () => {
    shown.v += (targetV - shown.v) * 0.08;
    if (targetV - shown.v < 0.4) shown.v = targetV;
    num.textContent = Math.round(shown.v);
    gsap.set(bar, { scaleX: shown.v / 100 });
  };
  gsap.ticker.add(ticker);

  return {
    set(p) { targetV = Math.max(targetV, Math.min(100, p)); },
    done() {
      targetV = 100;
      return new Promise((resolve) => {
        const wait = () => {
          if (shown.v >= 99.5) {
            gsap.ticker.remove(ticker);
            num.textContent = '100';
            const tl = gsap.timeline({ onComplete: () => { bob.kill(); root.remove(); resolve(); } });
            tl.to(units, { y: -40, autoAlpha: 0, duration: 0.5, ease: 'power3.in', stagger: 0.08 })
              .to(['#preloader-text', '#preloader-border'], { autoAlpha: 0, duration: 0.3 }, '-=0.2')
              .to(root, { autoAlpha: 0, duration: 0.4, ease: 'power2.out' });
          } else requestAnimationFrame(wait);
        };
        wait();
      });
    },
  };
}
