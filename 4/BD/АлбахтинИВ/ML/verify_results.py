"""Independent checks of source rows, partitions and exported numerical results."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,math
import numpy as np
import pandas as pd
from sklearn.metrics import silhouette_score,roc_auc_score,precision_recall_curve,auc
from scipy.cluster.hierarchy import fcluster

ROOT=Path(__file__).resolve().parent
def read(n,name='summary.json'):return json.loads((ROOT/f'results/pr{n}'/name).read_text(encoding='utf-8'))
def close(a,b,tol=1e-8):assert math.isclose(float(a),float(b),rel_tol=tol,abs_tol=tol),(a,b)
def regression(frame,column='prediction'):
    y=frame.label.to_numpy();p=frame[column].to_numpy();error=y-p
    return {'rmse':float(np.sqrt(np.mean(error**2))),'mae':float(np.mean(np.abs(error))),'r2':float(1-np.sum(error**2)/np.sum((y-y.mean())**2))}
def metric_check(actual,expected):
    for key in actual:close(actual[key],expected[key])
manifest=json.loads((ROOT/'source_manifest.json').read_text(encoding='utf-8'))
for name,meta in manifest.items():assert hashlib.sha256((ROOT/'data'/name).read_bytes()).hexdigest()==meta['sha256']
for number in [5,6,7]:
    record=read(number,'execution.json');path=ROOT/f'Practice_{number}.ipynb';nb=json.loads(path.read_text(encoding='utf-8'))
    codes=[c for c in nb['cells'] if c['cell_type']=='code']
    assert record['status']=='passed' and record['errors']==0 and record['fresh_kernel'] and record['run_all']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==record['notebook_sha256']
    assert [c['execution_count'] for c in codes]==list(range(1,len(codes)+1))
    assert not [o for c in codes for o in c['outputs'] if o['output_type']=='error']
    figures=[o for c in codes for o in c['outputs'] if 'image/png' in o.get('data',{})]
    assert len(figures)=={5:4,6:5,7:3}[number],(number,len(figures))

from verify_pr5 import verify as verify_pr5
checked5=verify_pr5()

r=read(6);out=ROOT/'results/pr6';raw=pd.read_csv(ROOT/'data/Dry_Bean.csv');X=raw.drop(columns='Class').to_numpy(dtype=float)
mean=X.mean(axis=0);std=X.std(axis=0);assert np.allclose(mean,r['scaler_mean']) and np.allclose(std,r['scaler_scale'])
X=(X-mean)/std;a=pd.read_csv(out/'assignments.csv');assert len(a)==13611 and a.row_id.tolist()==list(range(1,13612))
assert a.reference_class.tolist()==raw.Class.tolist();assert np.isfinite(a[['tsne1','tsne2']]).all().all()
sample=np.array(r['sample_row_ids'])-1;assert len(sample)==len(set(sample))==4000
assert np.array_equal(sample,np.sort(np.random.default_rng(42).choice(len(X),4000,replace=False)))
for row in r['comparison']:
    labels=a[row['algorithm']].to_numpy();keep=labels[sample]>=0
    close(silhouette_score(X[sample][keep],labels[sample][keep]),row['silhouette'])
    assert int(np.sum(labels<0))==row['noise'];close(np.mean(labels>=0),row['coverage'])
tree=pd.read_csv(out/'hierarchy_linkage.csv').to_numpy();assert tree.shape==(13610,4)
assert np.array_equal(fcluster(tree,t=r['selected_k'],criterion='maxclust')-1,a.Ward)
assert r['selected_k']==max(r['kmeans'],key=lambda x:x['silhouette'])['k']
eligible=[x for x in r['dbscan_grid'] if x['coverage']>=.8 and x['clusters']>=2 and x['silhouette'] is not None]
assert r['selected_dbscan']==max(eligible,key=lambda x:(x['silhouette'],x['coverage']))
checked6={'full_rows':len(a),'full_hierarchy_merges':len(tree),'silhouettes_recomputed':3,'fixed_sample_rows':len(sample),'class_excluded':('Class' not in r['quality']['features']),'roundtrip_equal':r['roundtrip_equal']}

r=read(7);out=ROOT/'results/pr7';raw=pd.read_csv(ROOT/'data/podcast_dataset.csv');data=raw.drop_duplicates().dropna(subset=['Listening_Time_minutes']).reset_index(drop=True)
split=pd.read_csv(out/'split.csv');assert len(split)==len(data)==44868 and split.row_index.is_unique
parts={name:data.loc[split.loc[split.split==name,'row_index']] for name in ['train','valid','test']}
groups={k:set(v.Podcast_Name) for k,v in parts.items()}
assert not (groups['train']&groups['valid'] or groups['train']&groups['test'] or groups['valid']&groups['test'])
for name,frame in parts.items():assert len(frame)==r['split'][name]['rows'] and groups[name]==set(r['split'][name]['groups'])
columns=['Episode_Length_minutes','Host_Popularity_percentage','Guest_Popularity_percentage','Number_of_Ads']
assert np.allclose(parts['train'][columns].median(),r['numeric_train_medians'])
p=pd.read_csv(out/'test_predictions.csv');assert set(p.row_index)==set(parts['test'].index)
assert np.allclose(p.label,data.loc[p.row_index,'Listening_Time_minutes'])
for row in r['test']:metric_check(regression(p,row['algorithm']),row)
assert np.allclose(p['mean'],parts['train'].Listening_Time_minutes.mean())
for kind in ['bagging','boosting']:
    best=min([v for v in r['validation'] if v['algorithm']==kind],key=lambda x:x['rmse'])
    row=next(x for x in r['test'] if x['algorithm']==kind);assert row['parameters']==best['parameters'];close(np.median(row['fit_times']),row['fit_median'])
assert r['roundtrip_equal']
checked7={'retained_rows':len(data),'test_rows':len(p),'disjoint_groups':{k:len(v) for k,v in groups.items()},'test_metrics_recomputed':4,'train_medians_recomputed':True,'google_colab':r['environment']['google_colab']}
for number,detail in [(5,checked5),(6,checked6),(7,checked7)]:
    result={'status':'passed','verified_utc':datetime.now(timezone.utc).isoformat(),'notebook_sha256':read(number,'execution.json')['notebook_sha256'],'checks':detail}
    (ROOT/f'results/pr{number}/verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(number,json.dumps(result,ensure_ascii=False))

cloud_dir=ROOT/'results/pr7/colab'
if cloud_dir.exists():
    cloud=json.loads((cloud_dir/'cloud_execution.json').read_text(encoding='utf-8'))
    cloud_summary=json.loads((cloud_dir/'summary.json').read_text(encoding='utf-8'))
    notebook=json.loads((ROOT/'Practice_7.ipynb').read_text(encoding='utf-8'))
    code=[''.join(c['source']).strip() for c in notebook['cells'] if c['cell_type']=='code']
    assert [hashlib.sha256(c.encode()).hexdigest() for c in code]==cloud['source_cell_sha256']
    assert cloud['status']=='passed' and cloud['google_colab'] and cloud_summary['environment']['google_colab']
    assert cloud['calculation_execution_counts']==[1,2,3,4,5] and cloud['export_cell']==6
    assert cloud['source_csv_sha256']==manifest['podcast_dataset.csv']['sha256']
    assert cloud_summary['split']==r['split']
    cloud_split=pd.read_csv(cloud_dir/'split.csv');assert cloud_split.equals(split)
    predictions=pd.read_csv(cloud_dir/'test_predictions.csv')
    assert np.array_equal(predictions.row_index,p.row_index)
    assert np.allclose(predictions.label,data.loc[predictions.row_index,'Listening_Time_minutes'])
    max_difference=0.
    for row in cloud_summary['test']:
        name=row['algorithm'];metric_check(regression(predictions,name),row)
        max_difference=max(max_difference,float(np.max(np.abs(predictions[name]-p[name]))))
        if name in ['bagging','boosting']:
            close(np.median(row['fit_times']),row['fit_median'])
            best=min([v for v in cloud_summary['validation'] if v['algorithm']==name],key=lambda x:x['rmse'])
            assert best['parameters']==row['parameters']
    assert np.allclose(parts['train'][columns].median(),cloud_summary['numeric_train_medians'])
    result={'status':'passed','verified_utc':datetime.now(timezone.utc).isoformat(),
        'google_colab':True,'calculation_cells_match_vm':5,'source_csv_sha256':cloud['source_csv_sha256'],
        'test_metrics_recomputed':4,'same_split_as_vm':True,'max_prediction_difference_vs_vm':max_difference,
        'source_cell_sha256':cloud['source_cell_sha256']}
    (cloud_dir/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Colab',json.dumps(result,ensure_ascii=False))
