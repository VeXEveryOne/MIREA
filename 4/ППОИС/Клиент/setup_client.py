"""Create a fresh isolated client database; never reset the practice 7 DB."""
from datetime import datetime, timezone
from hashlib import sha256
import argparse
import json
from pathlib import Path
import re
import sys
from uuid import uuid4

import psycopg
from psycopg import sql

BASE = Path(__file__).resolve().parents[1]
ROOT = BASE.parents[1]
sys.path.insert(0, str(BASE / 'Исходники'))
from seed_database import seed


def setup(output, reuse=None):
    output = Path(output).resolve()
    if not output.is_relative_to(ROOT / '.cache'):
        raise ValueError('Client environment manifest must stay inside .cache')
    if reuse is not None and not re.fullmatch(r'ppois10_[0-9a-f]{12}', reuse):
        raise ValueError('Only a separately created client database may be reused')
    name = reuse or 'ppois10_' + uuid4().hex[:12]
    sources = {p.name: p for p in (BASE / 'База_данных/schema.sql', BASE / 'База_данных/privileges.sql',
                                  BASE / 'Исходники/seed_database.py')}
    if not reuse:
        with psycopg.connect('host=127.0.0.1 port=55432 dbname=postgres user=ppois_owner', autocommit=True) as owner:
            owner.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
            privileges = sources['privileges.sql'].read_text(encoding='utf-8')
            for role in ('ppois_engineer', 'ppois_manager', 'ppois_viewer', 'ppois_worker'):
                if owner.execute('SELECT 1 FROM pg_roles WHERE rolname=%s', (role,)).fetchone():
                    privileges = privileges.replace('CREATE ROLE ' + role + ' NOLOGIN;', '')
    with psycopg.connect(host='127.0.0.1', port=55432, dbname=name, user='ppois_owner') as conn:
        if not reuse:
            conn.execute(sources['schema.sql'].read_text(encoding='utf-8'))
            conn.execute(privileges)
            conn.commit()
            seed(conn)
        expected = {'component_group': 7, 'component': 7, 'supplier': 2, 'offer': 10,
                    'configuration': 1, 'bom_version': 2, 'bom_slot': 12, 'card': 2,
                    'card_revision': 2, 'image': 1, 'revision_image': 1, 'publication_attempt': 1}
        actual = {table: conn.execute(sql.SQL('SELECT count(*) FROM ppois.{}').format(
                    sql.Identifier(table))).fetchone()[0] for table in expected}
        if actual != expected:
            raise ValueError('Only an unchanged 48-record seed database may initialize this manifest')
    output.parent.mkdir(parents=True, exist_ok=True)
    result = {'database': name, 'host': '127.0.0.1', 'port': 55432, 'user': 'ppois_owner',
              'control_time': '2026-10-05T10:00:00+03:00',
              'environment_verified_at': datetime.now(timezone.utc).isoformat(), 'initial_counts': actual,
              'purpose': 'isolated localhost client prototype, never the practice 7 evidence DB',
              'source_sha256': {k: sha256(p.read_bytes()).hexdigest() for k, p in sources.items()}}
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'database': name, 'manifest': str(output)}, ensure_ascii=False))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--reuse', help='Reuse only a fresh, unchanged ppois10_* seed database; never reset it')
    args = parser.parse_args()
    setup(args.output, args.reuse)
