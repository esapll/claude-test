// Générateur de séance : sélectionne les exercices selon le profil, les règles
// de coaching et l'historique, puis ajuste les durées pour tomber pile.
import { bornesEtape, nominalEtape, remplir, TRANSITION, nbTransitions, dureeTotale } from './durations.js';
import { minutesRotExtSemaine, seancesForceSemaine, usagesRecents, OBJECTIFS, labelZone } from './stats.js';
import { iso } from './dates.js';

export { OBJECTIFS };
export const ALERTE_DOULEUR = "Si la douleur irradie ou s'accompagne de fourmillements, arrête la séance et consulte.";

// ---------- Aléatoire reproductible ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let uidN = 0;
const uid = () => 'b' + Date.now().toString(36) + (uidN++).toString(36);

// ---------- Analyse du sport du jour ----------
const RE_JAMBES = /squat|step.?up|fente|lunge|deadlift|soulev|thruster|wall.?ball|pistol|box|clean/i;

export function analyseWod(wod = '') {
  const zones = new Set(), cibles = new Set(), lu = [];
  if (/overhead|ohs|snatch|arraché|jerk|press|développé|thruster|handstand|hspu|wall.?ball|pull.?up|traction|toes.?to.?bar|t2b|muscle.?up/i.test(wod)) {
    zones.add('epaules'); zones.add('bras'); zones.add('thorax'); cibles.add('poignets'); cibles.add('hautdos'); lu.push('overhead → épaules et poignets');
  }
  if (/squat|thruster|wall.?ball|lunge|fente|pistol|step.?up|box|clean|épaulé/i.test(wod)) {
    zones.add('hanches'); zones.add('jambes'); cibles.add('chevilles'); cibles.add('adducteurs'); lu.push('squats → hanches et chevilles');
  }
  if (/deadlift|soulev|rdl|swing|kb|good.?morning|row|rameur/i.test(wod)) {
    zones.add('post'); zones.add('dos'); cibles.add('ischios'); cibles.add('fessiers'); lu.push('tirage / charnière → chaîne postérieure');
  }
  if (/run|course|burpee|double.?under|du\b|corde|jump/i.test(wod)) {
    zones.add('jambes'); cibles.add('mollets'); lu.push('course / sauts → mollets');
  }
  if (!lu.length) { zones.add('hanches'); zones.add('epaules'); zones.add('jambes'); lu.push('WOD non détaillé → hanches, épaules, jambes'); }
  return { zones: [...zones], cibles: [...cibles], lu, jambesLourdes: RE_JAMBES.test(wod) };
}

function cibleSport(sport) {
  if (!sport || !sport.type) return { zones: [], cibles: [], lu: [] };
  switch (sport.type) {
    case 'course': return { zones: ['jambes', 'post', 'hanches'], cibles: ['mollets', 'ischios', 'flechisseurs'], lu: ['course → mollets, ischios, fléchisseurs de hanche'] };
    case 'velo': return { zones: ['hanches', 'jambes', 'thorax'], cibles: ['flechisseurs', 'quadriceps', 'hautdos'], lu: ['vélo → fléchisseurs, quadriceps, haut du dos'] };
    case 'natation': return { zones: ['epaules', 'thorax', 'cou'], cibles: ['hautdos'], lu: ['natation → épaules, thorax'] };
    case 'crossfit': return analyseWod(sport.wod || '');
    default: return { zones: [], cibles: [], lu: [] };
  }
}

// Zones des tests → zones de la bibliothèque
export const ZONES_TEST_VERS_BIBLIO = {
  epaules: ['epaules'], overhead: ['epaules', 'thorax'], thorax: ['thorax'],
  hanches: ['hanches'], chaine: ['post'], chevilles: ['jambes'],
};

// ---------- Contexte ----------
export function contexte(input, library, journal = []) {
  const objectif = input.objectif;
  const activation = objectif === 'course' || objectif === 'velo';
  const moment = input.moment || 'matin';
  const passif = moment === 'soir' && !activation; // règle 2
  const c = { ...(input.contraintes || {}) };
  const date = input.date || iso();
  const sport = input.sport && input.sport.type ? input.sport : null;
  const cs = cibleSport(sport);
  const jambesLourdes = !!(sport && (sport.jambesLourdes || (sport.type === 'crossfit' && cs.jambesLourdes)));
  const priorites = (input.priorites || []).flatMap((p) =>
    (ZONES_TEST_VERS_BIBLIO[p.zone] || [p.zone]).map((z) => ({ zone: z, cote: p.cote || null, source: p.zone })));
  return {
    objectif, activation, moment, passif, date, contraintes: c,
    douleur: input.douleur && input.douleur.zone ? input.douleur : null,
    sport, zonesSport: cs.zones, ciblesSport: cs.cibles, lectureSport: cs.lu || [],
    jambesLourdes,
    kettlebellOk: !passif && !jambesLourdes && !c.sansMateriel,
    priorites,
    doseFaite: minutesRotExtSemaine(journal, library, date),
    forceSemaine: seancesForceSemaine(journal, library, date),
    usages: Object.fromEntries(usagesRecents(journal, library, date)),
    facteur: 1,
  };
}

// ---------- Filtres ----------
export function respecteContraintes(ex, ctx) {
  const c = ctx.contraintes;
  if (c.sansMateriel && ex.materiel !== 'aucun' && ex.role !== 'cloture') return false;
  if (c.sansMateriel && ex.materiel === 'mur' && ex.role === 'cloture') return false;
  if (c.sansRouleau && ex.materiel === 'rouleau') return false;
  if (c.sansMur && ex.materiel === 'mur') return false;
  if (c.sansFlexion && ex.flexion) return false;
  if (ex.materiel === 'banc') return false; // pas de banc dans le profil
  if (ex.materiel === 'kettlebell' && !ctx.kettlebellOk) return false;
  if (ctx.passif && (ex.actif || ex.t === 'force')) return false; // règle 2
  if (ctx.douleur && ex.z.includes(ctx.douleur.zone) && (ex.actif || ex.t === 'force')) return false; // règle 9
  return true;
}

export function admissible(ex, ctx) {
  if (ex.interne || ex.role) return false;
  if (!respecteContraintes(ex, ctx)) return false;
  const o = ex.o || [];
  switch (ctx.objectif) {
    case 'course': case 'velo':
      return (ex.activation || []).includes(ctx.objectif) && (ex.t === 'dyn' || ex.t === 'force'); // règle 8
    case 'relax':
      return o.includes('relax') && ex.t !== 'force' && !ex.actif;
    case 'post':
      return (o.includes('post') || (o.includes('relax') && ex.t === 'stat')) && ex.t !== 'force' && !ex.actif;
    default:
      return o.includes('mob') || (ctx.passif && o.includes('relax'));
  }
}

// ---------- Score ----------
function score(ex, ctx, choisis, rand) {
  let s = 1 + 1.2 * rand();
  if (ex.p) s += 1;
  if (ex.z.includes('hanches')) s += ctx.activation ? 0.3 : 1; // zone prioritaire du profil
  for (const p of ctx.priorites) if (ex.z.includes(p.zone)) s += 1.5;
  for (const z of ctx.zonesSport) if (ex.z.includes(z)) s += 1;
  for (const c of ctx.ciblesSport) if ((ex.cibles || []).includes(c)) s += 2.5;
  if (ctx.douleur && ex.z.includes(ctx.douleur.zone)) s += 2;
  if (ctx.objectif === 'relax' && ex.t === 'stat') s += 0.5; // préférence statique pour la détente
  const nRot = choisis.filter((b) => b.rotExt).length;
  if (ex.rotExt && !ctx.activation && ctx.doseFaite < 10) s += Math.max(0, 1.8 - 0.9 * nRot); // règle 5
  if (ex.t === 'roll') s -= 0.5; // le rouleau n'est pas le levier principal
  s -= Math.min(1.5, 0.35 * (ctx.usages[ex.id] || 0)); // varier
  for (const b of choisis) {
    const partage = ex.z.filter((z) => (b.z || []).includes(z));
    for (const z of partage) s -= z === 'hanches' ? 0.55 : 0.9;
    for (const c of ex.cibles || []) if ((b.cibles || []).includes(c)) s -= 0.6;
    if (b.t === ex.t && ex.t === 'roll') s -= 2;
  }
  return s;
}

// ---------- Blocs ----------
function bloc(ex, extra = {}) {
  const steps = ex.cotes
    ? [{ side: 'D', sec: 0, chain: false }, { side: 'G', sec: 0, chain: false }]
    : [{ side: null, sec: 0, chain: false }];
  return {
    uid: uid(), kind: 'simple', exId: ex.id, nom: ex.n, t: ex.t, z: ex.z, role: ex.role || null,
    consigne: ex.c, materiel: ex.materiel, actif: ex.actif, rotExt: ex.rotExt, cibles: ex.cibles || [], steps, ...extra,
  };
}

function blocProtocole(byId) {
  const pa = byId.get('9090-passif'), pi = byId.get('9090-pails'), ra = byId.get('9090-rails');
  const steps = [];
  for (const side of ['D', 'G']) {
    steps.push({ side, sec: 0, chain: false, exId: pa.id, label: '90/90 passif + respiration', consigne: pa.c, part: 'passif' });
    steps.push({ side, sec: 20, chain: true, exId: pi.id, label: 'PAILs : presse le sol, 0 → 100 %', consigne: pi.c, part: 'pails' });
    steps.push({ side, sec: 15, chain: true, exId: ra.id, label: 'RAILs : décolle genou et tibia', consigne: ra.c, part: 'rails' });
  }
  return {
    uid: uid(), kind: 'protocole', exId: '9090-passif', nom: 'Protocole 90/90 : passif → PAILs → RAILs',
    t: 'stat', z: ['hanches'], role: 'protocole', actif: true, rotExt: true, cibles: [], materiel: 'aucun',
    consigne: "Enchaîné sans pause sur chaque côté : tenue passive, puis contraction en poussant le sol (PAILs), puis contraction pour gagner en amplitude (RAILs). D = jambe droite devant.",
    steps,
  };
}

function rang(b, ctx) {
  if (b.role === 'ouverture') return 0;
  if (b.role === 'cloture') return 99;
  if (b.role === 'protocole') return 30;
  if (b.role === 'liftoff') return 35;
  if (b.role === 'force') return 40;
  if (b.t === 'roll') return 10;
  if (ctx.activation) return b.t === 'force' ? 28 : b.actif ? 25 : 20;
  if (b.t === 'dyn') return b.actif ? 45 : 20;
  if (b.t === 'force') return 50;
  return 60;
}

function unites(b, ctx, byId, facteur) {
  if (b.kind === 'protocole') {
    const [dP, , , gP] = b.steps;
    return [
      { kind: 'pair', light: gP, heavy: dP, xmin: 45, xmax: Math.round(90 * facteur / 5) * 5, omin: 15, omax: 30, asym: true },
      ...b.steps.filter((s) => s.part !== 'passif').map((s) => ({ kind: 'single', step: s, min: s.sec, max: s.sec })),
    ];
  }
  const ex = byId.get(b.exId);
  const [mn, mx0] = bornesEtape(ex, ctx);
  const mx = ex.t === 'roll' ? mx0 : Math.max(mn, Math.round((mx0 * facteur) / 5) * 5);
  if (b.steps.length === 1) return [{ kind: 'single', step: b.steps[0], min: mn, max: mx }];
  const [d, g] = b.steps;
  const pair = (heavy, light, omin, omax, asym, xmin = mn, xmax = mx) => ({ kind: 'pair', heavy, light, xmin, xmax, omin, omax, asym });
  if (ex.role === 'liftoff') return [pair(g, d, 15, 15, false, 25, 25)]; // 5 × 5 s à droite, 40 s à gauche
  const hanches = ex.z.includes('hanches');
  if (hanches && ex.t === 'stat' && !ctx.activation) return [pair(d, g, 15, 30, true)]; // règle 4 : passif côté droit
  if (hanches && (ex.actif || ex.t === 'force')) return [pair(g, d, 5, 15, true)]; // règle 4 : actif côté gauche
  const prio = ctx.priorites.find((p) => p.cote && ex.z.includes(p.zone));
  if (prio) return prio.cote === 'G' ? [pair(g, d, 10, 15, true)] : [pair(d, g, 10, 15, true)];
  return [ex.actif ? pair(g, d, 0, 5, false) : pair(d, g, 0, 5, false)];
}

function ordonner(blocks, ctx) {
  return blocks.map((b, i) => [b, i]).sort((x, y) => rang(x[0], ctx) - rang(y[0], ctx) || x[1] - y[1]).map((x) => x[0]);
}

/** Ajuste les durées d'une liste de blocs. Retourne { r, facteur }. */
export function ajusterDurees(blocks, ctx, byId, budgetSec, facteurMax = 1) {
  const net = budgetSec - TRANSITION * nbTransitions(blocks);
  let f = ctx.facteur || 1, r;
  for (;;) {
    r = remplir(blocks.flatMap((b) => unites(b, ctx, byId, f)), net);
    if (r !== 'pas-assez' || f >= facteurMax) break;
    f = Math.min(facteurMax, f * 1.25);
  }
  return { r, facteur: f };
}

function nominal(blocks, ctx, byId) {
  let t = 0;
  for (const b of blocks) {
    const ex = byId.get(b.exId);
    for (const s of b.steps) t += (s.chain ? s.sec : s.sec || nominalEtape(ex, ctx)) + (s.chain ? 0 : TRANSITION);
  }
  return t;
}

// ---------- Génération ----------
export function generer(input, library, journal = [], opts = {}) {
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const rand = rng(seed);
  const ctx = contexte(input, library, journal);
  const byId = new Map(library.map((e) => [e.id, e]));
  const budget = Math.round(input.duree) * 60;
  const c = ctx.contraintes;
  const maxEx = c.maxExercices ? Math.max(2, c.maxExercices) : Infinity;
  const alertes = [], notes = [];

  // Blocs imposés (ouverture, protocole, force, clôture), du plus au moins indispensable.
  const fixes = [];
  const optionnels = [];
  const add = (ex, opt = true, extra) => {
    if (!ex) return null;
    const b = bloc(ex, extra);
    fixes.push(b);
    if (opt) optionnels.push(b);
    return b;
  };
  const ritualSoir = !ctx.activation && (ctx.passif || ctx.objectif === 'relax');
  if (ritualSoir) {
    add(byId.get('respiration-ventrale'), false);
    const mur = byId.get('jambes-au-mur');
    add(respecteContraintes(mur, ctx) ? mur : byId.get('respiration-jambes-surelevees'), false);
  }
  const douleurHanche = ctx.douleur && ['hanches', 'jambes'].includes(ctx.douleur.zone);
  if (ctx.objectif === 'mob' && !ctx.passif) {
    if (input.duree >= 10 && !douleurHanche) {
      const p = blocProtocole(byId);
      fixes.push(p); optionnels.push(p);
      if (input.duree >= 12) add(library.find((e) => e.role === 'liftoff'));
    }
    if (input.duree >= 12 && ctx.forceSemaine < 2 && !douleurHanche) { // règle 6
      if (ctx.kettlebellOk) {
        add(byId.get('goblet-squat-tenu'));
        add(byId.get('cossack-leste'));
      } else {
        add(byId.get('yogi-squat'), true, { role: 'force', poidsDuCorps: true });
        add(byId.get('cossack-squat'), true, { role: 'force', poidsDuCorps: true });
      }
      notes.push(ctx.kettlebellOk
        ? `Force en fin d'amplitude : séance ${ctx.forceSemaine + 1} sur 2 cette semaine.`
        : `Force en fin d'amplitude au poids du corps${ctx.jambesLourdes ? ' (jambes lourdes récemment)' : ''}.`);
    }
  }
  if (ctx.objectif === 'mob' && ctx.passif && input.duree >= 8) add(byId.get('9090-passif'));
  while (fixes.length > maxEx && optionnels.length) {
    const b = optionnels.pop();
    fixes.splice(fixes.indexOf(b), 1);
  }

  // Candidats
  const dejaPris = new Set(fixes.map((b) => b.exId));
  const pool = library.filter((e) => !dejaPris.has(e.id) && admissible(e, ctx));
  const rollMax = ctx.activation ? 0 : ctx.objectif === 'mob' ? 1 : 2;
  const choisis = [];
  const scores = new Map();
  const meilleur = () => {
    const tous = [...fixes, ...choisis];
    const nRoll = tous.filter((b) => b.t === 'roll').length;
    let best = null, bs = -Infinity;
    for (const e of pool) {
      if (tous.some((b) => b.exId === e.id)) continue;
      if (e.t === 'roll' && nRoll >= rollMax) continue;
      const s = score(e, ctx, tous, rand);
      if (s > bs) { bs = s; best = e; }
    }
    if (best) scores.set(best.id, bs);
    return best;
  };
  const ajouter = () => {
    if (fixes.length + choisis.length >= maxEx) return false;
    const e = meilleur();
    if (!e) return false;
    choisis.push(bloc(e, { douleur: !!(ctx.douleur && e.z.includes(ctx.douleur.zone)) }));
    return true;
  };
  while (nominal([...fixes, ...choisis], ctx, byId) < budget) if (!ajouter()) break;

  // Ajustement : ajoute ou retire des exercices jusqu'à ce que les durées tombent pile.
  let res, blocks, plusDAjout = false;
  for (let i = 0; i < 80; i++) {
    blocks = ordonner([...fixes, ...choisis], ctx);
    res = ajusterDurees(blocks, ctx, byId, budget, plusDAjout ? 16 : 1);
    if (res.r === 'ok') break;
    if (res.r === 'trop') {
      plusDAjout = true;
      if (choisis.length) {
        let w = 0;
        choisis.forEach((b, j) => { if ((scores.get(b.exId) ?? 0) < (scores.get(choisis[w].exId) ?? 0)) w = j; });
        choisis.splice(w, 1);
      } else if (optionnels.length) {
        const b = optionnels.pop();
        fixes.splice(fixes.indexOf(b), 1);
      } else break;
    } else if (plusDAjout || !ajouter()) {
      plusDAjout = true;
    }
  }
  if (res.r !== 'ok') throw new Error(`Impossible d'ajuster la séance (${res.r})`);
  ctx.facteur = res.facteur;

  // Messages
  if (ctx.douleur) {
    alertes.push(`Zone sensible (${labelZone(ctx.douleur.zone)}${ctx.douleur.cote ? ' ' + ctx.douleur.cote : ''}) : pression douce, amplitude réduite. ${ALERTE_DOULEUR}`);
  }
  if (ctx.lectureSport.length) notes.push('Adapté au sport : ' + ctx.lectureSport.join(' ; ') + '.');
  if (ctx.priorites.length) notes.push('Priorités du dernier test : ' + [...new Set(ctx.priorites.map((p) => labelZone(p.source) + (p.cote ? ' ' + p.cote : '')))].join(', ') + '.');
  const rotSec = secRotExt(blocks, byId);
  if (!ctx.activation) notes.push(`Rotation externe de hanche : ${ctx.doseFaite} min cette semaine (objectif 10–15), cette séance en apporte ${Math.round(rotSec / 60 * 10) / 10} min.`);
  if (ctx.passif) notes.push('Séance du soir : uniquement du passif, sans contraction ni charge.');

  return {
    id: 's' + Date.now().toString(36),
    creeLe: new Date().toISOString(),
    seed,
    params: JSON.parse(JSON.stringify(input)),
    ctx,
    duree: input.duree,
    blocks,
    alertes,
    notes,
    totalSec: dureeTotale(blocks),
  };
}

export function secRotExt(blocks, byId) {
  let t = 0;
  for (const b of blocks) for (const s of b.steps) if (byId.get(s.exId || b.exId)?.rotExt) t += s.sec;
  return t;
}

// ---------- Remplacement ----------
export function alternatives(session, uidBloc, library) {
  const b = session.blocks.find((x) => x.uid === uidBloc);
  if (!b || b.kind === 'protocole') return [];
  const ctx = session.ctx;
  const ex = library.find((e) => e.id === b.exId);
  const pris = new Set(session.blocks.map((x) => x.exId));
  return library.filter((a) => {
    if (pris.has(a.id) || a.interne) return false;
    if (b.role === 'ouverture' || b.role === 'cloture' || b.role === 'liftoff') return a.role === b.role && respecteContraintes(a, ctx);
    if (b.role === 'force') return a.t === 'force' && !a.role && respecteContraintes(a, ctx) && (ctx.objectif === 'mob') && a.z.some((z) => b.z.includes(z));
    return admissible(a, ctx) && a.t === ex.t && a.z.some((z) => ex.z.includes(z));
  }).sort((x, y) => (y.z[0] === ex.z[0]) - (x.z[0] === ex.z[0]) || y.p - x.p);
}

/** Remplace un bloc par une alternative de même zone et même type, puis recalcule les durées. */
export function remplacer(session, uidBloc, library) {
  const byId = new Map(library.map((e) => [e.id, e]));
  const i = session.blocks.findIndex((x) => x.uid === uidBloc);
  if (i < 0) return null;
  const ancien = session.blocks[i];
  const essais = [...(ancien.essais || []), ancien.exId];
  let alts = alternatives(session, uidBloc, library);
  const neufs = alts.filter((a) => !essais.includes(a.id));
  if (neufs.length) alts = neufs; else if (!alts.length) return null;
  const ctx = { ...session.ctx, facteur: 1 };
  for (const a of alts) {
    const nb = bloc(a, { role: ancien.role === 'force' ? null : ancien.role, essais: neufs.length ? essais : [], douleur: !!(ctx.douleur && a.z.includes(ctx.douleur.zone)) });
    if (ancien.role === 'force') nb.role = 'force';
    const blocks = session.blocks.map((x, j) => (j === i ? nb : x)).map((x) => ({ ...x, steps: x.steps.map((s) => ({ ...s })) }));
    const res = ajusterDurees(blocks, ctx, byId, session.duree * 60, 16);
    if (res.r === 'ok') {
      return { ...session, blocks, ctx: { ...ctx, facteur: res.facteur }, totalSec: dureeTotale(blocks) };
    }
  }
  return null;
}
