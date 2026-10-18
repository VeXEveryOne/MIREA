"""Collect fresh evidence from the official ADPG installation in the Linux VM.

Run as the ordinary VM user. Database reads use sudo/peer authentication;
Grafana credentials come from an untracked .official.env file beside this file.
"""
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
import base64
import json
import platform
import subprocess

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'АлбахтинИВ/Результаты/Хранение'
PSQL = '/usr/lib/adpg16/bin/psql'


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def sql(query):
    wrapped = 'SELECT COALESCE(json_agg(t), \'[]\'::json) FROM (' + query.strip().rstrip(';') + ') AS t'
    return json.loads(command('sudo', '-n', '-u', 'postgres', PSQL,
                              '-X', '-h', '/tmp', '-d', 'ecommerce',
                              '-v', 'ON_ERROR_STOP=1', '-Atc', wrapped))


def http_json(url, auth=None):
    headers = {}
    if auth:
        headers['Authorization'] = 'Basic ' + base64.b64encode(':'.join(auth).encode()).decode()
    with urlopen(Request(url, headers=headers), timeout=30) as response:
        return json.load(response)


def main():
    assert platform.node() == 'tiabd-albakhtin-iv', 'Run in the dedicated VM'
    env = dict(line.split('=', 1) for line in (ROOT / '.official.env').read_text().splitlines()
               if line and not line.startswith('#'))
    grafana_auth = ('admin', env['TIABD_GRAFANA_PASSWORD'])
    queries = [part.strip() + ';' for part in (ROOT / 'analytics.sql').read_text().split(';') if part.strip()]
    assert len(queries) == 4
    result = {
        'student': 'Албахтин И.В.', 'vm': 'TIABD-Albakhtin-IV',
        'vm_uuid': '40603a5d-2404-4561-a4d6-02d13a8b388d',
        'hostname': platform.node(), 'captured_utc': datetime.now(timezone.utc).isoformat(),
        'deployment': 'Official Arenadata ADPG Community bundle via ADCM',
        'postgres': sql('SELECT version() AS version')[0]['version'],
        'queries': [{'sql': query, 'rows': sql(query)} for query in queries],
    }
    tables = sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    result['counts'] = {row['tablename']: sql('SELECT COUNT(*) AS count FROM "' + row['tablename'] + '"')[0]['count'] for row in tables}
    result['foreign_keys'] = sql("""SELECT conrelid::regclass::text AS source_table,
        confrelid::regclass::text AS target_table, conname AS name,
        pg_get_constraintdef(oid) AS definition, convalidated AS validated
        FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace
        ORDER BY conrelid::regclass::text, conname""")
    result['validated_foreign_keys'] = sum(row['validated'] for row in result['foreign_keys'])
    result['primary_keys'] = sql("""SELECT conrelid::regclass::text AS table_name,
        pg_get_constraintdef(oid) AS definition FROM pg_constraint
        WHERE contype='p' AND connamespace='public'::regnamespace
        ORDER BY conrelid::regclass::text""")
    result['revenue'] = sql('SELECT SUM(price) AS revenue FROM order_items')[0]['revenue']
    result['buyers'] = sql('SELECT COUNT(DISTINCT customer_unique_id) AS buyers FROM customers')[0]['buyers']
    units = command('systemctl', 'list-units', '--type=service', '--all', '--plain', '--no-legend')
    result['native_services'] = []
    for line in units.splitlines():
        fields = line.split()
        if fields and any(key in fields[0] for key in ['adpg', 'admprom', 'chrony']):
            result['native_services'].append({'unit': fields[0], 'load': fields[1], 'active': fields[2], 'sub': fields[3]})
    packages = command('dpkg-query', '-W', '-f=${db:Status-Abbrev}\t${Package}\t${Version}\n', 'adpg*', 'admprom*')
    result['packages'] = [dict(zip(['package', 'version'], line.split('\t')[1:]))
                          for line in packages.splitlines() if line.startswith('ii ')]
    result['grafana_health'] = http_json('http://127.0.0.1:11210/api/health')
    result['datasource_health'] = http_json('http://127.0.0.1:11210/api/datasources/uid/ecommerce-postgres/health', grafana_auth)
    result['prometheus'] = http_json('http://127.0.0.1:11200/api/v1/query?' + urlencode({'query': 'up'}),
                                     ('admprom_grafana', env['TIABD_GRAFANA_PASSWORD']))
    result['network'] = command('ip', '-br', '-4', 'address')
    assert len(result['counts']) == 11
    assert result['validated_foreign_keys'] == len(result['foreign_keys']) == 9
    assert len(result['primary_keys']) == 11
    assert result['grafana_health']['database'] == 'ok'
    assert result['datasource_health']['status'] == 'OK'
    assert any(p['package'].startswith('adpg') for p in result['packages'])
    targets = result['prometheus']['data']['result']
    assert targets and all(row['value'][1] == '1' for row in targets)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'storage.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Verified official ADPG packages, 11 tables, 9 foreign keys, four SQL tasks and live monitoring')


if __name__ == '__main__':
    main()
