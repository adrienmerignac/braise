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
