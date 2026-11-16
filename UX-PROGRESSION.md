# Pulsebound — de la Rue au dojo intergalactique

Révision du 16 novembre 2026 : l’économie par seconde (recrues, gains d’absence) est remplacée par une progression de dojo en dojo.

## La boucle

1. Frapper en rythme rapporte des pièces (0,01 par frappe) et brise des sacs (prime du sac, coup de grâce ×2).
2. Chaque sac brisé amène un fan (×2 pendant le Flow, +25 % par don Bouche-à-oreille).
3. À la fin de chaque morceau, le dojo verse une **recette de séance** : (fans × pourboire + élèves × frais) × confort × note × sceaux × dons × dimension. Note : S ×2, A ×1,5, B ×1,2, sinon ×1.
4. Les pièces achètent les équipements du dojo actuel (élèves et confort). Une fois tout installé, on paie le dojo suivant et on repart d’une salle vide.
5. Transmission possible du niveau 2 au niveau 7 (sceaux, retour à la Rue). Au niveau 17 entièrement équipé : saut de dimension, retour à la Rue avec des recettes ×2 pour toujours, sceaux gardés.

Il n’y a plus de gain pendant l’absence ni de revenu par seconde.

## Les 17 dojos

Temps mesurés par `node simulate-progression.mjs` pour un bon joueur (80 % de Parfaits, morceaux de 2 min 30 enchaînés, sans transmission). Un débutant met environ deux fois plus longtemps ; les sceaux accélèrent les écoles suivantes.

| Niveau | Dojo | Prix | Équipements (total) | Élèves | Atteint vers |
|---:|---|---:|---:|---:|---:|
| 1 | La Rue | — | 9 | 0 | 0 min |
| 2 | Salle délabrée | 25 | 70 | 6 | 8 min |
| 3 | Dojo gymnase | 170 | 467 | 10 | 32 min |
| 4 | Dojo de quartier | 1 156 | 3 179 | 14 | 1.2 h |
| 5 | Dojo renommé | 7 861 | 21 618 | 19 | 2.3 h |
| 6 | Dojo de luxe | 53 453 | 146 997 | 22 | 3.6 h |
| 7 | Dojo militaire | 363 483 | 999 579 | 28 | 6.0 h |
| 8 | Dojo high-tech | 2.5 × 10^6 | 6.8 × 10^6 | 35 | 10.0 h |
| 9 | Dojo spatial | 1.7 × 10^7 | 4.6 × 10^7 | 38 | 16.7 h |
| 10 | Rue alien | 1.1 × 10^8 | 6.3 × 10^7 | 16 | 28.7 h |
| 11 | Salle délabrée alien | 4.5 × 10^8 | 1.2 × 10^9 | 46 | 50.0 h |
| 12 | Dojo gymnase alien | 1.7 × 10^9 | 4.8 × 10^9 | 50 | 67.7 h |
| 13 | Dojo de quartier alien | 6.8 × 10^9 | 1.9 × 10^10 | 54 | 85.7 h |
| 14 | Dojo renommé alien | 2.6 × 10^10 | 7.3 × 10^10 | 59 | 105.2 h |
| 15 | Dojo de luxe alien | 1.0 × 10^11 | 2.8 × 10^11 | 62 | 125.5 h |
| 16 | Dojo militaire alien | 4.0 × 10^11 | 1.1 × 10^12 | 68 | 148.6 h |
| 17 | Dojo high-tech alien | 1.6 × 10^12 | 4.3 × 10^12 | 75 | 169.6 h |

## Réglages

Tout est dans `dist/core.mjs` : `PRICE_GROWTH` (6.8, prix sur Terre), `ALIEN_PRICE_GROWTH` (3.9, planète alien), `TAKINGS_GROWTH` (3.4, recettes) et `DIFFICULTY` (multiplie tous les prix). Après un changement, relancer `node simulate-progression.mjs` pour voir les nouveaux temps.

Améliorations : Poings 3 pièces, Lecture du rythme 12, Furie 24 ; leur prix augmente à chaque achat. Ces résultats ne mesurent ni la rétention ni le plaisir : ils servent à éviter les murs et les trous dans la progression.
