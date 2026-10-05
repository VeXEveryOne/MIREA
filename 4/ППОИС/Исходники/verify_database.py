"""Execute PostgreSQL schema, DCL and functional/negative tests in a new database."""
from pathlib import Path
import argparse
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
import re
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.rows import dict_row
from seed_database import seed, uid

BASE = Path(__file__).resolve().parents[1]


def run(dsn, output):
    name = 'ppois_' + uuid4().hex[:12]
    owner = psycopg.connect(dsn, autocommit=True)
    owner.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
    params = dict(owner.info.get_parameters()); params['dbname'] = name
    conn = psycopg.connect(**params, row_factory=dict_row)
    schema = (BASE/'База_данных/schema.sql').read_text(encoding='utf-8')
    conn.execute(schema)
    # Roles are cluster-wide; repeated verification may reuse only these dedicated lab roles.
    privileges = (BASE/'База_данных/privileges.sql').read_text(encoding='utf-8')
    for role in ('ppois_engineer', 'ppois_manager', 'ppois_viewer', 'ppois_worker'):
        if owner.execute('SELECT 1 FROM pg_roles WHERE rolname = %s', (role,)).fetchone():
            privileges = privileges.replace('CREATE ROLE '+role+' NOLOGIN;', '')
    conn.execute(privileges); conn.commit()
    seed(conn)
    tests = []

    def negative(label, statement, expected, params=None, role=None):
        try:
            with conn.transaction(force_rollback=True):
                if role:
                    conn.execute(sql.SQL('SET LOCAL ROLE {}').format(sql.Identifier(role)))
                conn.execute(statement, params)
        except psycopg.Error as e:
            assert e.sqlstate == expected, (label, e.sqlstate, str(e))
            tests.append({'name': label, 'passed': True, 'sqlstate': e.sqlstate})
        else:
            raise AssertionError('Expected rejection: '+label)

    negative('duplicate configuration code', 'INSERT INTO ppois.configuration VALUES (%s,%s,%s)',
             '23505', (uid(101), 'PC-101', 'Duplicate'))
    negative('negative offer price', 'UPDATE ppois.offer SET unit_price_rub=-1 WHERE id=%s', '23514', (uid(43),))
    negative('missing supplier FK', 'UPDATE ppois.offer SET supplier_id=%s WHERE id=%s', '23503', (uid(999), uid(43)))
    negative('zero quantity', 'UPDATE ppois.bom_slot SET quantity=0 WHERE version_no=2 AND line_no=1', '23514')
    negative('group mismatch', 'UPDATE ppois.bom_slot SET group_id=%s WHERE version_no=2 AND line_no=1', '23514', (uid(2),))
    negative('missing selected offer FK',
             'UPDATE ppois.bom_slot SET offer_id=%s WHERE version_no=2 AND line_no=1', '23503', (uid(999),))
    negative('selected offer belongs to another group',
             'UPDATE ppois.bom_slot SET offer_id=%s WHERE version_no=2 AND line_no=1', '23514', (uid(32),))
    negative('frozen BOM cannot be edited', 'UPDATE ppois.bom_slot SET quantity=2 WHERE version_no=1 AND line_no=1', '23514')
    negative('frozen BOM slot cannot move to another version',
             'UPDATE ppois.bom_slot SET version_no=2,line_no=99 WHERE version_no=1 AND line_no=1', '23514')
    negative('economic snapshot cannot be overwritten', 'UPDATE ppois.card_revision SET assembly_rub=1 WHERE card_id=%s', '23514', (uid(200),))
    negative('used offer price is immutable', 'UPDATE ppois.offer SET unit_price_rub=1 WHERE id=%s', '23514', (uid(31),))
    negative('used component mass is immutable', 'UPDATE ppois.component SET mass_kg=1 WHERE id=%s', '23514', (uid(11),))
    negative('accepted task requires external ID', 'UPDATE ppois.publication_attempt SET external_task_id=NULL', '23514')
    negative('viewer cannot update catalog', 'UPDATE ppois.component SET name=%s', '42501', ('Changed',), 'ppois_viewer')
    negative('engineer cannot publish', "INSERT INTO ppois.publication_attempt VALUES (%s,1,2,'NEW',NULL,NULL,false,now(),NULL)",
             '42501', (uid(200),), 'ppois_engineer')
    negative('manager cannot rewrite price policy', 'UPDATE ppois.card_revision SET markup_rate=1', '42501', role='ppois_manager')
    negative('worker cannot delete attempts', 'DELETE FROM ppois.publication_attempt', '42501', role='ppois_worker')
    negative('viewer cannot create tables', 'CREATE TABLE ppois.forbidden (id integer)', '42501', role='ppois_viewer')

    for role, statement in [('ppois_viewer','SELECT * FROM ppois.card_status'),
                            ('ppois_manager',"UPDATE ppois.card_revision SET state='STALE' WHERE card_id='00000000-0000-0000-0000-000000000201'"),
                            ('ppois_worker',"UPDATE ppois.publication_attempt SET next_check_at=next_check_at")]:
        with conn.transaction():
            conn.execute(sql.SQL('SET LOCAL ROLE {}').format(sql.Identifier(role)))
            result = conn.execute(statement)
            tests.append({'name': role+' allowed operation', 'passed': result.rowcount > 0})
    assert all(t['passed'] for t in tests)
    queries = []
    query_source = (BASE/'База_данных/queries.sql').read_text(encoding='utf-8')
    for block in re.split(r'(?=-- Q\d\d:)', query_source):
        if not block.strip(): continue
        label = block.splitlines()[0].removeprefix('-- ')
        rows = conn.execute(block).fetchall()
        queries.append({'query': label, 'sql': block.strip(), 'rows': rows})
    # A lower freshness bound alone wrongly admits observations from the future.
    # The fixture is rolled back, so counts and the reusable prototype DB stay unchanged.
    conn.commit()
    with conn.transaction(force_rollback=True):
        future_offer = uid(998)
        conn.execute("""INSERT INTO ppois.offer
            (id,component_id,supplier_id,unit_price_rub,stock,observed_at)
            VALUES (%s,%s,%s,1,10,TIMESTAMPTZ '2026-10-05 11:00:00+03')""",
            (future_offer, uid(11), uid(21)))
        eligible = conn.execute(queries[0]['sql']).fetchall()
        assert all(str(row['offer_id']) != str(future_offer) for row in eligible)
        assert len(eligible) == 7
        tests.append({'name': 'Q01 excludes future offer observations', 'passed': True,
                      'fixture': str(future_offer), 'transaction': 'rolled back'})
    assert len(queries[0]['rows']) == 7
    assert queries[1]['rows'][0]['component_cost_rub'] == Decimal('51000')
    assert queries[1]['rows'][0]['component_mass_kg'] == Decimal('7.020')
    assert len(queries[2]['rows']) == 2 and queries[2]['rows'][0]['price_rub'] == Decimal('76400')
    assert len(queries[3]['rows']) == 2
    assert len(queries[4]['rows']) == 1 and queries[4]['rows'][0]['state'] == 'ACCEPTED'
    assert len(queries[5]['rows']) == 1 and queries[5]['rows'][0]['seller_code'] == 'YK-PC-102'
    counts = {row['table_name']: conn.execute(sql.SQL('SELECT count(*) AS n FROM ppois.{}').format(sql.Identifier(row['table_name']))).fetchone()['n']
              for row in conn.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='ppois' AND table_type='BASE TABLE' ORDER BY table_name").fetchall()}
    columns = conn.execute("""SELECT table_name,column_name,data_type,udt_name,character_maximum_length,
        numeric_precision,numeric_scale,is_nullable,column_default,ordinal_position
        FROM information_schema.columns WHERE table_schema='ppois' AND table_name<>'card_status'
        ORDER BY table_name,ordinal_position""").fetchall()
    constraints = conn.execute("""SELECT rel.relname AS table_name,c.conname,c.contype,
        pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c
        JOIN pg_class rel ON rel.oid=c.conrelid JOIN pg_namespace n ON n.oid=rel.relnamespace
        WHERE n.nspname='ppois' ORDER BY rel.relname,c.conname""").fetchall()
    key_catalog = conn.execute("""SELECT rel.relname AS table_name,c.conname,c.contype,
        ARRAY(SELECT att.attname FROM unnest(c.conkey) WITH ORDINALITY AS k(num,pos)
              JOIN pg_attribute att ON att.attrelid=c.conrelid AND att.attnum=k.num
              ORDER BY k.pos) AS columns,
        parent.relname AS parent_table,
        ARRAY(SELECT att.attname FROM unnest(c.confkey) WITH ORDINALITY AS k(num,pos)
              JOIN pg_attribute att ON att.attrelid=c.confrelid AND att.attnum=k.num
              ORDER BY k.pos) AS parent_columns
        FROM pg_constraint c JOIN pg_class rel ON rel.oid=c.conrelid
        JOIN pg_namespace n ON n.oid=rel.relnamespace
        LEFT JOIN pg_class parent ON parent.oid=c.confrelid
        WHERE n.nspname='ppois' AND c.contype IN ('p','u','f')
        ORDER BY rel.relname,c.conname""").fetchall()
    fixtures = {table: conn.execute(sql.SQL('SELECT * FROM ppois.{} ORDER BY 1,2')
                                   .format(sql.Identifier(table))).fetchall() for table in counts}
    result = {'executed_at':datetime.now(timezone.utc).isoformat(), 'server_version':conn.execute('SELECT version() AS v').fetchone()['v'],
              'database': name, 'data_kind':'deterministic synthetic fixtures, not supplier quotations',
              'counts': counts, 'columns': columns, 'constraints': constraints, 'key_catalog': key_catalog,
              'fixtures': fixtures, 'queries': queries, 'tests': tests,
              'source_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (BASE/'База_данных').glob('*.sql')}}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str)+'\n', encoding='utf-8')
    # Keep the disposable DB for the working prototype; no destructive cleanup is hidden here.
    print(json.dumps({'database':name,'tables':len(counts),'rows':sum(counts.values()),'queries':len(queries),'tests':len(tests),'output':str(output)}, ensure_ascii=False))
    conn.close(); owner.close()
    return name


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dsn', default='host=127.0.0.1 port=55432 user=ppois_owner dbname=postgres')
    parser.add_argument('--output', type=Path, default=BASE/'База_данных/Результаты_проверки.json')
    args = parser.parse_args(); run(args.dsn, args.output)
