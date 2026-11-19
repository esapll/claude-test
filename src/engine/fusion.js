// Fusion de deux copies des données (appareil local / Gist distant).
// Règles : union par id, la version la plus récente (`maj`) gagne,
// une suppression (pierre tombale) l'emporte si elle est plus récente que l'élément.

export const CLES_SYNC = ['journal', 'tests', 'exercicesPerso', 'gowod', 'reglages', 'supprimes'];

function fusionListe(a = [], b = [], supprimes = {}, cle = (x) => x.id) {
  const m = new Map();
  for (const x of [...a, ...b]) {
    const k = cle(x);
    if (k == null) continue;
    const prev = m.get(k);
    if (!prev || (x.maj || 0) > (prev.maj || 0)) m.set(k, x);
  }
  return [...m.values()].filter((x) => !(supprimes[cle(x)] && supprimes[cle(x)] >= (x.maj || 0)));
}

export function fusionner(local = {}, distant = {}) {
  const supprimes = { ...(distant.supprimes || {}) };
  for (const [k, t] of Object.entries(local.supprimes || {})) supprimes[k] = Math.max(t, supprimes[k] || 0);
  const rl = local.reglages || {}, rd = distant.reglages || {};
  return {
    journal: fusionListe(local.journal, distant.journal, supprimes).sort((x, y) => x.date.localeCompare(y.date)),
    tests: fusionListe(local.tests, distant.tests, supprimes).sort((x, y) => x.date.localeCompare(y.date)),
    exercicesPerso: fusionListe(local.exercicesPerso, distant.exercicesPerso, supprimes),
    gowod: fusionListe(local.gowod, distant.gowod, {}, (x) => x.date),
    reglages: (rd.maj || 0) > (rl.maj || 0) ? { ...rl, ...rd } : { ...rd, ...rl },
    supprimes,
  };
}

/** Empreinte stable pour savoir si quelque chose a changé. */
export function empreinte(d) {
  return JSON.stringify(CLES_SYNC.map((k) => d[k] ?? null));
}
