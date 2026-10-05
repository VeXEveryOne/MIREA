"""Real HTTP and PostgreSQL checks in a new dedicated database per test run."""
from datetime import datetime, timezone
from decimal import Decimal
from hashlib import sha256
from http.cookiejar import CookieJar
import json
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from uuid import uuid4

from server import Application, CLIENT, CONTRACT, DEMO_PASSWORD, make_server
from setup_client import ROOT, setup

U100 = '00000000-0000-0000-0000-000000000100'


class Browser:
    def __init__(self, base, role=None):
        self.base = base; self.csrf = ''; self.opener = build_opener(HTTPCookieProcessor(CookieJar()))
        if role:
            status, result = self.request('/api/login', {'username': role, 'password': DEMO_PASSWORD})
            if status != 200:
                raise AssertionError(result)
            self.csrf = result['csrf']

    def request(self, path, data=None, headers=None):
        headers = {'Content-Type': 'application/json', 'X-CSRF-Token': self.csrf, **(headers or {})}
        request = Request(self.base + path, headers=headers,
                          data=json.dumps(data).encode() if data is not None else None)
        try:
            with self.opener.open(request, timeout=10) as response:
                return response.status, json.loads(response.read())
        except HTTPError as e:
            return e.code, json.loads(e.read())


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.environment = setup(ROOT / '.cache/ppois5-10/client-test-environment.json')
        cls.server = make_server(cls.environment, port=0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = 'http://127.0.0.1:' + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.thread.join(timeout=5); cls.server.server_close()

    def browser(self, role='engineer'):
        return Browser(self.base, role)

    def bom(self, browser):
        status, rows = browser.request('/api/bom?configuration_id=' + U100 + '&version_no=1')
        self.assertEqual(status, 200)
        return [{k: row[k] for k in ('line_no', 'quantity', 'group_id', 'requested_component_id')} for row in rows]

    def latest(self, browser):
        status, rows = browser.request('/api/configurations')
        self.assertEqual(status, 200)
        return max(r['version_no'] for r in rows if r['id'] == U100)

    def test_every_private_route_requires_session(self):
        anonymous = Browser(self.base)
        for route in CONTRACT['routes']:
            if route.get('public'):
                continue
            with self.subTest(route=route['path']):
                status, _ = anonymous.request(route['path'], {} if route['method'] == 'POST' else None)
                self.assertEqual(status, 401)

    def test_every_role_forbidden_route_rejected_before_body_or_db(self):
        for role, spec in CONTRACT['roles'].items():
            browser = self.browser(role)
            for route in CONTRACT['routes']:
                if route.get('public') or route['function'] in spec['functions']:
                    continue
                with self.subTest(role=role, route=route['path']):
                    status, _ = browser.request(route['path'], {} if route['method'] == 'POST' else None)
                    self.assertEqual(status, 403)

    def test_every_role_allowed_read_route_returns_result(self):
        for role, spec in CONTRACT['roles'].items():
            browser = self.browser(role)
            for route in CONTRACT['routes']:
                if route['method'] != 'GET' or route['function'] not in spec['functions']:
                    continue
                path = route['path']
                if path == '/api/bom':
                    path += '?configuration_id=' + U100 + '&version_no=1'
                with self.subTest(role=role, route=path):
                    self.assertEqual(browser.request(path)[0], 200)

    def test_invalid_credentials_do_not_create_session(self):
        browser = Browser(self.base)
        self.assertEqual(browser.request('/api/login', {'username': 'engineer', 'password': 'wrong'})[0], 401)
        self.assertEqual(browser.request('/api/session')[0], 401)

    def test_forged_cookie_is_not_a_session(self):
        self.assertEqual(Browser(self.base).request('/api/session', headers={'Cookie': 'ppois_session=engineer'})[0], 401)

    def test_logout_revokes_session(self):
        browser = self.browser()
        self.assertEqual(browser.request('/api/logout', {})[0], 200)
        self.assertEqual(browser.request('/api/session')[0], 401)

    def test_expired_session_is_rejected(self):
        token, session = self.server.application.login({'username': 'engineer', 'password': DEMO_PASSWORD})
        from server import Session
        self.server.application.sessions[token] = Session(session.role, session.csrf, 0)
        self.assertEqual(Browser(self.base).request('/api/session', headers={'Cookie': 'ppois_session=' + token})[0], 401)

    def test_wrong_csrf_rejected(self):
        browser = self.browser()
        self.assertEqual(browser.request('/api/versions', {}, headers={'X-CSRF-Token': 'wrong'})[0], 403)

    def test_foreign_origin_rejected(self):
        self.assertEqual(self.browser().request('/api/calculate', {}, headers={'Origin': 'http://example.invalid'})[0], 403)

    def test_foreign_host_rejected(self):
        self.assertEqual(Browser(self.base).request('/api/session', headers={'Host': 'example.invalid'})[0], 403)

    def test_fixed_time_control_calculation_and_sql(self):
        browser = self.browser('viewer')
        status, result = browser.request('/api/calculate', {'configuration_id': U100, 'version_no': 1})
        self.assertEqual(status, 200, result)
        self.assertEqual(result['control_time'], '2026-10-05T10:00:00+03:00')
        self.assertEqual(result['result']['cost_rub'], '53500.00')
        self.assertEqual(result['result']['price_rub'], '76400')
        self.assertEqual(result['result']['mass_kg'], '7.820')
        status, cards = browser.request('/api/cards')
        self.assertEqual(status, 200)
        row = next(s for s in cards['status'] if s['seller_code'] == 'YK-PC-101' and s['revision_no'] == 1)
        self.assertEqual(row['cost_rub'], '53500.00')
        self.assertEqual(Decimal(row['price_rub']), Decimal(result['result']['price_rub']))
        self.assertEqual(row['mass_kg'], result['result']['mass_kg'])

    def test_reject_non_finite_or_unrepresentable_policy(self):
        browser = self.browser()
        for policy in ({'markup_rate': '-0.1'}, {'commission_rate': '1'}, {'commission_rate': 'NaN'},
                       {'markup_rate': '0.20001'}, {'assembly_rub': '2000.001'}, {'round_step_rub': '0'},
                       {'assembly_rub': '100000000'}):
            with self.subTest(policy=policy):
                self.assertEqual(browser.request('/api/calculate', {'configuration_id': U100, 'version_no': 1,
                    'policy': policy})[0], 422)

    def test_no_client_clock_override(self):
        self.assertEqual(self.browser().request('/api/calculate', {'configuration_id': U100,
            'version_no': 1, 'now': '2030-01-01T00:00:00+00:00'})[0], 422)

    def test_quantities_boolean_and_zero_rejected(self):
        browser = self.browser(); source = self.bom(browser)
        for value in (True, 0, -1, 1.5, 2147483648):
            rows = [dict(r) for r in source]; rows[0]['quantity'] = value
            with self.subTest(quantity=value):
                self.assertEqual(browser.request('/api/calculate', {'slots': rows})[0], 422)

    def test_duplicate_or_ambiguous_slots_rejected(self):
        browser = self.browser(); source = self.bom(browser)
        for alteration in ('duplicate', 'both', 'neither'):
            rows = [dict(r) for r in source]
            if alteration == 'duplicate':
                rows[1]['line_no'] = rows[0]['line_no']
            elif alteration == 'both':
                rows[0]['requested_component_id'] = '00000000-0000-0000-0000-000000000011'
            else:
                rows[0]['group_id'] = None
            with self.subTest(alteration=alteration):
                self.assertEqual(browser.request('/api/calculate', {'slots': rows})[0], 422)

    def test_invalid_uuid_and_missing_bom_rejected(self):
        browser = self.browser()
        self.assertEqual(browser.request('/api/bom?configuration_id=invalid&version_no=1')[0], 422)
        self.assertEqual(browser.request('/api/bom?configuration_id=' + U100 + '&version_no=9999')[0], 404)

    def test_append_version_and_stale_save_no_overwrite(self):
        browser = self.browser(); before = self.bom(browser); latest = self.latest(browser)
        payload = {'configuration_id': U100, 'expected_latest': latest, 'slots': before}
        status, created = browser.request('/api/versions', payload)
        self.assertEqual(status, 200, created)
        self.assertEqual(created['state'], 'CHECKED')
        self.assertEqual(created['version_no'], latest + 1)
        self.assertEqual(browser.request('/api/versions', payload)[0], 409)
        self.assertEqual(self.bom(browser), before)

    def test_new_configuration_and_checked_version(self):
        browser = self.browser()
        status, created = browser.request('/api/versions', {'code': 'TEST-' + uuid4().hex[:12],
            'name': 'Учебная конфигурация HTTP', 'expected_latest': 0, 'slots': self.bom(browser)})
        self.assertEqual(status, 200, created)
        self.assertEqual(created['version_no'], 1)
        self.assertEqual(created['state'], 'CHECKED')

    def test_incompatible_draft_saved_with_errors_not_checked(self):
        browser = self.browser(); source = self.bom(browser)
        source[0]['group_id'] = None
        source[0]['requested_component_id'] = '00000000-0000-0000-0000-000000000017'
        status, created = browser.request('/api/versions', {'code': 'BAD-' + uuid4().hex[:12],
            'name': 'Несовместимый черновик', 'expected_latest': 0, 'slots': source})
        self.assertEqual(status, 200, created)
        self.assertEqual(created['state'], 'DRAFT')
        self.assertTrue(created['errors'])
        self.assertEqual(browser.request('/api/calculate', {'configuration_id': created['configuration_id'],
            'version_no': created['version_no']})[0], 422)

    def test_manager_new_revision_is_draft_not_publication(self):
        browser = self.browser('manager')
        payload = {'seller_code': 'HTTP-' + uuid4().hex[:12], 'name': 'Новая учебная карточка',
            'expected_latest': 0, 'configuration_id': U100, 'version_no': 1,
            'title': 'Учебный ПК AM5', 'description': 'Без внешней публикации'}
        status, created = browser.request('/api/revisions', payload)
        self.assertEqual(status, 200, created)
        self.assertEqual(created['state'], 'DRAFT')
        self.assertEqual(created['calculation']['price_rub'], '76400')
        status, publications = browser.request('/api/publications')
        self.assertEqual(status, 200)
        self.assertFalse(any(p['card_id'] == created['card_id'] for p in publications))

    def test_manager_existing_revision_conflict(self):
        browser = self.browser('manager')
        _, cards = browser.request('/api/cards')
        card = next(c for c in cards['cards'] if c['seller_code'] == 'YK-PC-102')
        latest = max(r['revision_no'] for r in cards['revisions'] if r['card_id'] == card['id'])
        payload = {'card_id': card['id'], 'expected_latest': latest, 'configuration_id': U100,
            'version_no': 1, 'title': 'Новая расчётная ревизия', 'description': 'Предыдущая не меняется'}
        status, result = browser.request('/api/revisions', payload)
        self.assertEqual(status, 200, result)
        self.assertEqual(result['revision_no'], latest + 1)
        self.assertEqual(browser.request('/api/revisions', payload)[0], 409)

    def test_unchecked_bom_cannot_create_revision(self):
        browser = self.browser('manager')
        self.assertEqual(browser.request('/api/revisions', {'seller_code': 'HTTP-' + uuid4().hex[:12],
            'name': 'Не сохраняется', 'expected_latest': 0, 'configuration_id': U100, 'version_no': 2,
            'title': 'Не проверено', 'description': 'DRAFT состава'})[0], 409)

    def test_application_transactions_use_bounded_roles(self):
        app = self.server.application
        for role, spec in CONTRACT['roles'].items():
            _, session = app.login({'username': role, 'password': DEMO_PASSWORD})
            with app.database(session) as conn:
                actual = conn.execute("SELECT current_user AS role,current_setting('transaction_read_only') AS readonly").fetchone()
                self.assertEqual(actual['role'], spec['database_role'])
                self.assertEqual(actual['readonly'], 'on')

    def test_original_evidence_database_forbidden(self):
        invalid = dict(self.environment, database='ppois_4b69601445b0')
        with self.assertRaises(ValueError):
            Application(invalid)

    def test_external_publication_route_does_not_exist(self):
        self.assertEqual(self.browser('manager').request('/api/publish', {})[0], 404)
        status, rows = self.browser('manager').request('/api/publications')
        self.assertEqual(status, 200)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['state'], 'ACCEPTED')
        self.assertEqual(rows[0]['external_task_id'], 'demo-task-001')

    def test_static_assets_and_contract_are_served_without_session(self):
        for path, file, mime in (('/', 'client.html', 'text/html'), ('/client.js', 'client.js', 'text/javascript'),
                                 ('/client.css', 'client.css', 'text/css'), ('/contract.json', 'client_contract.json', 'application/json')):
            with self.subTest(path=path), build_opener().open(self.base + path, timeout=10) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers.get_content_type(), mime)
                self.assertEqual(response.headers['Cache-Control'], 'no-store')
                self.assertEqual(response.headers['X-Content-Type-Options'], 'nosniff')
                self.assertIn("default-src 'self'", response.headers['Content-Security-Policy'])
                body = response.read()
                if mime == 'application/json':
                    self.assertEqual(json.loads(body), CONTRACT)
                else:
                    self.assertEqual(body, (CLIENT / file).read_bytes())

    def test_revision_image_metadata_remains_read_only(self):
        browser = self.browser('viewer')
        status, cards = browser.request('/api/cards')
        self.assertEqual(status, 200)
        self.assertEqual(len(cards['images']), 1)
        self.assertEqual(len(cards['image_links']), 1)
        self.assertEqual(cards['images'][0]['sha256'], 'a' * 64)
        self.assertEqual(browser.request('/api/images', {})[0], 404)

    def test_missing_wrong_type_or_oversized_http_body(self):
        browser = self.browser()
        for body, mime, expected in ((b'not-json', 'application/json', 400),
                                      (b'{}', 'text/plain', 415),
                                      (b' ' * 65537, 'application/json', 413)):
            request = Request(self.base + '/api/calculate', data=body,
                headers={'Content-Type': mime, 'X-CSRF-Token': browser.csrf})
            with self.subTest(expected=expected), self.assertRaises(HTTPError) as caught:
                browser.opener.open(request, timeout=10)
            self.assertEqual(caught.exception.code, expected)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ServerTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    files = ('server.py', 'setup_client.py', 'client_contract.json', 'test_server.py', 'client.html', 'client.js', 'client.css')
    evidence = {'executed_at': datetime.now(timezone.utc).isoformat(),
                'database': ServerTests.environment['database'], 'tests_run': result.testsRun,
                'passed': result.wasSuccessful() and not result.skipped,
                'failures': [str(t) for t, _ in result.failures], 'errors': [str(t) for t, _ in result.errors],
                'source_sha256': {f: sha256((CLIENT / f).read_bytes()).hexdigest() for f in files},
                'dependency_sha256': {f: sha256((CLIENT.parent / f).read_bytes()).hexdigest() for f in (
                    'Прототип/domain.py', 'Прототип/repository.py', 'База_данных/schema.sql',
                    'База_данных/privileges.sql', 'Исходники/seed_database.py')},
                'scope': 'real HTTP and PostgreSQL; not browser interaction or external API proof'}
    (ROOT / '.cache/ppois5-10/client-api-verification.json').write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    raise SystemExit(0 if evidence['passed'] else 1)
