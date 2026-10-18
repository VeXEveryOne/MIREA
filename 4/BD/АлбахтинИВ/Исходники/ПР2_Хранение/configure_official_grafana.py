"""Connect the bundle-installed Grafana to ecommerce in official ADPG."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import base64
import json
import subprocess

ROOT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:11210'


def main():
    env = dict(line.split('=', 1) for line in (ROOT / '.official.env').read_text().splitlines()
               if line and not line.startswith('#'))
    quote = lambda value: "'" + value.replace("'", "''") + "'"
    role_sql = """DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='ecommerce_grafana') THEN
            CREATE ROLE ecommerce_grafana LOGIN;
        END IF;
    END $$;
    ALTER ROLE ecommerce_grafana PASSWORD %s;
    GRANT CONNECT ON DATABASE ecommerce TO ecommerce_grafana;
    GRANT USAGE ON SCHEMA public TO ecommerce_grafana;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO ecommerce_grafana;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ecommerce_grafana;
    ALTER ROLE postgres PASSWORD %s;
    """ % (quote(env['TIABD_GRAFANA_DB_PASSWORD']), quote(env['TIABD_PG_PASSWORD']))
    subprocess.run(['sudo', '-n', '-u', 'postgres', '/usr/lib/adpg16/bin/psql',
                    '-X', '-h', '/tmp', '-d', 'ecommerce', '-v', 'ON_ERROR_STOP=1'],
                   input=role_sql, text=True, check=True, capture_output=True)
    auth = base64.b64encode(('admin:' + env['TIABD_GRAFANA_PASSWORD']).encode()).decode()

    def api(path, data=None, method=None):
        request = Request(BASE + path, data=json.dumps(data).encode() if data is not None else None,
                          method=method, headers={'Authorization': 'Basic ' + auth,
                          'Content-Type': 'application/json'})
        with urlopen(request, timeout=30) as response:
            return json.load(response)

    datasource = {
        'name': 'ecommerce-postgres', 'uid': 'ecommerce-postgres', 'type': 'postgres',
        'access': 'proxy', 'url': '127.0.0.1:5432', 'database': 'ecommerce',
        'user': 'ecommerce_grafana', 'basicAuth': False,
        'jsonData': {'database': 'ecommerce', 'sslmode': 'disable', 'postgresVersion': 1600,
                     'timescaledb': False},
        'secureJsonData': {'password': env['TIABD_GRAFANA_DB_PASSWORD']},
    }
    try:
        current = api('/api/datasources/uid/ecommerce-postgres')
    except HTTPError as error:
        if error.code != 404:
            raise
        current = None
    if current:
        api('/api/datasources/' + str(current['id']), datasource, 'PUT')
    else:
        api('/api/datasources', datasource, 'POST')
    dashboard = json.loads((ROOT / 'grafana/dashboards/ecommerce.json').read_text())
    dashboard['id'] = None
    dashboard['uid'] = 'tiabd-ecommerce-albakhtin-adpg'
    dashboard['title'] = 'ТИАБД — ecommerce — Албахтин И.В.'
    dashboard['time'] = {'from': '2016-09-01T00:00:00.000Z', 'to': '2019-01-01T00:00:00.000Z'}
    titles = ['Динамика числа заказов по месяцам', 'Количество заказов по оценкам',
              'Распределение способов оплаты', 'Топ категорий по обороту',
              'Оборот товарных позиций, R$', 'Уникальные покупатели']
    query_checks = []
    for i, panel in enumerate(dashboard['panels']):
        panel['title'] = titles[i]
        panel['datasource']['type'] = 'postgres'
        row, column = divmod(i, 2)
        panel['gridPos'] = {'h': [5, 8, 3][row], 'w': 12,
                            'x': 12 * column, 'y': [0, 5, 13][row]}
        if i == 3:
            panel['type'] = 'barchart'
            panel['options'] = {
                'orientation': 'horizontal', 'showValue': 'always',
                'barWidth': 0.75, 'groupWidth': 0.85, 'stacking': 'none',
                'legend': {'displayMode': 'list', 'showLegend': False},
                'tooltip': {'mode': 'single'},
            }
        if i >= 4:
            panel['fieldConfig']['defaults']['unit'] = 'none'
            panel['fieldConfig']['defaults']['decimals'] = 2 if i == 4 else 0
        for target in panel['targets']:
            target['datasource'] = {'type': 'postgres', 'uid': 'ecommerce-postgres'}
        result = api('/api/ds/query', {'from': '1472688000000', 'to': '1546300800000',
                                     'queries': panel['targets']}, 'POST')
        checks = []
        for ref, value in result['results'].items():
            assert not value.get('error'), value.get('error')
            frames = value.get('frames', [])
            assert frames and any(frame.get('data', {}).get('values') for frame in frames)
            checks.append({'refId': ref, 'frames': len(frames),
                           'rows': sum(len(f['data']['values'][0]) for f in frames if f['data']['values'])})
        query_checks.append({'panel': titles[i], 'checks': checks})
    saved = api('/api/dashboards/db', {'dashboard': dashboard, 'overwrite': True}, 'POST')
    assert saved['status'] == 'success'
    result = {'dashboard': saved, 'queries': query_checks,
              'datasource_health': api('/api/datasources/uid/ecommerce-postgres/health')}
    (ROOT / 'grafana-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print('Datasource OK; all six dashboard queries returned data; dashboard saved')


if __name__ == '__main__':
    main()
