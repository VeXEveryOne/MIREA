"""PostgreSQL read mapping; concepts from PPOIS4, normalized storage from PPOIS7."""
from psycopg.rows import dict_row
from domain import Component, Offer, Slot


def load_catalog(conn):
    with conn.cursor(row_factory=dict_row) as c:
        c.execute('SELECT c.*, g.role_code FROM ppois.component c JOIN ppois.component_group g ON g.id=c.group_id ORDER BY c.sku')
        components = [Component(str(r['id']),str(r['group_id']),r['sku'],r['role_code'],
                                r['mass_kg'],r['socket'],r['memory_type'],r['power_w']) for r in c]
        c.execute('SELECT o.*,s.code FROM ppois.offer o JOIN ppois.supplier s ON s.id=o.supplier_id ORDER BY o.id')
        offers = [Offer(str(r['id']),str(r['component_id']),r['code'],r['unit_price_rub'],
                        r['stock'],r['observed_at']) for r in c]
    return components, offers


def load_slots(conn, configuration_id, version_no):
    with conn.cursor(row_factory=dict_row) as c:
        c.execute('SELECT * FROM ppois.bom_slot WHERE configuration_id=%s AND version_no=%s ORDER BY line_no',
                  (configuration_id,version_no))
        return [Slot(r['line_no'],r['quantity'],str(r['group_id']) if r['group_id'] else None,
                     str(r['requested_component_id']) if r['requested_component_id'] else None) for r in c]
