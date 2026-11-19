import { fill, h, icon, bar } from './dom.js';
import { state, bibliotheque, prioritesActuelles } from '../store.js';
import { bilanMensuel, OBJECTIFS } from '../engine/stats.js';
import { ZONES } from '../data/bibliotheque.js';
import { iso, labelMois, labelDate, parse } from '../engine/dates.js';

let mois = null;
const decaler = (key, n) => { const d = parse(key + '-01'); d.setMonth(d.getMonth() + n); return iso(d).slice(0, 7); };

export function render(root) {
  if (!mois) mois = iso().slice(0, 7);
  const ecran = h('div', { class: 'screen' });
  root.append(ecran);
  const dessiner = () => {
    const b = bilanMensuel(state.journal, bibliotheque(), mois, { priorites: prioritesActuelles(), objectifs: state.reglages });
    const maxObj = Math.max(1, ...Object.values(b.parObjectif).map((x) => x.minutes));
    const maxZ = Math.max(1, ...b.zones.map(([, n]) => n));
    const zonesUtiles = b.zones.filter(([z]) => !['cou', 'bras'].includes(z) || b.zones.find(([y, n]) => y === z && n > 0));
    fill(ecran, 
      h('div', { class: 'between' },
        h('button', { class: 'icon-btn', 'aria-label': 'Mois précédent', onclick: () => { mois = decaler(mois, -1); dessiner(); } }, icon('left')),
        h('h1', { style: { textAlign: 'center', textTransform: 'capitalize' } }, labelMois(mois)),
        h('button', { class: 'icon-btn', 'aria-label': 'Mois suivant', onclick: () => { mois = decaler(mois, 1); dessiner(); } }, icon('right'))),
      h('section', { class: 'grid2' },
        h('div', { class: 'card stack' }, h('span', { class: 'label' }, 'Minutes'), h('div', { class: 'big-num' }, b.minutes, h('small', {}, `/ ${state.reglages.minutesParMois}`)), bar(b.minutes / state.reglages.minutesParMois, b.minutes >= state.reglages.minutesParMois)),
        h('div', { class: 'card stack' }, h('span', { class: 'label' }, 'Séances'), h('div', { class: 'big-num' }, b.seances),
          h('p', { class: 'tiny faint' }, `${b.semaines.filter((s) => s.ok).length} / ${b.semaines.length} semaines à ${state.reglages.seancesParSemaine}+`))),
      h('section', { class: 'card stack' },
        h('span', { class: 'label' }, 'Répartition par objectif'),
        Object.keys(b.parObjectif).length ? Object.entries(b.parObjectif).sort((x, y) => y[1].minutes - x[1].minutes).map(([k, v]) =>
          h('div', { class: 'hbar' }, h('span', {}, OBJECTIFS[k]?.court || k), bar(v.minutes / maxObj), h('span', { class: 'small muted', style: { textAlign: 'right' } }, `${v.minutes}′`)))
          : h('p', { class: 'small muted' }, 'Aucune séance ce mois-ci.')),
      h('section', { class: 'card stack' },
        h('span', { class: 'label' }, 'Zones travaillées'),
        h('p', { class: 'tiny faint' }, 'Nombre de séances où chaque zone apparaît.'),
        zonesUtiles.map(([z, n]) => h('div', { class: 'hbar' }, h('span', {}, ZONES[z]), bar(n / maxZ), h('span', { class: 'small muted', style: { textAlign: 'right' } }, n))),
        b.seances ? h('p', { class: 'small' }, `Plus travaillées : ${b.zones.slice(0, 2).map(([z]) => ZONES[z]).join(', ')} · moins travaillées : ${zonesUtiles.slice(-2).map(([z]) => ZONES[z]).join(', ')}.`) : null),
      h('section', { class: 'card stack' },
        h('span', { class: 'label' }, 'Ressentis et douleurs'),
        b.ressentis.length ? b.ressentis.map((r) => h('p', { class: 'small' }, h('strong', {}, labelDate(r.date, { jour: false }) + ' : '), r.texte))
          : h('p', { class: 'small muted' }, 'Rien de noté.')),
      h('section', { class: 'card stack', style: { borderColor: '#5a3f27' } },
        h('span', { class: 'label', style: { color: 'var(--accent-strong)' } }, 'Recommandation pour le mois suivant'),
        h('ul', { style: { margin: 0, paddingLeft: '20px' }, class: 'stack small' }, b.reco.map((r) => h('li', {}, r)))),
    );
  };
  dessiner();
}
