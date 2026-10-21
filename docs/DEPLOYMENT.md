# Dépôt et publication

## Deux destinations

- **GitHub** : `https://github.com/adrienmerignac/braise`, privé ; historique, documentation et contrôles CI.
- **Sites** : hébergement de la version jouable privée. Identité existante dans `.openai/hosting.json`, contenu statique dans `dist/`.

Un push GitHub seul ne déploie pas le jeu sur Sites. La CI GitHub exécute les contrôles ; elle ne possède pas de clé de déploiement. Ne pas créer un nouveau Site pour mettre à jour celui-ci.

## Flux GitHub

`origin` pointe vers GitHub. Pour une prochaine fonctionnalité, créer une branche courte, vérifier, commiter avec `-s`, pousser et ouvrir une PR si demandé ou approprié au travail. La première livraison du dépôt est directement sur `main`.

```sh
npm run check
git status --short
git add <fichiers>
git commit -s -m "fix: décris la correction"
git push origin <branche>
```

Utiliser `rtk git` si disponible. Ne jamais inclure un secret dans un remote, un fichier ou un exemple de commande.

## Flux Sites

Lorsqu’un assistant dispose du plugin Sites, suivre son skill et ses outils natifs :

1. Lire l’identité existante, récupérer le Site et vérifier son accès privé actuel.
2. Obtenir un credential source temporaire et synchroniser via le helper officiel avant d’éditer.
3. Implémenter, vérifier localement, commiter avec signoff et pousser GitHub.
4. Faire pousser le **même état de source** dans le dépôt géré par Sites via son helper, puis empaqueter `dist/` avec le manifest.
5. Sauvegarder/déployer cette version privée exacte. Vérifier le statut terminal et l’URL avant d’annoncer la publication.

Le dépôt source Sites n’est pas le remote `origin` GitHub. Les credentials ne doivent exister qu’en mémoire et transiter par l’entrée standard du helper, jamais dans le dépôt. Si Claude ou Codex ne dispose pas des outils Sites, livrer le commit GitHub et indiquer que la publication n’a pas été effectuée ; ne pas prétendre qu’un push a mis le jeu en ligne.

## Évolutions futures

L’automatisation de publication et une éventuelle migration d’hébergeur sont des décisions à prendre au jalon de diffusion. Préserver la même origine ou fournir export/import avant de changer d’URL : le stockage local est lié à l’origine.
