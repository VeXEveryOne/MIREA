"""Execute every cell in a new kernel, persist outputs even on failure."""
import sys
import nbformat
from nbclient import NotebookClient
from pathlib import Path

path = Path(sys.argv[1]).resolve()
nb = nbformat.read(path, as_version=4)
def progress(cell, cell_index, **kwargs):
    nbformat.write(nb, path)
    print(f'CELL {cell_index} complete', flush=True)
client = NotebookClient(nb, timeout=900, kernel_name='python3', resources={'metadata': {'path': str(path.parent)}}, on_cell_executed=progress)
try:
    client.execute()
finally:
    nbformat.write(nb, path)
print('RUN ALL SUCCESS', path.name)
