# Prompt pour Codex — objets, disciples et fans

Copie tout ce qui suit dans Codex (connecté au dépôt `jyomin26lab/pulsebound`).

---

Tu travailles sur le jeu web **Pulsebound** (dépôt `jyomin26lab/pulsebound`). Nova, un jeune maître, part de la rue et monte 17 dojos : 9 sur Terre, puis 8 sur une planète alien. Les décors des dojos sont déjà faits (`dist/venues/`). Il me manque les **objets** (équipements), les **disciples** et les **fans**.

## Ta mission

Génère **151 images** : 79 icônes d’objets, 34 images de disciples (2 poses × 17 niveaux) et 12 images de fans (2 poses × 6 personnages). Enregistre-les dans les dossiers et sous les noms exacts indiqués plus bas.

- **Ne modifie aucun fichier de code** (`.mjs`, `.html`, `.css`) : je branche les images ensuite.
- Crée les dossiers `dist/items/`, `dist/disciples/` et `dist/crowd/` s’ils n’existent pas.
- À la fin, fais un seul commit : `Objets, disciples et fans (items, disciples, crowd)`.

## Direction artistique : DISCRÈTE (le plus important)

« Discret » veut dire que ces images **accompagnent le décor sans le voler**. Elles doivent se lire d’un coup d’œil, en tout petit sur un écran de téléphone (un disciple fait environ 100 px de haut à l’écran).

- **Peu de détails** : formes simples et lisibles, grandes surfaces plates, pas de textures, pas de petits motifs, pas de plis ni de boucles. Si un détail ne se voit pas à 100 px, supprime-le.
- **Ne sature pas l’écran** : couleurs **sourdes et calmes**, peu saturées (tons terreux, gris chauds, bleus-verts éteints), 3 à 5 couleurs par image, pas de néon, pas de couleur criarde, pas de gros contraste. L’œil doit rester sur Nova et le sac, pas sur les figurants.
- **Ombres douces et simples** : un seul niveau d’ombre, pas de dégradés, pas de reflets brillants.
- **Même style que Nova** : illustration 2D de jeu de combat, contour net et fin (même épaisseur partout, couleur sombre chaude `#2a2330`, pas de noir pur). Regarde `art/sprites/idle.png` et `dist/sprites/disciple-ready.webp`, mais en **plus simple**.
- **Tout le lot doit paraître venir du même jeu** : même contour, même éclairage (lumière en haut à gauche), même niveau de simplification.
- Évite : photo, 3D brillante, pixel art, aquarelle, dégradés baveux.
- Aucun texte, logo, signature, filigrane.

La progression se lit par la **forme et la matière** (plus propre, plus riche, plus technologique), pas par plus de détails ni plus de couleurs. Les versions « alien » gardent la même silhouette que leur équivalent terrestre, mais en matière organique (coquille, résine, cristal), avec une seule petite touche lumineuse violette ou turquoise **éteinte** (jamais fluo).

## Format technique (obligatoire)

- **WebP avec fond transparent** (aucun fond, aucune ombre au sol), qualité environ 85.
- Chaque sujet **centré**, avec une petite marge ; rien ne touche les bords.
- Poids : moins de 60 Ko par icône d’objet, moins de 80 Ko par personnage.

## 1. Objets : 79 icônes dans `dist/items/`

- **256 × 256 px**, un seul objet, vu de trois quarts de face, centré, sans décor ni main.
- Nom du fichier = identifiant ci-dessous + `.webp` (ex. `dist/items/bag.webp`).
- L’objet doit être **reconnaissable à sa silhouette**. Les objets « alien » reprennent la silhouette de leur équivalent terrestre.
- Attention : `fan` = le **ventilateur** (objet), pas un spectateur.

**Niveau 1 — La Rue**

| Fichier | Objet |
|---|---|
| `dist/items/bag.webp` | Sac d’occasion |
| `dist/items/speaker.webp` | Enceinte portable |

**Niveau 2 — Salle délabrée**

| Fichier | Objet |
|---|---|
| `dist/items/mats.webp` | Tapis de sol |
| `dist/items/poster.webp` | Posters de champions |
| `dist/items/windows.webp` | Fenêtres réparées |
| `dist/items/fan.webp` | Ventilateur |
| `dist/items/lockers.webp` | Vestiaires |

**Niveau 3 — Dojo gymnase**

| Fichier | Objet |
|---|---|
| `dist/items/tatami.webp` | Tatamis neufs |
| `dist/items/mirrors.webp` | Miroirs muraux |
| `dist/items/rack.webp` | Râtelier d’armes |
| `dist/items/lights.webp` | Éclairage neuf |
| `dist/items/showers.webp` | Douches |

**Niveau 4 — Dojo de quartier**

| Fichier | Objet |
|---|---|
| `dist/items/sign.webp` | Enseigne lumineuse |
| `dist/items/ring.webp` | Ring d’entraînement |
| `dist/items/sauna.webp` | Sauna |
| `dist/items/trophies.webp` | Vitrine à trophées |
| `dist/items/assistant.webp` | Coach assistant |

**Niveau 5 — Dojo renommé**

| Fichier | Objet |
|---|---|
| `dist/items/garden.webp` | Jardin zen |
| `dist/items/dummies.webp` | Mannequins de bois |
| `dist/items/press.webp` | Salle de presse |
| `dist/items/physio.webp` | Kinésithérapeute |
| `dist/items/tournament.webp` | Tournoi annuel |

**Niveau 6 — Dojo de luxe**

| Fichier | Objet |
|---|---|
| `dist/items/marble.webp` | Sol en marbre |
| `dist/items/spa.webp` | Spa privé |
| `dist/items/chef.webp` | Chef cuisinier |
| `dist/items/limousine.webp` | Navette en limousine |
| `dist/items/champion.webp` | Champion invité |

**Niveau 7 — Dojo militaire**

| Fichier | Objet |
|---|---|
| `dist/items/obstacle.webp` | Parcours d’obstacles |
| `dist/items/armory.webp` | Armurerie |
| `dist/items/bunker.webp` | Bunker d’entraînement |
| `dist/items/helipad.webp` | Héliport |
| `dist/items/general.webp` | Général instructeur |

**Niveau 8 — Dojo high-tech**

| Fichier | Objet |
|---|---|
| `dist/items/holo.webp` | Sparring holographique |
| `dist/items/sensors.webp` | Capteurs de frappe |
| `dist/items/robots.webp` | Robots partenaires |
| `dist/items/ai.webp` | Coach IA |
| `dist/items/vr.webp` | Salle de réalité virtuelle |

**Niveau 9 — Dojo spatial**

| Fichier | Objet |
|---|---|
| `dist/items/gravity.webp` | Gravité artificielle |
| `dist/items/airlock.webp` | Sas d’accueil |
| `dist/items/window.webp` | Baie panoramique sur la Terre |
| `dist/items/shuttle.webp` | Navette de recrutement |
| `dist/items/station.webp` | Station d’entraînement orbitale |

**Niveau 10 — Rue alien**

| Fichier | Objet |
|---|---|
| `dist/items/alien-bag.webp` | Sac d’occasion alien |
| `dist/items/alien-speaker.webp` | Enceinte portable alien |

**Niveau 11 — Salle délabrée alien**

| Fichier | Objet |
|---|---|
| `dist/items/alien-mats.webp` | Tapis de sol alien |
| `dist/items/alien-poster.webp` | Posters de champions alien |
| `dist/items/alien-windows.webp` | Fenêtres réparées alien |
| `dist/items/alien-fan.webp` | Ventilateur alien |
| `dist/items/alien-lockers.webp` | Vestiaires alien |

**Niveau 12 — Dojo gymnase alien**

| Fichier | Objet |
|---|---|
| `dist/items/alien-tatami.webp` | Tatamis neufs alien |
| `dist/items/alien-mirrors.webp` | Miroirs muraux alien |
| `dist/items/alien-rack.webp` | Râtelier d’armes alien |
| `dist/items/alien-lights.webp` | Éclairage neuf alien |
| `dist/items/alien-showers.webp` | Douches alien |

**Niveau 13 — Dojo de quartier alien**

| Fichier | Objet |
|---|---|
| `dist/items/alien-sign.webp` | Enseigne lumineuse alien |
| `dist/items/alien-ring.webp` | Ring d’entraînement alien |
| `dist/items/alien-sauna.webp` | Sauna alien |
| `dist/items/alien-trophies.webp` | Vitrine à trophées alien |
| `dist/items/alien-assistant.webp` | Coach assistant alien |

**Niveau 14 — Dojo renommé alien**

| Fichier | Objet |
|---|---|
| `dist/items/alien-garden.webp` | Jardin zen alien |
| `dist/items/alien-dummies.webp` | Mannequins de bois alien |
| `dist/items/alien-press.webp` | Salle de presse alien |
| `dist/items/alien-physio.webp` | Kinésithérapeute alien |
| `dist/items/alien-tournament.webp` | Tournoi annuel alien |

**Niveau 15 — Dojo de luxe alien**

| Fichier | Objet |
|---|---|
| `dist/items/alien-marble.webp` | Sol en marbre alien |
| `dist/items/alien-spa.webp` | Spa privé alien |
| `dist/items/alien-chef.webp` | Chef cuisinier alien |
| `dist/items/alien-limousine.webp` | Navette en limousine alien |
| `dist/items/alien-champion.webp` | Champion invité alien |

**Niveau 16 — Dojo militaire alien**

| Fichier | Objet |
|---|---|
| `dist/items/alien-obstacle.webp` | Parcours d’obstacles alien |
| `dist/items/alien-armory.webp` | Armurerie alien |
| `dist/items/alien-bunker.webp` | Bunker d’entraînement alien |
| `dist/items/alien-helipad.webp` | Héliport alien |
| `dist/items/alien-general.webp` | Général instructeur alien |

**Niveau 17 — Dojo high-tech alien**

| Fichier | Objet |
|---|---|
| `dist/items/alien-holo.webp` | Sparring holographique alien |
| `dist/items/alien-sensors.webp` | Capteurs de frappe alien |
| `dist/items/alien-robots.webp` | Robots partenaires alien |
| `dist/items/alien-ai.webp` | Coach IA alien |
| `dist/items/alien-vr.webp` | Salle de réalité virtuelle alien |

## 2. Disciples : 34 images dans `dist/disciples/`

Ce sont les élèves qui s’entraînent à côté de Nova. Il y en a un type **par niveau de dojo** (17), chacun avec **2 poses** :

- `NN-ready.webp` : en garde, immobile (NN = `01` à `17`).
- `NN-jab.webp` : même personnage, bras avant tendu, en train de frapper.

- **440 × 440 px**, personnage entier, vu de profil comme les sprites existants, **tourné vers la gauche** (comme `dist/sprites/disciple-ready.webp`, à regarder avant de commencer).
- Les deux poses d’un même niveau ont **exactement la même taille, le même cadrage et le même pied arrière au même pixel** : le jeu passe de l’une à l’autre, rien ne doit « sauter ».
- Tous les niveaux : même carrure de base et même hauteur, seule la tenue change. Pas de visage détaillé : deux points pour les yeux, pas de bouche.

| Niveaux | Disciple |
|---|---|
| `01` | *Street kid: hoodie, worn sneakers, hand wraps, messy hair. Humble.* |
| `02` | *Beginner in mismatched old gym clothes, simple headband.* |
| `03` | *Plain tracksuit or tank top, clean sneakers.* |
| `04` | *Plain white karate gi, white belt.* |
| `05` | *Clean gi with a colored belt, subtle red trim.* |
| `06` | *Tailored dark gi with one thin gold line. Elegant, calm.* |
| `07` | *Olive combat fatigues, boots, no insignia, no text.* |
| `08` | *Sleek white and dark training suit with one thin cyan strip.* |
| `09` | *Slim spacesuit, helmet visor raised, magnetic boots.* |
| `10` | *Alien disciple, young: slim body, large calm eyes, smooth skin in a muted teal-grey, ragged cloth wrap. Humble.* |
| `11` | *Same species, patched shell-like vest, bare feet.* |
| `12` | *Plain resin training wrap, one faint turquoise dot.* |
| `13` | *Simple woven alien gi with a flat abstract pattern.* |
| `14` | *Robe with a muted crystal collar, calm violet accents.* |
| `15` | *Pale pearl robe with a very thin gold-violet edge.* |
| `16` | *Dark uniform with a few flat bone plates, one faint violet light.* |
| `17` | *Sleek suit with a single thin ring of pale light around the waist.* |

## 3. Fans : 12 images dans `dist/crowd/`

Les fans forment la foule qui encourage Nova quand le combo monte. Ils sont vus **de face, bras levés**, au premier plan, et le jeu les affiche **en petit** (environ 100 px de haut), devant des flammes. Garde donc des **silhouettes très simples et lisibles**.

- **256 × 384 px**, personnage entier, de face. Visage très simple (deux points, pas de bouche), pas de détails de vêtement.
- Pour chaque fan, **2 poses** : `-a` bras mi-hauteur, `-b` bras tendus en l’air. Même taille, même cadrage, mêmes pieds au même pixel.
- Six personnages : trois humains (Terre, niveaux 1 à 9) et trois aliens (planète alien, niveaux 10 à 17). Ils doivent se **distinguer par la silhouette** (taille, coiffure, forme du corps), pas par la couleur.

| Fichiers | Fan |
|---|---|
| `dist/crowd/human-1-a.webp`, `human-1-b.webp` | *Tall slim person, short hair, casual jacket.* |
| `dist/crowd/human-2-a.webp`, `human-2-b.webp` | *Short stocky person, cap, t-shirt.* |
| `dist/crowd/human-3-a.webp`, `human-3-b.webp` | *Medium person, long hair or ponytail, sleeveless top.* |
| `dist/crowd/alien-1-a.webp`, `alien-1-b.webp` | *Tall slender alien, long neck, large head, smooth muted teal skin.* |
| `dist/crowd/alien-2-a.webp`, `alien-2-b.webp` | *Small round alien, big eyes, short arms, muted violet-grey skin.* |
| `dist/crowd/alien-3-a.webp`, `alien-3-b.webp` | *Medium alien with a crest or horns, broad shoulders, muted blue-grey skin.* |

## Vérifications avant de commiter

1. Les 151 fichiers existent, avec exactement ces noms et dans ces dossiers (79 dans `items/`, 34 dans `disciples/`, 12 dans `crowd/`).
2. Tailles : 256×256 (objets), 440×440 (disciples), 256×384 (fans). Fond transparent partout.
3. Les deux poses d’un même disciple ou fan sont **superposables** (même cadrage, même point d’appui).
4. Aucun texte ni logo. Couleurs sourdes, formes simples, lisibles à 100 px de haut.
5. Tu n’as modifié aucun fichier de code.

## Si tu manques de temps

Fais dans cet ordre : disciples (34), puis fans (12), puis objets du niveau 1 à 9, puis objets alien. Commite par lot, avec les noms exacts : je branche ce qui existe.
