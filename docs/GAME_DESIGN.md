# Direction du jeu

## Promesse

Une aventure qui progresse pendant les petites pauses, avec des combats lisibles et quelques décisions utiles. Ambiance chaleureuse autour de la braise, sous-bois mystérieux et dangers croissants. Desktop et mobile doivent proposer la même boucle, sans exiger des clics permanents.

## Boucle actuelle

Combat automatique → or et expérience → amélioration → cinq victoires → gardien → nouvel étage. La frappe de braise est une intervention ponctuelle ; les améliorations sont les principaux choix du prototype. Après une défaite, repli gratuit avec butin conservé.

## Valeurs du prototype

| Règle | Valeur/formule actuelle |
| --- | --- |
| Attaque auto | Toutes les 1,2 s |
| Attaque du héros | `8 + 4 × arme + 2 × (niveau − 1)` |
| Vitalité maximale | `100 + 35 × armure + 10 × (niveau − 1)` |
| Or par victoire | `(8 + 3 × étage + 3 × charme) × multiplicateur du type` (arrondi bas) |
| Vie d’un ennemi | `(8 + 38 × étage) × multiplicateur du type` (arrondi bas) |
| Type d’ennemi | `types de la zone courante[(étage − 1 + victoires) % 3]`, déduit de la sauvegarde (zone inconnue : forêt) |
| Éclaireur gobelin | PV ×1 · riposte ×1 · or ×1 |
| Pillard des Murmures | PV ×0,7 · riposte ×1,4 · or ×1,2 |
| Traqueur des sous-bois | PV ×1,3 · riposte ×0,8 · or ×1,3 |
| Araignée des ruines | PV ×1,1 · riposte ×1 · or ×1,1 · coups normaux ×0,75 · braise ×1,5 |
| Chauve-souris des voûtes | PV ×0,6 · riposte ×1,5 · or ×1,2 |
| Gelée des citernes | PV ×1,5 · riposte ×0,7 · or ×1,3 · braise ×0,6 |
| Serpent de cendre | PV ×1,2 · riposte ×1,1 · or ×1,2 · coups normaux ×0,75 · braise ×1,5 |
| Spectre des caveaux | PV ×0,8 · riposte ×1,6 · or ×1,3 · braise ×1,5 |
| Œil des cryptes | PV ×1,4 · riposte ×1,2 · or ×1,4 · coups normaux ×0,85 |
| Modificateurs de dégâts | « coups normaux » (attaque auto) et « braise » (frappe de braise) multiplient les dégâts du héros, arrondi bas, au moins 1 ; le gardien n’en a pas |
| Nom du gardien | Forêt : Gardien de braise · Ruines : Sentinelle engloutie · Cryptes : Gardien des cendres (PV ×5 et or ×8 inchangés) |
| Riposte d’un ennemi | `(3 + 1,4 × étage) × multiplicateur − 1,5 × armure`, au moins 1 |
| Vie d’un gardien | `(8 + 38 × étage) × 5` ; ignore le type |
| Or de gardien | Récompense de base × 8 ; ignore le type |
| Expérience | 10 par ennemi, 40 par gardien |
| Niveau suivant | `35 × niveau` points d’expérience |
| Compétence | Attaque × 4 ; recharge de 15 s |
| Prix d’amélioration | `floor(prix initial × 1,5^niveau)` ; bases 24/30/40 |
| Absence | Estimation des victoires sur 8 h maximum, sans défaites ni gardiens |

Ces chiffres décrivent le code actuel ; ils ne sont pas un objectif d’équilibrage définitif.

## Équipement (butin et inventaire)

Les objets tombent en combat et pendant l'absence, et sont sauvegardés dans l'inventaire. Le panneau Inventaire permet de les équiper : équiper échange avec l'objet en place (qui retourne dans l'inventaire), déséquiper est refusé quand l'inventaire est plein (message visible), et la comparaison avant/après porte sur l'attaque, la vie max et l'or par victoire.

- **Emplacements** : arme (attaque), armure (vitalité max et réduction de riposte), charme (or par victoire). Les bonus s'ajoutent aux améliorations achetées.
- **Bonus d'un objet** : `floor(base × multiplicateur de rareté × (1 + 0,15 × (niveau − 1)))`, au moins 1 ; le niveau d'objet est l'étage. Bases : arme +3 attaque, armure +20 vitalité et −1 riposte, charme +2 or.
- **Raretés** : commun ×1, rare ×1,6, épique ×2,5.

| Source | Chance d'objet | Commun / rare / épique |
| --- | --- | --- |
| Ennemi ordinaire | 12 % | 75 % / 22 % / 3 % |
| Gardien | 100 % | 0 % / 85 % / 15 % |

Soit, par ennemi ordinaire : 9 % commun, 2,64 % rare, 0,36 % épique. L'emplacement dépend de la zone courante (gardien compris) : la zone favorise un emplacement (50 %, les deux autres 25 %) — forêt : arme, ruines : armure, cryptes : charme. Poids dans `LOOT_ZONE_SLOT_WEIGHTS` (`balance.js`), zone inconnue → forêt. Le panneau Carte l'indique pour chaque zone, fermée comprise.

- **Inventaire plein** (24 objets) : l'objet de moindre rareté est converti en or (commun 5, rare 15, épique 40) et le journal le dit.
- **Absence** : espérance du tirage (12 % des victoires, arrondi bas, 6 objets maximum, jamais d'épique, emplacements en rotation de 4 : prédilection de la zone courante, autre, prédilection, autre), listée dans le panneau de retour.

## Zones

| Zone | Étages | Accès |
| --- | --- | --- |
| Forêt des Murmures | 1 à 5 | Toujours ouverte |
| Ruines englouties | 6 à 10 | Vaincre le gardien de l’étage 5 |
| Cryptes de cendre | 11 et plus (sans plafond) | Vaincre le gardien de l’étage 10 |

- Une zone est ouverte quand le meilleur étage atteint (`meilleurEtage`, au moins l’étage courant, +1 à chaque gardien vaincu) est au moins son premier étage.
- Vaincre le gardien du dernier étage d’une zone donne la récompense normale, ouvre la suivante et remet les victoires à 0, mais l’étage reste à la fin de la zone jusqu’au voyage.
- Voyager mène au plus haut étage atteint dans la plage de la zone (au moins son premier étage), remet les victoires à 0, remplace le combat en cours (gardien abandonné sans pénalité) et conserve la vie. Revenir en arrière est permis.
- Sauvegarde v5 : `zone` et `meilleurEtage` ; une partie v4 reprend dans la zone de son étage. Absence : calculée sur l’étage courant, aucune zone ne s’ouvre.

- Rythme mesuré (`tools/simulate.mjs`, sans talent) : ruines ouvertes à 157 s, cryptes à 329 s, gardien de l’étage 15 à 550 s de jeu.

### Objectifs de zone

Deux objectifs par zone, chacun accompli une seule fois, avec de l’or versé à l’accomplissement (valeurs de départ dans `OBJECTIFS`, `dist/engine/balance.js`).

| Zone | Chasse : 25 ennemis ordinaires | Gardien de l’étage |
| --- | --- | --- |
| Forêt | 100 or | 5 : 200 or |
| Ruines | 300 or | 10 : 600 or |
| Cryptes | 700 or | 15 : 1400 or |

- Seules les victoires en ligne dans la zone courante font avancer la chasse ; l’absence ne fait progresser aucun objectif. Le compteur se borne à la cible.
- Sauvegarde v6 : `objectifs`. Une partie v5 reprend avec les compteurs à 0 et le gardien accompli (or versé une fois) pour chaque zone dont la cible est déjà dépassée par `meilleurEtage`.

### Récits

- Quatre courts fragments (2 à 3 phrases, tutoiement) sur la braise et le camp : `braise` (dès le départ), `ruines` (`meilleurEtage` ≥ 6), `cryptes` (≥ 11), `cendres` (≥ 16). Table dans `dist/engine/recits.js` ; textes et seuils sont des valeurs de départ réversibles.
- Le déblocage se déduit de `meilleurEtage`, sans compteur. L’absence n’avance jamais `meilleurEtage` : elle ne débloque ni n’annonce aucun récit.
- Un récit débloqué par la victoire d’un gardien et pas encore lu produit un événement `recit` (`id`), une seule fois. Aucun dialogue bloquant.
- Sauvegarde v7 : `recitsLus`. Une partie v6 qui a progressé (`meilleurEtage` > 1) reprend avec tous ses récits débloqués considérés comme lus ; une partie sans progrès reprend avec une liste vide. Identifiants inconnus ignorés, doublons retirés, valeur non tableau réparée.
- Affichage : un encart non bloquant (titre et texte, bouton « Fermer » qui marque le récit lu) apparaît quand aucun autre encart n’est ouvert et jamais avant la fin du guide ; rechargé sans fermer, il réapparaît. Le panneau Carte liste les fragments : texte complet si débloqué, sinon la condition écrite (« Vaincre le gardien de l’étage 10 »).

### Collection du bestiaire

- Douze entrées : les 9 types de `ENEMY_CATALOG` (par clé) et un gardien par zone (`gardien:foret`, `gardien:ruines`, `gardien:cryptes`). Chacune porte `vus` (rencontré au moins une fois) et `victoires` (entier ≥ 0, borné à `Number.MAX_SAFE_INTEGER`). Logique pure dans `dist/engine/bestiaire.js`.
- L’apparition d’un ennemi (nouvel adversaire, gardien, voyage, ennemi repris au chargement) le marque `vu` ; une victoire en session incrémente `victoires` de l’ennemi vaincu.
- **L’absence ne crédite jamais la collection** (comme elle ne fait jamais avancer les étages) : le calcul hors ligne ne modifie ni `vus` ni `victoires`.
- Informative : aucun bonus, aucun effet sur la puissance ni sur l’équilibrage. Interface à venir.
- Sauvegarde v8 : `bestiaire`. Une partie v7 reprend avec les types des zones déjà atteintes (`ZONES[z].debut <= meilleurEtage`) `vus` et 0 victoire ; le gardien d’une zone est `vu` si `meilleurEtage > ZONES[z].fin`. Clés inconnues ignorées, nombres non finis ou négatifs ramenés à 0, champ non objet remplacé par une collection vierge (sauvegarde `repaired`, reste de la partie conservé). Une v9 reste `future`.

### Succès

Neuf succès, obtenus une seule fois, **informatifs** : aucun or, aucun bonus, aucun effet sur l'équilibrage, aucune condition liée au calendrier. Table `SUCCES` dans `dist/engine/succes.js` (valeurs de départ, réversibles) ; sauvegarde v9 (`succes`, liste d'identifiants).

- **Étages** : atteindre l'étage 25, 50, 100 (`meilleurEtage`).
- **Bestiaire** : rencontrer les 12 entrées ; remporter 500 victoires (somme du bestiaire).
- **Objectifs** : accomplir les 6 objectifs de zone ; lire les 4 récits.
- **Build** : équiper un objet épique ; investir 5 points de talent.

Évalués en session après chaque changement (victoire, gardien, équipement, talent, récit lu, voyage) ; l'absence n'en déclenche aucun. Une partie reprise reçoit sans annonce les succès déjà remplis. 
**Affichage** : section « Succès » du panneau Carte, après le bestiaire (compteur « 3 / 9 succès », puis libellé, état écrit « Obtenu » / « À obtenir » et progrès chiffré quand la cible dépasse 1). À chaque succès obtenu en session : une ligne du journal et un encart non bloquant « Succès obtenu » (bouton Fermer, Échap), en file d'attente : jamais avant la fin du guide ni par-dessus un autre encart ouvert, un seul à la fois, une annonce polie par succès. La file n'est pas sauvegardée : un succès déjà obtenu n'est jamais réannoncé au rechargement.

### Automatisations

Première automatisation (M5.4a) : **lancer le gardien**. La frappe de braise reste manuelle (« intervention ponctuelle ») . Deuxième automatisation (M5.4c) : **l'achat automatique** (moteur et sauvegarde ; l'interface vient ensuite). Valeurs de départ, réversibles ; module `dist/engine/automatismes.js`, sauvegarde v11 (`automatismes: { gardien: false, achat: false }`).

- **Déblocage** : gardien de l'étage 10 vaincu (`meilleurEtage > AUTO_GARDIEN_DEBLOCAGE`). Avant, l'automatisme n'existe pas pour le joueur.
- **Éteint par défaut**, même débloqué : c'est le joueur qui l'active (`basculerAutomatisme`, refusée si non débloqué). Réglage visible : voir « Affichage ».
- **Limite** : actif, le gardien est lancé dès qu'il est disponible (5 victoires de l'étage), seulement si `assessGuardian` ne le juge pas « Mortel » (sinon le bouton reste au joueur) et seulement quand l'ennemi ordinaire est intact (jamais au milieu d'un échange). Jamais en pause, avant la fin du guide, ni pendant l'absence (qui n'affronte aucun gardien). Journal : « Gardien lancé automatiquement ».
- **Pas de simulation** : la décision (`doitLancerGardien`, pure) est prise dans le pas de combat de `dist/game.js`, jamais dans la boucle de rendu : même résultat en pas de 1 s ou de 16 ms.
- **Sauvegarde** : v9 → v10 éteint toute partie ; une valeur `true` sur une partie non débloquée est ramenée à `false`.
- **Affichage** (M5.4b) : zone `journey`, au-dessus du bouton « Affronter ». Avant déblocage, la case est masquée et une ligne écrit la condition (« Gardien automatique : vaincre le gardien de l’étage 10 »). Au déblocage en session : une ligne de journal et une annonce polie « Gardien automatique disponible », sans encart. Ensuite, case « Gardien automatique » (décochée par défaut, persistée dans `automatismes`) avec sa limite écrite (« Lance le gardien dès qu’il est prêt, sauf s’il est jugé Mortel »). Actif, gardien prêt et « Mortel » : le bouton « Affronter » reste utilisable et « Gardien automatique en attente : danger Mortel » l’explique.
- **Achat automatique** (M5.4c, clé `achat`) : débloqué quand le gardien de l'étage 15 est vaincu (`meilleurEtage > AUTO_ACHAT_DEBLOCAGE`), éteint par défaut, bascule refusée avant. Actif, au plus **une** amélioration par pas de combat : la moins chère parmi arme, armure, charme (égalité : arme, armure, charme), si l'or suffit et si elle n'est pas au niveau max (`choisirAchatAuto`, pure ; l'achat passe par `buyUpgrade`, même événement et même soin d'armure). Jamais en pause, avant la fin du guide, ni pendant l'absence : l'or rapporté n'est dépensé qu'aux pas suivants. Journal : « Achat automatique : Arme niveau 12 », sans annonce aux lecteurs d'écran. Décision prise dans le pas de combat de `dist/game.js`, comme le gardien.
- **Sauvegarde v10 → v11** : `achat: false` ajouté sans toucher à `gardien` ; `true` sur une partie non débloquée revient à `false`.


## Objectifs à valider

- Premier achat accessible rapidement et effet immédiatement lisible.
- Premier gardien compréhensible et franchissable avec une progression modeste.
- Choix entre attaque, survie et rendement, puis entre équipements/builds.
- Chaque biome apporte ennemis, ambiance et récompenses distincts.
- À court terme : un parcours intéressant de 20–30 minutes avant d’étendre la durée de vie.
- À moyen terme : retours quotidiens utiles sans mécaniques punitives ni obligation de présence.

## Direction artistique

Personnages LPC détaillés, environnement cohérent en tuiles 32 px, frames de personnage 64 px affichées à une échelle lisible. Ne pas lisser le pixel art. Silhouettes distinctes pour héros, ennemis et gardiens. Actions lisibles par animation, son optionnel, effets et nombres ; la couleur seule ne doit pas porter une information essentielle.

Les animations servent l’action : approche → coup → impact → réaction → retour ou chute. Feu, particules et lucioles restent secondaires. Prévoir un mode effets réduits et une pause visuelle cohérente.

## Choix encore ouverts

Classes, types de loot, profondeur des arbres de talents, modalités du prestige, histoire et structure de carte restent à définir avec Adrien au jalon concerné. Pas de monétisation, de compétition ou de multijoueur planifiés pour le MVP.
