"""Régénère tools/assets-manifest.json (chemin, source, licence, sha256 de chaque PNG de dist/assets)."""
import hashlib, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
assets = root / 'dist/assets'
COMMIT = 'f61104a1ecc54e7bce54b82ada7d7ba4c41bc524'
upstream = json.loads((assets / 'lpc/sources.json').read_text())
derived = {f'hero-{a}.png' for a in ('walk', 'swing', 'hurt')} | {'portrait.png'}
entries = []
for path in sorted(assets.rglob('*.png')):
    rel = path.relative_to(root / 'dist').as_posix()
    name = path.name
    if path.parent.name == 'Tiles':
        source, licence = {'type': 'kenney', 'pack': 'Tiny Dungeon'}, 'CC0'
    elif path.parent.name == 'icons':
        source, licence = {'type': 'derive', 'script': 'tools/make-icons.mjs', 'origine': 'assets/lpc/portrait.png'}, 'CC-BY-SA-3.0'
    elif path.parent.name == 'lpc' and name in derived:
        source, licence = {'type': 'derive', 'script': 'tools/compose-hero.py'}, 'CC-BY-SA-3.0'
    elif path.parent.name == 'lpc' and name in upstream:
        source, licence = {'type': 'lpc', 'depot': 'OpenGameArt/LiberatedPixelCup', 'commit': COMMIT, 'chemin': upstream[name]}, 'CC-BY-SA-3.0'
    else:
        raise SystemExit(f'Source inconnue pour {rel}')
    entries.append({'chemin': rel, 'source': source, 'licence': licence, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
(root / 'tools/assets-manifest.json').write_text(json.dumps({'licences': ['CC-BY-SA-3.0', 'CC0'], 'fichiers': entries}, indent=1, ensure_ascii=False) + '\n')
print(len(entries), 'fichiers')
