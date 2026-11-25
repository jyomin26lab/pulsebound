# École du brasier

Un sac de frappe, une seule action et une école qui grandit. Le dojo conserve la direction géométrique nocturne orange. Les anciennes sauvegardes sont reprises sous la même clé ; niveaux, monnaie et records sont conservés.

## Boucle de progression

1. Une bonne frappe rapporte des dégâts et des pièces immédiatement. Un sac brisé ajoute une récompense.
2. Chaque sac brisé amène un fan (deux pendant le Flow). À la fin de chaque morceau, le dojo verse une recette : pourboires des fans et frais des élèves, multipliés par le confort, la note du morceau (S ×2, A ×1,5, B ×1,2), les sceaux, les dons et la dimension.
3. Nova part de la Rue. Chaque dojo a ses équipements (élèves et confort) ; une fois tout installé, il peut s’agrandir vers le suivant : 17 niveaux, de la Rue à la planète alien. Les poings améliorent les dégâts.
4. Les succès attribuent leur prime une seule fois et l’objectif principal oriente vers le prochain déblocage.
5. Tous les cinq niveaux, un sac renforcé possède trois fois la résistance et rapporte quatre fois la prime du niveau.
6. Du niveau 2 au niveau 7, avec 12 000 pièces gagnées dans l’école, une transmission donne `floor(sqrt(pièces_de_l’école / 12000))` sceaux. Chaque sceau ajoute 20 % de puissance. Le récapitulatif explique le redémarrage avant confirmation. Au niveau 17 entièrement équipé, le saut de dimension renvoie dans la Rue avec des recettes ×2 pour toujours.

Une session courte permet de frapper, acheter et voir une amélioration. Une session plus longue permet de choisir entre équipements, agrandissement, techniques et transmission. Les prix ne dépendent pas du morceau choisi.

## Flow et équilibre musical

Le Flow se remplit selon l’intervalle local des événements et la précision. Une densité de notes doublée ne double donc pas automatiquement sa vitesse de charge. Les dégâts et pièces de frappe sont aussi pondérés par cet intervalle, avec bornes de jouabilité. Ce n’est pas une garantie d’équivalence parfaite entre tous les arrangements : silences, erreurs et sélection des onsets influencent la partie.

Le Flow démarre au prochain beat, dure 32 temps et se met en pause avec le transport. Son bonus passif ne s’applique que pendant la lecture. Les 32 temps sont présentés comme huit mesures de quatre temps ; il n’y a pas de détection de signature rythmique. La grille manuelle sert de repli sans beats exploitables. En Freestyle, aucune fenêtre de précision n’est imposée et les gains dépendent du temps entre frappes.

Les morceaux importés restent locaux. Les replis de tempo, calibration et décalage restent disponibles.

## Ressenti et présentation

Le sac est dessiné en polygones et suspendu par des chaînes. Une impulsion analytique crée son oscillation ; les frappes se lisent dans les poses de Nova. Les coups critiques accentuent brièvement le mouvement de caméra et les particules. Les chiffres de dégâts montent puis disparaissent. Le léger arrêt de pose concerne uniquement le dessin et ne suspend jamais le DSP.

Les sons d’impact, achats, paliers, Flow et transmission sont synthétisés localement. La musique personnelle reste au premier plan. Deux réglages contrôlent les sons et l’intensité visuelle ; le réglage système de réduction des mouvements désactive les secousses et particules.

L’école reste à droite sur ordinateur. Sous 981 px, elle passe sous la session, et sur téléphone elle s’ouvre dans la Boutique. Les trois améliorations sont en icônes au-dessus de la boutique. Les deux onglets école/transmission sont utilisables au clavier. Les achats ne mettent pas la musique en pause. Les trophées apparaissent dans une petite notification sans interrompre le morceau. La réserve et le revenu automatique remplacent le score. Le solde reste visible dans le bandeau fixe en haut de la page.

## Vérifications

Les 17 scripts `check*.mjs` vérifient les règles, le transport, les onsets et beats, la migration, les trois producteurs, tous les paliers, les trophées uniques, le prestige, la pause du Flow, les protections des imports, les revenus directs et le guide de calage. La simulation économique actualisée et les prix sont documentés dans UX-PROGRESSION.md ; ce modèle ne constitue pas une mesure d’engagement réel.

Les essais navigateur ont couvert frappe clavier et clic, Flow, sac renforcé, achat pendant la lecture, pause/reprise, import de sauvegarde et transmission. Un aperçu séparé sur le port 4174 a servi aux essais de transmission pour préserver la session de l’utilisateur. Le rendu à 390 px ne déborde pas horizontalement.

Pas de campagne de tests sur plusieurs jours, de mesure Bluetooth ou de comparaison d’engagement avec Cookie Clicker. Ces vérifications valident les comportements et une première économie jouable.

## Playlist et retour au dojo

Les copies musicales et le calage par chanson persistent localement dans IndexedDB. L’éditeur propose une forme d’onde, des sections à BPM variable et une carte JSON exportable. Les impacts PCM ont six variantes et un volume indépendant ; le décor flouté est mis en cache.
