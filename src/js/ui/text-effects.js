/**
 * Text effects — scramble (buttons / hex code) and typewriter (station labels + headings)
 * Both reproduce the reference's mono-type character animations.
 */
const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ABCDEF';

export function scramble(el, finalText, { duration = 0.6, chars = GLYPHS } = {}) {
  if (!el) return;
  const text = finalText ?? el.dataset.text ?? el.textContent;
  el.dataset.text = text;
  cancelAnimationFrame(el._scrambleRaf);
  const start = performance.now();
  const len = text.length;
  const tick = (now) => {
    const p = Math.min(1, (now - start) / (duration * 1000));
    let out = '';
    for (let i = 0; i < len; i++) {
      const reveal = i / len < p;
      out += reveal || text[i] === ' ' ? text[i] : chars[(Math.random() * chars.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._scrambleRaf = requestAnimationFrame(tick);
    else el.textContent = text;
  };
  el._scrambleRaf = requestAnimationFrame(tick);
}

/** Hover-scramble every `.scramble` button (span.scramble-text inside) */
export function initScrambleButtons(root = document) {
  root.querySelectorAll('.scramble').forEach((btn) => {
    const target = btn.querySelector('.scramble-text');
    if (!target) return;
    const text = target.textContent;
    btn.addEventListener('mouseenter', () => scramble(target, text, { duration: 0.5 }));
  });
}

/** Typewriter — returns a promise; preserves original text in data-text */
export function typewrite(el, { speed = 0.028, delay = 0 } = {}) {
  if (!el) return Promise.resolve();
  if (!el.dataset.text) el.dataset.text = el.textContent;
  const text = el.dataset.text;
  el.textContent = '';
  clearTimeout(el._typeT);
  return new Promise((resolve) => {
    let i = 0;
    const step = () => {
      i++;
      el.textContent = text.slice(0, i);
      if (i < text.length) el._typeT = setTimeout(step, speed * 1000);
      else resolve();
    };
    el._typeT = setTimeout(step, delay * 1000);
  });
}

export function resetTyped(el) {
  if (el?.dataset.text) { clearTimeout(el._typeT); el.textContent = el.dataset.text; }
}
