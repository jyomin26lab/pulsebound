# Pulsebound — Midnight Dojo

[Jouer à Pulsebound](https://jyomin26lab.github.io/pulsebound/) · [Dépôt GitHub](https://github.com/jyomin26lab/pulsebound)

Jeu incrémental musical en JavaScript/Web Audio, sans dépendances. Nova frappe un sac dans un dojo nocturne orange en illustration géométrique. Le dojo, les améliorations et les transmissions restent à droite sur ordinateur et s’ouvrent dans la Boutique sur téléphone.

## Jouer

Node.js 20+ : lancer node serve.mjs, puis ouvrir http://127.0.0.1:4173.

Avant de commencer, composer sa playlist et écouter un titre, puis choisir **Rythme**, **Freestyle** ou **Duel** et Jouer. D / F / Espace, le sac ou le grand repère déclenchent une frappe. Les améliorations sont en icônes au-dessus de la boutique.

En mode rythmique, les prochains coups défilent vers le grand repère fixe : frapper à leur arrivée. Une frappe juste avant la fenêtre perd la note et le combo : marteler ne remplace pas l’écoute. Détente garde un temps sur deux. La précision construit le combo et le Flow ; les enchaînements de 8/16/32/64/128 coups ont leur retour visuel et sonore. En Freestyle, frapper librement, sans jugement de tempo ni notes imposées. Les gains sont pondérés par le temps couvert pour limiter l’avantage du spam ou des chansons très rapides.

En **Duel**, Nova affronte son Ombre sur le morceau choisi, original ou importé : pendant ses phrases on pare (F, boucliers), pendant les nôtres on frappe (J, éclairs). L’Ombre glisse aussi des attaques surprises, annoncées une demi-seconde avant. Chaque note réussie rapporte 0,01 pièce ; une victoire paie une recette de séance multipliée par la note, une défaite n’en paie pas. Règles dans duel-core.mjs, vérifiées par check-duel.mjs.

## Musique et calage

- Ajouter plusieurs fichiers, déplacer les titres par glisser-déposer ou flèches, retirer un son et annuler le dernier retrait. La lecture enchaîne les titres ; la boucle est facultative.
- Copies audio, liste, ordre, sélection, analyse et réglages restent dans IndexedDB, sur **ce navigateur et cette origine**. Aucun fichier musical n’est envoyé au serveur. Effacer le stockage du navigateur supprime ces copies. Les fichiers d’origine restent intacts.
- Formats selon les codecs du navigateur : MP3, WAV, OGG, M4A, FLAC, AAC, Opus ; 5 secondes à 20 minutes, 80 Mo par son. Les trois originaux synthétiques durent deux minutes. Une liste vide permet de jouer sans musique.
- L’analyse complète calcule attaques graves/médiums/aigus, temps suivis et forme d’onde. Le BPM de départ est estimé sur 90 secondes au maximum ; le suivi et les attaques couvrent tout le fichier. Le résultat versionné est conservé avec le son, sans recalcul à chaque partie.
- **Guide de synchronisation** : écoute, clic, proposition sur 6 à 8 tapes, corrections de 20 ms. Le guide génère une pulsation régulière ; l’éditeur avancé conserve la forme d’onde, les lignes de beat, le zoom, le BPM, l’alignement du temps le plus proche au curseur, le décalage par 5 ms, les sections à BPM variable et l’export JSON. Le bouton au curseur conserve les temps précédents.
- Le décalage translate aussi l’analyse automatique sans en aplatir les variations. Modifier un BPM ou ajouter une section active la grille manuelle. Fermer annule les réglages non enregistrés ; ré-analyser renouvelle le cache mais ne valide pas le nouveau calage avant Enregistrer.

L’analyse est heuristique : elle ne sépare pas les instruments et ne transcrit pas toutes les notes. Les attaques très proches sont filtrées à 180 ms minimum. Lorsque la confiance est basse, les attaques détectées priment sur les temps interpolés. Mixages chargés, voix seules, rubato et demi/double tempo peuvent demander une correction. Un fichier long peut demander beaucoup de mémoire au décodage. Une erreur d’analyse laisse la grille manuelle utilisable.

## Progression et ressenti

Nova commence dans la Rue et monte 17 dojos, jusqu’à une planète alien : il équipe chaque salle objet par objet, puis l’agrandit. Frappes et sacs brisés rapportent des pièces ; chaque sac brisé amène un fan ; élèves et fans paient une recette à la fin de chaque morceau, multipliée par la note, dès le premier morceau. Le Sac d’occasion (3 pièces, dans la Rue) amène le premier élève. Transmission possible du niveau 2 au niveau 7, saut de dimension au niveau 17. Voir UX-PROGRESSION.md. Le Flow dure 32 temps et se fige en pause. Voir GAMEPLAY.md.

Les impacts PCM superposent attaque, grain et grave : trois variantes normales, trois critiques, légère variation de hauteur et limite de voix simultanées. Musique et impacts ont leurs volumes indépendants. Le décor est légèrement flouté dans un cache redessiné au chargement/redimensionnement ; personnage, sac et UI restent nets. La réduction des mouvements est respectée.

Il n’y a pas de gain pendant l’absence : on gagne en jouant. La progression est dans localStorage et s’exporte depuis les réglages ; cet export n’inclut pas les fichiers audio.

## Vérifications

Lancer avec Node chacun des 17 scripts `check*.mjs`. Ils couvrent aussi les revenus directs, le calage sans intro vide et l’intégrité des neuf PNG séparés. simulate-progression.mjs reproduit la simulation économique détaillée dans UX-PROGRESSION.md.

Ils couvrent économie des dojos, duel, décompte de reprise, calibration de l’appareil, migration, recette de séance, Flow, DSP, pause/reprise/seek/fin, attaques irrégulières, silence, suivi des beats et changements de tempo, cartes manuelles, stockage de playlist/calage, annulation et enveloppes SFX. Les essais navigateur couvrent import multiple, cache après rechargement, titre suivant automatique, éditeur, lecture, inputs et affichage 320/390 px sans débordement. Ils ne mesurent pas la latence physique ni la transcription sur tous les morceaux.

Le site publié est le dossier dist/ : chaque poussée sur main le met en ligne par GitHub Pages. Les images d’origine, que le jeu ne charge pas, sont dans art/. AUDIO-ARCHITECTURE.md décrit les modules, RHYTHM.md la méthode, UI-ART.md les icônes et ART-DIRECTION.md les illustrations. Les polices distantes sont facultatives.

## Correctif mobile

L’import et la sélection préparent le contexte audio sans appeler resume. Seul le geste Jouer/Commencer demande la lecture, avec une attente bornée de 2,5 secondes et un message persistant en cas de refus. Le son interrompu par iOS met le transport en pause. Le bouton Jouer reste visible en bas du menu sur téléphone. Lecture des fichiers, décodage et stockage ont des délais limites ; l’import peut être annulé, sans retirer les titres déjà ajoutés. Sur iPhone, sélectionner le fichier depuis Fichiers ; télécharger au préalable les fichiers iCloud et utiliser Safari si le navigateur intégré de ChatGPT refuse le sélecteur ou la lecture. Aucun essai sur iPhone physique n’a été réalisé. Le test check-mobile-audio.mjs simule un contexte qui refuse ou ne termine pas resume, un M4A sans MIME, les erreurs, délais et annulations.

## Frappes Auto et techniques

Auto se débloque avec la première salle (niveau 2) et reste acquis après une transmission ou un saut de dimension. Il suit la carte des notes pendant la lecture, en Rythme et en Freestyle. Il se fige en pause, dans le menu ou en arrière-plan. Son curseur lit l’horloge audio : une chute de framerate saute les notes anciennes sans rafale. Auto rapporte dégâts/pièces et charge le Flow comme une frappe Bien ; il ne compte pas comme une frappe manuelle, un Parfait ou un record de combo. Une entrée manuelle coupe Auto. Le bouton reste disponible pour reprendre la lecture.

Les frappes alternent jab, direct, pied et uppercut selon une séquence de huit notes ; les icônes anticipent ces coups. Pied et Uppercut préparent une seule prochaine frappe. Danse règle les pas entre les attaques, avec une phase calculée depuis les beats locaux, y compris aux changements de tempo. Les actions interrompent la danse. Les poses sont des WebP individuels dans dist/sprites/, alignés par hero-manifest.mjs et dessinés entiers ; les neuf PNG d’origine sont dans art/sprites/. Les poses de danse sourient légèrement. Voir SPRITES-INDIVIDUELS.md. Les anciennes planches restent des références historiques et ne sont plus chargées par le rendu. La réduction des mouvements désactive la danse et les déplacements décoratifs.

Le score a été retiré. Les pièces et la recette par séance sont au premier plan. Le bandeau supérieur reste visible pendant le défilement, y compris devant la boutique sur mobile. Les chiffres flottants montrent les pièces reçues. Les trophées ont une notification non bloquante, hors de l’arène ; les particules et lumières ambiantes restent derrière l’action. UX-PROGRESSION.md détaille coûts, progression simulée et pistes à valider avec des joueurs.
