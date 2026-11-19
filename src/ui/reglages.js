import { h, icon, toast, confirmer, telecharger } from './dom.js';
import { state, sauver, exporter, importer, reinitialiser } from '../store.js';
import { rappelIcs } from './test.js';
import { bip, audioPret } from './device.js';

export function render(root) {
  const fichier = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      if (!(await confirmer('Remplacer toutes les données par celles du fichier ?', { ok: 'Importer' }))) return;
      await importer(obj);
      toast('Données importées');
      location.hash = '#/accueil';
    } catch (err) { toast('Import impossible : ' + err.message); }
    e.target.value = '';
  } });
  const num = (key, min, max) => h('input', { type: 'number', min, max, value: state.reglages[key], inputmode: 'numeric',
    onchange: async (e) => { state.reglages[key] = Math.max(min, Math.min(max, +e.target.value || min)); await sauver('reglages').catch(() => {}); toast('Objectif mis à jour'); } });

  root.append(h('div', { class: 'screen' },
    h('div', { class: 'row' }, h('a', { class: 'icon-btn', href: '#/accueil', 'aria-label': 'Retour' }, icon('left')), h('h1', {}, 'Réglages')),
    h('section', { class: 'card stack' },
      h('span', { class: 'label' }, 'Objectifs'),
      h('div', { class: 'grid2' },
        h('label', { class: 'field' }, h('span', {}, 'Séances / semaine'), num('seancesParSemaine', 1, 14)),
        h('label', { class: 'field' }, h('span', {}, 'Minutes / mois'), num('minutesParMois', 10, 1000)))),
    h('section', { class: 'card stack' },
      h('span', { class: 'label' }, 'Minuteur'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: state.reglages.bips !== false, onchange: async (e) => { state.reglages.bips = e.target.checked; await sauver('reglages').catch(() => {}); } }), h('span', {}, 'Bips de fin d\'exercice')),
      h('label', { class: 'field' }, h('span', {}, 'Volume des bips'),
        h('input', { type: 'range', min: 0.1, max: 1, step: 0.1, value: state.reglages.volume, onchange: async (e) => { state.reglages.volume = +e.target.value; await sauver('reglages').catch(() => {}); audioPret(); bip(state.reglages.volume); } })),
      h('p', { class: 'tiny faint' }, 'Sur iPhone, le bouton silencieux coupe aussi les bips.')),
    h('section', { class: 'card stack' },
      h('span', { class: 'label' }, 'Données'),
      h('p', { class: 'small muted' }, `${state.journal.length} séances, ${state.tests.length} tests 1–5, ${state.gowod.length} tests GOWOD, ${state.exercicesPerso.length} exercices ajoutés. Tout est stocké sur cet appareil.`),
      h('button', { class: 'btn block', onclick: () => telecharger(`coach-mobilite-${new Date().toLocaleDateString('sv-SE')}.json`, JSON.stringify(exporter(), null, 2)) }, 'Exporter en JSON'),
      h('button', { class: 'btn block', onclick: () => fichier.click() }, 'Importer un JSON'), fichier,
      h('button', { class: 'btn block', onclick: rappelIcs }, 'Rappel du test (calendrier)'),
      h('button', { class: 'btn block danger', onclick: async () => {
        if (await confirmer('Tout effacer et revenir aux données initiales ?', { ok: 'Réinitialiser', danger: true })) { await reinitialiser(); toast('Données réinitialisées'); location.hash = '#/accueil'; }
      } }, 'Réinitialiser')),
    h('p', { class: 'tiny faint', style: { textAlign: 'center' } }, 'Coach Mobilité · fonctionne hors ligne · ajoute-le à l\'écran d\'accueil depuis Safari (Partager → Sur l\'écran d\'accueil).'),
  ));
}
