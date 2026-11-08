"""PR5 report for all three independent Calories tasks in the Moodle brief."""
import re
from build_ml_reports import MLReport,load,run_record,sources,n,BD

def build():
    r=load(5);reg=r['regression'];cls=r['classification'];cl=r['clustering'];d=MLReport(5)
    d.h('1 Цель и задание')
    d.p('В работе построены три самостоятельных пайплайна PySpark на выбранном наборе Calories: регрессия расхода энергии, бинарная классификация тренировок и кластеризация по исходным характеристикам. Условия Moodle требуют свой набор данных; повторение демонстрации на Online Shoppers и Seoul Bike в сдаваемую работу не включено.')
    run_record(d,5)
    d.h('2 Данные и среда выполнения')
    d.table('Паспорт данных и окружения',['Параметр','Значение'],[
        ['Набор','Предоставленный calories.csv, 15 000 строк, 9 полей'],['Ключ','User_ID, все 15 000 значений уникальны'],
        ['Пропуски','0'],['Совпадающие векторы предикторов',r['dataset']['duplicate_feature_rows']],
        ['Стенд','TIABD-Albakhtin-IV; Ubuntu 22.04.5 LTS; 2 vCPU, 4 ГБ RAM'],
        ['Python / Spark',r['environment']['python']+' / '+r['environment']['spark']],['Java',r['environment']['java']]], [5.5,11])
    d.p('Схема задаётся явно: User_ID имеет тип Long, Gender - String, остальные поля - Double. До обучения сверяются SHA256 исходного CSV, число строк, уникальность ключей, NULL, допустимые категории и диапазоны. Источник предоставлен пользователем; лицензия и способ измерения Calories в исходных материалах не описаны.')
    d.p('Момент прогноза - окончание тренировки: известны Duration, Heart_Rate и Body_Temp. Дополнительные предикторы: Age, Height, Weight и Gender. Это оценка по завершённой тренировке, а не прогноз до её начала. User_ID, Calories, обе цели и split исключены из признаков. Порог классификационной цели 200 ккал установлен заранее как условное правило учебной задачи.')
    d.h('3 Разбиение и подготовка признаков')
    d.p('Сортировка по SHA256(User_ID:42) формирует общие train, valid и test для двух прогнозных задач. Пересечения ключей проверены явно. Предобработка и параметры моделей обучаются на train, выбор выполняется на valid. Test используется только после фиксации модели и порога вероятности.')
    balance={(x['split'],int(x['class_label'])):x['count'] for x in r['class_balance']}
    d.table('Общие части и баланс классов',['Часть','Строк','Calories < 200','Calories >= 200'],[[part,r['split'][part],balance[(part,0)],balance[(part,1)]] for part in ['train','valid','test']], [3,3,5.25,5.25])
    d.p('StringIndexer и OneHotEncoder кодируют Gender; одна из двух категорий опускается, чтобы избежать линейной зависимости с intercept. Неизвестная категория вызывает ошибку контракта. VectorAssembler объединяет шесть числовых полей с кодировкой, StandardScaler масштабирует без центрирования. Все стадии входят в один Pipeline и обучаются только на train.')
    d.plot('train_distribution.png','Распределения предикторов и цели на train')
    d.h('4 Регрессия Calories')
    d.p('Сравниваются линейная регрессия с L2-регуляризацией 0,01 и 0,1 и случайный лес из 80 деревьев с глубиной 8 и 12. В лесах minInstancesPerNode=3, seed=42. Линейная модель использует normal solver. Критерий выбора - минимальный RMSE valid; базовое решение - среднее Calories train.')
    d.table('Регрессоры на valid',['Модель','RMSE ккал','MAE ккал','R²'],[[x['model'],n(x['rmse'],3),n(x['mae'],3),n(x['r2'],4)] for x in reg['validation']], [6,3.5,3.5,3.5])
    d.table('Регрессия на test',['Модель','RMSE ккал','MAE ккал','R²'],[[label,n(x['rmse'],3),n(x['mae'],3),n(x['r2'],4)] for label,x in [(reg['selected_model'],reg['test']),('Среднее train',reg['baseline_test'])]], [6,3.5,3.5,3.5])
    d.p(f'Выбрана {reg["selected_model"]}. На 3 000 отложенных тренировках RMSE равен {n(reg["test"]["rmse"],3)} ккал против {n(reg["baseline_test"]["rmse"],3)} у базового решения. Этот результат относится к данному файлу и разбиению, не подтверждает достоверность измерений в клиническом применении.')
    d.plot('regression_test.png','Прогноз Calories и остатки на test')
    d.h('5 Бинарная классификация')
    d.p('Цель равна 1 при Calories >= 200. Сравниваются LogisticRegression с regParam 0,01 и 0,1 и RandomForestClassifier из 80 деревьев с глубиной 6 и 10. Модель выбирается по PR-AUC valid. Затем порог вероятности выбирается по F1 той же valid из 17 значений от 0,10 до 0,90. Порог цели не подбирается; он отличается от порога вероятности.')
    d.table('Классификаторы на valid при пороге 0,5',['Модель','PR-AUC','ROC-AUC','F1'],[[x['model'],n(x['areaUnderPR'],5),n(x['areaUnderROC'],5),n(x['f1'],5)] for x in cls['validation']], [6,3.5,3.5,3.5])
    c=cls['test'];d.p(f'Выбрана {cls["selected_model"]}, порог вероятности {n(cls["probability_threshold"],2)}. На test PR-AUC={n(c["areaUnderPR"],5)}, ROC-AUC={n(c["areaUnderROC"],5)}, precision={n(c["precision"],5)}, recall={n(c["recall"],5)}, F1={n(c["f1"],5)}. Матрица: TN={c["tn"]}, FP={c["fp"]}, FN={c["fn"]}, TP={c["tp"]}. Точность большинства train на том же test равна {n(cls["baseline_test"]["accuracy"],5)}; F1 - {n(cls["baseline_test"]["f1"],5)}.')
    d.plot('classification_test.png','PR-кривые valid и матрица ошибок test')
    d.h('6 Кластеризация тренировок')
    d.p('Описательный анализ использует все 15 000 строк и только Age, Height, Weight, Duration, Heart_Rate, Body_Temp. Gender, ключ и Calories исключены. Pipeline содержит VectorAssembler, StandardScaler с центрированием и KMeans. Каждая модель обучается на всех строках; силуэт squaredEuclidean оценивается на одной фиксированной выборке 2 000 строк при k=2…8.')
    d.table('Выбор числа кластеров',['k','Силуэт','Training cost','Минимальная группа'],[[x['k'],n(x['silhouette'],5),n(x['training_cost'],2),x['min_cluster']] for x in cl['k_selection']], [2,4,5,5.5])
    d.p(f'По максимуму силуэта выбрано k={cl["selected_k"]}. PCA используется только для визуализации, первые две компоненты объясняют {n(100*sum(cl["pca_explained_variance"]),2)}% дисперсии. Средний Calories добавлен к профилям после обучения и не влияет на кластеры. Номера групп условны и не являются готовыми категориями тренированности.')
    d.table('Профили групп',['Группа','Строк','Возраст','Длительность','Пульс','Calories'],[[x['prediction'],x['n'],n(x['Age'],1),n(x['Duration'],1),n(x['Heart_Rate'],1),n(x['Calories'],1)] for x in cl['profiles']], [2,2.5,2.5,3.5,3,3])
    d.plot('clustering.png','Выбор k и PCA всех 15 000 тренировок')
    d.h('7 Проверка и выводы')
    d.p('Сохранены три полных PipelineModel, параметры выбора и прогнозы. После PipelineModel.load максимальная разность прогноза регрессии, вероятности классификации и номеров кластеров равна 0. В конце освобождён кэш и остановлена SparkSession. Модели и исходный пользовательский CSV находятся локально и в учебной VM.')
    d.p('Независимый verify_pr5.py восстановил части по исходным ключам, сверил цели 3 000 тестовых строк в каждой прогнозной задаче, пересчитал RMSE, MAE, R², матрицы ошибок, ROC-AUC и PR-AUC. Проверены четыре классификатора valid, 17 порогов, train-only масштабы и все семь силуэтов на той же выборке. Профили покрывают 15 000 исходных тренировок.')
    d.p('Регрессия и классификация улучшили базовые решения на данном test. Кластеризация выявила геометрические группы по совместной изменчивости характеристик, а не клинические состояния. Ограничения: один split, неизвестное происхождение измерений и один вычислительный узел. Для оценки переноса нужны независимые данные; сеть и масштабирование физического кластера здесь не проверялись.')
    d.code('cd /home/albakhtin/tiabd/АлбахтинИВ/ML\n/home/albakhtin/tiabd/.venv/bin/python run_notebook.py 5\n/home/albakhtin/tiabd/.venv/bin/python verify_pr5.py')
    text=(BD/'ТИАБД_ПР5_Ответы.md').read_text(encoding='utf-8').split('## II')[0]
    blocks=re.findall(r'(?ms)^(\d+)\. \*\*(.*?)\*\*\s*\n(.*?)(?=^\d+\. \*\*|\Z)',text);assert len(blocks)==24
    d.questions([f'{i}. {q}' for i,q,_ in blocks],[re.sub(r'\s+',' ',a.strip()).replace('`','') for _,_,a in blocks])
    sources(d,5,['2. Moodle. Условия сдачи ПР5 от 08.11.2026.',
        '3. Calories. Предоставленный calories.csv; SHA256 и схема в ML/source_manifest.json.',
        ('4. Apache Spark 3.5.7 ML Pipelines','https://spark.apache.org/docs/3.5.7/ml-pipeline.html')])
    d.save()

if __name__=='__main__':build()
