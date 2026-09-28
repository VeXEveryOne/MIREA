from engine import Report
from new_diagrams import build
from content_6_8 import practice6,practice7,practice8
from content_9_12 import practice9,practice10,practice11,practice12,finish
import new_diagrams
previous_text=new_diagrams.old.Diagram.text
def corrected_flow_text(self,x,y,w,h,s,*a,**kw):
    return previous_text(self,x,y,w,h,s.replace('в реестре таблиц 2 и 3.','в таблицах 2.2 и 2.3.'),*a,**kw)
new_diagrams.old.Diagram.text=corrected_flow_text
new_diagrams.old.flows()
new_diagrams.old.Diagram.text=previous_text
r=Report()
for n in range(1,6):r.import_practice(n)
f=build()
for fn in [practice6,practice7,practice8,practice9,practice10,practice11,practice12]:fn(r,f)
finish(r)
print(r.save())
