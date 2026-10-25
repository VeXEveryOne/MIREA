"""Migrate the export registry after replacing fragmented ER figures."""
from pathlib import Path
from hashlib import sha256
import json,re
from config import ROOT, MODEL_DIR, EXPORT_DIR, REPO_ROOT

removed={14,15,16,17,31,32,33,34}
old=MODEL_DIR/'Реестр_38_рисунков.json'
new=MODEL_DIR/'Реестр_рисунков.json'
registry=json.loads((old if old.exists() else new).read_text('utf-8'))
registry['figures']=[f for f in registry['figures'] if f['figure'] not in removed]
titles={6:'IDEF0 TO BE: контекст формирования и актуализации карточек в ИС',13:'Логическая модель данных',26:'Схема алгоритма расчёта цены и массы',27:'Схема алгоритма выбора предложения для слота',28:'Схема алгоритма массовой замены',30:'Логическая модель данных и целостность'}
for number,f in enumerate(registry['figures'],1):
 title=titles.get(f['figure'],re.sub(r'^Рисунок\s+\d+\s+[—–-]\s*','',f['title']))
 f['reportFigure']=number
 f['title']=f'Рисунок {number:02} — {title}'
 f.pop('manualReview',None)
 f['export']['png'].pop('parts',None) if f['figure'] in (13,30) else None
registry['count']=len(registry['figures'])
registry['numbering']='figure is a stable export ID; reportFigure is the sequential caption in the report'
new.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n','utf-8')
if old.exists():old.unlink()
report_path=EXPORT_DIR/'Отчёт_экспорта.json'
report=json.loads(report_path.read_text('utf-8'))
report['items']=[item for item in report['items'] if item['order'] not in removed]
by_id={f['figure']:f for f in registry['figures']}
for item in report['items']:item['title']=by_id[item['order']]['title']
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8')
job_path=MODEL_DIR/'Экспорт_PNG.json'
jobs=json.loads(job_path.read_text('utf-8'))
allowed={(Path(f['file']).name,f['diagramId']):f for f in registry['figures']}
jobs['jobs']=[{**j,'title':allowed[(j['file'],j['diagramId'])]['title']} for j in jobs['jobs'] if (j['file'],j['diagramId']) in allowed]
job_path.write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n','utf-8')
# Only obsolete exported ER files are removed; the verified pre-edit backup is retained in .cache.
backup=REPO_ROOT/'.cache/rop/before_review_2026-10-21'
for directory in (EXPORT_DIR,ROOT/'Экспорт/SVG'):
 for file in directory.iterdir():
  m=re.match(r'^(\d{2})_',file.name)
  if not m or not file.is_file():continue
  obsolete=int(m.group(1)) in removed or (int(m.group(1)) in (13,30) and '_часть' in file.stem)
  if not obsolete:continue
  archived=backup/file.relative_to(ROOT)
  if not archived.is_file() or sha256(archived.read_bytes()).digest()!=sha256(file.read_bytes()).digest():raise RuntimeError(f'Backup mismatch {file}')
  file.unlink()
# Rename the registry reference everywhere in this subject's build and tools.
for directory in (ROOT/'Исходники',REPO_ROOT/'tools'):
 for file in directory.iterdir():
  if not file.is_file() or file.suffix not in ('.py','.mts','.mjs','.md'):continue
  data=file.read_text('utf-8')
  if file.name=='migrate_review.py':continue
  changed=data.replace('Реестр_38_рисунков.json','Реестр_рисунков.json')
  if changed!=data:file.write_text(changed,'utf-8')
print('30 active figures; export IDs retained, report captions numbered 1–30')
