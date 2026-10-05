from pathlib import Path
from itertools import product
import json

SPEC=json.loads((Path(__file__).with_name('classifier.json')).read_text(encoding='utf-8'))
FEATURES=SPEC['features']


def encode(values):
    if set(values)!={f['key'] for f in FEATURES}:raise ValueError('Exactly five known features are required')
    parts=[]
    for f in FEATURES:
        code=str(values[f['key']])
        if code not in f['values']:raise ValueError('Unknown '+f['key'])
        parts.append(code)
    return SPEC['version']+'-'+'-'.join(parts)


def decode(code):
    parts=code.split('-')
    if len(parts)!=6 or parts[0]!=SPEC['version']:raise ValueError('Unknown version or wrong code length')
    values={f['key']:p for f,p in zip(FEATURES,parts[1:])}
    if encode(values)!=code:raise ValueError('Not a canonical classification code')
    return {f['key']:{'code':values[f['key']],'label':f['values'][values[f['key']]]} for f in FEATURES}


def all_codes():
    return [encode(dict(zip([f['key'] for f in FEATURES],p))) for p in product(*[f['values'] for f in FEATURES])]


def tree(level=0,prefix=()):
    if level==len(FEATURES):return {'code':SPEC['version']+'-'+'-'.join(prefix)}
    feature=FEATURES[level]
    return {'feature':feature['key'],'children':[
        {'value':value,'label':label,'subtree':tree(level+1,prefix+(value,))} for value,label in feature['values'].items()]}


if __name__=='__main__':
    codes=all_codes();assert len(codes)==len(set(codes))==48
    for code in codes:
        assert encode({k:v['code'] for k,v in decode(code).items()})==code
    invalid=['C1-0-1-1-1-1','C1-1-1-1-3-1','C2-1-1-1-1-1','C1-1-1-1-1','C1-1-1-1-1-1-extra','C1-01-1-1-1-1']
    for code in invalid:
        try:decode(code)
        except ValueError:pass
        else:raise AssertionError('Invalid code accepted: '+code)
    evidence={'classes':48,'round_trip_checks':48,'invalid_checks':len(invalid),
              'tree':tree(),'example':decode('C1-1-1-1-2-2')}
    Path(__file__).with_name('Результаты_проверки.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('48 round trips and 6 invalid code checks passed')
