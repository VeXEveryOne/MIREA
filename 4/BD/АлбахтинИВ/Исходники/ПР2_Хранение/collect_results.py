"""Collect SQL and monitoring evidence from the newly initialized guest."""
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
import json
import platform
import subprocess
import psycopg
from psycopg.rows import dict_row
import requests

ROOT = Path(__file__).resolve().parent
PACK = ROOT.parent / 'АлбахтинИВ'
OUT = PACK / 'Результаты/Хранение'
OUT.mkdir(parents=True, exist_ok=True)
assert platform.node() == 'tiabd-albakhtin-iv'
env = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines() if line and not line.startswith('#'))
sql_text = (ROOT / 'analytics.sql').read_text()
queries = [x.strip() + ';' for x in sql_text.split(';') if x.strip()]
assert len(queries) == 4
conn = psycopg.connect(host='127.0.0.1', port=5432, dbname='ecommerce', user='postgres',
                       password=env['TIABD_PG_PASSWORD'], row_factory=dict_row)
result = {'student': 'Албахтин И.В.', 'vm': 'TIABD-Albakhtin-IV',
          'vm_uuid': '40603a5d-2404-4561-a4d6-02d13a8b388d',
          'hostname': platform.node(), 'captured_utc': datetime.now(timezone.utc).isoformat(), 'queries': []}
with conn:
    with conn.cursor() as cursor:
        cursor.execute('SELECT version() AS version')
        result['postgres'] = cursor.fetchone()['version']
        cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        names = [row['tablename'] for row in cursor.fetchall()]
        result['counts'] = {}
        for name in names:
            cursor.execute(psycopg.sql.SQL('SELECT COUNT(*) AS count FROM {}').format(psycopg.sql.Identifier(name)))
            result['counts'][name] = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) AS count FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='f' AND c.convalidated")
        result['validated_foreign_keys'] = cursor.fetchone()['count']
        for query in queries:
            cursor.execute(query)
            rows = cursor.fetchall()
            result['queries'].append({'sql': query, 'rows': rows})
        cursor.execute('SELECT SUM(price) AS revenue FROM order_items')
        result['revenue'] = cursor.fetchone()['revenue']
        cursor.execute('SELECT COUNT(DISTINCT customer_unique_id) AS buyers FROM customers')
        result['buyers'] = cursor.fetchone()['buyers']
service_text = subprocess.check_output(['sudo', '-n', 'docker', 'compose', 'ps', '--format', 'json'], cwd=ROOT, text=True).strip()
result['services'] = json.loads(service_text) if service_text.startswith('[') else [json.loads(line) for line in service_text.splitlines() if line.strip()]
result['prometheus'] = requests.get('http://127.0.0.1:9090/api/v1/query', params={'query': 'pg_up'}, timeout=15).json()
result['grafana_health'] = requests.get('http://127.0.0.1:11210/api/health', timeout=15).json()
grafana = requests.Session()
grafana.auth = ('admin', env['TIABD_GRAFANA_PASSWORD'])
result['datasource_health'] = grafana.get('http://127.0.0.1:11210/api/datasources/uid/ecommerce-postgres/health', timeout=15).json()
assert len(names) == 11
assert result['grafana_health']['database'] == 'ok'
assert result['datasource_health']['status'] == 'OK'
assert result['prometheus']['data']['result'][0]['value'][1] == '1'
(OUT / 'storage.json').write_text(json.dumps(result, ensure_ascii=False, indent=2, default=lambda x: float(x) if isinstance(x, Decimal) else str(x)), encoding='utf-8')
print('11 tables, four SQL tasks, PostgreSQL exporter and Grafana datasource verified')
