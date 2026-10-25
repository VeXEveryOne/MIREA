"""Reports 5-7 from executed notebooks and independently verified exports."""
from pathlib import Path
from datetime import datetime,timedelta,timezone
import hashlib,json,re,sys
from docx.oxml.ns import qn
from build_pr3_report import PR3Report,add_toc

PACK=Path(__file__).resolve().parents[1];BD=PACK.parent;LAB=PACK/'ML'
TOPICS={5:'Машинное обучение в анализе данных\nс использованием Spark MLlib',6:'Кластеризация',7:'Ансамблевое обучение'}
def n(x,d=0):return f'{x:,.{d}f}'.replace(',',' ').replace('.',',')
def load(k,name='summary.json'):return json.loads((LAB/f'results/pr{k}'/name).read_text(encoding='utf-8'))
class MLReport(PR3Report):
    def __init__(self,k):super().__init__(k,TOPICS[k]);self.number=k
    def save(self):
        add_toc(self.doc)
        for f in self.doc.element.xpath('.//w:rFonts'):
            for key in list(f.attrib):
                if 'Theme' in key:del f.attrib[key]
            for kind in ['ascii','hAnsi','eastAsia','cs']:f.set(qn('w:'+kind),'Times New Roman')
        self.doc.core_properties.title=f'Практическая работа {self.number} '+TOPICS[self.number].replace('\n',' ')
        self.doc.core_properties.author='Албахтин И.В.'
        path=BD/f'ТИАБД_ПР{self.number}_АлбахтинИВ.docx';self.doc.save(path);print(path)
    def plot(self,name,caption,width=16.5):self.figure(LAB/f'results/pr{self.number}'/name,caption,width)

def run_record(d,k):
    run=load(k,'execution.json');v=load(k,'verification.json')
    assert run['status']==v['status']=='passed' and run['errors']==0
    assert run['notebook_sha256']==v['notebook_sha256']==hashlib.sha256((LAB/f'Practice_{k}.ipynb').read_bytes()).hexdigest()
    end=datetime.fromisoformat(run['completed_utc']).astimezone(timezone(timedelta(hours=3)))
    d.p(f'Полный Run All из нового ядра завершён {end:%d.%m.%Y %H:%M:%S} МСК: {run["code_cells"]} кодовых ячеек подряд, ошибок 0, время {n(run["seconds"],2)} с. Файл execution.json содержит последовательность счётчиков и SHA256 выполненного блокнота; verification.json фиксирует отдельную проверку исходных строк, разбиений и выгруженных метрик.')

def sources(d,k,more):
    d.h('Источники')
    for text in [f'1. Практическая работа №{k}. Предоставленная методичка, ml_labs/assignment.',*more]:d.p(text)

def build5():
    r=load(5);c=r['classification'];b=r['regression'];cl=r['clustering'];own=r['independent']
    d=MLReport(5);d.h('1 Цель и задание')
    d.p('Цель — построить полные воспроизводимые цепочки Spark MLlib для классификации, регрессии и кластеризации. Учебная часть повторяет все практические блоки методички на Online Shoppers и Seoul Bike. Самостоятельная часть решает регрессию Calories с двумя семействами моделей, подбором на valid, базовым решением и итоговым test.')
    run_record(d,5)
    d.h('2 Среда и исходные данные')
    d.table('Среда выполнения',['Параметр','Значение'],[
        ['Стенд','TIABD-Albakhtin-IV, Ubuntu 22.04.5 LTS'],['Ресурсы','2 vCPU, 4 ГБ RAM'],
        ['Python / Spark',r['environment']['python']+' / '+r['environment']['spark']],['Java','OpenJDK 17.0.20.1'],
        ['Spark','local[*], 2 параллельные задачи; shuffle.partitions=4; driver 1536m']], [5,11.5])
    d.p('В контрольных выводах методички использован Spark 4.1.2. Здесь применяется установленный Spark 3.5.7 с совместимым Python 3.10.12. Метрики получены реальным запуском и не заменены числами примера. Local[*] выполняет модель распределённых вычислений на одном узле и не измеряет сеть физического кластера.')
    d.table('Данные и назначение',['Набор','Строк','Поля','Задача'],[
        ['Online Shoppers','12 330','18','Покупка и сегментация сессий'],['Seoul Bike','8 760','14','Часовой прокат'],['Calories','15 000','9','Расход энергии после тренировки']], [4.2,2.1,1.8,8.4])
    d.p('Публичные Online Shoppers и Seoul Bike получены из UCI с лицензией CC BY 4.0. Calories взят из предоставленного каталога. Точные SHA256, размеры и схемы записаны в source_manifest.json. CSV читаются с явными Spark-схемами, режимом FAILFAST и проверками количества строк и NULL. Seoul Bike декодируется как ISO-8859-1; исходные заголовки сопоставляются по позиции с именами явной схемы.')
    d.h('3 Классификация Online Shoppers')
    d.p('Цель Revenue отражает покупку. В исходных данных 10 422 отрицательных и 1 908 положительных сессий, доля покупок 15,47%. Источник описывает сессии разных пользователей. Стабильный row_id задаётся порядком исходного CSV; внутри каждого класса строки сортируются по SHA256(row_id:42), после чего выделяются 60%, 20% и остаток. Части не пересекаются.')
    split={(x['split'],int(x['label'])):x['count'] for x in c['split']}
    d.table('Стратифицированное разбиение',['Часть','Нет покупки','Покупка','Всего'],[[name,n(split[(name,0)]),n(split[(name,1)]),n(split[(name,0)]+split[(name,1)])] for name in ['train','valid','test']], [4.5,4,4,4])
    d.p('Счётчики страниц и длительности преобразованы log1p. Browser, Region, TrafficType, ОС и Weekend кодируются как категории вместе с Month и VisitorType. StringIndexer и OneHotEncoder обучаются только на train. Для LR добавлено масштабирование без центрирования, для RF оно не требуется. Веса N/(2Nc) вычисляются по train и усиливают штраф за редкий положительный класс.')
    d.code('Pipeline([SQLTransformer(...), StringIndexer(...),\n          OneHotEncoder(...), VectorAssembler(...),\n          StandardScaler(...), LogisticRegression(...)])\n# RF: тот же набор исходных полей без StandardScaler')
    d.p('LR: maxIter=100, regParam=0,05, L2. RF: 80 деревьев, maxDepth=8, maxBins=64, featureSubsetStrategy=sqrt, seed=42. Выбор семейства выполнен по PR-AUC на одной valid. Порог затем выбран по максимуму F1 только на valid.')
    d.table('Классификаторы на valid при пороге 0,5',['Модель','PR-AUC','ROC-AUC','Precision','Recall','F1'],[[x['model'],*[n(x[k],4) for k in ['areaUnderPR','areaUnderROC','precision','recall','f1']]] for x in c['validation']], [4.4,2.4,2.4,2.5,2.4,2.4])
    d.plot('classification_pr.png','Кривые precision–recall на valid')
    t=c['test'];d.p(f'Выбран {c["selected_model"].lower()}, порог {n(c["threshold"],6)}. На test: PR-AUC {n(t["areaUnderPR"],4)}, ROC-AUC {n(t["areaUnderROC"],4)}, accuracy {n(t["accuracy"],4)}, precision {n(t["precision"],4)}, recall {n(t["recall"],4)}, F1 {n(t["f1"],4)}. Матрица: TN={t["tn"]}, FP={t["fp"]}, FN={t["fn"]}, TP={t["tp"]}. Найдено {t["tp"]} из 382 покупок; {t["fp"]} отрицательных сессий получили положительное решение.')
    d.plot('classification_confusion.png','Матрица ошибок на закрытом до выбора модели test',12)
    d.p(f'Абляция PageValues на той же valid: PR-AUC RF с признаком {n(c["ablation_with"],4)}, без него {n(c["ablation_without"],4)}. Разница показывает его прогностический вклад, но не доказывает доступность к моменту раннего прогноза. Для ранней сессии признак требует временного паспорта. Важности RF не являются причинными эффектами; коэффициенты LR относятся к преобразованным и масштабированным координатам.')
    d.plot('feature_importance.png','Наибольшие важности признаков случайного леса')
    d.table('Наибольшие коэффициенты LR',['Признак','Коэффициент'],[[x['feature'],n(x['coefficient'],4)] for x in c['coefficients'][:5]], [12,4.5])
    d.h('4 Регрессия Seoul Bike')
    d.p('Цель — Rented Bike Count, число поездок в час. Из основной регрессии исключены 295 часов Functioning Day=No: модель оценивает спрос работающей системы. Для закрытой системы применяется отдельное правило нулевого проката. Строки сортируются по дате и часу. Train заканчивается июлем, valid содержит август–сентябрь, test — октябрь–ноябрь; фактические границы учитывают отсутствие рабочих часов.')
    d.table('Хронологическое разбиение',['Часть','Строк','Начало','Конец'],[[name,n(x['n']),x['start'],x['end']] for name,x in b['split'].items()], [3,2.5,5.5,5.5])
    d.p('Час и месяц представлены sin/cos; используются погодные и календарные признаки. Словари и масштабы обучаются на train. day_index включён только в RF согласно методичке; его перенос на следующий год требует отдельной проверки. Полиномиальная ветвь расширяет пять исходных непрерывных/циклических полей до степени 2. Сравниваются LR, полиномиальная регрессия и RF, а также тренировочное глобальное и часовое средние.')
    d.table('Регрессоры и базовые правила на valid',['Модель','RMSE','MAE','R²'],[[x['model'],n(x['rmse'],3),n(x['mae'],3),n(x['r2'],4)] for x in b['validation']], [7.5,3,3,3])
    d.p(f'По минимальному RMSE выбран {b["selected_model"].lower()}. Test: RMSE {n(b["test"]["rmse"],3)}, MAE {n(b["test"]["mae"],3)} поездки/час, R² {n(b["test"]["r2"],4)}. Для глобального среднего RMSE {n(b["baseline_test"][0]["rmse"],3)}, для среднего по часу {n(b["baseline_test"][1]["rmse"],3)}. Выбранная модель превосходит оба правила на этом временном интервале; вывод не распространяется автоматически на следующий год.')
    d.plot('regression_scatter.png','Фактический и прогнозный часовой прокат на test')
    d.plot('regression_week.png','Прокат и прогноз в первую доступную неделю test')
    d.h('5 Кластеризация сессий')
    d.p('Используются восемь поведенческих признаков: шесть log1p-счётчиков/длительностей и BounceRates, ExitRates. Revenue и PageValues исключены. StandardScaler с центрированием обучен на полном неразмеченном наборе: задача описательная. KMeans обучается на всех 12 330 сессиях; силуэт вычисляется в том же стандартизованном пространстве на фиксированных 4 000 строках. Перебраны k от 2 до 8.')
    d.table('Выбор k',['k','Силуэт','Training cost','Минимальная группа'],[[x['k'],n(x['silhouette'],4),n(x['training_cost'],2),n(x['min_cluster'])] for x in cl['k_selection']], [2,4,5,5.5])
    d.p(f'Выбрано k={cl["selected_k"]} по максимуму силуэта. Убывание trainingCost само по себе недостаточно: оно поощряет увеличение числа групп. Покупки используются только после обучения для описания профилей, а номера кластеров не имеют постоянного бизнес-смысла.')
    d.table('Профили полученных групп',['Группа','Сессий','Страниц товара','Bounce rate','Доля покупок'],[[x['cluster'],n(x['n']),n(x['product_pages'],2),n(x['bounce_rate'],4),n(x['purchase_share'],4)] for x in cl['profiles']], [2,3,4,3.5,4])
    d.plot('clusters_pca.png','PCA двух компонент для отображения сегментов')
    d.p(f'Первые две компоненты объясняют {n(sum(cl["pca_explained_variance"])*100,2)}% дисперсии. Проекция служит иллюстрацией и не доказывает разделимость в восьмимерном пространстве. Профили выделяют короткие отказы, продолжительные сессии с несколькими видами страниц и основной промежуточный сегмент.')
    d.h('6 Самостоятельная регрессия Calories')
    d.p('Задача — оценить расход энергии после завершения тренировки, когда уже известны Duration, Heart_Rate и Body_Temp. Дополнительно используются Age, Height, Weight и Gender. User_ID исключён из признаков. Это оценка по итогам тренировки, а не прогноз до её начала. Происхождение измерений не позволяет делать медицинские или причинные выводы.')
    key=own['key_profile'];d.p(f'Все {n(key["rows"])} ключей User_ID уникальны, диапазон {key["min"]}–{key["max"]}; NULL отсутствуют. Повторных наблюдений одного ключа нет, поэтому выбрано разбиение независимых объектов. Глобальная сортировка по SHA256(User_ID:42) даёт train=9 000, valid=3 000 и test=3 000. Пересечения исключены; ключи в экспорте test заменены хэшами.')
    d.plot('calories_train_distribution.png','Распределения шести числовых признаков, цели и Gender на train')
    d.p('Явная схема: User_ID — Long, Gender — String, остальные семь полей — Double. StringIndexer, OneHotEncoder и StandardScaler обучаются внутри Pipeline только на train. LR сравнивается при regParam=0,01 и 0,1; RF содержит 80 деревьев с maxDepth=8 или 12 и minInstancesPerNode=3. Baseline — одно среднее Calories по train. Подбор минимизирует RMSE на valid.')
    d.table('Самостоятельные модели на valid',['Модель','RMSE ккал','MAE ккал','R²'],[[x['model'],n(x['rmse'],3),n(x['mae'],3),n(x['r2'],4)] for x in own['validation']]+[['Среднее train',n(own['baseline_valid']['rmse'],3),n(own['baseline_valid']['mae'],3),n(own['baseline_valid']['r2'],4)]], [6,3.5,3.5,3.5])
    d.p(f'Выбран {own["selected_model"]}. На итоговых 3 000 объектах RMSE {n(own["test"]["rmse"],3)} ккал, MAE {n(own["test"]["mae"],3)} ккал, R² {n(own["test"]["r2"],4)}; RMSE среднего {n(own["baseline_test"]["rmse"],3)} ккал. Высокая точность относится к данному файлу и выбранному разбиению, а не к клинической достоверности измерений.')
    d.plot('calories_test.png','Calories на test и распределение ошибок')
    d.h('7 Сохранение и выводы')
    d.p('Сохранены полные PipelineModel для классификации, Seoul Bike, KMeans и Calories, включая обученную подготовку. После load предсказания первых трёх цепочек совпали через exceptAll, максимальная разность Calories равна 0. Порог, k, seed и версия записаны в model_config.json. В конце освобождён кэш и вызван spark.stop(). Модели находятся в models/pr5 на VM; крупные бинарные модели и исходные пользовательские CSV исключены из Git.')
    d.p('Результаты показывают пользу контроля дисбаланса, временного разбиения и простых базовых правил. Для Online Shoppers цена высокого recall выражается в ложных срабатываниях; PageValues требует проверки доступности. Часовой baseline существенно сильнее глобального среднего, но RF улучшил временной test. Сегменты описывают поведение без использования Revenue. Самостоятельная регрессия воспроизводит весь цикл без ручной подмены переменных.')
    d.p('Отдельный verify_results.py восстановил состав test по исходным ключам и датам, пересчитал матрицу ошибок, регрессионные метрики, базовые правила и доли покупок кластеров. ROC/PR-AUC дополнительно сопоставлены с точным локальным расчётом с допуском 0,002 из-за биннинга Spark. Объёмы относятся к учебным наборам; перенос на большие данные требует контроля памяти driver и распределённой инфраструктуры.')
    d.code('cd /home/albakhtin/tiabd/АлбахтинИВ/ML\n/home/albakhtin/tiabd/.venv/bin/python run_notebook.py 5\n/home/albakhtin/tiabd/.venv/bin/python verify_results.py')
    text=(BD/'ТИАБД_ПР5_Ответы.md').read_text(encoding='utf-8').split('## II')[0]
    blocks=re.findall(r'(?ms)^(\d+)\. \*\*(.*?)\*\*\s*\n(.*?)(?=^\d+\. \*\*|\Z)',text);assert len(blocks)==24
    d.questions([f'{i}. {q}' for i,q,_ in blocks],[re.sub(r'\s+',' ',a.strip()).replace('`','') for _,_,a in blocks])
    sources(d,5,['2. UCI Online Shoppers Purchasing Intention, DOI 10.24432/C5F88Q. https://archive.ics.uci.edu/dataset/468/online+shoppers+purchasing+intention+dataset',
        '3. UCI Seoul Bike Sharing Demand, DOI 10.24432/C5F62R. https://archive.ics.uci.edu/dataset/560/seoul+bike+sharing+demand',
        '4. Apache Spark 3.5.7. Classification and regression. https://spark.apache.org/docs/3.5.7/ml-classification-regression.html',
        '5. Apache Spark 3.5.7. ML Pipelines. https://spark.apache.org/docs/3.5.7/ml-pipeline.html',
        '6. Calories. Предоставленный файл calories.csv; паспорт и SHA256 в ML/source_manifest.json.'])
    d.save()

def build6():
    r=load(6);d=MLReport(6);d.h('1 Цель и задание')
    d.p('Цель — сравнить три подхода к кластеризации: KMeans, иерархический метод и DBSCAN. Выполнены все шесть пунктов задания: выбор данных, масштабирование, локоть и силуэт для k, иерархия, плотностный алгоритм, t-SNE и содержательная интерпретация. Истинная метка сорта не участвует в обучении и подборе.')
    run_record(d,6)
    d.h('2 Данные и подготовка')
    d.p('Использован предоставленный Dry_Bean.csv: 13 611 объектов фасоли, 16 числовых морфологических признаков и Class с семью сортами. Признаки включают площадь, периметр, длины осей, эксцентриситет, компактность и коэффициенты формы. Набор отличается от данных других личных практик; неповторяемость во всей учебной группе требует сверки с её реестром.')
    d.table('Паспорт данных и среды',['Параметр','Значение'],[['Строки / признаки','13 611 / 16'],['NULL','0'],['Совпадающие векторы признаков',r['quality']['duplicate_feature_rows']],['Python / scikit-learn',r['environment']['python']+' / '+r['environment']['sklearn']],['Ресурсы','2 vCPU, 4 ГБ RAM; Ubuntu VM'],['Seed','42']], [6,10.5])
    d.p('68 повторяющихся векторов сохранены: отсутствие идентификаторов не позволяет доказать ошибочное дублирование наблюдений. Все три алгоритма обучаются на полном наборе. StandardScaler преобразует x в (x−mean)/std по всем неразмеченным объектам, поскольку проводится описательная кластеризация. Масштаб важен: площадь и коэффициенты формы имеют несопоставимые исходные единицы.')
    d.code("features = [c for c in raw.columns if c != 'Class']\nX = StandardScaler().fit_transform(raw[features])\n# Class используется только после фиксации разбиений")
    d.plot('scaling.png','Различие исходных масштабов и результат стандартизации')
    d.p('Для дорогого расчёта силуэта заранее выбраны 4 000 индексов генератором default_rng(42); выборка одинакова для всех вариантов и сохранена в summary.json. Евклидовы расстояния считаются в 16-мерном стандартизованном пространстве. Силуэт на двумерной картинке не используется.')
    d.h('3 KMeans и выбор k')
    d.p('Для k от 2 до 10 выполнено по 20 инициализаций KMeans, random_state=42. Сохраняются inertia и минимальный/максимальный размер группы. Убывание inertia рассматривается по правилу локтя, окончательный критерий — максимальный силуэт. Семь известных сортов не используются для назначения k.')
    d.table('Подбор числа кластеров',['k','Inertia','Силуэт','Мин размер','Макс размер'],[[x['k'],n(x['inertia'],1),n(x['silhouette'],4),n(x['min_cluster']),n(x['max_cluster'])] for x in r['kmeans']], [1.5,4.5,3.5,3.5,3.5])
    d.plot('kmeans_selection.png','Локоть и средний силуэт KMeans')
    d.p(f'Максимум силуэта достигнут при k={r["selected_k"]}: {n(max(x["silhouette"] for x in r["kmeans"]),4)}. На локте заметно уменьшение выигрыша после нескольких крупных групп, но однозначного доказательства единственного истинного k график не даёт. KMeans выделяет геометрические группы, которые не обязаны совпасть с сортами.')
    d.h('4 Иерархическая кластеризация')
    d.p(f'Построено полное дерево методом Ward по всем {n(r["hierarchy"]["rows"])} строкам: {n(r["hierarchy"]["merges"])} слияний. Ward выбирает объединение с минимальным приростом внутрикластерной суммы квадратов. Для сопоставления используется срез на том же k={r["selected_k"]}, выбранном без Class. Визуальная дендрограмма показывает последние 30 объединений; дерево при обучении не сокращено.')
    d.code("tree = linkage(X, method='ward', metric='euclidean')\nlabels = fcluster(tree, t=3, criterion='maxclust') - 1\n# Полная матрица слияний сохранена в hierarchy_linkage.csv")
    d.plot('dendrogram.png','Дендрограмма Ward по полному набору')
    d.p('Квадратичная по числу объектов память иерархии ограничивает перенос на существенно больший набор. На данном стенде полное дерево помещается в память; подмена задачи обучением на маленькой выборке не использовалась.')
    d.h('5 DBSCAN')
    d.p('Сначала построена кривая расстояний до 10-го соседа. Перебраны eps=0,5; 0,7; 0,9; 1,1; 1,3; 1,5; 1,8; 2,1 при min_samples=5 и 10. Среди вариантов не менее чем с двумя кластерами и покрытием от 80% выбран максимальный силуэт без шума; доля шума оценивается отдельно.')
    d.plot('dbscan_neighbors.png','Расстояния до десятого соседа в стандартизованном пространстве')
    selected=r['selected_dbscan'];d.table('Настройка DBSCAN',['eps','min_samples','Кластеры','Шум','Покрытие','Силуэт'],[[n(selected['eps'],1),selected['min_samples'],selected['clusters'],n(selected['noise']),n(selected['coverage'],4),n(selected['silhouette'],4)]], [2,2.8,2.8,2.8,3.1,3])
    d.p('Полная сетка из 16 вариантов сохранена в dbscan_selection.csv. Малый eps дробит данные и объявляет шумом большую часть объектов; большой eps сливает почти всё в один кластер. Выбранная настройка оставляет 1 400 шумовых объектов, поэтому её силуэт нельзя сравнивать с полным покрытием KMeans без этой оговорки.')
    d.h('6 Визуализация и сравнение')
    d.p('t-SNE построен по всем 13 611 стандартизованным векторам: perplexity=40, max_iter=1000, init=pca, random_state=42. Одна и та же проекция окрашена тремя способами. Проекция не участвует в обучении кластеризаторов и подборе параметров; локальное сходство на плоскости не гарантирует сохранения глобальных расстояний.')
    d.plot('clusters_tsne.png','Одна t-SNE проекция с разбиениями KMeans Ward и DBSCAN')
    d.table('Сравнение разбиений',['Алгоритм','Групп','Шум','Силуэт','ARI','NMI'],[[x['algorithm'],x['clusters'],n(x['noise']),n(x['silhouette'],4),n(x['ARI_reference'],4),n(x['NMI_reference'],4)] for x in r['comparison']], [3.5,2,2.5,3,2.75,2.75])
    d.p('ARI и NMI рассчитаны после фиксации разбиений по справочной Class; по ним параметры не подбирались. DBSCAN даёт высокий силуэт двух крупных плотностных групп, но низкое совпадение с семью сортами. Это не делает его лучшим решением любой задачи. KMeans и Ward имеют близкие силуэты, при этом Ward несколько лучше согласуется со справочными метками в данном опыте.')
    profile_rows=[]
    for name,rows in r['profiles'].items():
        for row in rows:profile_rows.append([name,str(row['cluster']),n(row['Area'],1),n(row['Perimeter'],2),n(row['Compactness'],4)])
    d.table('Средние морфологические профили',['Алгоритм','Группа','Area','Perimeter','Compactness'],profile_rows,[3.4,2,3.8,3.6,3.7])
    d.p('Профили позволяют описать размер и форму фасоли в полученных группах. Метка −1 у DBSCAN обозначает шум и не является сортом. Полные средние всех 16 полей и размеры групп находятся в отдельных CSV; номера групп разных алгоритмов не сопоставляются напрямую.')
    d.h('7 Выводы и воспроизводимость')
    d.p('Масштабирование устранило доминирование площади и периметра. По заявленному критерию выбран k=3; независимая иерархия построена без сокращения данных. DBSCAN выделил две плотностные группы при покрытии 89,71%, но с более слабым соответствием сортам. Различие геометрического и предметного критериев требует содержательной интерпретации, а не выбора по одному максимальному числу.')
    d.p('Сохранены полные назначения объектов, координаты t-SNE, дерево Ward, сетки параметров и профили. В models/pr6/clustering.joblib на VM сохранены scaler, KMeans, DBSCAN и дерево. После загрузки прогноз KMeans совпал для всех объектов. Отдельная проверка пересчитала три силуэта на фиксированной выборке, размеры шума и срез полного дерева.')
    d.code('cd /home/albakhtin/tiabd/АлбахтинИВ/ML\n/home/albakhtin/tiabd/.venv/bin/python run_notebook.py 6\n/home/albakhtin/tiabd/.venv/bin/python verify_results.py')
    sources(d,6,['2. Dry_Bean.csv. Предоставленный архив Dry_Bean.csv.zip; SHA256 в ML/source_manifest.json.',
        '3. scikit-learn. Clustering. https://scikit-learn.org/stable/modules/clustering.html',
        '4. SciPy. Hierarchical clustering linkage. https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.linkage.html'])
    d.save()

def build7():
    r=load(7);d=MLReport(7);q=r['quality'];d.h('1 Цель и задание')
    d.p('Цель — реализовать бэггинг и бустинг на одном регрессионном наборе и сравнить качество и время работы. Прогнозируется Listening_Time_minutes по характеристикам подкаста. Обе модели используют одни признаки, одни train/valid/test и одинаковую подготовку. Дополнительно проверены среднее train и одиночное дерево.')
    run_record(d,7)
    d.h('2 Среда и данные')
    d.table('Паспорт выполнения',['Параметр','Значение'],[['Стенд','Ubuntu 22.04.5 LTS, TIABD-Albakhtin-IV'],['Ресурсы','2 vCPU, 4 ГБ RAM, CPU'],['Python / scikit-learn',r['environment']['python']+' / '+r['environment']['sklearn']],['Notebook','Practice_7.ipynb, последовательный Run All'],['Исходные данные','podcast_dataset.csv, 52 500 строк и 11 полей']], [6,10.5])
    d.p('Измерения этого отчёта получены в указанной VM. Методичка предусматривает ColabNotebook: подготовленный .ipynb совместим с Colab, где исходный CSV следует загрузить в data/ либо рабочий каталог. Запуск VM подтверждён протоколом; результаты не выдаются за замеры облачного CPU или GPU.')
    d.p('Набор предоставлен пользователем в Podcast Dataset.zip. Цель измеряется в минутах. Используются Episode_Length_minutes, Host_Popularity_percentage, Guest_Popularity_percentage, Number_of_Ads и категории Genre, Publication_Day, Publication_Time, Episode_Sentiment. Сценарий предполагает, что контентные метаданные известны к публикации. При позднем происхождении Episode_Sentiment его нужно исключить до прикладного применения.')
    d.table('Контроль качества',['Проверка','Результат'],[['Исходные строки',n(q['raw_rows'])],['Удалены точные дубликаты',n(q['exact_duplicates_removed'])],['Затем удалены строки без цели',n(q['unlabelled_rows_removed'])],['Осталось',n(q['used_rows'])],['Подкастов',q['podcast_groups']],['Неоднозначные пары названия и эпизода',n(q['inconsistent_episode_lengths'])]], [11,5.5])
    d.p('В исходном файле пропущено 5 395 значений цели, 5 246 длин эпизода и 5 258 значений популярности гостя. После удаления точных копий остаётся 5 132 строки без цели; их исключают, не заполняя ответы. Числовые предикторы заполняются медианами только train. Одинаковая пара Podcast_Name/Episode_Title имеет разные длины и не считается надёжным идентификатором наблюдения.')
    d.h('3 Разбиение без пересечения подкастов')
    d.p('GroupShuffleSplit с random_state=42 сначала выделяет 20% групп для test, затем 25% оставшихся групп для valid. Целые Podcast_Name попадают только в одну часть. Это проверяет перенос на новые подкасты. Podcast_Name и Episode_Title исключены из предикторов; они не становятся признаками скрытого запоминания. Временное разбиение невозможно обосновать по названию дня недели без календарной даты.')
    d.table('Общие части для всех моделей',['Часть','Строк','Подкастов'],[[key,n(value['rows']),len(value['groups'])] for key,value in r['split'].items()], [6,5.5,5])
    d.code("train_valid, test = next(GroupShuffleSplit(test_size=.2,\n    random_state=42).split(data, groups=data.Podcast_Name))\n# Второй групповой split отделяет valid от train_valid\n# Пересечения множеств Podcast_Name проверены assert")
    d.plot('data_split.png','Распределение цели train и объёмы частей')
    d.h('4 Бэггинг и бустинг')
    d.p('Общая предобработка: медианное заполнение четырёх числовых признаков и OneHotEncoder(handle_unknown=ignore) для четырёх категориальных. Подготовка и регрессор объединены в Pipeline. Все стадии fit вызываются только на train; valid определяет параметры, test не используется при выборе.')
    d.p('BaggingRegressor усредняет независимые DecisionTreeRegressor, обученные на bootstrap-выборках объёма 80% train. Сравниваются 50 деревьев глубины 8 и 80 деревьев глубины 12, min_samples_leaf=5, n_jobs=2. HistGradientBoostingRegressor последовательно уточняет прогноз; сравниваются 100 итераций, learning_rate=0,05, 15 листьев и 200 итераций, learning_rate=0,08, 31 лист. l2_regularization=1, early_stopping=False, random_state=42.')
    d.p('Выбран CPU-вариант градиентного бустинга для табличной регрессии. Пример CatBoost на GPU в теоретической части иллюстрирует другую конфигурацию; практическое задание требует бэггинг и бустинг на одних данных, не предписывая единственную библиотеку. Итоговые показатели зависят от выбранных ограничений моделей.')
    def label(x):
        p=x['parameters']
        if x['algorithm']=='bagging':return f"Бэггинг {p['trees']} / глубина {p['depth']}"
        if x['algorithm']=='boosting':return f"Бустинг {p['iterations']} / lr {p['learning_rate']}"
        return {'mean':'Среднее train','tree':'Одиночное дерево'}[x['algorithm']]
    d.table('Выбор по RMSE valid',['Модель','RMSE мин','MAE мин','R²'],[[label(x),n(x['rmse'],3),n(x['mae'],3),n(x['r2'],4)] for x in r['validation']], [7.5,3,3,3])
    d.p('В каждом семействе выбрана конфигурация с минимальным RMSE valid: бэггинг из 50 деревьев глубины 8 и бустинг из 100 итераций с learning_rate=0,05. Более сложные варианты не улучшили эту оценку. Параметры зафиксированы до итоговой проверки.')
    d.h('5 Качество на test')
    d.table('Результаты на одинаковом test',['Модель','RMSE мин','MAE мин','R²'],[[label(x),n(x['rmse'],3),n(x['mae'],3),n(x['r2'],4)] for x in r['test']], [7.5,3,3,3])
    bag=next(x for x in r['test'] if x['algorithm']=='bagging');boost=next(x for x in r['test'] if x['algorithm']=='boosting')
    d.p(f'Бэггинг: RMSE {n(bag["rmse"],3)} мин; бустинг: {n(boost["rmse"],3)} мин. Разница {n(bag["rmse"]-boost["rmse"],3)} мин мала относительно общей ошибки. Оба ансамбля заметно лучше среднего train и одиночного дерева на этом разбиении. Один test без повторной групповой оценки не доказывает статистически значимое превосходство семейства во всех данных.')
    d.plot('comparison.png','Факт прогноз остатки и RMSE четырёх моделей на test')
    d.h('6 Время обучения')
    d.p('Для каждой выбранной конфигурации выполнены три повторных fit на неизменной train с тем же seed. Каждый замер включает общую предобработку и модель, но исключает чтение CSV, подбор и построение графиков. Медиана уменьшает влияние одиночного всплеска. Все замеры относятся к двум CPU одного стенда, без GPU и сравнения между разными машинами.')
    d.table('Повторы обучения и прогноз test',['Модель','Fit 1 с','Fit 2 с','Fit 3 с','Медиана с','Predict с'],[[name,*[n(t,4) for t in x['fit_times']],n(x['fit_median'],4),n(x['predict_s'],4)] for name,x in [('Бэггинг',bag),('Бустинг',boost)]], [3.5,2.6,2.6,2.6,2.7,2.5])
    d.plot('training_time.png','Медианы трёх обучений на CPU',13)
    d.p(f'В данной серии бустинг обучался быстрее примерно в {n(bag["fit_median"]/boost["fit_median"],2)} раза. Это сравнение конкретных конфигураций: число и глубина деревьев, гистограммная реализация и параллелизм влияют на стоимость. Короткая серия с фиксированным порядком не является универсальным рейтингом алгоритмов.')
    d.h('7 Сохранение и выводы')
    d.p('Обе выбранные Pipeline сохранены через joblib вместе с медианами и словарями категорий. Повторное чтение моделей воспроизвело прогноз с абсолютным допуском 10⁻¹². Экспортированы параметры valid, все test-прогнозы, таблицы метрик, групповой состав частей и временные повторы. Исходный CSV и бинарные модели остаются локально и в VM; исходники и доказательства запуска доступны в репозитории.')
    d.p('Бэггинг уменьшил ошибку одиночного дерева усреднением независимых моделей. Бустинг достиг близкого и немного меньшего RMSE с меньшим временем в этой серии. Достоверность сравнения обеспечивают общие данные, групповое разбиение и обучение подготовки только на train. Ограничения: неоднозначные идентификаторы эпизодов, пропуски, неизвестный временной паспорт части метаданных и отсутствие календарной даты для временной проверки.')
    d.p('Отдельный verify_results.py восстановил 44 868 оставшихся строк, проверил непересечение 28/10/10 подкастов, совпадение цели test с исходником, медианы train и все четыре набора регрессионных метрик. Уникальность набора во всей учебной группе проверяется по её реестру; в личном комплекте этот набор используется только для ПР7.')
    d.code('cd /home/albakhtin/tiabd/АлбахтинИВ/ML\n/home/albakhtin/tiabd/.venv/bin/python run_notebook.py 7\n/home/albakhtin/tiabd/.venv/bin/python verify_results.py')
    sources(d,7,['2. Podcast Dataset.zip, podcast_dataset.csv. Предоставленный набор; SHA256 в ML/source_manifest.json.',
        '3. scikit-learn. Ensemble methods. https://scikit-learn.org/stable/modules/ensemble.html',
        '4. scikit-learn. GroupShuffleSplit. https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupShuffleSplit.html',
        '5. Google Colaboratory. https://colab.research.google.com/'])
    d.save()

if __name__=='__main__':
    reference=BD.parents[1]/'4/ИСУРО/ИСУРО_1_АлбахтинИВ.docx'
    assert hashlib.sha256(reference.read_bytes()).hexdigest()=='53a4b8ccc73cf44599e8b7c7fb75045afec85dd7f4b0a079b19a0d4ccb5249b1'
    for k in ([int(x) for x in sys.argv[1:]] or [5,6,7]):globals()[f'build{k}']()
