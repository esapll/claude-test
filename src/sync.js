// Synchronisation entre appareils via un Gist GitHub privé.
// Le jeton (droit « gist » uniquement) reste sur l'appareil et n'est jamais exporté.
import { state, sauver, surModification } from './store.js';
import { fusionner, empreinte, CLES_SYNC } from './engine/fusion.js';

const API = 'https://api.github.com';
const FICHIER = 'coach-mobilite.json';
let enCours = null, minuterie = null;
const ecouteurs = new Set();

export const syncEtat = () => state.sync || {};
export function surSync(fn) { ecouteurs.add(fn); return () => ecouteurs.delete(fn); }
const notifier = (changement) => ecouteurs.forEach((fn) => { try { fn(changement); } catch (e) { console.warn(e); } });

async function gh(chemin, opts = {}) {
  const res = await fetch(API + chemin, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${state.sync.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (res.status === 401) throw new Error('Jeton refusé par GitHub (expiré ou invalide).');
  if (res.status === 404) throw Object.assign(new Error('Gist introuvable.'), { code: 404 });
  if (!res.ok) throw new Error(`GitHub a répondu ${res.status}.`);
  return res.json();
}

async function trouverGist() {
  for (let page = 1; page <= 5; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`);
    const g = list.find((x) => x.files && x.files[FICHIER]);
    if (g) return g.id;
    if (list.length < 100) break;
  }
  return null;
}

async function lireGist(id) {
  const g = await gh(`/gists/${id}`);
  const f = g.files[FICHIER];
  if (!f) return {};
  let txt = f.content;
  if (f.truncated) txt = await (await fetch(f.raw_url)).text();
  try { return JSON.parse(txt || '{}'); } catch { return {}; }
}

const local = () => Object.fromEntries(CLES_SYNC.map((k) => [k, state[k]]));
const charge = (d) => JSON.stringify({ app: 'coach-mobilite', version: 1, maj: new Date().toISOString(), ...d });

/** Récupère le Gist, fusionne avec les données locales, enregistre des deux côtés. */
export function synchroniser() {
  if (!state.sync?.token) return Promise.resolve(false);
  if (!navigator.onLine) { state.sync.etat = 'hors ligne'; notifier(false); return Promise.resolve(false); }
  if (enCours) return enCours;
  enCours = (async () => {
    state.sync.etat = 'synchronisation…'; notifier(false);
    try {
      if (!state.sync.gistId) state.sync.gistId = await trouverGist();
      let distant = {};
      if (state.sync.gistId) {
        try { distant = await lireGist(state.sync.gistId); }
        catch (e) { if (e.code === 404) { state.sync.gistId = await trouverGist(); distant = state.sync.gistId ? await lireGist(state.sync.gistId) : {}; } else throw e; }
      }
      const avant = empreinte(local());
      const fus = fusionner(local(), distant);
      const changeLocal = empreinte(fus) !== avant;
      const changeDistant = empreinte(fus) !== empreinte(distant);
      if (changeLocal) {
        for (const k of CLES_SYNC) state[k] = fus[k];
        await sauver(...CLES_SYNC.filter((k) => k !== 'supprimes'), 'supprimes', { silencieux: true });
      }
      if (!state.sync.gistId) {
        const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Coach Mobilité : données synchronisées', public: false, files: { [FICHIER]: { content: charge(fus) } } }) });
        state.sync.gistId = g.id;
      } else if (changeDistant) {
        await gh(`/gists/${state.sync.gistId}`, { method: 'PATCH', body: JSON.stringify({ files: { [FICHIER]: { content: charge(fus) } } }) });
      }
      state.sync.derniere = new Date().toISOString();
      state.sync.etat = 'à jour';
      state.sync.erreur = '';
      await sauver('sync', { silencieux: true });
      notifier(changeLocal);
      return changeLocal;
    } catch (e) {
      console.warn('sync', e);
      state.sync.etat = 'erreur';
      state.sync.erreur = e.message || String(e);
      await sauver('sync', { silencieux: true }).catch(() => {});
      notifier(false);
      return false;
    } finally {
      enCours = null;
    }
  })();
  return enCours;
}

export function planifierSync(delai = 3000) {
  if (!state.sync?.token) return;
  clearTimeout(minuterie);
  minuterie = setTimeout(synchroniser, delai);
}

export async function connecter(token) {
  state.sync = { token: token.trim(), gistId: null, derniere: null, etat: 'connexion…', erreur: '' };
  await gh('/gists?per_page=1'); // vérifie le jeton
  await sauver('sync', { silencieux: true });
  return synchroniser();
}

export async function deconnecter() {
  state.sync = {};
  await sauver('sync', { silencieux: true });
  notifier(false);
}

export function demarrerSync() {
  surModification(() => planifierSync());
  window.addEventListener('online', () => planifierSync(500));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') planifierSync(500); });
  planifierSync(300);
}
