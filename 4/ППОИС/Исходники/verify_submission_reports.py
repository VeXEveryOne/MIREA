"""Verify the current submission scope against the actual coursework materials.

This supplements formatting/visual QA. It does not certify a grade or claim a
new PostgreSQL/browser run. The historical SQL evidence is checked by hash.
"""
from pathlib import Path
from hashlib import sha256
from decimal import Decimal, ROUND_CEILING
from zipfile import ZipFile
import argparse, json, re, sys
from docx import Document
from docx.oxml.ns import qn
from pypdf import PdfReader
import pdfplumber

ROOT=Path(__file__).resolve().parents[3];SUBJECT=ROOT/'4/ППОИС';SCHEMES=SUBJECT/'Схемы'
def digest(p):return sha256(Path(p).read_bytes()).hexdigest()
def run(reports,output,review=None):
    model=json.loads((SUBJECT/'Исходники/submission_model.json').read_text(encoding='utf-8'))
    audit=json.loads((SCHEMES/'Проверка_схем_к_сдаче.json').read_text(encoding='utf-8'))
    db=json.loads((SUBJECT/'База_данных/Результаты_проверки.json').read_text(encoding='utf-8'))
    checks=[]
    def check(test,label):checks.append({'name':label,'passed':bool(test)})
    expected={3:6,4:6,5:2,6:1,7:16,8:10,9:9,10:6};texts={};docs={};pages={};media={}
    for n in range(3,11):
        file=reports/f'ППОИС_{n}_АлбахтинИВ.docx';d=Document(file);docs[n]=d
        texts[n]='\n'.join([''.join(x.xpath('.//w:t/text()')) for x in list(d.element.body)[16:]])
        blobs=[d.part.related_parts[s._inline.xpath('.//a:blip')[0].get(qn('r:embed'))].blob for s in d.inline_shapes]
        media[n]=blobs[1:];check(len(media[n])==expected[n],f'PR{n}: required figure inventory')
        check(not d.element.xpath('//wp:anchor'),f'PR{n}: inline figures')
        check(not any(any(v not in ('0','0%') for v in element.attrib.values()) for element in d.element.xpath('//a:srcRect')),f'PR{n}: full images without cropping')
        pages[n]=len(PdfReader(file.with_suffix('.pdf')).pages)
        with pdfplumber.open(file.with_suffix('.pdf')) as pdf:
            for i,p in enumerate(pdf.pages,1):
                t=p.extract_text() or ''
                check(bool(re.sub(r'[\d\s]','',t)) or p.images,f'PR{n} page{i}: nonblank')
                check(not re.search(r'^Рисунок\s+\d+',t,re.M) or p.images,f'PR{n} page{i}: caption stays with image')
        inv=ROOT/'.cache/ppois5-10/report-evidence'/(file.stem+'.json')
        inventory=json.loads(inv.read_text(encoding='utf-8'))
        expected_media=[(SUBJECT/o['source']).read_bytes() for o in inventory['objects'] if o['type']=='figure']
        check(media[n]==expected_media,f'PR{n}: all embedded figures match current sources in order')
        if n in (3,4,5,8,10):
            for role in model['roles']:check(role['name'] in texts[n],f'PR{n}: role {role["name"]}')
            check(not any(old in texts[n] for old in ('Технический специалист','Наблюдатель','Диалог инженера')),f'PR{n}: previous actor names removed')
    for item in audit['emitted']:check(digest(SCHEMES/(item['name']+'.png'))==item['sha256'],'Diagram source/export '+item['name'])
    check(set(model['class_descriptions'])=={c['id'] for c in model['classes']},'All design classes have a purpose description')
    for c in model['classes']:
        check(bool(c['attributes']) and all(':' in a for a in c['attributes']),c['id']+': typed attributes')
        check(bool(c['operations']) and all('(' in op and '):' in op for op in c['operations']),c['id']+': operation signatures')
        check(model['class_descriptions'][c['id']] in texts[4],c['id']+': description in report')
    check(len(model['sequences'])==2,'PR3: two scenarios')
    for seq in model['sequences']:
        for a,b,label,reply in seq['messages']:
            check(label in texts[3],'PR3 sequence table: '+label)
    check(all(any(a.startswith(prefix) for st in model['states'] for a in st['actions']) for prefix in ('entry /','do /','exit /')),'PR4: entry/do/exit behavior')
    check(len(media[5])==2 and (SCHEMES/'ПР5_Развёртывание.png').read_bytes() in media[5],'PR5: required deployment figure2 retained')
    check(not any(s in texts[5] for s in ('Контрольный запуск','Фактическое размещение учебного среза','Фактически выбранные учебные предложения')),'PR5: execution details excluded')
    plan=json.loads((SUBJECT/'Планирование/План_разработки.json').read_text(encoding='utf-8'))
    check(len(plan['tasks'])==8 and sum(len(t['subtasks']) for t in plan['tasks'])==16,'PR6: phases and decomposed tasks')
    for t in plan['tasks']:
        check(sum(x['duration'] for x in t['subtasks'])==t['duration'] and t['subtasks'][0]['start_day']==t['start_day'] and t['subtasks'][-1]['end_day']==t['end_day'],'PR6 stage '+str(t['id'])+': dates and duration')
        check(all(x['performers'] for x in t['subtasks']),'PR6 stage '+str(t['id'])+': performers on tasks')
    check(plan['duration_workdays']==37 and plan['effort_person_days']==70,'PR6: estimates preserved')
    check(audit['relational']['entities']==12 and audit['relational']['attributes']==71 and audit['relational']['relationships']==13,'PR7: full relational coverage')
    for kind in ['Логическая','Физическая']:
        file=SCHEMES/f'ПР7_{kind}_полная.png';check(file.read_bytes() in media[7],'PR7: one complete '+kind+' figure')
        xml=(SCHEMES/f'ПР7_{kind}_полная.svg').read_text(encoding='utf-8')
        for c in db['columns']:check(c['column_name'] in xml,kind+': '+c['table_name']+'.'+c['column_name'])
    check('char(64)' in (SCHEMES/'ПР7_Физическая_полная.svg').read_text(encoding='utf-8'),'PR7: fixed-length hash type')
    weak={fk['table_name'] for fk in db['key_catalog'] if fk['contype']=='f' and set(fk['columns']).issubset(set(next(k['columns'] for k in db['key_catalog'] if k['contype']=='p' and k['table_name']==fk['table_name'])))}
    check(weak=={'model_range_version','model_range_slot','card_revision','publication_attempt','revision_image'},'PR7: five genuinely identifying weak entities')
    check('Двойной прямоугольник' in texts[7] and 'двойной ромб' in texts[7],'PR7: double-contour notation explained')
    for filename,expected_hash in db['source_sha256'].items():check(digest(SUBJECT/'База_данных'/filename)==expected_hash,'Historical SQL source unchanged: '+filename)
    check(all(t['passed'] for t in db['tests']),'Historical SQL evidence: successful tests retained')
    check(len(docs[8].element.xpath('//m:oMath'))==6,'PR8: six native readable equations')
    check(not docs[8].element.xpath('//w:hyperlink'),'PR8: no hyperlink on figure9 or other form')
    check('Контрольный расчёт' not in texts[8] and 'lexmin' not in texts[8],'PR8: personal explanations separated')
    check('5 Проверка классификатора' not in texts[9] and '5 Пример классифицированной карточки' in texts[9],'PR9: final section is a worked object, not a test log')
    ex=model['card_example'];check(all(v in texts[9] for v in (ex['seller_code'],ex['classification'],ex['cpu'],ex['ram'],ex['ssd'],ex['price_rub'],ex['mass_kg'])),'PR9: fully filled card matches forms')
    check('HTTP' not in texts[10] and '/api/' not in texts[10],'PR10: internal request/test details excluded')
    check(not any((SCHEMES/(f['name']+'.png')).read_bytes() in media[10] for f in audit['emitted'] if f['name'].startswith('ПР8_')),'PR10: forms are located in PR8')
    for role in model['roles']:
        check((SCHEMES/('ПР10_Диалог_'+role['id']+'.png')).read_bytes() in media[10],'PR10: own dialog for '+role['name'])
        for task in role['tasks']:check(task in texts[10],'PR10: task '+task)
    c=Decimal('51000')+Decimal('2000')+Decimal('500');p0=(c*Decimal('1.20')+Decimal('700'))/Decimal('.85');price=(p0/100).to_integral_value(rounding=ROUND_CEILING)*100
    check(price==Decimal('76400') and Decimal('7.020')+Decimal('.800')==Decimal('7.820'),'Independent control: price and mass')
    sys.path.insert(0,str(SUBJECT/'Классификация'));import classifier
    codes=classifier.all_codes();check(len(codes)==48 and all(classifier.encode({k:v['code'] for k,v in classifier.decode(code).items()})==code for code in codes),'Classifier: 48 actual round trips')
    decoded=classifier.decode(ex['classification'])
    for feature in ('purpose','case','platform','ram','ssd'):
        check(ex[feature].startswith(decoded[feature]['label']),'Card classification matches '+feature)
    study=reports/'ПР8_Разбор_формул.docx'
    if not study.exists():study=reports/'Материалы_для_защиты/ПР8_Разбор_формул.docx'
    check(study.is_file() and study.with_suffix('.pdf').is_file(),'PR8: separate formula study material exists')
    if study.is_file():
        study_text='\n'.join(p.text for p in Document(study).paragraphs)
        check('Контрольная подстановка' in study_text and '76 400' in study_text and '159,9' in study_text,'PR8: study material includes independently checked example')
        check(len(PdfReader(study.with_suffix('.pdf')).pages)==2,'PR8: study material has two complete pages')
    if review:
        reviewed=json.loads((review/'visual-review.json').read_text(encoding='utf-8'))
        for n,count in pages.items():
            for i in range(1,count+1):check(reviewed.get(str(n),{}).get(str(i))==digest(review/'render'/str(n)/f'page-{i}.png'),f'PR{n} page{i}: visual review matches final pixels')
        for i in (1,2):check(reviewed.get('study',{}).get(str(i))==digest(review/'render/study'/f'page-{i}.png'),f'PR8 study page{i}: visual review matches final pixels')
    result={'edition':model['revision'],'pages':pages,'checks':checks,'passed':all(t['passed'] for t in checks),'new_database_or_browser_run_claimed':False}
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':result['passed'],'checks':len(checks),'failed':[t['name'] for t in checks if not t['passed']]},ensure_ascii=False))
    if not result['passed']:raise SystemExit(1)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--reports',type=Path,default=SUBJECT);p.add_argument('--output',type=Path,default=ROOT/'.cache/ppois-revision-20261101/content-qa.json');p.add_argument('--review',type=Path);a=p.parse_args();run(a.reports,a.output,a.review)
