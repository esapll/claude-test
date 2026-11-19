# Coach Mobilité

Application web mobile (PWA) qui sert de coach de mobilité personnel. Elle fonctionne hors ligne sur iPhone et iPad. Elle réunit le générateur de séances, le minuteur, le suivi et le test mensuel, et remplace le test de mobilité de GOWOD.

## Utilisation sur iPhone / iPad

1. Ouvrir l'URL de l'application dans **Safari**.
2. Toucher **Partager**, puis **Sur l'écran d'accueil**.
3. Lancer l'application depuis l'icône : elle marche hors ligne et les données restent sur l'appareil (IndexedDB). Pour les sauvegarder, utiliser **Réglages → Exporter en JSON**.

### Hébergement (GitHub Pages)

Le workflow `.github/workflows/pages.yml` lance les tests à chaque push et déploie la branche `main` sur GitHub Pages. À faire une seule fois : **Settings → Pages → Source : GitHub Actions**.

### En local

```bash
npm test     # tests unitaires du moteur (Node 20+)
npm start    # serveur statique sur http://localhost:8080
```

## Arborescence

```
index.html, manifest.webmanifest, sw.js   coque PWA (cache hors ligne complet)
donnees-initiales.json                    données d'origine (20 séances, 2 tests GOWOD, 73 exercices)
assets/                                   polices (Inter, Newsreader), icônes, vidéo muette « écran allumé »
src/data/
  donnees-initiales.js                    les mêmes données, en module ES
  bibliotheque.js                         73 exercices enrichis + 24 exercices « Coach »
  tests.js                                les 12 tests 1–5 (consignes, repères, schémas SVG)
src/engine/                               logique pure, testée sous Node
  generator.js                            sélection des exercices et règles de coaching
  durations.js                            calcul des durées au pas de 5 s, transitions de 10 s
  timeline.js                             déroulé du minuteur, résumé pour le journal
  stats.js                                tableau de bord, série, bilan mensuel, analyse du journal
  scoring.js                              scores du test, asymétries, priorités
  dates.js
src/store.js                              IndexedDB (repli localStorage), import initial, export/import JSON
src/ui/                                   écrans : accueil, generer, minuteur, journal, test,
                                          bibliotheque, bilan, historique, reglages
tests/engine.test.mjs
```

## Modèle de données

| Clé (IndexedDB) | Contenu |
|---|---|
| `journal` | `{ id, date: 'AAAA-MM-JJ', objectif: relax\|mob\|post\|course\|velo, duree (min), contenu, ressenti, exercices?: [{ id, sec }], source: import\|app }` |
| `tests` | `{ id, date, notes: { [testId]: { D, G } \| { v } }, zones: { epaules, overhead, thorax, hanches, chaine, chevilles }, global }` |
| `gowod` | les 2 tests GOWOD (%), conservés tels quels, sans conversion |
| `exercicesPerso` | exercices ajoutés à la main (mêmes champs que la bibliothèque) |
| `reglages`, `presets`, `derniereSeance`, `meta` | objectifs, raccourcis « séance express », séance lancée, indicateur d'import |

Exercice : `n, z, o, t, s, c, p, k` (champs d'origine) + `materiel` (aucun, rouleau, kettlebell, mur, banc), `cotes`, `actif`, et pour le générateur `flexion`, `rotExt`, `activation`, `cibles`, `role`.

Séance générée : `blocks: [{ exId, nom, t, z, steps: [{ side: D|G|null, sec, chain }] }]`. Le minuteur insère 10 s de transition avant chaque étape non `chain`. La première transition (« Installe-toi ») est comptée dans la durée.

## Règles de coaching appliquées

- **Durée exacte** : la somme des exercices et des transitions tombe pile sur la durée demandée, au pas de 5 s. Le test couvre tous les objectifs × 5–30 min × matin/soir, plus 1 500 combinaisons aléatoires.
- **Soir** : uniquement du passif (aucun exercice `actif`, pas de force, pas de charge). Ouverture par une respiration ventrale, clôture jambes au mur, ou jambes surélevées si « sans mur ». *Exception volontaire* : les activations avant course ou vélo restent dynamiques, même le soir.
- **Matin, mobilité (≥ 10 min)** : protocole 90/90 enchaîné sans transition (passif 45–90 s, PAILs 20 s, RAILs 15 s), puis lift-offs à partir de 12 min (D 25 s / G 40 s).
- **Asymétrie** : passif hanche D + 15 à 30 s ; actif hanche G + 5 à 15 s. Les côtés notés ≤ 2 au dernier test sont favorisés.
- **Dose** : les minutes de rotation externe de la semaine sont calculées depuis le journal, avec un bonus tant que les 10 min ne sont pas atteintes.
- **Force en fin d'amplitude** : goblet squat tenu et cossack lesté, 2 fois par semaine le matin. Au poids du corps après une séance de jambes lourde (case à cocher, ou détection dans le WOD).
- **Rouleau** 30–45 s par zone. **Activation** : dynamique seulement, tenues < 60 s.
- **Zone douloureuse** : rien d'actif sur la zone, durées plafonnées, message d'alerte.
- **Sport du jour** : cibles fines (mollets, ischios, fléchisseurs, quadriceps, haut du dos, poignets, chevilles…). Le WOD CrossFit est analysé par mots-clés.

## Limites connues

- Pas de notification push hors ligne sur iOS sans serveur. Le rappel du test s'affiche sur l'accueil le dernier dimanche du mois, et un fichier `.ics` récurrent peut être ajouté au calendrier.
- Le bouton silencieux de l'iPhone coupe les bips Web Audio.
- Les séances importées ne contiennent que du texte : le compteur « Fait N× » et les zones du bilan les reconnaissent par mot-clé (`k`).
