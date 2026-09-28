import sys, math
from pathlib import Path
from xml.etree import ElementTree as E
from PIL import Image, ImageDraw, ImageFont
BASE=Path(__file__).resolve().parent
sys.path.insert(0,str(BASE.parent/'im_2_5'))
import diagrams as old
old.OUT=BASE/'figures';old.OUT.mkdir(exist_ok=True)
ALL=[]

class D(old.Diagram):
    def shape(self,x,y,w,h,s,kind='round',size=23):
        id=self.text(x,y,w,h,s,size)
        cell=self.root[-1]
        shape={'round':'rounded=1;arcSize=20;','ellipse':'ellipse;','rect':'rounded=0;','diamond':'rhombus;'}[kind]
        cell.set('style',shape+'whiteSpace=wrap;html=0;align=center;verticalAlign=middle;fontFamily=Times New Roman;fontSize='+str(size)+';fontColor=#000000;strokeColor=#000000;fillColor=#FFFFFF;strokeWidth=1.4;')
        bounds=(x*2,y*2,(x+w)*2,(y+h)*2)
        if kind=='round':self.d.rounded_rectangle(bounds,radius=18,outline='black',width=3)
        elif kind=='ellipse':self.d.ellipse(bounds,outline='black',width=3)
        elif kind=='diamond':self.d.line([(x*2+w,y*2),((x+w)*2,y*2+h),(x*2+w,(y+h)*2),(x*2,y*2+h),(x*2+w,y*2)],fill='black',width=3)
        else:self.d.rectangle(bounds,outline='black',width=3)
        return id
    def edge(self,pts,arrow=True,dash=False,open=False):
        self.i+=1
        for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
            length=math.hypot(x1-x0,y1-y0)
            if dash:
                for z in range(0,max(1,int(length)),12):
                    a=z/length;b=min(z+7,length)/length
                    self.d.line([(2*(x0+(x1-x0)*a),2*(y0+(y1-y0)*a)),(2*(x0+(x1-x0)*b),2*(y0+(y1-y0)*b))],fill='black',width=3)
            else:self.d.line([(x0*2,y0*2),(x1*2,y1*2)],fill='black',width=3)
        if arrow:
            (x0,y0),(x1,y1)=pts[-2:];a=math.atan2(y1-y0,x1-x0)
            wings=[((x1-11*math.cos(a)+5*math.sin(a))*2,(y1-11*math.sin(a)-5*math.cos(a))*2),(x1*2,y1*2),((x1-11*math.cos(a)-5*math.sin(a))*2,(y1-11*math.sin(a)+5*math.cos(a))*2)]
            if open:self.d.line(wings,fill='black',width=3)
            else:self.d.polygon(wings,fill='black')
        c=E.SubElement(self.root,'mxCell',id=str(self.i),value='',style=f'edgeStyle=none;endArrow={"open" if open else "block" if arrow else "none"};endFill=1;dashed={1 if dash else 0};strokeColor=#000000;strokeWidth=1.4;',edge='1',parent='1')
        g=E.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
        E.SubElement(g,'mxPoint',x=str(pts[0][0]),y=str(pts[0][1]),attrib={'as':'sourcePoint'})
        E.SubElement(g,'mxPoint',x=str(pts[-1][0]),y=str(pts[-1][1]),attrib={'as':'targetPoint'})
        if len(pts)>2:
            a=E.SubElement(g,'Array',attrib={'as':'points'})
            for x,y in pts[1:-1]:E.SubElement(a,'mxPoint',x=str(x),y=str(y))
    def actor(self,x,y,label):
        self.i+=1;c=E.SubElement(self.root,'mxCell',id=str(self.i),value=label,style='shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;fontFamily=Times New Roman;fontSize=22;strokeColor=#000000;fillColor=#FFFFFF;',vertex='1',parent='1');E.SubElement(c,'mxGeometry',x=str(x-20),y=str(y),width='40',height='65',attrib={'as':'geometry'})
        self.d.ellipse(((x-9)*2,y*2,(x+9)*2,(y+18)*2),outline='black',width=3)
        for pts in [[(x,y+18),(x,y+45)],[(x-23,y+29),(x+23,y+29)],[(x-20,y+65),(x,y+45),(x+20,y+65)]]:self.d.line([(a*2,b*2) for a,b in pts],fill='black',width=3)
        self.text(x-90,y+70,180,55,label,22)
    def dot(self,x,y,end=False):
        self.i+=1;c=E.SubElement(self.root,'mxCell',id=str(self.i),value='',style='ellipse;fillColor=#000000;strokeColor=#000000;' if not end else 'shape=endState;fillColor=#000000;strokeColor=#000000;',vertex='1',parent='1');E.SubElement(c,'mxGeometry',x=str(x-9),y=str(y-9),width='18',height='18',attrib={'as':'geometry'})
        self.d.ellipse(((x-9)*2,(y-9)*2,(x+9)*2,(y+9)*2),fill='black')
        if end:self.d.ellipse(((x-13)*2,(y-13)*2,(x+13)*2,(y+13)*2),outline='black',width=2)
    def save(self):
        p=old.OUT/(self.name+'.png');self.im.save(p);ALL.append(self);return p

def furps():
    d=D('pr6_furps',1200,580)
    d.shape(370,15,460,70,'Требования к ИС «Юкомс»','rect',27)
    for i,(letter,label,ids) in enumerate([('F','Функциональность','F-01…F-12'),('U','Удобство','U-01…U-03'),('R','Надёжность','R-01…R-03'),('P','Производительность','P-01…P-03'),('S','Сопровождаемость','S-01…S-03'),('+','Ограничения','X-01…X-03')]):
        x=15+(i%3)*400;y=195+(i//3)*205
        d.edge([(600,85),(600,125),(x+185,125),(x+185,y)],False)
        d.shape(x,y,370,135,f'{letter} — {label}\n{ids}','rect',25)
    d.text(315,540,575,35,'Каждое требование связано с критерием приёмки',22)
    return d.save()

def usecases(first=True):
    d=D('pr8_usecases_'+('data' if first else 'publication'),1200,610)
    d.shape(225,20,750,560,'','rect')
    d.text(280,30,640,35,'ИС подготовки карточек ООО «Юкомс»',26,True)
    if first:
        d.actor(100,115,'Менеджер');d.actor(1090,155,'Производство');d.actor(1090,415,'Дизайнер')
        data=[(285,95,290,90,'UC-01\nИмпорт данных'),(650,110,270,90,'UC-02\nСогласование BOM'),(650,290,270,90,'UC-03\nСовместимость'),(285,285,290,90,'UC-04\nРасчёт параметров'),(650,455,270,90,'UC-05\nИзображения'),(285,465,290,90,'UC-06\nФормирование карточки')]
        for x,y,w,h,s in data:d.shape(x,y,w,h,s,'ellipse',23)
        for pts in [[(123,145),(285,140)],[(123,145),(185,145),(185,330),(285,330)],[(185,330),(185,510),(285,510)],[(1067,185),(920,155)],[(1067,185),(1020,185),(1020,335),(920,335)],[(1067,445),(1000,445),(1000,500),(920,500)]]:d.edge(pts,False)
        d.edge([(785,200),(785,290)],dash=True,open=True);d.text(790,216,140,40,'«include»',22)
        d.edge([(430,465),(430,375)],dash=True,open=True);d.text(438,400,150,40,'«include»',22)
    else:
        d.actor(100,120,'Менеджер');d.actor(1090,115,'Ozon');d.actor(100,420,'Директор');d.actor(1090,420,'Администратор')
        for x,y,w,h,s in [(285,120,280,90,'UC-07\nОпубликовать карточку'),(660,120,270,90,'UC-08\nУточнить статус'),(285,410,280,100,'UC-09\nПолучить отчёт'),(660,410,270,100,'UC-10\nУправлять доступом')]:d.shape(x,y,w,h,s,'ellipse',23)
        for pts in [[(123,150),(285,165)],[(123,150),(180,150),(180,295),(795,295),(795,210)],[(180,295),(180,445),(285,460)],[(1067,145),(930,165)],[(1067,145),(1020,145),(1020,80),(425,80),(425,120)],[(123,450),(285,485)],[(1067,450),(930,460)]]:d.edge(pts,False)
        d.text(300,320,600,55,'Отправка и получение результата — разные операции',23)
    return d.save()

def activity():
    d=D('pr9_activity',1200,1060)
    for x,w,t in [(10,270,'Менеджер'),(280,620,'Информационная система'),(900,290,'Ozon')]:
        d.shape(x,10,w,1030,'','rect');d.text(x+5,15,w-10,45,t,25,True)
    d.dot(145,100);d.edge([(145,109),(145,150)])
    d.shape(35,150,220,85,'Выбрать карточку\nи подтвердить отправку',size=22)
    d.edge([(255,192),(390,192)])
    d.shape(390,150,400,85,'Проверить поля, версии\nи техническое согласование',size=24)
    d.edge([(590,235),(590,270)]);d.shape(530,270,120,90,'','diamond')
    d.text(665,265,220,75,'Карточка\nготова?',23)
    d.edge([(530,315),(255,315)],True);d.text(345,280,140,30,'[нет]',22)
    d.shape(35,270,220,90,'Исправить замечания\nи повторить позднее',size=22);d.edge([(145,360),(145,405)]);d.dot(145,420,True)
    d.edge([(590,360),(590,420)]);d.text(602,366,100,35,'[да]',22)
    d.shape(390,420,400,80,'Сохранить попытку\nи неизменяемый пакет',size=24)
    d.edge([(790,460),(930,460)]);d.shape(930,420,230,80,'Принять пакет\nв обработку',size=23)
    d.edge([(1045,500),(1045,550)]);d.shape(930,550,230,80,'Обработать\nи выдать результат',size=23)
    d.edge([(930,590),(790,590)]);d.shape(390,550,400,80,'Получить статус\nлибо зафиксировать тайм-аут',size=24)
    d.edge([(590,630),(590,665)]);d.shape(530,665,120,90,'','diamond')
    d.text(670,678,190,55,'Ответ получен?',23)
    d.edge([(650,710),(855,710),(855,820),(790,820)]);d.text(815,745,70,35,'[нет]',22)
    d.shape(390,780,400,80,'Сохранить «ожидание»;\nзапросить статус по идентификатору',size=23)
    d.edge([(390,820),(330,820),(330,590),(390,590)])
    d.edge([(590,755),(590,770),(315,770),(315,930),(390,930)]);d.text(330,735,90,35,'[да]',22)
    d.shape(390,885,400,90,'Сохранить «опубликовано»\nили «отклонено» и замечания',size=24)
    d.edge([(790,930),(1045,930),(1045,992)]);d.dot(1045,1008,True)
    return d.save()

def sequence():
    d=D('pr9_sequence',1200,635)
    xs=[95,315,550,790,1080];labels=['менеджер','ui : Интерфейс','svc : Публикация','repo : Репозиторий','ozon : Ozon']
    for x,t in zip(xs,labels):
        d.shape(x-90,10,180,62,t,'rect',22);d.edge([(x,72),(x,620)],False,True)
        d.edge([(x-65,56),(x+65,56)],False)
    calls=[(0,1,110,'1. Отправить'),(1,2,163,'2. publish()'),(2,3,216,'3. Сохранить'),(3,2,269,'4. attemptId'),(2,4,322,'5. Передать пакет'),(4,2,375,'6. ID обработки'),(2,3,428,'7. Ожидание'),(2,1,481,'8. Номер попытки'),(2,4,534,'9. Запросить результат'),(4,2,587,'10. Статус / замечания')]
    for a,b,y,s in calls:
        d.edge([(xs[a],y),(xs[b],y)],True,a>b,True)
        d.text(min(xs[a],xs[b])+5,y-34,abs(xs[b]-xs[a])-10,30,s,20)
    return d.save()

def components():
    d=D('pr10_components',1200,635)
    boxes=[(15,195,235,120,'«component»\nВеб-интерфейс'),(375,65,365,110,'«component»\nПрикладные сервисы\nBOM / расчёт / карточка'),(375,260,365,110,'«component»\nКонтроль доступа\nи аудит'),(375,460,365,110,'«component»\nРепозиторий данных'),(910,70,270,115,'«component»\nИмпорт источников'),(910,300,270,115,'«component»\nАдаптер Ozon'),(910,495,270,100,'«external system»\nOzon')]
    for x,y,w,h,s in boxes:d.shape(x,y,w,h,s,'rect',23)
    for pts in [[(250,225),(305,225),(305,120),(375,120)],[(555,175),(555,260)],[(500,175),(330,175),(330,515),(375,515)],[(1045,185),(1045,230),(770,230),(770,120),(740,120)],[(740,120),(820,120),(820,355),(910,355)],[(1045,415),(1045,495)]]:d.edge(pts,dash=True,open=True)
    d.text(245,60,125,60,'HTTPS\nAPI',21);d.text(565,202,155,40,'IAccess',21);d.text(165,423,160,55,'IRepository',21);d.text(760,249,170,40,'IPublisher',21);d.text(1050,437,135,40,'HTTPS',21)
    return d.save()

def deployment():
    d=D('pr10_deployment',1200,635)
    d.shape(15,180,230,160,'«device»\nРабочий компьютер\n\n«artifact»\nВеб-интерфейс','rect',23)
    d.shape(375,40,480,505,'','rect')
    d.text(390,50,450,60,'«executionEnvironment»\nСерверная виртуальная машина',25,True)
    d.shape(410,145,410,110,'«artifact» Приложение\nСервисы / импорт / адаптер / аудит','rect',23)
    d.shape(410,355,410,105,'«executionEnvironment» PostgreSQL\n«artifact» База данных','rect',23)
    d.shape(950,60,230,145,'«external node»\nOzon\nСервис публикации','rect',23)
    d.shape(950,395,230,160,'«device»\nОтдельное хранилище\n\n«artifact»\nРезервные копии','rect',23)
    d.edge([(245,260),(310,260),(310,200),(410,200)],False);d.text(245,172,160,45,'HTTPS',22)
    d.edge([(615,255),(615,355)],False);d.text(620,278,160,45,'локальный SQL',21)
    d.edge([(820,195),(890,195),(890,130),(950,130)],False);d.text(845,76,100,40,'HTTPS',21)
    d.edge([(820,407),(895,407),(895,475),(950,475)],False);d.text(842,336,120,58,'Защищённый\nканал',20)
    d.text(380,560,475,60,'Пилот: 4 vCPU, 8 ГБ RAM, 100 ГБ SSD\nКонфигурация уточняется нагрузочным тестом',22)
    return d.save()

def gantt():
    d=D('pr11_gantt',1200,640)
    labels=['1.1 Обследование','1.2 Требования','2.1 Данные и версии','2.2 Интерфейсы','3.1 Справочники / BOM','3.2 Расчёты / карточки','3.3 Обмен / аудит','4.1 Испытания','4.2 Обучение / пилот','4.3 Приёмка']
    intervals=[(1,1),(2,2),(3,3),(3,4),(4,6),(6,7),(7,8),(9,9),(10,11),(12,12)]
    left=370;cw=65;rh=48
    for w in range(1,13):d.text(left+(w-1)*cw,30,cw,40,str(w),24,True)
    d.text(15,30,335,40,'Пакет работ / неделя',24,True)
    for i,(label,(a,b)) in enumerate(zip(labels,intervals)):
        y=80+i*rh;d.text(5,y,350,rh,label,23)
        for w in range(13):d.edge([(left+w*cw,y),(left+w*cw,y+rh)],False)
        d.edge([(left,y+rh),(left+12*cw,y+rh)],False)
        d.shape(left+(a-1)*cw+5,y+10,(b-a+1)*cw-10,28,'','rect')
    d.text(5,582,1180,38,'Вехи: Н2 — требования; Н4 — проект; Н8 — сборка; Н9 — допуск к пилоту; Н12 — приёмка',23)
    return d.save()

def build():
    # User explicitly deferred diagram families missing in OmniNotation.
    paths={'uc_data':usecases(True),'uc_pub':usecases(False),'sequence':sequence()}
    mx=E.Element('mxfile',host='app.diagrams.net',agent='Codex')
    for d in ALL:
        pg=E.SubElement(mx,'diagram',name=d.name,id=d.name);m=E.SubElement(pg,'mxGraphModel',page='1',pageWidth=str(d.w),pageHeight=str(d.h));m.append(d.root)
    E.ElementTree(mx).write(BASE.parent.parent/'4/ИМ/ИМ_Практические_6-12_Диаграммы.drawio',encoding='utf-8',xml_declaration=True)
    return paths
