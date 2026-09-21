from pathlib import Path
import math, textwrap
from xml.etree import ElementTree as E
from PIL import Image, ImageDraw, ImageFont

BASE=Path(__file__).resolve().parent
OUT=BASE/'figures';OUT.mkdir(exist_ok=True)
ALL=[]

class Diagram:
    def __init__(self,name,w=1200,h=650):
        self.name,self.w,self.h=name,w,h
        self.im=Image.new('RGB',(w*2,h*2),'white');self.d=ImageDraw.Draw(self.im)
        self.root=E.Element('root');E.SubElement(self.root,'mxCell',id='0');E.SubElement(self.root,'mxCell',id='1',parent='0');self.i=1
    def text(self,x,y,w,h,s,size=22,bold=False,box=False):
        self.i+=1
        style=f'whiteSpace=wrap;html=0;align=center;verticalAlign=middle;fontFamily=Times New Roman;fontSize={size};fontColor=#000000;'
        style+=('rounded=0;strokeColor=#000000;fillColor=#FFFFFF;strokeWidth=1.4;' if box else 'text;strokeColor=none;fillColor=#FFFFFF;')
        if bold:style+='fontStyle=1;'
        c=E.SubElement(self.root,'mxCell',id=str(self.i),value=s,style=style,vertex='1',parent='1');E.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
        font=ImageFont.truetype('C:/Windows/Fonts/timesbd.ttf' if bold else 'C:/Windows/Fonts/times.ttf',int(size*2))
        lines=[]
        for para in s.split('\n'):
            line=''
            for word in para.split():
                candidate=(line+' '+word).strip()
                if line and self.d.textlength(candidate,font=font)>w*2-14:lines.append(line);line=word
                else:line=candidate
            lines.append(line)
        lh=int(size*2*1.12);yy=y*2+(h*2-len(lines)*lh)/2
        if box:self.d.rectangle((x*2,y*2,(x+w)*2,(y+h)*2),outline='black',width=3)
        else:self.d.rectangle((x*2,y*2,(x+w)*2,(y+h)*2),fill='white')
        for line in lines:
            self.d.text((x*2+w-self.d.textlength(line,font=font)/2,yy),line,font=font,fill='black',stroke_width=0);yy+=lh
        return str(self.i)
    def arrow(self,pts,arrow=True,dash=False):
        self.i+=1
        self.d.line([(int(x*2),int(y*2)) for x,y in pts],fill='black',width=3,joint='curve')
        if arrow:
            (x0,y0),(x1,y1)=pts[-2:];a=math.atan2(y1-y0,x1-x0)
            tri=[(x1*2,y1*2),((x1-10*math.cos(a)+5*math.sin(a))*2,(y1-10*math.sin(a)-5*math.cos(a))*2),((x1-10*math.cos(a)-5*math.sin(a))*2,(y1-10*math.sin(a)+5*math.cos(a))*2)]
            self.d.polygon(tri,fill='black')
        style=f'edgeStyle=none;endArrow={"block" if arrow else "none"};endFill=1;strokeColor=#000000;strokeWidth=1.4;'
        c=E.SubElement(self.root,'mxCell',id=str(self.i),value='',style=style,edge='1',parent='1')
        g=E.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
        E.SubElement(g,'mxPoint',x=str(pts[0][0]),y=str(pts[0][1]),attrib={'as':'sourcePoint'})
        E.SubElement(g,'mxPoint',x=str(pts[-1][0]),y=str(pts[-1][1]),attrib={'as':'targetPoint'})
        if len(pts)>2:
            ar=E.SubElement(g,'Array',attrib={'as':'points'})
            for x,y in pts[1:-1]:E.SubElement(ar,'mxPoint',x=str(x),y=str(y))
    def save(self):
        p=OUT/(self.name+'.png');self.im.save(p);ALL.append(self);return p

def context(name,future=False):
    d=Diagram(name,1200,595)
    title='Сформировать и актуализировать карточку компьютерной системы'
    d.text(415,205,375,225,title+'\n\nA0',25,True,True)
    ins=['I1 Заявка и исходная BOM','I2 Цены и остатки','I3 Изображения','I4 Ответ о публикации']
    for y,t in zip([225,280,335,390],ins):
        d.text(0,y-24,270,48,t,21);d.arrow([(270,y),(415,y)])
    outs=['O1 Пакет карточки','O2 Статус и замечания','O3 Реестр и отчёт']
    if future:outs.append('O4 Контрольные документы')
    ys=[245,315,390] if not future else [235,295,355,410]
    for y,t in zip(ys,outs):
        d.arrow([(790,y),(930,y)]);d.text(930,y-27,270,54,t,21)
    controls=['C1 Приоритеты\nи правила цены','C2 Правила\nсовместимости','C3 Требования\nк карточке']
    for center,target,t in zip([310,600,890],[455,600,745],controls):
        d.text(center-120,50,240,75,t,21)
        d.arrow([(center,130),(center,165),(target,165),(target,205)])
    d.text(330,505,545,80,'M1 Менеджер, производство, дизайнер\nM2 '+('Проектируемая ИС, БД, интеграции' if future else 'Таблицы, файлы, почта, кабинет продавца'),22)
    d.arrow([(520,505),(520,430)]);d.arrow([(695,505),(695,430)])
    d.text(0,0,350,36,'A-0  |  '+('КАК ДОЛЖНО БЫТЬ' if future else 'КАК ЕСТЬ'),22,True)
    return d.save()

def decomposition(name,future=False):
    d=Diagram(name,1200,620)
    labels=(['Собрать исходные данные','Проверить BOM и рассчитать параметры','Подготовить содержание карточки','Опубликовать и учесть результат'] if not future else ['Принять и нормализовать данные','Проверить версию BOM и согласовать','Сформировать и утвердить карточку','Опубликовать и проверить результат'])
    xs=[70,345,620,895];ys=[170,235,300,365];w=180;h=100
    for i,(x,y,s) in enumerate(zip(xs,ys,labels)):
        d.text(x,y,w,h,s+'\nA'+str(i+1),20,True,True)
        d.arrow([(x+55,105),(x+55,y)])
        d.text(x-5,45,w+10,56,['C1','C1, C2','C3','C1, C3'][i],21)
        d.arrow([(x+100,540),(x+100,y+h)])
        d.text(x-10,545,w+20,65,('M1, M2\nИС и сотрудник' if future else 'M1, M2\nСотрудник и файлы'),19)
    # Each boundary bundle terminates on the input (left) face.
    d.arrow([(5,205),(70,205)]);d.text(0,160,68,40,'I1, I2',20)
    for i in range(3):
        x,y=xs[i],ys[i];nx,ny=xs[i+1],ys[i+1]
        d.arrow([(x+w,y+42),(x+w+55,y+42),(x+w+55,ny+35),(nx,ny+35)])
        d.text(x+w+4,y-13,93,50,['D1 Данные','D2 BOM, расчёт','D3 Карточка'][i],18)
    d.arrow([(535,465),(570,465),(570,375),(620,375)]);d.text(485,430,80,40,'I3',21)
    d.arrow([(800,485),(845,485),(845,440),(895,440)]);d.text(785,440,58,32,'I4',21)
    # External outputs from last stage: bundle expands in the ICOM table.
    d.arrow([(1075,402),(1198,402)]);d.text(1080,337,115,62,'O1, O2,\nO3'+(', O4' if future else ''),20)
    # Feedback to technical verification after a rejection or changed input.
    d.arrow([(1075,440),(1180,440),(1180,520),(320,520),(320,312),(345,312)])
    d.text(470,488,225,49,'D4 Замечания / изменения',19)
    d.text(0,0,590,36,'A0  |  ДЕКОМПОЗИЦИЯ  |  '+('КАК ДОЛЖНО БЫТЬ' if future else 'КАК ЕСТЬ'),22,True)
    return d.save()

def flows():
    d=Diagram('pr2_flows',1200,620)
    d.text(425,230,350,155,'Отдел электронной коммерции\nМенеджер маркетплейсов',24,True,True)
    boxes=[(20,60,260,90,'Поставщики'),(450,25,300,90,'Генеральный директор'),(920,60,260,90,'Производственный участок'),(20,265,260,90,'Складской отдел'),(920,265,260,90,'Дизайнер'),(20,480,260,90,'Ozon'),(465,495,270,90,'ИТ-поддержка')]
    for a in boxes:d.text(*a,22,True,True)
    for pts in [[(280,105),(330,105),(330,260),(425,260)],[(600,115),(600,230)],[(650,230),(650,155),(790,155),(790,70),(750,70)],[(920,110),(855,110),(855,255),(775,255)],[(775,290),(890,290),(890,135),(920,135)],[(280,305),(425,305)],[(920,305),(775,305)],[(775,350),(850,350),(850,335),(920,335)],[(425,360),(340,360),(340,510),(280,510)],[(280,550),(390,550),(390,375),(425,375)],[(600,385),(600,495)],[(650,495),(650,455),(705,455),(705,385)]]:d.arrow(pts)
    for a in [(295,113,85,40,'F02'),(515,143,80,40,'F01'),(688,155,90,38,'F13'),(810,165,80,60,'F04\nF07'),(859,208,65,42,'F03'),(301,271,104,38,'F05'),(800,301,85,40,'F09'),(808,355,95,40,'F08'),(289,399,78,48,'F10'),(344,552,75,38,'F11'),(506,423,100,45,'F12'),(673,459,95,38,'F14')]:d.text(*a,21)
    d.text(845,483,345,97,'F06 формируется внутри отдела.\nПолные названия потоков —\nв реестре таблиц 2 и 3.',20)
    return d.save()

def wbs():
    d=Diagram('pr3_wbs',1200,620)
    d.text(330,15,540,85,'0 ИС подготовки и актуализации карточек',25,True,True)
    stages=['1 Требования','2 Проектирование','3 Разработка','4 Внедрение']
    leaves=[['1.1 Обследование','1.2 Требования и ТЗ'],['2.1 Модель данных','2.2 Интерфейсы и правила'],['3.1 Справочники и BOM','3.2 Карточки и расчёты','3.3 Обмен и аудит'],['4.1 Испытания','4.2 Обучение и пилот','4.3 Приёмка и передача']]
    for i,x in enumerate([10,315,620,925]):
        d.arrow([(600,100),(600,140),(x+132,140),(x+132,185)],False)
        d.text(x,185,265,70,stages[i],23,True,True)
        for j,s in enumerate(leaves[i]):
            yy=310+j*100;d.arrow([(x+12,255),(x+12,yy+33),(x+34,yy+33)],False);d.text(x+34,yy,231,67,s,21,False,True)
    return d.save()

def build():
    paths={'flows':flows(),'wbs':wbs(),'as_context':context('pr4_context'),'as_decomp':decomposition('pr4_decomp'),'to_context':context('pr5_context',True),'to_decomp':decomposition('pr5_decomp',True)}
    mx=E.Element('mxfile',host='app.diagrams.net',agent='Codex',version='24.7.17')
    for d in ALL:
        page=E.SubElement(mx,'diagram',name=d.name,id=d.name);m=E.SubElement(page,'mxGraphModel',dx=str(d.w),dy=str(d.h),grid='1',gridSize='10',page='1',pageScale='1',pageWidth=str(d.w),pageHeight=str(d.h));m.append(d.root)
    E.ElementTree(mx).write(BASE.parent.parent/'4/ИМ/ИМ_Практические_2-5_Диаграммы.drawio',encoding='utf-8',xml_declaration=True)
    return paths
