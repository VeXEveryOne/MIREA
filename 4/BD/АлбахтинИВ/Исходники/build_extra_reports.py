"""Build storage and Spark reports exclusively from the new guest evidence."""
from pathlib import Path
import importlib.util
import json
import sys

import build_reports as personal
from build_reports import AlbakhtinReport, BD, PACK, n, read_json, save

SPARK = PACK / 'Spark'
STORAGE = PACK / 'Результаты/Хранение'
spec = importlib.util.spec_from_file_location('spark_report_builder', BD / 'spark_lab/build_reports.py')
original = importlib.util.module_from_spec(spec)
spec.loader.exec_module(original)
original.LAB = SPARK

def questions(number):
    """Read questions from the common immutable methodological originals."""
    from docx import Document
    import re
    ps = [p.text for p in Document(BD / 'spark_lab/assignment' / f'Практика №{number}.docx').paragraphs]
    index = next(i for i,t in enumerate(ps) if 'Контрольные вопросы' in t)
    return [t for t in ps[index+1:] if re.match(r'^\d+\. ',t)][:16 if number == 3 else 30]

original.questions = questions

class VMReport(AlbakhtinReport):
    def __init__(self, number, topic):
        self.number = number
        super().__init__(number, topic)
    def save(self, path):
        save(self.doc, f'ТИАБД_ПР{self.number}_АлбахтинИВ')
    def figure(self, path, caption, width=16):
        if not path.exists() and path.with_suffix('.png').exists():
            path = path.with_suffix('.png')
        return super().figure(path, caption, width)

def environment_table(report, result):
    e = result['environment']
    report.table('Паспорт личной виртуальной машины', ['Параметр', 'Фактическое значение'], [
        ['VM', 'TIABD-Albakhtin-IV'], ['ОС', 'Ubuntu Server 22.04.5 LTS'],
        ['Ресурсы', '2 vCPU; 4 ГБ RAM; независимый VDI 40 ГБ'],
        ['Python', e['python']], ['Java', e['java']], ['Spark', e['spark']],
        ['Master / parallelism', f'{e["master"]} / {e["parallelism"]}'],
        ['Shuffle partitions / AQE', f'{e["shuffle_partitions"]} / {e["aqe"]}'],
    ], [5.5, 11])
    report.p('Работа выполнена в новой VM с отдельной установкой Ubuntu и пользователем albakhtin. Каждый ноутбук запущен полностью в новом ядре. Local[*] использует два виртуальных ядра одного узла; физическая сеть кластера в таком режиме не проверяется. Методичка рекомендует Python 3.11; системный Python 3.10 совместим с выбранными Spark 3.5.7 и JDK 17.')

def storage_report():
    from build_pr2_storage_report import build
    build()


def build4():
    r = read_json(SPARK / 'results/pr4.json')
    b = r['variant']
    c = r['cache']
    d = VMReport(4, 'Выполнение задач обработки данных\nв распределённых вычислениях')
    d.h('1 Цель и условия эксперимента')
    d.p('Исследованы ленивое вычисление, разделы данных, shuffle, стратегии JOIN, persist, повторные измерения и число выходных файлов. Основные опыты используют Olist; самостоятельный вариант B соединяет order_items и sellers и агрегирует по seller_state. Все времена и счётчики получены заново в личной VM.')
    d.h('2 Стенд и источники')
    environment_table(d, r)
    d.p('В основной серии AQE=false, SQL shuffle partitions=8, autoBroadcastJoinThreshold=-1 и driver memory=1536 МБ. Для каждого повторяемого опыта выполнен прогрев и три измерения; подготовка SQLite, CSV и Parquet исключена из измеряемых действий. Фоновые контейнеры и нагрузка хоста остаются ограничением.')
    d.table('Входные Parquet DataFrame', ['Таблица', 'Строки', 'Партиции'], [[name, n(x['rows']), x['partitions']] for name, x in r['inputs'].items()], [10, 4, 2.5])
    d.h('3 Ленивые вычисления')
    lazy = r['lazy']
    d.p(f'Списки Jobs до и после select/filter/withColumn пусты. После count появились Jobs {lazy["after_action"]}; получено {n(lazy["rows"])} строк за {n(lazy["seconds"],3)} с. Count может исключать вычисление неиспользуемого нового столбца, поэтому замер не описывает стоимость всех выражений цепочки.')
    d.table('Наиболее частые штаты geolocation', ['Штат', 'Строки', 'Доля %'], [[x['geolocation_state'], n(x['count']), n(x['count']/r['inputs']['geolocation']['rows']*100, 2)] for x in r['state_top']], [4, 7, 5.5])
    d.h('4 Repartition, coalesce и groupBy')
    d.p('Данные сначала разбиты на 16 разделов по штату, затем сведены к четырём. Repartition выполняет новое перераспределение, coalesce объединяет существующие разделы. Наличие Coalesce не отменяет исходный Exchange; структуру следует оценивать по всему физическому плану.')
    d.table('Фактическая нагрузка четырёх разделов', ['Способ', 'Минимум', 'Максимум', 'Среднее'], [[key, n(r['profiles'][key]['min']), n(r['profiles'][key]['max']), n(r['profiles'][key]['mean'],2)] for key in ['repartition4', 'coalesce4']], [5, 3.5, 4, 4])
    d.figure(SPARK / 'screenshots/pr4/09_partitions.png', 'Нагрузки разделов и журнал ленивого действия в новой VM', 16)
    d.p('Группировка по seller_id имеет частичную и финальную HashAggregate с Exchange между ними. Filter и Project являются локальными преобразованиями; Exchange меняет распределение. Sort добавляет сортировку, а запись и count инициируют выполнение.')
    names = [('groupby','GroupBy'), ('repartition4','Repartition 4'), ('coalesce4','Coalesce 4'), ('smj','SMJ'), ('bhj','BHJ'), ('persist_materialization','Материализация'), ('persist_repeat','Кэш действие')]
    d.table('Счётчики измеренных действий Spark UI', ['Опыт', 'Jobs', 'Stages', 'Tasks', 'Read КиБ', 'Write КиБ'], original.metric_rows(r['metrics'], names), [5, 1.5, 2, 2, 3, 3])
    d.h('5 Стратегии JOIN')
    d.p(f'Order_items и products соединены по product_id. Обе стратегии возвращают {n(r["joins"]["rows"])} строк. SMJ имеет распределение и сортировку по ключу; BHJ передаёт малую сторону через BroadcastExchange. Небольшой обмен финального count может сохраняться и при BHJ.')
    d.table('Первый count и медианы трёх повторений JOIN', ['Стратегия', 'Первый count с', 'Медиана с'], [[name.upper(), n(r['metrics'][name]['seconds'],3), n(r['joins']['medians'][name],3)] for name in ['smj','bhj']], [5, 5.5, 6])
    d.figure(SPARK / 'screenshots/pr4/02_smj_plan.png', 'Физический план Sort Merge Join живого приложения', 16)
    d.figure(SPARK / 'screenshots/pr4/03_bhj_plan.png', 'Физический план Broadcast Hash Join живого приложения', 16)
    d.h('6 Persist и полная стоимость повторного использования')
    no = sum(x['seconds'] for x in c['no_cache'])
    repeat = sum(x['seconds'] for x in c['cached'])
    total = repeat + c['materialization']['seconds']
    d.table('Стоимость двух действий', ['Вариант', 'Материализация с', 'Повторные действия с', 'Итого с'], [['Без кэша','—',n(no,3),n(no,3)], ['С кэшем',n(c['materialization']['seconds'],3),n(repeat,3),n(total,3)]], [4, 4, 4.5, 4])
    d.p(f'Использован MEMORY_AND_DISK. Контрольные суммы до и после persist совпадают с допуском 0,01. Повторные действия заняли {n(repeat,3)} с; полная стоимость с материализацией — {n(total,3)} с. Кэш {"окупился" if total < no else "не окупился"} за два действия в этой серии. После опыта выполнен unpersist(blocking=True).')
    d.figure(SPARK / 'screenshots/pr4/04_storage.png', 'Фактическая материализация кэша в Spark Storage', 16)
    d.h('7 Benchmark, shuffle partitions и файлы')
    d.p('Синтетический набор содержит 2 000 000 строк; key=id%1000, value=sqrt(id+1). Для p=1,2,4,8,16,32 выполнены по три замера после прогрева. Измеряется action с агрегацией, а не время построения DataFrame. Допуск контрольных сумм учитывает порядок сложения double.')
    d.table('Повторения синтетического benchmark', ['p','t1 с','t2 с','t3 с','Медиана с','T1/Tp'], [[x['p']]+[n(t,3) for t in x['times']]+[n(x['median'],3),n(x['speedup'],3)] for x in r['benchmark']], [1.5,3,3,3,3,3])
    best = min(r['benchmark'], key=lambda x:x['median'])
    d.p(f'Минимальная медиана этой серии получена при p={best["p"]}: {n(best["median"],3)} с. На двух vCPU рост числа разделов не гарантирует ускорения; результат нельзя переносить на большой физический кластер.')
    d.table('Отдельные одиночные опыты shuffle partitions', ['q','Группы','Время с'], [[x['q'],x['groups'],n(x['seconds'],3)] for x in r['shuffle_q']], [4,6,6.5])
    d.table('Фактические выходные Parquet файлы', ['p','Файлы','Объём МиБ','Средний КиБ'], [[x['p'],x['files'],n(x['total_mib'],3),n(x['mean_kib'],3)] for x in r['small_files']], [4,3,4.5,5])
    d.p(f'Запись действительно создаёт part-файлы; их число и размеры измерены после завершения write. При AQE=true исходные 32 shuffle partitions дали {r["aqe"]["groups"]} групп и {r["aqe"]["output_partitions"]} выходную партицию; итоговый план содержит адаптивное объединение разделов. После опыта базовая конфигурация восстановлена.')
    d.figure(SPARK / 'screenshots/pr4/10_benchmark.png', 'Новые замеры и размеры Parquet файлов в консоли VM', 16)
    d.h('8 Самостоятельный вариант B')
    d.p('Связка order_items–sellers исследуется отдельно от основной связки items–products. Select, filter(price>0) и withColumn(gross) описывают план. После action выполняется JOIN по seller_id, затем группировка по seller_state с подсчётом позиций и суммой цены с доставкой.')
    d.table('Первые штаты продавцов по gross', ['Штат','Позиции','Цена с доставкой'], [[x['seller_state'],n(x['lines']),n(x['gross'],2)] for x in b['groups'][:5]], [4,5,7.5])
    d.table('Распределение самостоятельных четырёх партиций', ['Способ','Минимум','Максимум','Среднее'], [[name,n(x['min']),n(x['max']),n(x['mean'],2)] for name,x in b['profiles'].items()], [5,3.5,4,4])
    d.table('Стратегии JOIN самостоятельной части', ['Стратегия','Время с','Stages','Tasks','Shuffle КиБ'], [[name.upper(),n(b[name]['seconds'],3),len(b[name]['stages']),b[name]['tasks'],n(b[name]['shuffle_read']/1024,2)] for name in ['smj','bhj']], [3,3.5,3,3,4])
    bc = b['cache']
    without = sum(bc['without']); cached = sum(bc['cached']); full = cached + bc['materialization']
    d.p(f'Два действия без кэша заняли {n(without,3)} с, материализация — {n(bc["materialization"],3)} с, повторные действия — {n(cached,3)} с. Общая стоимость с кэшем {n(full,3)} с; он {"окупился" if full < without else "не окупился"} за эти два действия.')
    d.table('Три повторения для p самостоятельной части', ['p','t1 с','t2 с','t3 с','Медиана с'], [[x['p']]+[n(t,3) for t in x['times']]+[n(x['median'],3)] for x in b['benchmark']], [2,3.5,3.5,3.5,4])
    d.table('Запись самостоятельного агрегата', ['Партиции','Файлы','Объём МиБ'], [[x['p'],x['files'],n(x['total_mib'],4)] for x in b['files']], [5,5,6.5])
    d.figure(SPARK / 'screenshots/pr4/05_variant_storage.png', 'Кэш самостоятельного варианта B в живом Storage UI', 16)
    d.figure(SPARK / 'screenshots/pr4/06_variant_plan.png', 'План самостоятельного JOIN по seller_id', 16)
    d.figure(SPARK / 'screenshots/pr4/07_variant_stages.png', 'Фактически завершённые стадии самостоятельного варианта B', 16)
    d.h('9 Выводы и ограничения')
    for text in [
        '1. Transformations описывают вычисления; Jobs появляются после action, что подтверждено отдельными журналами основной и самостоятельной серий.',
        '2. Число входных разделов и SQL shuffle partitions различается; задачи следует связывать со стадиями физического плана.',
        '3. Repartition изменяет размещение строк через Exchange, coalesce сохраняет особенности исходной нагрузки. Одинаковое число разделов не означает равномерность.',
        '4. SMJ и BHJ сохранили количество фактов; изменение стратегии меняет сортировку, передачу справочника и обмен по ключу.',
        '5. Пользу persist следует оценивать с учётом заполнения кэша и всех повторных действий; отдельный быстрый повтор недостаточен для вывода об окупаемости.',
        '6. Медианы трёх повторов зависят от p, прогрева и ресурсов VM; рост числа разделов не является универсальным ускорением.',
        '7. В варианте B справочник sellers покрывает факты order_items. Группировка описывает штат продавца и не подменяет его штатом покупателя.',
        '8. Вариант B повторяет ленивые операции, repartition/coalesce, обе стратегии JOIN, persist, четыре значения p и запись с двумя размерами разбиения.',
        '9. Число и размеры part-файлов подтверждены файловой системой после write; coalesce(1) ограничивает параллелизм и требует обоснования размером результата.',
        'Ограничения: локальная VM, два vCPU, короткие измерения, прогрев JVM и файловый кэш. Медиана уменьшает влияние выбросов, но не исключает фоновые процессы и не моделирует сеть промышленного кластера.',
    ]: d.p(text)
    d.questions(original.questions(4), original.ANSWERS4)
    d.h('Источники и приложения')
    d.p('Предоставленная методичка практики №4. Новые Practice_4.ipynb, results/pr4.json, снимки REST API, физические планы и агрегаты Parquet приложены в личном каталоге Spark. Apache Spark 3.5.7: https://spark.apache.org/docs/3.5.7/monitoring.html и https://spark.apache.org/docs/3.5.7/tuning.html.')
    d.save(None)

if __name__ == '__main__':
    execution = read_json(PACK / 'Результаты/execution.json')
    assert len(execution['notebooks']) == 4 and all(x['errors'] == 0 for x in execution['notebooks'])
    assert execution['hostname'] == 'tiabd-albakhtin-iv'
    original.Report = VMReport
    original.environment_table = environment_table
    from build_pr3_report import build as build3
    storage_report(); build3(); build4()
