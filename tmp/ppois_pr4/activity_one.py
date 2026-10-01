import json,re
p=r'D:/OmniNotation/examples/activity-parallel-pins.omni'
d=json.load(open(p,encoding='utf8'))
for e in d['model']['elements']:
 if e['id']=='compose': e['label']='Сформировать BOM'
d['source']=d['source'].replace('Подготовить BOM','Сформировать BOM')
d['draft']=d['draft'].replace('Подготовить BOM','Сформировать BOM')
json.dump(d,open('tmp/ppois_pr4/activity_one.omni','w',encoding='utf8'),ensure_ascii=False,indent=2)
