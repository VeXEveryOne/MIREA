"""Real DB read-only executable-slice checks, never against a production DB."""
from datetime import timedelta
import json
from pathlib import Path
import sys
import unittest

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'Исходники'))
from seed_database import NOW, uid
from demo import run
from domain import DomainError


class ExecutableSliceTests(unittest.TestCase):
    def setUp(self):
        evidence = json.loads((Path(__file__).resolve().parents[1]/'База_данных/Результаты_проверки.json').read_text(encoding='utf-8'))
        self.conn = psycopg.connect(host='127.0.0.1', port=55432, user='ppois_owner',
                                    dbname=evidence['database'], autocommit=True)

    def tearDown(self):
        self.conn.close()

    def test_frozen_bom_calculation_matches_both_stored_revisions(self):
        result = run(self.conn, uid(100), 1, NOW)
        self.assertEqual(result['calculation']['price_rub'], '76400')
        self.assertEqual(result['calculation']['mass_kg'], '7.820')
        self.assertEqual(len(result['stored_revisions']), 2)
        self.assertTrue(all(r['matches_calculation'] for r in result['stored_revisions']))
        self.assertEqual((result['sql_role'], result['transaction_read_only']), ('ppois_viewer', 'on'))
        self.assertEqual(len(result['selected']), 6)

    def test_role_and_transaction_settings_do_not_escape(self):
        run(self.conn, uid(100), 1, NOW)
        self.assertEqual(self.conn.execute("SELECT current_user,current_setting('transaction_read_only')").fetchone(),
                         ('ppois_owner', 'off'))

    def test_unknown_version_is_rejected(self):
        with self.assertRaises(DomainError):
            run(self.conn, uid(100), 99, NOW)

    def test_stale_catalog_is_rejected(self):
        with self.assertRaises(DomainError):
            run(self.conn, uid(100), 1, NOW+timedelta(days=2))
