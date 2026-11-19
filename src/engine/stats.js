// Statistiques du journal : tableau de bord, bilan mensuel, analyse de l'historique.
import { weekStart, weekEnd, addDays, monthKey, monthStart, monthEnd, inRange, parse, iso } from './dates.js';

export const OBJECTIFS = {
  relax: { label: 'Relaxation / avant le coucher', court: 'Relaxation' },
  mob: { label: 'Amélioration de la mobilité', court: 'Mobilité' },
  post: { label: 'Post-séance de sport', court: 'Post-séance' },
  course: { label: 'Activation avant course', court: 'Activation course' },
  velo: { label: 'Activation avant vélo', court: 'Activation vélo' },
};

/** Convertit un libellé d'objectif (import) en clé. */
export function objectifKey(label = '') {
  const l = label.toLowerCase();
  if (l.includes('relax')) return 'relax';
  if (l.includes('course')) return 'course';
  if (l.includes('vélo') || l.includes('velo')) return 'velo';
  if (l.includes('post')) return 'post';
  return 'mob';
}

const norm = (s) => (s || '').toLowerCase();

/** Exercices de la bibliothèque présents dans une entrée du journal. */
export function exercicesDeEntree(entry, library) {
  if (entry.exercices && entry.exercices.length) {
    const ids = new Set(entry.exercices.map((e) => e.id));
    return library.filter((ex) => ids.has(ex.id));
  }
  const txt = norm(entry.contenu);
  return library.filter((ex) => ex.k && txt.includes(norm(ex.k)));
}

export function compteParExercice(journal, library) {
  const m = new Map();
  for (const e of journal) for (const ex of exercicesDeEntree(e, library)) m.set(ex.id, (m.get(ex.id) || 0) + 1);
  return m;
}

export function entreesEntre(journal, a, b) {
  return journal.filter((e) => inRange(e.date, a, b));
}

/** Minutes de rotation externe de hanche dans la semaine de `date`. */
export function minutesRotExtSemaine(journal, library, date) {
  const byId = new Map(library.map((e) => [e.id, e]));
  let sec = 0;
  for (const e of entreesEntre(journal, weekStart(date), weekEnd(date))) {
    if (e.exercices && e.exercices.length) {
      for (const x of e.exercices) if (byId.get(x.id)?.rotExt) sec += x.sec || 0;
    } else {
      sec += exercicesDeEntree(e, library).filter((x) => x.rotExt).length * 90; // estimation
    }
  }
  return Math.round(sec / 60);
}

/** Nombre de séances de la semaine avec force en fin d'amplitude à la kettlebell. */
export function seancesForceSemaine(journal, library, date) {
  return entreesEntre(journal, weekStart(date), weekEnd(date)).filter((e) =>
    exercicesDeEntree(e, library).some((x) => x.role === 'force' && x.materiel === 'kettlebell')).length;
}

/** Nombre d'utilisations récentes (pour varier les séances). */
export function usagesRecents(journal, library, date, jours = 14) {
  return compteParExercice(entreesEntre(journal, addDays(date, -jours), date), library);
}

// ---------- Tableau de bord ----------

export function tableauDeBord(journal, date, objectifs = { seancesParSemaine: 3, minutesParMois: 120 }) {
  const semaine = entreesEntre(journal, weekStart(date), weekEnd(date));
  const mois = entreesEntre(journal, monthStart(date), monthEnd(date));
  const minutesMois = mois.reduce((t, e) => t + (Number(e.duree) || 0), 0);
  const resteMinutes = Math.max(0, objectifs.minutesParMois - minutesMois);
  // semaines restantes (partielles comprises) entre aujourd'hui et la fin du mois
  let semainesRestantes = 0;
  for (let w = weekStart(date); w <= monthEnd(date); w = addDays(w, 7)) semainesRestantes++;
  return {
    total: journal.length,
    semaine: semaine.length,
    objectifSemaine: objectifs.seancesParSemaine,
    minutesMois,
    objectifMois: objectifs.minutesParMois,
    resteMinutes,
    semainesRestantes,
    resteParSemaine: semainesRestantes ? Math.ceil(resteMinutes / semainesRestantes) : resteMinutes,
    serie: serieSemaines(journal, date, objectifs.seancesParSemaine),
  };
}

/** Semaines consécutives où l'objectif de séances est atteint. */
export function serieSemaines(journal, date, objectif = 3) {
  const parSemaine = new Map();
  for (const e of journal) { const w = weekStart(e.date); parSemaine.set(w, (parSemaine.get(w) || 0) + 1); }
  let w = weekStart(date);
  if ((parSemaine.get(w) || 0) < objectif) w = addDays(w, -7); // semaine en cours pas encore validée
  let n = 0;
  while ((parSemaine.get(w) || 0) >= objectif) { n++; w = addDays(w, -7); }
  return n;
}

// ---------- Bilan mensuel ----------

export function ressentiDe(entry) {
  if (entry.ressenti) return entry.ressenti;
  const m = /Ressenti\s*:\s*(.+)$/i.exec(entry.contenu || '');
  return m ? m[1].trim() : '';
}

const ZONES_SUIVIES = ['hanches', 'dos', 'thorax', 'epaules', 'cou', 'jambes', 'post', 'bras'];

export function bilanMensuel(journal, library, key, { priorites = [], objectifs = { seancesParSemaine: 3, minutesParMois: 120 } } = {}) {
  const a = key + '-01', b = monthEnd(a);
  const entrees = entreesEntre(journal, a, b).sort((x, y) => x.date.localeCompare(y.date));
  const minutes = entrees.reduce((t, e) => t + (Number(e.duree) || 0), 0);
  const parObjectif = {};
  for (const e of entrees) {
    const k = e.objectif || 'mob';
    parObjectif[k] = parObjectif[k] || { seances: 0, minutes: 0 };
    parObjectif[k].seances++; parObjectif[k].minutes += Number(e.duree) || 0;
  }
  const zones = Object.fromEntries(ZONES_SUIVIES.map((z) => [z, 0]));
  for (const e of entrees) for (const ex of exercicesDeEntree(e, library)) for (const z of ex.z) if (z in zones) zones[z]++;
  const zonesTriees = Object.entries(zones).sort((x, y) => y[1] - x[1]);
  const ressentis = entrees.map((e) => ({ date: e.date, texte: ressentiDe(e) })).filter((r) => r.texte);

  // semaines du mois avec l'objectif atteint
  const semaines = [];
  for (let w = weekStart(a); w <= b; w = addDays(w, 7)) {
    const n = entreesEntre(journal, w, addDays(w, 6)).length;
    semaines.push({ debut: w, seances: n, ok: n >= objectifs.seancesParSemaine });
  }

  const reco = [];
  const ratio = minutes / objectifs.minutesParMois;
  if (ratio >= 1) reco.push(`Objectif de ${objectifs.minutesParMois} min atteint (${minutes} min) : garde ce rythme, et vise la régularité plutôt que plus de volume.`);
  else reco.push(`${minutes} min sur ${objectifs.minutesParMois} : il a manqué ${objectifs.minutesParMois - minutes} min. Le mois prochain, cale ${Math.ceil(objectifs.minutesParMois / 4.3)} min par semaine, par exemple 3 séances de ${Math.ceil(objectifs.minutesParMois / 13)} min.`);
  const moins = zonesTriees.filter(([z]) => !['cou', 'bras'].includes(z)).slice(-2).map(([z]) => z);
  if (moins.length) reco.push(`Zones peu travaillées : ${moins.map(labelZone).join(' et ')}. Ajoute-les en cible dans le générateur.`);
  if (!parObjectif.mob || parObjectif.mob.seances < 4) reco.push('Prévois au moins une séance « Amélioration de la mobilité » le matin par semaine : protocole 90/90 et force en fin d\'amplitude.');
  if (priorites.length) reco.push(`Priorités du dernier test : ${[...new Set(priorites.map((p) => labelZone(p.zone) + (p.cote ? ' ' + p.cote : '')))].join(', ')}.`);
  else reco.push('Hanches toujours prioritaires : 10 à 15 min de rotation externe par semaine.');
  const douleurs = ressentis.filter((r) => /douleur|raideur|gêne|mal/i.test(r.texte));
  if (douleurs.length) reco.push(`Douleurs ou raideurs notées ${douleurs.length} fois : garde une amplitude réduite sur ces zones et consulte si ça persiste.`);

  return { key, entrees, minutes, seances: entrees.length, parObjectif, zones: zonesTriees, ressentis, semaines, reco };
}

export function labelZone(z) {
  return { hanches: 'hanches', dos: 'dos', thorax: 'thorax', epaules: 'épaules', cou: 'cou', jambes: 'jambes', post: 'chaîne postérieure', bras: 'bras', global: 'global', overhead: 'overhead', chaine: 'chaîne postérieure', chevilles: 'chevilles' }[z] || z;
}

export { iso, parse, monthKey };
