from docx import Document
from docx.oxml.ns import qn
d=Document(r'4\\ППОИС\\ППОИС_4_АлбахтинИВ.docx')
body=d._element.body
for i,ch in enumerate(body[:25]):
 print(i,ch.tag, (''.join(ch.itertext()))[:90].replace('\\n','|'), 'pagebr', 'w:type="page"' in ch.xml, 'sect', 'sectPr' in ch.xml)
