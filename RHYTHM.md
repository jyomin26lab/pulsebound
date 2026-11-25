# Musique, coups et combo

Deux modes : Pulsation régulière avec notes anticipées et précision, Freestyle sans notes imposées ni ratés. L’ancien choix « Accents du morceau » est retiré de l’interface. L’analyse spectrale sert toujours à construire la carte automatique par chanson.

## Analyse

1. Décodage Web Audio, rééchantillonnage intégral mono 11 025 Hz.
2. FFT 512 échantillons avec Hann, environ 86 observations par seconde.
3. Variations positives des magnitudes logarithmiques en graves/médiums/aigus ; pics au-dessus d’un seuil local adaptatif, espacement de 180 ms minimum.
4. Tempo initial estimé sur 90 secondes maximum, puis suivi par programmation dynamique sur tout le fichier. Les variations modérées sont tolérées ; les temps proches d’attaques sont recalés.
5. Enveloppe visuelle normalisée de 4 096 pics pour la forme d’onde.
6. Résultat versionné conservé avec le son dans IndexedDB.

## Carte jouable

Les beats servent au conducteur et au métronome. Les coups utilisent les attaques proches de ces beats et les contretemps forts. Silence et temps sans attaque sont filtrés selon énergie et confiance. Sous 50 % de confiance heuristique, une attaque détectée est nécessaire pour garder un temps interpolé comme coup. Espacement minimal : 180 ms.

Les trois originaux suivent une partition écrite (`dist/scores.mjs`) : une ligne par section (intro, couplet, montée, refrain, silence, roulement, final), huit croches par mesure. `1` se joue dans les trois difficultés, `2` à partir de Standard, `3` en Intense seulement ; `-` prolonge une note tenue et `.` se tait. Détente, Standard et Intense partagent donc le même morceau, de plus en plus rempli ; Détente tient aussi les notes suivies d’un long vide. La musique lit la même partition (`dist/music.mjs`) : la mélodie joue exactement les notes à frapper, celles de l’Intense plus doucement ; la batterie et la basse se taisent dans un silence et la caisse claire joue chaque note d’un roulement. Neon Ronin est une synthwave en la mineur, Chrome Rush un breakbeat électro en do mineur, After Hours un downtempo en sol mineur au swing léger. Les morceaux importés et le Duel gardent leur propre carte.

La grille manuelle suit les BPM/sections saisis. Chaque section ancre un temps à son instant. Un changement 120 → 180 → 90 modifie donc les notes, le métronome et la synthèse des originaux. Pour un fichier importé, l’éditeur ajuste la carte sans modifier la vitesse ou les octets de la musique.

Les notes défilent vers un grand repère fixe : anticipation de 2,8 s sur grande bande, 1,6 s sur petite bande. Positions et préparation de pose lisent l’horloge de sortie ; coups, sac, effets et combo répondent à l’entrée jugée. Les paliers de combo sont visuels et sonores, sans nouvelle monnaie.

Le décalage translate la carte automatique. BPM et sections activent la grille manuelle. L’éditeur offre forme d’onde, écoute/seek, zoom, tap tempo, premier temps au curseur et corrections de 5 ms. La calibration de l’appareil reste distincte du décalage musical.

## Limites et contrôles

Une attaque est un changement spectral saillant, pas une reconnaissance certaine d’instrument. Premier beat, demi/double tempo, voix seules, nappes, mixages chargés, polyrythmie et changements brusques peuvent demander une correction. La confiance n’est pas une probabilité calibrée. Aucun test synthétique ou capture ne mesure la latence acoustique réelle.

check-rhythm.mjs vérifie onsets irréguliers, fréquences, silence, note tenue et attaques après 94 s. check-beat-analysis.mjs vérifie intro, temps manquant et variation de tempo. check-song-chart.mjs vérifie les partitions écrites (durée, difficultés emboîtées, écarts variés, densité des sections, temps pour relâcher), les sections, frontières, contretemps, translation, aperçu et fin. Les vérifications d’horloge, transport et playlist couvrent seek, cache et calage.

Principes : [nouveauté spectrale AudioLabs/FMP](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C6/C6S1_NoveltySpectral.html) et [suivi de beat libfmp](https://github.com/meinardmueller/libfmp/blob/master/libfmp/c6/c6s3_beat_tracking.py). Implémentation JavaScript locale, sans service externe.
