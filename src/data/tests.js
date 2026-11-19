// Les 12 tests du bilan mensuel (échelle 1–5, repères visuels du corps).
export const ZONES_TEST = {
  epaules: 'Épaules', overhead: 'Overhead', thorax: 'Thorax',
  hanches: 'Hanches', chaine: 'Chaîne postérieure', chevilles: 'Chevilles',
};

// Illustrations en fil de fer. Classes : b = corps, h = segment testé,
// r = repère (pointillés), g = sol / mur.
const svg = (inner) => `<svg viewBox="0 0 200 150" class="fig" role="img" aria-hidden="true">${inner}</svg>`;
const head = (x, y, r = 9) => `<circle class="b" cx="${x}" cy="${y}" r="${r}"/>`;
const L = (pts, cls = 'b') => `<polyline class="${cls}" points="${pts}"/>`;
const ground = (y = 136) => `<line class="g" x1="10" y1="${y}" x2="190" y2="${y}"/>`;
const ticks = (x, ys) => ys.map((y, i) => `<line class="r" x1="${x - 6}" y1="${y}" x2="${x + 6}" y2="${y}"/><text class="t" x="${x - 10}" y="${y + 3}" text-anchor="end">${i + 2}</text>`).join('');

export const TESTS = [
  {
    id: 'epaule-re', zone: 'epaules', nom: 'Main derrière la tête', sous: 'Rotation externe', bilateral: true,
    etapes: ['Debout, dos droit, regard devant.', 'Monte la main par-dessus l\'épaule, coude vers le plafond.', 'Fais-la descendre le long du dos, sans cambrer : note où arrive le bout des doigts.'],
    niveaux: ['Pas la nuque', 'La nuque', 'Le haut des omoplates', 'Le milieu des omoplates', 'Le bas des omoplates'],
    svg: svg(head(100, 28) + L('100,38 100,92') + L('100,92 90,134') + L('100,92 110,134') + L('100,46 86,70 88,92') + L('100,46 112,18 104,58', 'h') + ticks(92, [42, 50, 58, 66])),
  },
  {
    id: 'epaule-ri', zone: 'epaules', nom: 'Main dans le dos', sous: 'Rotation interne', bilateral: true,
    etapes: ['Debout, épaules relâchées.', 'Passe la main par le bas, dos de la main contre le dos.', 'Remonte-la le long de la colonne le plus haut possible, sans tourner le buste.'],
    niveaux: ['La fesse', 'Le bas du dos (ceinture)', 'Le milieu du dos', 'Le bas des omoplates', 'Entre les omoplates'],
    svg: svg(head(100, 28) + L('100,38 100,92') + L('100,92 90,134') + L('100,92 110,134') + L('100,46 86,70 88,92') + L('100,46 114,78 102,62', 'h') + ticks(92, [86, 74, 64, 54])),
  },
  {
    id: 'overhead-allonge', zone: 'overhead', nom: 'Bras au-dessus de la tête, allongé', sous: 'Flexion d\'épaule', bilateral: false,
    etapes: ['Sur le dos, genoux pliés, pieds à plat.', 'Plaque le bas du dos au sol et garde-le plaqué.', 'Monte les deux bras tendus derrière la tête, aussi loin que possible.'],
    niveaux: ['Restent verticaux ou à peine au-delà', 'Arrivent à mi-chemin du sol', 'S\'arrêtent à une main du sol', 'Touchent le sol, mais le bas du dos se creuse', 'Sont au sol, dos plaqué'],
    svg: svg(ground() + head(62, 126) + L('72,128 130,128') + L('130,128 150,100 166,134') + L('76,126 76,80', 'r') + L('76,126 40,90', 'r') + L('76,126 30,132', 'h')),
  },
  {
    id: 'overhead-squat', zone: 'overhead', nom: 'Overhead squat', sous: 'Squat bras tendus', bilateral: false,
    etapes: ['Pieds largeur d\'épaules, un manche à balai possible.', 'Bras tendus au-dessus de la tête, alignés avec les oreilles.', 'Descends au plus bas, puis observe talons, bras et dos (miroir ou vidéo).'],
    niveaux: ['Pas sous la parallèle', 'Parallèle, les bras tombent vers l\'avant', 'Sous la parallèle, avec 2 défauts (talons qui décollent, bras devant, dos rond)', 'Complet, avec 1 défaut', 'Complet : talons au sol, bras alignés avec les oreilles, dos neutre'],
    svg: svg(ground() + head(92, 50) + L('96,60 108,98') + L('108,98 138,100 126,134') + L('96,64 88,14', 'h') + L('70,14 108,14', 'h')),
  },
  {
    id: 'thorax-rotation', zone: 'thorax', nom: 'Rotation thoracique', sous: 'À genoux', bilateral: true,
    etapes: ['À genoux, fesses sur les talons, un avant-bras au sol.', 'L\'autre main derrière la tête.', 'Ouvre le coude vers le plafond en suivant du regard, sans décoller les fesses.'],
    niveaux: ['Reste orienté vers le sol', 'Arrive à l\'horizontale du dos', 'Monte à mi-hauteur vers le plafond', 'Est presque vertical', 'Pointe le plafond, la poitrine est ouverte sur le côté'],
    svg: svg(ground() + head(66, 96) + L('140,112 78,100') + L('140,112 150,134 110,134') + L('84,102 84,134 60,134') + L('86,98 88,60', 'h') + L('86,98 120,98', 'r') + L('86,98 112,74', 'r')),
  },
  {
    id: 'hanche-9090', zone: 'hanches', nom: '90/90 assis', sous: 'Rotation externe (jambe avant)', bilateral: true, note: 'D/G = jambe placée devant.',
    etapes: ['Assis au sol, jambe avant pliée à 90° devant toi.', 'Jambe arrière pliée à 90° sur le côté.', 'Redresse le buste sans les mains, puis penche-toi vers le tibia avant.'],
    niveaux: ['Position impossible sans tomber en arrière', 'Tenue seulement avec les mains au sol derrière', 'Buste droit sans les mains', 'Buste penché à mi-chemin vers le tibia avant', 'Poitrine proche du tibia avant'],
    svg: svg(ground() + head(96, 42) + L('100,52 102,112', 'b') + L('102,112 150,124 150,134', 'h') + L('102,112 58,126 40,108') + L('100,62 118,90') + L('100,62 82,90') + L('102,112 130,60', 'r')),
  },
  {
    id: 'hanche-9090-inv', zone: 'hanches', nom: '90/90 inversé', sous: 'Rotation interne (jambe arrière)', bilateral: true, note: 'D/G = jambe placée derrière.',
    etapes: ['Assis en 90/90, mains au sol si besoin.', 'Pose le genou arrière au sol et redresse le buste.', 'Essaie de soulever le pied arrière du sol en gardant le contrôle.'],
    niveaux: ['Le genou arrière ne descend pas au sol', 'Le genou touche, buste incliné vers l\'avant', 'Buste droit', 'Pied arrière soulevé de quelques centimètres', 'Pied arrière soulevé haut, avec contrôle'],
    svg: svg(ground() + head(96, 42) + L('100,52 102,112') + L('102,112 150,124 150,134') + L('102,112 58,130 36,104', 'h') + L('36,134 36,104', 'r') + L('100,62 118,90') + L('100,62 82,90')),
  },
  {
    id: 'hanche-flexion', zone: 'hanches', nom: 'Genou poitrine allongé', sous: 'Flexion de hanche', bilateral: true,
    etapes: ['Allongé sur le dos, jambes tendues.', 'Ramène un genou vers la poitrine avec les mains.', 'Observe le bassin et l\'autre jambe, qui doit rester au sol.'],
    niveaux: ['La cuisse dépasse à peine la verticale', 'La cuisse arrive à mi-chemin du ventre', 'Genou proche de la poitrine, mais le bassin décolle', 'Genou contre la poitrine, bassin au sol', 'Pareil, l\'autre jambe restant tendue au sol'],
    svg: svg(ground() + head(40, 126) + L('50,128 110,128') + L('110,128 180,130') + L('110,128 80,96 108,92', 'h') + L('110,128 110,80', 'r') + L('56,126 82,100')),
  },
  {
    id: 'hanche-abduction', zone: 'hanches', nom: 'Écart facial assis', sous: 'Abduction', bilateral: false,
    etapes: ['Assis, dos contre un meuble ou un mur.', 'Jambes tendues, écarte-les au maximum.', 'Garde le buste droit, puis pose les mains au sol devant si possible.'],
    niveaux: ['Écart de la largeur des épaules', 'V étroit (environ 60°)', 'Angle droit entre les jambes', 'V très ouvert, buste droit', 'Presque un T, mains posées au sol devant'],
    svg: svg(`<line class="g" x1="40" y1="30" x2="160" y2="30"/>` + head(100, 46) + L('100,56 100,72') + L('100,72 40,130', 'h') + L('100,72 160,130', 'h') + L('100,72 100,140', 'r') + `<path class="r" d="M80 92 A28 28 0 0 0 120 92"/>`),
  },
  {
    id: 'chaine-jambe', zone: 'chaine', nom: 'Élévation jambe tendue, allongé', sous: 'Ischios', bilateral: true,
    etapes: ['Allongé sur le dos, jambes tendues.', 'Monte une jambe tendue, pointe de pied vers toi.', 'L\'autre jambe reste au sol : note la hauteur atteinte.'],
    niveaux: ['Monte à moins d\'un tiers de la verticale', 'Monte au tiers', 'Arrive à mi-chemin', 'Est presque verticale', 'Est verticale ou au-delà, l\'autre jambe reste au sol'],
    svg: svg(ground() + head(40, 126) + L('50,128 110,128') + L('110,128 180,130') + L('110,128 136,40', 'h') + L('110,128 110,40', 'r') + L('110,128 168,94', 'r') + L('56,126 90,126')),
  },
  {
    id: 'chaine-flexion', zone: 'chaine', nom: 'Flexion debout jambes tendues', sous: 'Chaîne postérieure', bilateral: false,
    etapes: ['Debout, pieds joints, genoux tendus.', 'Enroule le dos et laisse descendre les mains.', 'Sans élan ni rebond, note où arrivent les mains.'],
    niveaux: ['Les genoux', 'Le milieu des tibias', 'Les chevilles', 'Les orteils du bout des doigts', 'Le sol, paumes à plat'],
    svg: svg(ground() + L('120,134 120,84') + `<path class="b" d="M120 84 Q118 52 92 58"/>` + head(86, 70) + L('94,60 96,128', 'h') + ticks(108, [112, 124, 130])),
  },
  {
    id: 'cheville-mur', zone: 'chevilles', nom: 'Genou au mur', sous: 'Flexion de cheville', bilateral: true,
    etapes: ['Face à un mur, pied testé devant, talon au sol.', 'Amène le genou contre le mur dans l\'axe du pied.', 'Recule le pied tant que le genou touche encore : mesure orteils–mur en largeurs de doigts.'],
    niveaux: ['Moins d\'un doigt', '1 à 2 doigts', '3 à 4 doigts', 'Une main à plat', 'Plus d\'une main'],
    svg: svg(ground() + `<line class="g" x1="160" y1="20" x2="160" y2="136"/>` + head(126, 36) + L('126,46 118,90') + L('118,90 160,98 140,134', 'h') + L('118,90 84,112 70,134') + L('140,136 160,136', 'r') + L('126,56 156,70')),
  },
];

export const DUREE_TEST_MIN = 12;
