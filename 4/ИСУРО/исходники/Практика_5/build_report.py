"""Build the canonical practice 5 report from verified UI evidence."""
from pathlib import Path
import json
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH as A
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[4]
SUB = ROOT / '4' / 'ИСУРО'
ASSETS = SUB / 'иллюстрации' / 'Практика_5'
OUT = SUB / 'ИСУРО_5_АлбахтинИВ.docx'
doc = Document(SUB / 'ИСУРО_1_АлбахтинИВ.docx')
body = doc._element.body
for e in list(body)[16:]:
    if e.tag != qn('w:sectPr'):
        body.remove(e)
for e in body.xpath('.//w:t'):
    if e.text:
        e.text = e.text.replace('ИНБО-01-17', '').replace('ОТЧЕТ ПО ПРАКТИЧЕСКИМ РАБОТАМ', 'ОТЧЕТ ПО ПРАКТИЧЕСКОЙ РАБОТЕ № 5').replace('ОТЧЕТ ПО ПРАКТИЧЕСКОЙ РАБОТЕ № 1', 'ОТЧЕТ ПО ПРАКТИЧЕСКОЙ РАБОТЕ № 5')
for e in body.xpath('.//w:rFonts'):
    for key in ('ascii','hAnsi','eastAsia','cs'):
        e.set(qn('w:'+key), 'Times New Roman')
for p in doc.paragraphs:
    if 'ОТЧЕТ ПО' in p.text:
        for r in p.runs:
            r.font.size, r.bold = Pt(16), True
for s in doc.sections:
    s.page_width, s.page_height = Cm(21), Cm(29.7)
    s.left_margin, s.right_margin = Cm(3), Cm(1.5)
    s.top_margin = s.bottom_margin = Cm(2)
    s.header_distance = s.footer_distance = Cm(1)
    for e in list(s._sectPr.findall(qn('w:pgNumType'))):
        s._sectPr.remove(e)

def style(name, align=A.JUSTIFY, first=1.25, line=1.5, bold=False, before=0, after=0):
    st = doc.styles[name] if name in doc.styles else doc.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
    st.font.name, st.font.size, st.font.bold = 'Times New Roman', Pt(14), bold
    st.font.color.rgb = RGBColor(0,0,0)
    f=st.paragraph_format
    f.alignment, f.first_line_indent = align, Cm(first)
    f.left_indent=f.right_indent=Cm(0)
    f.line_spacing, f.space_before, f.space_after = line, Pt(before), Pt(after)
    f.widow_control=True
    return st
style('Основной текст отчёта')
style('Heading 1', A.CENTER, 0, bold=True, before=12, after=6).paragraph_format.keep_with_next=True
style('Иллюстрация', A.CENTER, 0, 1, before=6).paragraph_format.keep_with_next=True
style('Подпись рисунка', A.CENTER, 0, 1, before=3, after=6).paragraph_format.keep_together=True
first,last=doc.sections[0],doc.sections[-1]
last.footer.is_linked_to_previous=False
for s in (first,last):
    for p in s.footer.paragraphs: p.clear()
fp=last.footer.paragraphs[0]
fp.alignment=A.CENTER
field=OxmlElement('w:fldSimple'); field.set(qn('w:instr'),'PAGE')
fp._p.append(field)
for name in ('Footer','Header'):
    style(name, A.CENTER, 0, 1).font.size=Pt(12)

def p(text): return doc.add_paragraph(text,'Основной текст отчёта')
def h(text): return doc.add_paragraph(text,'Heading 1')
figures=[]
def fig(file,title):
    num=len(figures)+1
    ip=doc.add_paragraph(style='Иллюстрация')
    shape=ip.add_run().add_picture(str(ASSETS/file),width=Cm(16.5))
    shape._inline.docPr.set('descr',title)
    doc.add_paragraph(f'Рисунок {num} – {title}','Подпись рисунка')
    figures.append({'number':num,'file':file,'caption':title,'width_cm':16.5})

content=json.loads((Path(__file__).parent/'содержание.json').read_text(encoding='utf-8'))
for section in content:
    h(section['title'])
    for item in section['items']:
        if isinstance(item,str): p(item)
        else: fig(item['file'],item['caption'])
doc.core_properties.author='Албахтин И. В.'
doc.core_properties.title='Учёт основных средств Практическая работа 5'
doc.core_properties.subject='Информационные системы управления ресурсами организации'
doc.save(OUT)
(ROOT/'.cache/isuro5/figures.json').write_text(json.dumps(figures,ensure_ascii=False,indent=2),encoding='utf-8')
print(OUT)
