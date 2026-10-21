# Décisions du projet

## D001 — Application statique pour le prototype (accepté)

HTML, CSS, modules JavaScript et Canvas 2D ; aucun backend ni package runtime. Permet de lancer et héberger simplement le jeu. Extraire le moteur testable avant de choisir un framework plus lourd.

## D002 — Direction artistique LPC (accepté)

Le premier prototype Kenney était trop sommaire. Utiliser personnages et décors LPC, conserver les sources et crédits, montrer marche et combat. Kenney reste utilisé pour quelques icônes. Les mappings de directions appartiennent à chaque planche.

## D003 — Mémoire partagée versionnée (accepté)

`AGENTS.md` est canonique et `CLAUDE.md` l’importe. `docs/HANDOFF.md` porte la relance courte, `AI_CONTEXT.md` le contexte stable et `ROADMAP.md` les priorités. Pas de duplication Codex/Claude et pas de dépendance à l’historique privé d’un assistant.

## D004 — GitHub privé et Sites séparé (accepté pour cette livraison)

Créer `adrienmerignac/braise` privé ; y conserver code et documentation. Le Site reste privé et son identité est conservée. Le changement de visibilité est une décision utilisateur distincte.

## D005 — Sauvegarde compatible (accepté)

Conserver `braise-v1` pendant les corrections graphiques. Avant d’enrichir le jeu : validation des champs, migrations versionnées et export/import. Ne pas effacer les parties pour contourner une incompatibilité.

## D006 — Périmètre produit (à confirmer aux jalons concernés)

Un biome et une classe suffisent pour stabiliser le moteur. Loot, talents, prestige, synchronisation et installation mobile ne sont pas encore implémentés. Pas de monétisation ou de multijoueur pour le MVP. Licence du code, hébergement public et comptes restent des choix ouverts.
