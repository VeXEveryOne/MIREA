"""Execute PPOIS8 calculations against the same read-only database as PPOIS7."""
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from hashlib import sha256
import json
from pathlib import Path
import sys
import unittest

SUBJECT = Path(__file__).resolve().parents[1]
ROOT = SUBJECT.parents[1]
sys.path.insert(0, str(SUBJECT / 'Прототип'))

import psycopg
from domain import DomainError, PricingPolicy, calculate, check_compatibility, resolve, may_retry
from repository import load_catalog, load_slots
from seed_database import NOW, uid
from test_domain import DomainTests


class BoundaryTests(DomainTests):
    # The inherited seventeen scenarios are executed together with these
    # additional boundaries, using the actual current database catalog.
    def test_exact_ttl_is_included(self):
        offers = [replace(o, observed_at=NOW-timedelta(hours=24)) for o in self.offers]
        # The originally stale, cheaper U042 is now exactly on the inclusive
        # boundary and must win; U041 remains excluded by its zero stock.
        self.assertEqual(self.rows(offers=offers)[0].offer.id, str(uid(42)))

    def test_after_ttl_is_excluded(self):
        offers = [replace(o, observed_at=NOW-timedelta(hours=24, microseconds=1)) for o in self.offers]
        with self.assertRaises(DomainError):
            self.rows(offers=offers)

    def test_stock_equal_quantity_is_included(self):
        offers = [replace(o, stock=2 if o.component_id == str(uid(13)) else 1) for o in self.offers]
        self.assertEqual(self.rows(offers=offers)[2].slot.quantity, 2)

    def test_exact_rounding_multiple_is_unchanged(self):
        policy = replace(PricingPolicy(), commission_rate=Decimal(0), markup_rate=Decimal(0),
                         logistics_rub=Decimal(0))
        result = calculate(self.rows(), policy)
        self.assertEqual(result['price_rub'], Decimal('53500'))
        self.assertEqual(result['rounding_added_rub'], Decimal(0))

    def test_exact_psu_margin_is_included(self):
        rows = self.rows()
        rows[5] = replace(rows[5], component=replace(rows[5].component, power_w=Decimal('159.9')))
        self.assertEqual(check_compatibility(rows), [])

    def test_below_psu_margin_is_rejected(self):
        rows = self.rows()
        rows[5] = replace(rows[5], component=replace(rows[5].component, power_w=Decimal('159.899')))
        self.assertTrue(any('мощность' in error for error in check_compatibility(rows)))

    def test_negative_markup_is_rejected(self):
        with self.assertRaises(DomainError):
            calculate(self.rows(), replace(PricingPolicy(), markup_rate=Decimal('-.01')))

    def test_retry_at_scheduled_time(self):
        self.assertTrue(may_retry('TEMP_ERROR', True, 2, NOW, NOW))

    def test_naive_retry_time_is_rejected(self):
        self.assertFalse(may_retry('TEMP_ERROR', True, 1, NOW.replace(tzinfo=None), NOW))


class RecordingResult(unittest.TextTestResult):
    def __init__(self, *args):
        super().__init__(*args)
        self.records = []

    def addSuccess(self, test):
        super().addSuccess(test)
        self.records.append({'test': test.id(), 'passed': True})

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.records.append({'test': test.id(), 'passed': False, 'kind': 'failure'})

    def addError(self, test, err):
        super().addError(test, err)
        self.records.append({'test': test.id(), 'passed': False, 'kind': 'error'})


def run():
    evidence_path = SUBJECT / 'База_данных/Результаты_проверки.json'
    evidence = json.loads(evidence_path.read_text(encoding='utf-8'))
    for name, expected in evidence['source_sha256'].items():
        if sha256((evidence_path.parent / name).read_bytes()).hexdigest() != expected:
            raise ValueError('Database proof is stale: ' + name)
    result = unittest.TextTestRunner(verbosity=2, resultclass=RecordingResult).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(BoundaryTests))
    with psycopg.connect(host='127.0.0.1', port=55432, user='ppois_owner',
                        dbname=evidence['database']) as conn:
        conn.execute('SET TRANSACTION READ ONLY')
        conn.execute('SET LOCAL ROLE ppois_viewer')
        components, offers = load_catalog(conn)
        slots = load_slots(conn, uid(100), 2)
        resolved = resolve(slots, components, offers, NOW)
        control = calculate(resolved, PricingPolicy())
        sql = conn.execute('SELECT cost_rub, price_rub, mass_kg FROM ppois.card_status '
                           'WHERE seller_code=%s', ('YK-PC-101',)).fetchone()
        if sql != (control['cost_rub'], control['price_rub'], control['mass_kg']):
            raise ValueError('Python and SQL control calculations differ')
        runtime = conn.execute("SELECT current_user, current_setting('transaction_read_only')").fetchone()
        if runtime != ('ppois_viewer', 'on'):
            raise ValueError('Control run must use read-only viewer privileges')
    source = SUBJECT / 'Прототип'
    record = {'executed_at': datetime.now(timezone.utc).isoformat(),
              'database': evidence['database'], 'database_evidence_sha256': sha256(evidence_path.read_bytes()).hexdigest(),
              'source_sha256': {p.name: sha256(p.read_bytes()).hexdigest() for p in
                                [source / 'domain.py', source / 'repository.py', source / 'test_domain.py', Path(__file__)]},
              'passed': result.wasSuccessful() and not result.skipped,
              'tests_run': result.testsRun, 'tests': result.records,
              'control_time': NOW.isoformat(), 'runtime': {'role': runtime[0], 'read_only': runtime[1]},
              'control': {k: str(v) for k, v in control.items()},
              'sql_control': [str(v) for v in sql],
              'selected': [{'line_no': r.slot.line_no, 'quantity': r.slot.quantity,
                            'sku': r.component.sku, 'role': r.component.role,
                            'offer_id': r.offer.id, 'price_rub': str(r.offer.unit_price_rub),
                            'mass_kg': str(r.component.mass_kg), 'power_w': r.component.power_w,
                            'line_cost_rub': str(r.slot.quantity*r.offer.unit_price_rub),
                            'line_mass_kg': str(r.slot.quantity*r.component.mass_kg)}
                           for r in resolved],
              'scope': '26 executed domain and boundary scenarios plus read-only SQL control; not UI or external API tests'}
    output = ROOT / '.cache/ppois5-10/mathematics-verification.json'
    output.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': record['passed'], 'tests': result.testsRun,
                      'database': record['database'], 'price_rub': record['control']['price_rub']}, ensure_ascii=False))
    return record['passed']


if __name__ == '__main__':
    raise SystemExit(0 if run() else 1)
