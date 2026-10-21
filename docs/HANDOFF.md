# Relance — Braise

Dernière mise à jour : 2026-10-21. Ce fichier est commun à Codex et Claude.

## Étape livrée

Correction du gobelin et préparation du dépôt GitHub privé avec documentation IA partagée. Le gobelin utilise désormais explicitement la ligne ouest 3 de sa planche pour marche et riposte ; le héros conserve sa ligne est 3. La chute garde la ligne 4.

## État du projet

Prototype 0.2.1 statique jouable. Documentation : `AGENTS.md` canonique, `CLAUDE.md` importeur, contexte, architecture, game design, recette, décisions, publication et roadmap M0–M7. Contrôle local sans dépendances via `npm run check`, repris par GitHub Actions.

Dépôt prévu : `adrienmerignac/braise`, privé. Publication Sites existante conservée, indépendamment du remote GitHub. La création, le push, la CI et la publication de cette étape sont en cours ; les résultats seront mis à jour avant la fin de la livraison.

## Vérifications de cette étape

- `node tools/check.mjs` : syntaxe JS, références HTML locales, bornes des sprites et manifest statique valides.
- `git diff --check` : passé.
- Navigateur desktop : héros face à droite et gobelin face à gauche pendant le combat automatique ; effets et progression présents.
- Navigateur mobile 390 × 844 : personnages face à face ; largeur document = largeur écran (390 px).
- Sauvegarde locale antérieure reprise ; panneau de gains d’absence affiché puis fermé sans réinitialisation de progression.
- Pas de nouvelle recette exhaustive de l’équilibrage, ni de test sur téléphone physique. Les limites du prototype restent dans le README et l’architecture.

## Prochaine étape proposée

**M1.1 : extraire un moteur pur sans DOM**, en petite tranche. Commencer par état initial, statistiques et coûts, puis tester quelques scénarios connus avant d’extraire la résolution de combat. Ne pas changer les règles ni le schéma `braise-v1` dans cette première tranche.

Lire `AGENTS.md`, la section M1 de `ROADMAP.md` et `docs/ARCHITECTURE.md`. Fichiers ciblés : `dist/game.js`, nouveaux modules de logique et tests. Garder la scène et la sauvegarde compatibles.

## Points à garder en vue

- Événements envoyés avant fin du chargement des images et avant fin de chute : fiabilisation en M1.6.
- `braise-v1` ne persiste ni vie, ni recharge, ni adversaire. Le rechargement restaure actuellement la vie ; décision/tests à faire en M1.7.
- Les gains hors ligne restent estimés, sans simulation de défaite ; M1.5 doit définir le comportement.
- Aucun backend, compte, loot, prestige, PWA ou deuxième biome n’existe encore.
