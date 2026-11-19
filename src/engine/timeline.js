// Transforme une séance en déroulé pour le minuteur.
import { TRANSITION } from './durations.js';

const COTE = { D: 'côté droit', G: 'côté gauche' };
export const libelleCote = (s) => (s ? COTE[s] : '');

/**
 * Chaque étape non enchaînée est précédée d'une transition de 10 s
 * (y compris la première : temps d'installation, compté dans la durée).
 */
export function deroule(session) {
  const out = [];
  const total = session.blocks.length;
  session.blocks.forEach((b, bi) => {
    b.steps.forEach((s, si) => {
      const etape = {
        kind: 'exercice',
        sec: s.sec,
        blocIndex: bi,
        numero: bi + 1,
        total,
        nom: b.nom,
        label: s.label || b.nom,
        consigne: s.consigne || b.consigne,
        side: s.side,
        chain: !!s.chain,
        exId: s.exId || b.exId,
        douleur: !!b.douleur,
      };
      if (!s.chain) {
        const changementCote = si > 0;
        out.push({
          kind: 'transition', sec: TRANSITION, blocIndex: bi, numero: bi + 1, total,
          titre: bi === 0 && si === 0 ? 'Installe-toi' : changementCote ? 'Change de côté' : 'Transition',
          prochain: etape,
        });
      }
      out.push(etape);
    });
  });
  return out;
}

export function dureeDeroule(etapes) {
  return etapes.reduce((t, e) => t + e.sec, 0);
}

/** Récapitulatif pour le journal : texte et durées par exercice. */
export function resumeSeance(session) {
  const parts = session.blocks.map((b) => {
    if (b.kind === 'protocole') {
      const d = b.steps[0].sec, g = b.steps[3].sec;
      return `protocole 90/90 D/G (passif D ${d} s / G ${g} s, PAILs, RAILs)`;
    }
    if (b.steps.length === 2) {
      const [d, g] = b.steps;
      return d.sec === g.sec ? `${b.nom.toLowerCase()} (D/G)` : `${b.nom.toLowerCase()} (D ${d.sec} s / G ${g.sec} s)`;
    }
    return b.nom.toLowerCase();
  });
  const ex = new Map();
  for (const b of session.blocks) for (const s of b.steps) {
    const id = s.exId || b.exId;
    ex.set(id, (ex.get(id) || 0) + s.sec);
  }
  const t = parts.join(', ');
  return { contenu: t.charAt(0).toUpperCase() + t.slice(1) + '.', exercices: [...ex].map(([id, sec]) => ({ id, sec })) };
}
