"""Recompute experiment evidence from the immutable data and saved predictions.

Run in the pinned ML environment. Refit both selected models independently;
do not replace the notebook's original measurements or claim a Colab run.
"""
from ast import literal_eval
from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from statistics import median
from zipfile import ZipFile
import json
import math

import nbformat
import numpy as np
import pandas as pd
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import BaggingClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.tree import DecisionTreeClassifier
from threadpoolctl import threadpool_limits

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / 'outputs'
checks = []


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)


def close(actual, expected):
    return math.isclose(float(actual), float(expected), rel_tol=1e-11, abs_tol=1e-12)


def verify():
    results_path = OUTPUT / 'results.json'
    r = json.loads(results_path.read_text(encoding='utf-8'))
    archive = HERE / 'data/steel_plates_faults.zip'
    check('Archive SHA-256', sha256(archive.read_bytes()).hexdigest() == r['source']['archive_sha256'])
    with ZipFile(archive) as z:
        raw = z.read('Faults.NNA')
        names = z.read('Faults27x7_var').decode().split()
    check('Table SHA-256', sha256(raw).hexdigest() == r['source']['table_sha256'])
    data = pd.read_csv(BytesIO(raw), sep=r'\s+', header=None, names=names)
    X = data.iloc[:, :27].astype(float)
    target = data.iloc[:, 27:]
    labels = list(target.columns)
    y = np.argmax(target.to_numpy(), axis=1)
    check('Shape and target separation', data.shape == (1941, 34) and list(X.columns) == r['source']['features']
          and not set(X.columns).intersection(labels))
    check('One-hot target and finite complete features', target.isin([0, 1]).all().all()
          and target.sum(axis=1).eq(1).all() and not data.isna().any().any()
          and np.isfinite(X.to_numpy()).all())
    check('Class counts', {label: int((y == i).sum()) for i, label in enumerate(labels)} == r['source']['class_counts'])
    check('No duplicate input rows', not X.duplicated().any() and not data.duplicated().any())
    split = r['split']
    train = np.array(split['train_indices'])
    test = np.array(split['test_indices'])
    check('Complete disjoint split', len(train) == split['train_rows'] == 1552
          and len(test) == split['test_rows'] == 389
          and len(set(train)) == len(train) and len(set(test)) == len(test)
          and set(train).isdisjoint(test) and set(train) | set(test) == set(range(len(data))))
    expected_train, expected_test = train_test_split(np.arange(len(X)), test_size=.2, stratify=y,
                                                    random_state=split['seed'])
    check('Seeded stratified split exactly reproduced', np.array_equal(train, expected_train)
          and np.array_equal(test, expected_test))
    hashes = pd.util.hash_pandas_object(X, index=False).to_numpy()
    check('No feature duplicate across holdout', set(hashes[train]).isdisjoint(hashes[test]))
    folds = list(StratifiedKFold(n_splits=3, shuffle=True, random_state=split['seed']).split(X.iloc[train], y[train]))
    check('CV uses training data only', all(set(train[a]).isdisjoint(test) and set(train[b]).isdisjoint(test)
          and set(a).isdisjoint(b) and len(a) + len(b) == len(train) for a, b in folds))
    check('Recorded one-thread execution', r['environment']['thread_limit'] == 1
          and bool(r['environment']['training_threadpools'])
          and all(p['num_threads'] == 1 for p in r['environment']['training_threadpools']))
    check('Pinned scikit-learn version', sklearn.__version__ == r['environment']['sklearn'])
    metrics = {m['algorithm']: m for m in r['metrics']}
    searches = {s['algorithm']: s for s in r['search']}
    constructors = {
        'Bagging': BaggingClassifier(estimator=DecisionTreeClassifier(random_state=split['seed']),
            n_estimators=80, max_samples=.8, bootstrap=True, n_jobs=1, random_state=split['seed']),
        'Boosting': GradientBoostingClassifier(learning_rate=.1, subsample=1., random_state=split['seed'])}
    for name, model in constructors.items():
        saved = pd.read_csv(OUTPUT / f'predictions_{name.lower()}.csv')
        check(f'{name}: prediction rows and truth', len(saved) == len(test)
              and np.array_equal(saved.source_row, test) and np.array_equal(saved.true_class, y[test])
              and saved.predicted_class.isin(range(7)).all())
        prediction = saved.predicted_class.to_numpy()
        recomputed = {'accuracy': accuracy_score(y[test], prediction),
            'balanced_accuracy': balanced_accuracy_score(y[test], prediction),
            'test_f1_macro': f1_score(y[test], prediction, average='macro')}
        check(f'{name}: aggregate test metrics', all(close(value, metrics[name][key]) for key, value in recomputed.items()))
        matrix = confusion_matrix(y[test], prediction, labels=range(7))
        check(f'{name}: complete confusion matrix', matrix.tolist() == r['confusion_matrices'][name])
        report = classification_report(y[test], prediction, labels=range(7), target_names=labels,
                                       output_dict=True, zero_division=0)
        check(f'{name}: per-class metrics', all(close(value, r['per_class'][name][label][key])
              for label in labels for key, value in report[label].items()))
        timing = r['measurements'][name]
        check(f'{name}: raw timing series', len(timing) == 3 and [t['repeat'] for t in timing] == [1, 2, 3]
              and all(t['fit_seconds'] > 0 and t['predict_seconds'] > 0 for t in timing))
        check(f'{name}: timing summary', close(median(t['fit_seconds'] for t in timing), metrics[name]['fit_median_seconds'])
              and close(min(t['fit_seconds'] for t in timing), metrics[name]['fit_min_seconds'])
              and close(max(t['fit_seconds'] for t in timing), metrics[name]['fit_max_seconds'])
              and close(median(t['predict_seconds'] for t in timing), metrics[name]['predict_median_seconds']))
        cv = pd.read_csv(OUTPUT / f'cv_{name.lower()}.csv')
        best = cv.loc[cv.mean_test_score.idxmax()]
        check(f'{name}: CV selection from four candidates', len(cv) == searches[name]['candidates'] == 4
              and close(best.mean_test_score, searches[name]['best_cv_f1_macro'])
              and close(best.std_test_score, searches[name]['cv_std'])
              and literal_eval(best.params) == searches[name]['best_params'])
        for _, row in cv.iterrows():
            scores = [row[f'split{i}_test_score'] for i in range(3)]
            check(f'{name}: CV fold aggregation {int(row.name)}', close(np.mean(scores), row.mean_test_score)
                  and close(np.std(scores), row.std_test_score))
        # A fresh estimator, outside the notebook, must reproduce every saved
        # test prediction and the reported training score at the selected settings.
        model.set_params(**searches[name]['best_params'])
        with threadpool_limits(limits=1):
            model.fit(X.iloc[train], y[train])
            if name == 'Bagging':
                check('Bagging: 80 trees and 1 241 bootstrap draws each', len(model.estimators_) == 80
                      and all(len(sample) == int(.8 * len(train)) for sample in model.estimators_samples_))
            else:
                check('Boosting: 160 stages and seven trees per stage', model.n_estimators_ == 160
                      and model.estimators_.shape == (160, 7))
            check(f'{name}: independent refit reproduces predictions', np.array_equal(model.predict(X.iloc[test]), prediction))
            check(f'{name}: training F1', close(f1_score(y[train], model.predict(X.iloc[train]), average='macro'), metrics[name]['train_f1_macro']))
    for name, model in [('Most frequent', DummyClassifier(strategy='most_frequent')),
                        ('One tree', DecisionTreeClassifier(max_depth=8, min_samples_leaf=2, random_state=split['seed']))]:
        model.fit(X.iloc[train], y[train])
        prediction = model.predict(X.iloc[test])
        baseline = next(b for b in r['baselines'] if b['algorithm'] == name)
        check(f'{name}: baseline reproduction', close(accuracy_score(y[test], prediction), baseline['accuracy'])
              and close(f1_score(y[test], prediction, average='macro'), baseline['test_f1_macro']))
    notebook = HERE / 'Ансамблевое_обучение_АлбахтинИВ.ipynb'
    nb = nbformat.read(notebook, as_version=4)
    code = [c for c in nb.cells if c.cell_type == 'code']
    check('All seven code cells executed', len(code) == 7 and [c.execution_count for c in code] == list(range(1, 8)))
    check('Notebook contains no execution errors', all(o.output_type != 'error' for c in code for o in c.outputs))
    stdout = ''.join(o.get('text', '') for c in code for o in c.outputs if o.output_type == 'stream')
    check('Notebook terminal marker', 'ALL CELLS COMPLETED; results.json saved' in stdout)
    files = [archive, notebook, results_path] + sorted(p for p in OUTPUT.iterdir() if p.suffix in ('.csv', '.png'))
    evidence = {'verified_at': datetime.now(timezone.utc).isoformat(), 'local_checks_passed': len(checks),
        'checks': checks, 'source_execution': r['executed_at'],
        'artifacts_sha256': {str(p.relative_to(HERE)): sha256(p.read_bytes()).hexdigest() for p in files},
        'colab_execution_proven': r['environment']['location'] == 'Google Colab',
        'group_uniqueness_proven': False,
        'pending_external_evidence': ['Подтверждение уникальности датасета в группе', 'Исполнение в Google Colab']}
    (OUTPUT / 'verification.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(checks)} independent local checks passed; external conditions remain explicitly unverified')


if __name__ == '__main__':
    verify()
