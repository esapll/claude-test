// Dates locales au format AAAA-MM-JJ. Semaine du lundi au dimanche.
const pad = (n) => String(n).padStart(2, '0');

export function iso(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(s, n) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function weekStart(s) {
  const d = parse(s);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - dow);
  return iso(d);
}
export function weekEnd(s) { return addDays(weekStart(s), 6); }
export function monthKey(s) { return s.slice(0, 7); }
export function monthStart(s) { return s.slice(0, 7) + '-01'; }
export function monthEnd(s) {
  const d = parse(monthStart(s));
  d.setMonth(d.getMonth() + 1, 0);
  return iso(d);
}
export function inRange(s, a, b) { return s >= a && s <= b; }

/** Dernier dimanche du mois de la date donnée. */
export function lastSundayOfMonth(s) {
  const d = parse(monthEnd(s));
  d.setDate(d.getDate() - d.getDay());
  return iso(d);
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
export function labelMois(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MOIS[m - 1]} ${y}`;
}
export function labelDate(s, { jour = true } = {}) {
  const d = parse(s);
  return `${jour ? JOURS[d.getDay()] + ' ' : ''}${d.getDate()} ${MOIS[d.getMonth()]}`;
}
export function labelDateCourt(s) {
  const d = parse(s);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
export function momentFromHour(h = new Date().getHours()) {
  return h >= 4 && h < 15 ? 'matin' : 'soir';
}
