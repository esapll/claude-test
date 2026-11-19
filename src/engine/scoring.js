// Calcul des scores du test mensuel (échelle 1–5).
import { TESTS, ZONES_TEST } from '../data/tests.js';

/**
 * notes : { [testId]: { D, G } | { v } }
 */
export function scoresTest(notes) {
  const zones = {};
  for (const z of Object.keys(ZONES_TEST)) {
    const vals = [];
    for (const t of TESTS.filter((t) => t.zone === z)) {
      const n = notes[t.id];
      if (!n) continue;
      if (t.bilateral) { if (n.D) vals.push(n.D); if (n.G) vals.push(n.G); }
      else if (n.v) vals.push(n.v);
    }
    zones[z] = vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }
  const zv = Object.values(zones).filter((v) => v != null);
  const global = zv.length ? round(zv.reduce((a, b) => a + b, 0) / zv.length) : null;
  return { zones, global, asymetries: asymetries(notes), priorites: priorites(notes) };
}

export function asymetries(notes) {
  const out = [];
  for (const t of TESTS.filter((t) => t.bilateral)) {
    const n = notes[t.id];
    if (!n || !n.D || !n.G) continue;
    const ecart = Math.abs(n.D - n.G);
    if (ecart >= 1) out.push({
      testId: t.id, nom: t.nom, zone: t.zone, D: n.D, G: n.G, ecart,
      faible: n.D < n.G ? 'D' : 'G',
      niveau: ecart >= 2 ? 'prioritaire' : 'à surveiller',
    });
  }
  return out.sort((a, b) => b.ecart - a.ecart);
}

/** Zones et côtés de niveau ≤ 2 : priorités du générateur. */
export function priorites(notes) {
  const out = [];
  for (const t of TESTS) {
    const n = notes[t.id];
    if (!n) continue;
    if (t.bilateral) {
      for (const c of ['D', 'G']) if (n[c] && n[c] <= 2) out.push({ zone: t.zone, cote: c, testId: t.id });
    } else if (n.v && n.v <= 2) out.push({ zone: t.zone, cote: null, testId: t.id });
  }
  return out;
}

const round = (x) => Math.round(x * 10) / 10;
