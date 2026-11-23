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
    expected={3:5,4:3,5:2,6:1,7:16,8:10,9:9,10:6};texts={};docs={};pages={};media={}
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
            if n==4:
                uml=json.loads((SCHEMES/'ПР4_Модель_проектирования.omni').read_text(encoding='utf-8'))
                role_names={' '.join(e['label'].split()).casefold() for e in uml['model']['elements'] if e['kind']=='partition'}
                for role in model['roles']:check(role['name'].casefold() in role_names,f'PR4: activity lane {role["name"]}')
            elif n==5:
                forms={'manager':'менеджера','developer':'разработчика','designer':'дизайнера','director':'генерального директора'}
                for role in model['roles']:check(forms[role['id']] in texts[n].casefold(),f'PR5: role {role["name"]}')
            else:
                for role in model['roles']:check(role['name'] in texts[n],f'PR{n}: role {role["name"]}')
            check(not any(old in texts[n] for old in ('Технический специалист','Наблюдатель','Диалог инженера')),f'PR{n}: previous actor names removed')
    for item in audit['emitted']:check(digest(SCHEMES/(item['name']+'.png'))==item['sha256'],'Diagram source/export '+item['name'])
    check(set(model['class_descriptions'])=={c['id'] for c in model['classes']},'All design classes have a purpose description')
    pr4=json.loads((SCHEMES/'ПР4_Таблицы.json').read_text(encoding='utf-8'))
    check(not pr4['diagnostics'],'PR4: native UML validation')
    for c in pr4['classes']:
        check(bool(c['attributes']) and all(len(a)==2 and a[1] for a in c['attributes']),c['id']+': typed attributes')
        check(bool(c['operations']) and all(len(op)>=3 and op[2] for op in c['operations']),c['id']+': typed operations')
        check(c['description'] in texts[4],c['id']+': description in report')
    check(len(docs[4].tables)==4,'PR4: two cover tables and two required model tables')
    class_diagrams=[e['id'] for e in uml['model']['elements'] if e['kind']=='diagram' and e['properties'].get('type')=='class']
    check(len(class_diagrams)==1,'PR4: one class diagram')
    class_ids={e['id'] for e in uml['model']['elements'] if e['kind']=='class'}
    visible_classes=[e['properties']['element'] for e in uml['model']['elements'] if e['kind']=='view' and e['properties'].get('diagram') in class_diagrams and e['properties']['element'] in class_ids]
    check(set(visible_classes)==class_ids and len(visible_classes)==len(class_ids)==12,'PR4: every class occurs exactly once on the common diagram')
    check('Классы проектирования' not in texts[4],'PR4: correct UML diagram names')
    check(len(model['sequences'])==2,'PR3: two scenarios')
    pr3=json.loads((SCHEMES/'ПР3_Таблицы.json').read_text(encoding='utf-8'))
    check(not pr3['diagnostics'],'PR3: native OmniNotation model validation')
    for seq in pr3['sequences']:
        for row in seq['rows']:
            check(row[2] in texts[3],'PR3 sequence table: '+row[2])
    states=json.loads((SCHEMES/'ПР4_Состояния.omni').read_text(encoding='utf-8'))
    state_labels=[e['label'] for e in states['model']['elements'] if e['kind']=='label']
    check(all(any(a.startswith(prefix) for a in state_labels) for prefix in ('entry /','do /','exit /')),'PR4: actual exported state model has entry/do/exit behavior')
    check(not any(d.get('blocksCommit') or d.get('blocksExport') for d in pr4['stateDiagnostics']),'PR4: editable state model has no blocking diagnostics')
    check(len(media[5])==2 and (SCHEMES/'ПР5_Развёртывание.png').read_bytes() in media[5],'PR5: required deployment figure2 retained')
    check(digest(SCHEMES/'ПР5_Развёртывание.png')=='4c932c1d7777a0168a138ce72491e56db61b00d69281a058a3ac6db1eb208948','PR5: deployment illustration unchanged at user request')
    pr5=json.loads((SCHEMES/'ПР5_Таблицы.json').read_text(encoding='utf-8'))
    check(not pr5['diagnostics'],'PR5: native component model validation')
    check(len(docs[5].tables)==3,'PR5: two cover tables and one required interaction table')
    check([[c.text for c in row.cells] for row in docs[5].tables[2].rows][1:]==pr5['relations'],'PR5: required table matches component connections in order')
    check({c for component in pr5['distribution'] for c in component['classes']}==class_ids,'PR5: class distribution agrees with PR4')
    check(not any(s in texts[5] for s in ('План сборки версий','Распределение классов по компонентам','Категории пользователей','Оборудование и каналы связи','3 Итерации реализации')),'PR5: optional detailed sections and tables removed')
    check(not any(s in texts[5] for s in ('Контрольный запуск','Фактическое размещение учебного среза','Фактически выбранные учебные предложения')),'PR5: execution details excluded')
    plan=json.loads((SUBJECT/'Планирование/План_разработки.json').read_text(encoding='utf-8'))
    check(len(plan['tasks'])==8 and sum(len(t['subtasks']) for t in plan['tasks'])==16,'PR6: phases and decomposed tasks')
    for t in plan['tasks']:
        check(sum(x['duration'] for x in t['subtasks'])==t['duration'] and t['subtasks'][0]['start_day']==t['start_day'] and t['subtasks'][-1]['end_day']==t['end_day'],'PR6 stage '+str(t['id'])+': dates and duration')
        check(all(x['performers'] for x in t['subtasks']),'PR6 stage '+str(t['id'])+': performers on tasks')
        check({r:sum(x['effort'].get(r,0) for x in t['subtasks']) for r in t['effort']}==t['effort'],'PR6 stage '+str(t['id'])+': assignment effort rolls up to the phase')
    check(plan['duration_workdays']==37 and plan['effort_person_days']==70,'PR6: estimates preserved')
    gantt_file=SUBJECT/'Планирование/ПР6_План_разработки.omni'
    print_file=SCHEMES/'ПР6_Гант.omni'
    gantt=json.loads(gantt_file.read_text(encoding='utf-8'))
    gantt_elements=gantt['model']['elements']
    tasks=[e for e in gantt_elements if e['kind']=='task']
    leaves={e['id'] for e in tasks if e['properties'].get('kind')=='task'}
    check(gantt['notation']=='GANTT' and len(tasks)==24 and len(leaves)==16,'PR6: native hierarchical Gantt has 8 phases and 16 tasks')
    assigned={e['properties']['task'] for e in gantt_elements if e['kind']=='assignment'}
    check(assigned==leaves,'PR6: resources assigned to every leaf task only')
    proof=json.loads((SUBJECT/'Планирование/Проверка_плана.json').read_text(encoding='utf-8'))
    check(not proof['diagnostics'] and proof['resourceOverloads']==0 and proof['effortHours']==560,'PR6: native schedule validation and resource capacity')
    check(proof['source_sha256']=={'native':digest(gantt_file),'presentation':digest(print_file)},'PR6: validation evidence matches both current native models')
    print_elements=json.loads(print_file.read_text(encoding='utf-8'))['model']['elements']
    labels=[e['label'] for e in print_elements if e['kind']=='label']
    check('Исполнители' in labels and not any('резерв' in s.casefold() for s in labels),'PR6: performers visible and forms not labelled as reserve')
    check(all(row['code'] in labels and (row['name'].upper() if row['kind']=='summary' else row['name']) in labels for row in proof['rows']),'PR6: all phases and tasks are present on the exported view')
    check(len(docs[6].tables)==4,'PR6: two cover tables and two tables required by the assignment')
    check(audit['relational']['entities']==12 and audit['relational']['attributes']==71 and audit['relational']['relationships']==13,'PR7: full relational coverage')
    full=json.loads((SCHEMES/'ПР7_Полные_модели_проверка.json').read_text(encoding='utf-8'))
    check(full['models']=={'semantic':digest(SCHEMES/'ПР7_Модель_данных.omni'),'presentation':digest(SCHEMES/'ПР7_Полные_модели.omni')},'PR7: current native semantic and print models')
    for i,(kind,sheet) in enumerate([('Логическая','logical'),('Физическая','physical')],1):
        file=SCHEMES/f'{i:02d}_ПР7_{kind}_полная.png';check(file.read_bytes() in media[7],'PR7: one complete '+kind+' figure')
        fields={(f['table'],f['column']):f for f in full['fields'][sheet]}
        labels={e['label'] for e in json.loads((SCHEMES/'ПР7_Полные_модели.omni').read_text(encoding='utf-8'))['model']['elements'] if e['kind']=='label'}
        for c in db['columns']:check(fields[(c['table_name'],c['column_name'])]['text'] in labels,kind+': '+c['table_name']+'.'+c['column_name'])
    check(next(f['type'] for f in full['fields']['physical'] if f['table']=='image' and f['column']=='sha256')=='char(64)','PR7: fixed-length hash type')
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
    classifier_proof=json.loads((SCHEMES/'ПР9_Экспорт_проверка.json').read_text(encoding='utf-8'))
    check(classifier_proof['model_sha256']==digest(SCHEMES/'ПР9_Классификация.omni') and classifier_proof['classifier_sha256']==digest(SUBJECT/'Классификация/classifier.json') and not classifier_proof['diagnostics'],'PR9: current native classifier and export evidence')
    check(classifier_proof['nodes']==94 and classifier_proof['links']==93 and len(set(classifier_proof['leaves']))==48,'PR9: one complete tree with 48 classes')
    card=(SCHEMES/'08_ПР8_card.png').read_bytes()
    check(card in media[8] and media[9][-1]==card and digest(SCHEMES/'08_ПР8_card.png')==classifier_proof['card_sha256'],'PR9: final card is the exact current PR8 screen')
    check(media[9][:-1]==[(SCHEMES/f).read_bytes() for f in classifier_proof['files']],'PR9: eight native diagrams embedded in order')
    rows=[[c.text for c in row.cells] for row in docs[9].tables[-1].rows][1:]
    expected_rows=[['Назначение',ex['purpose'],'1'],['Исполнение корпуса',ex['case'],'1'],['Платформа процессора',ex['platform'],'1'],['Объём ОЗУ',ex['ram'],'2'],['Объём SSD',ex['ssd'],'2']]
    check(rows==expected_rows,'PR9: sample derives code from the five actual screen characteristics')
    check('с классификационным кодом' not in texts[9] and 'Код с ведущим нулём' not in texts[9],'PR9: unsupported screen field claim and validation details removed')
    check('HTTP' not in texts[10] and '/api/' not in texts[10],'PR10: internal request/test details excluded')
    check(not any((SCHEMES/(f['name']+'.png')).read_bytes() in media[10] for f in audit['emitted'] if f['name'].startswith('ПР8_')),'PR10: forms are located in PR8')
    pr10_source=SUBJECT/'Исходники/practice10_model.json'
    pr10=json.loads(pr10_source.read_text(encoding='utf-8'))
    pr10_proof=json.loads((SCHEMES/'ПР10_Проверка_модели.json').read_text(encoding='utf-8'))
    pr10_file=SCHEMES/'ПР10_Функции_и_диалоги.omni'
    native10=json.loads(pr10_file.read_text(encoding='utf-8'))
    elements10={e['id']:e for e in native10['model']['elements']}
    labels10='\n'.join(e['label'] for e in elements10.values())
    check(pr10_proof['source_sha256']==digest(pr10_source) and pr10_proof['model_sha256']==digest(pr10_file),'PR10: current native model and source evidence')
    check(not any(d.get('blocksCommit') or d.get('blocksExport') for d in pr10_proof['diagnostics']),'PR10: no blocking native diagnostics')
    check([r['name'] for r in pr10['roles']]==['Менеджер маркетплейса','Дизайнер','Разработчик','Генеральный директор'],'PR10: four requested roles in order')
    check(media[10]==[(SCHEMES/f).read_bytes() for f in pr10_proof['files']],'PR10: six native figures in order')
    check(pr10_proof['tree']['nodes']==26 and len(pr10_proof['tree']['edges'])==25,'PR10: full main and service hierarchy')
    tree_edges=set(map(tuple,pr10_proof['tree']['edges']))
    native_links={(e['properties']['from'],e['properties']['to']) for e in elements10.values() if e['kind']=='link'}
    check(tree_edges.issubset(native_links),'PR10: hierarchy proof matches actual native links')
    overview='\n'.join(c.text for row in docs[10].tables[2].rows for c in row.cells)
    check(len(docs[10].tables)==3,'PR10: only cover tables and overview table')
    for role,dialog in zip(pr10['roles'],pr10_proof['dialogs']):
        check(dialog['role']==role['id'] and dialog['name']==role['name'],'PR10: own dialog for '+role['name'])
        for task,record in zip(role['tasks'],dialog['tasks']):
            check(task['title'] in overview and task['title'] in labels10,'PR10: task in overview and diagram '+task['title'])
            check(all(task[k]==record[k] for k in ('id','title','steps','result','failure')),'PR10: complete task scenario '+task['id'])
            check(('role_'+role['id'],'function_'+role['id']+'_'+task['id']) in tree_edges,'PR10: task belongs to its role '+task['id'])
            check(all(s in elements10[record['node']+'_body']['label'] for s in task['steps']+[task['result'],task['failure']]),'PR10: actual native steps results and refusals '+task['id'])
    check('HTTP' not in labels10 and '/api/' not in labels10,'PR10: no internal routes in diagrams')
    check(card not in media[10],'PR10: current screen forms remain in PR8')
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
