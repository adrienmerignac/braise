# Contribuer à Braise

Les contributions extérieures sont les bienvenues, par pull request. Le code est sous licence [MIT](LICENSE) : en proposant une PR, tu acceptes qu’elle soit publiée sous cette licence.

## Proposer une PR

1. Ouvre ou commente une issue pour décrire le changement, puis crée une branche depuis `main`.
2. Fais un changement ciblé, avec un message de commit conventionnel en français (`feat(scope): sujet`).
3. Lance `npm run check` (Node 22+, aucune installation npm) : il doit finir à **0**.
4. Pour un changement visuel ou interactif, vérifie-le dans un vrai navigateur, desktop et mobile (voir `docs/TESTING.md`).

## Règles du projet

- **Assets** : tout asset ajouté est gratuit, crédité (`dist/credits.html`) et accompagné de sa licence. Le fichier MIT ne couvre que le code, pas les assets.
- **Pas de télémétrie**, et pas de dépendance ni d’infrastructure nouvelle sans besoin démontré : le jeu reste statique, sans backend.
- **Sauvegarde** : la sauvegarde existante des joueurs est préservée. Tout changement de schéma passe par une migration, une valeur par défaut et un test de reprise.
- Un changement de moteur ou de sauvegarde vient avec un test de comportement dans `tests/`.
