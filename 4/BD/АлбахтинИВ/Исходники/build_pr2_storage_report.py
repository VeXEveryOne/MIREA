"""Build the storage section from verified official ADPG evidence.

The canonical combined report is assembled by scripts/prepare_combined_pr2.py
and scripts/build_combined_pr2.ps1. This file changes only Albakhtin's section.
"""
from pathlib import Path
import json
import re
import sys

PACK = Path(__file__).resolve().parents[1]
BD = PACK.parent
sys.path.insert(0, str(BD / 'spark_lab'))
from report_layout import Report, font, spacing, A, Cm, Pt

STORAGE = PACK / 'Результаты/Хранение'
TARGET = PACK / 'Исходники/Компоненты_ПР2/ТИАБД_ПР2_Хранение_АлбахтинИВ.docx'


def n(value, digits=0):
    return f'{value:,.{digits}f}'.replace(',', ' ').replace('.', ',')


def cover(doc):
    for p in doc.paragraphs:
        if p.text == 'Кафедра прикладной математики':
            p.text = 'Кафедра квантовых информационных технологий, практической и прикладной информатики (ККИТПиПИ)'
            spacing(p, A.CENTER, 0, 1, after=3)
            for run in p.runs:
                font(run, 14, bold=True)
    for row in doc.tables[1].rows:
        if row.cells[0].text.strip().startswith('Преподаватель'):
            row.cells[1].text = 'Приходько Н.А.'
        for cell in row.cells:
            for p in cell.paragraphs:
                spacing(p, A.LEFT, 0, 1)
                for run in p.runs:
                    font(run, 12)
    doc.core_properties.author = 'Албахтин И.В.'
    doc.core_properties.last_modified_by = 'Албахтин И.В.'
    doc.core_properties.subject = 'Технологии и инструментарий анализа больших данных'
    doc.core_properties.title = 'Практическая работа 2 Система хранения данных'
    doc.core_properties.comments = ''


def add_questions(d):
    text = (BD / 'ТИАБД_ПР2_Хранение_Ответы.md').read_text(encoding='utf-8-sig')
    questions = re.findall(r'(?ms)^\d+\. \*\*(.*?)\*\*\s*\n(.*?)(?=^\d+\. \*\*|\Z)', text)
    assert len(questions) == 12
    d.h('8 Ответы на контрольные вопросы')
    for i, (question, answer) in enumerate(questions, 1):
        p = d.p(f'{i}. {question.replace("`", "")}')
        spacing(p, A.LEFT, 0, 1.5, before=6, after=2, next=True)
        for run in p.runs:
            font(run, 14, bold=True)
        d.p(re.sub(r'\s+', ' ', answer).strip().replace('`', '').replace('**', ''))


def build():
    r = json.loads((STORAGE / 'storage.json').read_text(encoding='utf-8'))
    adcm = json.loads((STORAGE / 'adcm.json').read_text(encoding='utf-8'))
    assert r.get('deployment') == 'Official Arenadata ADPG Community bundle via ADCM'
    assert adcm['install_task']['status'] == 'success'
    d = Report(2, 'Система хранения данных')
    cover(d.doc)
    d.h('1 Цель и выполненные задания')
    d.p('Цель работы — развернуть систему хранения данных на Ubuntu Server, установить Arenadata PostgreSQL через Arenadata Cluster Manager, загрузить связанные CSV Olist в базу ecommerce, выполнить аналитические SQL-задания и представить результаты на дашборде Grafana.')
    d.p('Выполнены настройка виртуальной машины и сети, установка официальных бандлов SSH Common и ADPG, создание public-схемы, импорт 11 таблиц, четыре аналитических запроса, четыре обязательные и две дополнительные панели. Результаты получены на стенде 18 октября 2026 года.')
    d.h('2 Виртуальная инфраструктура')
    d.table('Конфигурация виртуальной машины', ['Параметр', 'Значение'], [
        ['Имя ВМ', 'TIABD-Albakhtin-IV'], ['ОС', 'Ubuntu Server 22.04.5 LTS'],
        ['Ресурсы', '2 vCPU; 4 ГБ RAM; диск 40 ГБ'],
        ['Адаптер 1', 'NAT; 10.0.2.15/24; доступ в Интернет'],
        ['Адаптер 2', 'Host-Only; 192.168.56.103/24; доступ с Windows'],
        ['Хост и пользователь', 'tiabd-albakhtin-iv; albakhtin'],
    ], [5, 11.5])
    d.figure(STORAGE / '01_vm.png', 'Параметры Ubuntu Server и два сетевых адаптера', 16)
    d.h('3 Установка официального кластера Arenadata')
    version = adcm['cluster']['prototype']['version']
    d.p(f'В ADCM 2.12.0 загружены официальный бандл ADPG {version} Community и SSH Common 2.14-1 с downloads.arenadata.io. Созданы SSH-хостпровайдер, хост 192.168.56.103 и кластер TIABD Albakhtin IV ADPG. В выбранном бандле продукт отображается как ADP, а служба СУБД — ADPG.')
    d.p('На единственный учебный хост назначены ADPG, NTP Master, Prometheus Server, Grafana, Node Exporter и ADPG Exporters. Действие Install выполнено через ADCM и завершилось со статусом success. ADCM и его служебная база работают в Docker; ADPG и мониторинг установлены официальным бандлом как системные службы Ubuntu.')
    package_rows = [[p['package'], p['version']] for p in r['packages'] if p['package'] in ['adpg16', 'adpg16-server', 'adpg16-pgwatch2', 'admprom-prometheus', 'admprom-grafana']]
    d.table('Установленные пакеты Arenadata', ['Пакет', 'Фактическая версия'], package_rows, [6, 10.5])
    d.figure(STORAGE / '02_services.png', 'Службы ADPG и мониторинга и версии пакетов Arenadata', 16)
    d.figure(STORAGE / '03_adcm.png', 'Страница Cluster Overview со статусами служб официального кластера', 16)
    d.table('Доступ к сервисам', ['Сервис', 'Адрес с Windows'], [
        ['ADCM', 'http://127.0.0.1:8001'], ['ADPG', '127.0.0.1:5433; ecommerce'],
        ['Prometheus', 'http://192.168.56.103:11200'], ['Grafana', 'http://127.0.0.1:11211'],
    ], [5, 11.5])
    d.h('4 Схема и импорт данных')
    d.p('Сначала созданы таблицы public, первичные и внешние ключи, затем импортированы CSV. Данные загружены в порядке зависимостей: sellers, customers, geolocation, leads_qualified, product_category_name_translation, leads_closed, products, orders, order_items, order_reviews, order_payments. В методичке leads_closed повторяется в перечне; повторный импорт одной таблицы не выполняется, а leads_qualified необходима как родительская таблица маркетинговых лидов.')
    d.p('Исходные CSV сохранены без изменения. Для двух отсутствующих категорий добавлены записи словаря с NULL-переводом. Ссылки leads_closed на продавцов, отсутствующих в sellers, заменены на NULL при переносе из staging-таблицы. Остальные значения и число строк сохранены. Загрузка схемы и данных выполнена в одной транзакции с ON_ERROR_STOP; после импорта выполнен ANALYZE.')
    d.code('sudo -u postgres /usr/lib/adpg16/bin/psql -h /tmp -d ecommerce \\\n  -v ON_ERROR_STOP=1 -1 -f schema.sql -f load.sql')
    d.table('Количество импортированных строк', ['Таблица', 'Строк'], [[name, n(count)] for name, count in r['counts'].items()] + [['Итого', n(sum(r['counts'].values()))]], [11, 5.5])
    d.p(f'Проверены 11 первичных и {r["validated_foreign_keys"]} внешних ключей; все внешние ключи имеют convalidated=true. Схема получена непосредственно из системного каталога работающей базы командой show_schema.sql. Геолокация содержит несколько строк на почтовый индекс, поэтому индекс почты не используется как уникальный родительский ключ.')
    d.figure(STORAGE / '05_schema.png', 'Таблицы и связи public-схемы в консоли psql установленного ADPG', 16)
    d.h('5 Аналитические SQL-задания')
    tasks = [
        ('5.1 Топ категорий по выручке', ['Категория', 'Перевод', 'Выручка R$', 'Заказы', 'Позиции'], ['product_category_name', 'category_en', 'revenue', 'orders_count', 'items_count'], [4.4, 4.1, 3.0, 2.5, 2.5]),
        ('5.2 Платёжное поведение', ['Тип', 'Платежи', 'Рассрочки', 'Средний R$', 'Заказы %'], ['payment_type', 'payments_count', 'avg_installments', 'avg_payment', 'order_share_pct'], [3.5, 3, 3, 3.5, 3.5]),
        ('5.3 Оценка и скорость доставки', ['Интервал', 'Заказы', 'Средняя оценка'], ['delivery_group', 'orders_count', 'avg_review_score'], [7, 4.5, 5]),
        ('5.4 Эффективность продавцов', ['Продавец', 'Заказы', 'Клиенты', 'Позиции', 'Оборот R$', 'Доставка R$'], ['seller_id', 'orders_count', 'customers_count', 'items_count', 'revenue', 'avg_freight'], [2.7, 1.9, 2.6, 2.1, 3.7, 3.5]),
    ]
    for i, (title, headers, keys, widths) in enumerate(tasks):
        d.h(title, 2)
        task = r['queries'][i]
        d.code(task['sql'])
        rows = []
        for row in task['rows']:
            values = []
            for key in keys:
                value = row[key]
                if key == 'seller_id':
                    value = value[:8]
                elif isinstance(value, float):
                    value = n(value, 2)
                elif isinstance(value, int):
                    value = n(value)
                else:
                    value = str(value).replace('_', '_\u200b')
                values.append(value)
            rows.append(values)
        d.table(title[4:], headers, rows, widths)
        if i == 0:
            leader = task['rows'][0]
            d.p(f'Лидирует категория {leader["category_en"]}: {n(leader["revenue"], 2)} R$. Выручка определяется как SUM(price), без доставки. Заказы считаются по уникальному order_id, позиции — по строкам order_items.')
        elif i == 1:
            d.p('Самый распространённый способ оплаты — credit_card. Знаменатель доли — число уникальных заказов с известной оплатой. Один заказ может использовать несколько способов, поэтому сумма долей не обязана равняться 100 %. Число рассрочек усредняется по платёжным записям.')
        elif i == 2:
            d.p('Длительность рассчитана как разность календарных дат доставки и покупки. Отзывы усреднены до одного значения на заказ, чтобы несколько отзывов не увеличивали его вес. Заказы без даты доставки исключены. При увеличении длительности средняя оценка снижается; наблюдаемая связь не доказывает причинность.')
        else:
            d.p('В таблице показаны первые восемь символов seller_id; полные идентификаторы сохранены в storage.json. Покупатели считаются по customer_unique_id. Последний столбец содержит среднее значение freight_value на товарную позицию. Рейтинг отсортирован по числу уникальных заказов, затем по обороту.')
    d.h('6 Визуализация в Grafana')
    d.p('Создан источник PostgreSQL ecommerce-postgres с подключением к установленному ADPG и пользователем только для чтения public-схемы. Проверка источника возвращает OK. Дашборд включает месячную динамику уникальных заказов, распределение заказов по оценкам, способы оплаты, топ-10 категорий по обороту и две дополнительные панели: суммарную стоимость товарных позиций и число уникальных покупателей.')
    d.figure(STORAGE / '04_grafana.png', 'Общий дашборд ecommerce с шестью панелями в Grafana', 16)
    d.figure(STORAGE / '06_grafana_revenue.png', 'Дополнительная визуализация оборота товарных позиций', 16)
    d.figure(STORAGE / '07_grafana_buyers.png', 'Дополнительная визуализация числа уникальных покупателей', 16)
    d.table('Контрольные показатели', ['Показатель', 'Значение'], [
        ['Оборот товарных позиций', n(r['revenue'], 2) + ' R$'], ['Уникальные покупатели', n(r['buyers'])],
        ['Grafana datasource health', r['datasource_health']['status']],
        ['Доступность целей Prometheus', f'{len(r["prometheus"]["data"]["result"])} из {len(r["prometheus"]["data"]["result"])}; up = 1'],
    ], [10.5, 6])
    d.p('Линейный график показывает изменение числа заказов по месяцам. Наиболее многочисленна оценка 5; при чтении столбцов учитывается число уникальных заказов для каждой оценки. Круговая диаграмма отображает распределение вхождений способов оплаты в заказы. Горизонтальные столбцы позволяют сравнить оборот категорий. Дополнительные показатели описывают общий масштаб набора данных.')
    d.h('7 Выводы')
    d.p('Официальный кластер Arenadata развёрнут через ADCM на Ubuntu Server с двумя сетевыми адаптерами. Установлены пакеты ADPG, настроены мониторинг и источник Grafana. В ecommerce загружены 11 связанных таблиц; целостность подтверждена первичными и внешними ключами. Выполнены четыре SQL-задания и построен дашборд из шести панелей. Полученные результаты показывают ведущие категории и способы оплаты, различия активности продавцов и снижение средней оценки при более длительной доставке.')
    add_questions(d)
    d.h('9 Источники и приложения')
    for text in [
        '1. Практическая работа №2 «Система хранения данных». Предоставленная методичка, разделы 5 и 6.',
        '2. Официальные бандлы и репозитории Arenadata: https://downloads.arenadata.io/bundles/; https://docs.arenadata.io/en/ADPG/current/get-started/online-install/adpg-install/cluster-creation.html. Дата обращения: 18.10.2026.',
        '3. Brazilian E-Commerce Public Dataset by Olist. Исходные CSV и их контрольные суммы сохранены в личном стенде; реестр source_inputs.json находится рядом с материалами подготовки данных.',
        '4. Приложения: Исходники/ПР2_Хранение — SQL, официальный манифест бандлов и команды повторного запуска; Результаты/Хранение — storage.json, adcm.json и снимки фактического выполнения.',
    ]:
        d.p(text)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    d.save(TARGET)
    print(TARGET)


if __name__ == '__main__':
    build()
