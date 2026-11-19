// Bibliothèque d'exercices : les 73 exercices importés, enrichis
// (materiel, cotes, actif, flexion, rotExt, activation, cibles), plus
// quelques exercices « Coach » nécessaires au générateur.
import donnees from './donnees-initiales.js';

export const ZONES = {
  hanches: 'Hanches', dos: 'Dos', thorax: 'Thorax', epaules: 'Épaules', cou: 'Cou',
  jambes: 'Jambes', post: 'Chaîne post.', bras: 'Bras', global: 'Global',
};
export const OBJ_BIBLIO = { relax: 'Relaxation', mob: 'Mobilité', post: 'Post-séance' };
export const TYPES = { dyn: 'Dynamique', stat: 'Statique', roll: 'Rouleau', force: 'Force + mobilité' };
export const MATERIELS = { aucun: 'Aucun', rouleau: 'Rouleau', kettlebell: 'Kettlebell', mur: 'Mur', banc: 'Banc / marche' };

export function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Enrichissement par clé `k`. Valeurs par défaut : aucun matériel, pas de côtés,
// non actif (sauf type force), pas de flexion du dos.
const E = {
  'chat-vache': { flexion: true, activation: ['velo'] },
  'thread the needle': { cotes: true, activation: ['velo'], cibles: ['hautdos'] },
  'rotation thoracique': { cotes: true, cibles: ['hautdos'] },
  'roulements d': { cibles: ['hautdos'] },
  'rotation douce du cou': {},
  'releveur': { cotes: true },
  'pectoraux': { materiel: 'mur', cotes: true, cibles: ['hautdos'] },
  "posture de l'enfant": { flexion: true },
  'bras tendu sur le côté': { cotes: true, flexion: true },
  'cobra': { flexion: true, activation: ['velo'] },
  'spinal twist': { cotes: true },
  'bascule du bassin': {},
  'essuie-glaces': {},
  'genoux-poitrine': { flexion: true },
  'table inversée': { actif: true },
  'travail du bassin': {},
  'pigeon': { cotes: true, rotExt: true, cibles: ['fessiers'] },
  'figure 4': { cotes: true, rotExt: true, cibles: ['fessiers'] },
  '90/90': { rotExt: true },
  'external rotations': { cotes: true, rotExt: true },
  'internal rotations': { cotes: true, actif: true },
  '0 to 90': { cotes: true, actif: true },
  'clamshell': { cotes: true, rotExt: true, cibles: ['fessiers'] },
  'full t': { cotes: true, activation: ['course', 'velo'], cibles: ['flechisseurs'] },
  'hip axle': { cotes: true },
  'grenouille': { cibles: ['adducteurs'] },
  'cercles de hanches': {},
  'hip car': { cotes: true, actif: true, activation: ['course', 'velo'] },
  'cossack': { actif: true, activation: ['course'], cibles: ['adducteurs', 'chevilles'] },
  'yogi squat': { cibles: ['chevilles'] },
  'front rack': { actif: true, cibles: ['chevilles'] },
  'overhead squat': { actif: true, cibles: ['chevilles', 'hautdos'] },
  'prone shoulder': { cotes: true, actif: true },
  'table reach': { cotes: true },
  'low lunge': { cotes: true, cibles: ['flechisseurs', 'quadriceps'] },
  'shin pull': { actif: true, activation: ['course'], cibles: ['fessiers'] },
  'high knee': { actif: true, activation: ['course', 'velo'], cibles: ['flechisseurs'] },
  'leg raises': { actif: true, cibles: ['flechisseurs'] },
  'glute bridge': { actif: true, activation: ['velo', 'course'], cibles: ['fessiers'] },
  'ischios': { cotes: true, cibles: ['ischios'] },
  'flexion avant assise': { flexion: true, cibles: ['ischios'] },
  'jambes écartées': { flexion: true, cibles: ['ischios', 'adducteurs'] },
  'quadriceps sur le côté': { cotes: true, cibles: ['quadriceps', 'flechisseurs'] },
  'latéral assis': { cotes: true },
  'rdl': { materiel: 'kettlebell', cotes: true, cibles: ['ischios'] },
  'pogo': { materiel: 'banc', cotes: true, activation: ['course'], cibles: ['mollets', 'chevilles'] },
  'forearms': { cibles: ['poignets'] },
  'rouleau mollets': { materiel: 'rouleau', cotes: true, cibles: ['mollets'] },
  'rouleau quadriceps': { materiel: 'rouleau', cotes: true, cibles: ['quadriceps', 'flechisseurs'] },
  'rouleau grands dorsaux': { materiel: 'rouleau', cotes: true, cibles: ['hautdos'] },
  '+ bas du dos': { materiel: 'rouleau' },
  'respiration finale': { role: 'cloture' },
  'single leg hop': { cotes: true, activation: ['course'], cibles: ['mollets', 'chevilles'] },
  'torso twist': { activation: ['course', 'velo'], cibles: ['hautdos'] },
  'down dog': { cibles: ['mollets', 'ischios'] },
  'goddess': { cibles: ['adducteurs'] },
  'diagonal lunge': { cotes: true, activation: ['course'] },
  'sumo squat': { cibles: ['adducteurs'] },
  'bulgare': { materiel: 'banc', cotes: true, cibles: ['mollets', 'quadriceps'] },
  'box jump': { materiel: 'banc' },
  'pigeon dynamique': { cotes: true, rotExt: true, cibles: ['fessiers'] },
  'demi-grenouille': { cotes: true, rotExt: true },
  'rotation lean': { cotes: true },
  'hip airplane': { cotes: true, rotExt: true },
  'rotation complète': { cotes: true, rotExt: true, actif: true },
  'lift-off': { cotes: true, rotExt: true, actif: true, role: 'liftoff' },
  'fente en extension': { cotes: true, cibles: ['flechisseurs'] },
  'fentes latérales': { activation: ['course'], cibles: ['adducteurs'] },
  'split squat': { cotes: true, cibles: ['flechisseurs'] },
  'hip thrust': { materiel: 'banc', cibles: ['fessiers'] },
  'loaded pigeon': { materiel: 'kettlebell', cotes: true, rotExt: true },
  'copenhagen': { materiel: 'banc', cotes: true, cibles: ['adducteurs'] },
  'incliné sur coussin': { cotes: true, rotExt: true },
};

// Exercices ajoutés pour couvrir les règles du coach.
const COACH = [
  { id: 'respiration-ventrale', n: 'Respiration ventrale, expiration longue', z: ['global'], o: ['relax', 'mob', 'post'], t: 'stat', role: 'ouverture',
    c: "Allongé sur le dos, une main sur le ventre. Inspire 4 s par le nez en gonflant le ventre, expire lentement 6 à 8 s. Laisse les épaules devenir lourdes." },
  { id: 'jambes-au-mur', n: 'Jambes au mur', z: ['global'], o: ['relax'], t: 'stat', materiel: 'mur', role: 'cloture',
    c: "Fesses près du mur, jambes tendues contre le mur, bras ouverts. Respiration lente, expiration plus longue que l'inspiration. Laisse le bassin se poser." },
  { id: '9090-passif', n: '90/90 passif + respiration', z: ['hanches'], o: ['relax', 'mob'], t: 'stat', cotes: true, rotExt: true, k: '90/90 passif',
    c: "Assis en 90/90, buste droit puis légèrement penché vers le tibia avant. Respire dans la fesse avant, relâche à chaque expiration sans forcer." },
  { id: '9090-pails', n: '90/90 PAILs', z: ['hanches'], o: ['mob'], t: 'force', cotes: true, actif: true, rotExt: true, interne: true, k: 'pails',
    c: "Même position. Presse le genou et le tibia avant dans le sol en montant progressivement de 0 à 100 % sur 10–15 s, puis tiens. Respire." },
  { id: '9090-rails', n: '90/90 RAILs', z: ['hanches'], o: ['mob'], t: 'force', cotes: true, actif: true, rotExt: true, interne: true, k: 'rails',
    c: "Relâche la pression, puis essaie de décoller le genou et le tibia avant du sol pour approfondir la position, sans les mains. Tiens la contraction." },
  { id: 'goblet-squat-tenu', n: 'Goblet squat tenu (KB 12 kg)', z: ['hanches', 'jambes'], o: ['mob'], t: 'force', materiel: 'kettlebell', actif: true, role: 'force', k: 'goblet', cibles: ['chevilles', 'adducteurs'],
    c: "Kettlebell contre la poitrine, descends en squat profond. Les coudes poussent les genoux vers l'extérieur, talons au sol. Tiens en bas en respirant." },
  { id: 'cossack-leste', n: 'Cossack squat lesté (KB 12 kg)', z: ['hanches', 'jambes'], o: ['mob'], t: 'force', materiel: 'kettlebell', cotes: true, actif: true, role: 'force', k: 'cossack squat lesté', cibles: ['adducteurs'],
    c: "Kettlebell en goblet, pieds très écartés. Descends lentement sur une jambe, l'autre tendue pointe vers le haut. Tiens 2 s en bas, remonte en contrôle." },
  { id: 'leg-swings', n: 'Leg swings avant-arrière + latéral', z: ['hanches'], o: ['mob'], t: 'dyn', cotes: true, actif: true, activation: ['course', 'velo'], k: 'leg swings', cibles: ['flechisseurs', 'ischios', 'adducteurs'],
    c: "Debout, une main en appui. Balance la jambe d'avant en arrière, amplitude croissante, puis latéralement devant toi. Buste stable." },
  { id: 'worlds-greatest-stretch', n: "World's greatest stretch", z: ['hanches', 'thorax'], o: ['mob', 'post'], t: 'dyn', cotes: true, activation: ['course', 'velo'], k: "world's greatest", cibles: ['flechisseurs', 'hautdos'],
    c: "Grande fente, main opposée au sol. Coude vers le cou-de-pied, puis ouvre le bras vers le plafond en suivant du regard. Reviens et répète." },
  { id: 'fente-basse-dynamique', n: 'Fente basse dynamique', z: ['hanches', 'jambes'], o: ['mob', 'post'], t: 'dyn', cotes: true, activation: ['course', 'velo'], k: 'fente basse dynamique', cibles: ['flechisseurs', 'quadriceps'],
    c: "Genou arrière au sol. Avance les hanches 2 s en serrant la fesse arrière, puis recule. Bras au-dessus de la tête pour étirer davantage." },
  { id: 'rouleau-fessier', n: 'Rouleau fessier', z: ['hanches'], o: ['post', 'relax'], t: 'roll', materiel: 'rouleau', cotes: true, k: 'rouleau fessier', cibles: ['fessiers'],
    c: "Assis sur le rouleau, cheville sur le genou opposé. Penche-toi du côté de la jambe croisée et roule lentement sur la fesse." },
  { id: 'rouleau-haut-dos', n: 'Rouleau haut du dos', z: ['thorax', 'dos'], o: ['post', 'relax'], t: 'roll', materiel: 'rouleau', k: 'rouleau haut du dos', cibles: ['hautdos'],
    c: "Rouleau sous les omoplates, mains derrière la tête, fesses au sol. Petites extensions par-dessus le rouleau, segment par segment." },
  { id: 'rouleau-flechisseurs', n: 'Rouleau fléchisseurs de hanche', z: ['hanches', 'jambes'], o: ['post'], t: 'roll', materiel: 'rouleau', cotes: true, k: 'fléchisseurs de hanche', cibles: ['flechisseurs', 'quadriceps'],
    c: "Sur le ventre, rouleau sous le pli de l'aine, en appui sur les avant-bras. Petits mouvements, respire, pression modérée." },
  { id: 'mollet-mur', n: 'Étirement du mollet contre un mur', z: ['jambes'], o: ['post'], t: 'stat', materiel: 'mur', cotes: true, k: 'mollet contre un mur', cibles: ['mollets', 'chevilles'],
    c: "Mains au mur, une jambe tendue derrière, talon au sol. Avance le bassin jusqu'à sentir le mollet. Puis plie légèrement le genou pour le soléaire." },
  { id: 'mollet-fente', n: 'Étirement du mollet en fente', z: ['jambes'], o: ['post', 'relax'], t: 'stat', cotes: true, k: 'mollet g en fente', cibles: ['mollets', 'chevilles'],
    c: "En fente, mains au sol ou sur la cuisse avant, jambe arrière tendue talon au sol. Respire et laisse le talon descendre." },
  { id: 'quadriceps-debout', n: 'Étirement des quadriceps debout', z: ['jambes'], o: ['post'], t: 'stat', cotes: true, k: 'quadriceps debout', cibles: ['quadriceps', 'flechisseurs'],
    c: "Debout, une main en appui, attrape la cheville et ramène le talon vers la fesse. Genoux serrés, bassin rentré." },
  { id: 'open-book', n: 'Open book allongé', z: ['thorax'], o: ['relax', 'mob', 'post'], t: 'dyn', cotes: true, k: 'open book', cibles: ['hautdos'],
    c: "Allongé sur le côté, genoux pliés à 90°, bras tendus devant. Ouvre le bras du dessus vers l'autre côté en suivant la main du regard, genoux collés." },
  { id: 'sphinx', n: 'Sphinx', z: ['dos'], o: ['relax'], t: 'stat', k: 'sphinx',
    c: "Sur le ventre, en appui sur les avant-bras, coudes sous les épaules. Laisse le ventre lourd, épaules loin des oreilles, respire." },
  { id: 'epaule-bras-croise', n: 'Épaule bras croisé', z: ['epaules'], o: ['relax', 'post'], t: 'stat', cotes: true, k: 'bras croisé',
    c: "Amène un bras tendu devant la poitrine et maintiens-le avec l'autre avant-bras, épaule basse." },
  { id: 'torsion-allongee', n: 'Torsion allongée', z: ['dos', 'hanches'], o: ['relax', 'post'], t: 'stat', cotes: true, k: 'torsion allongée',
    c: "Sur le dos, ramène un genou plié de l'autre côté, bras opposé ouvert au sol. Épaules posées, laisse le poids de la jambe travailler." },
  { id: 'cheville-genou-mur', n: 'Mobilisation cheville, genou au mur', z: ['jambes'], o: ['mob', 'post'], t: 'dyn', materiel: 'mur', cotes: true, activation: ['course'], k: 'cheville genou au mur', cibles: ['chevilles', 'mollets'],
    c: "Pied face au mur, talon au sol. Amène le genou vers le mur et reviens, en rythme. Recule le pied si c'est trop facile." },
  { id: 'cercles-chevilles', n: 'Cercles de chevilles', z: ['jambes'], o: ['mob', 'relax'], t: 'dyn', cotes: true, activation: ['course', 'velo'], k: 'cercles de chevilles', cibles: ['chevilles'],
    c: "Assis ou debout en appui, dessine de grands cercles lents avec le pied, dans un sens puis dans l'autre." },
  { id: 'poignets-4-pattes', n: 'Étirement des poignets à 4 pattes', z: ['bras'], o: ['post', 'mob'], t: 'stat', k: 'poignets', cibles: ['poignets'],
    c: "À 4 pattes, doigts vers les genoux, paumes au sol. Recule doucement les fesses, puis retourne les mains dos au sol. Sans douleur." },
  { id: 'papillon', n: 'Papillon assis', z: ['hanches'], o: ['relax', 'post'], t: 'stat', k: 'papillon', cibles: ['adducteurs'],
    c: "Assis, plantes des pieds jointes, genoux vers l'extérieur. Dos long, laisse les genoux descendre sous leur propre poids." },
];

function enrich(e, src) {
  const extra = E[e.k] || {};
  return {
    id: e.id || slug(e.n),
    n: e.n, z: e.z, o: e.o, t: e.t, s: e.s || src, c: e.c, p: !!e.p, k: e.k || '',
    materiel: 'aucun', cotes: false, actif: e.t === 'force', flexion: false, rotExt: false,
    activation: [], cibles: [], role: null, interne: false,
    ...pick(e, ['materiel', 'cotes', 'actif', 'flexion', 'rotExt', 'activation', 'cibles', 'role', 'interne']),
    ...extra,
  };
}
function pick(o, keys) {
  const r = {};
  for (const k of keys) if (o[k] !== undefined) r[k] = o[k];
  return r;
}

export const BIBLIOTHEQUE_IMPORTEE = donnees.bibliotheque.map((e) => enrich(e));
export const BIBLIOTHEQUE_COACH = COACH.map((e) => enrich(e, 'Coach Mobilité'));
export const BIBLIOTHEQUE = [...BIBLIOTHEQUE_IMPORTEE, ...BIBLIOTHEQUE_COACH];

/** Normalise un exercice ajouté à la main. */
export function exercicePerso(e) {
  return enrich({ ...e, id: e.id || 'perso-' + slug(e.n) + '-' + Date.now().toString(36), k: e.k || e.n.toLowerCase() }, 'Ajout manuel');
}
