"""Start ADCM and initialize ecommerce in the bundle-installed ADPG."""
from pathlib import Path
import platform
import secrets
import subprocess

ROOT = Path(__file__).resolve().parent
PSQL = Path('/usr/lib/adpg16/bin/psql')
assert platform.node() == 'tiabd-albakhtin-iv'
env = ROOT / '.env'
if not env.exists():
    env.write_text('TIABD_ADCM_DB_PASSWORD=' + secrets.token_hex(24) + '\n')
    env.chmod(0o600)
subprocess.run(['docker', 'compose', 'up', '-d', 'adcm-db', 'adcm'], cwd=ROOT, check=True)
if not PSQL.exists():
    raise SystemExit('Install the official ADPG bundle through ADCM first; see README.md')
subprocess.run(['sudo', '-n', 'systemctl', 'start', 'adpg16'], check=True)
base = ['sudo', '-n', '-u', 'postgres', str(PSQL), '-X', '-h', '/tmp', '-v', 'ON_ERROR_STOP=1']
exists = subprocess.check_output(base + ['-d', 'postgres', '-Atc', "SELECT datname FROM pg_database WHERE datname='ecommerce'"], text=True).strip()
if not exists:
    subprocess.run(['sudo', '-n', '-u', 'postgres', '/usr/lib/adpg16/bin/createdb', '-h', '/tmp', 'ecommerce'], check=True)
count = subprocess.check_output(base + ['-d', 'ecommerce', '-Atc', "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'"], text=True).strip()
if count == '0':
    for folder in [Path.home(), ROOT.parent, ROOT]:
        subprocess.run(['sudo', '-n', 'setfacl', '-m', 'u:postgres:--x', str(folder)], check=True)
    if not Path('/import').exists():
        subprocess.run(['sudo', '-n', 'ln', '-s', str(ROOT / 'data'), '/import'], check=True)
    subprocess.run(base + ['-d', 'ecommerce', '-1', '-f', str(ROOT / 'schema.sql'), '-f', str(ROOT / 'load.sql')], check=True)
elif count != '11':
    raise SystemExit('Unexpected existing schema; inspect it before changing data')
print('Official ADPG ecommerce schema is ready; existing data were preserved')
