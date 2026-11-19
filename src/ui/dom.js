// Petits utilitaires d'interface.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  book: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  grid: 'M4 5h16M4 12h16M4 19h10',
  play: 'M7 4.5v15l13-7.5z',
  pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  prev: 'M18 5v14l-9-7zM6 5v14',
  next: 'M6 5v14l9-7zM18 5v14',
  close: 'M6 6l12 12M18 6L6 18',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  plus: 'M12 5v14M5 12h14',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  chevron: 'M6 9l6 6 6-6',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'M5 12l5 5L20 7',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
};
export function icon(name, extra = '') {
  const span = document.createElement('span');
  span.style.display = 'contents';
  const filled = name === 'play' || name === 'pause' || name === 'star';
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${filled ? 0 : 1.9}" stroke-linecap="round" stroke-linejoin="round" ${extra}><path d="${P[name]}"/></svg>`;
  return span.firstChild;
}

export function toast(msg, ms = 2600) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export function modal(build) {
  const bg = h('div', { class: 'modal-bg' });
  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  box.append(...[].concat(build(close)));
  bg.append(box);
  document.body.append(bg);
  return close;
}

export function confirmer(message, { ok = 'Confirmer', danger = false } = {}) {
  return new Promise((resolve) => {
    modal((close) => [
      h('p', { class: 'serif', style: { fontSize: '20px' } }, message),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn', onclick: () => { close(); resolve(false); } }, 'Annuler'),
        h('button', { class: 'btn primary' + (danger ? ' danger' : ''), onclick: () => { close(); resolve(true); } }, ok)),
    ]);
  });
}

export function chip(label, pressed, onclick, extra = {}) {
  return h('button', { class: 'chip' + (extra.sm ? ' sm' : ''), type: 'button', 'aria-pressed': pressed ? 'true' : 'false', onclick }, label);
}

export function bar(ratio, ok = false) {
  return h('div', { class: 'bar' + (ok ? ' ok' : ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(Math.min(1, ratio) * 100) },
    h('i', { style: { width: Math.min(100, Math.max(0, ratio * 100)) + '%' } }));
}

export function fmt(sec) {
  const m = Math.floor(sec / 60), s = Math.max(0, Math.round(sec % 60));
  return `${m}:${String(s).padStart(2, '0')}`;
}
export function fmtDuree(sec) {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `${m} min ${s}` : `${m} min`;
}

export function telecharger(nom, contenu, type = 'application/json') {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Remplace les enfants d'un élément (ignore null / false, aplatit les tableaux). */
export function fill(el, ...kids) {
  el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false).map((k) => (k instanceof Node ? k : document.createTextNode(String(k)))));
}
