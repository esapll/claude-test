// Stockage local : IndexedDB (repli localStorage), tout protégé par try/catch.
// L'état est chargé en mémoire au démarrage puis écrit à chaque modification.
import donnees from './data/donnees-initiales.js';
import { BIBLIOTHEQUE, exercicePerso } from './data/bibliotheque.js';
import { objectifKey } from './engine/stats.js';
import { scoresTest } from './engine/scoring.js';

const DB = 'coach-mobilite', STORE = 'kv', VERSION = 1;
const CLES = ['journal', 'tests', 'gowod', 'exercicesPerso', 'reglages', 'meta', 'presets', 'derniereSeance'];

export const state = {
  journal: [], tests: [], gowod: [], exercicesPerso: [],
  reglages: { seancesParSemaine: 3, minutesParMois: 120, bips: true, volume: 0.5 },
  meta: {}, presets: [], derniereSeance: null,
};

let dbp = null;
function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    try {
      if (!('indexedDB' in self)) return reject(new Error('IndexedDB indisponible'));
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  });
  return dbp;
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbSet(key, val) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function lire(key) {
  try { const v = await idbGet(key); if (v !== undefined) return v; } catch (e) { console.warn('IDB lecture', key, e); }
  try { const s = localStorage.getItem(DB + ':' + key); return s ? JSON.parse(s) : undefined; } catch (e) { console.warn('localStorage lecture', key, e); }
  return undefined;
}

export async function sauver(...keys) {
  for (const key of keys) {
    const val = JSON.parse(JSON.stringify(state[key]));
    let ok = false;
    try { await idbSet(key, val); ok = true; } catch (e) { console.warn('IDB écriture', key, e); }
    // copie de secours dans localStorage (petites données)
    try { localStorage.setItem(DB + ':' + key, JSON.stringify(val)); ok = true; } catch (e) { if (!ok) console.warn('localStorage écriture', key, e); }
    if (!ok) throw new Error('Enregistrement impossible');
  }
}

export function importInitial() {
  state.journal = donnees.seances.map((s, i) => ({
    id: 'imp' + i, date: s.date, objectif: objectifKey(s.objectif), duree: s.duree, contenu: s.contenu, ressenti: '', source: 'import',
  }));
  state.gowod = donnees.testsGowod.map((t) => ({ ...t }));
  state.meta = { ...state.meta, importe: true, importeLe: new Date().toISOString() };
}

export async function charger() {
  for (const k of CLES) {
    const v = await lire(k);
    if (v !== undefined) state[k] = k === 'reglages' ? { ...state.reglages, ...v } : v;
  }
  if (!state.meta.importe) {
    importInitial();
    await sauver('journal', 'gowod', 'meta').catch((e) => console.warn(e));
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* ignore */ }
}

export function bibliotheque() {
  return [...BIBLIOTHEQUE, ...state.exercicesPerso.map(exercicePerso)];
}

export function dernierTest() {
  return [...state.tests].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}
export function prioritesActuelles() {
  const t = dernierTest();
  return t ? scoresTest(t.notes).priorites : [];
}

export async function ajouterEntree(e) {
  const entree = { id: 'j' + Date.now().toString(36), ressenti: '', source: 'app', ...e };
  state.journal.push(entree);
  await sauver('journal');
  return entree;
}
export async function modifierEntree(id, patch) {
  const i = state.journal.findIndex((e) => e.id === id);
  if (i >= 0) { state.journal[i] = { ...state.journal[i], ...patch }; await sauver('journal'); }
}
export async function supprimerEntree(id) {
  state.journal = state.journal.filter((e) => e.id !== id);
  await sauver('journal');
}

// ---------- Export / import ----------
export function exporter() {
  return {
    app: 'coach-mobilite', version: 1, exporteLe: new Date().toISOString(),
    journal: state.journal, tests: state.tests, gowod: state.gowod,
    exercicesPerso: state.exercicesPerso, reglages: state.reglages, presets: state.presets,
  };
}
export async function importer(obj) {
  if (!obj || obj.app !== 'coach-mobilite' || !Array.isArray(obj.journal)) throw new Error('Fichier non reconnu');
  for (const k of ['journal', 'tests', 'gowod', 'exercicesPerso', 'presets']) if (Array.isArray(obj[k])) state[k] = obj[k];
  if (obj.reglages) state.reglages = { ...state.reglages, ...obj.reglages };
  state.meta.importe = true;
  await sauver('journal', 'tests', 'gowod', 'exercicesPerso', 'presets', 'reglages', 'meta');
}
export async function reinitialiser() {
  state.tests = []; state.exercicesPerso = []; state.presets = []; state.derniereSeance = null;
  importInitial();
  await sauver('journal', 'tests', 'gowod', 'exercicesPerso', 'presets', 'derniereSeance', 'meta');
}
