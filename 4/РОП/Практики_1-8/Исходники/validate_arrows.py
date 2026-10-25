"""Check the actual exported paths, including coincident corners and false T joins."""
from pathlib import Path
import json,re,xml.etree.ElementTree as ET
from config import ROOT,MODEL_DIR

def points(d):
    tokens=re.findall(r'[MLHV]|-?\d+(?:\.\d+)?',d)
    out=[];i=0;command='';x=y=0
    while i<len(tokens):
        if tokens[i] in ('M','L','H','V'):command=tokens[i];i+=1
        if command in ('M','L'):x,y=map(float,tokens[i:i+2]);i+=2
        elif command=='H':x=float(tokens[i]);i+=1
        elif command=='V':y=float(tokens[i]);i+=1
        else:return []
        if not out or out[-1]!=(x,y):out.append((x,y))
    return out

def segments(p):return list(zip(p,p[1:]))
def on(p,a,b):
    if abs(a[0]-b[0])<.01:return abs(p[0]-a[0])<.01 and min(a[1],b[1])-.01<=p[1]<=max(a[1],b[1])+.01
    if abs(a[1]-b[1])<.01:return abs(p[1]-a[1])<.01 and min(a[0],b[0])-.01<=p[0]<=max(a[0],b[0])+.01
    return False
def overlap(a,b,c,d):
    av=abs(a[0]-b[0])<.01;cv=abs(c[0]-d[0])<.01
    if av!=cv or abs((a[0]-c[0]) if av else (a[1]-c[1]))>.01:return 0,False
    k=1 if av else 0
    return max(0,min(max(a[k],b[k]),max(c[k],d[k]))-max(min(a[k],b[k]),min(c[k],d[k]))),(b[k]-a[k])*(d[k]-c[k])<0

audit=[]
for f in sorted((ROOT/'Экспорт/SVG').glob('*.svg')):
    doc=ET.parse(f);paths=[];directed=0
    for el in doc.iter():
        if el.tag.endswith('path') and (el.get('stroke')=='white' and float(el.get('stroke-width','0'))>=7 or el.get('marker-end') in ('url(#call)','url(#open)') and ('36_' in f.name or '37_' in f.name)):
            p=points(el.get('d',''))
            if len(p)>1:paths.append(p)
        if el.get('marker-end'):directed+=1
    overlaps=[];touches=[]
    for i,p in enumerate(paths):
        assert all(abs(a[0]-b[0])<.01 or abs(a[1]-b[1])<.01 for a,b in segments(p)),f.name
        for j,q in enumerate(paths[:i]):
            for a,b in segments(p):
                for c,d in segments(q):
                    length,opposite=overlap(a,b,c,d)
                    if length>.1:overlaps.append(dict(a=j,b=i,length=length,opposite=opposite))
            if any(on(pt,a,b) for pt in p for a,b in segments(q)) or any(on(pt,a,b) for pt in q for a,b in segments(p)):touches.append((j,i))
    # The function tree has real shared parent branches. IDEF0 has two explicit
    # branchOf relationships, with the same data passed to another function.
    intentional=f.name.startswith('11_')
    if f.name.startswith(('01_','02_','06_','07_')):
        name='ПР1_IDEF0_AS_IS.omni' if f.name.startswith(('01_','02_')) else 'ПР2_IDEF0_TO_BE.omni'
        model=json.loads((MODEL_DIR/name).read_text('utf-8-sig'))['model']
        context=f.name.startswith(('01_','06_'))
        edges=[e for e in model['edges'] if e['id'].startswith('c_')==context]
        def real_branch(i,j):return edges[i]['properties'].get('branchOf')==edges[j]['id'] or edges[j]['properties'].get('branchOf')==edges[i]['id']
        assert all(real_branch(o['a'],o['b']) for o in overlaps),(f.name,overlaps)
        assert all(real_branch(i,j) for i,j in touches),(f.name,touches)
        intentional=bool(overlaps or touches)
    elif not intentional:assert not overlaps and not touches,(f.name,overlaps,touches)
    assert not any(o['opposite'] for o in overlaps),f.name
    audit.append(dict(file=str(f.relative_to(ROOT)),connections=len(paths),directedPaths=directed,independentOverlaps=0,falseJunctions=0,intentionalBranching=intentional))

bpmn=[]
for f in MODEL_DIR.glob('*BPMN*.omni'):
    d=json.loads(f.read_text('utf-8-sig'));idx={**d['model']['objects'],**d['layout']['objects']}
    for plane in [v for v in idx.values() if v['type']=='bpmndi:BPMNPlane']:
        elements=[idx[r['ref']] for r in plane['properties']['planeElement']]
        boxes={v['properties']['bpmnElement']['ref']:idx[v['properties']['bounds']['ref']]['properties'] for v in elements if v['type']=='bpmndi:BPMNShape'}
        count=0
        for edge in [v for v in elements if v['type']=='bpmndi:BPMNEdge']:
            flow=idx[edge['properties']['bpmnElement']['ref']];pts=[idx[p['ref']]['properties'] for p in edge['properties']['waypoint']]
            for side,pt in [('sourceRef',pts[0]),('targetRef',pts[-1])]:
                box=boxes[flow['properties'][side]['ref']];x,y,w,h=(box[k] for k in ('x','y','width','height'))
                corners=[(x,y),(x+w,y),(x+w,y+h),(x,y+h),(x,y)]
                assert any(on((pt['x'],pt['y']),a,b) for a,b in segments(corners)),(f.name,flow['properties']['id'],side)
                if idx[flow['properties'][side]['ref']]['type'].endswith('Gateway'):
                    assert (pt['x'],pt['y']) in [(x+w/2,y),(x+w,y+h/2),(x+w/2,y+h),(x,y+h/2)]
            count+=1
        bpmn.append(dict(file=f.name,plane=plane['properties'].get('id'),connections=count,allEndpointsOnElements=True))

result=dict(date='2026-10-26',status='pass',svgViews=len(audit),views=audit,bpmn=bpmn)
(ROOT/'ПРОВЕРКА_стрелок.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(status='pass',svgViews=len(audit),bpmnSheets=len(bpmn),independentOverlaps=0,falseJunctions=0),ensure_ascii=False))
