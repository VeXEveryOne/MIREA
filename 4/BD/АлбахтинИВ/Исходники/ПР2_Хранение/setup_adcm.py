"""Verify and record an official ADPG cluster; never create a substitute bundle."""
from pathlib import Path
from datetime import datetime, timezone
import json
import os
import requests

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'АлбахтинИВ/Результаты/Хранение'
BASE = os.environ.get('TIABD_ADCM_URL', 'http://127.0.0.1:8000') + '/api/v2'
env = dict(line.split('=', 1) for line in (ROOT / '.official.env').read_text().splitlines() if line and not line.startswith('#'))
session = requests.Session()
r = session.post(BASE + '/token/', json={'username': 'admin', 'password': env.get('TIABD_ADCM_PASSWORD', 'admin')}, timeout=30)
r.raise_for_status()
session.headers['Authorization'] = 'Token ' + r.json()['token']
def get(path):
    r = session.get(BASE + path, timeout=30)
    r.raise_for_status()
    return r.json()
def values(data):
    return data.get('results', data) if isinstance(data, dict) else data
clusters = values(get('/clusters/'))
c = next(c for c in clusters if c['prototype']['name'] == 'ADPG' and c['name'] == 'TIABD Albakhtin IV ADPG')
cid = c['id']
assert c['state'] == 'installed' and c['status'] == 'up'
services = values(get(f'/clusters/{cid}/services/'))
assert {s['name'] for s in services} == {'adpg', 'chrony', 'prometheus_monitoring'}
assert all(s['state'] == 'installed' and s['status'] == 'up' for s in services)
tasks = values(get('/tasks/?limit=100'))
t = next(t for t in tasks if t['status'] == 'success' and t['name'] == 'Install' and any(o['type'] == 'cluster' and o['id'] == cid for o in t['objects']))
result = {'cluster': c, 'services': services, 'hosts': values(get(f'/clusters/{cid}/hosts/')),
          'install_task': get(f'/tasks/{t["id"]}/'),
          'bundles': [{k:b[k] for k in ['id','name','version','edition']} for b in values(get('/bundles/')) if b['name'] in ['ADPG','SSH Common']],
          'captured_utc': datetime.now(timezone.utc).isoformat()}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'adcm.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print('Official ADPG cluster and all three services are Up; successful Install recorded')
