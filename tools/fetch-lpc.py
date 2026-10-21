import urllib.request,urllib.parse,json,pathlib,concurrent.futures
root=pathlib.Path('dist/assets/lpc');root.mkdir(parents=True,exist_ok=True)
files={}
for action in ['walk','swing','hurt']:
 for name,base in {'body':'sprite/character/Body/Base/Human_male/Ivory','hood':'sprite/character/Clothes/Head/Human_male/Chain Hood','mail':'sprite/character/Clothes/Torso/Human_male/Chainmail Shirt','plate':'sprite/character/Clothes/Torso 2/Human_male/Breastplate/Silver','pants':'sprite/character/Clothes/Legs/Human_male/Tight Pants/Black','boots':'sprite/character/Clothes/Feet/Human_male/Armored Boots/Silver'}.items():
  files[f'{name}-{action}.png']=f'{base}/{action}.png'
files.update({'sword.png':'sprite/character/Weapons/Human_male/Swing/Short Sword/short sword.png','goblin.png':'sprite/original/Redshrike/goblin/goblin.png','goblin-sword.png':'sprite/original/Redshrike/goblin/goblinsword.png'})
for n in ['grass','dirt','treetop','trunk','rock','water']:files[n+'.png']=f'tileset/original/Sharm/outdoor/PNG/{n}.png'
for n in ['LICENSE.txt','LICENSE-CC-BY-SA-3.0.txt','README.md']:files[n]=n
files['chests.png']='tileset/original/Sharm/object/chests.png'
def get(item):
 name,path=item;url='https://raw.githubusercontent.com/OpenGameArt/LiberatedPixelCup/master/'+urllib.parse.quote(path)
 try: urllib.request.urlretrieve(url,root/name);return name,'ok'
 except Exception as e:return name,str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for item in pool.map(get,files.items()):print(*item)
(root/'sources.json').write_text(json.dumps(files,indent=2))
