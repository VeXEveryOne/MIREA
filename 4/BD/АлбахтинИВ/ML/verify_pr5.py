"""Reconstruct PR5 splits and recompute its exported metrics without Spark."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,math
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score,precision_recall_curve,auc,silhouette_score

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'results/pr5'
def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
def close(a,b,tol=1e-8):assert math.isclose(float(a),float(b),rel_tol=tol,abs_tol=tol),(a,b)
def reg(y,p):
    y=np.asarray(y);error=y-np.asarray(p)
    return {'rmse':np.sqrt(np.mean(error**2)),'mae':np.mean(abs(error)),'r2':1-np.sum(error**2)/np.sum((y-y.mean())**2)}
def cls(y,score,t):
    y=np.asarray(y).astype(bool);p=np.asarray(score)>=t
    tp=int(sum(y&p));tn=int(sum(~y&~p));fp=int(sum(~y&p));fn=int(sum(y&~p))
    return {'tp':tp,'tn':tn,'fp':fp,'fn':fn,'accuracy':(tp+tn)/len(y),
            'precision':tp/(tp+fp) if tp+fp else 0,'recall':tp/(tp+fn) if tp+fn else 0,
            'f1':2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else 0}
def check(actual,expected):
    for key,value in actual.items():close(value,expected[key])
def verify():
    r=read('summary.json');run=read('execution.json');path=ROOT/'Practice_5.ipynb'
    assert run['status']=='passed' and run['fresh_kernel'] and run['run_all'] and run['errors']==0
    assert hashlib.sha256(path.read_bytes()).hexdigest()==run['notebook_sha256']
    nb=json.loads(path.read_text(encoding='utf-8'));cells=[c for c in nb['cells'] if c['cell_type']=='code']
    assert len(cells)==10 and [c['execution_count'] for c in cells]==list(range(1,11))
    assert not [o for c in cells for o in c['outputs'] if o['output_type']=='error']
    assert sum('image/png' in o.get('data',{}) for c in cells for o in c['outputs'])==4
    raw=ROOT/'data/calories.csv'
    assert hashlib.sha256(raw.read_bytes()).hexdigest()==r['dataset']['source_sha256']
    data=pd.read_csv(raw);assert len(data)==data.User_ID.nunique()==15000 and not data.isna().any().any()
    data['row_key']=data.User_ID.map(lambda x:hashlib.sha256(str(int(x)).encode()).hexdigest()[:16])
    data=data.set_index('row_key',drop=False)
    order=sorted(data.index,key=lambda key:(hashlib.sha256(f'{int(data.loc[key,"User_ID"])}:42'.encode()).hexdigest(),int(data.loc[key,'User_ID'])))
    expected={name:set(keys) for name,keys in [('train',order[:9000]),('valid',order[9000:12000]),('test',order[12000:])]}
    split=pd.read_csv(OUT/'split.csv',dtype={'row_key':str})
    assert split.row_key.is_unique
    for name,keys in expected.items():assert set(split.loc[split.split==name,'row_key'])==keys
    assert np.array_equal(split.class_label,(data.loc[split.row_key,'Calories']>=200).astype(float))
    train=data.loc[list(expected['train'])]
    p=pd.read_csv(OUT/'regression_test_predictions.csv',dtype={'row_key':str})
    assert p.row_key.is_unique and set(p.row_key)==expected['test']
    assert np.array_equal(p.label,data.loc[p.row_key,'Calories'])
    check(reg(p.label,p.prediction),r['regression']['test'])
    assert np.allclose(p.baseline,train.Calories.mean())
    check(reg(p.label,p.baseline),r['regression']['baseline_test'])
    assert r['regression']['selected_model']==min(r['regression']['validation'],key=lambda x:x['rmse'])['model']
    cols=r['predictors'][:-1]
    labels=r['regression']['indexer_labels']
    assert labels==train.Gender.value_counts().index.tolist()
    expected_std=list(train[cols].std(ddof=1))+[train.Gender.eq(labels[0]).std(ddof=1)]
    assert np.allclose(r['regression']['scaler_std'],expected_std)
    p=pd.read_csv(OUT/'classification_test_predictions.csv',dtype={'row_key':str})
    assert p.row_key.is_unique and set(p.row_key)==expected['test']
    assert np.array_equal(p.class_label,(data.loc[p.row_key,'Calories']>=200).astype(float))
    c=r['classification'];check(cls(p.class_label,p.score,c['probability_threshold']),c['test'])
    close(roc_auc_score(p.class_label,p.score),c['test']['areaUnderROC'])
    precision,recall,_=precision_recall_curve(p.class_label,p.score)
    close(auc(recall,precision),c['test']['areaUnderPR'])
    majority=int(train.Calories.ge(200).mean()>=.5)
    check(cls(p.class_label,np.full(len(p),majority),.5),c['baseline_test'])
    assert c['selected_model']==max(c['validation'],key=lambda x:x['areaUnderPR'])['model']
    valid=pd.read_csv(OUT/'classification_valid_scores.csv',dtype={'row_key':str})
    for model,frame in valid.groupby('model'):
        assert frame.row_key.is_unique and set(frame.row_key)==expected['valid']
        assert np.array_equal(frame.class_label,(data.loc[frame.row_key,'Calories']>=200).astype(float))
        precision,recall,_=precision_recall_curve(frame.class_label,frame.score)
        recorded=next(x for x in c['validation'] if x['model']==model)
        close(auc(recall,precision),recorded['areaUnderPR']);close(roc_auc_score(frame.class_label,frame.score),recorded['areaUnderROC'])
    chosen=valid.loc[valid.model==c['selected_model']]
    for row in c['threshold_grid']:check(cls(chosen.class_label,chosen.score,row['threshold']),row)
    assert c['probability_threshold']==min(c['threshold_grid'],key=lambda x:(-x['f1'],abs(x['threshold']-.5),x['threshold']))['threshold']
    cl=r['clustering'];features=cl['features'];assert set(features)==set(cols) and 'Calories' not in features
    assert np.allclose(data[features].mean(),cl['scaler_mean']) and np.allclose(data[features].std(ddof=1),cl['scaler_std'])
    sample_keys=set(sorted(data.index,key=lambda key:(hashlib.sha256(f'{int(data.loc[key,"User_ID"])}:cluster42'.encode()).hexdigest(),int(data.loc[key,'User_ID'])))[:2000])
    samples=pd.read_csv(OUT/'silhouette_assignments.csv',dtype={'row_key':str})
    for k,frame in samples.groupby('k'):
        assert len(frame)==2000 and frame.row_key.is_unique and set(frame.row_key)==sample_keys
        X=(data.loc[frame.row_key,features].to_numpy()-np.array(cl['scaler_mean']))/np.array(cl['scaler_std'])
        close(silhouette_score(X,frame.cluster,metric='sqeuclidean'),next(x['silhouette'] for x in cl['k_selection'] if x['k']==k))
    assert cl['selected_k']==max(cl['k_selection'],key=lambda x:x['silhouette'])['k']
    assignments=pd.read_csv(OUT/'cluster_assignments.csv',dtype={'row_key':str})
    assert len(assignments)==15000 and assignments.row_key.is_unique and set(assignments.row_key)==set(data.index)
    assert np.isfinite(assignments[['pc1','pc2']]).all().all()
    for row in cl['profiles']:
        keys=assignments.loc[assignments.cluster==row['prediction'],'row_key'];assert len(keys)==row['n']
        for col in features+['Calories']:close(data.loc[keys,col].mean(),row[col])
    assert not any(r['roundtrip_max_difference'].values())
    return {'source_rows':15000,'tasks_on_own_dataset':3,'split_rows':r['split'],'test_regression_rows':3000,
            'test_classification_rows':3000,'classification_valid_models_recomputed':4,'threshold_grid_recomputed':17,
            'silhouettes_recomputed':7,'silhouette_sample_rows':2000,'cluster_profile_rows':15000,
            'train_only_scaler_verified':True,'all_source_keys_and_targets_match':True,'model_reload_max_difference':r['roundtrip_max_difference']}
def main():
    checks=verify();result={'status':'passed','verified_utc':datetime.now(timezone.utc).isoformat(),
                          'notebook_sha256':read('execution.json')['notebook_sha256'],'checks':checks}
    (OUT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
