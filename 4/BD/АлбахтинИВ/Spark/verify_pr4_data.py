"""Cross-check completed Spark experiments against SQLite and saved UI counters."""
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
import csv
import hashlib
import json
import math
import sqlite3

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parent


def main():
    read = lambda name: json.loads((ROOT / 'results' / name).read_text())
    r = read('pr4.json')
    run = read('pr4_execution.json')
    assert run['status'] == 'passed' and run['errors'] == 0 and run['fresh_kernel']
    assert run['notebook_sha256'] == hashlib.sha256((ROOT/'Practice_4.ipynb').read_bytes()).hexdigest()
    con = sqlite3.connect(ROOT/'data/ecommerce.sqlite')
    con.row_factory = sqlite3.Row
    for name, item in r['inputs'].items():
        assert con.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0] == item['rows']
    states = [dict(row) for row in con.execute('SELECT geolocation_state, COUNT(*) AS count '
              'FROM geolocation GROUP BY geolocation_state ORDER BY count DESC LIMIT 5')]
    assert states == r['state_top']
    sellers = [dict(row) for row in con.execute('SELECT seller_id,COUNT(*) AS items,'
               'ROUND(SUM(price),2) AS revenue,ROUND(AVG(price),2) AS avg_price '
               'FROM order_items GROUP BY seller_id ORDER BY revenue DESC LIMIT 5')]
    assert sellers == r['seller_top']
    groups = [dict(row) for row in con.execute('SELECT s.seller_state,COUNT(*) AS lines,'
              'ROUND(SUM(i.price+i.freight_value),2) AS gross '
              'FROM order_items i JOIN sellers s ON s.seller_id=i.seller_id '
              'WHERE i.price>0 GROUP BY s.seller_state ORDER BY gross DESC')]
    assert groups == r['variant']['groups']
    with (ROOT/'exports/pr4_variant.csv').open(newline='', encoding='utf-8') as stream:
        csv_rows = list(csv.DictReader(stream))
    parquet_rows = pq.read_table(ROOT/'exports/pr4_variant_parquet').to_pylist()
    expected = {row['seller_state']:row for row in groups}
    for exported in [csv_rows, parquet_rows]:
        assert len(exported) == len(expected)
        assert {row['seller_state'] for row in exported} == set(expected)
        for row in exported:
            match = expected[row['seller_state']]
            assert int(row['lines']) == match['lines']
            assert math.isclose(float(row['gross']),match['gross'],abs_tol=1e-8,rel_tol=0)
    assert sum(row['lines'] for row in groups) == r['variant']['join_rows'] == 112650
    gross = con.execute('SELECT SUM(price+freight_value) FROM order_items').fetchone()[0]
    for value in [*r['cache']['checksums'], *r['variant']['cache']['checksums']]:
        assert abs(value - gross) < .01
    for profile in [r['input_profile'], *r['profiles'].values()]:
        sizes = [row['count'] for row in profile['sizes']]
        assert len(sizes) == profile['partitions']
        assert sum(sizes) == 1000163
        assert profile['min'] == min(sizes) and profile['max'] == max(sizes)
        assert math.isclose(profile['mean'], sum(sizes)/len(sizes))
    for profile in r['variant']['profiles'].values():
        assert len(profile['sizes']) == profile['partitions']
        assert sum(row['count'] for row in profile['sizes']) == 112650
    expected = math.fsum(math.sqrt(i+1.0) for i in range(2000000))
    for row in r['benchmark']:
        assert len(row['times']) == 3 and row['median'] == median(row['times'])
        assert all(math.isclose(value, expected, rel_tol=1e-12) for value in row['checksum'])
        assert math.isclose(row['speedup'], r['benchmark'][0]['median']/row['median'])
    for row in r['variant']['benchmark']:
        assert len(row['times']) == 3 and row['median'] == median(row['times'])
    for row in [*r['small_files'], *r['variant']['files']]:
        tag = f'items_{row["p"]}' if row in r['small_files'] else f'variant_{row["p"]}'
        files = list((ROOT/'small_files_experiment'/tag).glob('part-*.parquet'))
        assert len(files) == row['files'] == row['p']
        total = sum(f.stat().st_size for f in files)
        assert math.isclose(total/1024**2, row['total_mib'])
        assert math.isclose(total/len(files)/1024, row['mean_kib'])
    jobs = {row['jobId']: row for row in read('pr4_jobs.json')}
    stages = {row['stageId']: row for row in read('pr4_stages.json') if row['status'] == 'COMPLETE'}
    assert all(row['status'] == 'SUCCEEDED' for row in jobs.values())
    for metric in [*r['metrics'].values(), r['variant']['smj'], r['variant']['bhj'], r['variant']['groupby']]:
        assert all(job in jobs for job in metric['jobs'])
        used = [stages[sid] for sid in metric['stages'] if sid in stages]
        assert sum(s['numCompleteTasks'] for s in used) == metric['tasks']
        assert sum(s.get('shuffleReadBytes',0) for s in used) == metric['shuffle_read']
        assert sum(s.get('shuffleWriteBytes',0) for s in used) == metric['shuffle_write']
    assert not r['cache']['after_unpersist']['is_cached']
    assert not r['cache']['after_unpersist']['storage']
    assert not r['variant']['cache']['after_unpersist']
    assert r['lazy']['before'] == r['lazy']['after_transform'] == []
    assert r['lazy']['after_action'] and r['variant']['lazy']['after_action']
    for name, operator in [('smj','SortMergeJoin'), ('bhj','BroadcastHashJoin'),
                           ('b_smj','SortMergeJoin'), ('b_bhj','BroadcastHashJoin'),
                           ('aqe_final','AdaptiveSparkPlan')]:
        assert operator in (ROOT/f'results/plans/{name}.txt').read_text()
    record = {'status':'passed', 'checked_utc':datetime.now(timezone.utc).isoformat(),
              'sqlite_tables':len(r['inputs']), 'state_top_matches':True,
              'seller_top_matches':True, 'variant_groups_matches':len(groups),
              'export_rows_csv_parquet':len(groups),
              'gross_checksum':gross, 'synthetic_checksum':expected,
              'profile_empty_partitions_included':True, 'files_verified':True,
              'job_stage_counters_match_rest':True, 'cache_released':True,
              'jobs':len(jobs), 'completed_stages':len(stages),
              'sql_executions':len(read('pr4_sql.json'))}
    (ROOT/'results/pr4_data_verification.json').write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps(record), flush=True)


if __name__ == '__main__':
    main()
