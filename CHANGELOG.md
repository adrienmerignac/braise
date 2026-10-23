# Changelog

Toutes les évolutions jouables de Braise, de la plus récente à la plus ancienne.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). La version de référence est celle de `package.json`.

## [Non publié]

## [0.13.0] — Adresse publique stable

- Hébergement : GitHub Pages devient l’adresse publique stable (https://adrienmerignac.github.io/braise/), Sites reste l’adresse privée ; changer d’adresse passe par Exporter/Importer (#172).
- Après Exporter, le jeu explique comment reprendre la partie à une autre adresse (`docs/MIGRATION.md`) ; schéma de sauvegarde inchangé (#173).

## [0.12.0] — Rallumage de la braise

- Rallumer la braise : remise à zéro de l’expédition contre des éclats qui augmentent les gains, avec aperçu exact avant de confirmer ; sauvegarde v12, les anciennes parties sont migrées (#155).
- Bouton, aperçu et confirmation dans le panneau Carte (#156).
- La 2e expédition est simulée et son rythme consigné (#157).
- Bonus de rallumage réglé à 7,5 % par éclat pour que la 2e expédition reste dans la fourchette visée ; le panneau Carte affiche une décimale (#161).

## [0.11.0] — Automatisations

- Gardien automatique : le moteur le débloque et le lance dès qu’il est prêt, sauf s’il est jugé Mortel ; sauvegarde v10 (#140).
- Réglage « Gardien automatique » visible et accessible (#141).
- Achat automatique de l’amélioration la moins chère, débloqué en jeu ; sauvegarde v11 (#146).
- Réglage « Achat automatique » visible et accessible (#147).

## [0.10.0] — Rythme et bestiaire

- Équilibrage : l’absence avance moins vite (facteur 1,2 → 2,4, puis 4,8) (#130, #148).
- Équilibrage : montée plus longue vers le gardien 15 (points de vie des ennemis et coût des améliorations) (#131).
- Bestiaire : collection des ennemis rencontrés dans le panneau Carte ; sauvegarde v8 (#132, #133).
- Succès : conditions, annonce non bloquante et liste dans le panneau Carte ; sauvegarde v9 (#138, #139).
- Les polices DM Sans et Space Grotesk sont auto-hébergées : même rendu hors ligne (#122).

## [0.9.1] — Relevé de performance

- `?perf` dans l’URL affiche un petit relevé (images par seconde, temps de `draw`, étincelles, état du rendu) et un bouton « Copier le relevé » ; sans ce paramètre, rien ne change (#124).

## [0.9.0] — Bêta et recette

- Le pied de page affiche « Bêta 0.9.0 ».
- Une partie `braise-v1` plus ancienne est migrée vers `braise-v2` (schéma v7) sans perdre de progression (#108).
- Un retour après huit heures d’absence a été rejoué dans l’interface : gains d’absence plafonnés à 8 heures (#108).
- Une nouvelle partie a été rejouée de la première minute à l’ouverture des ruines (#109).
- Équilibrage : plafonds numériques et reprise d’une partie à haut niveau corrigés (#106).
- Carte : panneau lisible à 360 px et en texte Grand (#100) ; inventaire défilable dans sa zone sur petit écran (#101).

## [0.8.0] — Monde et zones

- Trois zones : la forêt, les ruines et les cryptes, avec une carte et des conditions d’accès (#78, #79).
- Ennemis, gardiens et modificateurs propres à chaque zone, avec leurs planches LPC (#82, #83).
- Un décor dessiné pour chaque zone, chargé d’abord pour la zone courante (#84, #99).
- Objectifs de zone avec récompenses, progression dans la carte et annonce de réussite (#89, #90).
- Chaque zone favorise un emplacement d’équipement dans son butin (#88).
- Fragments de récit du fil de la braise, annoncés sans bloquer le jeu et relisibles dans la carte (#94, #95).
- Sauvegarde : schémas v5, v6 puis v7 ; les anciennes parties sont migrées automatiquement.

## [0.7.0] — Équipement et choix de build

- Butin d’équipement en combat et pendant l’absence, avec raretés (#62, #64).
- Panneau Inventaire : équiper un objet et comparer avant/après (#65).
- Recyclage et amélioration avec confirmation (#66).
- L’arme et l’armure équipées sont visibles sur le héros (#72).
- Talents : investir des points et les réinitialiser avec confirmation (#73, #74).
- Sauvegarde : inventaire, équipement et talents persistés (schémas v3 et v4) ; les anciennes parties sont migrées (#63).

## [0.6.0] — Installabilité et cache hors ligne

- Le jeu est publié automatiquement sur GitHub Pages à chaque mise à jour de la branche principale (#59).
- Étude de l’installation en application et du cache hors ligne, sans risque pour les sauvegardes (#47).

## [0.5.0] — Réglages, accessibilité et assets

- Réglages persistés : mouvement réduit, effets visuels et taille du texte Normal/Grand (#34, #35).
- Focus des panneaux, clavier et annonces pour lecteur d’écran sans bavardage (#36).
- Contrastes de l’interface corrigés (#42).
- Interface adaptée à 360 px, au paysage et à la tablette (#43).
- Étincelles plafonnées et scène non redessinée en pause (#41).
- Sources et licences des assets LPC figées et contrôlées (#33).

## [0.4.0] — Combats satisfaisants et premier parcours

- Dégâts reçus, soins et raison du repli affichés ; puissance du héros et danger de l’adversaire visibles (#18, #19).
- Trois ennemis de forêt, chacun avec sa planche et son échelle ; le gardien a sa silhouette et son attaque (#54, #55, #56).
- Panneau de victoire du gardien, non bloquant (#20).
- Tutoriel court, premier achat guidé, explication du gardien et de l’absence (#25, #26).
- Sons de pas, de coup et de feu, avec bouton muet et volume persistés (#29, #31).

## [0.3.0] — Moteur et sauvegardes fiables

- Sauvegarde versionnée avec migration, export et import JSON, validation des champs et stockage indisponible (#4, #5).
- Une partie d’une version plus récente du jeu n’est jamais écrasée (#49).
- Une copie de secours est gardée avant de repartir d’une partie illisible (#50).
- Gains d’absence unifiés : hors ligne, onglet masqué et rechargement (#6).
- Vie, ennemi, recharge et pause persistés (#8).
- Moteur de jeu testé de façon déterministe, indépendant de l’affichage (#1, #2, #3).

## [0.2.1] — Prototype

- Premier prototype jouable : un chevalier LPC combat seul, gagne de l’or et de l’expérience, achète des améliorations et affronte un gardien.
- Sauvegarde automatique et gains d’absence jusqu’à 8 heures.
