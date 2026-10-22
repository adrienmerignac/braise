# Braise

Un idle RPG en pixel art LPC, jouable dans le navigateur sur desktop et mobile. Un chevalier affronte les gobelins de la forêt des Murmures, récolte de l’or, améliore son équipement et défie un gardien pour passer à l’étage suivant.

**Licence : code sous [MIT](LICENSE) ; les assets (LPC, Kenney) gardent leurs licences propres, voir « Assets et licences ».** Contributions par pull request : [CONTRIBUTING.md](CONTRIBUTING.md).

**État : bêta jouable 0.12.0.** [Changelog](CHANGELOG.md). [Jouer à la version stable (Sites)](https://braise-idle-rpg.lemonyhake5.chatgpt.site) (connexion ChatGPT) ou [à la version de test continu (Pages)](https://adrienmerignac.github.io/braise/). Les deux sauvegardes sont séparées, sans migration automatique : passer par Exporter puis Importer. [Dépôt GitHub](https://github.com/adrienmerignac/braise).

## Lancer en local

Prérequis : Python 3 pour servir les fichiers, Node.js 22+ pour les contrôles. Le jeu n’a aucune dépendance npm.

```sh
git clone https://github.com/adrienmerignac/braise.git
cd braise
python3 -m http.server 8080 --directory dist
```

Ouvrir http://localhost:8080. Ne pas ouvrir `index.html` en `file://` : les scripts utilisent les modules JavaScript.

```sh
npm run check
```

`dist/` contient aujourd’hui les sources HTML/CSS/JS et les assets directement servis. Il ne faut pas l’effacer comme un dossier de compilation.

## Déjà jouable (0.12.0)

- Combat automatique ; expérience, niveaux et trois améliorations (attaque, vitalité, or par victoire).
- Frappe de braise active (dégâts ×4, recharge de 15 secondes) ; gardien de zone débloqué après cinq victoires.
- Trois zones à débloquer par étage atteint, avec carte et voyage : forêt des Murmures (étages 1 à 5), ruines englouties (6 à 10) et cryptes de cendre (11 et au-delà). Chacune a ses ennemis, son décor, ses objectifs, son butin favorisé et un gardien propre : Gardien de braise, Sentinelle engloutie, Gardien des cendres.
- Butin d’équipement (armes, armures, charmes) avec raretés, inventaire avec comparaison, recyclage et amélioration, talents réinitialisables, fragments de récit relisibles dans la carte.
- Bestiaire des ennemis rencontrés et succès, consultables dans le panneau Carte.
- Automatisations débloquées en jeu : gardien automatique (sauf combat jugé Mortel) et achat automatique de l’amélioration la moins chère, avec leurs réglages.
- Rallumage de la braise : remise à zéro de l’expédition contre des éclats (+7,5 % de gains chacun), avec un aperçu exact avant de confirmer.
- Sauvegarde locale `braise-v2` (migrée depuis `braise-v1`), export et import de la partie en JSON, gains d’absence plafonnés à huit heures.
- Réglages de son, de mouvement, d’effets et de taille du texte ; pause ; réduction des mouvements respectée ; clavier et toucher.

## Documentation partagée Codex / Claude

| Document | Rôle |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Règles communes aux assistants ; importées par [CLAUDE.md](CLAUDE.md). |
| [Relance](docs/HANDOFF.md) | Point de reprise court, contrôles et prochaine étape. |
| [Contexte IA](docs/AI_CONTEXT.md) | Intentions utilisateur, état réel et contraintes. |
| [Roadmap](ROADMAP.md) | Étapes priorisées, dépendances et critères de fin. |
| [Architecture](docs/ARCHITECTURE.md) | Fichiers, simulation, événements et sauvegarde. |
| [Direction du jeu](docs/GAME_DESIGN.md) | Boucle de jeu et principes d’équilibrage. |
| [Vérifications](docs/TESTING.md) | Commande de contrôle et recette manuelle. |
| [Équilibrage](docs/EQUILIBRAGE.md) | Durée d’une expédition et progression sur 1, 3 et 7 jours (M5.1). |
| [Décisions](docs/DECISIONS.md) | Choix établis et sujets encore ouverts. |
| [Publication](docs/DEPLOYMENT.md) | Pages (test continu) et Sites (stable), sauvegardes séparées. |
| [Donner un retour](docs/BETA.md) | Guide du testeur bêta et formulaire de retour de partie. |

## Assets et licences

Personnages et décors : [Liberated Pixel Cup](https://github.com/OpenGameArt/LiberatedPixelCup), sous CC BY-SA 3.0 dans cette distribution ; artistes et sources détaillés dans [les crédits du jeu](dist/credits.html). Les couches originales, licences et sprites assemblés sont conservés dans `dist/assets/lpc/`. Les icônes d’amélioration Kenney Tiny Dungeon sont CC0. Le code du jeu est sous [licence MIT](LICENSE) ; cette licence ne couvre pas les assets, qui restent sous leurs licences d’origine. Pour contribuer : [CONTRIBUTING.md](CONTRIBUTING.md).

Les scripts `tools/fetch-lpc.py` et `tools/compose-hero.py` permettent de récupérer et composer les couches LPC ; Pillow est nécessaire uniquement à la composition. `tools/fetch-lpc.py` télécharge les couches à un commit amont figé (`f61104a`) ; les sources sont listées dans `dist/assets/lpc/sources.json`. Le jeu utilise les fichiers déjà inclus, sans téléchargement au lancement.

## Limites actuelles

Sauvegarde propre au navigateur et à l’origine, sans compte ni synchronisation : changer d’adresse impose d’utiliser Exporter puis Importer. Les gains hors ligne sont une estimation sans simulation des défaites. Équilibrage exploratoire, aucune monétisation. Installable (manifeste, icônes) et jouable hors ligne après une première visite (service worker en pré-cache versionné) ; une nouvelle version s’annonce par un bandeau « Recharger » qui sauvegarde avant de recharger. La recette sur appareils réels reste à faire (`docs/TESTING.md`). Le code du jeu est sous licence [MIT](LICENSE) ; les licences des assets sont conservées séparément.

## État des contrôles

`npm run check` (Node 22+) lance les contrôles en local. GitHub Actions exécute les mêmes à chaque push et pull request (`.github/workflows/check.yml`), puis déploie `dist/` sur GitHub Pages après fusion sur `main` (`.github/workflows/pages.yml`). Le jeu est publié sur <https://adrienmerignac.github.io/braise/> ; le retour arrière est décrit dans [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
