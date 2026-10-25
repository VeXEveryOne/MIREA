"""Capture the running PR4 application between experiments, outside timings."""
from pathlib import Path
import base64
import json
import os
import subprocess
import tempfile
import time
import urllib.request


def capture_view(url, target, focus=None):
    """Capture a full browser viewport, scrolling the real page to a JOIN node."""
    import websocket
    with tempfile.TemporaryDirectory(prefix='tiabd-pr4-browser-', ignore_cleanup_errors=True) as profile:
        process = subprocess.Popen(['/usr/bin/google-chrome', '--headless', '--no-sandbox',
                                    '--disable-dev-shm-usage', '--disable-gpu',
                                    '--hide-scrollbars', '--remote-debugging-port=0',
                                    '--remote-allow-origins=*', '--window-size=1000,800',
                                    f'--user-data-dir={profile}', 'about:blank'],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            port_file = Path(profile)/'DevToolsActivePort'
            for _ in range(100):
                if port_file.exists():
                    break
                time.sleep(.1)
            port = int(port_file.read_text().splitlines()[0])
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list') as response:
                tab = next(t for t in json.load(response) if t['type'] == 'page')
            ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=30,
                                               suppress_origin=True)
            sequence = 0

            def call(method, params=None):
                nonlocal sequence
                sequence += 1
                ws.send(json.dumps({'id':sequence, 'method':method, 'params':params or {}}))
                while True:
                    message = json.loads(ws.recv())
                    if message.get('id') == sequence:
                        if 'error' in message:
                            raise RuntimeError(message['error'])
                        return message.get('result', {})

            call('Page.enable')
            call('Page.navigate', {'url':url})
            for _ in range(100):
                ready = call('Runtime.evaluate', {'expression':'document.readyState'})
                if ready.get('result', {}).get('value') == 'complete':
                    break
                time.sleep(.1)
            time.sleep(.5)
            call('Runtime.evaluate', {'expression':"document.body.style.zoom='1.15'"})
            if focus:
                expression = '''(() => {
                    const needle = %s;
                    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                    let node;
                    while (node = walk.nextNode()) {
                        if (node.textContent.includes(needle) &&
                            node.parentElement.getBoundingClientRect().height > 0) {
                            node.parentElement.scrollIntoView({block:'center', inline:'center'});
                            return true;
                        }
                    }
                    return false;
                })()''' % json.dumps(focus)
                located = call('Runtime.evaluate', {'expression':expression})
                assert located['result']['value'], f'JOIN label is not visible: {focus}'
            time.sleep(.3)
            shot = call('Page.captureScreenshot', {'format':'png', 'fromSurface':True,
                                                   'captureBeyondViewport':False})
            target.write_bytes(base64.b64decode(shot['data']))
            ws.close()
        finally:
            process.terminate()
            process.wait(timeout=15)


def checkpoint(name, spark, urls=None):
    if os.environ.get('TIABD_AUTOCAPTURE') != '1':
        return
    root = Path.cwd()
    output = root / 'screenshots/pr4'
    output.mkdir(parents=True, exist_ok=True)
    ui = spark.sparkContext.uiWebUrl
    app = spark.sparkContext.applicationId
    base = f'{ui}/api/v1/applications/{app}'

    def read(suffix):
        with urllib.request.urlopen(base + suffix, timeout=30) as response:
            return json.load(response)

    sql = read('/sql?length=1000')
    def completed_join(row, operator):
        return any(operator in node.get('nodeName', '') and any(
            metric.get('name') == 'number of output rows' and
            float(metric.get('value', '0').replace(',', '')) > 0
            for metric in node.get('metrics', [])) for node in row.get('nodes', []))

    targets = {}
    if name == 'pr4_joins':
        targets['01_jobs'] = '/jobs/'
        targets['08_groupby_stages'] = '/stages/'
        for operator, label in [('SortMergeJoin', '02_smj_plan'),
                                ('BroadcastHashJoin', '03_bhj_plan')]:
            matches = [row for row in sql if operator in row.get('planDescription', '')
                       and completed_join(row, operator)]
            if not matches:
                raise RuntimeError(f'No executed {operator} SQL plan')
            targets[label] = f'/SQL/execution/?id={max(row["id"] for row in matches)}'
    elif name == 'pr4_storage':
        stored = read('/storage/rdd')
        assert stored, 'Main cache was not materialized'
        targets['04_storage'] = f'/storage/rdd/?id={stored[0]["id"]}'
    elif name == 'pr4_variant_storage':
        stored = read('/storage/rdd')
        assert stored, 'Variant cache was not materialized'
        targets['05_variant_storage'] = f'/storage/rdd/?id={stored[0]["id"]}'
        matches = [row for row in sql if 'BroadcastHashJoin' in row.get('planDescription', '')
                   and 'seller_id' in row.get('planDescription', '')
                   and completed_join(row, 'BroadcastHashJoin')]
        if not matches:
            raise RuntimeError('No executed variant JOIN plan')
        targets['06_variant_plan'] = f'/SQL/execution/?id={max(row["id"] for row in matches)}'
        targets['07_variant_stages'] = '/stages/'
    elif name == 'pr4_completed':
        targets['11_completed_jobs'] = '/jobs/'
        targets['12_environment'] = '/environment/'

    captures = []
    for label, suffix in targets.items():
        target = output / f'{label}.png'
        focus = 'SortMergeJoin' if label == '02_smj_plan' else (
            'BroadcastHashJoin' if label in ['03_bhj_plan', '06_variant_plan'] else None)
        capture_view(ui + suffix, target, focus)
        assert target.stat().st_size > 10000, target
        captures.append({'file': str(target.relative_to(root)), 'url': ui + suffix,
                         'full_viewport':True, 'focus_operator':focus})
    manifest = root / 'results/pr4_captures.json'
    records = json.loads(manifest.read_text()) if manifest.exists() else []
    records.append({'checkpoint': name, 'application_id': app, 'captures': captures})
    manifest.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    print('AUTOMATIC UI CAPTURE', name, len(captures), flush=True)
