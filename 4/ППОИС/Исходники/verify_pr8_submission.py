"""Reconcile the PR8 submission with native models, equations and SQL fixtures."""
import argparse
from decimal import Decimal, ROUND_CEILING
from hashlib import sha256
import json
from pathlib import Path
from docx import Document
from docx.oxml.ns import qn, nsmap
from lxml.etree import XPath
from pypdf import PdfReader
from build_pr8_report import DESCRIPTIONS, SCHEMES, ROOT, SUBJECT, inputs

def digest(p):
    return sha256(Path(p).read_bytes()).hexdigest()

def xp(node, expression):
    return XPath(expression, namespaces=nsmap)(node)

def verify(reports):
    proof = inputs()
    d = Document(reports / 'ППОИС_8_АлбахтинИВ.docx')
    study_path = reports / 'ПР8_Разбор_формул.docx'
    if not study_path.exists():
        study_path = reports / 'Материалы_для_защиты/ПР8_Разбор_формул.docx'
    study = Document(study_path)
    text = '\n'.join(p.text for p in d.paragraphs)
    checks = []
    def check(name, value):
        checks.append({'name': name, 'passed': bool(value)})
    check('no duplicate overview or database mapping tables', len(d.tables) == 2)
    check('no control calculation, test logs or editorial comments in report',
          not any(s in text for s in ['Контрольная подстановка', 'Контрольный расчёт', 'lexmin',
                                      'без серверной записи', 'Что убрано', '26 проверок']))
    check('no textual or drawing hyperlinks, including figure 9',
          not d.element.xpath('//w:hyperlink | //a:hlinkClick | //a:hlinkHover'))
    for id, description in DESCRIPTIONS.items():
        check('required description ' + id, description in text)
    native = json.loads((SCHEMES / 'ПР8_Экранные_формы.omni').read_text(encoding='utf-8'))['model']['elements']
    roles = json.loads((SUBJECT / 'Исходники/submission_model.json').read_text(encoding='utf-8'))['roles']
    index = {e['id']: e for e in native}
    for f in proof['forms']:
        labels = {index[v['properties']['element']]['label'] for v in native
                  if v['kind'] == 'view' and v['properties']['diagram'] == f['id']}
        check('role visible on ' + f['id'], f['role'] in labels)
        check('commands visible on ' + f['id'], set(f['actions']).issubset(labels))
        if f['id'] != 'card':
            role = next(r for r in roles if r['name'] == f['role'])
            check('own menu on ' + f['id'], set(role['tasks']).issubset(labels))
        if f['role'] != 'Генеральный директор':
            check('approval absent for ' + f['id'], 'Утвердить ревизию' not in labels)
    db = json.loads((SUBJECT / 'База_данных/Результаты_проверки.json').read_text(encoding='utf-8'))
    check('all referenced tables exist in PR7', all(set(f['tables']).issubset(db['counts']) for f in proof['forms']))
    blobs = [d.part.related_parts[s._inline.xpath('.//a:blip')[0].get(qn('r:embed'))].blob
             for s in d.inline_shapes][1:]
    files = [f['file'] for f in proof['forms']] + [a['file'] for a in proof['algorithms']]
    check('ten native exports embedded exactly once and in order',
          blobs == [(SCHEMES / name).read_bytes() for name in files])
    math = d.element.xpath('//m:oMath')
    check('six editable equations', len(math) == 6)
    equations = [''.join(xp(e, './/m:t/text()')).replace(' ', '') for e in math]
    check('sum indices and limits', len(d.element.xpath('//m:nary')) == 3
          and all('i=1n' in equations[i] for i in [0, 4]) and 'i∈K' in equations[5])
    check('commission applied to selling price via denominator',
          ''.join(xp(math[2], './/m:den//m:t/text()')).replace(' ', '').replace('−', '-') == '1-c')
    check('ceil uses native delimiters and fraction',
          xp(math[3], './/m:begChr/@m:val') == ['⌈']
          and xp(math[3], './/m:endChr/@m:val') == ['⌉']
          and ''.join(xp(math[3], './/m:den//m:t/text()')) == 'd')
    # Independent control from the executed PR7 data rather than screenshot constants.
    fixture = db['fixtures']
    offers = {o['id']: o for o in fixture['offer']}
    components = {c['id']: c for c in fixture['component']}
    revision = fixture['card_revision'][0]
    slots = [s for s in fixture['model_range_slot'] if s['configuration_id'] == revision['configuration_id']
             and s['version_no'] == revision['version_no']]
    dec = lambda v: Decimal(str(v))
    cost = sum(dec(s['quantity']) * dec(offers[s['offer_id']]['unit_price_rub']) for s in slots)
    mass = sum(dec(s['quantity']) * dec(components[offers[s['offer_id']]['component_id']]['mass_kg']) for s in slots)
    c = cost + dec(revision['assembly_rub']) + dec(revision['packaging_rub'])
    p0 = (c * (1 + dec(revision['markup_rate'])) + dec(revision['logistics_rub'])) / (1 - dec(revision['commission_rate']))
    step = dec(revision['round_step_rub'])
    price = (p0 / step).to_integral_value(rounding=ROUND_CEILING) * step
    check('fixture-derived cost, price and mass', cost == 51000 and c == 53500 and price == 76400
          and mass + dec(revision['packaging_mass_kg']) == dec('7.820'))
    for name, expected in db['source_sha256'].items():
        check('historical SQL unchanged ' + name, digest(SUBJECT / 'База_данных' / name) == expected)
    study_text = '\n'.join(p.text for p in study.paragraphs)
    check('separate explanation and control example', all(s in study_text for s in
          ['Контрольная подстановка', 'Округление и скобки', '76 400', '159,9']))
    for file in [reports / 'ППОИС_8_АлбахтинИВ.pdf', study_path.with_suffix('.pdf')]:
        pdf = PdfReader(file)
        for i, page in enumerate(pdf.pages, 1):
            contents = page.extract_text() or ''
            check(file.stem + f' page {i} nonblank', len(contents.strip()) > 20 or bool(page.images))
            if 'Рисунок ' in contents:
                check(file.stem + f' page {i} caption with image', bool(page.images))
    qa = json.loads((ROOT / '.cache/ppois-pr8-20261112/formatting.json').read_text(encoding='utf-8'))
    check('current pair has passed formatting and every-page visual review', qa['status'] == 'passed'
          and qa['docx_sha256'] == digest(reports / 'ППОИС_8_АлбахтинИВ.docx')
          and qa['pdf_sha256'] == digest(reports / 'ППОИС_8_АлбахтинИВ.pdf')
          and all(p['manually_viewed'] for p in qa['pages']))
    result = {'passed': all(c['passed'] for c in checks), 'checks': checks,
              'control': {'cost': str(c), 'price': str(price), 'mass': str(mass + dec(revision['packaging_mass_kg']))}}
    (ROOT / '.cache/ppois-pr8-20261112/content.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': result['passed'], 'checks': len(checks), 'failed': [c['name'] for c in checks if not c['passed']]}, ensure_ascii=False))
    return result['passed']

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--reports', type=Path, default=SUBJECT)
    raise SystemExit(0 if verify(p.parse_args().reports) else 1)
