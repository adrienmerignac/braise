# Braise

Un idle RPG en pixel art LPC, jouable dans le navigateur sur desktop et mobile. Un chevalier affronte les gobelins de la forêt des Murmures, récolte de l’or, améliore son équipement et défie un gardien pour passer à l’étage suivant.

**État : bêta jouable 0.9.0.** [Changelog](CHANGELOG.md). [Jouer à la version privée](https://braise-idle-rpg.lemonyhake5.chatgpt.site) (connexion ChatGPT). [Dépôt GitHub](https://github.com/adrienmerignac/braise).

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

## Déjà jouable (0.9.0)

- Combat automatique ; expérience, niveaux et trois améliorations (attaque, vitalité, or par victoire).
- Frappe de braise active (dégâts ×4, recharge de 15 secondes) ; gardien de zone débloqué après cinq victoires.
- Trois zones à débloquer par étage atteint, avec carte et voyage : forêt des Murmures (étages 1 à 5), ruines englouties (6 à 10) et cryptes de cendre (11 et au-delà). Chacune a ses ennemis, son décor, ses objectifs, son butin favorisé et un gardien propre : Gardien de braise, Sentinelle engloutie, Gardien des cendres.
- Butin d’équipement (armes, armures, charmes) avec raretés, inventaire avec comparaison, recyclage et amélioration, talents réinitialisables, fragments de récit relisibles dans la carte.
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
| [Décisions](docs/DECISIONS.md) | Choix établis et sujets encore ouverts. |
| [Publication](docs/DEPLOYMENT.md) | GitHub et hébergement Sites. |
| [Donner un retour](docs/BETA.md) | Guide du testeur bêta et formulaire de retour de partie. |

## Assets et licences

Personnages et décors : [Liberated Pixel Cup](https://github.com/OpenGameArt/LiberatedPixelCup), sous CC BY-SA 3.0 dans cette distribution ; artistes et sources détaillés dans [les crédits du jeu](dist/credits.html). Les couches originales, licences et sprites assemblés sont conservés dans `dist/assets/lpc/`. Les icônes d’amélioration Kenney Tiny Dungeon sont CC0.

Les scripts `tools/fetch-lpc.py` et `tools/compose-hero.py` permettent de récupérer et composer les couches LPC ; Pillow est nécessaire uniquement à la composition. Le téléchargement référence actuellement la branche amont `master` : la roadmap prévoit de figer les versions. Le jeu utilise les fichiers déjà inclus, sans téléchargement au lancement.

## Limites actuelles

Sauvegarde propre au navigateur et à l’origine, sans compte ni synchronisation : changer d’adresse impose d’utiliser Exporter puis Importer. Les gains hors ligne sont une estimation sans simulation des défaites. Équilibrage exploratoire, aucune monétisation. Installable (manifeste, icônes) et jouable hors ligne après une première visite (service worker en pré-cache versionné) ; une nouvelle version s’annonce par un bandeau « Recharger » qui sauvegarde avant de recharger. La recette sur appareils réels reste à faire (`docs/TESTING.md`). La licence du code du jeu reste à choisir avant une diffusion publique ; les licences des assets sont déjà conservées séparément.

## État des contrôles

Le contrôle local `node tools/check.mjs` passe. Le workflow GitHub Actions est configuré ; sa [première exécution](https://github.com/adrienmerignac/braise/actions/runs/39548401450) a été bloquée avant toute étape par la facturation ou le plafond de dépenses du compte GitHub. Après régularisation dans les paramètres du compte, relancer le workflow pour obtenir une validation CI.
