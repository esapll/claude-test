// Séance en cours de préparation (partagée entre Accueil, Générer et Minuteur).
import { state, sauver, bibliotheque, prioritesActuelles } from '../store.js';
import { generer, remplacer } from '../engine/generator.js';
import { iso, momentFromHour } from '../engine/dates.js';

export const courant = { params: null, session: null };

export function paramsParDefaut() {
  const moment = momentFromHour();
  const dp = state.reglages.derniersParams || {};
  return {
    duree: dp.duree || 12,
    objectif: moment === 'soir' ? 'relax' : 'mob',
    moment,
    contraintes: {},
    douleur: null,
    sport: null,
  };
}

export function preparer(params) {
  courant.params = { ...paramsParDefaut(), ...params };
  return regenerer();
}

export function regenerer() {
  const p = courant.params || (courant.params = paramsParDefaut());
  try {
    courant.session = generer({ ...p, date: iso(), priorites: prioritesActuelles() }, bibliotheque(), state.journal);
  } catch (e) {
    console.error(e);
    courant.session = null;
  }
  return courant.session;
}

export function remplacerBloc(uid) {
  if (!courant.session) return null;
  const s = remplacer(courant.session, uid, bibliotheque());
  if (s) courant.session = s;
  return s;
}

/** Mémorise la séance lancée et la combinaison de paramètres (raccourcis). */
export async function memoriserLancement() {
  const p = courant.params;
  state.derniereSeance = courant.session;
  state.reglages.derniersParams = { duree: p.duree };
  const cle = (x) => `${x.objectif}|${x.duree}|${Object.keys(x.contraintes || {}).filter((k) => x.contraintes[k]).sort().join(',')}`;
  const preset = { objectif: p.objectif, duree: p.duree, contraintes: { ...p.contraintes } };
  state.presets = [preset, ...state.presets.filter((x) => cle(x) !== cle(preset))].slice(0, 4);
  try { await sauver('derniereSeance', 'reglages', 'presets'); } catch (e) { console.warn(e); }
}
