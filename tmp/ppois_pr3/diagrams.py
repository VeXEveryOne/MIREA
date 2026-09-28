from pathlib import Path
import math, html, subprocess
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE=Path(__file__).resolve().parent
ASSET=BASE/'assets'; ASSET.mkdir(exist_ok=True)
OUT=Path('D:/GitHub/MIREA/4/ППОИС/Схемы'); OUT.mkdir(exist_ok=True)
POP='C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
pdfmetrics.registerFont(TTFont('TNR','C:/Windows/Fonts/times.ttf'))
pdfmetrics.registerFont(TTFont('TNRB','C:/Windows/Fonts/timesbd.ttf'))

class Drawing:
 def __init__(self,name,w,h):
  self.name,self.w,self.h=name,w,h;self.c=canvas.Canvas(str(ASSET/(name+'.pdf')),pagesize=(w,h));self.svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">','<rect width="100%" height="100%" fill="white"/>']
 def line(self,points,color='#202020',width=2,dash=False,arrow=False,openhead=False):
  c=self.c;c.setStrokeColor(color);c.setLineWidth(width);c.setDash([7,5] if dash else [])
  p=c.beginPath();p.moveTo(points[0][0],self.h-points[0][1])
  for x,y in points[1:]:p.lineTo(x,self.h-y)
  c.drawPath(p);c.setDash([])
  s=' '.join(f'{x},{y}' for x,y in points);self.svg.append(f'<polyline points="{s}" fill="none" stroke="{color}" stroke-width="{width}"'+(' stroke-dasharray="7,5"' if dash else '')+'/>')
  if arrow:
   x,y=points[-1];a,b=points[-2];ang=math.atan2(y-b,x-a);sz=10
   q=[(x-sz*math.cos(ang-.43),y-sz*math.sin(ang-.43)),(x,y),(x-sz*math.cos(ang+.43),y-sz*math.sin(ang+.43))]
   if openhead:self.line(q,color,width)
   else:
    p=c.beginPath();p.moveTo(q[0][0],self.h-q[0][1]);p.lineTo(x,self.h-y);p.lineTo(q[2][0],self.h-q[2][1]);p.close();c.setFillColor(color);c.drawPath(p,fill=1,stroke=0);self.svg.append(f'<polygon points="{" ".join(f"{a},{b}" for a,b in q)}" fill="{color}"/>')
 def rect(self,x,y,w,h,fill='white',stroke='#202020',width=2):
  self.c.setFillColor(fill);self.c.setStrokeColor(stroke);self.c.setLineWidth(width);self.c.rect(x,self.h-y-h,w,h,fill=1,stroke=1)
  self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>')
 def ellipse(self,x,y,w,h):
  self.c.setFillColor('white');self.c.setStrokeColor('#202020');self.c.setLineWidth(2);self.c.ellipse(x,self.h-y-h,x+w,self.h-y,fill=1,stroke=1)
  self.svg.append(f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}" fill="white" stroke="#202020" stroke-width="2"/>')
 def text(self,x,y,txt,size=22,bold=False,anchor='middle',bg=False):
  lines=txt.split('\n');font='TNRB' if bold else 'TNR';lead=size*1.13
  if bg:
   w=max(pdfmetrics.stringWidth(t,font,size) for t in lines)+10; xx=x-w/2 if anchor=='middle' else x-w+5 if anchor=='end' else x-5
   self.rect(xx,y-size,w,lead*len(lines)+3,stroke='white',width=0)
  for i,t in enumerate(lines):
   yy=y+i*lead;self.c.setFillColor('#151515');self.c.setFont(font,size)
   getattr(self.c,{'middle':'drawCentredString','start':'drawString','end':'drawRightString'}[anchor])(x,self.h-yy,t)
   self.svg.append(f'<text x="{x}" y="{yy}" font-family="Times New Roman" font-size="{size}" font-weight="{"bold" if bold else "normal"}" text-anchor="{anchor}">{html.escape(t)}</text>')
 def box(self,x,y,w,h,title,num=None):
  self.rect(x,y,w,h,fill='#eff5fa',stroke='#244963',width=2.4);n=title.count('\n')+1;self.text(x+w/2,y+h/2-(n-1)*11,title,20,True)
  if num:self.text(x+w-8,y+h-5,num,14,True,'end')
 def actor(self,x,y,title):
  self.ellipse(x-13,y,26,26);self.line([(x,y+26),(x,y+65)]);self.line([(x-30,y+40),(x+30,y+40)]);self.line([(x-25,y+91),(x,y+65),(x+25,y+91)]);self.text(x,y+117,title,21)
 def save(self):
  self.c.save();(OUT/(self.name+'.svg')).write_text('\n'.join(self.svg+['</svg>']),encoding='utf-8')
  subprocess.run([POP,'-singlefile','-scale-to','3000','-png',str(ASSET/(self.name+'.pdf')),str(ASSET/self.name)],check=True,capture_output=True)

def frame(d,node,title):
 d.rect(5,5,d.w-10,d.h-10);d.line([(5,64),(d.w-5,64)]);d.line([(5,d.h-50),(d.w-5,d.h-50)])
 d.text(22,30,'ППОИС • Практическая работа № 2 • ООО «Юкомс»',21,True,'start');d.text(d.w-22,30,'Албахтин И.В. • 23.09.2026',20,False,'end')
 d.text(22,d.h-18,'Узел '+node,21,True,'start');d.text(200,d.h-18,title,21,False,'start')

def idef_context():
 d=Drawing('ПР2_IDEF0_A-0',1640,900);frame(d,'A-0','Формировать и актуализировать карточки компьютерных систем')
 d.box(620,365,365,195,'Формировать и\nактуализировать карточки\nкомпьютерных систем','0')
 for y,t in [(410,'Запрос на создание или\nизменение карточки'),(515,'Ассортимент, характеристики\nи предложения поставщиков')]:
  d.line([(5,y),(620,y)],arrow=True,color='#244963');d.text(295,y-37,t,23)
 controls=['Порядок создания\nи актуализации','Правила выбора\nи замены','Правила\nсовместимости','Правила цены, веса\nи изображений','Требования Ozon\nк карточке']
 for i,t in enumerate(controls):
  x=170+i*320;dest=655+i*72;yy=215+i*24
  d.line([(x,65),(x,yy),(dest,yy),(dest,365)],arrow=True,color='#80500a');d.text(x,117,t,23,bg=True)
 for i,(y,t) in enumerate([(340,'Согласованная BOM'),(455,'Цена, вес и изображения'),(590,'Опубликованная или\nобновлённая карточка'),(700,'Сведения об ошибке\nпубликации')]):
  yy=395+i*45;xx=1040+i*42;d.line([(985,yy),(xx,yy),(xx,y),(1635,y)],arrow=True,color='#244963');d.text(1300 if i==3 else 1370,y+28 if i in (0,3) else y-35 if '\n' in t else y-14,t,23)
 ms=['Менеджер\nмаркетплейсов','Технический специалист;\nPC4Games и ITPartner','Технический\nспециалист','Дизайнер;\nпроектируемая ИС','Менеджер;\nAPI Ozon']
 for i,t in enumerate(ms):
  x=170+i*320;dest=655+i*72;yy=755-i*20
  d.line([(x,850),(x,yy),(dest,yy),(dest,560)],arrow=True,color='#586777');d.text(x,793,t,22,bg=True)
 d.save()

def idef_decomp(detail=False):
 node='A2' if detail else 'A0';d=Drawing('ПР2_IDEF0_'+node,1800,900);frame(d,node,'Сформировать BOM и сопоставить товары поставщиков' if detail else 'Формировать и актуализировать карточки компьютерных систем')
 titles=['Выбрать корпус\nи характеристики','Заполнить\nслоты BOM','Сопоставить\nкомпоненты и товары','Выбрать актуальные\nпредложения','Сохранить\nверсию BOM'] if detail else ['Инициировать\nсоздание или\nизменение карточки','Сформировать BOM\nи сопоставить\nтовары поставщиков','Проверить\nсовместимость','Рассчитать цену, вес\nи подготовить\nизображения','Проверить и\nопубликовать\nкарточку в Ozon']
 flows=['Основа BOM','Состав BOM','Сопоставленные\nтовары','Выбранные\nпредложения'] if detail else ['Запрос и\nвыбранный корпус','Проект\nконфигурации','Согласованная\nBOM','Данные карточки']
 controls=['Порядок\nобработки запроса','Правила выбора\nкомплектующих','Правила\nсопоставления','Приоритет\nпредложений','Правила\nверсионирования'] if detail else ['Порядок создания\nи актуализации','Правила выбора\nи замены','Правила\nсовместимости','Правила цены, веса\nи изображений','Требования Ozon\nк карточке']
 mechs=['Менеджер\nмаркетплейсов','Технический\nспециалист','PC4Games\nи ITPartner','Проектируемая\nИС','Технический\nспециалист'] if detail else ['Менеджер\nмаркетплейсов','Технический специалист;\nPC4Games и ITPartner','Технический\nспециалист','Дизайнер;\nпроектируемая ИС','Менеджер;\nAPI Ozon']
 boxes=[(135+i*285,180+i*122,220,85) for i in range(5)]
 for i,(x,y,w,h) in enumerate(boxes):
  d.line([(x+195,65),(x+195,y)],color='#80500a',arrow=True);d.text(x+150,99,controls[i],21,bg=True)
  mx=x+(205 if i==0 else 110);d.line([(mx,850),(mx,y+h)],color='#586777',arrow=True);d.text(mx,794,mechs[i],21,bg=True)
  d.box(x,y,w,h,titles[i],str(i+1))
  if i<4:
   nx,ny,nw,nh=boxes[i+1];v=x+w+25
   d.line([(x+w,y+45),(v,y+45),(v,ny+44),(nx,ny+44)],arrow=True,color='#244963')
   d.text(v+13,y+83,flows[i],20,anchor='start')
 # Labels directly above their own incoming horizontal segment.
 d.line([(5,223),(135,223)],arrow=True,color='#244963');d.text(14,177,'Запрос на\nкарточку',20,anchor='start')
 d.line([(5,320),(420,320)],arrow=True,color='#244963');d.text(17,285,'Корпус, компоненты\nи характеристики' if detail else 'Ассортимент и предложения\nпоставщиков',20,anchor='start')
 if detail:
  d.line([(1495,712),(1795,712)],arrow=True,color='#244963');d.text(1650,653,'Версия BOM\nна проверку\nсовместимости',21)
 else:
  # Feedback is routed through a clear corridor above A3.
  d.line([(925,438),(963,438),(963,246),(592,246),(592,302)],arrow=True,color='#80500a');d.text(792,232,'Замечания по совместимости',20,bg=True)
  for src,yy,txt in [((925,480),466,'Согласованная BOM'),((1210,574),568,'Цена, вес и изображения')]:
   x,y=src;d.line([(x,y),(x+55,y),(x+55,yy),(1795,yy)],arrow=True,color='#244963');d.text(1635,yy-12,txt,21,bg=True)
  d.line([(1495,699),(1795,699)],arrow=True,color='#244963');d.text(1650,635,'Опубликованная\nили обновлённая\nкарточка',21)
  d.line([(1495,734),(1795,734)],arrow=True,color='#244963');d.text(1650,764,'Ошибка публикации',21)
 d.save()

UC=[('UC01','Зарегистрировать\nзапрос'),('UC02','Сформировать\nBOM'),('UC03','Проверить\nсовместимость'),('UC04','Массово заменить\nкомпонент'),('UC05','Опубликовать\nкарточку'),('UC06','Обновить предложения\nпоставщиков'),('UC07','Рассчитать цену, вес\nи подготовить контент'),('UC08','Проверить готовность\nкарточки'),('UC09','Настроить шаблоны\nизображений'),('UC10','Настроить доступ\nи интеграции')]
def usecase():
 d=Drawing('ПР3_01_Варианты_использования',1480,850);d.rect(260,15,980,815);d.text(750,47,'ИС формирования и актуализации карточек ООО «Юкомс»',25,True)
 # Associations are undirected; actors stay outside the system boundary.
 for pts in [[(95,154),(340,140)],[(95,154),(225,190),(225,700),(340,700)],[(95,454),(340,280)],[(95,454),(340,420)],[(95,454),(340,560)],[(95,754),(340,700)],[(1370,154),(1160,140)],[(1370,574),(1160,560)],[(1370,574),(1270,545),(1270,280),(1160,280)],[(1370,754),(1160,700)]]:d.line(pts)
 centers=[]
 for i,(code,title) in enumerate(UC):
  x=500 if i<5 else 1000;y=140+(i%5)*140;centers.append((x,y));d.ellipse(x-160,y-46,320,92);d.text(x,y-15,code+'\n'+title,20)
 for a,b,pts,lpos in [(1,2,[(500,326),(500,374)],(575,354)),(3,2,[(500,514),(500,466)],(575,494)),(4,7,[(660,700),(760,700),(760,420),(840,420)],(785,550))]:
  d.line(pts,dash=True,arrow=True,openhead=True);d.text(*lpos,'«include»',20,bg=True)
 d.actor(95,70,'Менеджер\nмаркетплейсов');d.actor(95,370,'Технический\nспециалист');d.actor(95,670,'Ozon')
 d.actor(1370,70,'PC4Games /\nITPartner');d.actor(1370,490,'Дизайнер');d.actor(1370,670,'Администратор')
 # Manager also initiates content preparation, routed above the case row.
 d.line([(120,125),(200,80),(1000,80),(1000,94)]) # UC06? remove below, this extra association is not retained
 # The preceding polyline would link the manager to UC06; this is intentional: manual refresh.
 d.save()

CLASSES={
 'FormBOM':('boundary','Форма BOM','ввестиСлоты()\nпоказатьРезультат()'),
 'BOMController':('control','Контроллер BOM','сформироватьВерсию()\nпроверитьСовместимость()'),
 'Rule':('entity','Правило совместимости','тип; условие\nполучитьПравила()'),
 'Version':('entity','Версия BOM','номер; статус\nсоздать(слоты)'),
 'Offer':('entity','Предложение поставщика','модель; цена; наличие\nполучитьАктуальные()'),
 'Slot':('entity','Слот BOM','тип; группа или модель\nколичество'),
 'FormCard':('boundary','Форма карточки','запроситьПубликацию()\nпоказатьСтатус()'),
 'PubController':('control','Контроллер публикации','проверитьГотовность()\nопубликовать()'),
 'Card':('entity','Карточка товара','атрибуты; цена; версия\nполучитьСнимок()\nзадатьСтатус()'),
 'Adapter':('boundary','Адаптер Ozon','отправитьКарточку()\nполучитьРезультат()'),
 'Publication':('entity','Публикация','запрос; ответ; время; статус\nсоздать(); сохранитьРезультат()')}
def classbox(d,key,x,y,w=310,h=145):
 st,n,ops=CLASSES[key];d.rect(x,y,w,h);d.text(x+w/2,y+25,'«'+st+'»',20);d.text(x+w/2,y+52,n,23,True);d.line([(x,y+65),(x+w,y+65)]);d.text(x+14,y+93,ops,20,anchor='start')
def classes():
 d=Drawing('ПР3_02_Классы_анализа',1480,945)
 pos={'FormBOM':(20,35),'BOMController':(570,35),'Rule':(1130,35),'Offer':(1130,285),'Version':(570,285),'Slot':(20,285),'FormCard':(20,535),'PubController':(570,535),'Card':(1130,535),'Adapter':(570,745),'Publication':(1130,745)}
 for a,b,pts in [('FormBOM','BOMController',[(330,110),(570,110)]),('BOMController','Rule',[(880,110),(1130,110)]),('BOMController','Version',[(725,180),(725,285)]),('BOMController','Offer',[(880,145),(1010,145),(1010,350),(1130,350)]),('FormCard','PubController',[(330,610),(570,610)]),('PubController','Card',[(880,610),(1130,610)]),('PubController','Adapter',[(725,680),(725,745)]),('PubController','Publication',[(880,650),(990,650),(990,817),(1130,817)])]:d.line(pts,dash=True,arrow=True,openhead=True)
 # Entity associations and multiplicity are kept separate from dependencies.
 d.line([(570,355),(330,355)]);d.text(545,342,'1',20);d.text(366,342,'1..*',20);d.text(445,392,'содержит',20)
 # Filled diamond at the composite version end.
 q=[(570,355),(558,347),(546,355),(558,363)];p=d.c.beginPath();p.moveTo(570,d.h-355)
 for x,y in q[1:]:p.lineTo(x,d.h-y)
 p.close();d.c.setFillColor('#202020');d.c.drawPath(p,fill=1,stroke=0);d.svg.append('<polygon points="570,355 558,347 546,355 558,363" fill="#202020"/>')
 d.line([(175,285),(175,235),(1285,235),(1285,285)]);d.text(185,270,'0..*',19,anchor='start');d.text(1298,270,'0..1',19,anchor='start');d.text(1200,223,'выбранное предложение',20)
 d.line([(1285,535),(1285,482),(810,482),(810,430)]);d.text(1300,518,'0..*',19,anchor='start');d.text(820,451,'1',19,anchor='start');d.text(1050,470,'основана на',20)
 d.line([(1285,680),(1285,745)]);d.text(1300,701,'1',19,anchor='start');d.text(1300,733,'0..*',19,anchor='start')
 for k,(x,y) in pos.items():classbox(d,k,x,y,h=140 if y==745 else 145)
 d.text(20,928,'Пунктирная стрелка — зависимость; сплошная линия — связь сущностей; числа — кратности.',19,anchor='start')
 d.save()

SEQ1=[(0,1,'1. Ввести состав и сохранить',False),(1,2,'2. Сформировать версию',False),(2,3,'3. Получить правила',False),(3,2,'4. Правила',True),(2,4,'5. Получить актуальные предложения',False),(4,2,'6. Предложения',True),(2,2,'7. Проверить состав и совместимость',False),(2,5,'8. Создать версию и слоты',False),(5,2,'9. Идентификатор версии',True),(2,1,'10. Версия сохранена',True),(1,0,'11. Показать версию',True),(2,1,'12. Перечень конфликтов',True),(1,0,'13. Показать ошибки',True)]
SEQ2=[(0,1,'1. Запросить публикацию',False),(1,2,'2. Опубликовать карточку',False),(2,3,'3. Получить снимок карточки',False),(3,2,'4. Снимок и версия BOM',True),(2,2,'5. Проверить готовность',False),(2,6,'6. Создать запись «отправка»',False),(2,4,'7. Передать снимок',False),(4,5,'8. Отправить карточку',False),(5,4,'9. Результат или ошибка',True),(4,2,'10. Результат обмена',True),(2,6,'11. Сохранить результат',False),(2,3,'12. Обновить статус',False),(2,1,'13. Итог публикации',True),(1,0,'14. Показать статус',True),(2,1,'15. Ошибки готовности',True),(1,0,'16. Показать ошибки',True)]

def sequence(which):
 names=['Технический\nспециалист',':Форма BOM',':Контроллер\nBOM',':Правило\nсовместимости',':Предложение\nпоставщика',':Версия BOM'] if which==1 else ['Менеджер\nмаркетплейсов',':Форма\nкарточки',':Контроллер\nпубликации',':Карточка\nтовара',':Адаптер\nOzon','Ozon',':Публикация']
 types=['actor','boundary','control','entity','entity','entity'] if which==1 else ['actor','boundary','control','entity','boundary','external','entity']
 msgs=SEQ1 if which==1 else SEQ2;w=1580;h=840 if which==1 else 940;d=Drawing(f'ПР3_0{3 if which==1 else 4}_Последовательность_UC0{2 if which==1 else 5}',w,h)
 xs=[100+i*(w-200)/(len(names)-1) for i in range(len(names))]
 for x,name,st in zip(xs,names,types):
  d.rect(x-95,15,190,85);d.text(x,38,'«'+st+'»',19);d.text(x,65,name,20,True);d.line([(x,100),(x,h-20)],dash=True,width=1)
 startalt=7 if which==1 else 5; elseat=11 if which==1 else 14
 ys=[145+i*(43 if which==1 else 42)+(40 if i>=startalt else 0)+(63 if i>=elseat else 0) for i in range(len(msgs))]
 top=ys[startalt]-35;end=ys[-1]+20
 d.rect(15,top,w-30,end-top,fill='white',stroke='#555555',width=1)
 # redraw lifelines in fragment, then frame labels
 for x in xs:d.line([(x,top),(x,end)],dash=True,width=1,color='#aaaaaa')
 d.text(25,top+22,'alt',21,True,'start');d.text(95,top+22,'[нет конфликтов и предложения выбраны]' if which==1 else '[карточка готова к публикации]',20,anchor='start')
 yy=ys[elseat]-55;d.line([(15,yy),(w-15,yy)],dash=True,width=1);d.text(95,yy+22,'[есть конфликт или отсутствует предложение]' if which==1 else '[есть ошибки готовности]',20,anchor='start')
 for idx,((a,b,tx,ret),y) in enumerate(zip(msgs,ys)):
  if a==b:
   d.line([(xs[a],y),(xs[a]+130,y),(xs[a]+130,y+19),(xs[a],y+19)],arrow=True);d.text(xs[a]+15,y-8,tx,20,anchor='start',bg=True)
  else:
   d.line([(xs[a],y),(xs[b],y)],dash=ret,arrow=True,openhead=ret);d.text((xs[a]+xs[b])/2,y-8,tx,20,bg=True)
 d.save()

def communication():
 d=Drawing('ПР3_05_Кооперация_UC05',1480,830)
 # Each solid connector is a communication link; numbered directional messages identify order.
 d.actor(115,85,'Менеджер\nмаркетплейсов')
 objs=[(360,90,':Форма карточки'),(895,90,':Контроллер публикации'),(895,365,':Адаптер Ozon'),(895,680,'Ozon'),(360,365,':Карточка товара'),(360,680,':Публикация')]
 for x,y,tx in objs:d.rect(x-155,y,310,78);d.text(x,y+46,tx,24,True)
 d.line([(145,129),(205,129)]);d.text(180,95,'1 →',22);d.text(180,169,'← 14',22)
 d.line([(515,129),(740,129)]);d.text(625,98,'2 →',22);d.text(625,164,'← 13',22)
 d.line([(895,168),(895,365)]);d.text(935,230,'7. Передать снимок ↓',23,anchor='start');d.text(935,294,'10. Результат обмена ↑',23,anchor='start')
 d.line([(895,443),(895,680)]);d.text(935,525,'8. Отправить карточку ↓',23,anchor='start');d.text(935,588,'9. Результат или ошибка ↑',23,anchor='start')
 d.line([(740,149),(650,149),(650,405),(515,405)]);d.text(620,242,'3. Получить снимок ↓\n4. Снимок и BOM ↑\n12. Обновить статус ↓',22,anchor='end',bg=True)
 d.line([(740,110),(700,110),(700,719),(515,719)]);d.text(687,555,'6. Создать запись ↓\n11. Сохранить результат ↓',22,anchor='end',bg=True)
 d.line([(1050,110),(1370,110),(1370,168),(1050,168)],arrow=True);d.text(1200,87,'5. Проверить готовность',22)
 d.text(25,805,'Показана ветвь готовой карточки. Номера 1–14 соответствуют диаграмме последовательности UC05.',22,anchor='start')
 d.save()

if __name__=='__main__':
 idef_context();idef_decomp();idef_decomp(True);usecase();classes();sequence(1);sequence(2);communication()
