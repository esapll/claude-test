import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIBLIOTHEQUE, BIBLIOTHEQUE_IMPORTEE } from '../src/data/bibliotheque.js';
import donnees from '../src/data/donnees-initiales.js';
import { generer, remplacer, rng } from '../src/engine/generator.js';
import { deroule, dureeDeroule, resumeSeance } from '../src/engine/timeline.js';
import { dureeTotale, TRANSITION } from '../src/engine/durations.js';
import { objectifKey, tableauDeBord, serieSemaines, bilanMensuel, compteParExercice } from '../src/engine/stats.js';
import { scoresTest } from '../src/engine/scoring.js';
import { TESTS } from '../src/data/tests.js';

const OBJ = ['relax', 'mob', 'post', 'course', 'velo'];
const MOMENTS = ['matin', 'soir'];
const journal = donnees.seances.map((s, i) => ({ id: 'i' + i, ...s, objectif: objectifKey(s.objectif) }));
const byId = new Map(BIBLIOTHEQUE.map((e) => [e.id, e]));
const exOf = (b) => b.steps.map((s) => byId.get(s.exId || b.exId));

test('données : 73 exercices, 20 séances, 2 tests GOWOD, ids uniques', () => {
  assert.equal(BIBLIOTHEQUE_IMPORTEE.length, 73);
  assert.equal(donnees.seances.length, 20);
  assert.equal(donnees.testsGowod.length, 2);
  assert.equal(new Set(BIBLIOTHEQUE.map((e) => e.id)).size, BIBLIOTHEQUE.length);
  for (const e of BIBLIOTHEQUE) {
    assert.ok(['aucun', 'rouleau', 'kettlebell', 'mur', 'banc'].includes(e.materiel), e.n);
    assert.equal(typeof e.cotes, 'boolean');
    assert.equal(typeof e.actif, 'boolean');
  }
  assert.equal(TESTS.length, 12);
});

test('durée exacte pour toutes les combinaisons objectif × durée × moment', () => {
  for (const objectif of OBJ) for (const moment of MOMENTS) for (let duree = 5; duree <= 30; duree++) {
    for (const seed of [1, 2, 3]) {
      const s = generer({ objectif, moment, duree, date: '2026-11-19' }, BIBLIOTHEQUE, journal, { seed });
      assert.equal(dureeTotale(s.blocks), duree * 60, `${objectif}/${moment}/${duree}`);
      assert.equal(dureeDeroule(deroule(s)), duree * 60);
      for (const b of s.blocks) for (const st of b.steps) {
        assert.equal(st.sec % 5, 0);
        assert.ok(st.sec >= 15, `${b.nom} ${st.sec}s`);
      }
    }
  }
});

test('durée exacte avec contraintes, douleur et sport aléatoires', () => {
  const r = rng(42);
  const zones = ['hanches', 'dos', 'epaules', 'jambes', 'cou', 'thorax'];
  const sports = [null, { type: 'course' }, { type: 'velo' }, { type: 'natation' }, { type: 'crossfit', wod: '21-15-9 thrusters, pull-ups' }, { type: 'crossfit', wod: 'back squat 5x5, step-ups', quand: 'veille' }];
  for (let i = 0; i < 1500; i++) {
    const contraintes = {
      sansRouleau: r() < 0.4, sansMateriel: r() < 0.3, sansMur: r() < 0.3, sansFlexion: r() < 0.3,
      maxExercices: r() < 0.3 ? 3 + Math.floor(r() * 8) : undefined,
    };
    const input = {
      objectif: OBJ[Math.floor(r() * 5)], moment: MOMENTS[Math.floor(r() * 2)], duree: 5 + Math.floor(r() * 26), date: '2026-11-19',
      contraintes,
      douleur: r() < 0.3 ? { zone: zones[Math.floor(r() * zones.length)], cote: r() < 0.5 ? 'G' : 'D' } : null,
      sport: sports[Math.floor(r() * sports.length)],
      priorites: r() < 0.3 ? [{ zone: 'hanches', cote: 'G' }, { zone: 'chevilles', cote: null }] : [],
    };
    const s = generer(input, BIBLIOTHEQUE, journal, { seed: i });
    const ctx = JSON.stringify(input);
    assert.equal(dureeTotale(s.blocks), input.duree * 60, ctx);
    if (contraintes.maxExercices) assert.ok(s.blocks.length <= Math.max(2, contraintes.maxExercices), ctx);
    for (const b of s.blocks) for (const ex of exOf(b)) {
      if (contraintes.sansRouleau) assert.notEqual(ex.materiel, 'rouleau', ctx);
      if (contraintes.sansMateriel) assert.ok(ex.materiel === 'aucun' || (ex.materiel === 'mur' && false), `${ex.n} ${ctx}`);
      if (contraintes.sansMur) assert.notEqual(ex.materiel, 'mur', ctx);
      if (contraintes.sansFlexion) assert.ok(!ex.flexion, `${ex.n} ${ctx}`);
      if (input.douleur && ex.z.includes(input.douleur.zone)) assert.ok(!ex.actif && ex.t !== 'force', `${ex.n} ${ctx}`);
    }
    if (input.douleur) assert.ok(s.alertes.some((a) => a.includes('fourmillements')));
    // remplacement : le total reste exact
    const cible = s.blocks.find((b) => b.kind !== 'protocole');
    const s2 = remplacer(s, cible.uid, BIBLIOTHEQUE);
    if (s2) assert.equal(dureeTotale(s2.blocks), input.duree * 60, 'remplacer ' + ctx);
  }
});

test('aucun exercice actif le soir (hors activation avant sport), ouverture et clôture imposées', () => {
  for (const objectif of ['relax', 'mob', 'post']) for (let duree = 5; duree <= 30; duree++) {
    const s = generer({ objectif, moment: 'soir', duree }, BIBLIOTHEQUE, journal, { seed: duree });
    for (const b of s.blocks) for (const ex of exOf(b)) {
      assert.ok(!ex.actif, `${ex.n} actif le soir (${objectif} ${duree})`);
      assert.notEqual(ex.t, 'force');
      assert.notEqual(ex.materiel, 'kettlebell');
    }
    assert.equal(s.blocks[0].exId, 'respiration-ventrale');
    assert.ok(['jambes-au-mur', 'respiration-jambes-surelevees'].includes(s.blocks.at(-1).exId));
  }
});

test('matin mobilité : protocole 90/90 enchaîné, asymétrie D passif / G actif', () => {
  const s = generer({ objectif: 'mob', moment: 'matin', duree: 20 }, BIBLIOTHEQUE, [], { seed: 7 });
  const p = s.blocks.find((b) => b.kind === 'protocole');
  assert.ok(p);
  const [dP, dPa, dR, gP, gPa, gR] = p.steps;
  assert.deepEqual([dPa.sec, dR.sec, gPa.sec, gR.sec], [20, 15, 20, 15]);
  assert.ok(gP.sec >= 45 && gP.sec <= 90);
  assert.ok(dP.sec - gP.sec >= 15 && dP.sec - gP.sec <= 30, `${dP.sec} / ${gP.sec}`);
  assert.ok(dPa.chain && dR.chain && gPa.chain && gR.chain && !dP.chain && !gP.chain);
  const lift = s.blocks.find((b) => b.role === 'liftoff');
  assert.ok(lift && lift.steps[1].sec > lift.steps[0].sec);
  assert.ok(s.blocks.some((b) => b.exId === 'goblet-squat-tenu'));
});

test('force poids du corps après une séance de jambes lourde', () => {
  const s = generer({ objectif: 'mob', moment: 'matin', duree: 20, sport: { type: 'crossfit', wod: 'Back squat 5x5 + step-ups', quand: 'veille' } }, BIBLIOTHEQUE, [], { seed: 3 });
  for (const b of s.blocks) assert.notEqual(byId.get(b.exId).materiel, 'kettlebell');
  assert.ok(s.blocks.some((b) => b.role === 'force' && b.poidsDuCorps));
});

test('rouleau limité à 45 s, activation : dynamique uniquement', () => {
  for (let d = 5; d <= 30; d++) {
    const s = generer({ objectif: 'post', moment: 'matin', duree: d }, BIBLIOTHEQUE, journal, { seed: d });
    for (const b of s.blocks) if (b.t === 'roll') for (const st of b.steps) assert.ok(st.sec <= 45 && st.sec >= 30);
    for (const o of ['course', 'velo']) {
      const a = generer({ objectif: o, moment: 'matin', duree: d }, BIBLIOTHEQUE, journal, { seed: d });
      for (const b of a.blocks) assert.ok(['dyn', 'force'].includes(b.t), b.nom);
    }
  }
});

test('les étapes chain ne reçoivent pas de transition', () => {
  const s = generer({ objectif: 'mob', moment: 'matin', duree: 15 }, BIBLIOTHEQUE, [], { seed: 11 });
  const d = deroule(s);
  assert.ok(d.some((e) => e.chain));
  d.forEach((e, i) => {
    if (e.kind === 'exercice' && e.chain) assert.equal(d[i - 1].kind, 'exercice');
    if (e.kind === 'exercice' && !e.chain) assert.equal(d[i - 1].kind, 'transition');
    if (e.kind === 'transition') assert.equal(e.sec, TRANSITION);
  });
  const r = resumeSeance(s);
  assert.ok(r.contenu.length > 10 && r.exercices.length > 2);
});

test('tableau de bord, série et bilan', () => {
  const db = tableauDeBord(journal, '2026-11-19');
  assert.equal(db.total, 20);
  assert.equal(db.minutesMois, 40);
  assert.equal(db.resteMinutes, 80);
  assert.equal(db.semainesRestantes, 3); // 16–22, 23–29, 30 nov.
  assert.equal(db.resteParSemaine, 27);
  const j = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-16'].map((date) => ({ date, duree: 10 }));
  assert.equal(serieSemaines(j, '2026-11-19'), 2);
  const b = bilanMensuel(journal, BIBLIOTHEQUE, '2026-10');
  assert.equal(b.seances, 11);
  assert.ok(b.ressentis.length >= 1);
  assert.ok(b.reco.length >= 2);
  const c = compteParExercice(journal, BIBLIOTHEQUE);
  assert.ok(c.get('pigeon-stretch') >= 5);
});

test('scores du test 1–5 et asymétries', () => {
  const notes = Object.fromEntries(TESTS.map((t) => [t.id, t.bilateral ? { D: 3, G: 3 } : { v: 4 }]));
  notes['hanche-9090'] = { D: 2, G: 4 };
  notes['epaule-re'] = { D: 4, G: 3 };
  const r = scoresTest(notes);
  assert.equal(r.asymetries.length, 2);
  assert.equal(r.asymetries[0].niveau, 'prioritaire');
  assert.equal(r.asymetries[1].niveau, 'à surveiller');
  assert.deepEqual(r.priorites, [{ zone: 'hanches', cote: 'D', testId: 'hanche-9090' }]);
  assert.ok(r.global > 3 && r.global < 4);
});

test('le service worker met en cache tous les fichiers de l\'app', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(`${d}/${f}`).isDirectory() ? walk(`${d}/${f}`) : [`${d}/${f}`]));
  const root = new URL('..', import.meta.url).pathname;
  for (const dir of ['src', 'assets']) for (const f of walk(root + dir)) {
    const rel = f.slice(root.length);
    assert.ok(sw.includes(`"${rel}"`), `${rel} absent de sw.js`);
  }
});

test('fusion entre appareils : union, version la plus récente, suppressions', async () => {
  const { fusionner } = await import('../src/engine/fusion.js');
  const base = [{ id: 'imp0', date: '2026-09-20', duree: 9 }];
  const a = { journal: [...base, { id: 'a1', date: '2026-11-18', duree: 10, maj: 100 }, { id: 'x', date: '2026-11-10', duree: 5, maj: 50 }], supprimes: {}, reglages: { minutesParMois: 150, maj: 300 } };
  const b = { journal: [...base, { id: 'b1', date: '2026-11-19', duree: 12, maj: 200 }, { id: 'x', date: '2026-11-10', duree: 8, maj: 80 }], supprimes: { imp0: 150 }, reglages: { minutesParMois: 120, maj: 100 } };
  const f = fusionner(a, b);
  assert.deepEqual(f.journal.map((e) => e.id), ['x', 'a1', 'b1']);
  assert.equal(f.journal.find((e) => e.id === 'x').duree, 8);
  assert.equal(f.reglages.minutesParMois, 150);
  // une entrée modifiée après sa suppression est conservée
  const g = fusionner({ journal: [{ id: 'y', date: '2026-11-01', maj: 500 }] }, { journal: [], supprimes: { y: 400 } });
  assert.equal(g.journal.length, 1);
  // fusion idempotente
  assert.deepEqual(fusionner(f, f).journal, f.journal);
});
