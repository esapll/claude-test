import { fill, h, icon, fmt, confirmer, toast } from './dom.js';
import { state } from '../store.js';
import { courant } from './session.js';
import { deroule, libelleCote, resumeSeance } from '../engine/timeline.js';
import { bip, doubleBip, audioPret, garderEcranAllume, libererEcran } from './device.js';
import { ouvrirFormulaireEntree } from './journal.js';
import { OBJECTIFS } from '../engine/stats.js';

const C = 2 * Math.PI * 46;
let T = null; // état du minuteur, conservé entre deux rendus

function nouveauMinuteur(session) {
  const etapes = deroule(session);
  return { session, etapes, i: 0, restant: etapes[0].sec, running: false, endAt: 0, fini: false, demarre: false };
}

export function render(root, query) {
  const session = state.derniereSeance || courant.session;
  if (!session) {
    root.append(h('div', { class: 'screen' }, h('h1', {}, 'Minuteur'),
      h('p', { class: 'muted' }, 'Aucune séance prête.'), h('a', { class: 'btn primary', href: '#/generer' }, 'Générer une séance')));
    return;
  }
  if (!T || T.session.id !== session.id) T = nouveauMinuteur(session);

  // ---------- Éléments ----------
  const elTop = h('span', {});
  const elNum = h('span', {});
  const elName = h('div', { class: 'ex-name', 'aria-live': 'polite' });
  const elMeta = h('div', { class: 'meta' });
  const prog = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  const ring = h('div', { class: 'ring' });
  ring.innerHTML = `<svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="46" fill="none" stroke-width="3"/></svg>`;
  Object.entries({ class: 'prog', cx: 50, cy: 50, r: 46, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': C }).forEach(([k, v]) => prog.setAttribute(k, v));
  ring.firstChild.append(prog);
  const elCount = h('b', {});
  const elSub = h('span', {});
  ring.append(h('div', { class: 'count' }, elCount, elSub));
  const elConsigne = h('p', { class: 'consigne' });
  const btnPlay = h('button', { class: 'play', 'aria-label': 'Démarrer', onclick: () => (T.running ? pause() : play()) });
  const liste = h('ol', {});
  const deroul = h('details', { class: 'deroule' }, h('summary', {}, h('span', {}, 'Déroulé de la séance'), icon('chevron', 'width="18" height="18"')), liste);
  const ecran = h('div', { class: 'timer' });
  root.append(ecran);

  T.etapes.forEach((e, idx) => {
    liste.append(e.kind === 'transition'
      ? h('li', { class: 'tr', 'data-i': idx }, h('span', {}, e.titre), h('span', {}, '10 s'))
      : h('li', { 'data-i': idx }, h('span', {}, `${e.numero}. ${e.label}${e.side ? ' · ' + e.side : ''}`), h('span', {}, fmt(e.sec))));
  });

  function vueTimer() {
    fill(ecran, 
      h('div', { class: 'top' },
        h('button', { class: 'icon-btn ghost', 'aria-label': 'Quitter', onclick: quitter }, icon('close')),
        elTop, elNum),
      h('div', { class: 'center' }, elName, elMeta, ring, elConsigne),
      h('div', { class: 'controls' },
        h('button', { class: 'icon-btn', 'aria-label': 'Précédent', onclick: precedent }, icon('prev')),
        btnPlay,
        h('button', { class: 'icon-btn', 'aria-label': 'Suivant', onclick: suivant }, icon('next'))),
      deroul,
    );
  }

  function vueFin() {
    const s = T.session;
    fill(ecran, h('div', { class: 'center fin', style: { flex: 1, display: 'flex', justifyContent: 'center' } },
      h('p', { class: 'label' }, 'Séance terminée'),
      h('h1', {}, `${s.duree} min de ${OBJECTIFS[s.params.objectif].court.toLowerCase()}`),
      h('p', { class: 'muted' }, `${s.blocks.length} exercices. Bien joué.`),
      h('button', { class: 'btn primary block', style: { maxWidth: '360px' }, onclick: inscrire }, icon('check'), 'Inscrire la séance'),
      h('button', { class: 'btn ghost', onclick: () => { T = null; location.hash = '#/accueil'; } }, 'Fermer sans inscrire'),
    ));
  }

  function inscrire() {
    const s = T.session;
    const r = resumeSeance(s);
    ouvrirFormulaireEntree({
      date: new Date().toLocaleDateString('sv-SE'), objectif: s.params.objectif, duree: s.duree, contenu: r.contenu, exercices: r.exercices, ressenti: '',
    }, () => { T = null; toast('Séance inscrite au journal'); location.hash = '#/accueil'; });
  }

  function maj() {
    if (T.fini) return;
    const e = T.etapes[T.i];
    const tr = e.kind === 'transition';
    const ex = tr ? e.prochain : e;
    const reste = T.restant + T.etapes.slice(T.i + 1).reduce((t, x) => t + x.sec, 0);
    elTop.textContent = `reste ${fmt(Math.ceil(reste))}`;
    elNum.textContent = `exercice ${ex.numero} / ${ex.total}`;
    elName.textContent = tr ? e.titre : ex.label;
    fill(elMeta, ...[
      tr ? h('span', { class: 'next' }, 'Ensuite : ' + ex.label) : null,
      ex.side ? h('span', { class: 'side' }, libelleCote(ex.side)) : null,
    ].filter(Boolean));
    ring.classList.toggle('transition', tr);
    const frac = e.sec ? Math.max(0, Math.min(1, T.restant / e.sec)) : 0;
    prog.setAttribute('stroke-dashoffset', String(C * (1 - frac)));
    elCount.textContent = T.restant >= 60 ? fmt(Math.ceil(T.restant)) : String(Math.ceil(T.restant));
    elSub.textContent = tr ? 'transition' : ex.chain ? 'enchaîné' : T.running ? '' : 'en pause';
    elConsigne.textContent = ex.consigne || '';
    fill(btnPlay, icon(T.running ? 'pause' : 'play'));
    btnPlay.setAttribute('aria-label', T.running ? 'Pause' : 'Démarrer');
    liste.querySelectorAll('li').forEach((li) => {
      const k = +li.dataset.i;
      li.classList.toggle('cur', k === T.i);
      li.classList.toggle('done', k < T.i);
    });
    const cur = liste.querySelector('li.cur');
    if (cur && deroul.open) liste.scrollTop = cur.offsetTop - liste.clientHeight / 2;
  }

  function aller(i) {
    T.i = Math.max(0, Math.min(T.etapes.length - 1, i));
    T.restant = T.etapes[T.i].sec;
    if (T.running) T.endAt = performance.now() + T.restant * 1000;
    maj();
  }
  function play() {
    audioPret();
    garderEcranAllume();
    T.running = true; T.demarre = true;
    T.endAt = performance.now() + T.restant * 1000;
    maj();
  }
  function pause() {
    T.running = false;
    T.restant = Math.max(0, (T.endAt - performance.now()) / 1000);
    maj();
  }
  function suivant() { if (T.i < T.etapes.length - 1) aller(T.i + 1); else terminer(); }
  function precedent() {
    const e = T.etapes[T.i];
    if (e.sec - T.restant > 3) return aller(T.i); // recommence l'étape
    let j = T.i - 1;
    while (j > 0 && T.etapes[j].kind === 'transition') j--;
    // revient sur la transition qui précède l'exercice, s'il y en a une
    if (j > 0 && T.etapes[j - 1].kind === 'transition') j--;
    aller(j);
  }
  function terminer() {
    T.running = false; T.fini = true;
    if (state.reglages.bips !== false) doubleBip(state.reglages.volume);
    libererEcran();
    vueFin();
  }
  async function quitter() {
    if (T.demarre && !T.fini && !(await confirmer('Quitter la séance en cours ?', { ok: 'Quitter' }))) return;
    libererEcran();
    T = null;
    location.hash = '#/generer';
  }

  function tick() {
    if (!T || !T.running || T.fini) return;
    let now = performance.now();
    T.restant = (T.endAt - now) / 1000;
    while (T.restant <= 0) {
      const e = T.etapes[T.i];
      if (e.kind === 'exercice' && T.i < T.etapes.length - 1 && state.reglages.bips !== false) bip(state.reglages.volume);
      if (T.i >= T.etapes.length - 1) return terminer();
      const over = -T.restant;
      T.i++;
      T.endAt = now + (T.etapes[T.i].sec - over) * 1000;
      T.restant = T.etapes[T.i].sec - over;
    }
    maj();
  }

  if (T.fini) vueFin(); else { vueTimer(); maj(); }
  if (query.auto && !T.demarre) play();
  const iv = setInterval(tick, 200);
  const vis = () => { if (document.visibilityState === 'visible') tick(); };
  document.addEventListener('visibilitychange', vis);
  return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
}
