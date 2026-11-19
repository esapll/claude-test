import { fill, h, icon, chip, toast, telecharger, confirmer } from './dom.js';
import { state, sauver, dernierTest } from '../store.js';
import { TESTS, ZONES_TEST, DUREE_TEST_MIN } from '../data/tests.js';
import { scoresTest } from '../engine/scoring.js';
import { jauge, radar } from './charts.js';
import { labelDate, lastSundayOfMonth, iso } from '../engine/dates.js';
import { labelZone } from '../engine/stats.js';

// Brouillon du test en cours (conservé en mémoire si on change d'écran).
let B = null;
const nouveau = () => ({ etape: -1, notes: {}, cote: 'D', debut: Date.now() });

export function render(root) {
  if (!B) B = nouveau();
  const ecran = h('div', { class: 'screen' });
  root.append(ecran);
  const dessiner = () => {
    if (B.etape < 0) return intro();
    if (B.etape >= TESTS.length) return resume();
    return testVue(TESTS[B.etape]);
  };

  function intro() {
    const t = dernierTest();
    fill(ecran, 
      h('h1', {}, 'Test mensuel'),
      h('p', { class: 'muted' }, `12 tests notés de 1 à 5 à partir de repères visuels du corps, sans mesure exacte. Durée visée : 10 à ${DUREE_TEST_MIN} min.`),
      h('div', { class: 'card stack' },
        h('span', { class: 'label' }, 'Au programme'),
        Object.entries(ZONES_TEST).map(([z, l]) => h('div', { class: 'between small' }, h('span', {}, l), h('span', { class: 'muted' }, TESTS.filter((x) => x.zone === z).map((x) => x.nom).join(' · ')))),
      ),
      h('p', { class: 'small muted' }, t ? `Dernier test : ${labelDate(t.date)}, score ${String(t.global).replace('.', ',')} / 5.` : 'Premier test sur l\'échelle 1–5 (les 2 tests GOWOD restent dans l\'historique, à part).'),
      h('p', { class: 'small muted' }, `Prochain rappel : dimanche ${labelDate(lastSundayOfMonth(iso()), { jour: false })}.`),
      h('button', { class: 'btn primary block', onclick: () => { B = nouveau(); B.etape = 0; dessiner(); } }, icon('play'), 'Commencer le test'),
      h('div', { class: 'grid2' },
        h('a', { class: 'btn', href: '#/historique' }, icon('history'), 'Historique'),
        h('button', { class: 'btn', onclick: rappelIcs }, 'Rappel calendrier')),
    );
  }

  function testVue(t) {
    const n = B.notes[t.id] || (B.notes[t.id] = {});
    const cote = t.bilateral ? B.cote : 'v';
    const choisir = (lvl) => {
      n[cote] = lvl;
      if (t.bilateral && cote === 'D' && !n.G) B.cote = 'G';
      else if (t.bilateral && cote === 'G' && !n.D) B.cote = 'D';
      else setTimeout(() => { if (TESTS[B.etape] === t) suivant(); }, 350);
      dessiner();
    };
    fill(ecran, 
      h('div', { class: 'progress-dots', 'aria-hidden': 'true' }, TESTS.map((x, i) => h('i', { class: i === B.etape ? 'cur' : i < B.etape ? 'on' : '' }))),
      h('div', { class: 'between' },
        h('span', { class: 'label' }, `${ZONES_TEST[t.zone]} · test ${B.etape + 1} / ${TESTS.length}`),
        h('button', { class: 'btn small ghost', onclick: async () => { if (await confirmer('Abandonner ce test ?', { ok: 'Abandonner' })) { B = null; location.hash = '#/accueil'; } } }, 'Quitter')),
      h('div', {}, h('h2', {}, `${B.etape + 1}. ${t.nom}`), h('p', { class: 'muted small' }, t.sous + (t.bilateral ? ' · droite et gauche' : ''))),
      h('div', { class: 'card', html: t.svg }),
      h('ol', { class: 'steps-ol' }, t.etapes.map((e) => h('li', {}, e))),
      t.note ? h('p', { class: 'small', style: { color: 'var(--accent-strong)' } }, t.note) : null,
      t.bilateral ? h('div', { class: 'sides', role: 'group', 'aria-label': 'Côté' },
        ['D', 'G'].map((c) => chip(`${c === 'D' ? 'Droite' : 'Gauche'}${n[c] ? ' : ' + n[c] : ''}`, B.cote === c, () => { B.cote = c; dessiner(); }))) : null,
      h('div', { class: 'levels', role: 'group', 'aria-label': 'Niveau' }, t.niveaux.map((txt, i) =>
        h('button', { class: 'level', 'aria-pressed': n[cote] === i + 1 ? 'true' : 'false', onclick: () => choisir(i + 1) }, h('b', {}, i + 1), h('span', {}, txt)))),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn', onclick: () => { B.etape--; B.cote = 'D'; dessiner(); } }, icon('left'), 'Précédent'),
        h('button', { class: 'btn primary', onclick: suivant }, B.etape === TESTS.length - 1 ? 'Résultats' : 'Suivant', icon('right'))),
    );
  }

  function suivant() { B.etape++; B.cote = 'D'; dessiner(); window.scrollTo(0, 0); }

  function resume() {
    const r = scoresTest(B.notes);
    const prec = dernierTest();
    const zones = Object.keys(ZONES_TEST);
    const manquants = TESTS.filter((t) => { const n = B.notes[t.id] || {}; return t.bilateral ? !(n.D && n.G) : !n.v; });
    const minutes = Math.round((Date.now() - B.debut) / 60000);
    fill(ecran, 
      h('h1', {}, 'Résultats'),
      manquants.length ? h('div', { class: 'note' }, `${manquants.length} test(s) incomplet(s) : ${manquants.map((t) => t.nom).join(', ')}. Ils sont ignorés dans les moyennes.`) : null,
      h('div', { class: 'card stack' },
        h('span', { class: 'label' }, 'Score global'),
        h('div', { class: 'gauge' }, jauge(r.global)),
        prec ? h('p', { class: 'center small muted', style: { textAlign: 'center' } }, `Précédent (${labelDate(prec.date, { jour: false })}) : ${String(prec.global).replace('.', ',')} / 5`) : null,
        h('p', { class: 'tiny faint', style: { textAlign: 'center' } }, `Test réalisé en ${minutes} min`)),
      h('div', { class: 'card stack' },
        h('span', { class: 'label' }, 'Radar des 6 zones'),
        radar(zones.map((z) => (z === 'chaine' ? 'Chaîne post.' : ZONES_TEST[z])), zones.map((z) => r.zones[z]), prec ? zones.map((z) => prec.zones[z]) : null),
        prec ? h('p', { class: 'tiny faint' }, 'Pointillés : test précédent.') : null),
      h('div', { class: 'card stack' },
        h('span', { class: 'label' }, 'Par zone'),
        zones.map((z) => {
          const v = r.zones[z], p = prec?.zones?.[z];
          const d = v != null && p != null ? Math.round((v - p) * 10) / 10 : null;
          return h('div', { class: 'between' }, h('span', {}, ZONES_TEST[z]),
            h('span', {}, h('strong', {}, v != null ? String(v).replace('.', ',') : '–'), h('span', { class: 'muted small' }, ' / 5'),
              d != null ? h('span', { class: 'small', style: { marginLeft: '8px', color: d > 0 ? 'var(--ok)' : d < 0 ? 'var(--danger)' : 'var(--muted)' } }, d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : '='.padStart(1)) : null));
        })),
      h('div', { class: 'card stack' },
        h('span', { class: 'label' }, 'Asymétries'),
        r.asymetries.length ? r.asymetries.map((a) => h('div', { class: 'between small' },
          h('span', {}, `${a.nom} : D ${a.D} / G ${a.G}`),
          h('span', { class: 'tag ' + (a.niveau === 'prioritaire' ? 'terre' : 'acc') }, `${a.niveau} · côté ${a.faible}`))) : h('p', { class: 'small muted' }, 'Aucune asymétrie d\'au moins 1 niveau.')),
      h('div', { class: 'card stack' },
        h('span', { class: 'label' }, 'Priorités du générateur (niveau ≤ 2)'),
        r.priorites.length ? h('p', { class: 'small' }, [...new Set(r.priorites.map((p) => labelZone(p.zone) + (p.cote ? ' ' + p.cote : '')))].join(', '))
          : h('p', { class: 'small muted' }, 'Aucune zone à 2 ou moins : les hanches restent la priorité par défaut.')),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn', onclick: () => { B.etape = TESTS.length - 1; dessiner(); } }, 'Corriger'),
        h('button', { class: 'btn primary', onclick: () => enregistrer(r) }, 'Enregistrer')),
    );
  }

  async function enregistrer(r) {
    const t = { id: 't' + Date.now().toString(36), date: iso(), notes: B.notes, zones: r.zones, global: r.global, asymetries: r.asymetries.length };
    state.tests.push(t);
    try { await sauver('tests'); } catch (e) { toast('Erreur : ' + e.message); return; }
    B = null;
    toast('Test enregistré : priorités du générateur mises à jour');
    location.hash = '#/historique';
  }

  dessiner();
}

/** Fichier .ics : rappel récurrent le dernier dimanche du mois à 10 h. */
export function rappelIcs() {
  const d = lastSundayOfMonth(iso()).replace(/-/g, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Coach Mobilite//FR', 'BEGIN:VEVENT',
    `UID:test-mobilite-${d}@coach-mobilite`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${d}T100000`, 'DURATION:PT15M', 'RRULE:FREQ=MONTHLY;BYDAY=-1SU', 'SUMMARY:Test de mobilité mensuel',
    'DESCRIPTION:12 tests notés de 1 à 5 dans Coach Mobilité (10–12 min).',
    'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Test de mobilité', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  telecharger('rappel-test-mobilite.ics', ics, 'text/calendar');
}
