"""Execute every PR4 cell in a new kernel, capturing UI before spark.stop()."""
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
import hashlib
import json
import os

import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parent


def main():
    path = ROOT / 'Practice_4.ipynb'
    notebook = nbformat.read(path, as_version=4)
    for cell in notebook.cells:
        if cell.cell_type == 'code':
            cell.outputs = []
            cell.execution_count = None
    os.environ.pop('TIABD_CAPTURE', None)
    os.environ['TIABD_AUTOCAPTURE'] = '1'
    manifest = ROOT / 'results/pr4_captures.json'
    manifest.unlink(missing_ok=True)
    started = datetime.now(timezone.utc).isoformat()
    begin = perf_counter()

    def progress(cell, cell_index, **kwargs):
        print('COMPLETED CELL', cell_index, flush=True)

    client = NotebookClient(notebook, timeout=1200, kernel_name='python3',
                            resources={'metadata': {'path': str(ROOT)}},
                            on_cell_executed=progress)
    status = 'failed'
    try:
        client.execute()
        status = 'passed'
    finally:
        nbformat.write(notebook, path)
        code = [cell for cell in notebook.cells if cell.cell_type == 'code']
        errors = [output for cell in code for output in cell.outputs
                  if output.output_type == 'error']
        record = {'status': status, 'started_utc': started,
                  'completed_utc': datetime.now(timezone.utc).isoformat(),
                  'seconds': perf_counter() - begin, 'fresh_kernel': True,
                  'run_all': True, 'capture_pause': False,
                  'automatic_ui_capture': True, 'code_cells': len(code),
                  'execution_counts': [cell.execution_count for cell in code],
                  'errors': len(errors),
                  'notebook_sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        (ROOT / 'results/pr4_execution.json').write_text(
            json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    assert status == 'passed' and not errors
    assert record['execution_counts'] == list(range(1, len(code) + 1))
    print('RUN ALL SUCCESS', json.dumps(record, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
