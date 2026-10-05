"""Build source notebooks; execution and measurements happen in the VM."""
from pathlib import Path
import nbformat as nbf
import sys
ROOT = Path(__file__).resolve().parent

def build(name, blocks):
    if len(sys.argv) > 1 and name != sys.argv[1]:
        return
    nb = nbf.v4.new_notebook()
    nb.cells = [nbf.v4.new_markdown_cell(text) if kind == 'md' else nbf.v4.new_code_cell(text) for kind, text in blocks]
    nb.metadata.kernelspec = {'display_name': 'Python Spark lab', 'language': 'python', 'name': 'python3'}
    nbf.write(nb, ROOT / name)

common = '''from pathlib import Path
import json
from pyspark.sql import SparkSession, functions as F, types as T
from pyspark import StorageLevel
from lab_helpers import environment, records, save_json, plan, measured, checkpoint, ui_data, schema_signature
ROOT = Path.cwd()
STAGING = ROOT / "data" / "spark_input"
OUT = ROOT / "exports"
OUT.mkdir(exist_ok=True)
def read_csv(name, schema=None, infer=False):
    reader = spark.read.option("header", True).option("encoding", "UTF-8")
    if schema is not None: reader = reader.schema(schema)
    return reader.option("inferSchema", infer).csv(str(STAGING / f"{name}.csv"))
'''

build('Practice_3.ipynb', [
('md', '# Практическая работа 3\nРаспределённая модель обработки данных\n\nВыполнены учебный анализ Olist и самостоятельный анализ продаж КОМУС. Источник Olist восстановлен из CSV второй практики; фактическая версия содержит 100 000 отзывов вместо 97 621 в примере методички. Числа вычисляются, а не подставляются из задания.'),
('code', common + '''
spark = (SparkSession.builder.master("local[*]").appName("TIABD_Practice_3_Albakhtin")
    .config("spark.driver.memory", "1536m").config("spark.sql.shuffle.partitions", "8")
    .config("spark.ui.bindAddress", "0.0.0.0").getOrCreate())
spark.sparkContext.setLogLevel("WARN")
result = {"environment": environment(spark), "source": json.loads((ROOT/"source_manifest.json").read_text())}
print(json.dumps(result["environment"], ensure_ascii=False, indent=2))
'''),
('md', '## 1 SQLite и staging\nСтандартный sqlite3 открывает источник. CSV отделяет выгрузку из СУБД от аналитики Spark; все 11 таблиц доступны для проверки.'),
('code', '''import sqlite3
import pandas as pd
names = ["orders", "order_items", "products", "customers", "order_payments", "order_reviews", "product_category_name_translation"]
with sqlite3.connect(ROOT/"data"/"ecommerce.sqlite") as con:
    counts = {}
    for name in names:
        total = 0
        for i, chunk in enumerate(pd.read_sql_query(f'SELECT * FROM "{name}"', con, chunksize=50000)):
            chunk.to_csv(STAGING/f"{name}.csv", index=False, header=i==0, mode="w" if i==0 else "a")
            total += len(chunk)
        counts[name] = total
        print(name, total)
result["source_counts"] = counts
'''),
('md', '## 2 Схемы и типы\nПри обычном чтении CSV все значения строковые. StructType фиксирует числовые типы позиций, а временные поля заказов преобразуются в timestamp.'),
('code', '''orders_raw = read_csv("orders")
orders_raw.printSchema()
orders_raw.select("order_status", "order_purchase_timestamp").show(5, False)
items_schema = T.StructType([T.StructField(c, typ, True) for c, typ in [
    ("order_id", T.StringType()), ("order_item_id", T.IntegerType()),
    ("product_id", T.StringType()), ("seller_id", T.StringType()),
    ("shipping_limit_date", T.StringType()), ("price", T.DoubleType()), ("freight_value", T.DoubleType())]])
items = read_csv("order_items", items_schema)
items.printSchema()
items_infer = read_csv("order_items", infer=True)
print("Explicit equals inferred:", items.schema == items_infer.schema)
timestamp_cols = ["order_purchase_timestamp", "order_approved_at", "order_delivered_carrier_date", "order_delivered_customer_date", "order_estimated_delivery_date"]
orders = orders_raw
for c in timestamp_cols: orders = orders.withColumn(c, F.to_timestamp(c, "yyyy-MM-dd HH:mm:ss"))
orders.printSchema()
result["schemas"] = {"raw": orders_raw.schema.jsonValue(), "items": items.schema.jsonValue(), "orders": orders.schema.jsonValue()}
'''),
('md', '## 3 Преобразования и пропуски\nУ дорогих позиций рассчитывается стоимость с доставкой. Отсутствующая дата не заменяется фиктивной: статус заказа объясняет её бизнес-смысл.'),
('code', '''expensive = (items.filter(F.col("price") >= 500).withColumn("gross_item_value", F.round(F.col("price")+F.col("freight_value"), 2))
    .select("order_id", "order_item_id", "price", "freight_value", "gross_item_value"))
result["expensive_count"] = expensive.count()
result["expensive_top"] = records(expensive.orderBy(F.desc("gross_item_value")).limit(5))
expensive.drop("order_id").orderBy(F.desc("gross_item_value")).show(5, False)
print("Price >= 500:", result["expensive_count"])
delivered = (orders.filter(F.col("order_status")=="delivered")
    .withColumn("purchase_month", F.date_format("order_purchase_timestamp", "yyyy-MM"))
    .withColumn("delivery_days", F.datediff("order_delivered_customer_date", "order_purchase_timestamp"))
    .withColumn("is_late", F.col("order_delivered_customer_date")>F.col("order_estimated_delivery_date")))
known = delivered.filter(F.col("order_delivered_customer_date").isNotNull())
result["delivery"] = {"delivered": delivered.count(), "known": known.count(), "late": known.filter("is_late").count()}
print(result["delivery"])
result["nulls"] = orders.select([F.sum(F.col(c).isNull().cast("int")).alias(c) for c in timestamp_cols]).first().asDict()
print(result["nulls"])
missing = orders.filter(F.col("order_delivered_customer_date").isNull()).groupBy("order_status").count().orderBy(F.desc("count"))
missing.show(False) if False else missing.show(truncate=False)
result["missing_status"] = records(missing)
products = read_csv("products", infer=True)
result["missing_categories"] = products.filter(F.col("product_category_name").isNull()).count()
products_clean = products.fillna({"product_category_name": "unknown"})
print("Products without category:", result["missing_categories"])
'''),
('md', '## 4 Агрегации и JOIN\nПлатёжные строки не тождественны заказам. LEFT JOIN сохраняет факты и позволяет измерить неполноту справочника.'),
('code', '''status = orders.groupBy("order_status").count().orderBy(F.desc("count"))
status.show(truncate=False)
payments = read_csv("order_payments", infer=True)
payment_stats = payments.groupBy("payment_type").agg(F.count("*").alias("payments"), F.round(F.sum("payment_value"),2).alias("total_value"), F.round(F.avg("payment_value"),2).alias("avg_value")).orderBy(F.desc("total_value"))
payment_stats.show(truncate=False)
translations = read_csv("product_category_name_translation")
sales = (items.alias("i").join(products_clean.select("product_id","product_category_name").alias("p"), "product_id", "left")
    .join(translations.alias("t"), "product_category_name", "left")
    .select("i.*", F.coalesce("product_category_name_english", "product_category_name", F.lit("unknown")).alias("category")))
result["join"] = {"before": items.count(), "after": sales.count(), "unknown": sales.filter("category='unknown'").count()}
print("JOIN checks:", result["join"])
customers = read_csv("customers", infer=True)
late_state = (known.join(customers.select("customer_id","customer_state"), "customer_id", "left").groupBy("customer_state")
    .agg(F.count("*").alias("delivered"),F.sum(F.col("is_late").cast("int")).alias("late"))
    .withColumn("late_pct", F.round(F.col("late")/F.col("delivered")*100,2)).orderBy(F.desc("late_pct")))
late_state.show(10, False)
result.update(status=records(status), payments=records(payment_stats), late_state=records(late_state.limit(10)))
'''),
('md', '## 5 Spark SQL и экспорт\nSQL и DataFrame API формируют планы одного движка. Проверяется равенство всех групп, а не только первых строк.'),
('code', '''sales.createOrReplaceTempView("sales")
category_sql = spark.sql("""SELECT category, COUNT(*) items, COUNT(DISTINCT order_id) orders,
    ROUND(SUM(price),2) revenue, ROUND(AVG(price),2) avg_price FROM sales GROUP BY category""")
category_api = sales.groupBy("category").agg(F.count("*").alias("items"), F.countDistinct("order_id").alias("orders"),F.round(F.sum("price"),2).alias("revenue"),F.round(F.avg("price"),2).alias("avg_price"))
diff = category_sql.exceptAll(category_api).count()+category_api.exceptAll(category_sql).count()
assert diff == 0
category_api.orderBy(F.desc("revenue")).show(10, False)
category_api.write.mode("overwrite").parquet(str(OUT/"pr3_olist_parquet"))
category_api.coalesce(1).write.mode("overwrite").option("header",True).csv(str(OUT/"pr3_olist_csv"))
back = spark.read.parquet(str(OUT/"pr3_olist_parquet"))
assert back.count()==category_api.count() and schema_signature(back)==schema_signature(category_api)
result["category"] = records(category_api.orderBy(F.desc("revenue")))
result["export"] = {"rows": back.count(), "types_equal": schema_signature(back)==schema_signature(category_api), "nullable_equal": back.schema==category_api.schema, "sql_diff": diff}
print(result["export"])
'''),
('md', '## 6 Самостоятельная работа КОМУС\n865 222 позиции продаж и отдельный справочник товаров. Восемь полей факта, четыре числовых и несколько категориальных признаков. Из входа исключены адреса, клиентские реквизиты и номера автомобилей. Условия публичного распространения исходного архива не предоставлены; исходные строки остаются локальными.'),
('code', '''own_path = ROOT/"data"/"komus"
own_schema = T.StructType([T.StructField(c,T.StringType(),True) for c in ["cost","purchase_date","receipt_id","product_key","branch","quantity","amount","discount"]])
raw = spark.read.option("header",True).schema(own_schema).csv(str(own_path/"sales.csv"))
inferred = spark.read.option("header",True).option("inferSchema",True).csv(str(own_path/"sales.csv"))
raw.printSchema()
print("Rows:", raw.count(), "Columns:", raw.columns)
inferred.printSchema()
fact = raw.withColumn("purchase_date", F.to_date("purchase_date","dd.MM.yyyy"))
for c in ["cost","quantity","amount","discount"]:
    fact = fact.withColumn(c, F.regexp_replace(c, ",", ".").cast("double"))
fact = (fact.withColumn("branch",F.trim("branch")).withColumn("month",F.date_format("purchase_date","yyyy-MM"))
    .withColumn("margin", F.col("amount")-F.col("cost")))
own_nulls = fact.select([F.sum(F.col(c).isNull().cast("int")).alias(c) for c in ["receipt_id","purchase_date","amount","cost","product_key"]]).first().asDict()
print("Nulls:", own_nulls)
good = fact.filter(F.col("purchase_date").isNotNull() & F.col("amount").isNotNull())
# Missing cost prevents margin calculation, not sales analysis. Keep the sale
# and measure cost coverage explicitly rather than fabricate a zero cost.
# Receipt IDs may be structurally absent: keep those sales, never fill with a real ID.
print("Rows retained:", good.count())
dim_raw = spark.read.option("header",True).csv(str(own_path/"products.csv"))
dim = dim_raw.select("product_key","brand","product_group").dropDuplicates()
conflicts = dim.groupBy("product_key").count().filter("count>1").count()
assert conflicts == 0, 'Ambiguous product dimension'
dim = dim.fillna({"brand":"unknown","product_group":"unknown"})
left = good.join(dim,"product_key","left").fillna({"brand":"unknown","product_group":"unknown"})
inner = good.join(dim,"product_key","inner")
join_counts = {"before":good.count(),"left":left.count(),"inner":inner.count(),"unmatched":good.join(dim,"product_key","left_anti").count()}
print("JOIN:",join_counts)
left.printSchema()
result["komus"] = {"rows": raw.count(), "columns": raw.columns, "nulls":own_nulls,"valid":good.count(),"dim_raw":dim_raw.count(),"dim_unique":dim.count(),"conflicts":conflicts,"joins":join_counts,"schema":left.schema.jsonValue()}
'''),
('md', '## 7 Группировки КОМУС и SQL\nМаржа определяется как сумма покупки минус предоставленная себестоимость строки. Это расчётный показатель, а не чистая прибыль: налоги и дополнительные расходы в данных отсутствуют.'),
('code', '''group_stats = left.groupBy("product_group").agg(F.count("*").alias("lines"), F.count("cost").alias("cost_known"), F.round(F.sum("amount"),2).alias("revenue"), F.round(F.sum("margin"),2).alias("margin"),F.round(F.avg("amount"),2).alias("avg_line"))
branch_stats = left.groupBy("branch").agg(F.count("*").alias("lines"),F.round(F.sum("amount"),2).alias("revenue"),F.round(F.sum("quantity"),2).alias("units")).orderBy(F.desc("revenue"))
group_stats.orderBy(F.desc("revenue")).show(10, False)
branch_stats.show(10, False)
left.createOrReplaceTempView("komus_sales")
sql1 = spark.sql("""SELECT product_group, COUNT(*) lines, COUNT(cost) cost_known, ROUND(SUM(amount),2) revenue,
    ROUND(SUM(margin),2) margin, ROUND(AVG(amount),2) avg_line
    FROM komus_sales GROUP BY product_group ORDER BY revenue DESC""")
sql2 = spark.sql("""SELECT month, COUNT(*) lines, ROUND(SUM(amount),2) revenue,
    ROUND(SUM(discount),2) discount FROM komus_sales GROUP BY month ORDER BY month""")
sql2.show(30,False)
assert group_stats.exceptAll(sql1).count()+sql1.exceptAll(group_stats).count()==0
group_stats.write.mode("overwrite").parquet(str(OUT/"pr3_komus_parquet"))
group_stats.coalesce(1).write.mode("overwrite").option("header",True).csv(str(OUT/"pr3_komus_csv"))
own_back = spark.read.parquet(str(OUT/"pr3_komus_parquet"))
assert own_back.count()==group_stats.count() and schema_signature(own_back)==schema_signature(group_stats)
result["komus"].update(groups=records(group_stats.orderBy(F.desc("revenue"))),branches=records(branch_stats),monthly=records(sql2),output_rows=own_back.count(),roundtrip_types_equal=schema_signature(own_back)==schema_signature(group_stats),roundtrip_nullable_equal=own_back.schema==group_stats.schema)
save_json("pr3.json",result)
checkpoint("pr3_completed",spark)
'''),
('md', '## 8 Выводы\n1. CSV требует контроля типов; десятичная запятая КОМУС не распознаётся как число автоматически.\n2. Пропуски дат доставки Olist зависят от статуса.\n3. LEFT JOIN сохраняет неполные факты; INNER JOIN позволяет проверить охват справочника.\n4. SQL и DataFrame API дали одинаковые агрегаты.\n5. Parquet сохранил схему и количество групп.\n\nОграничения: local[*] не является физическим кластером; значения маржи не учитывают все расходы предприятия, а версия Olist отличается от примера методички.'),
('code', 'spark.stop()\nprint("SparkSession stopped")'),
])

build('Practice_4.ipynb', [
('md', '# Практическая работа 4\nВыполнение задач обработки данных в распределённых вычислениях\n\nОсновная серия проводится при AQE=false, shuffle.partitions=8, autobroadcast=-1. Все времена измеряются внутри одной SparkSession в Ubuntu VirtualBox, а не берутся из методички. Самостоятельный вариант B: позиции заказов и продавцы, группировка по seller_state.'),
('code', common + '''
from time import perf_counter
from statistics import median
spark = (SparkSession.builder.master("local[*]").appName("TIABD_Practice_4_Albakhtin")
    .config("spark.driver.memory", "1536m").config("spark.sql.shuffle.partitions", "8")
    .config("spark.sql.adaptive.enabled", "false").config("spark.sql.autoBroadcastJoinThreshold", "-1")
    .config("spark.ui.bindAddress", "0.0.0.0").getOrCreate())
spark.sparkContext.setLogLevel("WARN")
sc = spark.sparkContext
result = {"environment":environment(spark),"source":json.loads((ROOT/"source_manifest.json").read_text()), "metrics":{}}
print(json.dumps(result["environment"],ensure_ascii=False,indent=2))
'''),
('md', '## 1 Подготовка Parquet\nStaging и перевод в Parquet исключены из замеров. Дополнительно выводятся реальные входные партиции.'),
('code', '''PARQUET = ROOT/"data"/"spark_input_parquet"
names = ["geolocation","order_items","products","sellers","product_category_name_translation"]
for name in names:
    read_csv(name,infer=True).write.mode("overwrite").parquet(str(PARQUET/name))
geo, items, products, sellers, translations = [spark.read.parquet(str(PARQUET/name)) for name in names]
result["inputs"] = {name:{"rows":df.count(),"partitions":df.rdd.getNumPartitions()} for name,df in zip(names,[geo,items,products,sellers,translations])}
print(result["inputs"])
_, result["metrics"]["baseline"] = measured(spark,"P4_BASELINE",items.count)
'''),
('md', '## 2 Lazy evaluation\nФиксируются Job ID перед созданием цепочки, после transformations и после count. Построение плана не должно запускать вычислительную Job.'),
('code', '''sc.setJobGroup("P4_LAZY","Lazy evaluation")
before = sorted(sc.statusTracker().getJobIdsForGroup("P4_LAZY"))
prepared = (geo.select("geolocation_zip_code_prefix","geolocation_state","geolocation_lat","geolocation_lng")
    .filter(F.col("geolocation_state").isNotNull()).withColumn("abs_lat",F.abs("geolocation_lat")))
after_transform = sorted(sc.statusTracker().getJobIdsForGroup("P4_LAZY"))
n, metric = measured(spark,"P4_LAZY",prepared.count)
result["lazy"] = {"before":before,"after_transform":after_transform,"after_action":metric["jobs"],"rows":n,"seconds":metric["seconds"]}
assert before==after_transform
print(result["lazy"])
'''),
('md', '## 3 Партиции и перекос\nДиагностическая группировка сама является отдельным вычислением. Размеры партиций сравниваются на одинаковом наборе.'),
('code', '''def profile(df):
    p = df.select(F.spark_partition_id().alias("pid")).groupBy("pid").count().orderBy("pid")
    values=records(p)
    sizes=[r["count"] for r in values]
    return {"partitions":df.rdd.getNumPartitions(),"sizes":values,"min":min(sizes),"max":max(sizes),"mean":sum(sizes)/len(sizes)}
state_counts=geo.groupBy("geolocation_state").count().orderBy(F.desc("count"))
state_counts.show(5,False)
result["state_top"]=records(state_counts.limit(5))
result["input_profile"]=profile(geo)
skewed16=geo.repartition(16,"geolocation_state")
repart4=skewed16.repartition(4)
coal4=skewed16.coalesce(4)
plan(repart4,"repartition4")
plan(coal4,"coalesce4")
result["profiles"]={"skewed16":profile(skewed16),"repartition4":profile(repart4),"coalesce4":profile(coal4)}
_,result["metrics"]["repartition4"]=measured(spark,"P4_REPARTITION",repart4.count)
_,result["metrics"]["coalesce4"]=measured(spark,"P4_COALESCE",coal4.count)
print(json.dumps(result["profiles"],indent=2))
'''),
('md', '## 4 GroupBy и physical plan\nЧастичная HashAggregate сокращает данные перед Exchange; финальная агрегация получает восемь shuffle partitions.'),
('code', '''seller_stats=items.groupBy("seller_id").agg(F.count("*").alias("items"),F.round(F.sum("price"),2).alias("revenue"),F.round(F.avg("price"),2).alias("avg_price")).orderBy(F.desc("revenue"))
top, result["metrics"]["groupby"] = measured(spark,"P4_GROUPBY",lambda:records(seller_stats.limit(5)))
result["seller_top"]=top
seller_stats.show(5,False)
plan(seller_stats,"groupby")
demo=(items.filter("price>=100").select("seller_id","price","freight_value").withColumn("gross",F.col("price")+F.col("freight_value"))
    .groupBy("seller_id").agg(F.round(F.sum("gross"),2).alias("gross_sum")))
plan(demo,"operator_demo")
'''),
('md', '## 5 Sort Merge Join и Broadcast Hash Join\nJOIN по product_id одинаков по смыслу. Сравниваются число строк, планы и фактические счётчики Spark UI. Дополнительно проводятся три прогретых повторения обеих стратегий.'),
('code', '''smj=items.hint("merge").join(products.hint("merge"),"product_id","inner")
bhj=items.join(F.broadcast(products),"product_id","inner")
plan(smj,"smj")
plan(bhj,"bhj")
smj_n,result["metrics"]["smj"]=measured(spark,"P4_SMJ",smj.count)
bhj_n,result["metrics"]["bhj"]=measured(spark,"P4_BHJ",bhj.count)
assert smj_n==bhj_n==items.count()
join_runs={"smj":[],"bhj":[]}
for _ in range(3):
    for name,df in [("smj",smj),("bhj",bhj)]:
        t=perf_counter(); df.count(); join_runs[name].append(perf_counter()-t)
result["joins"]={"rows":smj_n,"runs":join_runs,"medians":{k:median(v) for k,v in join_runs.items()}}
print(result["joins"])
checkpoint("pr4_joins",spark)
'''),
('md', '## 6 Persist и повторные действия\nСравнение включает цену материализации. Действия вычисляют контрольные суммы, чтобы оптимизатор не выбросил вычисляемое поле.'),
('code', '''spark.catalog.clearCache()
joined=(items.join(F.broadcast(products.select("product_id","product_category_name")),"product_id","left")
    .join(F.broadcast(sellers.select("seller_id","seller_state")),"seller_id","left")
    .withColumn("gross_value",F.col("price")+F.col("freight_value")))
def checksum(df,key):
    return df.groupBy(key).agg(F.sum("gross_value").alias("gross")).agg(F.sum("gross").alias("checksum")).first()[0]
a,m1=measured(spark,"P4_NOCACHE",lambda:checksum(joined,"product_category_name"))
b,m2=measured(spark,"P4_NOCACHE",lambda:checksum(joined,"seller_state"))
cached=joined.persist(StorageLevel.MEMORY_AND_DISK)
cached_n,mat=measured(spark,"P4_PERSIST",cached.count)
c,m3=measured(spark,"P4_PERSIST",lambda:checksum(cached,"product_category_name"))
d,m4=measured(spark,"P4_PERSIST",lambda:checksum(cached,"seller_state"))
assert abs(a-c)<0.01 and abs(b-d)<0.01
result["cache"]={"rows":cached_n,"no_cache":[m1,m2],"materialization":mat,"cached":[m3,m4],"checksums":[a,b,c,d],"storage":ui_data(spark,"/storage/rdd")}
print(json.dumps(result["cache"],indent=2))
result["metrics"]["persist_materialization"]=mat
result["metrics"]["persist_repeat"]=m3
checkpoint("pr4_storage",spark,["/storage/","/SQL/","/stages/"])
cached.unpersist(blocking=True)
print("Cached after unpersist:",cached.is_cached)
'''),
('md', '## 7 Benchmark\nN=2 000 000, key=id % 1000, value=sqrt(id+1). После одного прогрева для каждого p выполняются три запуска; число shuffle partitions неизменно и равно восьми.'),
('code', '''N=2_000_000
def run_benchmark(p,repeats=3):
    times=[]; checks=[]
    for _ in range(repeats):
        df=spark.range(0,N,1,numPartitions=p).withColumn("key",(F.col("id")%1000).cast("int")).withColumn("value",F.sqrt(F.col("id")+1.0))
        t=perf_counter()
        check=df.groupBy("key").agg(F.sum("value").alias("s")).agg(F.sum("s")).first()[0]
        times.append(perf_counter()-t); checks.append(check)
    return {"p":p,"times":times,"median":median(times),"checksum":checks}
sc.setJobGroup("P4_BENCHMARK","Synthetic partition benchmark")
run_benchmark(4,1)
result["benchmark"]=[run_benchmark(p) for p in [1,2,4,8,16,32]]
for row in result["benchmark"]: row["speedup"]=result["benchmark"][0]["median"]/row["median"]
print(json.dumps(result["benchmark"],indent=2))
geo8=geo.repartition(8)
q_results=[]
for q in [2,4,8,16,32]:
    spark.conf.set("spark.sql.shuffle.partitions",str(q))
    t=perf_counter(); rows=geo8.groupBy("geolocation_state").count().count(); seconds=perf_counter()-t
    q_results.append({"q":q,"groups":rows,"seconds":seconds})
spark.conf.set("spark.sql.shuffle.partitions","8")
result["shuffle_q"]=q_results
print(q_results)
'''),
('md', '## 8 Маленькие файлы\nЧисло файлов и их размер измеряются в файловой системе после фактической записи, а не предсказываются по числу партиций.'),
('code', '''SMALL=ROOT/"small_files_experiment"
def write_measure(df,p,tag):
    path=SMALL/tag
    _,metrics=measured(spark,"P4_FILES_"+tag,lambda:df.repartition(p).write.mode("overwrite").parquet(str(path)))
    files=list(path.glob("part-*.parquet"))
    sizes=[f.stat().st_size for f in files]
    return {"p":p,"files":len(files),"total_mib":sum(sizes)/1024**2,"mean_kib":sum(sizes)/len(sizes)/1024,"metrics":metrics}
result["small_files"]=[write_measure(items,p,f"items_{p}") for p in [1,4,16,64]]
items.coalesce(1).write.mode("overwrite").parquet(str(SMALL/"coalesce1"))
print(json.dumps(result["small_files"],indent=2))
spark.conf.set("spark.sql.adaptive.enabled","true")
spark.conf.set("spark.sql.shuffle.partitions","32")
adaptive=geo.groupBy("geolocation_state").count()
adaptive.collect()
result["aqe"]={"groups":len(adaptive.collect()),"output_partitions":adaptive.rdd.getNumPartitions()}
plan(adaptive,"aqe_final")
spark.conf.set("spark.sql.adaptive.enabled","false")
spark.conf.set("spark.sql.shuffle.partitions","8")
print(result["aqe"])
'''),
('md', '## 9 Самостоятельный вариант B\norder_items ↔ sellers, категориальный ключ seller_state. Повторяются lazy, repartition/coalesce, groupBy, две стратегии JOIN, persist, медианы и запись.'),
('code', '''sc.setJobGroup("P4_B_LAZY","Independent B lazy")
before=sorted(sc.statusTracker().getJobIdsForGroup("P4_B_LAZY"))
b_prepared=items.select("seller_id","price","freight_value").filter("price>0").withColumn("gross",F.col("price")+F.col("freight_value"))
after=sorted(sc.statusTracker().getJobIdsForGroup("P4_B_LAZY"))
b_rows,b_lazy=measured(spark,"P4_B_LAZY",b_prepared.count)
assert before==after
b_smj=b_prepared.hint("merge").join(sellers.hint("merge"),"seller_id","inner")
b_bhj=b_prepared.join(F.broadcast(sellers),"seller_id","inner")
plan(b_smj,"b_smj"); plan(b_bhj,"b_bhj")
b_sn,b_sm=measured(spark,"P4_B_SMJ",b_smj.count)
b_bn,b_bm=measured(spark,"P4_B_BHJ",b_bhj.count)
assert b_sn==b_bn==b_rows
b_group=b_bhj.groupBy("seller_state").agg(F.count("*").alias("lines"),F.round(F.sum("gross"),2).alias("gross"))
b_values,b_gm=measured(spark,"P4_B_GROUPBY",lambda:records(b_group.orderBy(F.desc("gross"))))
plan(b_group,"b_groupby")
b_skew=b_bhj.repartition(16,"seller_state")
b_repart=b_skew.repartition(4); b_coal=b_skew.coalesce(4)
plan(b_repart,"b_repartition"); plan(b_coal,"b_coalesce")
b_profiles={"repartition":profile(b_repart),"coalesce":profile(b_coal)}
def b_action(df,key):
    return df.groupBy(key).agg(F.sum("gross").alias("s")).agg(F.sum("s")).first()[0]
t=perf_counter(); ba=b_action(b_bhj,"seller_state"); t1=perf_counter(); bb=b_action(b_bhj,"seller_city"); t2=perf_counter()
b_cache=b_bhj.persist(StorageLevel.MEMORY_AND_DISK)
t3=perf_counter(); b_cache.count(); t4=perf_counter(); bc=b_action(b_cache,"seller_state"); t5=perf_counter(); bd=b_action(b_cache,"seller_city"); t6=perf_counter()
assert max(abs(ba-bc),abs(bb-bd))<0.01
b_cache_times={"without":[t1-t,t2-t1],"materialization":t4-t3,"cached":[t5-t4,t6-t5]}
checkpoint("pr4_variant_storage",spark,["/storage/","/SQL/","/stages/"])
b_cache.unpersist(blocking=True)
b_benchmark=[]
for p in [1,2,4,8]:
    times=[]
    for repeat in range(4):
        variant=b_bhj.repartition(p).groupBy("seller_state").agg(F.sum("gross").alias("g"))
        t=perf_counter(); values=variant.collect(); dt=perf_counter()-t
        if repeat: times.append(dt)
    b_benchmark.append({"p":p,"times":times,"median":median(times)})
b_files=[write_measure(b_group,p,f"variant_{p}") for p in [1,4]]
b_group.write.mode("overwrite").parquet(str(OUT/"pr4_variant_parquet"))
result["variant"]={"name":"B","inputs":{"items":result["inputs"]["order_items"],"sellers":result["inputs"]["sellers"]},"lazy":{"before":before,"after_transform":after,"after_action":b_lazy["jobs"],"rows":b_rows},"join_rows":b_sn,"smj":b_sm,"bhj":b_bm,"groupby":b_gm,"groups":b_values,"profiles":b_profiles,"cache":b_cache_times,"benchmark":b_benchmark,"files":b_files}
print(json.dumps(result["variant"],ensure_ascii=False,indent=2))
'''),
('md', '## 10 Журнал Spark UI и завершение\nREST API текущего приложения сохраняет Jobs и Stages. Скриншоты снимаются до spark.stop. Измерения относятся только к этому стенду и текущим данным.'),
('code', '''save_json("pr4.json",result)
save_json("pr4_jobs.json",ui_data(spark,"/jobs"))
save_json("pr4_stages.json",ui_data(spark,"/stages"))
save_json("pr4_sql.json",ui_data(spark,"/sql"))
checkpoint("pr4_completed",spark,["/jobs/","/stages/","/SQL/","/environment/"])
'''),
('md', '## Выводы и ограничения\nПри интерпретации сопоставляются медианы, планы и UI. Exchange указывает на перераспределение; Coalesce сохраняет перекос. Broadcast меняет механизм JOIN без изменения строк. Цена persist включает материализацию. Рост p создаёт дополнительные задачи и файлы. AQE способен сократить число выходных shuffle partitions.\n\nОграничения: два vCPU одной VM не моделируют сеть физического кластера; JVM/JIT, файловый кэш и фоновые службы влияют на короткие замеры. Причинный эффект способа JOIN нельзя выводить только из одного времени запуска.'),
('code','spark.stop()\nprint("SparkSession stopped")'),
])
