import json,re
p='tmp/ppois_pr4/test_full.omni'; d=json.load(open(p,encoding='utf8'))
remove={'v_analysis_revision_images_1','v_analysis_domain_assumptions_1'}
d['model']['elements']=[e for e in d['model']['elements'] if e['id'] not in remove]
d['layout']['nodes']={k:v for k,v in d['layout']['nodes'].items() if k not in remove}
for ident in remove:
 d['source']=re.sub(rf'(?m)^\S+\s+{re.escape(ident)}(?:\s|$).*\n?', '', d['source'])
 d['draft']=re.sub(rf'(?m)^\S+\s+{re.escape(ident)}(?:\s|$).*\n?', '', d['draft'])
json.dump(d,open('tmp/ppois_pr4/class_final.omni','w',encoding='utf8'),ensure_ascii=False,indent=2)
