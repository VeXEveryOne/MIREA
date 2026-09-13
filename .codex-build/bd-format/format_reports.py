from pathlib import Path
from copy import deepcopy
from io import BytesIO
import re, shutil, hashlib, json
from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH as A
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(__file__).resolve().parent
REF = ROOT/'4/ИСУРО/ИСУРО_1_АлбахтинИВ.docx'

def node(tag, **attrs):
    el=OxmlElement('w:'+tag)
    for k,v in attrs.items(): el.set(qn('w:'+k),str(v))
    return el

def font(r, size=14, bold=None, italic=None):
    r.font.name='Times New Roman'; r.font.size=Pt(size)
    r.font.color.rgb=RGBColor(0,0,0)
    if bold is not None:r.bold=bold
    if italic is not None:r.italic=italic
    pr=r._element.get_or_add_rPr()
    for k in ['ascii','hAnsi','eastAsia','cs']:pr.rFonts.set(qn('w:'+k),'Times New Roman')
    for k in list(pr.rFonts.attrib):
        if 'Theme' in k or 'theme' in k: del pr.rFonts.attrib[k]
    for el in pr.findall(qn('w:color')):
        for k in list(el.attrib):
            if k!=qn('w:val'):del el.attrib[k]

def para(p, align=A.JUSTIFY, first=1.25, line=1.5, before=0, after=0, keep=False, together=False):
    f=p.paragraph_format
    f.alignment=align;f.left_indent=Cm(0);f.right_indent=Cm(0);f.first_line_indent=Cm(first)
    f.line_spacing=line;f.space_before=Pt(before);f.space_after=Pt(after)
    f.keep_with_next=keep;f.keep_together=together;f.widow_control=True;f.page_break_before=False
    for tag in ['shd','pBdr','framePr']:
        for e in p._p.pPr.findall(qn('w:'+tag)):p._p.pPr.remove(e)
    for r in p.runs: font(r)

def caption(p, kind):
    m=re.match(r'(?:Таблица|Рисунок|Рис\.)\s*(\d+)\s*[.\-–—]?\s*(.*)',p.text,re.S)
    if m:p.text=f'{kind} {m[1]} – {m[2].strip().rstrip(".")}'
    p.style='BD Table Caption' if kind=='Таблица' else 'BD Figure Caption'
    para(p,A.LEFT if kind=='Таблица' else A.CENTER,0,1,6 if kind=='Таблица' else 3,3 if kind=='Таблица' else 6,kind=='Таблица',True)
    for r in p.runs:font(r,12 if kind=='Таблица' else 14,False,kind=='Таблица')

def section(base,landscape=False, first=False):
    s=deepcopy(base)
    for e in list(s):
        if e.tag in [qn('w:pgSz'),qn('w:pgMar'),qn('w:type'),qn('w:titlePg'),qn('w:pgNumType')]:s.remove(e)
    s.append(node('type',val='nextPage'))
    s.append(node('pgSz',w=16838 if landscape else 11906,h=11906 if landscape else 16838,orient='landscape' if landscape else 'portrait'))
    s.append(node('pgMar',top=1134,bottom=1134,left=1701,right=850,header=709,footer=709,gutter=0))
    if first:s.append(node('titlePg'))
    return s

def section_break(base,landscape=False):
    p=node('p');pr=node('pPr');pr.append(node('spacing',before=0,after=0,line=20,lineRule='exact'));pr.append(node('rPr'));pr[-1].append(node('sz',val=2))
    pr.append(section(base,landscape));p.append(pr)
    return p

def title_elements(doc,n,base):
    ref=Document(REF)
    result=[]
    for idx,orig in enumerate(list(ref.element.body)[:16]):
        el=deepcopy(orig)
        for pp in el.xpath('.//w:p') if el.tag!=qn('w:p') else [el]:
            p=Paragraph(pp,doc._body)
            # Freeze the reference's Normal defaults before applying BD body styles.
            direct=deepcopy(p._p.pPr) if p._p.pPr is not None else node('pPr')
            merged=deepcopy(ref.styles['Normal'].element.pPr)
            for child in direct:
                for old in merged.findall(child.tag):merged.remove(old)
                merged.append(deepcopy(child))
            for old in list(merged):
                if old.tag in [qn('w:pStyle'),qn('w:sectPr')]:merged.remove(old)
            if p._p.pPr is not None:p._p.remove(p._p.pPr)
            p._p.insert(0,merged)
            # Reference Normal inherited 14 pt; preserve direct size and weight.
            for r in p.runs:
                if 'ИНБО-01-17' in r.text:r.text=r.text.replace('ИНБО-01-17','')
                if 'Шендяпин' in r.text:r.text=r.text.replace('Шендяпин А.В.','Воронцов Ю.А.')
                if 'Информационные системы управления ресурсами организации' in r.text:r.text=r.text.replace('Информационные системы управления ресурсами организации','Анализ больших данных')
                if 'ОТЧЕТ ПО ПРАКТИЧЕСКИМ РАБОТАМ' in r.text:r.text='ОТЧЕТ ПО ПРАКТИЧЕСКОЙ РАБОТЕ'
                font(r,r.font.size.pt if r.font.size else 14)
            if 'Шендяпин' in p.text:
                p.text='Воронцов Ю.А.'
                for r in p.runs:font(r,12,False,False)
            p.paragraph_format.space_after=p.paragraph_format.space_after or Pt(0)
            p.paragraph_format.keep_with_next=False
            p.paragraph_format.page_break_before=False
        # Rebind embedded assets, including the original logo.
        for e in el.iter():
            for attr,val in list(e.attrib.items()):
                if attr.startswith('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'):
                    rel=ref.part.rels.get(val)
                    if rel is None:continue
                    if rel.is_external:new=doc.part.relate_to(rel.target_ref,rel.reltype,True)
                    elif rel.reltype.endswith('/image'):
                        new,_=doc.part.get_or_add_image(BytesIO(rel.target_part.blob))
                    else:new=doc.part.relate_to(rel.target_part,rel.reltype)
                    e.set(attr,new)
        if idx==7:
            p=Paragraph(el,doc._body);p.text=f'Практическая работа №{n}'
            p.alignment=A.CENTER
            for r in p.runs:font(r,14,True,False)
        if idx==10:Paragraph(el,doc._body).paragraph_format.space_after=Pt(54)
        if idx==14:Paragraph(el,doc._body).paragraph_format.space_after=Pt(72)
        if idx==15:
            Paragraph(el,doc._body)._p.get_or_add_pPr().append(section(base,False,True))
        result.append(el)
    return result

def run(n):
    dest=ROOT/f'4/BD/practice_{n}/Практическая работа №{n}.docx'
    backup=WORK/'backups'/f'practice_{n}';backup.mkdir(parents=True,exist_ok=True)
    for ext in ['.docx','.pdf']:
        source=dest.with_suffix(ext);b=backup/source.name
        if not b.exists():shutil.copy2(source,b)
    doc=Document(backup/dest.name)
    for name in ['BD Table Caption','BD Figure Caption']:
        if name not in doc.styles:doc.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH)
    for st in doc.styles:
        if st.type==WD_STYLE_TYPE.PARAGRAPH:
            st.font.name='Times New Roman';st.font.color.rgb=RGBColor(0,0,0)
    norm=doc.styles['Normal'];norm.font.size=Pt(14)
    norm.paragraph_format.line_spacing=1.5;norm.paragraph_format.space_after=Pt(0)
    for sec in doc.sections:
        sec.header.paragraphs[0].text=''
        for p in list(sec.header.paragraphs)[1:]:p._p.getparent().remove(p._p)
        for hdr in [sec.footer,sec.first_page_header,sec.first_page_footer]:
            for p in hdr.paragraphs:p.clear()
    # One footer shared by all subsequent sections, suppressed on title only.
    footer=doc.sections[0].footer
    p=footer.paragraphs[0];para(p,A.CENTER,0,1)
    fld=node('fldSimple',instr=' PAGE ');r=node('r');rp=node('rPr');rp.append(node('rFonts',ascii='Times New Roman',hAnsi='Times New Roman'));rp.append(node('sz',val=24));r.append(rp);t=node('t');t.text='2';r.append(t);fld.append(r);p._p.append(fld)
    base=deepcopy(doc.sections[0]._sectPr)
    for e in list(doc.element.body):
        if e.tag==qn('w:sectPr'):doc.element.body.remove(e)
    for sp in doc.element.body.xpath('.//w:sectPr'):sp.getparent().remove(sp)
    # Text callouts become regular prose, retaining their complete content.
    for table in list(doc.tables):
        if len(table.rows)==1 and len(table.columns)==1:
            for p in table.cell(0,0).paragraphs:
                el=deepcopy(p._p);table._tbl.addprevious(el)
                Paragraph(el,doc._body).style='Normal'
            table._tbl.getparent().remove(table._tbl)
    for p in list(doc.paragraphs):
        if not p.text.strip() and not p._p.xpath('.//w:drawing|.//w:pict'):
            p._p.getparent().remove(p._p)
            continue
        oldstyle=p.style.name
        for br in p._p.xpath('.//w:br[@w:type="page"]'):br.getparent().remove(br)
        para(p)
        if oldstyle.startswith('Heading') or oldstyle=='Title':
            level=1 if oldstyle in ['Heading 1','Title'] else 2
            p.style='Heading 1' if level==1 else 'Heading 2'
            para(p,A.CENTER if level==1 else A.LEFT,0,1.5,12,6,True,True)
            for r in p.runs:font(r,14,True,False)
        elif re.match(r'^Таблица\s+\d+',p.text):caption(p,'Таблица')
        elif re.match(r'^(Рис\.|Рисунок)\s*\d+',p.text):caption(p,'Рисунок')
        elif p._p.xpath('.//w:drawing|.//w:pict'):
            para(p,A.CENTER,0,1,6,0,True,True)
        elif oldstyle in ['Код','Результат']:
            para(p,A.LEFT,0,1,6,6,False,False)
            for r in p.runs:font(r,14,False,False)
        elif oldstyle.startswith('List'):
            para(p,A.JUSTIFY,0,1.5)
            p.paragraph_format.left_indent=Cm(.65);p.paragraph_format.first_line_indent=Cm(-.65)
        if p.text.strip() in ['Результат выполнения','Проверка окружения','Измерение размеров:']:
            p.paragraph_format.keep_with_next=True
    # A4 text area; downscale over-wide images without changing their proportions.
    for sh in doc.inline_shapes:
        limit=Cm(16.5)
        if sh.width>limit:
            ratio=limit/sh.width;sh.width=limit;sh.height=int(sh.height*ratio)
    for ti,table in enumerate(list(doc.tables)):
        cols=len(table.columns);wide=(cols>=6 and n==1)
        width=25.2 if wide else 16.5
        prev=table._tbl.getprevious()
        if prev is None or not re.match(r'^Таблица\s+\d+', ''.join(prev.xpath('.//w:t/text()'))):
            cap=node('p');table._tbl.addprevious(cap);p=Paragraph(cap,doc._body)
            p.text=f'Таблица {ti+1} – Состав отчёта по самостоятельному анализу';caption(p,'Таблица')
            prev=cap
        # Keep actual column proportions if sensible; broad feature names need room.
        if wide:
            widths=[width/cols]*cols
            if cols==9 and table.cell(0,0).text=='type_name':widths=[2.7,1.7,1.8,1.8,3.3,3.7,3.6,3.3,3.3]
            elif cols==9 and table.cell(0,0).text=='Признак':widths=[4]+[(width-4)/8]*8
            elif table.cell(0,0).text in ['type_name','Признак']:widths=[4]+[(width-4)/(cols-1)]*(cols-1)
        elif n==2 and cols==8:widths=[2.5,1.5,1.8,1.7,1.7,2.1,2.8,2.4]
        elif cols==2:widths=[5.5,11]
        elif cols==3:widths=[4,5,7.5] if ti==0 else [5,4.5,7]
        elif cols==5:widths=[2.1,3.1,3.3,4,4]
        else:widths=[width/cols]*cols
        table.autofit=False;table.alignment=1
        pr=table._tbl.tblPr
        for tag in ['tblInd','tblW','tblBorders','shd']:
            for el in pr.findall(qn('w:'+tag)):pr.remove(el)
        pr.append(node('tblW',w=int(Cm(width).twips),type='dxa'))
        borders=node('tblBorders')
        for edge in ['top','left','bottom','right','insideH','insideV']:borders.append(node(edge,val='single',sz=6,color='000000'))
        pr.append(borders)
        for col,w in zip(table.columns,widths):col.width=Cm(w)
        for ri,row in enumerate(table.rows):
            trpr=row._tr.get_or_add_trPr()
            for h in trpr.findall(qn('w:trHeight')):trpr.remove(h)
            trpr.append(node('cantSplit'))
            if ri==0:trpr.append(node('tblHeader'))
            for ci,cell in enumerate(row.cells):
                cell.width=Cm(widths[ci]);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
                cp=cell._tc.get_or_add_tcPr()
                for border in cp.findall(qn('w:tcBorders')):cp.remove(border)
                cb=node('tcBorders')
                for edge in ['top','left','bottom','right']:cb.append(node(edge,val='single',sz=6,color='000000'))
                cp.append(cb)
                for shade in cp.findall(qn('w:shd')):cp.remove(shade)
                for oldmar in cp.findall(qn('w:tcMar')):cp.remove(oldmar)
                mar=node('tcMar')
                for k,v in [('top',60),('bottom',60),('left',65),('right',65)]:mar.append(node(k,w=v,type='dxa'))
                cp.append(mar)
                for p in cell.paragraphs:
                    short=bool(re.fullmatch(r'[\d\s.,%+−–\-×]+',p.text)) or (ri==0 and len(p.text)<15)
                    p.style='Normal';para(p,A.CENTER if short else A.LEFT,0,1,0,0,False,True)
                    for r in p.runs:font(r,12,ri==0,False)
                    if len(table.rows)<=5 and ri<len(table.rows)-1:p.paragraph_format.keep_with_next=True
        if wide:
            # Carry the immediately associated code/result onto the table's page.
            start=prev
            cursor=start.getprevious()
            while cursor is not None and cursor.tag==qn('w:p'):
                p=Paragraph(cursor,doc._body)
                if p.style.name in ['Код','Результат'] or p.text.strip()=='Результат выполнения':
                    start=cursor;cursor=cursor.getprevious()
                else:break
            start.addprevious(section_break(base,False))
            table._tbl.addnext(section_break(base,True))
    # Source title is now the first heading of the substantive part.
    first=doc.element.body[0]
    for e in title_elements(doc,n,base):first.addprevious(e)
    # Add navigable, auto-updated contents for the long first practice.
    if n==1:
        p=node('p');first.addprevious(p);h=Paragraph(p,doc._body);h.text='Содержание';h.style='Title';para(h,A.CENTER,0,1.5,0,12,True,True)
        for r in h.runs:font(r,14,True,False)
        p=node('p');first.addprevious(p);toc=node('fldSimple',instr=' TOC \\o "1-1" \\h \\z \\u ');p.append(toc)
        first.addprevious(section_break(base,False))
    doc.element.body.append(section(base,False))
    # Clear stale document furniture and normalize paragraph styles used by fields.
    for st in doc.styles:
        if st.name.lower().startswith('toc'):
            st.font.name='Times New Roman';st.font.size=Pt(14);st.font.color.rgb=RGBColor(0,0,0)
            st.paragraph_format.line_spacing=1;st.paragraph_format.space_after=Pt(3)
    settings=doc.settings.element
    for el in settings.findall(qn('w:updateFields')):settings.remove(el)
    settings.append(node('updateFields',val='true'))
    # Reassign drawing IDs across the imported cover and the original figures.
    for i,el in enumerate(doc.element.body.xpath('.//wp:docPr'),1):el.set('id',str(i))
    doc.core_properties.author='Албахтин И.В.'
    stage=WORK/f'practice_{n}';stage.mkdir(exist_ok=True)
    out=stage/dest.name;doc.save(out)
    print(out)

if __name__=='__main__':
    for n in [1,2]:run(n)
