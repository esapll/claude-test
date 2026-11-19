import { charger } from './store.js';
import { h, icon } from './ui/dom.js';
import * as accueil from './ui/accueil.js';
import * as generer from './ui/generer.js';
import * as minuteur from './ui/minuteur.js';
import * as journal from './ui/journal.js';
import * as test from './ui/test.js';
import * as biblio from './ui/bibliotheque.js';
import * as bilan from './ui/bilan.js';
import * as historique from './ui/historique.js';
import * as reglages from './ui/reglages.js';

const ROUTES = { accueil, generer, minuteur, journal, test, bibliotheque: biblio, bilan, historique, reglages };
const TABS = [
  ['accueil', 'Accueil', 'home'],
  ['generer', 'Générer', 'spark'],
  ['journal', 'Journal', 'book'],
  ['test', 'Test', 'target'],
  ['bibliotheque', 'Exercices', 'grid'],
];

const app = document.getElementById('app');
let cleanup = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  return { route: ROUTES[path] ? path : 'accueil', query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function renderTabs(route) {
  let bar = document.querySelector('.tabs');
  if (!bar) {
    bar = h('div', { class: 'tabs' }, h('nav', { 'aria-label': 'Navigation principale' },
      TABS.map(([id, label, ic]) => h('a', { href: '#/' + id, 'data-id': id }, icon(ic), label))));
    document.body.append(bar);
  }
  const actif = { bilan: 'accueil', historique: 'test', reglages: 'accueil' }[route] || route;
  bar.querySelectorAll('a').forEach((a) => {
    const on = a.dataset.id === actif;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

async function render() {
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  const { route, query } = parseHash();
  document.body.classList.toggle('timer-on', route === 'minuteur');
  renderTabs(route);
  app.replaceChildren();
  try {
    cleanup = (await ROUTES[route].render(app, query)) || null;
  } catch (e) {
    console.error(e);
    app.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Oups'), h('p', { class: 'muted' }, String(e.message || e))));
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);

(async () => {
  try { await charger(); } catch (e) { console.error('Chargement', e); }
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW', e));
  }
})();
