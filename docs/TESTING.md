# Vérifier une étape

## Contrôle rapide

Prérequis Node.js 22+, sans dépendance npm :

```sh
npm run check
# équivalent : node tools/check.mjs
```

Le contrôle vérifie syntaxe des modules JS, références locales HTML, liens de la documentation, présence et dimensions des sprites utilisés et contrat de configuration statique. Il ne lance pas un navigateur et ne prouve pas que les animations sont visuellement correctes.

Équilibrage : `node tools/simulate.mjs [minutes]` joue le premier parcours sur le moteur pur (politique décrite en tête du script) et imprime, en secondes de jeu, victoire moyenne à l'étage 1, premier achat, premier gardien et étage atteint ; les constantes sont dans `dist/engine/balance.js`.

## Recette navigateur

```sh
python3 -m http.server 8080 --directory dist
```

Ouvrir http://localhost:8080 dans un vrai navigateur. Pour tester un téléphone sur le même réseau, utiliser l’adresse locale du poste et le port 8080. La sauvegarde est distincte entre domaines/ports/navigateurs.

| Cas | Vérification attendue |
| --- | --- |
| Chargement neuf | HUD cohérent, héros, décor et gobelin visibles ; pas d’asset manquant. |
| Orientation | Héros à gauche tourné à droite ; gobelin à droite tourné à gauche, y compris marche et riposte. |
| Combat normal | Vie ennemie diminue ; approche, coup et impact ; or/XP augmentent après victoire. |
| Compétence | Dégâts ×4, effet distinct, bouton désactivé pendant la recharge. |
| Chute et entrée | Ennemi vaincu tombe/disparaît ; le suivant arrive sans sprite inversé. |
| Amélioration | Achat possible avec assez d’or ; coût déduit une fois et statistique augmentée. |
| Pause | Or, combat et recharge n’avancent plus ; feu, particules et personnages se figent. Reprise sans saut excessif. |
| Gardien | Bloqué avant cinq victoires ; clic ensuite ; victoire ouvre l’étage suivant. |
| Sauvegarde | Recharger conserve or/niveau/étage/améliorations ; documenter toute migration testée. |
| Absence | Revenir après plus d’une minute : panneau de gains, plafond 8 h, absence de double collecte à rejouer après une modification. |
| Mobile | À 390 × 844 puis 360 × 800 : aucun débordement horizontal ; héros et ennemi visibles ; commandes tactiles accessibles. |
| Accessibilité | Navigation clavier, focus visible, texte lisible, préférence de réduction des mouvements prise en compte. |
| Son | Bouton « Son » (`aria-pressed` = son actif) et volume 0–100 % au clavier et au toucher ; actif à 60 % par défaut ; aucun contexte audio avant la première interaction ; suspendu en pause et onglet masqué ; réglages conservés au rechargement et à l’import. Coup sourd à l’impact affiché, souffle de flamme pour la frappe de braise, 2 à 4 pas à l’arrivée d’un adversaire (aucun en mouvement réduit) ; pas de salve après absence, retour d’onglet ou chargement. |
| Mouvement et effets | Défauts « Système » et « Actifs ». En « Réduit » : ni approche, ni balancement, ni pas, ni animation CSS (dégâts flottants, panneau du gardien, barres), même sans préférence système ; « Complet » les rétablit même si le système demande la réduction. En « Discrets » : ni étincelles, ni secousse, ni lucioles, mais l’arc de coup, les dégâts et « −N PV » restent. Application immédiate, conservation au rechargement et à l’import ; usage au clavier et au toucher. |
| Crédits | Lien du pied de page fonctionnel ; sources et licences présentes. |

Pour un changement de sprite, vérifier au moins marche, attaque et chute, pas seulement une frame immobile. Pour une évolution du moteur, ajouter des tests déterministes avec horloge et stockage simulés avant d’étendre la recette manuelle.

## Contrastes

`tests/engine/contrastes.test.mjs` lit les couleurs de `dist/style.css` (et du `<style>` de `dist/credits.html`) et calcule le ratio WCAG de chaque paire. Seuils : 4,5:1 pour le texte, 3:1 pour les contours et indicateurs. Le calcul ne dépend pas de la taille de texte ; le test vérifie que « Grand » ne redéfinit que `--texte`.

Paires contrôlées : texte courant, `--muted`, `--orange` et `--green` sur fond de page, panneau et bandeau des ressources ; étiquette, journal, dialogues ; boutons principal, secondaire, d’achat, désactivé/trop cher (détail à 80 % compris) et boutons du gardien/guide/dialogues ; barre audio et réglages ; bandeau et carte sur la scène (fond de scène supposé, le canvas n’est pas mesuré) ; crédits ; contours de focus, de contrôles, alerte mortelle et étapes du gardien.

Un bouton désactivé se lit aussi par son bord pointillé (pas d’opacité réduite) : la couleur n’est pas seule.

## Résultats

Consigner dans `HANDOFF.md` le scénario joué, le viewport, les commandes passées et les vérifications non réalisées. Ne pas réutiliser une validation de la session précédente comme preuve d’une modification actuelle.
