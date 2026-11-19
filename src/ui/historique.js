import { h, icon } from './dom.js';
import { state } from '../store.js';
import { ZONES_TEST } from '../data/tests.js';
import { courbes } from './charts.js';
import { labelDateCourt } from '../engine/dates.js';

const ZG = { epaules: 'Épaules', overhead: 'Overhead', thorax: 'Thorax', hanches: 'Hanches', chaine: 'Chaîne', chevilles: 'Chevilles' };

function table(cols, rows) {
  return h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
    h('thead', {}, h('tr', {}, cols.map((c) => h('th', {}, c)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
}
const f = (v) => (v == null ? '–' : String(v).replace('.', ','));

export function render(root) {
  const tests = [...state.tests].sort((a, b) => a.date.localeCompare(b.date));
  const gowod = [...state.gowod].sort((a, b) => a.date.localeCompare(b.date));
  const zones = Object.keys(ZONES_TEST);

  root.append(h('div', { class: 'screen' },
    h('div', { class: 'between' }, h('h1', {}, 'Historique des tests'), h('a', { class: 'btn small', href: '#/test' }, icon('plus'), 'Test')),

    h('section', { class: 'card stack' },
      h('h2', {}, 'Échelle 1–5'),
      tests.length ? [
        courbes(tests.map((t) => labelDateCourt(t.date)), zones.map((z) => ({ nom: ZONES_TEST[z], valeurs: tests.map((t) => t.zones[z]) })), { min: 1, max: 5 }),
        table(['Date', ...zones.map((z) => ZG[z]), 'Global'], [...tests].reverse().map((t) => [labelDateCourt(t.date), ...zones.map((z) => f(t.zones[z])), h('strong', {}, f(t.global))])),
      ] : h('p', { class: 'muted small' }, 'Aucun test 1–5 pour l\'instant. Le premier fixera ta référence.'),
    ),

    h('section', { class: 'card stack' },
      h('h2', {}, 'GOWOD (échelle en %)'),
      h('p', { class: 'tiny faint' }, 'Série conservée à part, sans conversion vers l\'échelle 1–5.'),
      gowod.length ? [
        courbes(gowod.map((t) => labelDateCourt(t.date)), zones.map((z) => ({ nom: ZONES_TEST[z], valeurs: gowod.map((t) => t[z]) })), { min: 0, max: 100, pas: 25, suffixe: '' }),
        table(['Date', ...zones.map((z) => ZG[z]), 'Global'], [...gowod].reverse().map((t) => [labelDateCourt(t.date), ...zones.map((z) => t[z] + ' %'), h('strong', {}, t.global + ' %')])),
        h('details', { class: 'opts' }, h('summary', {}, 'Détails GOWOD', icon('chevron', 'width="18" height="18"')),
          gowod.map((t) => h('div', { class: 'stack small', style: { marginTop: '8px' } }, h('strong', {}, labelDateCourt(t.date)),
            Object.entries(t.details || {}).map(([z, d]) => h('p', { class: 'muted' }, `${ZG[z]} : ${d}`))))),
      ] : h('p', { class: 'muted small' }, 'Aucun test GOWOD.'),
    ),
  ));
}
