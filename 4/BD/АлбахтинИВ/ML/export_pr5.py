"""Export PR5 with its formal title, contents and four figure captions."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parent
BD=ROOT.parents[1]
sys.path.insert(0,str(BD/'scripts'))
from export_notebook_pdf import main
if __name__=='__main__':
    defaults=['--notebook',str(ROOT/'Practice_5.ipynb'),'--execution',str(ROOT/'results/pr5/execution.json'),
              '--cover',str(BD/'ТИАБД_ПР5_АлбахтинИВ.pdf'),'--output',str(ROOT/'Practice_5.pdf'),
              '--work',str(BD.parents[1]/'.cache/tiabd-pr5-export')]
    for caption in ['Распределения предикторов и цели на train','Прогноз Calories и остатки на test',
                    'PR-кривые valid и матрица ошибок test','Выбор k и PCA всех тренировок']:
        defaults+=['--figure-caption',caption]
    sys.argv[1:1]=defaults;main()
