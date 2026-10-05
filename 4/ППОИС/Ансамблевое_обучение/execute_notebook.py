"""Execute the existing notebook in a fresh kernel, preserving source/output evidence."""
from pathlib import Path
import argparse
import sys
import nbformat
from nbclient import NotebookClient
from jupyter_client.manager import KernelManager

HERE=Path(__file__).resolve().parent


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--timeout',type=int,default=1200);a=p.parse_args()
    path=HERE/'Ансамблевое_обучение_АлбахтинИВ.ipynb'
    nb=nbformat.read(path,as_version=4)
    km=KernelManager(kernel_name='python3')
    # Runtime-local kernel, no global kernelspec installation or user environment mutation.
    km.kernel_spec.argv=[sys.executable,'-m','ipykernel_launcher','-f','{connection_file}']
    client=NotebookClient(nb,timeout=a.timeout,km=km,resources={'metadata':{'path':str(HERE)}},allow_errors=False)
    try:
        client.execute()
    finally:
        nbformat.write(nb,path)
    codes=[c for c in nb.cells if c.cell_type=='code']
    assert all(c.execution_count is not None for c in codes)
    assert not any(o.output_type=='error' for c in codes for o in c.outputs)
    print('RUN ALL SUCCESS:',len(codes),'executed code cells')
