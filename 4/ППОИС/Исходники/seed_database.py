"""Deterministic synthetic fixtures shared by DB tests and the bounded prototype."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

NOW = datetime(2026, 10, 5, 10, 0, tzinfo=timezone(timedelta(hours=3)))


def uid(n):
    return UUID(f'00000000-0000-0000-0000-{n:012d}')


def seed(conn):
    groups = [(1, 'CPU-AM5', 'Процессоры AM5', 'CPU'), (2, 'BOARD-AM5', 'Платы AM5 DDR5', 'BOARD'),
              (3, 'RAM-DDR5', 'Оперативная память DDR5', 'RAM'), (4, 'SSD-M2', 'Накопители M.2', 'SSD'),
              (5, 'CASE-ATX', 'Корпуса ATX', 'CASE'), (6, 'PSU-650', 'Блоки питания 650 Вт', 'PSU')]
    components = [(11, 1, 'CPU-7600', 'Процессор 6 ядер AM5', '.100', 'AM5', None, 65),
                  (12, 2, 'MB-B650', 'Плата B650 DDR5', '.800', 'AM5', 'DDR5', 40),
                  (13, 3, 'RAM-16', 'Модуль памяти 16 ГБ DDR5', '.050', None, 'DDR5', 5),
                  (14, 4, 'SSD-1TB', 'SSD M.2 1 ТБ', '.020', None, None, 8),
                  (15, 5, 'CASE-ATX', 'Корпус ATX', '4.500', None, None, None),
                  (16, 6, 'PSU-650', 'Блок питания 650 Вт', '1.500', None, None, 650),
                  (17, 7, 'CPU-LGA', 'Несовместимый процессор LGA1700', '.100', 'LGA1700', None, 125)]
    with conn.cursor() as c:
        c.executemany('INSERT INTO ppois.component_group VALUES (%s,%s,%s,%s)',
                      [(uid(i), code, name, role) for i, code, name, role in groups]
                      + [(uid(7), 'CPU-LGA', 'Процессоры LGA1700', 'CPU')])
        c.executemany('INSERT INTO ppois.component VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
                      [(uid(i), uid(g), sku, name, Decimal(m), socket, memory, power)
                       for i, g, sku, name, m, socket, memory, power in components])
        c.executemany('INSERT INTO ppois.supplier VALUES (%s,%s,%s)',
                      [(uid(21), 'SUP-A', 'Учебный поставщик A'), (uid(22), 'SUP-B', 'Учебный поставщик B')])
        prices = [16000, 12000, 4000, 5000, 4500, 5500]
        rows = [(uid(31+i), uid(11+i), uid(21), p, 10, NOW) for i, p in enumerate(prices)]
        rows += [(uid(41), uid(11), uid(22), 15000, 0, NOW),  # cheaper but out of stock
                 (uid(42), uid(11), uid(22), 14000, 10, NOW-timedelta(hours=25)),  # stale
                 (uid(43), uid(11), uid(22), 16500, 10, NOW),
                 (uid(44), uid(17), uid(22), 14500, 10, NOW)]
        c.executemany('INSERT INTO ppois.offer VALUES (%s,%s,%s,%s,%s,%s)', rows)
        c.execute('INSERT INTO ppois.configuration VALUES (%s,%s,%s)', (uid(100), 'PC-101', 'Учебная конфигурация AM5'))
        c.executemany('INSERT INTO ppois.bom_version VALUES (%s,%s,%s,%s)',
                      [(uid(100), 1, 'CHECKED', NOW), (uid(100), 2, 'DRAFT', NOW)])
        for version in (1, 2):
            for i, (_, _, _, role) in enumerate(groups):
                c.execute('INSERT INTO ppois.bom_slot VALUES (%s,%s,%s,%s,%s,%s,%s)',
                          (uid(100), version, i+1, uid(i+1), None,
                           uid(31+i), 2 if role == 'RAM' else 1))
        c.executemany('INSERT INTO ppois.card VALUES (%s,%s,%s)',
                      [(uid(200), 'YK-PC-101', 'ПК AM5 32 ГБ / 1 ТБ'),
                       (uid(201), 'YK-PC-102', 'Карточка без изображения')])
        # Actual control calculation: 51,000 components + 2,000 assembly + 500 packaging.
        # ceil(((53500*1.20+700)/.85)/100)*100 = 76,400; mass 7.020 + .800 = 7.820.
        for card in (200, 201):
            c.execute('INSERT INTO ppois.card_revision VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                      (uid(card), 1, uid(100), 1, 'READY' if card == 200 else 'DRAFT',
                       'Компьютер AM5 32 ГБ / SSD 1 ТБ', 'Учебная карточка без внешней публикации',
                       2000, 500, 700,
                       Decimal('.20'), Decimal('.15'), 100, Decimal('.800'), NOW))
        c.execute('UPDATE ppois.bom_version SET state = %s WHERE version_no = 1', ('FROZEN',))
        c.execute('INSERT INTO ppois.image VALUES (%s,%s,%s,%s,%s)',
                  (uid(300), 'images/pc-101.svg', 'a'*64, 1200, 1200))
        c.execute('INSERT INTO ppois.revision_image VALUES (%s,1,%s,1)', (uid(200), uid(300)))
        c.execute('INSERT INTO ppois.publication_attempt VALUES (%s,1,1,%s,%s,NULL,false,%s,%s)',
                  (uid(200), 'ACCEPTED', 'demo-task-001', NOW, NOW+timedelta(minutes=1)))
    conn.commit()
