# Architecture audio actuelle

JavaScript/Web Audio sans dépendance DSP. Le rythme ne s’obtient jamais en accumulant deltaTime. Le delta de rendu sert uniquement à la production idle et aux animations décoratives.

| Module | Responsabilité |
| --- | --- |
| audio-clock.mjs | Transport depuis AudioContext.currentTime, piste ↔ DSP, pause et seek ; conversion du timestamp d’entrée vers la position audible via getOutputTimestamp, avec repli DSP. |
| beat-conductor.mjs | Anticipation des beats/demi-beats, signaux beat, halfbeat, schedule, resync. |
| audio.mjs | AudioBuffer ou synthèse, origine partagée avec l’horloge, mixage séparé, métronome et transport. La synthèse suit les sections manuelles. |
| audio-sfx.mjs | Impacts PCM en couches et normalisation temporelle Freestyle. |
| analyze-song.mjs | Rééchantillonnage intégral mono 11 025 Hz et worker avec progression. |
| bpm-worker.mjs | FFT, attaques, beats et forme d’onde hors du thread UI. |
| rhythm.mjs | Nouveauté spectrale et RhythmMap : recherche binaire, aperçu et jugement. |
| beat-analysis.mjs | Suivi de pulsation par programmation dynamique. |
| song-chart.mjs | Normalisation, grille à BPM variable et sélection de coups automatiques. |
| music-library.mjs | IndexedDB : Blobs + métadonnées/cache, ordre, sélection, boucle, retrait/annulation. |
| song-editor.mjs | Brouillon de calage, forme d’onde, écoute/seek/zoom, BPM/offset/sections, sauvegarde et export JSON. |
| app.mjs | Intégration, playlist, file de notes, inputs, combo/Flow, progression et fenêtres. |

## Une origine temporelle

Position = position à la reprise + AudioContext.currentTime − instant DSP de départ. Source et horloge reçoivent le même startAt, actuellement currentTime + 65 ms. Seek se fait en pause puis crée une nouvelle origine à la reprise. Une fin naturelle lance le prochain titre une seule fois ; une pause et l’écoute dans l’éditeur ne le font pas.

Conducteur réveillé toutes les 25 ms, anticipation 120 ms. Le métronome reçoit les timestamps DSP. Les callbacks JS peuvent arriver tard ; après un blocage de plus de 250 ms, resync saute les anciens signaux sans rafale. Les demi-beats sont interpolés, sans estimation du swing.

Le rendu des notes et la préparation de pose lisent la position audible. Clavier/pointeur transmettent event.timeStamp, puis la calibration signée est soustraite. Une note résolue rapporte une fois. Fenêtres de base : 65 ms Parfait, 145 ms Bien, élargies par Focus et bornées par l’intervalle local. Pas de réglage utilisateur indépendant de chaque fenêtre.

## Carte et cache

L’analyse version 2 conserve tempo, beatMap, events, waveform et duration avec le Blob immuable identifié par UUID. La carte est sérialisable en JSON ; IndexedDB conserve cet objet structuré sans le PCM rééchantillonné. Réimporter crée une entrée distincte ; pas de déduplication par hash.

Les anciens sons sans analyse complète sont mis à niveau à leur première ouverture. Une version de cache différente déclenche le calcul. Les métadonnées existantes restent un repli en cas d’échec. Ré-analyser renouvelle le cache dans l’éditeur.

Exemple de calage : {version:1, source:"grid", bpm:120, offset:0.13, segments:[{time:32.13,bpm:150},{time:64.13,bpm:90}]}.

Chaque section ancre un temps à son timestamp absolu puis génère les suivants au nouveau BPM jusqu’à la section suivante, sans doubler la frontière. Les données sont en secondes, l’offset affiché en millisecondes. Une section manuelle active source:grid.

En source:auto, l’offset translate beats et attaques ensemble. Les attaques proches des beats deviennent le timestamp de frappe ; les contretemps forts peuvent ajouter des coups. Le conducteur conserve ses temps distincts. Énergie, confiance et espacement limitent les coups artificiels.

## Vérification et limites

Dix scripts Node couvrent transport, conversions, une heure de DSP simulée, fin/replay/seek, signaux, onsets, tempo variable, cartes, stockage et économie. Les essais UI vérifient worker, cache après rechargement, calage enregistré, forme d’onde et mobile. Pas de mesure acoustique, Bluetooth ni campagne physique multi-navigateur.

Références : [currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime), [getOutputTimestamp](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp), [suivi de beat libfmp](https://github.com/meinardmueller/libfmp/blob/master/libfmp/c6/c6s3_beat_tracking.py). Web Audio représente le traitement audio, sans mesurer directement la sortie acoustique. La calibration reste nécessaire selon le matériel.

## Auto et nouvelles poses

combat-controls.mjs fournit un curseur de notes basé sur les timestamps de la carte, avec consommation unique et saut des événements trop anciens. Auto appelle le même chemin de dégâts que les entrées, avec la note Bien et sans modifier les records ou compteurs de précision manuels. Une entrée manuelle coupe Auto ; musique en pause, menu, fenêtre ouverte et arrière-plan empêchent les frappes. Les séquences de techniques déterminent aussi les icônes anticipées. La danse reçoit un indice de beat fractionnaire calculé depuis les temps locaux ; son rythme suit les sections variables.

scene.mjs charge les poses décrites par dist/sprites/hero-manifest.mjs, prépare et étend les coups de pied/uppercuts, et alterne les deux poses de danse. Les poses originales restent utilisées pour les directs. Les mouvements décoratifs respectent la réduction des mouvements. check-combat-controls.mjs couvre consommation, saut, reprise, cartes variables, poses et phase de danse.
