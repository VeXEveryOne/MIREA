# Independent regression: exercise expenditure, available at workout completion.
own_schema=StructType([StructField('User_ID',LongType(),False),
    StructField('Gender',StringType(),False)]+[
    StructField(name,DoubleType(),False) for name in
    ['Age','Height','Weight','Duration','Heart_Rate','Body_Temp','Calories']])
own_raw=(spark.read.option('header',True).option('mode','FAILFAST')
    .schema(own_schema).csv(str(ROOT/'data/calories.csv')))
assert own_raw.count()==15000
assert own_raw.select('User_ID').distinct().count()==15000
assert not any(null_counts(own_raw).values())
own_num=['Age','Height','Weight','Duration','Heart_Rate','Body_Temp']
own=(own_raw.withColumn('row_id',F.col('User_ID')).withColumn('label',F.col('Calories')))
w=Window.orderBy(F.sha2(F.concat_ws(':',F.col('User_ID').cast('string'),F.lit(str(SEED))),256),'User_ID')
own=(own.withColumn('_rank',F.row_number().over(w)).withColumn('split',
    F.when(F.col('_rank')<=9000,'train').when(F.col('_rank')<=12000,'valid').otherwise('test'))
    .drop('_rank').cache())
own_train=own.filter("split='train'");own_valid=own.filter("split='valid'");own_test=own.filter("split='test'")
assert own_train.select('User_ID').intersect(own_test.select('User_ID')).count()==0
own_key_profile={'rows':own_raw.count(),'distinct_keys':own_raw.select('User_ID').distinct().count(),
    'min':own_raw.agg(F.min('User_ID')).first()[0],'max':own_raw.agg(F.max('User_ID')).first()[0],
    'gender_by_split':[r.asDict() for r in own.groupBy('split','Gender').count().collect()]}
own_distribution=own_train.select(*own_num,'Calories','Gender').toPandas()
own_distribution.describe(include='all').to_csv(OUT/'calories_train_distribution.csv')
fig,axes=plt.subplots(2,4,figsize=(13,6))
for ax,column in zip(axes.flat,own_num+['Calories','Gender']):
    if column=='Gender':own_distribution[column].value_counts().plot.bar(ax=ax)
    else:ax.hist(own_distribution[column],bins=30)
    ax.set(title=column,ylabel='Train rows')
fig.tight_layout();fig.savefig(OUT/'calories_train_distribution.png',dpi=160);plt.show();plt.close(fig)
def own_pipeline(kind,parameter):
    index=StringIndexer(inputCol='Gender',outputCol='gender_idx',handleInvalid='keep')
    encoder=OneHotEncoder(inputCol='gender_idx',outputCol='gender_ohe',handleInvalid='keep',dropLast=False)
    assemble=VectorAssembler(inputCols=own_num+['gender_ohe'],outputCol='features_raw')
    scale=StandardScaler(inputCol='features_raw',outputCol='features',withMean=False,withStd=True)
    if kind=='LINEAR':est=LinearRegression(regParam=float(parameter),maxIter=150,standardization=False)
    else:est=RandomForestRegressor(numTrees=80,maxDepth=int(parameter),minInstancesPerNode=3,seed=SEED)
    return Pipeline(stages=[index,encoder,assemble,scale,est])
own_rows=[];own_models={}
for kind,parameter in [('LINEAR',0.01),('LINEAR',0.1),('RF',8),('RF',12)]:
    name=f'{kind}_{parameter}'
    sc.setJobGroup('P5_OWN_'+name,'Calories: '+name)
    t=perf_counter();model=own_pipeline(kind,parameter).fit(own_train);duration=perf_counter()-t
    own_models[name]=model
    own_rows.append({'model':name,'fit_s':duration,**regression_metrics(model.transform(own_valid))})
own_mean=own_train.agg(F.avg('label')).first()[0]
own_baseline=regression_metrics(own_valid.withColumn('prediction',F.lit(own_mean)))
own_best=min(own_rows,key=lambda x:x['rmse'])['model'];own_model=own_models[own_best]
own_test_pred=own_model.transform(own_test).select('User_ID','label','prediction').cache()
own_test_metrics=regression_metrics(own_test_pred)
own_baseline_test=regression_metrics(own_test.withColumn('prediction',F.lit(own_mean)))
own_model.write().overwrite().save(str(MODELS/'calories_regressor'))
own_reloaded=PipelineModel.load(str(MODELS/'calories_regressor'))
own_reload_error=(own_reloaded.transform(own_test).select('User_ID',F.col('prediction').alias('loaded'))
    .join(own_test_pred,'User_ID').agg(F.max(F.abs(F.col('loaded')-F.col('prediction')))).first()[0])
assert own_reload_error<1e-10
own_local=own_test_pred.orderBy('User_ID').toPandas()
own_local['User_ID']=own_local['User_ID'].map(lambda x:__import__('hashlib').sha256(str(x).encode()).hexdigest()[:16])
own_local.to_csv(OUT/'calories_test_predictions.csv',index=False)
fig,axes=plt.subplots(1,2,figsize=(10,4))
axes[0].scatter(own_local['label'],own_local['prediction'],s=8,alpha=.3)
lo=min(own_local['label'].min(),own_local['prediction'].min());hi=max(own_local['label'].max(),own_local['prediction'].max())
axes[0].plot([lo,hi],[lo,hi],'r--');axes[0].set(xlabel='Факт, ккал',ylabel='Прогноз, ккал',title='Calories: test')
axes[1].hist(own_local['label']-own_local['prediction'],bins=40);axes[1].set(xlabel='Ошибка, ккал',title='Распределение остатков')
fig.tight_layout();fig.savefig(OUT/'calories_test.png',dpi=160);plt.show();plt.close(fig)
own_summary={'rows':15000,'predictors':own_num+['Gender'],'target':'Calories',
    'excluded':['User_ID'],'split':{'train':9000,'valid':3000,'test':3000},
    'validation':own_rows,'baseline_valid':own_baseline,'selected_model':own_best,
    'test':own_test_metrics,'baseline_test':own_baseline_test,'reload_max_error':own_reload_error,
    'key_uniqueness':True,'key_profile':own_key_profile,'forecast_moment':'End of workout; heart rate and temperature are available',
    'nulls':null_counts(own_raw),'schema':own_raw.schema.jsonValue()}
(OUT/'independent.json').write_text(json.dumps(own_summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(own_summary,ensure_ascii=False,indent=2))
own_test_pred.unpersist();own.unpersist()
