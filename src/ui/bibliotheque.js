import { fill, h, icon, chip, modal, toast } from './dom.js';
import { state, sauver, bibliotheque } from '../store.js';
import { ZONES, OBJ_BIBLIO, TYPES, MATERIELS } from '../data/bibliotheque.js';
import { compteParExercice } from '../engine/stats.js';

const filtres = { z: new Set(), o: new Set(), t: new Set(), q: '' };

export function render(root) {
  const ecran = h('div', { class: 'screen' });
  const liste = h('div', { class: 'list' });
  const compteur = h('p', { class: 'small muted' });
  root.append(ecran);

  const groupe = (titre, key, dict) => h('div', { class: 'stack', style: { gap: '6px' } },
    h('span', { class: 'label' }, titre),
    h('div', { class: 'chips scroll' }, Object.entries(dict).map(([k, l]) => chip(l, filtres[key].has(k), (e) => {
      filtres[key].has(k) ? filtres[key].delete(k) : filtres[key].add(k);
      e.currentTarget.setAttribute('aria-pressed', filtres[key].has(k));
      dessinerListe();
    }, { sm: true }))));

  function dessinerListe() {
    const comptes = compteParExercice(state.journal, bibliotheque());
    const q = filtres.q.toLowerCase();
    const items = bibliotheque().filter((e) => !e.interne
      && (!filtres.z.size || e.z.some((z) => filtres.z.has(z)))
      && (!filtres.o.size || e.o.some((o) => filtres.o.has(o)))
      && (!filtres.t.size || filtres.t.has(e.t))
      && (!q || e.n.toLowerCase().includes(q)))
      .sort((a, b) => (b.p - a.p) || a.n.localeCompare(b.n, 'fr'));
    compteur.textContent = `${items.length} exercice${items.length > 1 ? 's' : ''}`;
    fill(liste, ...items.map((e) => carte(e, comptes.get(e.id) || 0)));
  }

  function carte(e, n) {
    const detail = h('div', { class: 'stack', hidden: true, style: { gap: '6px' } },
      h('p', { class: 'small muted' }, e.c),
      h('p', { class: 'tiny faint' }, [`Source : ${e.s}`, e.cotes ? 'droite / gauche' : null, e.actif ? 'actif (jamais le soir)' : 'passif possible le soir'].filter(Boolean).join(' · ')));
    return h('article', { class: 'ex-card' },
      h('button', { class: 'head', 'aria-expanded': 'false', onclick: (ev) => { detail.hidden = !detail.hidden; ev.currentTarget.setAttribute('aria-expanded', String(!detail.hidden)); } },
        h('div', { class: 'stack', style: { gap: '6px' } },
          h('h3', {}, e.p ? h('span', { style: { color: 'var(--accent-strong)' }, title: 'Prioritaire', 'aria-label': 'Prioritaire' }, '★ ') : null, e.n),
          h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } },
            h('span', { class: 'tag acc' }, TYPES[e.t]),
            e.z.map((z) => h('span', { class: 'tag' }, ZONES[z])),
            e.materiel !== 'aucun' ? h('span', { class: 'tag terre' }, MATERIELS[e.materiel]) : null)),
        h('span', { class: 'small ' + (n ? '' : 'faint'), style: { whiteSpace: 'nowrap' } }, `Fait ${n}×`)),
      detail);
  }

  ecran.append(
    h('div', { class: 'between' }, h('h1', {}, 'Exercices'), h('button', { class: 'btn small', onclick: ajouter }, icon('plus'), 'Ajouter')),
    h('input', { type: 'text', placeholder: 'Rechercher…', value: filtres.q, 'aria-label': 'Rechercher', oninput: (e) => { filtres.q = e.target.value; dessinerListe(); } }),
    groupe('Zone', 'z', ZONES),
    groupe('Objectif', 'o', OBJ_BIBLIO),
    groupe('Type', 't', TYPES),
    compteur, liste,
  );
  dessinerListe();

  function ajouter() {
    const v = { z: new Set(), o: new Set(), t: 'dyn', materiel: 'aucun' };
    modal((close) => {
      const nom = h('input', { type: 'text', placeholder: 'Nom de l\'exercice' });
      const consigne = h('textarea', { placeholder: 'Consigne en 2 à 3 lignes' });
      const cotes = h('input', { type: 'checkbox' });
      const actif = h('input', { type: 'checkbox' });
      const multi = (dict, set) => h('div', { class: 'chips' }, Object.entries(dict).map(([k, l]) => chip(l, false, (ev) => {
        set.has(k) ? set.delete(k) : set.add(k); ev.currentTarget.setAttribute('aria-pressed', set.has(k));
      }, { sm: true })));
      const un = (dict, key) => {
        const wrap = h('div', { class: 'chips' });
        const draw = () => fill(wrap, ...Object.entries(dict).map(([k, l]) => chip(l, v[key] === k, () => { v[key] = k; draw(); }, { sm: true })));
        draw();
        return wrap;
      };
      return [
        h('h2', {}, 'Nouvel exercice'),
        h('label', { class: 'field' }, h('span', {}, 'Nom'), nom),
        h('div', { class: 'field' }, h('span', {}, 'Zones'), multi(ZONES, v.z)),
        h('div', { class: 'field' }, h('span', {}, 'Objectifs'), multi(OBJ_BIBLIO, v.o)),
        h('div', { class: 'field' }, h('span', {}, 'Type'), un(TYPES, 't')),
        h('div', { class: 'field' }, h('span', {}, 'Matériel'), un(MATERIELS, 'materiel')),
        h('label', { class: 'check' }, cotes, h('span', {}, 'Se fait côté droit puis gauche')),
        h('label', { class: 'check' }, actif, h('span', {}, 'Actif (contraction, charge) : jamais le soir')),
        h('label', { class: 'field' }, h('span', {}, 'Consigne'), consigne),
        h('div', { class: 'grid2' }, h('button', { class: 'btn', onclick: close }, 'Annuler'),
          h('button', { class: 'btn primary', onclick: async () => {
            if (!nom.value.trim() || !v.z.size || !v.o.size) { toast('Nom, zone et objectif sont requis'); return; }
            state.exercicesPerso.push({
              id: 'perso-' + Date.now().toString(36), n: nom.value.trim(), z: [...v.z], o: [...v.o], t: v.t, materiel: v.materiel,
              cotes: cotes.checked, actif: actif.checked || v.t === 'force', c: consigne.value.trim() || 'Mouvement lent et contrôlé.', p: false,
            });
            try { await sauver('exercicesPerso'); } catch (e) { toast(e.message); return; }
            close(); toast('Exercice ajouté'); dessinerListe();
          } }, 'Ajouter')),
      ];
    });
  }
}
