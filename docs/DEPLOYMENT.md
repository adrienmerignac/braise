# Dépôt et publication

## Deux destinations

- **GitHub** : `https://github.com/adrienmerignac/braise`, public depuis le 2026-10-21 ; historique, documentation et contrôles CI.
- **Pages** : adresse publique stable pour les joueurs (voir plus bas).
- **Sites** : adresse privée (connexion ChatGPT). Identité existante dans `.openai/hosting.json`, contenu statique dans `dist/`.

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

## GitHub Pages — adresse publique stable

- **URL** : `https://adrienmerignac.github.io/braise/` (sous-chemin `/braise/` : tout chemin de `dist/` reste relatif, contrôlé par `npm run check`).
- **Déclencheurs** : chaque `push` sur `main` (fusion de PR) et `workflow_dispatch` manuel. `.github/workflows/pages.yml` lance `npm run check` (Node 22) puis publie `dist/` tel quel, sans build ; un seul déploiement à la fois (`concurrency`).
- **Rôle** : adresse publique stable pour les joueurs (décision du 23/10, M7.3), republiée à chaque fusion sur `main`. Sites reste l'adresse privée (connexion ChatGPT) ; Pages n'y touche pas.
- **Sauvegarde** : le stockage local dépend de l'origine. La partie sur Pages est distincte de celle de Sites : pas de synchronisation, pas de migration entre les deux. Clé et schéma inchangés. Pour changer d'adresse, utiliser Exporter puis Importer (`docs/PWA.md` §4).
- **Prérequis propriétaire** : dépôt public (cas actuel), facturation Actions disponible, et *Settings > Pages > Source = GitHub Actions*. Pour l'alternative de retour arrière par tag ou branche : motif (`v*` ou `retour/*`) ajouté dans *Settings > Environments > github-pages > Deployment branches and tags*.
- **Vérification** : après `deploy-pages`, le workflow lance `node tools/verify-deploy.mjs <page_url>` ; il devient rouge si `index.html` ne répond pas 200, n'affiche pas la version de `package.json` ou si un fichier référencé (`game.js`, `scene.js`, une planche `assets/lpc/`, `credits.html`…) ne répond pas 200. Cinq essais espacés de 10 s absorbent la propagation de Pages.
## Publier une version

Dans la **même PR** : bumper `version` dans `package.json`, la version du pied de page de `dist/index.html` (`Bêta X.Y.Z`) et ajouter l'entrée correspondante dans `CHANGELOG.md`. La vérification de déploiement échoue si le site servi n'affiche pas la version de `package.json`.

## Vérifier un déploiement à la main

```sh
node tools/verify-deploy.mjs https://adrienmerignac.github.io/braise/
```

Code de sortie 0 : version et fichiers servis conformes ; 1 : le rapport en français liste ce qui manque. Options : `--version X.Y.Z` (version attendue autre que celle de `package.json`), `--fichier chemin` (fichier supplémentaire), `--essais N`, `--delai ms`.

## Retour arrière

À suivre pas à pas quand la version en ligne est défectueuse :

1. **Exporter la sauvegarde** : dans le jeu, bouton *Exporter* (fichier JSON). Une sauvegarde locale est conservée au retour arrière (même origine), mais une sauvegarde d'un schéma plus récent n'est jamais écrasée par une version plus ancienne (#49) : le jeu plus ancien ne la chargera pas. L'export permet de la récupérer.
2. **Trouver le dernier commit sain de `main`** : lire `CHANGELOG.md` (dernière version saine) puis `git log --oneline main` pour repérer le commit de fusion correspondant, et copier son SHA.
3. **Redéployer un état sain** : ouvrir une PR de `git revert -m 1 <sha-de-la-fusion-fautive>` et la fusionner sur `main` ; la fusion redéploie automatiquement (`npm run check`, publication de `dist/`, puis vérification du site).
   - Alternative sans toucher à `main` : *Actions > Publication GitHub Pages > Run workflow* sur un tag ou une branche créée sur le SHA sain (par ex. `retour/0.9.0`). Prérequis : cette référence doit être autorisée dans *Settings > Environments > github-pages > Deployment branches and tags* (motif `v*` ou `retour/*`) ; sinon le job `deploy` est refusé (« not allowed to deploy to github-pages due to environment protection rules »), seule `main` étant autorisée par défaut.
4. **Vérifier** : `node tools/verify-deploy.mjs https://adrienmerignac.github.io/braise/ --version <version-du-commit-sain>` doit sortir à 0 (l'étape finale du workflow le fait avec la version du commit déployé).
5. Réimporter l'export JSON si la sauvegarde n'est plus reconnue, puis corriger le défaut dans une PR avant de republier.

## Évolutions futures

L’automatisation de publication et une éventuelle migration d’hébergeur sont des décisions à prendre au jalon de diffusion. Préserver la même origine ou fournir export/import avant de changer d’URL : le stockage local est lié à l’origine.

## Comment une release remplace le cache

1. La release change la version (`package.json`), donc le nom `CACHE` de `dist/sw.js` (`braise-X.Y.Z`) : le navigateur voit un `sw.js` différent et installe un nouveau worker, qui pré-cache ses fichiers dans le nouveau cache.
2. Ce worker **attend** : il ne prend pas la main tout seul (pas de `skipWaiting` à l'install). Les onglets ouverts continuent avec l'ancienne version et affichent le bandeau « Nouvelle version de Braise disponible. ».
3. Au clic sur « Recharger » : sauvegarde immédiate, message `SKIP_WAITING`, activation, purge des anciens caches `braise-*` (jamais `braise-v2`, la sauvegarde), un seul rechargement. Sans clic, la nouvelle version s'active quand tous les onglets sont fermés.
4. Un ancien onglet qui rencontre une sauvegarde plus récente affiche `SAUVEGARDE_FUTURE` et n'écrit rien.

**Retour arrière avec le service worker** : ne jamais revenir à une version *antérieure* du nom de cache, le navigateur ne rechargerait pas un worker « plus ancien » de façon fiable et les clients déjà à jour resteraient sur le code fautif. Le retour arrière publie un état sain sous une version **supérieure** : revert du code fautif **et** bump de version (`package.json`, pied de page, `CHANGELOG.md`, donc `CACHE`), puis les étapes ci-dessus s'appliquent. La procédure « Retour arrière » plus haut vaut pour le code ; ajouter le bump au revert.

## Service worker

- Mettre à jour la version (`package.json`), donc le nom du cache `CACHE` de `dist/sw.js`, à chaque release : c'est ce qui renouvelle le pré-cache et purge les anciens caches `braise-*`.
