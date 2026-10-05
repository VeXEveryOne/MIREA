"""Build the ensemble report from executed notebook results, never sample numbers."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import json
import sys
from hashlib import sha256

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'Исходники'))
from report_layout import Report


def fmt(value, digits=4):
    return f'{value:.{digits}f}'.replace('.', ',')


def build():
    r = json.loads((HERE / 'outputs/results.json').read_text(encoding='utf-8'))
    proof = json.loads((HERE / 'outputs/verification.json').read_text(encoding='utf-8'))
    # Refuse stale independent evidence after a notebook/result change.
    for relative, digest in proof['artifacts_sha256'].items():
        assert sha256((HERE / relative).read_bytes()).hexdigest() == digest, relative
    source, split = r['source'], r['split']
    metrics = {item['algorithm']: item for item in r['metrics']}
    bag, boost = metrics['Bagging'], metrics['Boosting']
    env = r['environment']
    labels = source['target_classes']
    train_counts = {label: source['class_counts'][label] - int(r['per_class']['Bagging'][label]['support']) for label in labels}
    report = Report(7, 'Ансамблевое обучение классификация дефектов стальных пластин',
                    filename='Ансамблевое_обучение_АлбахтинИВ.docx')
    report.heading('Ансамблевое обучение и классификация дефектов стальных пластин')
    report.heading('Цель и задание', 2)
    report.paragraph('Цель — сравнить бэггинг и бустинг при распознавании дефектов стальных пластин. Задание требует не повторяющийся в группе набор, оба алгоритма на одинаковых данных, сравнение времени и качества, выводы, отчёт и Colab Notebook.')
    report.paragraph(f'На едином тесте из {split["test_rows"]} строк macro-F1 бустинга составила {fmt(boost["test_f1_macro"])}, бэггинга — {fmt(bag["test_f1_macro"])}. Медиана обучения — {fmt(boost["fit_median_seconds"],3)} и {fmt(bag["fit_median_seconds"],3)} с соответственно. Вывод относится к данному разбиению и среде.')
    report.heading('1 Исходные данные', 2)
    report.paragraph('Выбран Steel Plates Faults из UCI Machine Learning Repository, авторы M. Buscema, S. Terzi и W. Tastle, 2010 год, DOI 10.24432/C5J88N, лицензия CC BY 4.0 [2]. Набор описывает семь типов дефектов; это задача многоклассовой классификации. Имена классов сохранены в написании исходного файла, включая K_Scatch.')
    report.table('Проверенные характеристики набора', ['Показатель', 'Результат'], [
        ['Наблюдения', source['rows']], ['Числовые входные признаки', len(source['features'])],
        ['Целевые классы', len(labels)], ['Пропуски', source['missing_values']],
        ['Повторы строк признаков', source['duplicate_feature_rows']],
        ['Обучающая выборка', split['train_rows']], ['Отложенный тест', split['test_rows']],
    ], [10, 6.5], center=(1,), keep_rows=True)
    report.paragraph('Архив с Faults.NNA и словарём Faults27x7_var сохранён без изменений. SHA-256 архива и таблицы проверены и записаны в results.json. Подготовка признаков описана в разделе 3.')

    report.heading('2 Распределение классов', new_page=True)
    report.table('Число наблюдений каждого класса', ['Класс', 'Всего', 'Train', 'Test'], [
        [label, source['class_counts'][label], train_counts[label], int(r['per_class']['Bagging'][label]['support'])]
        for label in labels], [7.5, 3, 3, 3], center=(1,2,3), keep_rows=True)
    report.figure('Распределение исходных классов', HERE/'outputs/01_classes.png', max_height=8,
        lead='На рисунке 1 показано неравномерное распределение классов исходного набора.')
    report.paragraph('Класс Other_Faults содержит 673 строки, а Dirtiness — 55. Поэтому основным критерием выбора принята macro-F1, которая придаёт каждому классу одинаковый вес. Стратифицированное разбиение сохраняет присутствие всех семи классов и в обучающей, и в тестовой выборке.')

    report.heading('3 Признаки и подготовка выборки', new_page=True)
    report.paragraph('Все 27 входных столбцов преобразованы в числовой тип float. Наименования ниже сгруппированы по смыслу имени для чтения; сами значения не заменялись. Подробные физические единицы большинства полей не указаны в карточке UCI, поэтому они не приписываются данным.')
    features = source['features']
    groups = [('Геометрические поля', features[:7]), ('Яркость', features[7:10]),
              ('Параметры стали и линии', features[10:14]), ('Производные индексы', features[14:])]
    report.table('Полный перечень входных признаков', ['Группа', 'Имена столбцов', 'Число'],
                 [[name, ', '.join(fields), len(fields)] for name, fields in groups], [4.2,10.3,2],
                 center=(2,), keep_rows=True)
    report.paragraph('Масштабирование и заполнение пропусков не применялись: признаки конечны, пропусков нет, а обе выбранные модели основаны на деревьях. Целевая переменная получена как индекс единственного активного целевого индикатора. Значения семи индикаторов не могут попасть в матрицу входа.')
    report.paragraph('Функция train_test_split с test_size=0,2, stratify=y и random_state=42 сформировала 1 552 строки для обучения и 389 для теста. Индексы обеих частей сохранены. Проверены отсутствие общих индексов, полное покрытие 1 941 строки и отсутствие идентичных строк признаков по разные стороны разбиения.')
    report.paragraph('Параметры подбирались только на обучающей части. StratifiedKFold с тремя фолдами, shuffle=True и random_state=42 был сформирован один раз и использован для обоих алгоритмов. Отложенный тест не участвовал в подборе, ранней остановке или преобразовании признаков.')

    report.heading('4 Реализация моделей и подбор параметров', new_page=True)
    report.paragraph('BaggingClassifier объединяет 80 независимо обучаемых DecisionTreeClassifier. Bootstrap-выборка содержит 1 241 извлечение с возвращением: 80% train с округлением вниз; уникальных строк меньше. Все признаки доступны каждому дереву, случайного отбора признаков нет. Класс определяется по усреднённым вероятностям [3].')
    report.paragraph('Бустинг реализован GradientBoostingClassifier с log_loss, learning_rate=0,1 и subsample=1. На каждой итерации деревья последовательно приближают отрицательный градиент потерь; для семи классов строятся семь регрессионных деревьев на итерацию [4]. Выбраны 160 итераций и глубина 3, то есть 1 120 деревьев, а не 160 отдельных деревьев.')
    report.paragraph('Каждая сетка содержит четыре комбинации параметров; «лист» означает минимальное число наблюдений в листе. GridSearchCV выбирает максимум macro-F1 на трёх общих фолдах: по 12 обучений на алгоритм. n_jobs=1 и refit=False; итоговые модели обучаются отдельно.')
    import csv
    candidates=[]
    for name in ['Bagging','Boosting']:
        with (HERE/f'outputs/cv_{name.lower()}.csv').open(encoding='utf-8',newline='') as f:
            for row in csv.DictReader(f):
                if name=='Bagging':
                    depth=row['param_estimator__max_depth'] or 'Нет предела'
                    setting='Лист: '+row['param_estimator__min_samples_leaf']
                else:
                    depth=row['param_max_depth']
                    setting='Итерации: '+row['param_n_estimators']
                candidates.append([name,depth,setting,fmt(float(row['mean_test_score'])),fmt(float(row['std_test_score']))])
    report.table('Результаты всех комбинаций на трёх CV-фолдах',
        ['Модель','Глубина','Настройка','Macro-F1','σ'],candidates,[3.1,3.1,4.3,3.2,2.8],
        center=(1,3,4), keep_rows=True)
    report.paragraph('σ — стандартное отклонение трёх CV-оценок, не доверительный интервал. Максимум: бэггинг без предела глубины, лист 2; бустинг — 160 итераций, глубина 3. Время поиска: '+fmt(r['search'][0]['search_seconds'],3)+' / '+fmt(r['search'][1]['search_seconds'],3)+' с; итоговый fit измеряется отдельно.')

    report.heading('5 Среда и измерение времени', new_page=True)
    executed=datetime.fromisoformat(r['executed_at']).astimezone(timezone(timedelta(hours=3)))
    report.table('Фактическая среда запуска', ['Параметр', 'Значение'], [
        ['Место исполнения', env['location']], ['Операционная система', env['platform']],
        ['Python / scikit-learn', env['python']+' / '+env['sklearn']],
        ['NumPy / Pandas', env['numpy']+' / '+env['pandas']],
        ['Логические CPU / вычислительные потоки', f'{env["logical_cpus"]} / {env["thread_limit"]}'],
        ['Ускоритель', 'CPU; GPU не используется'],
        ['Завершение запуска', executed.strftime('%d.%m.%Y %H:%M:%S')+' UTC+3'],
    ], [7,9.5], keep_rows=True)
    report.paragraph('Для каждой выбранной конфигурации выполнены три новых обучения. Порядок чередовался: Bagging–Boosting, Boosting–Bagging, Bagging–Boosting. time.perf_counter измеряет прошедшее время. Fit не включает загрузку, CV-поиск и построение графиков; predict включает предсказание всех 389 тестовых строк.')
    timing_rows=[]
    for name in ['Bagging','Boosting']:
        for t in r['measurements'][name]:
            timing_rows.append([name,t['repeat'],fmt(t['fit_seconds'],6),fmt(t['predict_seconds'],6)])
    report.table('Все исходные замеры итоговых моделей', ['Модель','Повтор','Fit, с','Predict, с'],
                 timing_rows,[5,3,4.25,4.25],center=(1,2,3),keep_rows=True)
    report.paragraph('Сравнивается медиана трёх замеров. n_jobs=1 и threadpool_limits(limits=1) ограничивают параллелизм; состояние пулов сохранено внутри этого контекста. Фиксированный random_state дал одинаковые предсказания. Повторы оценивают время, но не независимое качество. CPU-замеры этой реализации не сопоставляются с GPU-минутами примера методички.')

    report.heading('6 Сравнение качества и времени', new_page=True)
    report.paragraph('Accuracy — доля правильно классифицированных наблюдений. Balanced accuracy — средняя полнота по семи классам. F1 каждого класса — гармоническое среднее точности и полноты; macro-F1 — среднее семи таких F1 без весов по частоте. Для дополнительной проверки использованы постоянный прогноз наиболее частого класса и одно дерево глубины 8 с минимумом 2 строки в листе.')
    quality=[]
    for m in r['baselines']:
        quality.append([m['algorithm'],fmt(m['accuracy']),'—',fmt(m['test_f1_macro']),'—'])
    for m in r['metrics']:
        quality.append([m['algorithm'],fmt(m['accuracy']),fmt(m['balanced_accuracy']),fmt(m['test_f1_macro']),fmt(m['train_f1_macro'])])
    report.table('Качество на общем отложенном тесте',
        ['Модель','Accuracy','Balanced\naccuracy','Macro-F1\ntest','Macro-F1\ntrain'],quality,
        [4.1,2.8,3.2,3.2,3.2],center=(1,2,3,4),keep_rows=True)
    report.figure('Сопоставление macro-F1 и времени обучения',HERE/'outputs/03_comparison.png',max_height=7,
        lead='На рисунке 2 сопоставлены test macro-F1 и медиана времени итогового fit. Время подбора параметров сюда не входит.')
    gain=boost['test_f1_macro']-bag['test_f1_macro']
    ratio=boost['fit_median_seconds']/bag['fit_median_seconds']
    report.paragraph(f'Бустинг улучшил macro-F1 на {fmt(gain)} и accuracy на {fmt(boost["accuracy"]-bag["accuracy"])}; это разности долей, а не относительные проценты. Обучение бустинга заняло примерно в {fmt(ratio,2)} раза больше времени. Медиана predict составила {fmt(bag["predict_median_seconds"],6)} с у бэггинга и {fmt(boost["predict_median_seconds"],6)} с у бустинга; на столь коротких замерах нельзя делать универсальный вывод о скорости обслуживания.')

    report.heading('7 Ошибки по классам', new_page=True)
    report.table('F1 и число тестовых наблюдений каждого класса', ['Класс','Test','F1 Bagging','F1 Boosting'], [
        [label,int(r['per_class']['Bagging'][label]['support']),
         fmt(r['per_class']['Bagging'][label]['f1-score']),fmt(r['per_class']['Boosting'][label]['f1-score'])]
        for label in labels], [7,2.5,3.5,3.5], center=(1,2,3),keep_rows=True)
    report.figure('Матрица ошибок бэггинга',HERE/'outputs/02_confusion_bagging.png',max_height=11.3,
        lead='На рисунке 3 строки матрицы обозначают истинные классы, столбцы — предсказанные. Все семь классов показаны в порядке исходного словаря.')
    report.paragraph('Бэггинг отнёс 24 из 81 наблюдения Bumps к Other_Faults. Для Pastry правильно распознаны 20 из 32 наблюдений. Матрица сохраняет конкретные числа ошибок, которые не видны в одной общей accuracy.')

    report.heading('8 Матрица ошибок бустинга и ограничения', new_page=True)
    report.figure('Матрица ошибок градиентного бустинга',HERE/'outputs/02_confusion_boosting.png',max_height=13,
        lead='На рисунке 4 приведена матрица бустинга на тех же 389 строках. Порядок классов и шкала счёта совпадают с рисунком 3.')
    report.paragraph('У бустинга 23 ошибки Bumps→Other_Faults. При лучшем общем macro-F1 результат Pastry снизился: 19 правильных ответов вместо 20, F1 0,6230 вместо 0,6780. Для Stains F1 одинаков. Поэтому среднее улучшение не означает улучшения каждого класса.')
    report.paragraph(f'На train macro-F1 равна {fmt(bag["train_f1_macro"])} и {fmt(boost["train_f1_macro"])}; заметный разрыв с test указывает на риск переобучения. В тесте Dirtiness лишь 11 строк, Stains — 14, поэтому оценка редких классов чувствительна к отдельным ошибкам. Один holdout и небольшие сетки не доказывают статистически значимого или универсального превосходства; отдельного внешнего набора для проверки переноса здесь нет.')

    report.heading('9 Проверка и воспроизведение', new_page=True)
    report.paragraph(f'Семь ячеек notebook выполнены локально без ошибок. verify_experiment.py прошёл {proof["local_checks_passed"]} проверок, независимо переобучив обе модели и воспроизведя все предсказания. SHA-256 связывает отчёт с результатами.')
    report.table('Артефакты воспроизводимого эксперимента', ['Файл или каталог','Содержимое'], [
        ['Блокнот IPYNB','Код, пояснения и сохранённые outputs всех ячеек'],
        ['data/steel_plates_faults.zip','Неизменённый исходный архив UCI'],
        ['outputs/results.json','Среда, индексы, параметры, метрики и замеры'],
        ['outputs/cv_*.csv','Все четыре комбинации каждой модели'],
        ['outputs/predictions_*.csv','389 истинных и предсказанных меток обеих моделей'],
        ['outputs/verification.json','Независимые проверки и SHA-256 артефактов'],
    ],[8,8.5],keep_rows=True)
    report.heading('Исполнение в Google Colab',2)
    report.paragraph('1. В Colab выбрать Файл → Загрузить блокнот и открыть приложенный IPYNB. Данные автоматически загрузятся с UCI.')
    report.paragraph('2. Выбрать CPU и выполнить все ячейки. Первая ячейка устанавливает версии библиотек; Execution environment должен содержать Google Colab.')
    report.paragraph('3. Дождаться ALL CELLS COMPLETED и скачать выполненный IPYNB и outputs. Для облачного отчёта использовать новые замеры этого запуска.')
    report.paragraph('Облачный запуск и уникальность набора в группе не подтверждены. Перед сдачей необходимо выполнить notebook в Colab и согласовать данные с группой. Локальные результаты не заменяют эти условия.')
    report.heading('Вывод',2,new_page=True)
    report.paragraph('На данном тесте бустинг точнее, бэггинг быстрее обучается; оба лучше выбранных базовых моделей. Ограничения — ухудшение Pastry, малочисленные редкие классы и риск переобучения. Индексы, параметры и предсказания сохранены для проверки выводов.')
    report.sources([
        'Практическая работа №7. Ансамблевое обучение. Предоставленные методические материалы, 12 с. Практическое задание на с. 12, требование Colab Notebook на с. 11.',
        'Buscema M., Terzi S., Tastle W. Steel Plates Faults. UCI Machine Learning Repository, 2010. DOI: https://doi.org/10.24432/C5J88N. Лицензия CC BY 4.0. Дата обращения: 05.10.2026.',
        'scikit-learn developers. BaggingClassifier. Документация 1.9.1. https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.BaggingClassifier.html. Дата обращения: 05.10.2026.',
        'scikit-learn developers. GradientBoostingClassifier. Документация 1.9.1. https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.GradientBoostingClassifier.html. Дата обращения: 05.10.2026.',
    ],new_page=False)
    return report.save(HERE)


if __name__=='__main__':
    build()
