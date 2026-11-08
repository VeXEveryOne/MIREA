"""Export an executed notebook with the report's title page and a verified TOC."""
from pathlib import Path
import argparse,hashlib,importlib.util,io,json,os,re,subprocess,sys

BD=Path(__file__).resolve().parents[1]
PRINT_CSS='\n@page { size:A4; }\nhtml,body {background:white!important;color:black!important;}\nbody {font-family:"Times New Roman",serif!important;font-size:14pt!important;line-height:1.5!important;margin:0;}\n* {box-sizing:border-box;}\n#notebook,#notebook-container,.container {width:100%!important;max-width:none!important;padding:0!important;margin:0!important;box-shadow:none!important;}\ndiv.cell {padding:0!important;margin:0 0 9pt!important;max-width:100%!important;break-inside:auto!important;}\n.text_cell_render {font-family:"Times New Roman",serif!important;padding:0!important;color:black!important;}\n.text_cell_render p {text-align:justify;line-height:1.5;margin:0 0 6pt;}\nh1,h2,h3 {font-family:"Times New Roman",serif!important;color:black!important;text-align:center;line-height:1.3;break-after:avoid;}\nh1 {font-size:16pt!important;} h2,h3 {font-size:14pt!important;}\nh2 {margin-top:14pt!important;margin-bottom:6pt!important;}\nh3 {break-before:page!important;margin-top:0!important;}\n.text_cell:has(h3) {break-before:page;}\n.text_cell_render h3:first-of-type {break-before:auto!important;margin-top:14pt!important;}\n.input {display:block!important;}\n.prompt {font-family:"Times New Roman",serif!important;color:black!important;padding:0!important;text-align:left!important;min-width:0!important;}\n.input_prompt {display:block!important;font-size:10pt!important;margin-top:6pt;}\n.output_prompt {display:none!important;}\n.inner_cell,.output,.output_wrapper,.output_area,.output_subarea {width:100%!important;max-width:100%!important;height:auto!important;max-height:none!important;padding:0!important;margin:0!important;overflow:visible!important;}\n.input_area {border:0!important;background:white!important;}\npre,code,.highlight {font-family:"Courier New",monospace!important;font-size:9.5pt!important;line-height:1.25!important;color:black!important;background:white!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;max-width:100%!important;overflow:visible!important;}\npre {padding:4pt 0!important;margin:0 0 6pt!important;border:0!important;break-inside:auto!important;}\n.highlight span,.output span {color:black!important;background:transparent!important;}\ntable {border-collapse:collapse;max-width:100%;font-family:"Times New Roman",serif;font-size:12pt;}\ntd,th {background:white!important;color:black!important;border:1px solid black;padding:3pt;}\nimg {display:block;max-width:100%!important;max-height:190mm!important;width:auto!important;height:auto!important;margin:6pt auto;object-fit:contain;break-inside:avoid;}\n.text_cell_render p:has(img) {break-inside:avoid;break-after:avoid;}\n.text_cell_render p:has(img)+p {text-align:center;line-height:1;font-size:14pt;break-inside:avoid;}\na,a:visited {color:black!important;text-decoration:none;}\na[href]::after {content:none!important;}\n.anchor-link {display:none!important;}\n'

def normalized(text):return re.sub(r'\s+','',text).replace('¶','')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['notebook','execution','cover','output','work']:p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--python-packages',type=Path)
    for name in ['node','playwright-module','browser']:p.add_argument('--'+name,required=True)
    p.add_argument('--font',default='C:/Windows/Fonts/times.ttf')
    p.add_argument('--bold-font',default='C:/Windows/Fonts/timesbd.ttf')
    p.add_argument('--figure-caption',action='append',default=[])
    a=p.parse_args()
    if a.python_packages:
        sys.path.insert(0,str(a.python_packages.resolve()))
        os.environ['JUPYTER_PATH']=str(a.python_packages.resolve()/'share/jupyter')+os.pathsep+os.environ.get('JUPYTER_PATH','')
    import nbformat
    from nbconvert import HTMLExporter
    from bs4 import BeautifulSoup
    from pypdf import PdfReader,PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import simpleSplit
    source=a.notebook.read_bytes();nb=nbformat.reads(source.decode('utf-8'),as_version=4);nbformat.validate(nb)
    run=json.loads(a.execution.read_text(encoding='utf-8'))
    assert run['status']=='passed' and run['errors']==0
    assert hashlib.sha256(source).hexdigest()==run['notebook_sha256']
    code=[c for c in nb.cells if c.cell_type=='code']
    assert [c.execution_count for c in code]==list(range(1,len(code)+1))
    assert not [o for c in code for o in c.outputs if o.output_type=='error']
    assert all(s in nb.cells[0].source for s in ['Албахтин И.В.','ИНБО-12-23','Дата выполнения:'])
    exporter=HTMLExporter(template_name='basic');exporter.embed_images=True
    html,_=exporter.from_notebook_node(nb,resources={'metadata':{'path':str(a.notebook.parent.resolve())}})
    soup=BeautifulSoup('<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body>'+html+'</body></html>','html.parser')
    for node in soup.select('script,link,.anchor-link'):node.decompose()
    if a.figure_caption:
        figures=soup.select('.output_subarea:has(img)')
        assert len(figures)==len(a.figure_caption),'Supply one caption for each output figure'
        for index,(figure,label) in enumerate(zip(figures,a.figure_caption),1):
            figure['class']=figure.get('class',[])+['notebook-figure']
            caption=soup.new_tag('p');caption['class']='figure-caption'
            caption.string=f'Рисунок {index} – {label}';figure.append(caption)
    assert [x.get_text().strip() for x in soup.select('.input_area pre')]==[c.source.strip() for c in code]
    css=soup.new_tag('style');css.string=PRINT_CSS+'\n.notebook-figure {break-inside:avoid!important;} .figure-caption {font:14pt "Times New Roman",serif!important;text-align:center!important;line-height:1!important;margin:3pt 0 6pt!important;break-inside:avoid;}';soup.head.append(css)
    a.work.mkdir(parents=True,exist_ok=True)
    html_path=(a.work/'notebook.html').resolve();html_path.write_text(str(soup),encoding='utf-8',newline='\n')
    body_path=(a.work/'body.pdf').resolve()
    subprocess.run([a.node,str(Path(__file__).with_name('print_notebook.mjs')),str(html_path),str(body_path),a.playwright_module,a.browser],check=True)
    body=PdfReader(body_path);pages_text=[normalized(page.extract_text()) for page in body.pages]
    labels=[soup.select_one('h1').get_text().strip()]+[h.get_text().strip() for h in soup.select('.text_cell_render h2')]
    toc=[];cursor=0
    for label in labels:
        match=next((i for i in range(cursor,len(body.pages)) if normalized(label) in pages_text[i]),None)
        assert match is not None,('Heading missing from PDF',label)
        toc.append({'heading':label,'page':match+3});cursor=match
    cover=PdfReader(a.cover);cover_text=cover.pages[0].extract_text()
    assert all(s in cover_text for s in ['Албахтин','ИНБО-12-23','Приходько','Кафедра прикладной математики'])
    pdfmetrics.registerFont(TTFont('TNR',a.font));pdfmetrics.registerFont(TTFont('TNR-Bold',a.bold_font))
    width,height=A4;left=30*72/25.4;right=width-15*72/25.4
    buffer=io.BytesIO();c=canvas.Canvas(buffer,pagesize=A4)
    c.setFont('TNR-Bold',14);c.drawCentredString(width/2,height-20*72/25.4-14,'Содержание')
    y=height-20*72/25.4-49
    for row in toc:
        lines=simpleSplit(row['heading'],'TNR',14,right-left-32)
        for index,line in enumerate(lines):
            assert y>70,'Contents needs another page; adjust the page offset explicitly'
            c.setFont('TNR',14);c.drawString(left,y,line)
            if index==len(lines)-1:
                end=left+pdfmetrics.stringWidth(line,'TNR',14)+6
                number=str(row['page']);number_width=pdfmetrics.stringWidth(number,'TNR',14)
                dots=int((right-number_width-8-end)/pdfmetrics.stringWidth('.','TNR',14))
                if dots>0:c.drawString(end,y,'.'*dots)
                c.drawRightString(right,y,number)
            y-=21
        y-=4
    c.setFont('TNR',12);c.drawCentredString(width/2,22,'2');c.save();buffer.seek(0)
    writer=PdfWriter();writer.add_page(cover.pages[0]);writer.add_page(PdfReader(buffer).pages[0])
    for i,page in enumerate(body.pages,3):
        overlay=io.BytesIO();footer=canvas.Canvas(overlay,pagesize=A4)
        footer.setFillColorRGB(0,0,0);footer.setFont('TNR',12);footer.drawCentredString(width/2,22,str(i));footer.save();overlay.seek(0)
        page.merge_page(PdfReader(overlay).pages[0]);writer.add_page(page)
    for row in toc:writer.add_outline_item(row['heading'],row['page']-1)
    writer.add_metadata({'/Title':labels[0]+' Албахтин И.В.','/Author':'Албахтин И.В.','/Subject':'Технологии и инструментарий анализа больших данных'})
    a.output.parent.mkdir(parents=True,exist_ok=True)
    staged=a.work/'final.pdf'
    with staged.open('wb') as f:writer.write(f)
    os.replace(staged,a.output)
    assert a.notebook.read_bytes()==source
    final=PdfReader(a.output)
    for row in toc:assert normalized(row['heading']) in normalized(final.pages[row['page']-1].extract_text())
    result={'notebook_sha256':hashlib.sha256(source).hexdigest(),'pdf_sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),
            'pages':len(final.pages),'body_pages':len(body.pages),'title_page':1,'contents_page':2,'contents':toc,
            'code_cells':len(code),'errors':0,'images':len(soup.find_all('img')),'code_and_outputs_preserved':True,
            'source_title_pdf_sha256':hashlib.sha256(a.cover.read_bytes()).hexdigest(),'toc_targets_verified':True}
    (a.work/'export.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
