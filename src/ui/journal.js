import { fill, h, icon, modal, toast, confirmer } from './dom.js';
import { state, ajouterEntree, modifierEntree, supprimerEntree } from '../store.js';
import { OBJECTIFS, ressentiDe } from '../engine/stats.js';
import { labelDate, labelMois, monthKey } from '../engine/dates.js';

/** Formulaire d'entrée du journal (création ou modification). */
export function ouvrirFormulaireEntree(prefill, onSave, { edition = null } = {}) {
  const v = { date: new Date().toLocaleDateString('sv-SE'), objectif: 'relax', duree: 10, contenu: '', ressenti: '', ...prefill };
  modal((close) => {
    const date = h('input', { type: 'date', value: v.date, required: true });
    const obj = h('select', {}, Object.entries(OBJECTIFS).map(([k, o]) => h('option', { value: k, selected: v.objectif === k }, o.label)));
    const duree = h('input', { type: 'number', min: 1, max: 180, inputmode: 'numeric', value: v.duree });
    const contenu = h('textarea', { rows: 4 }, v.contenu);
    const ressenti = h('textarea', { rows: 2, placeholder: 'Ex. raideur hanche gauche, très détendu…' }, v.ressenti || '');
    const enregistrer = async () => {
      const e = {
        date: date.value || v.date, objectif: obj.value, duree: Math.max(1, Math.round(+duree.value || 0)),
        contenu: contenu.value.trim(), ressenti: ressenti.value.trim(),
      };
      if (v.exercices) e.exercices = v.exercices;
      try {
        if (edition) await modifierEntree(edition, e); else await ajouterEntree(e);
        close();
        onSave && onSave(e);
      } catch (err) {
        toast('Enregistrement impossible : ' + err.message);
      }
    };
    return [
      h('h2', {}, edition ? 'Modifier la séance' : 'Inscrire la séance'),
      h('div', { class: 'grid2' }, h('label', { class: 'field' }, h('span', {}, 'Date'), date), h('label', { class: 'field' }, h('span', {}, 'Durée (min)'), duree)),
      h('label', { class: 'field' }, h('span', {}, 'Objectif'), obj),
      h('label', { class: 'field' }, h('span', {}, 'Contenu'), contenu),
      h('label', { class: 'field' }, h('span', {}, 'Ressenti ou douleur (optionnel)'), ressenti),
      h('div', { class: 'grid2' }, h('button', { class: 'btn', onclick: close }, 'Annuler'), h('button', { class: 'btn primary', onclick: enregistrer }, 'Enregistrer')),
    ];
  });
}

export function render(root) {
  const ecran = h('div', { class: 'screen' });
  root.append(ecran);
  const dessiner = () => {
    const entrees = [...state.journal].sort((a, b) => b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1));
    const parMois = new Map();
    for (const e of entrees) { const k = monthKey(e.date); if (!parMois.has(k)) parMois.set(k, []); parMois.get(k).push(e); }
    fill(ecran, 
      h('div', { class: 'between' }, h('h1', {}, 'Journal'),
        h('button', { class: 'btn small', onclick: () => ouvrirFormulaireEntree({}, () => { toast('Séance ajoutée'); dessiner(); }) }, icon('plus'), 'Ajouter')),
      h('p', { class: 'muted small' }, `${entrees.length} séances · ${entrees.reduce((t, e) => t + (+e.duree || 0), 0)} min au total`),
      entrees.length ? null : h('p', { class: 'empty' }, 'Aucune séance pour l\'instant.'),
      [...parMois].map(([k, list]) => h('section', { class: 'stack' },
        h('div', { class: 'between' }, h('h2', {}, labelMois(k)), h('span', { class: 'small muted' }, `${list.length} séances · ${list.reduce((t, e) => t + (+e.duree || 0), 0)} min`)),
        list.map((e) => item(e)))),
    );
  };
  const item = (e) => {
    const r = ressentiDe(e);
    return h('article', { class: 'journal-item' },
      h('div', { class: 'between' },
        h('div', {}, h('strong', {}, labelDate(e.date)), h('span', { class: 'muted small' }, ` · ${e.duree} min`)),
        h('div', { class: 'row', style: { gap: '4px' } },
          h('button', { class: 'icon-btn ghost', 'aria-label': 'Modifier', onclick: () => ouvrirFormulaireEntree(e, () => { toast('Séance modifiée'); dessiner(); }, { edition: e.id }) }, icon('edit')),
          h('button', { class: 'icon-btn ghost', 'aria-label': 'Supprimer', onclick: async () => { if (await confirmer('Supprimer cette séance ?', { ok: 'Supprimer' })) { await supprimerEntree(e.id); dessiner(); } } }, icon('trash')))),
      h('div', {}, h('span', { class: 'tag acc' }, OBJECTIFS[e.objectif]?.court || e.objectif)),
      e.contenu ? h('p', { class: 'small muted' }, e.contenu) : null,
      r && e.ressenti ? h('p', { class: 'small', style: { color: 'var(--terre-text)' } }, 'Ressenti : ' + r) : null,
    );
  };
  dessiner();
}
