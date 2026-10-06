"""Run all four Python notebooks in new kernels in the personal Linux VM."""
from pathlib import Path
import json
import os
import platform
import subprocess
from datetime import datetime, timezone
import nbformat
from nbclient import NotebookClient

BD = Path('/home/albakhtin/tiabd')
PACK = BD / 'АлбахтинИВ'
assert platform.system() == 'Linux'
assert platform.node() == 'tiabd-albakhtin-iv'
result = {'student': 'Албахтин И.В.', 'group': 'ИНБО-12-23',
          'vm_name': 'TIABD-Albakhtin-IV', 'vm_uuid': '40603a5d-2404-4561-a4d6-02d13a8b388d',
          'hostname': platform.node(), 'python': platform.python_version(),
          'started_utc': datetime.now(timezone.utc).isoformat(), 'notebooks': []}
entries = [(p, BD) for p in sorted((PACK / 'Ноутбуки').glob('*.ipynb'))]
entries += [(PACK / 'Spark' / f'Practice_{n}.ipynb', PACK / 'Spark') for n in [3, 4]]
for path, cwd in entries:
    print('EXECUTING', path.name, flush=True)
    book = nbformat.read(path, as_version=4)
    for cell in book.cells:
        if cell.cell_type == 'code':
            cell.outputs = []
            cell.execution_count = None
    def progress(cell, cell_index, **kwargs):
        nbformat.write(book, path)
        print(path.name, 'CELL', cell_index, 'COMPLETE', flush=True)
    client = NotebookClient(book, kernel_name='python3', timeout=1200,
                            allow_errors=False, on_cell_executed=progress,
                            resources={'metadata': {'path': str(cwd)}})
    try:
        client.execute()
    finally:
        nbformat.write(book, path)
    code = [c for c in book.cells if c.cell_type == 'code']
    assert all(c.execution_count is not None for c in code)
    assert not any(o.output_type == 'error' for c in code for o in c.outputs)
    result['notebooks'].append({'file': str(path.relative_to(PACK)), 'code_cells': len(code), 'errors': 0,
                                'completed_utc': datetime.now(timezone.utc).isoformat()})
    (PACK / 'Результаты/execution.json').parent.mkdir(parents=True, exist_ok=True)
    (PACK / 'Результаты/execution.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('RUN ALL SUCCESS', path.name, len(code), 'cells', flush=True)
result['completed_utc'] = datetime.now(timezone.utc).isoformat()
(PACK / 'Результаты/execution.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
