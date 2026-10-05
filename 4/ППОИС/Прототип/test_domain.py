from dataclasses import replace
from datetime import timedelta
from decimal import Decimal
from pathlib import Path
import json
import sys
import unittest

import psycopg
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'Исходники'))
from seed_database import NOW, uid
from domain import DomainError, PricingPolicy, calculate, check_compatibility, resolve, may_retry
from repository import load_catalog, load_slots


class DomainTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        evidence=json.loads((Path(__file__).resolve().parents[1]/'База_данных/Результаты_проверки.json').read_text(encoding='utf-8'))
        cls.conn=psycopg.connect(host='127.0.0.1',port=55432,user='ppois_owner',dbname=evidence['database'])
        cls.components,cls.offers=load_catalog(cls.conn)
        cls.slots=load_slots(cls.conn,uid(100),2)

    @classmethod
    def tearDownClass(cls): cls.conn.close()

    def rows(self,slots=None,offers=None):
        return resolve(slots or self.slots,self.components,offers or self.offers,NOW)

    def test_select_fresh_available_not_cheapest_stale(self):
        self.assertEqual(self.rows()[0].offer.id,str(uid(31)))

    def test_control_calculation_and_sql_agree(self):
        value=calculate(self.rows(),PricingPolicy())
        self.assertEqual(value['component_cost_rub'],Decimal('51000'))
        self.assertEqual(value['cost_rub'],Decimal('53500'))
        self.assertEqual(value['price_rub'],Decimal('76400'))
        self.assertEqual(value['mass_kg'],Decimal('7.820'))
        sql=self.conn.execute('SELECT cost_rub,price_rub,mass_kg FROM ppois.card_status WHERE seller_code=%s',('YK-PC-101',)).fetchone()
        self.assertEqual(sql,(value['cost_rub'],value['price_rub'],value['mass_kg']))

    def test_rounding_never_lowers_required_price(self):
        result=calculate(self.rows(),PricingPolicy())
        self.assertGreaterEqual(result['price_rub'],result['unrounded_price_rub'])
        self.assertLess(result['rounding_added_rub'],100)

    def test_commission_one_rejected(self):
        with self.assertRaises(DomainError):calculate(self.rows(),replace(PricingPolicy(),commission_rate=Decimal(1)))

    def test_nan_rejected(self):
        with self.assertRaises(DomainError):calculate(self.rows(),replace(PricingPolicy(),assembly_rub=Decimal('NaN')))

    def test_zero_rounding_step_rejected(self):
        with self.assertRaises(DomainError):calculate(self.rows(),replace(PricingPolicy(),round_step_rub=Decimal(0)))

    def test_quantity_zero_rejected(self):
        with self.assertRaises(DomainError):self.rows([replace(self.slots[0],quantity=0)]+self.slots[1:])

    def test_boolean_quantity_rejected(self):
        with self.assertRaises(DomainError):self.rows([replace(self.slots[0],quantity=True)]+self.slots[1:])

    def test_double_specification_rejected(self):
        with self.assertRaises(DomainError):self.rows([replace(self.slots[0],requested_component_id=str(uid(11)))]+self.slots[1:])

    def test_empty_bom_rejected(self):
        with self.assertRaises(DomainError):resolve([],self.components,self.offers,NOW)

    def test_duplicate_line_rejected(self):
        with self.assertRaises(DomainError):self.rows(self.slots+[self.slots[0]])

    def test_out_of_stock_rejected(self):
        with self.assertRaises(DomainError):self.rows(offers=[replace(o,stock=0) for o in self.offers])

    def test_future_offer_excluded(self):
        with self.assertRaises(DomainError):self.rows(offers=[replace(o,observed_at=NOW+timedelta(seconds=1)) for o in self.offers])

    def test_incompatible_exact_cpu(self):
        rows=self.rows([replace(self.slots[0],group_id=None,requested_component_id=str(uid(17)))]+self.slots[1:])
        self.assertTrue(any('Сокеты' in e for e in check_compatibility(rows)))

    def test_wrong_memory(self):
        rows=self.rows();rows[2]=replace(rows[2],component=replace(rows[2].component,memory_type='DDR4'))
        self.assertTrue(any('памяти' in e for e in check_compatibility(rows)))

    def test_insufficient_psu(self):
        rows=self.rows();rows[5]=replace(rows[5],component=replace(rows[5].component,power_w=100))
        self.assertTrue(any('мощность' in e for e in check_compatibility(rows)))

    def test_retry_only_confirmed_temporary_failure_after_delay(self):
        self.assertTrue(may_retry('TEMP_ERROR',True,1,NOW-timedelta(seconds=1),NOW))
        for state in ('NEW','UNKNOWN','ACCEPTED','PUBLISHED','REJECTED'):
            self.assertFalse(may_retry(state,True,1,NOW,NOW))
        self.assertFalse(may_retry('TEMP_ERROR',False,1,NOW,NOW))
        self.assertFalse(may_retry('TEMP_ERROR',True,3,NOW,NOW))
        self.assertFalse(may_retry('TEMP_ERROR',True,1,NOW+timedelta(seconds=1),NOW))


if __name__=='__main__': unittest.main(verbosity=2)
