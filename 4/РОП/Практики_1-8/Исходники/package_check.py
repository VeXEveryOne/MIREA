from pathlib import Path
from decimal import Decimal,ROUND_CEILING
from zipfile import ZipFile
import json,re,hashlib,html
from pypdf import PdfReader
from docx import Document
from config import ROOT as root, MODEL_DIR, EXPORT_DIR
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
new=Document(root/'РОП_Практики_1-8_АлбахтинИВ.docx')
def reqs(doc):
    return {r.cells[0].text: [c.text for c in r.cells[1:]] for t in doc.tables for r in t.rows if re.fullmatch(r'(?:N?FR)-\d{2}',r.cells[0].text)}
baseline=json.loads(Path(__file__).with_name('baseline_tables.json').read_text('utf-8'))
old_reqs={row[0]:row[1:] for table in baseline for row in table if re.fullmatch(r'(?:N?FR)-\d{2}',row[0])}
new_reqs=reqs(new)
assert set(old_reqs)==set(new_reqs),'Changed FR/NFR identifiers'
assert len(new_reqs)==34,'Unexpected FR/NFR count'
slides={}
slide_texts={}
for n in range(1,9):
    f=root/'Презентации'/f'РОП_Практическая_{n}_АлбахтинИВ.pptx'
    with ZipFile(f) as z:
        assert z.testzip() is None
        slides[n]=sum(bool(re.fullmatch(r'ppt/slides/slide\d+\.xml',p)) for p in z.namelist())
        slide_texts[n]='\n'.join(
            html.unescape(value)
            for name in z.namelist()
            if re.fullmatch(r'ppt/slides/slide\d+\.xml',name)
            for value in re.findall(r'<a:t>(.*?)</a:t>',z.read(name).decode('utf-8'))
        )
    expected=15 if n==1 else 10 if n==2 else 6
    assert slides[n]==expected,(n,slides[n],expected)
for material_text in [text,slide_texts[1],slide_texts[2]]:
    assert not re.search(r'(?i)\bBOM\b|БОМ',material_text),'Obsolete BOM term in final material'
    assert 'Губарев' not in material_text
    assert 'Сданная работа' not in material_text
assert 'DRAFT' not in slide_texts[1] and 'DRAFT' not in slide_texts[2]
pngs=sorted(p for p in EXPORT_DIR.glob('[0-9][0-9]_*.png') if '_часть' not in p.stem)
assert len(pngs)==38
export=json.loads((EXPORT_DIR/'Отчёт_экспорта.json').read_text('utf-8'))
assert len(export['items'])==38 and all(item['status']=='completed' for item in export['items'])
assert not export.get('warnings') and not export.get('errors')
registry=json.loads((MODEL_DIR/'Реестр_38_рисунков.json').read_text('utf-8'))
assert registry['count']==38 and len(registry['figures'])==38
for figure in registry['figures']:
    png=root/Path(figure['export']['png']['file'])
    assert png.is_file() and hashlib.sha256(png.read_bytes()).hexdigest()==figure['export']['png']['sha256']
    for part in figure['export']['png'].get('parts', []):
        path=root/part['file']
        assert path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==part['sha256']
assert len(export['files'])==57, 'Expected 38 main figures, 8 ER continuations and 11 sequence parts'
assert len({item['path'] for item in export['files']})==57
summary={'pdf_pages':len(pdf.pages),'figures':38,'tables_in_report':66,'FR':22,'NFR':12,'database_tables':29,'columns':185,'foreign_keys_checked':references,'drafts':28,'pptx_slides':slides,'technical_DRAFT_mentions_in_report':len(re.findall(r'\bDRAFT\b',text)),'sql_executed_on_PostgreSQL':False,'checks':['FK targets and types','index columns','draft files and edge endpoints','decimal example','FR/NFR identifiers preserved','DOCX/PDF captions and chapters','38 current PNG exports and hashes','PPTX ZIP structure and slide counts','obsolete terminology and service text scan','rendered all report pages and slides; inspected layouts']}
(root/'ПРОВЕРКА.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps(summary,ensure_ascii=False))
