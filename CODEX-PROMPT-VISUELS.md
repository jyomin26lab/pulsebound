# Prompt pour Codex — décors des 17 dojos

Copie tout ce qui suit dans Codex (connecté au dépôt `jyomin26lab/pulsebound`).

---

Tu travailles sur le jeu web **Pulsebound** (dépôt `jyomin26lab/pulsebound`). Le héros, Nova, part de la rue et monte 17 dojos de plus en plus prestigieux, d'abord sur Terre, puis sur une planète alien. Le jeu est déjà programmé pour afficher un décor par dojo : il me manque seulement les images.

## Ta mission

Génère **17 images de décor** et enregistre-les dans le dossier `dist/venues/` avec exactement ces noms : `01.webp`, `02.webp`, … `17.webp`. La liste complète (niveau, nom du dojo, chemin) est dans `VENUES-ART.md`.

- **Ne modifie aucun fichier de code** (`.mjs`, `.html`, `.css`) : le jeu charge ces images tout seul dès qu'elles existent.
- Crée le dossier `dist/venues/` s'il n'existe pas.
- À la fin, fais un seul commit : `Décors des 17 dojos (dist/venues/01 à 17)`.

## Format technique (obligatoire)

- **2000 × 667 pixels** (format 3:1), comme le décor actuel `dist/dojo-brasier.webp`.
- **WebP**, qualité environ 82, **moins de 400 Ko** par fichier.
- Aucun texte, aucun logo, aucune signature, aucun filigrane, **aucun personnage** ni silhouette humaine ou alien.

## Cadrage (le jeu dessine Nova et le sac par-dessus)

Le jeu affiche l'image en mode « couvrir » : sur téléphone, il recadre les côtés et ne garde que le centre. Donc :

- **Caméra de côté**, comme un jeu de combat 2D : on voit le mur du fond face à nous et le sol en bas.
- **Bas du mur vers 73 % de la hauteur** ; le **sol occupe le quart inférieur** et doit rester dégagé.
- **Zone de Nova** (autour de 30 % de la largeur, sur toute la hauteur) : pas d'objet au premier plan, fond calme.
- **Zone du sac** (autour de 76 % de la largeur) : le sac pend du plafond à cet endroit. Laisse cette verticale **vide** : pas de meuble, de poteau ni d'objet. Une poutre, un crochet ou une structure au plafond, juste au-dessus, est bienvenue.
- Garde les éléments importants dans les **60 % centraux**. Les bords gauche et droit peuvent être coupés.
- Le milieu de l'image doit rester **assez sombre et peu chargé** pour que les personnages et les effets restent lisibles.

## Style (le même pour les 17 images)

- Reprends le **rendu, la lumière et la qualité de trait de `dist/dojo-brasier.webp`** : illustration 2D peinte de jeu de combat, contours nets, ombres franches. Ouvre ce fichier et prends-le comme référence de style.
- Ambiance de nuit chaleureuse par défaut (lanternes, lumières orangées), qui évolue avec le prestige du lieu.
- Les 17 images doivent avoir l'air de venir **du même jeu** : même caméra, même hauteur de sol, même palette de base.
- Évite : le rendu photo, la 3D brillante, le pixel art, les dégradés baveux.
- La progression doit se voir : plus le niveau monte, plus le lieu est grand, propre, riche, puis technologique, puis extraterrestre.

## Les 17 décors

Les descriptions sont en anglais : c'est ce qui marche le mieux pour un générateur d'images. Ajoute à chacune les consignes de format, de cadrage et de style ci-dessus.

**Terre**

1. `01.webp` — **La Rue** : *A narrow city back street at night, brick wall with faded torn posters (no readable text), a metal fire escape, a single warm street lamp, puddles on the asphalt, a dumpster pushed to the far left edge. A rusty pipe crossing overhead at the bag spot. Humble, gritty, hopeful.*
2. `02.webp` — **Salle délabrée** : *An abandoned, run-down rented room: cracked plaster walls, peeling paint, boarded and broken windows, bare concrete floor, a single bare light bulb, exposed wooden ceiling beam above the bag spot. Empty, dusty, unequipped, but with potential.*
3. `03.webp` — **Dojo gymnase** : *A simple community gym turned dojo: painted cinder-block walls, high windows, basic fluorescent lights, a plain wooden floor, a steel ceiling truss above the bag spot. Clean but modest.*
4. `04.webp` — **Dojo de quartier** : *A proper neighborhood martial-arts dojo: wooden walls, shoji panels, a calligraphy scroll on the back wall, warm paper lanterns, polished wooden floor. Moderate reputation, cozy and respected.*
5. `05.webp` — **Dojo renommé** : *A renowned traditional dojo: tall dark wooden beams, a large honor wall with framed belts and medals, a view of a zen garden through open sliding doors at night, red and gold accents, warm lantern light.*
6. `06.webp` — **Dojo de luxe** : *A luxury penthouse dojo: marble and dark wood, floor-to-ceiling windows over a glittering city skyline at night, elegant gold lighting, refined minimal decor. Wealthy and exclusive.*
7. `07.webp` — **Dojo militaire** : *A government military training hall: reinforced concrete and steel, olive-drab and gunmetal palette, caution stripes, mesh lamps, a flag-free official emblem shape without text, heavy steel ceiling beam above the bag spot. Disciplined, powerful.*
8. `08.webp` — **Dojo high-tech** : *A high-tech training lab: sleek white and dark panels, holographic displays with abstract shapes only (no text), cyan and orange light strips, a polished reflective floor, a robotic ceiling rail above the bag spot. Futuristic but grounded.*
9. `09.webp` — **Dojo spatial** : *An orbital space-station dojo: curved metal hull, a huge panoramic window showing Earth and stars, soft artificial lighting, magnetic floor plates, a structural ring above the bag spot.*

**Planète alien** (une planète intelligente : architecture organique, lumières bioluminescentes violettes et turquoise, deux lunes dans le ciel). Les niveaux 10 à 17 reprennent les niveaux 1 à 8 dans ce monde, en gardant un air de famille d'une image à l'autre.

10. `10.webp` — **Rue alien** : *An alien city alley at night: organic curved walls of strange stone, bioluminescent plants, glowing alien glyph-like shapes (not readable text), two moons visible, a twisted organic pipe overhead at the bag spot. Humble again, but on another world.*
11. `11.webp` — **Salle délabrée alien** : *A dilapidated alien room: cracked organic shell walls, dim flickering bioluminescent fungus, broken membrane windows, a bony ceiling arch above the bag spot. Empty and neglected.*
12. `12.webp` — **Dojo gymnase alien** : *A simple alien community training hall: smooth resin walls, round high openings, soft turquoise light orbs, a plain living-wood floor.*
13. `13.webp` — **Dojo de quartier alien** : *A respected alien dojo: carved crystal panels, hanging glowing seed-lanterns, polished amber floor, an alien scroll-like woven tapestry with abstract patterns.*
14. `14.webp` — **Dojo renommé alien** : *A renowned alien temple-dojo: towering organic pillars, an honor wall of glowing crystal trophies, a view of a luminous alien garden and two moons through a vast arch.*
15. `15.webp` — **Dojo de luxe alien** : *A luxury alien sky-palace dojo: iridescent pearl surfaces, gold-violet light, panoramic view over a floating alien megacity at night.*
16. `16.webp` — **Dojo militaire alien** : *An alien government military hall: massive dark metal and bone architecture, violet warning lights, imposing symmetric structure, a heavy organic-metal beam above the bag spot.*
17. `17.webp` — **Dojo high-tech alien** : *The ultimate alien high-tech dojo: impossible geometry, floating holographic rings of light (no text), a shimmering energy floor, a glowing dimensional portal swirl on the far back wall (hint of the next dimension), a levitating beam above the bag spot.*

## Vérifications avant de commiter

1. Les 17 fichiers existent, avec exactement ces noms, dans `dist/venues/`.
2. Chaque image fait 2000 × 667 et pèse moins de 400 Ko.
3. Sur chaque image, le sol est en bas, la verticale du sac (vers 76 % de la largeur) est dégagée, et la zone de Nova (vers 30 %) est calme.
4. Aucun texte, logo ni personnage.
5. Tu n'as modifié aucun fichier de code.

## Plus tard (ne pas faire maintenant)

`VENUES-ART.md` liste aussi des icônes d'équipement (`dist/items/…`). Le jeu ne les affiche pas encore : **ne les génère pas** pour l'instant.
