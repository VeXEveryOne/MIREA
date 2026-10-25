"""Convert percent-format Python sources to portable Jupyter notebooks."""
from pathlib import Path
import ast,json,re

ROOT=Path(__file__).resolve().parent


def main():
    for number in [6,7]:
        source=(ROOT/f'practice{number}.py').read_text(encoding='utf-8')
        cells=[]
        for block in re.split(r'(?m)^# %%',source)[1:]:
            if block.startswith(' [markdown]'):
                text='\n'.join(re.sub(r'^# ?', '',line) for line in block.splitlines()[1:]).strip()
                cells.append({'cell_type':'markdown','metadata':{},'source':text.splitlines(keepends=True)})
            else:
                text=block.strip();ast.parse(text)
                cells.append({'cell_type':'code','metadata':{},'source':text.splitlines(keepends=True),'execution_count':None,'outputs':[]})
        nb={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'},'language_info':{'name':'python'},'colab':{'name':f'Practice_{number}.ipynb'}},'cells':cells}
        (ROOT/f'Practice_{number}.ipynb').write_text(json.dumps(nb,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
        print(number,len(cells),'cells')


if __name__=='__main__':main()
