"""Measurement helpers. All metrics are collected from the running Spark UI."""
from pathlib import Path
from time import perf_counter, sleep
import json
import os
import platform
import subprocess
import urllib.request

ROOT = Path.cwd()

def environment(spark):
    return {'python': platform.python_version(), 'java': subprocess.run(['java', '-version'], capture_output=True, text=True).stderr.splitlines()[0], 'spark': spark.version, 'os': platform.platform(), 'cpu': subprocess.run(['lscpu'], capture_output=True, text=True).stdout, 'memory': subprocess.run(['free', '-h'], capture_output=True, text=True).stdout, 'master': spark.sparkContext.master, 'parallelism': spark.sparkContext.defaultParallelism, 'shuffle_partitions': spark.conf.get('spark.sql.shuffle.partitions'), 'aqe': spark.conf.get('spark.sql.adaptive.enabled'), 'ui': spark.sparkContext.uiWebUrl}

def save_json(name, value):
    path = ROOT / 'results' / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str), encoding='utf-8')

def records(df):
    return [r.asDict(recursive=True) for r in df.collect()]

def schema_signature(df):
    return [(f.name, f.dataType.simpleString()) for f in df.schema.fields]

def plan(df, name):
    text = df._sc._jvm.PythonSQLUtils.explainString(df._jdf.queryExecution(), 'formatted')
    directory = ROOT / 'results' / 'plans'
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f'{name}.txt').write_text(text, encoding='utf-8')
    print(text)
    return text

def ui_data(spark, suffix):
    with urllib.request.urlopen(spark.sparkContext.uiWebUrl + '/api/v1/applications/' + spark.sparkContext.applicationId + suffix) as response:
        return json.load(response)

def measured(spark, group, action):
    spark.sparkContext.setJobGroup(group, group, interruptOnCancel=True)
    before = set(spark.sparkContext.statusTracker().getJobIdsForGroup(group))
    t = perf_counter()
    value = action()
    seconds = perf_counter() - t
    jobs = sorted(set(spark.sparkContext.statusTracker().getJobIdsForGroup(group)) - before)
    # Fetch completed stage counters, never duplicate a stage shared by jobs.
    all_jobs = {x['jobId']: x for x in ui_data(spark, '/jobs')}
    stages = sorted({s for j in jobs for s in all_jobs[j]['stageIds']})
    all_stages = ui_data(spark, '/stages')
    completed = [s for s in all_stages if s['stageId'] in stages and s['status'] == 'COMPLETE']
    metric = {'seconds': seconds, 'jobs': jobs, 'stages': stages, 'tasks': sum(s.get('numCompleteTasks', 0) for s in completed), 'shuffle_read': sum(s.get('shuffleReadBytes', 0) for s in completed), 'shuffle_write': sum(s.get('shuffleWriteBytes', 0) for s in completed), 'stage_metrics': [{k:s.get(k) for k in ['stageId','numTasks','numCompleteTasks','inputBytes','outputBytes','shuffleReadBytes','shuffleWriteBytes']} for s in completed]}
    print(group, json.dumps(metric, ensure_ascii=False))
    return value, metric

def checkpoint(name, spark, urls=None):
    """Optional capture rendezvous; standard Run All never pauses for screenshots."""
    if os.environ.get('TIABD_CAPTURE') != '1':
        return
    directory = ROOT / 'capture_requests'
    directory.mkdir(exist_ok=True)
    path = directory / f'{name}.json'
    done = directory / f'{name}.done'
    if done.exists():
        done.unlink()
    path.write_text(json.dumps({'name': name, 'app': spark.sparkContext.applicationId, 'urls': urls or ['/jobs/', '/stages/', '/SQL/'], 'ui': spark.sparkContext.uiWebUrl}), encoding='utf-8')
    print('SCREENSHOT CHECKPOINT', name, flush=True)
    t = perf_counter()
    while not done.exists():
        if perf_counter() - t > 900:
            raise TimeoutError('Screenshot checkpoint not acknowledged: ' + name)
        sleep(1)
