"""Read-only executable slice: PostgreSQL BOM -> selection -> checks -> calculation.

No supplier requests or marketplace writes are performed. The clock is explicit
because deterministic coursework fixtures must not masquerade as current prices.
"""
from __future__ import annotations

import argparse
from datetime import datetime
from hashlib import sha256
import json
from pathlib import Path
import sys
from uuid import UUID

import psycopg

from domain import DomainError, PricingPolicy, calculate, resolve
from repository import load_catalog, load_slots

SUBJECT = Path(__file__).resolve().parents[1]
ROOT = SUBJECT.parents[1]


def run(conn, configuration_id: UUID, version: int, now: datetime):
    """Run inside a read-only transaction under the bounded viewer role."""
    if version <= 0:
        raise DomainError('Номер версии должен быть положительным')
    with conn.transaction():
        conn.execute('SET TRANSACTION READ ONLY')
        conn.execute('SET LOCAL ROLE ppois_viewer')
        role, read_only = conn.execute("SELECT current_user, current_setting('transaction_read_only')").fetchone()
        if (role, read_only) != ('ppois_viewer', 'on'):
            raise DomainError('Не установлены ограниченная роль и режим только чтения')
        components, offers = load_catalog(conn)
        slots = load_slots(conn, configuration_id, version)
        selected = resolve(slots, components, offers, now)
        values = calculate(selected, PricingPolicy())
        stored = conn.execute('''SELECT s.seller_code, s.revision_no,
                                      s.cost_rub, s.price_rub, s.mass_kg
            FROM ppois.card_status s JOIN ppois.card_revision r
              ON r.card_id=s.card_id AND r.revision_no=s.revision_no
            WHERE r.configuration_id=%s AND r.version_no=%s
            ORDER BY s.seller_code, s.revision_no''', (configuration_id, version)).fetchall()
        return {
            'mode': 'read-only coursework prototype',
            'clock': now.isoformat(), 'configuration_id': str(configuration_id),
            'version_no': version, 'sql_role': role, 'transaction_read_only': read_only,
            'selected': [{'line_no': r.slot.line_no, 'sku': r.component.sku,
                          'quantity': r.slot.quantity, 'supplier': r.offer.supplier_code,
                          'offer_id': r.offer.id, 'unit_price_rub': str(r.offer.unit_price_rub)}
                         for r in selected],
            'calculation': {key: str(value) for key, value in values.items()},
            'stored_revisions': [{'seller_code': r[0], 'revision_no': r[1],
                                  'matches_calculation': r[2:] == (
                                      values['cost_rub'], values['price_rub'], values['mass_kg'])}
                                 for r in stored],
            'external_calls': 0, 'database_writes': 0,
        }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True, help='Existing dedicated coursework database')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=55432)
    parser.add_argument('--user', default='ppois_owner', help='Account allowed to assume ppois_viewer')
    parser.add_argument('--configuration', type=UUID, required=True)
    parser.add_argument('--version', type=int, required=True)
    parser.add_argument('--now', required=True, help='ISO 8601 instant with timezone')
    parser.add_argument('--evidence', type=Path, help='Optional generated JSON inside repository .cache')
    args = parser.parse_args(argv)
    if args.evidence and not args.evidence.resolve().is_relative_to((ROOT/'.cache').resolve()):
        parser.error('Evidence output must be inside repository .cache')
    try:
        now = datetime.fromisoformat(args.now)
        with psycopg.connect(host=args.host, port=args.port, user=args.user,
                             dbname=args.database, autocommit=True) as conn:
            result = run(conn, args.configuration, args.version, now)
        result['source_sha256'] = {
            name: sha256((Path(__file__).parent/name).read_bytes()).hexdigest()
            for name in ('demo.py', 'domain.py', 'repository.py')}
        result['database'] = args.database
        payload = json.dumps(result, ensure_ascii=False, indent=2)+'\n'
        if args.evidence:
            args.evidence.parent.mkdir(parents=True, exist_ok=True)
            args.evidence.write_text(payload, encoding='utf-8')
        print(payload, end='')
        return 0
    except (DomainError, ValueError, psycopg.Error) as error:
        print(json.dumps({'status': 'error', 'message': str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
