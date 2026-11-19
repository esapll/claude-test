// Graphiques SVG : jauge, radar, courbes. Palette validée sur fond sombre.
import { h } from './dom.js';

export const SERIES = ['#c4762c', '#3a87cc', '#5a9a36', '#9a66d6', '#a88e18', '#d0587a'];
const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const c of kids.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
};

/** Jauge demi-cercle sur 5. */
export function jauge(valeur, max = 5) {
  const r = 80, cx = 100, cy = 100;
  const a = Math.PI * (1 - Math.max(0, Math.min(1, (valeur || 0) / max)));
  const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
  return s('svg', { viewBox: '0 0 200 120', class: 'chart', role: 'img', 'aria-label': `Score global ${valeur} sur ${max}` },
    s('path', { d: `M20 100 A80 80 0 0 1 180 100`, fill: 'none', stroke: '#2a2019', 'stroke-width': 14, 'stroke-linecap': 'round' }),
    valeur ? s('path', { d: `M20 100 A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 14, 'stroke-linecap': 'round' }) : null,
    s('text', { x: 100, y: 92, 'text-anchor': 'middle', fill: 'var(--text)', 'font-family': 'Newsreader', 'font-size': 40 }, valeur != null ? String(valeur).replace('.', ',') : '–'),
    s('text', { x: 100, y: 114, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 12, 'font-family': 'Inter' }, `sur ${max}`));
}

/** Radar des zones (échelle 0–5), avec le test précédent en pointillés. */
export function radar(labels, valeurs, precedent = null) {
  const n = labels.length, cx = 170, cy = 140, R = 95;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + R * (v / 5) * Math.cos(a), cy + R * (v / 5) * Math.sin(a)];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, v || 0).map((x) => x.toFixed(1)).join(',')).join(' ');
  const g = s('svg', { viewBox: '-40 0 420 290', class: 'radar', role: 'img', 'aria-label': 'Radar des zones' });
  for (let k = 1; k <= 5; k++) g.append(s('polygon', { points: poly(Array(n).fill(k)), fill: 'none', stroke: '#2e231b', 'stroke-width': 1 }));
  labels.forEach((l, i) => {
    const [x, y] = pt(i, 5);
    g.append(s('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: '#2e231b' }));
    const [lx, ly] = pt(i, 6.1);
    g.append(s('text', { x: lx, y: ly + 4, 'text-anchor': Math.abs(lx - cx) < 10 ? 'middle' : lx > cx ? 'start' : 'end', fill: 'var(--muted)', 'font-size': 12, 'font-family': 'Inter' },
      `${l} ${valeurs[i] != null ? String(valeurs[i]).replace('.', ',') : '–'}`));
  });
  if (precedent) g.append(s('polygon', { points: poly(precedent), fill: 'none', stroke: 'var(--faint)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }));
  g.append(s('polygon', { points: poly(valeurs), fill: 'rgba(201,138,75,.22)', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  valeurs.forEach((v, i) => { if (v != null) { const [x, y] = pt(i, v); g.append(s('circle', { cx: x, cy: y, r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', 'stroke-width': 2 })); } });
  return g;
}

/**
 * Courbes d'évolution. series: [{ nom, valeurs: [number|null] }], x: libellés.
 */
export function courbes(x, series, { min = 0, max = 5, pas = 1, suffixe = '' } = {}) {
  const W = 340, H = 200, L = 34, Rm = 12, T = 12, B = 28;
  const iw = W - L - Rm, ih = H - T - B;
  const px = (i) => L + (x.length === 1 ? iw / 2 : (iw * i) / (x.length - 1));
  const py = (v) => T + ih * (1 - (v - min) / (max - min));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Évolution par zone' });
  for (let v = min; v <= max; v += pas) {
    svg.append(s('line', { class: 'grid', x1: L, x2: W - Rm, y1: py(v), y2: py(v) }));
    svg.append(s('text', { class: 'axis', x: L - 8, y: py(v) + 4, 'text-anchor': 'end' }, v + suffixe));
  }
  x.forEach((lab, i) => svg.append(s('text', { class: 'axis', x: px(i), y: H - 8, 'text-anchor': 'middle' }, lab)));
  const tip = h('div', { class: 'tip', hidden: true });
  series.forEach((se, k) => {
    const col = SERIES[k % SERIES.length];
    const pts = se.valeurs.map((v, i) => (v == null ? null : [px(i), py(v), v, i]));
    const d = pts.filter(Boolean).map((p, j) => `${j ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    svg.append(s('path', { d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    pts.filter(Boolean).forEach(([cx, cy, v, i]) => {
      const c = s('circle', { cx, cy, r: 4.5, fill: col, stroke: 'var(--surface)', 'stroke-width': 2 });
      const hit = s('circle', { cx, cy, r: 14, fill: 'transparent', tabindex: 0 });
      const show = (ev) => {
        tip.textContent = `${se.nom} · ${x[i]} : ${String(v).replace('.', ',')}${suffixe}`;
        tip.hidden = false;
        const r = (ev.target.getBoundingClientRect ? ev.target.getBoundingClientRect() : { left: 0, top: 0 });
        tip.style.left = Math.min(window.innerWidth - 180, r.left) + 'px';
        tip.style.top = (r.top - 36) + 'px';
      };
      hit.addEventListener('pointerenter', show); hit.addEventListener('focus', show); hit.addEventListener('click', show);
      hit.addEventListener('pointerleave', () => { tip.hidden = true; }); hit.addEventListener('blur', () => { tip.hidden = true; });
      svg.append(c, hit);
    });
  });
  const legende = h('div', { class: 'legend' }, series.map((se, k) => h('span', {}, h('i', { style: { background: SERIES[k % SERIES.length] } }), se.nom)));
  return h('div', { class: 'stack' }, svg, legende, tip);
}
