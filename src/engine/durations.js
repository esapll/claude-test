// Calcul des durées : répartit le budget de temps par pas de 5 s pour que
// la séance tombe pile sur la durée demandée, transitions comprises.

export const TRANSITION = 10; // secondes
export const PAS = 5;

/**
 * Bornes de durée (en secondes, par côté) pour une étape.
 * @param {object} ex exercice de la bibliothèque
 * @param {object} ctx contexte de génération
 */
export function bornesEtape(ex, ctx) {
  const act = ctx.activation;
  if (ex.role === 'ouverture') return [45, 180];
  if (ex.role === 'cloture') return [60, 300];
  let b;
  switch (ex.t) {
    case 'roll': b = [30, 45]; break; // règle 7 : 30–45 s par zone
    case 'stat': b = act ? [20, 55] : ctx.objectif === 'mob' ? [30, 90] : [30, 120]; break;
    case 'force': b = act ? [20, 45] : [30, 60]; break;
    default: b = act ? [30, 60] : [30, 90];
  }
  if (ctx.douleur && ex.z.includes(ctx.douleur.zone) && ex.t !== 'roll') b = [b[0], Math.min(b[1], 60)];
  return b;
}

export function nominalEtape(ex, ctx) {
  if (ex.role === 'ouverture') return 75;
  if (ex.role === 'cloture') return 120;
  if (ctx.activation) return 40;
  return { roll: 40, stat: 60, force: 45, dyn: 50 }[ex.t] || 50;
}

/**
 * Remplit les durées des unités. Une unité :
 *  - { kind:'single', step, min, max }
 *  - { kind:'pair', light, heavy, xmin, xmax, omin, omax }
 *    côté léger = x, côté lourd = x + o.
 * Retourne 'ok', 'trop' (le minimum dépasse le budget) ou 'pas-assez'.
 */
export function remplir(units, budget) {
  let rem = budget;
  for (const u of units) {
    if (u.kind === 'single') { u.v = u.min; rem -= u.v; }
    else { u.x = u.xmin; u.o = u.omin; rem -= 2 * u.x + u.o; }
  }
  if (rem < 0) return 'trop';
  let progress = true;
  while (rem > 0 && progress) {
    progress = false;
    for (const u of units) {
      if (rem <= 0) break;
      if (u.kind === 'single') {
        if (u.v < u.max) { u.v += PAS; rem -= PAS; progress = true; }
      } else if (u.x < u.xmax && rem >= 2 * PAS) {
        u.x += PAS; rem -= 2 * PAS; progress = true;
      } else if (u.asym && u.o < u.omax) {
        u.o += PAS; rem -= PAS; progress = true;
      }
    }
  }
  // Reste de 5 s : on l'attribue au côté « lourd » d'une paire.
  if (rem === PAS) {
    const p = units.find((u) => u.kind === 'pair' && u.o < u.omax);
    if (p) { p.o += PAS; rem = 0; }
  }
  if (rem !== 0) return 'pas-assez';
  for (const u of units) {
    if (u.kind === 'single') u.step.sec = u.v;
    else { u.light.sec = u.x; u.heavy.sec = u.x + u.o; }
  }
  return 'ok';
}

/** Durée totale d'une séance (étapes + transitions). */
export function dureeTotale(blocks) {
  let t = 0;
  for (const b of blocks) for (const s of b.steps) t += s.sec + (s.chain ? 0 : TRANSITION);
  return t;
}
export function nbTransitions(blocks) {
  let n = 0;
  for (const b of blocks) for (const s of b.steps) if (!s.chain) n++;
  return n;
}
