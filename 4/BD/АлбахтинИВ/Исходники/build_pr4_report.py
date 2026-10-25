"""Build only PR4, using the completed notebook and verified experiment records."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import hashlib
import json
import re
import sys
from docx.oxml.ns import qn

from build_pr3_report import PR3Report, add_toc

PACK = Path(__file__).resolve().parents[1]
BD = PACK.parent
LAB = PACK/'Spark'


def read(name):
    return json.loads((LAB/'results'/name).read_text(encoding='utf-8'))


def n(value, digits=0):
    return f'{value:,.{digits}f}'.replace(',', ' ').replace('.', ',')


class PR4Report(PR3Report):
    def save(self, path=None):
        add_toc(self.doc)
        # Normalize template paragraph-mark fonts as well as visible runs.
        for fonts in self.doc.element.xpath('.//w:rFonts'):
            for key in list(fonts.attrib):
                if 'Theme' in key:
                    del fonts.attrib[key]
            for kind in ['ascii','hAnsi','eastAsia','cs']:
                fonts.set(qn('w:'+kind),'Times New Roman')
        self.doc.core_properties.title = 'Практическая работа 4 Выполнение задач обработки данных в распределённых вычислениях'
        self.doc.save(BD/'ТИАБД_ПР4_АлбахтинИВ.docx')


def build():
    reference = BD.parents[1]/'4/ИСУРО/ИСУРО_1_АлбахтинИВ.docx'
    assert hashlib.sha256(reference.read_bytes()).hexdigest() == '53a4b8ccc73cf44599e8b7c7fb75045afec85dd7f4b0a079b19a0d4ccb5249b1'
    r, run, checked = read('pr4.json'), read('pr4_execution.json'), read('pr4_data_verification.json')
    assert checked['status'] == run['status'] == 'passed' and run['errors'] == 0
    assert run['notebook_sha256'] == hashlib.sha256((LAB/'Practice_4.ipynb').read_bytes()).hexdigest()
    b, c = r['variant'], r['cache']
    d = PR4Report(4, 'Выполнение задач обработки данных\nв распределённых вычислениях')
    d.h('1 Цель и постановка экспериментов')
    d.p('Цель работы — исследовать физическое выполнение преобразований Spark: ленивые вычисления, партиции и задачи, shuffle, стратегии JOIN, сохранение промежуточного результата, повторные измерения и создание part-файлов. Учебные опыты выполняются на Olist; самостоятельный вариант B использует order_items и sellers с группировкой по seller_state.')
    completed = datetime.fromisoformat(run['completed_utc']).astimezone(timezone(timedelta(hours=3)))
    d.p(f'Полный Run All после запуска нового ядра завершён {completed:%d.%m.%Y %H:%M:%S} МСК. Последовательно выполнены {run["code_cells"]} кодовых ячеек, ошибок {run["errors"]}; длительность с автоматическим сохранением Spark UI — {n(run["seconds"],2)} с. В последней ячейке выполнен spark.stop().')
    d.h('2 Стенд и данные')
    e = r['environment']
    d.table('Паспорт экспериментального стенда', ['Параметр','Значение'], [
        ['VM / ОС','TIABD-Albakhtin-IV / Ubuntu Server 22.04.5 LTS'],
        ['CPU / память','2 vCPU / 4 ГБ RAM'], ['Python / Spark',f'{e["python"]} / {e["spark"]}'],
        ['Java',e['java']], ['Master / parallelism',f'{e["master"]} / {e["parallelism"]}'],
        ['Driver memory',e['driver_memory']], ['Shuffle partitions / AQE',f'{e["shuffle_partitions"]} / {e["aqe"]}'],
        ['Auto broadcast threshold',e['autobroadcast']]], [5.5,11])
    d.p('Методичка использует Python 3.11; на стенде применяется совместимый с Spark 3.5.7 Python 3.10.12 и JDK 17. Local[*] сохраняет модель распределённых данных, но выполняет задачи на одном узле. Подготовка SQLite, выгрузка CSV и запись исходного Parquet исключены из измерений. Сравниваемые варианты выполняются в одной SparkSession.')
    d.p('Ecommerce.sqlite восстановлена из исходных CSV Olist предыдущей практики. Исходный файл SQLite примера не предоставлялся. Восстановленная база содержит 100 000 отзывов вместо 97 621 в примере ПР3; отзывы в опытах ПР4 не используются. Для всех пяти используемых таблиц число строк совпало с методичкой. Справочники products и sellers проверены на уникальность ключей и отсутствие несопоставленных позиций заказа.')
    d.table('Входные DataFrame из Parquet', ['Таблица','Строки','Партиции'],
            [[name,n(x['rows']),x['partitions']] for name,x in r['inputs'].items()], [10,4,2.5])
    d.h('3 Ленивое выполнение и входное разбиение')
    d.code('prepared = (geo.select("geolocation_state", "geolocation_lat")\n    .filter(F.col("geolocation_state").isNotNull())\n    .withColumn("abs_lat", F.abs("geolocation_lat")))\nrows = prepared.count()')
    lazy = r['lazy']
    d.p(f'До создания цепочки и после transformations список Jobs группы пуст: {lazy["before"]} и {lazy["after_transform"]}. После count появились Jobs {lazy["after_action"]}; получено {n(lazy["rows"])} строк за {n(lazy["seconds"],3)} с. Это подтверждает отложенное выполнение. Count не использует abs_lat, поэтому оптимизатор вправе исключить вычисление этого поля; время не трактуется как стоимость всех выражений цепочки.')
    d.table('Распределение входных партиций geolocation', ['Раздел','Строки'],
            [[x['pid'],n(x['count'])] for x in r['input_profile']['sizes']], [5,11.5])
    d.table('Наиболее частые штаты', ['Штат','Строки','Доля %'],
            [[x['geolocation_state'],n(x['count']),n(x['count']/1000163*100,2)] for x in r['state_top']], [4,7,5.5])
    d.h('4 Repartition, coalesce и shuffle')
    d.p('Сначала geolocation разбита на 16 партиций по geolocation_state, затем число разделов уменьшено до четырёх двумя способами. В профиле явно учитываются все разделы, включая пустые: среднее равно числу строк, делённому на полное число партиций. RoundRobin repartition перераспределяет строки; coalesce объединяет существующие разделы и сохраняет часть перекоса.')
    d.table('Нагрузка разделов после переразбиения', ['Способ','Разделы','Минимум','Максимум','Среднее'],
            [[name,x['partitions'],n(x['min']),n(x['max']),n(x['mean'],2)] for name,x in r['profiles'].items()], [4.5,2,3,3.5,3.5])
    d.code('skewed16 = geo.repartition(16, "geolocation_state")\nrepart4 = skewed16.repartition(4)\ncoal4 = skewed16.coalesce(4)\n# План: Exchange RoundRobinPartitioning(4) либо Coalesce 4')
    d.p('Coalesce не добавляет новый полный shuffle, но не отменяет исходный Exchange, создавший skewed16. Поэтому ненулевые Shuffle Read/Write у всего действия coalesce не противоречат устройству этого оператора. В seller_stats частичная HashAggregate уменьшает данные до Exchange hashpartitioning(seller_id, 8), затем выполняется финальная агрегация.')
    d.table('Пять продавцов по сумме price', ['seller_id','Позиций','Выручка R$','Средняя R$'],
            [[x['seller_id'][:8],n(x['items']),n(x['revenue'],2),n(x['avg_price'],2)] for x in r['seller_top']], [4,3,5,4.5])
    d.p('В таблице показаны первые восемь символов seller_id; полные ключи сохранены в результатах. Scan читает Parquet, Filter отбирает price ≥ 100, Project формирует gross, Exchange меняет распределение, HashAggregate завершает агрегацию. Эти операторы выделены также в отдельном плане operator_demo.txt.')
    names = [('groupby','GroupBy'),('repartition4','Repartition'),('coalesce4','Coalesce'),
             ('smj','SMJ'),('bhj','BHJ'),('persist_materialization','Заполнение кэша'),('persist_repeat','Повтор из кэша')]
    d.table('Журнал выполненных действий Spark UI', ['Опыт','Jobs','Stages','Tasks','Read КиБ','Write КиБ'],
            [[label,len(r['metrics'][key]['jobs']),len(r['metrics'][key]['stages']),r['metrics'][key]['tasks'],
              n(r['metrics'][key]['shuffle_read']/1024,2),n(r['metrics'][key]['shuffle_write']/1024,2)] for key,label in names], [4.5,1.6,1.9,1.9,3.3,3.3])
    gm = r['metrics']['groupby']
    d.p('Для измеренного groupBy стадии и число задач: '+ '; '.join(f'{x["stageId"]}: {x["numCompleteTasks"]}' for x in sorted(gm['stage_metrics'], key=lambda x:x['stageId']))+'. Суммы счётчиков независимым скриптом сопоставлены с сохранённым REST API; номер стадии относится только к текущему приложению.')
    d.h('5 Сравнение стратегий JOIN')
    d.p(f'Один INNER JOIN order_items–products по product_id выполнен как SMJ и BHJ. Оба результата содержат {n(r["joins"]["rows"])} строк. Проверки ключей исключили размножение фактов и потерю несовпавших позиций. SMJ использует распределение по ключу и сортировку, BHJ — BroadcastExchange справочника и BroadcastHashJoin.')
    d.code('smj = items.hint("merge").join(\n    products.hint("merge"), "product_id", "inner")\nbhj = items.join(F.broadcast(products), "product_id", "inner")')
    d.table('Повторные измерения JOIN', ['Стратегия','Первый с','t1 с','t2 с','t3 с','Медиана с'],
            [[key.upper(),n(r['metrics'][key]['seconds'],3)]+[n(t,3) for t in r['joins']['runs'][key]]+[n(r['joins']['medians'][key],3)] for key in ['smj','bhj']], [2.8,2.7,2.7,2.7,2.7,2.9])
    d.p('Небольшой shuffle финального count может сохраняться и у BHJ; он не равен перераспределению большой стороны по product_id. Поэтому сравнение учитывает вид Exchange в плане. Скриншоты ниже показывают фрагменты SQL/DataFrame запросов с узлами JOIN; полные текстовые планы сохранены отдельно.')
    d.figure(LAB/'screenshots/pr4/02_smj_plan.png','SQL/DataFrame: узел SortMergeJoin выполненного запроса',16.5)
    d.figure(LAB/'screenshots/pr4/03_bhj_plan.png','SQL/DataFrame запроса BHJ с передачей справочника',16.5)
    d.h('6 Persist и стоимость повторного использования')
    d.p('Промежуточный DataFrame объединяет позиции, категории и продавцов; gross_value = price + freight_value. Использован persist(StorageLevel.MEMORY_AND_DISK). Два действия суммируют gross_value по категории и по штату с последующим получением контрольной суммы. Это заставляет вычислить используемые значения, а не только число строк.')
    d.table('Материализация и два одинаковых действия', ['Вариант','Заполнение с','Action 1 с','Action 2 с','Всего с'],
            [['Без persist','—',*[n(x['seconds'],3) for x in c['no_cache']],n(sum(x['seconds'] for x in c['no_cache']),3)],
             ['С persist',n(c['materialization']['seconds'],3),*[n(x['seconds'],3) for x in c['cached']],n(c['materialization']['seconds']+sum(x['seconds'] for x in c['cached']),3)]], [4.4,3.3,3,3,2.8])
    no = sum(x['seconds'] for x in c['no_cache']); full = c['materialization']['seconds']+sum(x['seconds'] for x in c['cached'])
    d.p(f'С материализацией кэш {"окупился" if full < no else "не окупился"} за два действия: {n(full,3)} с против {n(no,3)} с. Все четыре контрольные суммы совпадают с независимой суммой SQLite {n(checked["gross_checksum"],2)} с допуском 0,01. После unpersist(blocking=True) is_cached=false, список сохранённых блоков Storage пуст.')
    d.figure(LAB/'screenshots/pr4/04_storage.png','Материализованный MEMORY_AND_DISK до unpersist',16.5)
    d.h('7 Benchmark, shuffle partitions и small files')
    d.p('N=2 000 000, key=id%1000, value=sqrt(id+1). После общего прогрева для p=1,2,4,8,16,32 выполнены по три измерения в одной сессии при shuffle.partitions=8. Action вычисляет сумму агрегированных значений; все контрольные суммы проверены через независимый math.fsum с учётом точности double.')
    d.table('Влияние входного p на время', ['p','t1 с','t2 с','t3 с','Медиана с','T1/Tp'],
            [[x['p']]+[n(t,3) for t in x['times']]+[n(x['median'],3),n(x['speedup'],3)] for x in r['benchmark']], [1.5,3,3,3,3,3])
    best = min(r['benchmark'],key=lambda x:x['median'])
    d.p(f'Наименьшая медиана серии получена при p={best["p"]}: {n(best["median"],3)} с. Показатель T1/Tp описывает изменение числа разделов на том же узле, а не ускорение от добавления физических узлов.')
    d.table('Отдельный опыт с числом shuffle partitions', ['q','Группы','Время с'],
            [[x['q'],x['groups'],n(x['seconds'],3)] for x in r['shuffle_q']], [4,6,6.5])
    d.p('В этом дополнительном опыте вход зафиксирован на восьми разделах. Изменяется q, а не число строк и не число CPU. Одиночные измерения q не используются для устойчивого рейтинга производительности.')
    d.table('Запись order_items в Parquet', ['p','part-файлы','Объём МиБ','Средний КиБ'],
            [[x['p'],x['files'],n(x['total_mib'],3),n(x['mean_kib'],3)] for x in r['small_files']], [3,3,5,5.5])
    d.p(f'Количество и размеры part-файлов сверены с файловой системой. Coalesce(1) отдельно создаёт один раздел записи и ограничивает её параллелизм. Дополнительное включение AQE для группировки geolocation дало {r["aqe"]["groups"]} групп и {r["aqe"]["output_partitions"]} выходную партицию при исходной настройке 32. Итоговый план содержит AdaptiveSparkPlan; после опыта восстановлены AQE=false и shuffle.partitions=8.')
    d.h('8 Самостоятельный вариант B')
    d.p(f'Из Parquet прочитаны {n(b["inputs"]["items"]["rows"])} позиций и {n(b["inputs"]["sellers"]["rows"])} продавцов; исходное число партиций — {b["inputs"]["items"]["partitions"]} и {b["inputs"]["sellers"]["partitions"]}. Select, filter(price>0) и withColumn(gross) не создали Jobs до Action. После действия появилась группа Jobs {b["lazy"]["after_action"]}. Обе стратегии JOIN по seller_id сохранили {n(b["join_rows"])} строк.')
    d.table('Агрегация по штату продавца', ['Штат','Позиции','Цена с доставкой R$'],
            [[x['seller_state'],n(x['lines']),n(x['gross'],2)] for x in b['groups'][:5]], [4,5,7.5])
    d.p(f'Все {len(b["groups"])} групп независимо совпали с SQLite. Штат относится к продавцу, а не покупателю. GroupBy варианта B выполнил {b["groupby"]["tasks"]} задач, Shuffle Read/Write — {n(b["groupby"]["shuffle_read"]/1024,2)}/{n(b["groupby"]["shuffle_write"]/1024,2)} КиБ. План включает BroadcastHashJoin и Exchange по seller_state.')
    d.table('Баланс четырёх разделов варианта B', ['Способ','Минимум','Максимум','Среднее'],
            [[key,n(x['min']),n(x['max']),n(x['mean'],2)] for key,x in b['profiles'].items()], [5,3.5,4,4])
    d.table('JOIN самостоятельной части', ['Стратегия','Время с','Stages','Tasks','Read/Write КиБ'],
            [[key.upper(),n(b[key]['seconds'],3),len(b[key]['stages']),b[key]['tasks'],f'{n(b[key]["shuffle_read"]/1024,2)}/{n(b[key]["shuffle_write"]/1024,2)}'] for key in ['smj','bhj']], [3,3,2,2,6.5])
    bc=b['cache']; without=sum(bc['without']); cached=sum(bc['cached']); full_b=cached+bc['materialization']
    d.table('Два действия самостоятельной части', ['Вариант','Заполнение с','Action 1 с','Action 2 с','Всего с'],
            [['Без persist','—',*[n(t,3) for t in bc['without']],n(without,3)],
             ['С persist',n(bc['materialization'],3),*[n(t,3) for t in bc['cached']],n(full_b,3)]], [4.4,3.3,3,3,2.8])
    d.p(f'Контрольные суммы двух группировок до и после кэша совпали с SQLite. Кэш {"окупился" if full_b < without else "не окупился"} за эти два действия с учётом материализации. После unpersist сохранённые блоки удалены.')
    d.table('Прогрев и три повтора для четырёх p', ['p','t1 с','t2 с','t3 с','Медиана с'],
            [[x['p']]+[n(t,3) for t in x['times']]+[n(x['median'],3)] for x in b['benchmark']], [2,3.5,3.5,3.5,4])
    d.table('Две записи итогового агрегата', ['p','Файлы','Объём КиБ'],
            [[x['p'],x['files'],n(x['total_mib']*1024,3)] for x in b['files']], [4,4,8.5])
    d.figure(LAB/'screenshots/pr4/05_variant_storage.png','Storage самостоятельного варианта B до освобождения блоков',16.5)
    d.figure(LAB/'screenshots/pr4/06_variant_plan.png','SQL/DataFrame самостоятельного соединения с sellers',16.5)
    d.figure(LAB/'screenshots/pr4/07_variant_stages.png','Завершённые стадии и задачи самостоятельного варианта B',16.5)
    d.h('8.1 Экспериментальные выводы варианта B',2)
    best_b=min(b['benchmark'],key=lambda x:x['median'])
    for text in [
        f'1. Цепочка из трёх transformations не создала Job до Action; после действия обработано {n(b["lazy"]["rows"])} строк.',
        f'2. После repartition(4) максимум нагрузки равен {n(b["profiles"]["repartition"]["max"])} строк, после coalesce(4) — {n(b["profiles"]["coalesce"]["max"])}. Баланс зависит от способа распределения, а не только от числа разделов.',
        f'3. Обе стратегии JOIN дали {n(b["join_rows"])} строк. SMJ использовал сортировку и shuffle, BHJ — передачу справочника sellers. Времена относятся к одиночным действиям данного опыта.',
        f'4. Полная стоимость кэша для двух действий составила {n(full_b,3)} с против {n(without,3)} с без кэша; цена материализации учитывается отдельно.',
        f'5. Среди четырёх проверенных p наименьшая медиана получена при p={best_b["p"]}: {n(best_b["median"],3)} с. Это наблюдение для текущей связки и ресурсов VM.',
        '6. При записи агрегата с одним и четырьмя разделами получены соответственно один и четыре part-файла; итоговый набор строк не изменился.']:
        d.p(text)
    d.p('Ограничения самостоятельного опыта: небольшой справочник и агрегат не воспроизводят память и сетевые затраты крупного кластера; короткие действия на двух vCPU чувствительны к прогреву JVM, файловому кэшу и фоновой нагрузке. Одиночные измерения JOIN не заменяют повторную серию для устойчивого вывода о скорости.')
    d.h('9 Общие выводы и воспроизводимость')
    for text in [
        '1. Transformations строят план; Action запускает необходимое выполнение, что подтверждено журналами обеих серий.',
        '2. Входные партиции, shuffle partitions и CPU — разные сущности. Число задач меняется между стадиями одного Job.',
        '3. GroupBy содержит частичную и финальную агрегацию с Exchange; счётчики UI показывают фактический обмен.',
        '4. Repartition перераспределяет строки, coalesce объединяет разделы; одинаковое выходное p не гарантирует одинаковый баланс.',
        '5. SMJ и BHJ сохранили логический результат и использовали разные механизмы передачи и сортировки данных.',
        '6. Persist оценивается вместе с материализацией; освобождение блоков подтверждено после unpersist.',
        '7. Медианы трёх повторов не дают универсального правила о лучшем p. На локальном узле накладные расходы могут перекрыть выгоду дополнительных задач.',
        '8. Число и размер part-файлов измерены после write. Число разделов для вычисления и для сохранения результата выбирается по разным ограничениям.',
        '9. AQE изменил фактическое выходное разбиение после получения статистики; основной опыт выполнен с AQE=false для контроля условий.']:
        d.p(text)
    d.p('Ограничения общей серии: два vCPU одной VM не моделируют физическую сеть кластера; состояние JVM, файлового кэша и хоста влияет на короткие измерения. Относительное ускорение по числу партиций не является оценкой масштабирования по серверам.')
    d.code('cd /home/albakhtin/tiabd/АлбахтинИВ/Spark\n/home/albakhtin/tiabd/.venv/bin/python run_pr4.py\n/home/albakhtin/tiabd/.venv/bin/python verify_pr4_data.py')
    d.p('Notebook, протокол Run All, JSON измерений, полные планы, REST API, снимки UI и итоговый агрегат сохранены в личном каталоге Spark. Снимки получены автоматически между опытами до spark.stop(); время их создания не включено в отдельные замеры действий.')
    text=(BD/'ТИАБД_ПР4_Ответы.md').read_text(encoding='utf-8').split('## II Лекция 4')[0]
    blocks=re.findall(r'(?ms)^(\d+)\. \*\*(.*?)\*\*\s*\n(.*?)(?=^\d+\. \*\*|\Z)',text)
    assert len(blocks)==30
    d.questions([f'{i}. {q}' for i,q,_ in blocks],
                [re.sub(r'\s+',' ',a.strip().split('\n\n')[0]).replace('`','') for _,_,a in blocks])
    d.h('Источники').paragraph_format.page_break_before = True
    for text in ['1. Практическая работа №4. Выполнение задач обработки данных в распределённых вычислениях. Предоставленная методичка.',
                 '2. Olist: восстановленная ecommerce.sqlite и исходные CSV предыдущих практик; контрольные суммы в source_manifest.json.',
                 '3. Apache Spark 3.5.7. Monitoring and Instrumentation. https://spark.apache.org/docs/3.5.7/monitoring.html',
                 '4. Apache Spark 3.5.7. SQL Performance Tuning. https://spark.apache.org/docs/3.5.7/sql-performance-tuning.html']:
        d.p(text)
    d.save()
    print('PR4 DOCX built from verified Run All')


if __name__ == '__main__':
    build()
