import { h, icon, bar } from './dom.js';
import { state, dernierTest } from '../store.js';
import { tableauDeBord, OBJECTIFS } from '../engine/stats.js';
import { iso, lastSundayOfMonth, monthKey, labelDate, momentFromHour } from '../engine/dates.js';
import { preparer } from './session.js';

const DEFAUTS = [
  { objectif: 'relax', duree: 12, contraintes: { sansRouleau: true } },
  { objectif: 'mob', duree: 15, contraintes: {} },
  { objectif: 'relax', duree: 10, contraintes: {} },
  { objectif: 'post', duree: 10, contraintes: {} },
  { objectif: 'course', duree: 5, contraintes: {} },
  { objectif: 'velo', duree: 5, contraintes: {} },
];
const LIB_C = { sansRouleau: 'sans rouleau', sansMateriel: 'sans matériel', sansMur: 'sans mur', sansFlexion: 'sans flexion' };

function cle(p) { return `${p.objectif}|${p.duree}|${Object.keys(p.contraintes || {}).filter((k) => p.contraintes[k]).sort().join(',')}`; }

export function rappelTest(today = iso()) {
  const t = dernierTest();
  const dejaCeMois = t && monthKey(t.date) === monthKey(today);
  if (dejaCeMois) return null;
  const dim = lastSundayOfMonth(today);
  if (today >= dim) return `C'est le moment du test mensuel (${labelDate(dim, { jour: false })}).`;
  if (!t) return 'Fais ton premier test sur l\'échelle 1–5 pour fixer ta référence.';
  return null;
}

export function render(root) {
  const today = iso();
  const db = tableauDeBord(state.journal, today, state.reglages);
  const heure = new Date().getHours();
  const salut = heure < 5 || heure >= 18 ? 'Bonsoir' : 'Bonjour';
  const seen = new Set();
  const express = [...state.presets, ...DEFAUTS].filter((p) => !seen.has(cle(p)) && seen.add(cle(p))).slice(0, 6);
  const rappel = rappelTest(today);

  const lancerExpress = (p) => {
    preparer({ objectif: p.objectif, duree: p.duree, contraintes: { ...p.contraintes }, moment: momentFromHour() });
    location.hash = '#/generer';
  };

  root.append(h('div', { class: 'screen' },
    h('div', { class: 'hero' },
      h('div', {}, h('p', { class: 'muted' }, `${salut} Etienne`), h('h1', {}, 'Ton coach mobilité')),
      h('a', { class: 'icon-btn', href: '#/reglages', 'aria-label': 'Réglages' }, icon('gear'))),

    rappel ? h('a', { class: 'alert', href: '#/test', style: { textDecoration: 'none', display: 'block' } }, rappel + ' Environ 12 min →') : null,

    h('section', { class: 'grid2' },
      h('div', { class: 'card stack' },
        h('span', { class: 'label' }, 'Cette semaine'),
        h('div', { class: 'big-num' }, db.semaine, h('small', {}, `/ ${db.objectifSemaine} séances`)),
        bar(db.semaine / db.objectifSemaine, db.semaine >= db.objectifSemaine)),
      h('div', { class: 'card stack' },
        h('span', { class: 'label' }, 'Ce mois'),
        h('div', { class: 'big-num' }, db.minutesMois, h('small', {}, `/ ${db.objectifMois} min`)),
        bar(db.minutesMois / db.objectifMois, db.minutesMois >= db.objectifMois))),
    h('div', { class: 'card between' },
      h('div', { class: 'stack', style: { gap: '2px' } },
        h('span', { class: 'small muted' }, db.resteMinutes ? 'Reste à faire par semaine' : 'Objectif du mois'),
        h('strong', { class: 'serif', style: { fontSize: '22px' } }, db.resteMinutes ? `${db.resteParSemaine} min` : 'atteint ✓'),
        db.resteMinutes ? h('span', { class: 'tiny faint' }, `${db.resteMinutes} min sur ${db.semainesRestantes} semaine${db.semainesRestantes > 1 ? 's' : ''}`) : null),
      h('div', { class: 'stack', style: { gap: '2px', textAlign: 'right' } },
        h('span', { class: 'small muted' }, 'Série'),
        h('strong', { class: 'serif', style: { fontSize: '22px' } }, `${db.serie} sem.`),
        h('span', { class: 'tiny faint' }, `${db.total} séances au total`))),

    h('section', { class: 'stack' },
      h('div', { class: 'between' }, h('h2', {}, 'Séance express'), h('a', { href: '#/generer', class: 'small' }, 'Personnaliser')),
      h('div', { class: 'express' }, express.map((p) => h('button', { type: 'button', onclick: () => lancerExpress(p) },
        h('strong', {}, OBJECTIFS[p.objectif].court),
        h('span', {}, [`${p.duree} min`, ...Object.keys(p.contraintes || {}).filter((k) => p.contraintes[k]).map((k) => LIB_C[k])].join(' · ')))))),

    h('section', { class: 'links' },
      h('a', { href: '#/bilan' }, icon('chart'), 'Bilan du mois'),
      h('a', { href: '#/historique' }, icon('history'), 'Historique tests'),
      h('a', { href: '#/test' }, icon('target'), 'Test mensuel')),
  ));
}
