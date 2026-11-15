# Pulsebound — les pièces au premier plan

Révision du 14 novembre 2026 après retour sur téléphone.

La boucle principale est : frapper → gagner des pièces → recruter → augmenter le revenu automatique. Le score, les records par morceau et le pourcentage de précision ont été retirés du combat et du calcul. Les combos servent encore au combat, au Flow et aux trophées.

## Affichage

Le bandeau supérieur reste visible pendant le défilement, y compris devant la boutique sur téléphone. Il présente le solde et le revenu en pièces par seconde. Sur mobile, la réserve dispose de sa propre ligne lisible. Au-dessus du combat, les pièces et le revenu remplacent le score. Les nombres flottants des frappes montrent maintenant les pièces reçues.

La boutique affiche les revenus de chaque formation et son prochain palier. Les améliorations restent en icônes au-dessus des recrues. La musique, les animations et les guides de synchronisation sont conservés.

## Revenus et achats

| Recrue | Premier prix | Revenu de base par recrue | Disponibilité |
| --- | ---: | ---: | --- |
| Disciple | 40 pièces | +1 pièce/s | Dès le début |
| Adepte | 350 pièces | +6 pièces/s | Série 5 |
| Maître | 2 400 pièces | +40 pièces/s | Série 10 |

Les revenus sont crédités directement, même si aucun sac n’est brisé et si la musique est en pause. Les sacs brisés ajoutent leur prime séparée. Les gains de frappe conservent leur pondération par l’intervalle entre coups ; la précision et le Flow augmentent les pièces reçues.

À 10, 25, 50 et 100 recrues d’un type, ses revenus et sa puissance doublent. Les sceaux augmentent les revenus permanents de 20 % par sceau. Les poings augmentent les dégâts sans modifier le revenu de base affiché d’une recrue. Le Flow multiplie temporairement les revenus automatiques par trois pendant la lecture.

Le crédit de revenu utilise le temps réellement écoulé, sans perdre les secondes lors d’une image tardive. Les dégâts passifs conservent leur limite de rattrapage. Pendant l’absence, le jeu crédite le revenu régulier sans Flow ni simulation de sacs, jusqu’à huit heures. Les courtes absences sont aussi créditées ; la fenêtre de retour est réservée aux absences d’au moins 30 secondes.

Les prix des améliorations restent inchangés : Poings 20 pièces, Focus 60, Furie 120. Leurs prix et ceux des recrues augmentent à chaque achat.

## Conservation et vérification

Les soldes, niveaux, trophées, playlists et réglages existants sont conservés. Les anciennes données de score déjà stockées ne sont plus lues ni utilisées ; aucune suppression du stockage musical n’est nécessaire.

Les tests couvrent revenu direct, paliers, sceaux, Flow, durée réelle, absence plafonnée sans double crédit et restauration. Le simulateur économique inclut désormais ces revenus directs. Ses achats sont optimisés et ses résultats ne constituent pas une mesure de rétention ou une durée promise à un joueur.
