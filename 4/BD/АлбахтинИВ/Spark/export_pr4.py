"""Export PR4 with its formal title page, contents and complete notebook."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parent
BD=ROOT.parents[1]
sys.path.insert(0,str(BD/'scripts'))
from export_notebook_pdf import main
if __name__=='__main__':
    sys.argv[1:1]=['--notebook',str(ROOT/'Practice_4.ipynb'),'--execution',str(ROOT/'results/pr4_execution.json'),'--cover',str(BD/'ТИАБД_ПР4_АлбахтинИВ.pdf'),'--output',str(ROOT/'Practice_4.pdf'),'--work',str(BD.parents[1]/'.cache/tiabd-pr4-export')]
    main()
