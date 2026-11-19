import { fill, h, icon, toast, confirmer, telecharger } from './dom.js';
import { state, sauver, exporter, importer, reinitialiser } from '../store.js';
import { rappelIcs } from './test.js';
import { bip, audioPret } from './device.js';
import { connecter, deconnecter, synchroniser, surSync } from '../sync.js';

const LIEN_JETON = 'https://github.com/settings/tokens/new?scopes=gist&description=Coach%20Mobilit%C3%A9';

function sectionSync() {
  const box = h('section', { class: 'card stack' });
  const dessiner = () => {
    const sy = state.sync || {};
    const statut = sy.etat === 'erreur' ? h('p', { class: 'alert' }, 'Erreur : ' + sy.erreur)
      : h('p', { class: 'small muted' }, `État : ${sy.etat || '—'}${sy.derniere ? ' · dernière synchro ' + new Date(sy.derniere).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''}`);
    if (sy.token) {
      fill(box,
        h('span', { class: 'label' }, 'Synchronisation entre appareils'),
        h('p', { class: 'small' }, 'Connecté à GitHub. Les séances, tests, exercices ajoutés et objectifs se synchronisent automatiquement via un Gist privé.'),
        statut,
        h('button', { class: 'btn block', onclick: async () => { await synchroniser(); toast(state.sync.etat === 'à jour' ? 'Synchronisé' : 'Synchro : ' + (state.sync.erreur || state.sync.etat)); } }, icon('history'), 'Synchroniser maintenant'),
        h('button', { class: 'btn block ghost danger', onclick: async () => { if (await confirmer('Déconnecter cet appareil ? Les données restent sur l\'appareil et dans le Gist.', { ok: 'Déconnecter' })) { await deconnecter(); dessiner(); } } }, 'Déconnecter cet appareil'));
    } else {
      const jeton = h('input', { type: 'password', placeholder: 'ghp_… ou github_pat_…', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Jeton GitHub' });
      fill(box,
        h('span', { class: 'label' }, 'Synchronisation entre appareils'),
        h('p', { class: 'small muted' }, 'Pour retrouver tes données sur iPhone et iPad, l\'appli les range dans un Gist privé de ton compte GitHub.'),
        h('ol', { class: 'steps-ol small' },
          h('li', {}, h('a', { href: LIEN_JETON, target: '_blank', rel: 'noopener' }, 'Crée un jeton GitHub'), ' avec la seule case « gist » cochée (expiration : « No expiration » ou 1 an).'),
          h('li', {}, 'Copie-le et colle-le ci-dessous.'),
          h('li', {}, 'Colle le même jeton sur ton autre appareil.')),
        jeton,
        sy.etat === 'erreur' ? statut : null,
        h('button', { class: 'btn primary block', onclick: async (e) => {
          if (!jeton.value.trim()) { toast('Colle d\'abord ton jeton'); return; }
          e.currentTarget.disabled = true;
          try { await connecter(jeton.value); toast(state.sync.etat === 'à jour' ? 'Connecté et synchronisé' : 'Synchro : ' + (state.sync.erreur || state.sync.etat)); }
          catch (err) { state.sync = {}; toast(err.message); }
          dessiner();
        } }, 'Connecter'),
        h('p', { class: 'tiny faint' }, 'Le jeton reste sur cet appareil, il n\'est jamais inclus dans l\'export JSON. Il ne donne accès qu\'à tes Gists.'));
    }
  };
  dessiner();
  return [box, surSync(dessiner)];
}

export function render(root) {
  const fichier = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      if (!(await confirmer('Fusionner le fichier avec les données de cet appareil ? Rien n\'est supprimé.', { ok: 'Importer' }))) return;
      await importer(obj);
      toast('Données importées');
      location.hash = '#/accueil';
    } catch (err) { toast('Import impossible : ' + err.message); }
    e.target.value = '';
  } });
  const num = (key, min, max) => h('input', { type: 'number', min, max, value: state.reglages[key], inputmode: 'numeric',
    onchange: async (e) => { state.reglages[key] = Math.max(min, Math.min(max, +e.target.value || min)); await sauver('reglages').catch(() => {}); toast('Objectif mis à jour'); } });

  const [blocSync, stopSync] = sectionSync();
  root.append(h('div', { class: 'screen' },
    h('div', { class: 'row' }, h('a', { class: 'icon-btn', href: '#/accueil', 'aria-label': 'Retour' }, icon('left')), h('h1', {}, 'Réglages')),
    blocSync,
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
      h('p', { class: 'small muted' }, `${state.journal.length} séances, ${state.tests.length} tests 1–5, ${state.gowod.length} tests GOWOD, ${state.exercicesPerso.length} exercices ajoutés. Stocké sur cet appareil, et dans ton Gist si la synchro est active.`),
      h('button', { class: 'btn block', onclick: () => telecharger(`coach-mobilite-${new Date().toLocaleDateString('sv-SE')}.json`, JSON.stringify(exporter(), null, 2)) }, 'Exporter en JSON'),
      h('button', { class: 'btn block', onclick: () => fichier.click() }, 'Importer un JSON'), fichier,
      h('button', { class: 'btn block', onclick: rappelIcs }, 'Rappel du test (calendrier)'),
      h('button', { class: 'btn block danger', onclick: async () => {
        if (await confirmer('Tout effacer et revenir aux données initiales ? Si la synchro est active, l\'effacement s\'applique aussi aux autres appareils.', { ok: 'Réinitialiser', danger: true })) { await reinitialiser(); toast('Données réinitialisées'); location.hash = '#/accueil'; }
      } }, 'Réinitialiser')),
    h('p', { class: 'tiny faint', style: { textAlign: 'center' } }, 'Coach Mobilité · fonctionne hors ligne · ajoute-le à l\'écran d\'accueil depuis Safari (Partager → Sur l\'écran d\'accueil).'),
  ));
  return stopSync;
}
