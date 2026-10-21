# Braise
Prototype d’Idle RPG responsive en français, sans dépendance de compilation.

## Lancer
`python3 -m http.server 8080 --directory dist`

Ouvrir http://localhost:8080. Le jeu sauvegarde dans le navigateur (localStorage).

## Boucle de jeu
Combat automatique toutes les 1,2 s, expérience, améliorations d’attaque/vitalité/or, compétence active avec recharge de 15 s, boss après cinq victoires et étages sans fin. Gains d’absence plafonnés à huit heures. Repli gratuit après défaite.

## Assets
Tiny Dungeon de Kenney, CC0 : https://kenney.nl/assets/tiny-dungeon. Licence incluse dans dist/assets. Typographies Google Fonts ; polices système en secours.

## Limites du prototype
Sauvegarde locale uniquement, pas de compte ni synchronisation. Équilibrage initial à affiner. Les gains hors ligne sont estimés, sans simulation des défaites. Pas de monétisation.

## Direction graphique 0.2
Forêt LPC au crépuscule, héros en armure par couches, gobelin de Redshrike. Marche d’approche, coup d’épée, attaque du gobelin, chute/disparition, particules d’impact, frappe spéciale, feu animé et lucioles. La pause fige aussi la scène et les préférences de réduction des mouvements sont respectées.

Crédits accessibles depuis le jeu dans `dist/credits.html`. Sources et licences accompagnent les fichiers de `dist/assets/lpc`. `tools/fetch-lpc.py` récupère les ressources depuis le dépôt officiel ; `tools/compose-hero.py` compose les couches (Pillow requis uniquement pour cette opération). La sauvegarde `braise-v1` est conservée.
