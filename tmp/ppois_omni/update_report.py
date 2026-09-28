from pathlib import Path
from copy import deepcopy
import shutil,json
from PIL import Image
from docx import Document
from docx.shared import Cm,Pt
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
BASE=Path('D:/GitHub/MIREA/tmp/ppois_omni')
DEST=Path('D:/GitHub/MIREA/4/ППОИС')
REPORT=DEST/'ППОИС_3_АлбахтинИВ.docx'
backup=BASE/'original_pr3.docx'
if not backup.exists():shutil.copy2(REPORT,backup);shutil.copy2(REPORT.with_suffix('.pdf'),BASE/'original_pr3.pdf')
d=Document(backup)
captions=[p for p in d.paragraphs if p.text.startswith('Рисунок ')]
assert len(captions)==5
def image_in(p,name,maxw=24.4,maxh=14):
 for e in list(p._p):
  if e.tag.endswith('}r'):p._p.remove(e)
 w,h=Image.open(BASE/(name+'.png')).size
 width=min(maxw,maxh*w/h)
 p.paragraph_format.keep_with_next=True
 p.paragraph_format.space_before=Pt(0);p.paragraph_format.space_after=Pt(0)
 p.add_run().add_picture(str(BASE/(name+'.png')),width=Cm(width))
def after(p):
 e=OxmlElement('w:p');p._p.addnext(e);return Paragraph(e,p._parent)
for i,(cap,name) in enumerate(zip(captions,['use','classes','bom_seq','pub_seq','comm'])):
 pic=Paragraph(cap._p.getprevious(),cap._parent)
 assert pic._p.xpath('.//w:drawing')
 if name.endswith('_seq'):
  image_in(pic,name+'_1',maxh=12.3)
  original=cap.text
  cap.text=original+' (начало)'
  p=after(cap);p._p.insert(0,deepcopy(pic._p.pPr));p.paragraph_format.page_break_before=True
  image_in(p,name+'_2',maxh=14.3)
  c=after(p);c._p.insert(0,deepcopy(cap._p.pPr));c.text=original+' (окончание)'
 else:image_in(pic,name,maxh=14.25 if name!='comm' else 12.9)
d.save(REPORT)
# Keep the editable source and its five complete renderer outputs together.
for name,out in [('use','ПР3_01_Варианты_использования'),('classes','ПР3_02_Классы_анализа'),('bom_seq','ПР3_03_Последовательность_UC02'),('pub_seq','ПР3_04_Последовательность_UC05'),('comm','ПР3_05_Кооперация_UC05')]:shutil.copy2(BASE/(name+'.png'),DEST/'Схемы'/(out+'.png'))
print('Updated report:',REPORT)
print('Tables:',len(d.tables),'figures:',len(captions),'diagram images:',len(d.inline_shapes)-1)
