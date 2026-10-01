import json,re
p=r'D:/OmniNotation/examples/activity-parallel-pins.omni'
d=json.load(open(p,encoding='utf8'))
for e in d['model']['elements']:
 if e['id']=='main': e['label']='Параллельная подготовка BOM и контента'
d['source']=re.sub(r'(?m)^diagram main "[^"]*"','diagram main "Параллельная подготовка BOM и контента"',d['source'])
d['draft']=re.sub(r'(?m)^diagram main "[^"]*"','diagram main "Параллельная подготовка BOM и контента"',d['draft'])
json.dump(d,open('tmp/ppois_pr4/activity_final.omni','w',encoding='utf8'),ensure_ascii=False,indent=2)
