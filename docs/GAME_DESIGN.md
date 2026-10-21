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
| Or par victoire | `8 + 3 × étage + 3 × charme` |
| Vie d’un ennemi | `32 + 14 × étage` |
| Vie d’un gardien | Vie d’ennemi × 5 |
| Or de gardien | Récompense normale × 8 |
| Expérience | 10 par ennemi, 40 par gardien |
| Niveau suivant | `35 × niveau` points d’expérience |
| Compétence | Attaque × 4 ; recharge de 15 s |
| Prix d’amélioration | `floor(prix initial × 1,6^niveau)` ; bases 24/30/40 |
| Absence | Estimation des victoires sur 8 h maximum, sans défaites ni gardiens |

Ces chiffres décrivent le code actuel ; ils ne sont pas un objectif d’équilibrage définitif.

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
