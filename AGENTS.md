# Braise — règles communes aux assistants IA

Ce fichier est la référence partagée par Codex et Claude. `CLAUDE.md` l’importe ; ne pas maintenir deux copies des règles.

## Reprendre une session

1. Lire ce fichier puis `docs/HANDOFF.md` : état actuel, contrôles précédents et prochaine étape.
2. Lire seulement les sections utiles de `ROADMAP.md`, `docs/AI_CONTEXT.md` et `docs/ARCHITECTURE.md`.
3. Examiner `git status` et les fichiers concernés avant de modifier quoi que ce soit. Conserver le travail utilisateur.
4. Choisir une petite étape avec un résultat jouable et un critère de validation. Les idées de la roadmap ne sont pas toutes des demandes d’implémentation immédiates.

## Intentions du projet

- Idle RPG gratuit pour navigateur desktop et mobile, interface française, style pixel art LPC.
- Combats automatiques lisibles, décisions utiles, progression compréhensible. Préserver une expérience tactile.
- Le personnage regarde sa cible ; les animations de marche, attaque, riposte et mort doivent correspondre à l’action.
- Préserver la sauvegarde existante. Toute évolution de schéma doit avoir migration, valeur par défaut et scénario de reprise.
- Éviter les dépendances et infrastructures sans besoin démontré. Le jeu est actuellement statique, sans backend.
- Ne pas présenter une fonctionnalité prévue comme déjà livrée.

## Développer

- `dist/` est actuellement le **code source servi**, pas un dossier jetable. Ne pas le nettoyer ou le remplacer par un build.
- `dist/game.js` pilote la simulation ; `dist/scene.js` affiche la scène et écoute les événements. Ne pas faire dépendre la progression du framerate.
- Préférer des fonctions explicites et des constantes nommées. Améliorer les parties touchées sans lancer de refonte générale.
- Utiliser des mappings de lignes **par spritesheet** ; ne jamais supposer que tous les sprites LPC ont les mêmes directions.
- Respecter pause et réduction des mouvements ; les contrôles doivent rester utilisables au clavier et au toucher.
- Conserver les fichiers source des assets, crédits et licences. Tout nouvel asset doit être gratuit, compatible visuellement et documenté dans les crédits.

## Vérifier et livrer

- Lancer `npm run check` (Node 22+) ou `node tools/check.mjs`. Aucune installation npm nécessaire.
- Pour un changement visuel ou interactif, lancer `python3 -m http.server 8080 --directory dist`, vérifier le scénario concerné dans un vrai navigateur en desktop et mobile. Voir `docs/TESTING.md`.
- Une vérification de syntaxe ne prouve pas que le rendu fonctionne. Distinguer vérifié, non vérifié et limitation connue.
- Ajouter des tests de comportement pour les changements du moteur/sauvegarde ; éviter les tests qui recopient l’implémentation ou une assertion artificielle pour un simple ajustement visuel.
- Commits signés par signoff : `git commit -s`. Utiliser `rtk git` lorsqu’il est installé. Messages conventionnels en français, sans faux identifiant Jira ni trailer de co-auteur IA.
- GitHub `origin` contient le projet et sa documentation. La publication Sites est un flux séparé : suivre `docs/DEPLOYMENT.md`.
- Ne pas écraser l’historique distant, changer la visibilité du dépôt ou supprimer une sauvegarde utilisateur sans demande explicite.

## Passer le relais

À la fin d’une étape, mettre à jour `docs/HANDOFF.md` (état, fichiers, contrôles, limites, prochaine action), les cases réellement terminées de `ROADMAP.md` et les décisions structurantes dans `docs/DECISIONS.md`.
Ne pas dépendre d’une mémoire privée de Codex ou Claude pour une information nécessaire à la reprise. Ne pas inscrire de secrets, jetons ou données de compte dans la documentation.
