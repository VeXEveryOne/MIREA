"""Initialize six services and a fresh database in the personal guest only."""
from pathlib import Path
import json
import platform
import secrets
import subprocess
import time

ROOT = Path(__file__).resolve().parent
assert platform.node() == 'tiabd-albakhtin-iv'
env = ROOT / '.env'
if not env.exists():
    env.write_text(''.join(f'{key}={secrets.token_hex(16)}\n' for key in [
        'TIABD_PG_PASSWORD', 'TIABD_ADCM_DB_PASSWORD', 'TIABD_GRAFANA_PASSWORD']), encoding='utf-8')
    env.chmod(0o600)
def compose(*args):
    return subprocess.run(['sudo', '-n', 'docker', 'compose', *args], cwd=ROOT, check=True)
compose('up', '-d')
for attempt in range(90):
    ready = subprocess.run(['sudo', '-n', 'docker', 'compose', 'exec', '-T', 'adpg',
                           'pg_isready', '-U', 'postgres', '-d', 'ecommerce'], cwd=ROOT,
                          capture_output=True).returncode == 0
    if ready: break
    time.sleep(2)
assert ready
check = subprocess.check_output(['sudo','-n','docker','compose','exec','-T','adpg','psql','-U','postgres','-d','ecommerce','-Atc',"SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'"], cwd=ROOT, text=True).strip()
if check == '0':
    for name in ['schema.sql', 'load.sql']:
        compose('exec', '-T', 'adpg', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-f', '/sql/' + name)
else:
    assert check == '11', 'Unexpected pre-existing schema; inspect instead of overwriting'
compose('exec', '-T', 'adpg', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-f', '/sql/analytics.sql')
print('NEW PERSONAL STORAGE INITIALIZED', flush=True)
