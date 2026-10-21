# Contexte partagé

## Demande et direction acceptée

Adrien souhaite un nouveau jeu idle RPG gratuit, destiné au navigateur desktop et mobile, avec des graphismes pixel art soignés et des sprites gratuits. Le premier rendu Kenney 16 px était trop sommaire. La direction retenue est LPC : personnages détaillés dans l’esprit du générateur Universal LPC proposé par Adrien, forêt au crépuscule puis ruines et cryptes, animations réellement visibles.

Le jeu s’appelle **Braise** ; le héros est **Le Porte-braise** et la première zone **La forêt des Murmures**. Ce sont les noms du prototype, modifiables si Adrien le demande.

## Ce qui existe

Application statique HTML/CSS/JavaScript, rendu Canvas 2D, sauvegarde locale, combat automatique, niveaux, trois améliorations, une compétence, gardiens et étages. Assets LPC inclus dans le dépôt ; crédits visibles depuis le jeu. L’interface est en français. La version Sites est privée et exige une connexion ChatGPT.

La session qui a introduit LPC a vérifié desktop/mobile 390 px, compétence, pause, sauvegarde existante et victoire contre un gardien jusqu’à l’étage 2. La relance indique les contrôles de la dernière session ; ne pas attribuer ces résultats à de nouveaux changements sans les rejouer.

## Contraintes utiles

- Ne pas perdre ou réinitialiser `braise-v1` pour une évolution graphique.
- Les sprites LPC peuvent avoir des mappings différents : héros est = ligne 3 ; gobelin Redshrike ouest = ligne 3 (la ligne 1 regarde à droite).
- Les décors actuels sont assemblés par Canvas, pas par un éditeur de carte. Il n’y a ni déplacement libre ni exploration de carte jouable.
- La planche du héros est composée hors exécution à partir des couches originales ; aucun éditeur de personnage n’est intégré au jeu.
- Le code du prototype reste compact et partiellement écrit sur de longues lignes ; son extraction en modules de logique est la première étape de fond.
- La documentation du dépôt est la mémoire partagée. Codex et Claude n’ont pas besoin d’accéder à leurs conversations respectives pour reprendre.

## Ne pas supposer

Pas de multijoueur, de backend, d’authentification du jeu, de boutique, de loot aléatoire, de prestige, de PWA ou de build npm existants. Ne pas déduire que la demande de roadmap autorise l’implémentation de toutes ces fonctionnalités.

## Entrée conseillée

Lire `HANDOFF.md`, sélectionner la première tâche non terminée de M1 dans `../ROADMAP.md`, lire `ARCHITECTURE.md` pour le fichier ciblé, puis proposer ou réaliser une petite étape selon la demande d’Adrien.
