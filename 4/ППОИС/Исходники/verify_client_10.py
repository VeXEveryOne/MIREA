"""Reconcile executed HTTP/browser evidence with sources and isolated SQL state."""
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / '4/ППОИС'
CLIENT = BASE / 'Клиент'
CACHE = ROOT / '.cache/ppois5-10'
sys.path.insert(0, str(CLIENT))
from server import Application, CONTRACT, DEMO_PASSWORD, serial


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def verify():
    api = json.loads((CACHE / 'client-api-verification.json').read_text(encoding='utf-8'))
    ui = json.loads((CACHE / 'client-ui-verification.json').read_text(encoding='utf-8'))
    env = json.loads((CACHE / 'client-environment.json').read_text(encoding='utf-8'))
    checks = []

    def check(condition, label):
        if not condition:
            raise AssertionError(label)
        checks.append(label)

    check(api['passed'] and api['tests_run'] == 28 and not api['failures'] and not api['errors'], '28 HTTP tests passed')
    for proof in (api, ui):
        for file, expected in proof['source_sha256'].items():
            check(digest(CLIENT / file) == expected, 'Current executed source ' + file)
    for file, expected in api['dependency_sha256'].items():
        check(digest(BASE / file) == expected, 'Current HTTP dependency ' + file)
    check(ui['database'] == env['database'] and api['database'] != env['database'], 'Browser DB is isolated from HTTP test DB')
    check(not ui['console_errors'], 'No recorded browser console errors')
    required = {
        'UI01': ['paragraph: engineer', 'версия 2 · DRAFT'],
        'UI02': ['Есть несохранённые изменения', 'Количество строки 3": "0"'],
        'UI03': ['alert: "Количество:', 'Проверяется несохранённый состав'],
        'UI04': ['53500.00', '76400', '7.820'],
        'UI05': ['Наценка, доля" [active]: "0.21"'],
        'UI06': ['Создана версия 3: CHECKED.', 'версия 1 · FROZEN', 'версия 2 · DRAFT'],
        'UI07': ['Состав не сохранён', 'Выйти без сохранения'],
        'UI08': ['версия 1 · FROZEN · используется ревизией" [selected]', 'Количество строки 3": "2"'],
        'UI09': ['paragraph: manager', 'версия 2 · DRAFT" [selected]', 'Сохранить новую ревизию DRAFT" [disabled]'],
        'UI10': ['Ревизия 2 сохранена как DRAFT.', '2 3 DRAFT', '1 1 READY'],
        'UI11': ['ACCEPTED', 'demo-task-001', 'Отправить в Ozon — не реализовано" [disabled]'],
        'UI12': ['paragraph: viewer', 'Количество строки 3" [disabled]', 'Для текущей роли редактирование состава запрещено.'],
        'UI13': ['paragraph: viewer', 'Наценка, доля" [disabled]', '76400', '7.820'],
        'UI14': ['heading "Справка"', 'paragraph: viewer'],
        'UI15': ['ppois_viewer', 'read_only', 'on', env['database']],
        'UI16': ['heading "Справка"', 'paragraph: admin'],
        'UI17': ['Неверные демонстрационные реквизиты', 'heading "Демонстрационный вход"'],
        'UI18': ['paragraph: manager', '76400', '7.820'],
    }
    check({c['id'] for c in ui['checks']} == set(required), 'All 18 recorded browser checkpoints present')
    for record in ui['checks']:
        check('Запрос выполняется' not in record['snapshot'], 'Settled browser checkpoint ' + record['id'])
        for text in required[record['id']]:
            check(text in record['snapshot'], record['id'] + ' visible ' + text)
        if record['id'] == 'UI05':
            check('heading "Результат расчёта"' not in record['snapshot'], 'Stale calculation output removed')
        if record['id'] in ('UI14', 'UI16'):
            check('heading "Диагностика"' not in record['snapshot'] and 'heading "Карточки и ревизии"' not in record['snapshot'],
                  'Forbidden direct client navigation not shown ' + record['id'])
    check(len({s['file'] for s in ui['screenshots']}) == len(ui['screenshots']), 'Unique screenshot paths')
    for shot in ui['screenshots']:
        check(digest(BASE / 'Схемы' / shot['file']) == shot['sha256'], 'Observed screenshot ' + shot['file'])

    app = Application(env)
    _, session = app.login({'username': 'viewer', 'password': DEMO_PASSWORD})
    with app.database(session) as conn:
        counts = {table: conn.execute('SELECT count(*) AS n FROM ppois.' + table).fetchone()['n'] for table in env['initial_counts']}
        expected = dict(env['initial_counts'], bom_version=3, bom_slot=18, card_revision=3)
        check(counts == expected and sum(counts.values()) == 56, 'Browser created only one BOM version with six slots and one revision')
        versions = conn.execute('SELECT version_no,state FROM ppois.bom_version ORDER BY version_no').fetchall()
        check(versions == [{'version_no': 1, 'state': 'FROZEN'}, {'version_no': 2, 'state': 'DRAFT'}, {'version_no': 3, 'state': 'CHECKED'}],
              'Original and new BOM version states retained')
        slots = conn.execute('SELECT version_no,line_no,quantity FROM ppois.bom_slot ORDER BY version_no,line_no').fetchall()
        check(all(r['quantity'] == (2 if r['line_no'] == 3 else 1) for r in slots), 'Original and new slot quantities correct')
        revisions = conn.execute('SELECT card_id,revision_no,version_no,state,title FROM ppois.card_revision ORDER BY card_id,revision_no').fetchall()
        new = next(r for r in revisions if r['revision_no'] == 2)
        check(new['state'] == 'DRAFT' and new['version_no'] == 3 and new['title'] == 'Учебный ПК AM5 — браузерная проверка',
              'Browser revision is DRAFT on version 3')
        old = next(r for r in revisions if str(r['card_id']).endswith('200') and r['revision_no'] == 1)
        check(old['state'] == 'READY' and old['version_no'] == 1, 'Previous READY revision retained')
        attempts = conn.execute('SELECT * FROM ppois.publication_attempt').fetchall()
        check(len(attempts) == 1 and attempts[0]['state'] == 'ACCEPTED' and attempts[0]['external_task_id'] == 'demo-task-001',
              'No publication attempt created by the browser')
        result = conn.execute("SELECT cost_rub,price_rub,mass_kg FROM ppois.card_status WHERE seller_code='YK-PC-101' AND revision_no=2").fetchone()
        check(str(result['cost_rub']) == '53500.00' and str(result['price_rub']) == '76400.00' and str(result['mass_kg']) == '7.820',
              'Saved browser calculation matches SQL 53500 / 76400 / 7.820')
    output = {'passed': True, 'executed_at': datetime.now(timezone.utc).isoformat(), 'database': env['database'],
              'api_database': api['database'], 'http_tests': api['tests_run'], 'browser_checkpoints': len(ui['checks']),
              'reconciliation_checks': len(checks), 'checks': checks, 'initial_counts': env['initial_counts'], 'final_counts': counts,
              'versions': versions, 'revisions': revisions, 'calculation': result,
              'browser_checks': [{k: v for k, v in r.items() if k != 'snapshot'} for r in ui['checks']],
              'screenshots': ui['screenshots'], 'source_sha256': api['source_sha256'],
              'dependency_sha256': api['dependency_sha256'],
              'evidence_sha256': {name: digest(CACHE / name) for name in ('client-api-verification.json', 'client-ui-verification.json')},
              'scope': 'localhost client 0.2; real HTTP, browser checkpoints and SQL; no external API or production deployment proof'}
    output['verifier_sha256'] = digest(Path(__file__))
    (CLIENT / 'Результаты_проверки.json').write_text(json.dumps(output, ensure_ascii=False, indent=2, default=serial) + '\n', encoding='utf-8')
    print(f'Client10: {len(checks)} reconciliation checks; 28 HTTP tests; 18 browser checkpoints; 56 SQL rows')


if __name__ == '__main__':
    verify()
