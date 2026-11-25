# Pulsebound — de la Rue au dojo intergalactique

Révision du 16 novembre 2026 : l’économie par seconde (recrues, gains d’absence) est remplacée par une progression de dojo en dojo.

## La boucle

1. Frapper en rythme rapporte des pièces (0,01 par frappe) et brise des sacs (prime du sac, coup de grâce ×2).
2. Chaque sac brisé amène un fan (×2 pendant le Flow, +25 % par don Bouche-à-oreille).
3. À la fin de chaque morceau, le dojo verse une **recette de séance** : (fans × pourboire + élèves × frais) × confort × note × sceaux × dons × dimension. Note : S ×2, A ×1,5, B ×1,2, sinon ×1.
4. Les pièces achètent les équipements du dojo actuel (élèves et confort). Une fois tout installé, on bat son maître en duel, on paie le dojo suivant à moitié prix et on repart d’une salle vide.
5. Transmission possible du niveau 2 au niveau 7 (sceaux, retour à la Rue). Au niveau 17 entièrement équipé : saut de dimension, retour à la Rue avec des recettes ×2 pour toujours, sceaux gardés. Un maître battu le reste pour toujours.

Il n’y a plus de gain pendant l’absence ni de revenu par seconde.

Cinq premières minutes : le premier achat (Sac d’occasion, 3 pièces) amène le premier élève, vers 30 s pour un joueur moyen et 75 s pour un débutant. Le premier morceau finit sur la carte complète (note, recette), puis les dons gagnés s’ouvrent quand on quitte la carte. Frappe auto se débloque avec la première salle.

## Les 17 dojos

Temps mesurés par `node simulate-progression.mjs` pour un bon joueur (80 % de Parfaits, morceaux de 2 min 30 enchaînés, sans transmission), médiane de neuf parties : les dons tirés au sort font varier une partie d’un quart. Un débutant met environ deux fois plus longtemps ; les sceaux accélèrent les écoles suivantes.

| Niveau | Dojo | Prix | Équipements (total) | Élèves | Atteint vers |
|---:|---|---:|---:|---:|---:|
| 1 | La Rue | — | 9 | 1 | 0 min |
| 2 | Salle délabrée | 12,5 | 70 | 6 | 5 min |
| 3 | Dojo gymnase | 85 | 467 | 10 | 21 min |
| 4 | Dojo de quartier | 578 | 3 179 | 14 | 43 min |
| 5 | Dojo renommé | 3 931 | 21 618 | 19 | 1.4 h |
| 6 | Dojo de luxe | 26 727 | 146 997 | 22 | 2.4 h |
| 7 | Dojo militaire | 181 742 | 999 579 | 28 | 4.2 h |
| 8 | Dojo high-tech | 1.2 × 10^6 | 6.8 × 10^6 | 35 | 6.8 h |
| 9 | Dojo spatial | 8.4 × 10^6 | 4.6 × 10^7 | 38 | 11.1 h |
| 10 | Rue alien | 5.7 × 10^7 | 6.3 × 10^7 | 16 | 18.8 h |
| 11 | Salle délabrée alien | 2.2 × 10^8 | 1.2 × 10^9 | 46 | 30.4 h |
| 12 | Dojo gymnase alien | 8.7 × 10^8 | 4.8 × 10^9 | 50 | 42.8 h |
| 13 | Dojo de quartier alien | 3.4 × 10^9 | 1.9 × 10^10 | 54 | 55.6 h |
| 14 | Dojo renommé alien | 1.3 × 10^10 | 7.3 × 10^10 | 59 | 68.1 h |
| 15 | Dojo de luxe alien | 5.2 × 10^10 | 2.8 × 10^11 | 62 | 80.6 h |
| 16 | Dojo militaire alien | 2.0 × 10^11 | 1.1 × 10^12 | 68 | 95.0 h |
| 17 | Dojo high-tech alien | 7.8 × 10^11 | 4.3 × 10^12 | 75 | 110.0 h |

## Les maîtres

Un maître garde la sortie des niveaux 1 à 16. Il se défie quand le dojo est entièrement équipé, depuis l’objectif, le bouton du dojo ou le mode Duel, sur un morceau d’au moins une minute. La victoire ouvre l’agrandissement, qui coûte la moitié du prix de base du dojo (les équipements n’ont pas changé de prix).

- **Vie** : une part des dégâts qu’un joueur sans faute infligerait sur ces notes-là (40 % au premier, 46 % à 74 % ensuite). Elle ne peut pas descendre plus vite que le morceau : le K.-O. n’arrive que sur les dernières notes, et le combat dure donc tout le morceau.
- **Coups** : ne parer aucune note perd 1,2 fois la vie de Nova contre le premier maître, 1,56 à 3,1 fois contre les suivants.
- **Force** : Poings et sceaux, comparés au niveau conseillé (2, 8, 14… 92). Le rapport joue sur les dégâts de ×0,6 à ×1,5. **Critique** : la chance de Furie et des dons, dégâts ×1,5.
- **Fatigue** : chaque défaite retire 10 % de vie et 15 % de puissance au maître, quatre défaites au plus. La revanche est gratuite.
- **Attaques** : six styles. Sur le temps (Bitume, Marbre, Nacre), coups lourds à chaque manche (Rouille, Acier, Corail), échanges de deux mesures (Tempo, Orbite, Mue), surprises (Néon, Signal, Prisme), contretemps (Bambou, Spore, Lichen), et tout à la fois (Éclipse).
- **Butin** : 0,01 pièce par note réussie et une recette de séance à la victoire, comme en duel libre. Un maître battu reste battu après une transmission ou un saut, et peut être redéfié pour le plaisir.

Dans la simulation, un bon joueur ne perd jamais ; un débutant (20 % de notes manquées) perd une à deux fois contre quatre des sept derniers. Les anciennes sauvegardes gardent tous les dojos déjà ouverts : leurs maîtres comptent comme battus.

## Réglages

Tout est dans `dist/core.mjs` : `PRICE_GROWTH` (6.8, prix sur Terre), `ALIEN_PRICE_GROWTH` (3.9, planète alien), `TAKINGS_GROWTH` (3.4, recettes), `ENTRY` (0.5, part du prix payée pour agrandir) et `DIFFICULTY` (multiplie tous les prix). Les maîtres sont dans `dist/masters.mjs`, la fatigue dans `dist/duel-core.mjs`. Après un changement, relancer `node simulate-progression.mjs` pour voir les nouveaux temps.

Améliorations : Poings 3 pièces, Lecture du rythme 12, Furie 24 ; leur prix augmente à chaque achat. Ces résultats ne mesurent ni la rétention ni le plaisir : ils servent à éviter les murs et les trous dans la progression.
