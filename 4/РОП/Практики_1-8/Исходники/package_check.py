from pathlib import Path
from decimal import Decimal,ROUND_CEILING
from zipfile import ZipFile
import json,re,hashlib,shutil
from pypdf import PdfReader
from docx import Document
from PIL import Image
root=Path('D:/GitHub/MIREA/4/РОП/Практики_1-8')
temp=Path('D:/GitHub/MIREA/tmp/rop_all')
model=json.loads((root/'База_данных/model.json').read_text('utf-8'))
tables={t['name']:t for t in model['tables']}
assert len(tables)==len(model['tables'])==29
assert sum(len(t['columns']) for t in tables.values())==185
references=0
for name,t in tables.items():
    names=[c['name'] for c in t['columns']]
    assert len(names)==len(set(names))
    for c in t['columns']:
        for target,col in re.findall(r'REFERENCES (\w+)\((\w+)\)',c['rule']):
            references+=1
            dest=next(d for d in tables[target]['columns'] if d['name']==col)
            assert c['type']==dest['type'],(name,c['name'],target,col)
            assert 'PRIMARY KEY' in dest['rule'] or 'UNIQUE' in dest['rule']
for name,table,fields in model['indexes']:
    for field in fields.split(','):
        assert field.strip().split()[0] in [c['name'] for c in tables[table]['columns']]
catalog=json.loads((root/'diagram_catalog.json').read_text('utf-8'))
assert len(catalog)==28
assert len({d['id'] for d in catalog})==28
for d in catalog:
    for suffix in ['.svg','.png','.draft.json']:
        assert (root/'Черновики_схем'/(d['id']+suffix)).is_file()
    ids={n['id'] for n in d.get('nodes',[])}
    for e in d.get('edges',[]):
        for key in ['from','to','source','target']:
            if key in e: assert e[key] in ids,(d['id'],e)
costs=[(1,'6000','5.2'),(1,'14000','0.05'),(1,'11500','0.9'),(2,'2500','0.04'),(1,'27000','1.1'),(1,'5000','0.07'),(1,'6500','1.6'),(1,'2500','0.45')]
component_cost=sum(Decimal(q)*Decimal(p) for q,p,m in costs)
component_mass=sum(Decimal(q)*Decimal(m) for q,p,m in costs)
cost=component_cost+Decimal('1200')+Decimal('300')
price=((cost*Decimal('1.25')/100).to_integral_value(rounding=ROUND_CEILING))*100
mass=component_mass+Decimal('0.800')
assert (component_cost,cost,price,mass)==(Decimal('77500'),Decimal('79000'),Decimal('98800'),Decimal('10.250'))
calc={'source':'Учебный пример ПР5, не фактические цены поставщиков','rows':[dict(quantity=q,price=p,mass_kg=m) for q,p,m in costs], 'component_cost':str(component_cost),'assembly_cost':'1200','packaging_cost':'300','markup_rate':'0.25','round_step':'100','cost':str(cost),'price':str(price),'component_mass_kg':str(component_mass),'packaging_mass_kg':'0.800','mass_kg':str(mass)}
(root/'База_данных/Контрольный_расчёт.json').write_text(json.dumps(calc,ensure_ascii=False,indent=2),'utf-8')
pdf=PdfReader(root/'РОП_Практики_1-8_АлбахтинИВ.pdf')
texts=[p.extract_text() for p in pdf.pages]
assert all(len(t.strip())>20 for t in texts),'Empty PDF page'
text='\n'.join(texts)
assert all(f'FR-{n:02}' in text for n in range(1,23))
assert all(f'NFR-{n:02}' in text for n in range(1,13))
assert all(f'Практическое занятие {n}' in text for n in range(1,9))
assert all(f'Рисунок {n} ' in text for n in range(1,39))
assert all(f'Таблица {n} ' in text for n in range(1,67))
assert 'ИНБО-01-17' not in text and 'Шендяпин' not in text
old=Document(root.parent/'РОП_Единый_отчет_АлбахтинИВ.docx')
new=Document(root/'РОП_Практики_1-8_АлбахтинИВ.docx')
def reqs(doc):
    return {r.cells[0].text: [c.text for c in r.cells[1:]] for t in doc.tables for r in t.rows if re.fullmatch(r'(?:N?FR)-\d{2}',r.cells[0].text)}
assert reqs(old)==reqs(new),'Changed original FR/NFR'
slides={}
for n in range(1,9):
    f=root/'Презентации'/f'РОП_Практическая_{n}_АлбахтинИВ.pptx'
    with ZipFile(f) as z:
        assert z.testzip() is None
        slides[n]=sum(bool(re.fullmatch(r'ppt/slides/slide\d+\.xml',p)) for p in z.namelist())
    assert slides[n]==(15 if n==1 else 6)
assert hashlib.sha256((root/'Презентации/РОП_Практическая_1_АлбахтинИВ.pptx').read_bytes()).digest()==hashlib.sha256((root.parent/'РОП_Практическая_1_АлбахтинИВ.pptx').read_bytes()).digest()
source=root/'Исходники';source.mkdir(exist_ok=True)
for name in ['schema.py','drafts.py','content.py','build_report.py','build_native.mts','build_idef0.mts','validate_native.mts','capture.mjs','render_svg.mjs','render_with_word.py','export_word.ps1','slides.mjs','package_notes.py','package_check.py']:
    shutil.copy2(temp/name,source/name)
for n in range(2,9):
    stage=temp/('slides_v2' if n in (4,6) else 'slides')/f'pr{n}'
    shutil.copy2(stage/'validation.json',source/f'ПР{n}_проверка_PPTX.json')
shutil.copy2(temp/'artifact.md',source/'Контракт_оформления.md')
md=root/'РОП_Практики_1-8_АлбахтинИВ.md'
body=md.read_text('utf-8')
native=root/'Модели_OmniNotation'
for oldpath in re.findall(r'!\[[^\]]*\]\(([^)]+)\)',body):
    p=Path(oldpath)
    if not p.is_absolute(): p=root/p
    if p.is_relative_to(root): replacement=p.relative_to(root).as_posix()
    else:
        matching=[f for f in native.glob('ПР1*.png') if f.read_bytes()==p.read_bytes()]
        assert matching,oldpath
        replacement=matching[0].relative_to(root).as_posix()
    body=body.replace('('+oldpath+')','('+replacement+')')
md.write_text(body,'utf-8')
summary={'pdf_pages':len(pdf.pages),'figures':38,'tables_in_report':66,'unchanged_FR':22,'unchanged_NFR':12,'database_tables':29,'columns':185,'foreign_keys_checked':references,'drafts':28,'pptx_slides':slides,'sql_executed_on_PostgreSQL':False,'checks':['FK targets and types','index columns','draft files and edge endpoints','decimal example','original FR/NFR unchanged','DOCX/PDF captions and chapters','PPTX ZIP structure and slide count','PPTX 2–8 artifact-tool finalizer','rendered all report pages and slides; inspected layouts']}
(root/'ПРОВЕРКА.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps(summary,ensure_ascii=False))
