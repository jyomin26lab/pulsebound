# Interface arcade et icônes

Cette version reprend les principes graphiques des deux références fournies : typographie condensée et italique, panneaux inclinés, aplats contrastés, contours sombres, ombres franches et trames discrètes. Elle garde le dojo nocturne orange et le personnage de Pulsebound. Les logos et personnages des références ne sont pas repris.

Palette : encre `#142b30`, bleu pétrole `#294b54`, crème `#fff1c1`, jaune `#ffcc3c`, orange `#ed8541`, accent bleu `#83d2d5`. `arcade.css`, chargé en dernier, habille les composants et fenêtres existants. La police Barlow Condensed sert aux titres ; Impact et Arial Narrow prennent le relais si les polices distantes ne sont pas accessibles.

Les icônes sont des dessins SVG originaux, réalisés directement en vecteurs pour rester nets aux petites tailles. Chaque fichier possède un viewBox de 96 × 96, un titre et un fond transparent autour de l’écusson.

| Fichier | Rôle |
| --- | --- |
| `dist/icons/disciple.svg` | Recrue avec bandeau et kimono |
| `dist/icons/adept.svg` | Adepte avec masque et poings levés |
| `dist/icons/master.svg` | Maître aux cheveux argentés et barbe |
| `dist/icons/power.svg` | Poing et flammes, technique de puissance |
| `dist/icons/focus.svg` | Œil géométrique, précision rythmique |
| `dist/icons/fury.svg` | Éclair dans une explosion graphique |
| `dist/icons/legacy.svg` | Portique et flamme, transmission |
| `dist/icons/coin.svg` | Pièce dorée, éclats du dojo |

La planche `art/collection.svg` rassemble les huit dessins. Les portraits des recrues utilisent une silhouette et un accent distincts ; les techniques restent identifiables par leurs symboles. Les icônes placées dans des boutons dont le texte donne déjà le sens sont décoratives (`alt=""`). Les libellés accessibles des achats, les onglets au clavier et la réduction des mouvements sont conservés.

La mise en page garde les achats à droite sur ordinateur et sous l’arène sur mobile. Une variante compacte conserve les commandes principales dans la fenêtre de jeu lorsque la hauteur du navigateur est réduite. Le rythme, les prix, les sauvegardes et les multiplicateurs ne sont pas modifiés par cette refonte graphique.

Les commandes de combat ajoutent les icônes SVG originales kick.svg et uppercut.svg, dans la même palette. Auto est un bouton à état ; Pied et Uppercut arment le prochain coup, Danse règle les transitions. Sur les écrans de 360 px ou moins, les quatre commandes occupent deux rangées pour conserver des cibles tactiles lisibles.
