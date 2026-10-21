"""Assemble the LPC layers without resampling; derived sprites stay CC BY-SA 3.0."""
from PIL import Image
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'dist/assets/lpc'
for action, columns, rows in [('walk',9,4), ('swing',6,4), ('hurt',6,1)]:
    size = (0, 0, columns*64, rows*64)
    output = Image.new('RGBA', (columns*64, rows*64))
    for layer in ['body','pants','boots','mail','plate','hood']:
        output.alpha_composite(Image.open(p/f'{layer}-{action}.png').convert('RGBA').crop(size))
    if action == 'swing':
        output.alpha_composite(Image.open(p/'sword.png').convert('RGBA').crop(size))
    output.save(p/f'hero-{action}.png')
Image.open(p/'hero-walk.png').crop((0,128,64,192)).save(p/'portrait.png')
