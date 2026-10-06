"""Load the personal educational bundle through the ADCM v2 API."""
from pathlib import Path
import json
import sys
import tarfile
import time
import requests

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'АлбахтинИВ/Результаты/Хранение'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:8000/api/v2'
session = requests.Session()
token = session.post(BASE + '/token/', json={'username':'admin','password':'admin'}, timeout=20)
token.raise_for_status()
session.headers['Authorization'] = 'Token ' + token.json()['token']
def get(path):
    response = session.get(BASE + path, timeout=20)
    response.raise_for_status()
    return response.json()
def post(path, **kwargs):
    response = session.post(BASE + path, timeout=60, **kwargs)
    if not response.ok:
        raise RuntimeError(f'{path}: {response.status_code}: {response.text[:1200]}')
    return response.json()
def values(data):
    return data['results'] if isinstance(data, dict) and 'results' in data else data

bundles = values(get('/bundles/'))
if not bundles:
    archive = ROOT / 'adpg-ecommerce-albakhtin.tar.gz'
    with tarfile.open(archive, 'w:gz') as tar:
        for path in sorted((ROOT / 'adcm_bundle').rglob('*')):
            if path.is_file(): tar.add(path, arcname=path.relative_to(ROOT / 'adcm_bundle').as_posix())
    with archive.open('rb') as stream:
        bundle = post('/bundles/', files={'file':(archive.name, stream, 'application/gzip')})
    print('Uploaded bundle', bundle, flush=True)
prototypes = values(get('/prototypes/'))
print('Prototypes', json.dumps(prototypes, ensure_ascii=False)[:3500], flush=True)
clusters = values(get('/clusters/'))
name = 'TIABD Albakhtin IV Ecommerce'
cluster = next((x for x in clusters if x.get('name') == name), None)
if cluster is None:
    cluster_proto = next(x for x in prototypes if x.get('type') == 'cluster')
    cluster = post('/clusters/', json={'name':name,'prototypeId':cluster_proto['id'],'description':'Personal Ubuntu VM TIABD-Albakhtin-IV, student Albakhtin I.V.'})
    print('Created personal cluster', cluster, flush=True)
cid = cluster['id']
services = values(get(f'/clusters/{cid}/services/'))
if not services:
    option = session.options(BASE + f'/clusters/{cid}/services/', timeout=20)
    print('Service POST schema', option.text[:2800], flush=True)
    service_ids = [x['id'] for x in prototypes if x.get('type') == 'service']
    services = [post(f'/clusters/{cid}/services/', json={'prototype_id': prototype_id}) for prototype_id in service_ids]
    print('Added services', services, flush=True)
actions = values(get(f'/clusters/{cid}/actions/'))
print('Actions', json.dumps(actions, ensure_ascii=False)[:3500], flush=True)
if len(sys.argv) > 1 and sys.argv[1] == '--inspect':
    sys.exit(0)
tasks = []
for action_name in ['Install','Start']:
    cluster = get(f'/clusters/{cid}/')
    desired = 'installed' if action_name == 'Install' else 'running'
    if cluster.get('state') in (['installed','running'] if action_name == 'Install' else ['running']):
        continue
    actions = values(get(f'/clusters/{cid}/actions/'))
    action = next(x for x in actions if x.get('name') == action_name)
    aid = action['id']
    task = post(f'/clusters/{cid}/actions/{aid}/run/', json={'isVerbose': False})
    tid = task['id']
    for attempt in range(60):
        task = get(f'/tasks/{tid}/')
        if task.get('status') in ['success','failed','aborted','broken']:
            break
        time.sleep(2)
    print('Action', action_name, 'task', tid, 'status', task.get('status'), flush=True)
    assert task.get('status') == 'success', task
    tasks.append(task)
cluster = get(f'/clusters/{cid}/')
assert cluster.get('state') == 'running'
(OUT / 'adcm.json').write_text(json.dumps({'cluster':cluster,'services':values(get(f'/clusters/{cid}/services/')),'tasks':tasks}, ensure_ascii=False, indent=2), encoding='utf-8')
print('PERSONAL ADCM CLUSTER RUNNING', flush=True)
