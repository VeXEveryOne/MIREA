"""Export the completed PR4 notebook to PDF without executing its cells.

Requires nbconvert 7.17.1 and Playwright. Pass explicit runtime/module/browser
paths when using the Codex bundled dependencies. Build files belong in .cache.
"""
from pathlib import Path
import argparse,hashlib,json,os,re,subprocess,sys

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[3]

PRINT_CSS=r'''
@page { size:A4; }
html,body {background:white!important;color:black!important;}
body {font-family:"Times New Roman",serif!important;font-size:14pt!important;line-height:1.5!important;margin:0;}
* {box-sizing:border-box;}
#notebook,#notebook-container,.container {width:100%!important;max-width:none!important;padding:0!important;margin:0!important;box-shadow:none!important;}
div.cell {padding:0!important;margin:0 0 9pt!important;max-width:100%!important;break-inside:auto!important;}
.text_cell_render {font-family:"Times New Roman",serif!important;padding:0!important;color:black!important;}
.text_cell_render p {text-align:justify;line-height:1.5;margin:0 0 6pt;}
h1,h2,h3 {font-family:"Times New Roman",serif!important;color:black!important;text-align:center;line-height:1.3;break-after:avoid;}
h1 {font-size:16pt!important;} h2,h3 {font-size:14pt!important;}
h2 {margin-top:14pt!important;margin-bottom:6pt!important;}
h3 {break-before:page!important;margin-top:0!important;}
.text_cell:has(h3) {break-before:page;}
.text_cell_render h3:first-of-type {break-before:auto!important;margin-top:14pt!important;}
.input {display:block!important;}
.prompt {font-family:"Times New Roman",serif!important;color:black!important;padding:0!important;text-align:left!important;min-width:0!important;}
.input_prompt {display:block!important;font-size:10pt!important;margin-top:6pt;}
.output_prompt {display:none!important;}
.inner_cell,.output,.output_wrapper,.output_area,.output_subarea {width:100%!important;max-width:100%!important;height:auto!important;max-height:none!important;padding:0!important;margin:0!important;overflow:visible!important;}
.input_area {border:0!important;background:white!important;}
pre,code,.highlight {font-family:"Courier New",monospace!important;font-size:9.5pt!important;line-height:1.25!important;color:black!important;background:white!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;max-width:100%!important;overflow:visible!important;}
pre {padding:4pt 0!important;margin:0 0 6pt!important;border:0!important;break-inside:auto!important;}
.highlight span,.output span {color:black!important;background:transparent!important;}
table {border-collapse:collapse;max-width:100%;font-family:"Times New Roman",serif;font-size:12pt;}
td,th {background:white!important;color:black!important;border:1px solid black;padding:3pt;}
img {display:block;max-width:100%!important;max-height:190mm!important;width:auto!important;height:auto!important;margin:6pt auto;object-fit:contain;break-inside:avoid;}
.text_cell_render p:has(img) {break-inside:avoid;break-after:avoid;}
.text_cell_render p:has(img)+p {text-align:center;line-height:1;font-size:14pt;break-inside:avoid;}
a,a:visited {color:black!important;text-decoration:none;}
a[href]::after {content:none!important;}
.anchor-link {display:none!important;}
'''

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--notebook',type=Path,default=ROOT/'Practice_4.ipynb')
    p.add_argument('--output',type=Path,default=ROOT/'Practice_4.pdf')
    p.add_argument('--work',type=Path,default=REPO/'.cache/tiabd-pr4-export')
    p.add_argument('--python-packages',type=Path)
    p.add_argument('--node',required=True)
    p.add_argument('--playwright-module',required=True)
    p.add_argument('--browser',required=True)
    a=p.parse_args()
    if a.python_packages:
        sys.path.insert(0,str(a.python_packages.resolve()))
        data=a.python_packages.resolve()/'share/jupyter'
        os.environ['JUPYTER_PATH']=str(data)+os.pathsep+os.environ.get('JUPYTER_PATH','')
    import nbformat
    from nbconvert import HTMLExporter
    from bs4 import BeautifulSoup
    source=a.notebook.read_bytes();nb=nbformat.reads(source.decode('utf-8'),as_version=4)
    code=[c for c in nb.cells if c.cell_type=='code']
    assert [c.execution_count for c in code]==list(range(1,13))
    assert not [o for c in code for o in c.outputs if o.output_type=='error']
    header=nb.cells[0].source
    assert 'Албахтин И.В.' in header and 'ИНБО-12-23' in header
    assert re.search(r'Дата выполнения:\*\* \d{2}\.\d{2}\.\d{4}',header)
    nbformat.validate(nb)
    exporter=HTMLExporter(template_name='basic');exporter.embed_images=True
    html,_=exporter.from_notebook_node(nb,resources={'metadata':{'path':str(ROOT)}})
    soup=BeautifulSoup('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Практическая работа №4 — Албахтин И.В.</title></head><body>'+html+'</body></html>','html.parser')
    for node in soup.find_all('script'):node.decompose()
    for node in soup.find_all('link'):node.decompose()
    # Formatting may wrap lines, but every source character must be retained.
    rendered=[node.get_text().strip() for node in soup.select('.input_area pre')]
    assert rendered==[cell.source.strip() for cell in code],'Export changed code text'
    css=soup.new_tag('style');css.string=PRINT_CSS;soup.head.append(css)
    a.work.mkdir(parents=True,exist_ok=True);html_path=(a.work/'Practice_4.html').resolve()
    html_path.write_text(str(soup),encoding='utf-8',newline='\n')
    a.output.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run([a.node,str(ROOT/'print_notebook.mjs'),str(html_path),str(a.output.resolve()),a.playwright_module,a.browser],check=True)
    assert a.notebook.read_bytes()==source,'Export must not edit or execute the notebook'
    print(json.dumps({'notebook_sha256':hashlib.sha256(source).hexdigest(),'pdf_sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'code_cells':len(code),'errors':0,'embedded_images':len(soup.find_all('img'))},ensure_ascii=False))

if __name__=='__main__':main()
