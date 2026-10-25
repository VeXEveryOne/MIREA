"""Run an entire ML notebook in a fresh kernel and retain a verifiable record."""
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
import argparse
import hashlib
import json
import os

import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('number', type=int, choices=[5,6,7])
    args = parser.parse_args()
    os.environ.update(MPLBACKEND='Agg', OMP_NUM_THREADS='2', OPENBLAS_NUM_THREADS='2',
                      MKL_NUM_THREADS='2', NUMBA_NUM_THREADS='2')
    path = ROOT/f'Practice_{args.number}.ipynb'
    output = ROOT/f'results/pr{args.number}'
    output.mkdir(parents=True, exist_ok=True)
    notebook = nbformat.read(path, as_version=4)
    for cell in notebook.cells:
        if cell.cell_type == 'code':
            cell.outputs=[]; cell.execution_count=None
    started = datetime.now(timezone.utc).isoformat()
    begin=perf_counter()
    def progress(cell, cell_index, **kwargs):
        print('COMPLETED',args.number,'CELL',cell_index,flush=True)
    client=NotebookClient(notebook, timeout=2400, kernel_name='python3',
                          resources={'metadata':{'path':str(ROOT)}},on_cell_executed=progress)
    status='failed'
    try:
        client.execute(); status='passed'
    finally:
        nbformat.write(notebook,path)
        code=[c for c in notebook.cells if c.cell_type=='code']
        errors=[o for c in code for o in c.outputs if o.output_type=='error']
        record={'status':status,'fresh_kernel':True,'run_all':True,'started_utc':started,
                'completed_utc':datetime.now(timezone.utc).isoformat(),'seconds':perf_counter()-begin,
                'code_cells':len(code),'execution_counts':[c.execution_count for c in code],
                'errors':len(errors),'notebook_sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        (output/'execution.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    assert status=='passed' and not errors
    assert record['execution_counts']==list(range(1,len(code)+1))
    print('RUN ALL SUCCESS',json.dumps(record,ensure_ascii=False),flush=True)


if __name__=='__main__':
    main()
