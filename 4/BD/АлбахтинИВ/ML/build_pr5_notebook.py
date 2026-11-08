"""Build the independent PR5 notebook from its reviewable cell source."""
from pathlib import Path
import ast,json
ROOT=Path(__file__).resolve().parent

def main():
    cells=[]
    for block in (ROOT/'practice5.py').read_text(encoding='utf-8').split('# %% ')[1:]:
        kind,text=block.split('\n',1)
        if kind=='markdown':
            text='\n'.join(line[2:] if line.startswith('# ') else '' for line in text.strip().splitlines())
            cell={'cell_type':'markdown','metadata':{},'source':text.splitlines(keepends=True)}
        else:
            text=text.strip()+'\n';ast.parse(text)
            cell={'cell_type':'code','metadata':{},'source':text.splitlines(keepends=True),'execution_count':None,'outputs':[]}
        cell['id']=f'pr5-{len(cells):02d}';cells.append(cell)
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},'language_info':{'name':'python'}},'cells':cells}
    (ROOT/'Practice_5.ipynb').write_text(json.dumps(notebook,ensure_ascii=False,indent=1)+'\n',encoding='utf-8',newline='\n')
    print('Built independent PR5:',sum(c['cell_type']=='code' for c in cells),'code cells')
if __name__=='__main__':main()
