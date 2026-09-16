from pathlib import Path
import xml.etree.ElementTree as E
import copy
base=Path('tools/hud-export')
fonts=E.parse(base/'fonts.xml').getroot().find('tags')
font=next(x for x in fonts if x.get('type')=='DefineFont3Tag' and x.get('fontID')=='11')
def patch(name):
 tree=E.parse(base/f'{name}.xml');tags=tree.getroot().find('tags')
 for imp in list(tags):
  if imp.get('type')=='ImportAssets2Tag' and 'font' in imp.get('url',''):
   for id_,alias in zip(imp.find('tags'),imp.find('names')):
    f=copy.deepcopy(font);f.set('fontID',id_.text);f.set('fontName',alias.text+'\\u0000');tags.insert(list(tags).index(imp),f)
   tags.remove(imp)
 if name=='health':
  hidden={'HealthRed','HealthPanelRed','HealthPanelRed_small','HealthPanelBG_small','ArmorIcon','HeavyArmorIcon','HealthBarRed','ArmorBarRed'}
  for sprite in tags:
   if sprite.get('type')!='DefineSpriteTag':continue
   sub=sprite.find('subTags')
   for p in list(sub):
    if p.get('name') in hidden:sub.remove(p)
   if sprite.get('spriteId')=='27':
    state={}
    for p in sub:
     if not p.get('type','').startswith('PlaceObject'):continue
     depth=p.get('depth')
     if p.get('placeFlagHasCharacter')=='true':state[depth]=copy.deepcopy(p)
     elif depth in state:
      target=state[depth]
      for child in p:
       old=target.find(child.tag)
       if old is not None:target.remove(old)
       target.append(copy.deepcopy(child))
    sub.clear()
    for p in state.values():sub.append(p)
    E.SubElement(sub,'item',{'type':'ShowFrameTag','forceWriteAsLong':'false'})
    sprite.set('frameCount','1')
 if name=='timer':
  for sprite in tags:
   if sprite.get('type')!='DefineSpriteTag':continue
   sid=sprite.get('spriteId');sub=sprite.find('subTags')
   if sid=='139':
    keep={'Time','TLabel','CTLabel'}
    for p in list(sub):
     if p.get('type','').startswith('PlaceObject') and p.get('name') not in keep and p.get('characterId')!='7':sub.remove(p)
   if sid=='23':
    for p in list(sub):
     if p.get('type','').startswith('PlaceObject') and p.get('name')!='TimeGreen':sub.remove(p)
 tree.write(base/f'{name}-ready.xml',encoding='utf-8',xml_declaration=True)
patch('health')
patch('timer')
