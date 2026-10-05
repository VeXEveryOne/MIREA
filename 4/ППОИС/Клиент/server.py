"""Local 0.2 client API with explicit demo sessions and PostgreSQL role checks.

Not a production authentication/deployment system. Listens on loopback only,
uses only a dedicated ppois10_* database and never contacts a marketplace.
"""
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from hashlib import scrypt
from hmac import compare_digest
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import argparse
import json
from pathlib import Path
import re
import secrets
import sys
import threading
import time
from urllib.parse import parse_qs, urlsplit
from uuid import UUID, uuid4

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

BASE = Path(__file__).resolve().parents[1]
CLIENT = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE / 'Прототип'))
from domain import DomainError, PricingPolicy, Slot, calculate, check_compatibility, resolve
from repository import load_catalog, load_slots

CONTRACT = json.loads((CLIENT / 'client_contract.json').read_text(encoding='utf-8'))
DEMO_PASSWORD = 'coursework-demo'  # Public test credential, not a real secret.
STATIC = {'/': ('client.html', 'text/html'), '/contract.json': ('client_contract.json', 'application/json'), '/client.js': ('client.js', 'text/javascript'),
          '/client.css': ('client.css', 'text/css')}


class ApiError(Exception):
    def __init__(self, status, message):
        self.status = status; self.message = message


def strict(data, allowed, required=()):
    if not isinstance(data, dict) or set(data) - set(allowed) or set(required) - set(data):
        raise ApiError(422, 'Неизвестные или пропущенные поля запроса')


def positive(value, name, allow_zero=False):
    if type(value) is not int or not (0 if allow_zero else 1) <= value <= 2147483647:
        raise ApiError(422, name + ': ожидается целое число допустимого диапазона')
    return value


def uuid(value):
    try:
        return str(UUID(value))
    except (ValueError, TypeError, AttributeError):
        raise ApiError(422, 'Неверный UUID') from None


def string(value, name, maximum):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ApiError(422, name + ': пустое либо слишком длинное значение')
    return value.strip()


def slots(data):
    if not isinstance(data, list) or not 1 <= len(data) <= CONTRACT['limits']['max_slots']:
        raise ApiError(422, 'Состав должен содержать от 1 до 50 позиций')
    result = []; seen = set()
    for row in data:
        strict(row, ('line_no', 'quantity', 'group_id', 'requested_component_id'), ('line_no', 'quantity'))
        line = positive(row['line_no'], 'Номер строки')
        quantity = positive(row['quantity'], 'Количество')
        if line in seen:
            raise ApiError(422, 'Номера строк повторяются')
        seen.add(line)
        group = uuid(row['group_id']) if row.get('group_id') is not None else None
        component = uuid(row['requested_component_id']) if row.get('requested_component_id') is not None else None
        if bool(group) == bool(component):
            raise ApiError(422, 'Выбрать группу либо точный компонент')
        result.append(Slot(line, quantity, group, component))
    return result


def policy(data):
    strict(data, PricingPolicy.__dataclass_fields__)
    values = {}
    for name, value in data.items():
        try:
            if isinstance(value, bool):
                raise InvalidOperation
            number = Decimal(str(value))
            scale = 4 if name.endswith('_rate') else 3 if name.endswith('_kg') else 2
            maximum = Decimal(1) if name.endswith('_rate') else Decimal('1000000') if name in (
                'round_step_rub', 'packaging_mass_kg') else Decimal('100000000')
            if not number.is_finite() or number.quantize(Decimal(10) ** -scale) != number:
                raise InvalidOperation
            if abs(number) >= maximum and not name.endswith('_rate'):
                raise InvalidOperation
            values[name] = number
        except (ValueError, InvalidOperation):
            raise ApiError(422, name + ': значение не представимо в поле БД') from None
    result = PricingPolicy(**values)
    result.validate()
    return result


@dataclass(frozen=True)
class Session:
    role: str
    csrf: str
    expires: float


class Application:
    def __init__(self, environment):
        if environment['host'] != '127.0.0.1' or environment['port'] != 55432 or environment['user'] != 'ppois_owner' or not re.fullmatch(
                r'ppois10_[0-9a-f]{12}', environment['database']):
            raise ValueError('Only an isolated loopback client database is permitted')
        self.connection = {'host': '127.0.0.1', 'port': 55432, 'dbname': environment['database'],
                           'user': environment['user']}
        self.now = datetime.fromisoformat(environment['control_time'])
        if self.now.tzinfo is None:
            raise ValueError('Control time requires a timezone')
        self.sessions = {}; self.lock = threading.Lock()
        self.salt = secrets.token_bytes(16)
        self.password_hash = scrypt(DEMO_PASSWORD.encode(), salt=self.salt, n=2**14, r=8, p=1)

    def login(self, data):
        strict(data, ('username', 'password'), ('username', 'password'))
        if not isinstance(data['password'], str) or len(data['password']) > 128:
            raise ApiError(401, 'Неверные демонстрационные реквизиты')
        valid = compare_digest(scrypt(data['password'].encode(), salt=self.salt, n=2**14, r=8, p=1),
                               self.password_hash)
        if not isinstance(data['username'], str) or data['username'] not in CONTRACT['roles'] or not valid:
            raise ApiError(401, 'Неверные демонстрационные реквизиты')
        token = secrets.token_urlsafe(32)
        session = Session(data['username'], secrets.token_urlsafe(32),
                          time.monotonic() + CONTRACT['limits']['session_minutes'] * 60)
        with self.lock:
            self.sessions = {k: s for k, s in self.sessions.items() if s.expires > time.monotonic()}
            self.sessions[token] = session
        return token, session

    def session(self, token):
        with self.lock:
            result = self.sessions.get(token)
            if result is not None and result.expires <= time.monotonic():
                del self.sessions[token]; result = None
        if result is None:
            raise ApiError(401, 'Сеанс отсутствует или истёк')
        return result

    def logout(self, token):
        with self.lock:
            self.sessions.pop(token, None)

    def authorize(self, session, function):
        if function not in CONTRACT['roles'][session.role]['functions']:
            raise ApiError(403, 'Действие недоступно для текущей роли')

    def session_info(self, session):
        return {'role': session.role, 'label': CONTRACT['roles'][session.role]['label'],
                'functions': CONTRACT['roles'][session.role]['functions'], 'csrf': session.csrf,
                'control_time': self.now.isoformat(), 'version': CONTRACT['version']}

    @contextmanager
    def database(self, session, write=False):
        with psycopg.connect(**self.connection, row_factory=dict_row) as conn:
            with conn.transaction():
                if not write:
                    conn.execute('SET TRANSACTION READ ONLY')
                role = CONTRACT['roles'][session.role]['database_role']
                conn.execute(sql.SQL('SET LOCAL ROLE {}').format(sql.Identifier(role)))
                yield conn

    def read(self, session, path, query):
        if path == '/api/session':
            return self.session_info(session)
        with self.database(session) as conn:
            if path == '/api/catalog':
                return {table: conn.execute('SELECT * FROM ppois.' + table + ' ORDER BY ' + order).fetchall()
                        for table, order in (('component_group', 'code'), ('component', 'sku'),
                                              ('supplier', 'code'), ('offer', 'observed_at DESC,id'))}
            if path == '/api/configurations':
                return conn.execute('''SELECT c.*, b.version_no,b.state,b.created_at,
                    EXISTS(SELECT 1 FROM ppois.card_revision r WHERE
                    (r.configuration_id,r.version_no)=(b.configuration_id,b.version_no)) AS referenced
                    FROM ppois.configuration c JOIN ppois.bom_version b ON b.configuration_id=c.id
                    ORDER BY c.code,b.version_no DESC''').fetchall()
            if path == '/api/bom':
                config = uuid(query.get('configuration_id', [''])[0])
                try:
                    version = positive(int(query.get('version_no', [''])[0]), 'Версия')
                except ValueError:
                    raise ApiError(422, 'Неверный номер версии') from None
                rows = conn.execute('SELECT * FROM ppois.bom_slot WHERE configuration_id=%s AND version_no=%s ORDER BY line_no',
                                    (config, version)).fetchall()
                if not rows:
                    raise ApiError(404, 'Состав не найден')
                return rows
            if path == '/api/cards':
                return {'cards': conn.execute('SELECT * FROM ppois.card ORDER BY seller_code').fetchall(),
                        'revisions': conn.execute('SELECT * FROM ppois.card_revision ORDER BY card_id,revision_no DESC').fetchall(),
                        'images': conn.execute('SELECT * FROM ppois.image ORDER BY id').fetchall(),
                        'image_links': conn.execute('SELECT * FROM ppois.revision_image ORDER BY card_id,revision_no,ordinal').fetchall(),
                        'status': conn.execute('SELECT * FROM ppois.card_status ORDER BY seller_code,revision_no DESC').fetchall()}
            if path == '/api/publications':
                return conn.execute('SELECT * FROM ppois.publication_attempt ORDER BY created_at DESC,card_id,attempt_no DESC').fetchall()
            if path == '/api/diagnostics':
                return dict(conn.execute('SELECT current_database() AS database,current_user AS database_role, '
                    "current_setting('transaction_read_only') AS read_only").fetchone(),
                    external_publication=False, image_upload=False, version=CONTRACT['version'])
        raise ApiError(404, 'Неизвестный ресурс')

    def calculation(self, conn, data):
        strict(data, ('configuration_id', 'version_no', 'slots', 'policy'))
        if 'slots' in data:
            selected_slots = slots(data['slots'])
        else:
            config = uuid(data.get('configuration_id'))
            version = positive(data.get('version_no'), 'Версия')
            selected_slots = load_slots(conn, config, version)
        components, offers = load_catalog(conn)
        resolved = resolve(selected_slots, components, offers, self.now)
        params = policy(data.get('policy', {}))
        result = calculate(resolved, params)
        return result, resolved, params

    def save_version(self, conn, data):
        strict(data, ('configuration_id', 'code', 'name', 'expected_latest', 'slots'), ('expected_latest', 'slots'))
        latest_expected = positive(data['expected_latest'], 'Последняя версия', allow_zero=True)
        selected_slots = slots(data['slots'])
        config = uuid(data['configuration_id']) if data.get('configuration_id') else str(uuid4())
        conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", ('bom:' + config,))
        latest = conn.execute('SELECT COALESCE(max(version_no),0) AS n FROM ppois.bom_version WHERE configuration_id=%s',
                              (config,)).fetchone()['n']
        if latest != latest_expected:
            raise ApiError(409, 'Версия изменилась; обновите данные перед сохранением')
        if not data.get('configuration_id'):
            conn.execute('INSERT INTO ppois.configuration VALUES (%s,%s,%s)',
                         (config, string(data.get('code'), 'Код', 30), string(data.get('name'), 'Название', 160)))
        elif not conn.execute('SELECT 1 FROM ppois.configuration WHERE id=%s', (config,)).fetchone():
            raise ApiError(404, 'Конфигурация не найдена')
        errors = []; resolved = []
        components, offers = load_catalog(conn)
        try:
            resolved = resolve(selected_slots, components, offers, self.now)
            errors = check_compatibility(resolved)
        except DomainError as e:
            errors = [str(e)]
        chosen = {r.slot.line_no: r.offer.id for r in resolved} if not errors else {}
        if latest >= 2147483647:
            raise ApiError(422, 'Достигнут предельный номер версии')
        version = latest + 1; state = 'DRAFT' if errors else 'CHECKED'
        conn.execute('INSERT INTO ppois.bom_version VALUES (%s,%s,%s,%s)',
                     (config, version, state, datetime.now(timezone.utc)))
        with conn.cursor() as cursor:
            cursor.executemany('INSERT INTO ppois.bom_slot VALUES (%s,%s,%s,%s,%s,%s,%s)',
                [(config, version, s.line_no, s.group_id, s.requested_component_id, chosen.get(s.line_no), s.quantity)
                 for s in selected_slots])
        return {'configuration_id': config, 'version_no': version, 'state': state, 'errors': errors}

    def save_revision(self, conn, data):
        strict(data, ('card_id', 'seller_code', 'name', 'expected_latest', 'configuration_id', 'version_no',
                      'title', 'description', 'policy'), ('expected_latest', 'configuration_id', 'version_no', 'title', 'description'))
        config = uuid(data['configuration_id']); version = positive(data['version_no'], 'Версия')
        card = uuid(data['card_id']) if data.get('card_id') else str(uuid4())
        expected = positive(data['expected_latest'], 'Последняя ревизия', allow_zero=True)
        # Same first lock as an engineer's save; all lock acquisition order is
        # BOM before card. Only SELECT functions, no elevated table mutation.
        for key in ('bom:' + config, 'card:' + card):
            conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (key,))
        result, resolved, params = self.calculation(conn, {k: data[k] for k in ('configuration_id', 'version_no', 'policy') if k in data})
        saved = conn.execute('SELECT line_no,offer_id FROM ppois.bom_slot WHERE configuration_id=%s AND version_no=%s',
                             (config, version)).fetchall()
        if {r['line_no']: str(r['offer_id']) for r in saved} != {r.slot.line_no: r.offer.id for r in resolved}:
            raise ApiError(409, 'Подбор изменился; инженер должен сохранить новую проверенную версию')
        state = conn.execute('SELECT state FROM ppois.bom_version WHERE configuration_id=%s AND version_no=%s',
                             (config, version)).fetchone()['state']
        if state not in ('CHECKED', 'FROZEN'):
            raise ApiError(409, 'Сначала сохранить проверенную версию состава')
        latest = conn.execute('SELECT COALESCE(max(revision_no),0) AS n FROM ppois.card_revision WHERE card_id=%s',
                              (card,)).fetchone()['n']
        if latest != expected:
            raise ApiError(409, 'Ревизия изменилась; обновите данные')
        if latest >= 2147483647:
            raise ApiError(422, 'Достигнут предельный номер ревизии')
        if not data.get('card_id'):
            conn.execute('INSERT INTO ppois.card VALUES (%s,%s,%s)',
                         (card, string(data.get('seller_code'), 'Код продавца', 60), string(data.get('name'), 'Название', 160)))
        elif not conn.execute('SELECT 1 FROM ppois.card WHERE id=%s', (card,)).fetchone():
            raise ApiError(404, 'Карточка не найдена')
        conn.execute('INSERT INTO ppois.card_revision VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                     (card, latest + 1, config, version, 'DRAFT', string(data['title'], 'Заголовок', 200),
                      string(data['description'], 'Описание', 5000), *[getattr(params, name) for name in
                      ('assembly_rub', 'packaging_rub', 'logistics_rub', 'markup_rate', 'commission_rate',
                       'round_step_rub', 'packaging_mass_kg')], self.now))
        return {'card_id': card, 'revision_no': latest + 1, 'state': 'DRAFT', 'calculation': result,
                'notice': 'Расчётный снимок сохранён; готовность контента и публикация не подтверждены'}

    def write(self, session, path, data):
        if path == '/api/calculate':
            with self.database(session) as conn:
                result, resolved, params = self.calculation(conn, data)
                return {'control_time': self.now, 'result': result,
                        'policy': {k: getattr(params, k) for k in params.__dataclass_fields__},
                        'positions': [{'line_no': r.slot.line_no, 'sku': r.component.sku,
                                       'quantity': r.slot.quantity, 'offer_id': r.offer.id,
                                       'unit_price_rub': r.offer.unit_price_rub,
                                       'line_cost_rub': r.slot.quantity * r.offer.unit_price_rub,
                                       'line_mass_kg': r.slot.quantity * r.component.mass_kg} for r in resolved]}
        with self.database(session, write=True) as conn:
            if path == '/api/versions':
                return self.save_version(conn, data)
            if path == '/api/revisions':
                return self.save_revision(conn, data)
        raise ApiError(404, 'Неизвестная операция')


def serial(value):
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError('Unsupported response type')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log request bodies, passwords or cookies.

    def reply(self, status, value, cookie=None, mime='application/json'):
        data = json.dumps(value, ensure_ascii=False, default=serial).encode('utf-8') if mime == 'application/json' else value
        self.send_response(status)
        self.send_header('Content-Type', mime + '; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers(); self.wfile.write(data)

    def body(self):
        if self.headers.get_content_type() != 'application/json':
            raise ApiError(415, 'Требуется JSON')
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            raise ApiError(400, 'Неверная длина запроса') from None
        if not 0 < length <= CONTRACT['limits']['max_request_bytes']:
            raise ApiError(413, 'Запрос превышает допустимый размер либо пуст')
        try:
            return json.loads(self.rfile.read(length).decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ApiError(400, 'Неверный JSON') from None

    def dispatch(self):
        app = self.server.application
        parsed = urlsplit(self.path)
        hosts = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        if self.headers.get('Host') not in hosts:
            raise ApiError(403, 'Стенд доступен только на loopback')
        origin = self.headers.get('Origin')
        if self.command == 'POST' and origin is not None and origin not in {'http://' + h for h in hosts}:
            raise ApiError(403, 'Неверный источник запроса')
        if self.command == 'GET' and parsed.path in STATIC:
            file, mime = STATIC[parsed.path]
            if not (CLIENT / file).is_file():
                raise ApiError(503, 'Клиент ещё не собран')
            content = (CLIENT / file).read_bytes()
            self.reply(200, json.loads(content) if mime == 'application/json' else content, mime=mime); return
        route = next((r for r in CONTRACT['routes'] if r['method'] == self.command and r['path'] == parsed.path), None)
        if route is None:
            raise ApiError(404, 'Неизвестный маршрут')
        cookies = SimpleCookie()
        try:
            cookies.load(self.headers.get('Cookie', ''))
        except Exception:
            raise ApiError(401, 'Неверный сеанс') from None
        token = cookies['ppois_session'].value if 'ppois_session' in cookies else ''
        if route.get('public'):
            new_token, session = app.login(self.body())
            if token:
                app.logout(token)
            self.reply(200, app.session_info(session),
                       cookie=f'ppois_session={new_token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800'); return
        session = app.session(token)
        app.authorize(session, route['function'])
        if self.command == 'POST':
            if not compare_digest(self.headers.get('X-CSRF-Token', ''), session.csrf):
                raise ApiError(403, 'Неверный токен изменения данных')
            if parsed.path == '/api/logout':
                app.logout(token)
                self.reply(200, {'logged_out': True}, cookie='ppois_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return
            result = app.write(session, parsed.path, self.body())
        else:
            result = app.read(session, parsed.path, parse_qs(parsed.query))
        self.reply(200, result)

    def handle_request(self):
        self.connection.settimeout(10)
        try:
            self.dispatch()
        except ApiError as e:
            self.reply(e.status, {'error': e.message})
        except DomainError as e:
            self.reply(422, {'error': str(e)})
        except psycopg.IntegrityError as e:
            self.reply(409 if e.sqlstate == '23505' else 422, {'error': 'Ограничение БД: операция не сохранена', 'sqlstate': e.sqlstate})
        except psycopg.DataError:
            self.reply(422, {'error': 'Значение не представимо в поле БД; операция не сохранена'})
        except Exception:
            self.reply(500, {'error': 'Ошибка локального стенда; проверьте его запуск'})

    do_GET = handle_request
    do_POST = handle_request


def make_server(environment, port=8765):
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.application = Application(environment)
    return server


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--environment', required=True)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    with make_server(json.loads(Path(args.environment).read_text(encoding='utf-8')), args.port) as server:
        print('Local coursework client: http://127.0.0.1:' + str(server.server_port), flush=True)
        print('Public demonstration accounts only; no external publication', flush=True)
        server.serve_forever()
