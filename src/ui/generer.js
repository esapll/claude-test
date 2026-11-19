import { fill, h, icon, chip, fmtDuree, toast } from './dom.js';
import { courant, regenerer, paramsParDefaut, remplacerBloc, memoriserLancement } from './session.js';
import { OBJECTIFS } from '../engine/stats.js';
import { ZONES } from '../data/bibliotheque.js';
import { analyseWod } from '../engine/generator.js';
import { audioPret, garderEcranAllume } from './device.js';

const CONTRAINTES = [['sansRouleau', 'Sans rouleau'], ['sansMateriel', 'Sans matériel'], ['sansMur', 'Sans mur'], ['sansFlexion', 'Sans flexion du dos']];
const SPORTS = [['course', 'Course'], ['velo', 'Vélo'], ['crossfit', 'CrossFit'], ['natation', 'Natation']];
const ZONES_DOULEUR = ['hanches', 'dos', 'cou', 'epaules', 'thorax', 'jambes', 'post', 'bras'];
const TYPE_LABEL = { dyn: 'dynamique', stat: 'statique', roll: 'rouleau', force: 'force' };

export function lancer() {
  // Dans le geste de l'utilisateur : déverrouille l'audio et l'écran allumé (iOS).
  audioPret();
  garderEcranAllume();
  memoriserLancement();
  location.hash = '#/minuteur?auto=1';
}

export function render(root, query) {
  if (!courant.params) courant.params = paramsParDefaut();
  if (!courant.session || query.nouveau) regenerer();
  const p = courant.params;
  let optsOuvertes = !!(p.douleur || p.sport || p.contraintes.maxExercices);

  const form = h('div', { class: 'stack' });
  const apercu = h('div', { class: 'stack' });

  const maj = (fn, regen = true) => { fn(); if (regen) regenerer(); dessinerForm(); dessinerApercu(); };

  function dessinerForm() {
    const dureeVal = h('div', { class: 'big-num' }, p.duree, h('small', {}, 'min'));
    const range = h('input', {
      type: 'range', min: 5, max: 30, step: 1, value: p.duree, 'aria-label': 'Durée en minutes',
      oninput: (e) => { p.duree = +e.target.value; dureeVal.firstChild.textContent = p.duree; },
      onchange: () => maj(() => {}),
    });
    const douleur = p.douleur || {};
    const sport = p.sport || {};
    const wodLu = sport.type === 'crossfit' && sport.wod ? analyseWod(sport.wod) : null;

    fill(form, 
      h('section', { class: 'card stack' },
        h('div', { class: 'between' }, h('span', { class: 'label' }, 'Durée'), dureeVal),
        range,
        h('div', { class: 'chips' }, [5, 8, 10, 12, 15, 20, 30].map((d) => chip(`${d}`, p.duree === d, () => maj(() => { p.duree = d; }), { sm: true }))),
      ),
      h('section', { class: 'stack' },
        h('span', { class: 'label' }, 'Objectif'),
        h('div', { class: 'chips' }, Object.entries(OBJECTIFS).map(([k, o]) => chip(o.label, p.objectif === k, () => maj(() => { p.objectif = k; })))),
      ),
      h('section', { class: 'stack' },
        h('div', { class: 'between' }, h('span', { class: 'label' }, 'Moment'), h('span', { class: 'tiny faint' }, 'déduit de l\'heure')),
        h('div', { class: 'chips' },
          chip('Matin', p.moment === 'matin', () => maj(() => { p.moment = 'matin'; })),
          chip('Soir', p.moment === 'soir', () => maj(() => { p.moment = 'soir'; }))),
      ),
      h('section', { class: 'stack' },
        h('span', { class: 'label' }, 'Contraintes'),
        h('div', { class: 'chips' }, CONTRAINTES.map(([k, l]) => chip(l, !!p.contraintes[k], () => maj(() => { p.contraintes[k] = !p.contraintes[k]; })))),
      ),
      h('details', { class: 'card opts', open: optsOuvertes, ontoggle: (e) => { optsOuvertes = e.target.open; } },
        h('summary', {}, h('span', {}, 'Plus d\'options', h('span', { class: 'tiny faint' }, '  zone, sport, nombre d\'exercices')), icon('chevron', 'width="20" height="20"')),
        h('div', { class: 'stack', style: { marginTop: '10px' } },
          h('label', { class: 'field' }, h('span', {}, 'Nombre maximum d\'exercices'),
            h('select', { onchange: (e) => maj(() => { p.contraintes.maxExercices = +e.target.value || undefined; }) },
              h('option', { value: '' }, 'Pas de limite'),
              [3, 4, 5, 6, 7, 8, 10, 12].map((n) => h('option', { value: n, selected: p.contraintes.maxExercices === n }, n)))),
          h('label', { class: 'field' }, h('span', {}, 'Zone douloureuse ou à cibler'),
            h('select', { onchange: (e) => maj(() => { p.douleur = e.target.value ? { zone: e.target.value, cote: douleur.cote || null } : null; }) },
              h('option', { value: '' }, 'Aucune'),
              ZONES_DOULEUR.map((z) => h('option', { value: z, selected: douleur.zone === z }, ZONES[z])))),
          p.douleur ? h('div', { class: 'chips' },
            [['D', 'Droite'], ['G', 'Gauche'], [null, 'Les deux']].map(([c, l]) => chip(l, (douleur.cote || null) === c, () => maj(() => { p.douleur.cote = c; }), { sm: true }))) : null,
          h('span', { class: 'field' }, h('span', {}, 'Sport fait aujourd\'hui ou hier')),
          h('div', { class: 'chips' },
            chip('Aucun', !sport.type, () => maj(() => { p.sport = null; }), { sm: true }),
            SPORTS.map(([k, l]) => chip(l, sport.type === k, () => maj(() => { p.sport = { quand: 'jour', ...(p.sport || {}), type: k }; }), { sm: true }))),
          sport.type ? h('div', { class: 'chips' },
            chip('Aujourd\'hui', sport.quand !== 'veille', () => maj(() => { p.sport.quand = 'jour'; }), { sm: true }),
            chip('Hier', sport.quand === 'veille', () => maj(() => { p.sport.quand = 'veille'; }), { sm: true })) : null,
          sport.type === 'crossfit' ? h('label', { class: 'field' }, h('span', {}, 'Description du WOD'),
            h('textarea', { placeholder: 'Ex. 21-15-9 thrusters, pull-ups', onchange: (e) => maj(() => { p.sport.wod = e.target.value; }) }, sport.wod || '')) : null,
          wodLu ? h('p', { class: 'tiny muted' }, 'Lu dans le WOD : ' + wodLu.lu.join(' ; ')) : null,
          sport.type ? h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: !!sport.jambesLourdes || !!(wodLu && wodLu.jambesLourdes), onchange: (e) => maj(() => { p.sport.jambesLourdes = e.target.checked; }) }),
            h('span', { class: 'small' }, 'Séance de jambes lourde (squat, step-ups) : force au poids du corps')) : null,
        ),
      ),
    );
  }

  function dessinerApercu() {
    const s = courant.session;
    if (!s) { fill(apercu, h('div', { class: 'alert' }, 'Impossible de construire cette séance. Essaie d\'assouplir les contraintes.')); return; }
    const nb = s.blocks.length;
    fill(apercu, 
      h('div', { class: 'between' },
        h('div', {}, h('h2', {}, OBJECTIFS[s.params.objectif].court), h('p', { class: 'muted small' }, `${s.duree} min pile · ${nb} exercices · ${s.params.moment}`)),
        h('button', { class: 'btn small', onclick: () => maj(() => {}) }, icon('swap'), 'Autre')),
      s.alertes.map((a) => h('div', { class: 'alert', role: 'alert' }, a)),
      s.notes.length ? h('div', { class: 'note stack' }, s.notes.map((n) => h('p', {}, n))) : null,
      h('ol', { class: 'list', style: { listStyle: 'none', padding: 0, margin: 0 } }, s.blocks.map((b, i) => blocVue(b, i))),
      h('div', { class: 'sticky-cta' },
        h('button', { class: 'btn primary block', onclick: lancer }, icon('play'), 'Lancer la séance')),
    );
  }

  function blocVue(b, i) {
    const pas = b.steps.map((st) => {
      const t = (st.side ? st.side + ' ' : '') + fmtDuree(st.sec);
      return h('span', { class: 'tag' + (st.chain ? ' terre' : '') }, (st.part && st.part !== 'passif' ? st.part.toUpperCase() + ' ' : '') + t);
    });
    const remplacable = b.kind !== 'protocole';
    return h('li', { class: 'bloc' },
      h('div', { class: 'row', style: { alignItems: 'flex-start' } }, h('span', { class: 'num' }, i + 1),
        h('div', {}, h('h3', {}, b.nom), h('p', { class: 'tiny faint' }, [TYPE_LABEL[b.t], b.z.map((z) => ZONES[z]).join(', '), b.materiel !== 'aucun' ? b.materiel : null].filter(Boolean).join(' · ')))),
      h('div', { class: 'between' }, h('div', { class: 'steps' }, pas),
        remplacable ? h('button', {
          class: 'btn small ghost', 'aria-label': 'Remplacer ' + b.nom,
          onclick: () => { const ok = remplacerBloc(b.uid); if (!ok) toast('Pas d\'alternative de même zone et même type.'); dessinerApercu(); },
        }, icon('swap'), 'Remplacer') : null),
      b.douleur ? h('p', { class: 'small', style: { color: 'var(--terre-text)' } }, 'Zone sensible : amplitude réduite, pression douce.') : null,
      h('p', { class: 'consigne' }, b.consigne),
    );
  }

  dessinerForm();
  dessinerApercu();
  root.append(h('div', { class: 'screen' }, h('h1', {}, 'Générer une séance'), form, h('hr'), apercu));
}
