# Étude PWA : installabilité et cache hors ligne (M6.6)

Étude seulement : rien n'est implémenté, aucun fichier de `dist/` n'est modifié. Les références `fichier:ligne` sont relevées sur la branche au moment de l'étude. `dist/game.js` est minifié sur quelques longues lignes : la ligne citée est celle du fichier.

## Recommandation en une ligne

**Go conditionnel, priorité basse.** Une PWA ne met jamais la sauvegarde en danger (§4), mais son vrai bénéfice (jouer hors ligne, icône d'écran d'accueil) ne justifie le travail qu'une fois l'hébergement cible connu (M7.3) et les icônes fournies. Détail et décisions attendues en §7.

## 1. État actuel

- **Service** : `dist/` est le code source servi tel quel, sans build (`docs/DEPLOYMENT.md`). Publication privée via Sites (`.openai/hosting.json` : `static.directory = "dist"`). Pas de backend.
- **Local** : `npm run start` = `python3 -m http.server 8080 --directory dist` (`package.json`). `npm run check` = `node tools/check.mjs` (syntaxe, références HTML, tests). Les scripts sont des modules ES (`<script type="module">`, `dist/index.html`) : l'ouverture directe `file://` est bloquée par la plupart des navigateurs, un serveur est donc nécessaire.
- **Chargés au démarrage** (59 fichiers dans `dist/`, dont une partie seulement au démarrage) :
  - `index.html` ; `style.css` ; `game.js` et `scene.js` (modules) ;
  - `engine/*.js` importés statiquement : `affichage, annonces, audio, balance, combat, etincelles, offline, save, scene-queue, sons, state` ;
  - `assets/lpc/portrait.png` (`index.html`) ; les 10 images de `files` dans `dist/scene.js:21` (`hero-walk, hero-swing, hero-hurt, goblin-sword, grass, dirt, treetop, trunk, rock, chests`), chargées par `new Image()` à `dist/scene.js:57-61` ;
  - 3 tuiles `assets/Tiles/tile_0100|0104|0110.png`, construites dynamiquement à `dist/game.js:44` (`assets/Tiles/tile_${…}.png`) ;
  - `credits.html` : ouvert à la demande (lien du pied de page).
- **⚠ Dépendance externe** : `dist/style.css:1` fait `@import` de **Google Fonts** (DM Sans, Space Grotesk). Hors ligne, ces polices manquent : le jeu s'affiche avec la police de repli (`sans-serif`), sans erreur bloquante. Mettre ces polices en cache est possible mais ce sont des ressources tierces opaques ; les héberger soi-même demande de les ajouter aux assets (licence OFL, à créditer) : **décision du propriétaire** (§7).
- **Sauvegarde** : `localStorage`, clé `braise-v2` (`SAVE_KEY`, `dist/engine/state.js:2`), ancienne clé `braise-v1` conservée (`LEGACY_SAVE_KEY`). Schéma `SAVE_VERSION = 2`. API en lecture/écriture de `dist/engine/save.js` : `loadSave` (`:117`), `writeSave` (`:130`, un `setItem`), `serializeSave` (`:33`), `importSave` (`:135`), `migrate` (`:22`). Le stockage est injecté : `dist/game.js:13` (lecture) et `:17` (écriture) lui passent `localStorage`.

## 2. Ce que l'installabilité exigerait

- **Manifeste web** (`manifest.webmanifest` + `<link rel="manifest">` dans `index.html`) : `name`, `short_name`, `start_url`, `scope`, `display: standalone`, `lang: fr`, `background_color`/`theme_color`. `theme_color` existe déjà dans `index.html` (`#151a18`).
- **Icônes** : **aucune n'existe dans le dépôt** (pas de favicon non plus). Ce sont des assets manquants : pas de génération, question au propriétaire. Tailles à fournir :
  - 192×192 et 512×512 PNG (exigées par Chrome pour l'installation) ;
  - 512×512 « maskable » (zone de sécurité centrale d'environ 80 %) ;
  - 180×180 `apple-touch-icon` pour iOS ;
  - optionnel : 32×32/48×48 pour l'onglet, `.svg`.
  Chaque icône ajoutée doit être gratuite, créditée, avec sa licence (`AGENTS.md`).
- **Service worker** : un fichier `sw.js` à la racine de `dist/` (sa portée ne dépasse pas son dossier), enregistré depuis `index.html` ou `game.js`. Il faut aussi une réponse en ligne valide du `start_url` pour que Chrome propose l'installation.
- **HTTPS** : obligatoire hors `localhost` (le service worker n'existe qu'en contexte sécurisé). À vérifier pour l'hébergement Sites privé ; `http://localhost:8080` suffit pour le développement.
- **Portée et origine** : le `scope` doit couvrir tout ce qui est servi (si le jeu est servi sous un sous-chemin, `start_url` et `scope` doivent être relatifs : `./`). Le stockage est lié à l'**origine** ; une PWA installée partage le `localStorage` de l'onglet de cette origine sur Chrome/Android, mais **pas toujours sur iOS** (une PWA ajoutée à l'écran d'accueil peut disposer d'un stockage séparé de Safari, à vérifier sur appareil réel : non vérifié ici).

## 3. Stratégies de cache comparées

| | Pré-cache versionné | Réseau d'abord |
| --- | --- | --- |
| Hors ligne | jeu complet dès la 2ᵉ visite | seulement les fichiers déjà vus |
| Mise à jour | nouvelle version de `sw.js` | automatique si en ligne |
| Vieux `game.js` | possible jusqu'au rechargement | rare (hors ligne uniquement) |

**A. Pré-cache versionné** (`CACHE = 'braise-<version>'`, tous les fichiers de §5 listés dans `install`)
- *Hors ligne* : démarrage immédiat et complet, même sans réseau (polices tierces exclues, §1).
- *Mise à jour* : à chaque release, changer le nom du cache (ex. relier à `version` de `package.json`, `0.2.1`) ; l'événement `activate` supprime les anciens caches de `braise-*`. Le nouveau worker reste « en attente » tant que des onglets utilisent l'ancien. Il faut une liste de fichiers tenue à jour (ou générée par un petit script `node`, sans dépendance).
- *Risque* : l'onglet ouvert reste sur l'ancien `game.js` jusqu'à fermeture/rechargement. Si une version plus récente a écrit un schéma plus récent depuis un autre appareil/onglet puis qu'on rouvre l'ancienne : `parseSave` renvoie `status: 'reset'` pour toute `version !== SAVE_VERSION` (`dist/engine/save.js:75`) et le jeu **repart d'une partie neuve** puis écrase `braise-v2` à la prochaine sauvegarde. Le risque est donc réel dans ce sens (« vieux code, schéma plus récent »), et la parade doit être décidée avant d'implémenter (§6/§7). Mélanger anciens et nouveaux fichiers est le second risque : d'où un cache **unique** par version, rempli de façon atomique.

**B. Réseau d'abord (repli sur le cache)**
- *Hors ligne* : les fichiers déjà récupérés sont servis depuis le cache ; une première visite sans réseau ne marche pas.
- *Mise à jour* : aucune procédure, le réseau gagne tant qu'il répond. Le cache est mis à jour à chaque réponse réussie.
- *Risque* : mélange possible hors ligne si le cache contient `game.js` de la version N et `engine/save.js` de N+1 (chargés à des moments différents) ; en ligne tout est cohérent. Latence : chaque démarrage attend le réseau (ou son délai d'expiration) avant de basculer sur le cache. Les images LPC, immuables, peuvent être servies cache d'abord sans risque.

**Choix suggéré si GO** : A pour la cohérence (un seul instantané de fichiers), avec `skipWaiting` **désactivé** et un message « mise à jour disponible, recharge » plutôt qu'un rechargement automatique qui interromprait un combat.

## 4. Sauvegardes : le cache ne touche pas à la partie

Démonstration par le code :
- Le cache d'un service worker (`CacheStorage`) et `localStorage` sont deux stockages distincts : un worker n'a **pas accès** à `localStorage` (API synchrone indisponible dans les workers) et `caches.delete` ne concerne que les caches.
- Le jeu n'appelle jamais `removeItem` ni `clear` : `grep -n "removeItem\|\.clear" dist/game.js dist/engine/*.js` ne renvoie rien. Les seules écritures sont `setItem(SAVE_KEY, …)` dans `writeSave` et, une seule fois, la copie `braise-v2-secours` (`backupUnreadable`) dans `loadSave` (`dist/engine/save.js:131`). « Nouvelle partie » (`dist/game.js:46`, après `confirm`) repart de `fresh()` puis réécrit la clé ; elle ne la supprime pas.
- `braise-v1` n'est jamais modifiée par `loadSave` (commentaire `dist/engine/save.js:115-116`) : une migration reste rejouable.
- Un service worker ajouté ne changerait ni `SAVE_KEY` ni le schéma ; il ne ferait que servir les mêmes fichiers.

Cas à risque et couverture actuelle :
- **Changement d'origine ou de chemin** (autre domaine, port, passage de Sites à un hébergeur public) : le `localStorage` est vide à la nouvelle adresse (déjà noté dans `docs/DEPLOYMENT.md` et `docs/TESTING.md`). Couvert par **Exporter/Importer** JSON (`dist/game.js:46` ; `importSave` n'accepte que ce que `parseSave` juge intact, sinon rien ne change). Dépend de l'utilisateur : ouvrir une PWA depuis une nouvelle origine ne récupère rien tout seul.
- **Désinscription du service worker / vidage du cache** : sans effet sur `braise-v2`, mais *Effacer les données du site* efface tout à la fois (cache **et** `localStorage`). Couvert uniquement par l'export manuel.
- **Vidage par le navigateur** (pression de stockage, Safari qui purge après environ 7 jours sans visite pour les sites non installés, mode privé) : la partie peut disparaître. Une demande `navigator.storage.persist()` est une amélioration possible de la PWA installée, non garantie. Couvert seulement par l'export.
- **Version du jeu plus ancienne que la sauvegarde** : voir §3 A, `status: 'reset'` puis écrasement. Non couvert aujourd'hui ; la migration (`migrate`, `dist/engine/save.js:22`) ne gère que v1→v2 vers l'avant.
- **Stockage indisponible** : `loadSave` ne lève pas et renvoie `status: 'unavailable'`, le jeu l'annonce (`dist/game.js:50`).

Tests voisins : `tests/engine/save.test.mjs`, `tests/engine/persistance.test.mjs`, `tests/engine/offline.test.mjs`.

## 5. Effets de bord et poids

- **Gains d'absence** : `offlineGains` (`dist/engine/offline.js:12`) calcule d'après l'horloge (`Date.now()` moins `last`), plafonné à 8 h (`OFFLINE_CAP_SECONDS = 28800`, `dist/engine/balance.js:32`). « Hors ligne » dans le jeu veut dire *joueur absent*, pas *réseau coupé* : mode avion ou service worker ne changent rien au calcul. Une PWA rend en revanche possible de **rouvrir le jeu sans réseau** et de toucher ces gains, ce qui est le vrai gain d'usage.
- **Pause et onglet masqué** : les combats ne frappent pas quand `document.hidden` (`dist/game.js:50`), la sauvegarde part à `visibilitychange` et `pagehide`, et au retour `collectAway()` rejoue l'absence. Un service worker n'exécute pas la simulation en arrière-plan et ne modifie pas ces règles ; la progression reste indépendante du framerate. À conserver : aucune synchronisation en arrière-plan à ajouter.
- **Poids mesuré** (`stat`/`du` sur `dist/`, 59 fichiers) :
  - `dist/` complet : **716 125 octets** (~700 Kio, 828 Kio comptés en blocs par `du -sk`) ;
  - code (`index.html`, `style.css`, `game.js`, `scene.js`, `engine/*.js`) : **74 543 octets** ;
  - images chargées par le jeu (10 de `files` + `portrait.png`) : **139 055 octets** ; 3 tuiles : environ 0,6 Kio ; `credits.html` : 2,2 Kio ;
  - **Pré-cache utile : ~217 Kio** (code + images utilisées + tuiles + crédits). Pré-cacher tout `dist/` coûterait ~700 Kio, dont ~490 Kio d'images LPC (calques `body-*`, `hood-*`, `mail-*`, `plate-*`, `pants-*`, `boots-*`, `goblin.png`, `sword.png`, `water.png`) que ni `scene.js:21` ni `index.html` ne référencent (non vérifié pour un usage futur).
  - Polices Google : hors décompte, non mesurées.

## 6. Coût estimé (tranches d'une heure, sans dépendance)

1. **Manifeste + balises + icônes intégrées** (`manifest.webmanifest`, `<link>`, `apple-touch-icon`, crédits) : 1 h, *après* livraison des icônes.
2. **Service worker pré-cache versionné** (liste des fichiers, install/activate, purge des anciens caches, enregistrement) : 1 h.
3. **Mise à jour sans surprise** : bandeau « nouvelle version, recharger », garde-fou de schéma (§3 A) et message clair si la sauvegarde est plus récente que le jeu : 1 h.
4. **Tests** : test de comportement sur la liste de pré-cache (elle doit correspondre aux fichiers de `dist/` ; à intégrer à `tools/check.mjs`) et sur la garde de schéma ; 1 h.
5. **Recette appareil** : installation Android/Chrome et iOS/Safari, mode avion, mise à jour d'une version à l'autre avec partie en cours, vérification que `braise-v2` survit : 1 h.
6. **Documentation** (`docs/DEPLOYMENT.md`, `docs/TESTING.md`) : 0,5 h.

Total : environ **5 à 6 h**, plus les polices si elles sont auto-hébergées (+1 h).

## 7. Recommandation et décisions attendues

**Go conditionnel.** Pour : jeu statique, peu de fichiers (~217 Kio utiles), sauvegarde indépendante du cache, usage typique « petites pauses » sur mobile qui profite d'une icône d'accueil et d'un démarrage sans réseau. Contre : risque de vieux code face à un schéma plus récent (à traiter), polices tierces non couvertes, comportement iOS à vérifier sur appareil, charge de maintenance de la liste de pré-cache à chaque release. Tant que le jeu reste privé sur Sites, le gain est faible ; à reprendre avec M7.3.

Décisions attendues du propriétaire :
- **Icônes** : fournir ou choisir un visuel (192, 512, maskable 512, 180 ; licence gratuite créditée). Aucune n'est générée ici.
- **Nom** : `name` complet (« Braise · Idle RPG ») et **nom court affiché** sous l'icône (≤ 12 caractères conseillés, ex. « Braise »).
- **Hébergement cible (M7.3)** : domaine et chemin définitifs, HTTPS, et politique de migration d'origine (le stockage suit l'origine). Le `scope` et le `start_url` en dépendent.
- **Polices** : accepter la police de repli hors ligne, ou auto-héberger DM Sans/Space Grotesk (licence à créditer).
- **Stratégie** : pré-cache versionné (conseillé) ou réseau d'abord ; et la parade au « vieux code face à une sauvegarde plus récente » (bandeau + refus d'écraser, ou migration descendante).
- **Go / no-go** et, si go, l'ordre par rapport à M7.
