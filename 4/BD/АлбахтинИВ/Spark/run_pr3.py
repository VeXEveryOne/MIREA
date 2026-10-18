"""Run every PR3 cell in a new kernel and record the completed execution."""
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
import hashlib
import json
import subprocess
import urllib.request

import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parent


def main():
    path = ROOT / 'Practice_3.ipynb'
    notebook = nbformat.read(path, as_version=4)
    for cell in notebook.cells:
        if cell.cell_type == 'code':
            cell.outputs = []
            cell.execution_count = None
    started = datetime.now(timezone.utc).isoformat()
    begin = perf_counter()
    captures = []

    def progress(cell, cell_index, **kwargs):
        nbformat.write(notebook, path)
        print(f'CELL {cell_index} complete', flush=True)
        if cell_index == 15:
            results = json.loads((ROOT/'results/pr3.json').read_text())
            ui = results['environment']['ui']
            with urllib.request.urlopen(ui+'/api/v1/applications') as response:
                applications = json.load(response)
            app = applications[0]['id']
            for name in ['jobs', 'stages']:
                with urllib.request.urlopen(f'{ui}/api/v1/applications/{app}/{name}') as response:
                    (ROOT/f'results/pr3_{name}.json').write_bytes(response.read())
            target = ROOT/'screenshots/pr3/01_spark_jobs.png'
            target.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['/usr/bin/google-chrome', '--headless', '--no-sandbox',
                '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars',
                '--window-size=1280,850', '--virtual-time-budget=2500',
                f'--screenshot={target}', ui+'/jobs/'],
                capture_output=True, check=True, timeout=60)
            if not target.exists() or target.stat().st_size < 10000:
                raise RuntimeError('Spark UI screenshot was not captured')
            captures.append(str(target.relative_to(ROOT)))

    client = NotebookClient(notebook, timeout=900, kernel_name='python3',
        resources={'metadata': {'path': str(ROOT)}}, on_cell_executed=progress)
    status = 'failed'
    try:
        client.execute()
        status = 'passed'
    finally:
        nbformat.write(notebook, path)
        code = [cell for cell in notebook.cells if cell.cell_type == 'code']
        errors = [output for cell in code for output in cell.outputs if output.output_type == 'error']
        record = {'status': status, 'started_utc': started,
            'completed_utc': datetime.now(timezone.utc).isoformat(),
            'seconds': perf_counter()-begin, 'fresh_kernel': True,
            'run_all': True, 'capture_pause': False, 'code_cells': len(code),
            'execution_counts': [cell.execution_count for cell in code],
            'errors': len(errors), 'screenshots': captures,
            'notebook_sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        (ROOT/'results/pr3_execution.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    assert status == 'passed' and not errors
    assert record['execution_counts'] == list(range(1, len(code)+1))
    print('RUN ALL SUCCESS', json.dumps(record,ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
