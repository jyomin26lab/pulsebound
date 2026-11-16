# École du brasier

Un sac de frappe, une seule action et une école qui grandit. Le dojo conserve la direction géométrique nocturne orange. Les anciennes sauvegardes sont reprises sous la même clé ; niveaux, monnaie et records sont conservés.

## Boucle de progression

1. Une bonne frappe rapporte des dégâts et des pièces immédiatement. Un sac brisé ajoute une récompense.
2. Disciples, adeptes et maîtres rapportent directement 0,1, 1 et 8 pièces/s de base par recrue. Ils infligent aussi des dégâts automatiques ; les sacs brisés ajoutent une prime. Les poings améliorent les dégâts des frappes et de l’école. Le premier objectif invite à recruter un disciple.
3. Les paliers 10/25/50/100 doublent successivement la production du type de recrues concerné. Les coûts progressent à chaque achat.
4. Les succès attribuent leur prime une seule fois et l’objectif principal oriente vers le prochain déblocage.
5. Tous les cinq niveaux, un sac renforcé possède trois fois la résistance et rapporte quatre fois la prime du niveau.
6. Après le niveau 20 et 12 000 pièces gagnés dans l’école, une transmission donne `floor(sqrt(pièces_de_l’école / 12000))` sceaux. Chaque sceau ajoute 20 % de puissance. Le récapitulatif explique le redémarrage avant confirmation.

Une session courte permet de frapper, acheter et voir une amélioration. Une session plus longue permet de choisir entre recrues, paliers, techniques et transmission. Les prix ne dépendent pas du morceau choisi.

## Flow et équilibre musical

Le Flow se remplit selon l’intervalle local des événements et la précision. Une densité de notes doublée ne double donc pas automatiquement sa vitesse de charge. Les dégâts et pièces de frappe sont aussi pondérés par cet intervalle, avec bornes de jouabilité. Ce n’est pas une garantie d’équivalence parfaite entre tous les arrangements : silences, erreurs et sélection des onsets influencent la partie.

Le Flow démarre au prochain beat, dure 32 temps et se met en pause avec le transport. Son bonus passif ne s’applique que pendant la lecture. Les 32 temps sont présentés comme huit mesures de quatre temps ; il n’y a pas de détection de signature rythmique. La grille manuelle sert de repli sans beats exploitables. En Freestyle, aucune fenêtre de précision n’est imposée et les gains dépendent du temps entre frappes.

Les morceaux importés restent locaux. Les replis de tempo, calibration et décalage restent disponibles. L’absence rapporte le revenu automatique régulier, sans Flow, pendant huit heures au maximum, sans simuler des séries de sacs ni appliquer le Flow hors ligne.

## Ressenti et présentation

Le sac est dessiné en polygones et suspendu par des chaînes. Une impulsion analytique crée son oscillation ; les frappes se lisent dans les poses de Nova. Les coups critiques accentuent brièvement le mouvement de caméra et les particules. Les chiffres de dégâts montent puis disparaissent. Le léger arrêt de pose concerne uniquement le dessin et ne suspend jamais le DSP.

Les sons d’impact, achats, paliers, Flow et transmission sont synthétisés localement. La musique personnelle reste au premier plan. Deux réglages contrôlent les sons et l’intensité visuelle ; le réglage système de réduction des mouvements désactive les secousses et particules.

L’école reste à droite sur ordinateur. Sous 981 px, elle passe sous la session. Le bouton « Mon école » permet d’y accéder rapidement. Les trois améliorations sont en icônes au-dessus de la boutique. Les deux onglets école/transmission sont utilisables au clavier. Les achats ne mettent pas la musique en pause. Les trophées apparaissent dans une petite notification sans interrompre le morceau. La réserve et le revenu automatique remplacent le score. Le solde reste visible dans le bandeau fixe en haut de la page.

## Vérifications

Douze scripts Node vérifient les règles, le transport, les onsets et beats, la migration, les trois producteurs, tous les paliers, les trophées uniques, le prestige, la pause du Flow, les protections des imports, les revenus directs et le guide de calage. La simulation économique actualisée et les prix sont documentés dans UX-PROGRESSION.md ; ce modèle ne constitue pas une mesure d’engagement réel.

Les essais navigateur ont couvert frappe clavier et clic, Flow, sac renforcé, achat pendant la lecture, pause/reprise, import de sauvegarde et transmission. Un aperçu séparé sur le port 4174 a servi aux essais de transmission pour préserver la session de l’utilisateur. Le rendu à 390 px ne déborde pas horizontalement.

Pas de campagne de tests sur plusieurs jours, de mesure Bluetooth ou de comparaison d’engagement avec Cookie Clicker. Ces vérifications valident les comportements et une première économie jouable.

## Playlist et retour au dojo

Les copies musicales et le calage par chanson persistent localement dans IndexedDB. L’éditeur propose une forme d’onde, des sections à BPM variable et une carte JSON exportable. La fenêtre de retour affiche la récompense d’absence, déjà créditée et sauvegardée pour éviter un double gain. Les impacts PCM ont six variantes et un volume indépendant ; le décor flouté est mis en cache.
