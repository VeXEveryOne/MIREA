from docx import Document
d=Document(r'4\\ППОИС\\ППОИС_3_АлбахтинИВ.docx')
body=d._element.body
for i in [14,15,16]:
 s=body[i].xml
 print(i,'page', 'w:type="page"' in s, 'sect', 'sectPr' in s, 'brs',s.count('<w:br'))
