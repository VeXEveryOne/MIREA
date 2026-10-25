"""Build PR5 from the supplied methodological DOCX plus the independent task."""
from pathlib import Path
import ast
import json
from docx import Document

ROOT=Path(__file__).resolve().parent
BD=ROOT.parents[1]


def markdown(text):return {'cell_type':'markdown','metadata':{},'source':text.splitlines(keepends=True)}
def code(text):
    ast.parse(text)
    return {'cell_type':'code','metadata':{},'source':text.splitlines(keepends=True),'execution_count':None,'outputs':[]}


def main():
    document=Document(BD/'ml_labs/assignment/Практика №5.docx')
    blocks=[];current=[];heading=''
    for p in document.paragraphs:
        if p.style.name in ['Код','CodeBlock']:
            if p.text.strip():current.append(p.text)
        else:
            if current:
                source='\n'.join(current).replace('«','"').replace('»','"').replace('\u00a0',' ')
                source=source.replace('"—", color','"-", color')
                blocks.append((heading,source));current=[]
            if p.style.name.startswith('Heading'):heading=p.text
    assert len(blocks)==20
    cells=[markdown('# Практическая работа 5\nМашинное обучение в анализе данных с использованием Spark MLlib\n\nАлбахтин И.В., ИНБО-12-23. Учебная часть: Online Shoppers и Seoul Bike. Самостоятельная часть: Calories. Все обучаемые преобразования подбираются на train; valid служит выбору, test — итоговой проверке.')]
    cells.append(code('''from pathlib import Path
from pyspark.sql import SparkSession
import os,platform,subprocess,hashlib
os.environ['MPLBACKEND']='Agg'
spark=(SparkSession.builder.master('local[*]').appName('TIABD_Practice_5_Albakhtin_IV')
    .config('spark.driver.memory','1536m').config('spark.sql.shuffle.partitions','4')
    .config('spark.sql.session.timeZone','UTC').config('spark.ui.bindAddress','0.0.0.0').getOrCreate())
'''))
    for i,(heading,source) in enumerate(blocks):
        source=source.replace('P6_','P5_')
        if i==0:
            source=source.replace('ROOT / "practice6_data"','ROOT / "work/pr5"').replace('ROOT / "practice6_results"','ROOT / "results/pr5"')
            source=source.replace('WORK.mkdir(exist_ok=True)','WORK.mkdir(parents=True,exist_ok=True)').replace('OUT.mkdir(exist_ok=True)','OUT.mkdir(parents=True,exist_ok=True)')
            source=source.replace('ROOT / "online_shoppers_intention.csv"','ROOT / "data/online_shoppers_intention.csv"').replace('ROOT / "SeoulBikeData.csv"','ROOT / "data/SeoulBikeData.csv"')
            source+='\nMODELS=ROOT/"models/pr5"\nMODELS.mkdir(parents=True,exist_ok=True)\n'
        if i==3:
            source+='\nassert shop_raw.count()==12330 and bike_raw.count()==8760\nassert not any(null_counts(shop_raw).values()) and not any(null_counts(bike_raw).values())\n'
        if i==18:source=source.replace('(OUT / "shop_classifier")','(MODELS / "shop_classifier")').replace('(OUT / "bike_regressor")','(MODELS / "bike_regressor")').replace('(OUT / "shop_kmeans")','(MODELS / "shop_kmeans")')
        if i==19:break
        cells.extend([markdown('## '+heading),code(source)])
    cells.extend([markdown('## 8 Самостоятельная регрессия Calories\nПосле окончания тренировки известны длительность, пульс и температура. User_ID используется для проверки уникальности и разбиения, но исключён из признаков. Два семейства моделей и четыре настройки сравниваются с тренировочным средним только на valid.'),code((ROOT/'pr5_independent.py').read_text(encoding='utf-8'))])
    cells.extend([markdown('## 9 Сохранение результатов и независимые контрольные проверки'),code('''
def rec(df):return [r.asDict(recursive=True) for r in df.collect()]
shop_validation.to_csv(OUT/'classification_validation.csv',index=False)
final_pd.sort_values('row_id').to_csv(OUT/'classification_test_predictions.csv',index=False)
reg_local[['timestamp','label','prediction','residual']].to_csv(OUT/'regression_test_predictions.csv',index=False)
bike_validation.to_csv(OUT/'regression_validation.csv',index=False)
k_table.to_csv(OUT/'kmeans_selection.csv',index=False)
cluster_profiles.toPandas().to_csv(OUT/'cluster_profiles.csv',index=False)
cluster_assignments.orderBy('row_id').toPandas().to_csv(OUT/'cluster_assignments.csv',index=False)
def feature_names(df,col='features'):
    attrs=df.schema[col].metadata.get('ml_attr',{}).get('attrs',{})
    return {a['idx']:a['name'] for group in attrs.values() for a in group}
rf=shop_models['Случайный лес'];fn=feature_names(rf.transform(shop_valid).select('features'))
importance=sorted([{'feature':fn.get(i,str(i)),'importance':float(v)} for i,v in enumerate(rf.stages[-1].featureImportances)],key=lambda x:-x['importance'])
lr=shop_models['Логистическая регрессия'];ln=feature_names(lr.transform(shop_valid),'features_raw')
coefficients=sorted([{'feature':ln.get(i,str(i)),'coefficient':float(v)} for i,v in enumerate(lr.stages[-1].coefficients)],key=lambda x:-abs(x['coefficient']))
fig,ax=plt.subplots(figsize=(8,5));top=importance[:12][::-1];ax.barh([x['feature'] for x in top],[x['importance'] for x in top]);ax.set(title='RF: важность признаков',xlabel='Важность');fig.tight_layout();fig.savefig(OUT/'feature_importance.png',dpi=160);plt.show();plt.close(fig)
loaded_shop=PipelineModel.load(str(MODELS/'shop_classifier'))
roundtrip_shop=binary_scores(loaded_shop,shop_test).exceptAll(shop_test_scores).count()
loaded_bike=PipelineModel.load(str(MODELS/'bike_regressor'))
roundtrip_bike=loaded_bike.transform(bike_test).select('date','hour','prediction').exceptAll(bike_test_prediction.select('date','hour','prediction')).count()
loaded_cluster=PipelineModel.load(str(MODELS/'shop_kmeans'))
roundtrip_cluster=loaded_cluster.transform(shop_raw).select('row_id',F.col('prediction').alias('cluster')).exceptAll(cluster_assignments).count()
assert roundtrip_shop==roundtrip_bike==roundtrip_cluster==0
baseline_valid=binary_metrics(shop_valid.withColumn('score',F.lit(0.0)),ranking=False)
summary={'environment':{'python':platform.python_version(),'spark':spark.version,'master':sc.master,'parallelism':sc.defaultParallelism,'java':subprocess.run(['java','-version'],capture_output=True,text=True).stderr.splitlines()[0]},
 'sources':json.loads((ROOT/'source_manifest.json').read_text()),
 'classification':{'raw_rows':shop_raw.count(),'class_counts':rec(shop_raw.groupBy('Revenue').count()),'split':rec(shop_split.groupBy('split','label').count()),'validation':shop_rows,'selected_model':BEST_SHOP_NAME,'threshold':SHOP_THRESHOLD,'test':binary_metrics(shop_test_scores,SHOP_THRESHOLD),'baseline_valid':baseline_valid,'ablation_with':binary_metrics(shop_valid_predictions['Случайный лес'])['areaUnderPR'],'ablation_without':binary_metrics(without_scores)['areaUnderPR'],'importance':importance,'coefficients':coefficients},
 'regression':{'raw_rows':8760,'working_rows':bike.count(),'split':{name:{'n':df.count(),'start':str(df.agg(F.min('date')).first()[0]),'end':str(df.agg(F.max('date')).first()[0])} for name,df in [('train',bike_train),('valid',bike_valid),('test',bike_test)]},'validation':json.loads(bike_validation.to_json(orient='records')),'selected_model':BEST_BIKE_NAME,'test':regression_metrics(bike_test_prediction),'baseline_test':[{'name':name,**regression_metrics(bike_baseline(bike_test,hour))} for name,hour in [('global',False),('hour',True)]]},
 'clustering':{'rows':shop_raw.count(),'features':CLUSTER_LOG_SOURCE+CLUSTER_RATE,'k_selection':k_rows,'selected_k':BEST_K,'profiles':rec(cluster_profiles),'pca_explained_variance':[float(v) for v in pca_model.explainedVariance]},
 'roundtrip_differences':{'classification':roundtrip_shop,'regression':roundtrip_bike,'kmeans':roundtrip_cluster},'independent':own_summary}
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2,allow_nan=False)+'\\n',encoding='utf-8')
print('SUMMARY SAVED',OUT/'summary.json')
from IPython.display import display, Image as DisplayImage
for saved_plot in sorted(OUT.glob('*.png')):
    display(DisplayImage(filename=str(saved_plot)))
''')])
    cells.extend([markdown('## 10 Освобождение кэша и завершение'),code(blocks[19][1].replace('P6_','P5_')+'\nspark.stop()\nprint("SparkSession stopped")\n')])
    nb={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},'language_info':{'name':'python'}},'cells':cells}
    (ROOT/'Practice_5.ipynb').write_text(json.dumps(nb,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    print('PR5 notebook:',sum(c['cell_type']=='code' for c in cells),'code cells')


if __name__=='__main__':main()
