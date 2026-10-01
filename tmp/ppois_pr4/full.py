import json,re
p=r'D:/OmniNotation/examples/cards-uml.omni'
d=json.load(open(p,encoding='utf8'))
for e in d['model']['elements']:
 if e['id']=='analysis': e['label']='Классы проектирования'
d['source']=re.sub(r'(?m)^diagram analysis "[^"]*"','diagram analysis "Классы проектирования"',d['source'])
d['draft']=re.sub(r'(?m)^diagram analysis "[^"]*"','diagram analysis "Классы проектирования"',d['draft'])
json.dump(d,open('tmp/ppois_pr4/test_full.omni','w',encoding='utf8'),ensure_ascii=False,indent=2)
