import json,re,shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(r'D:/GitHub/MIREA')
out=root/'tmp/ppois_pr4'
out.mkdir(parents=True,exist_ok=True)
# Prepare class model from OmniNotation's validated example.
src=Path(r'D:/OmniNotation/examples/cards-uml.omni')
class_out=out/'ПР4_Модель_проектирования.omni'
d=json.loads(src.read_text(encoding='utf-8'))
remove={'revision_images','image_revision_end','image_image_end','v_analysis_revision_images_1','domain_assumptions','v_analysis_domain_assumptions_1'}
# update title and remove distracting relation/note
for e in d['model']['elements']:
    if e['id']=='analysis': e['label']='Классы проектирования'
d['source']=re.sub(r'(?m)^diagram analysis "[^"]*"', 'diagram analysis "Классы проектирования"', d['source'])
d['draft']=re.sub(r'(?m)^diagram analysis "[^"]*"', 'diagram analysis "Классы проектирования"', d['draft'])
d['model']['elements']=[e for e in d['model']['elements'] if e['id'] not in remove]
d['layout']['nodes']={k:v for k,v in d['layout']['nodes'].items() if k not in remove}
# remove source declarations exactly by second token id
for ident in remove:
    d['source']=re.sub(rf'(?m)^\S+\s+{re.escape(ident)}(?:\s|$).*\n?', '', d['source'])
    d['draft']=re.sub(rf'(?m)^\S+\s+{re.escape(ident)}(?:\s|$).*\n?', '', d['draft'])
class_out.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
# Activity model from the validated OmniNotation example.
act_src=Path(r'D:/OmniNotation/examples/activity-parallel-pins.omni')
a=json.loads(act_src.read_text(encoding='utf-8'))
repls={
 'Параллельная подготовка':'Актуализация карточки товара',
 'Потоки управления и данных':'Параллельная подготовка BOM и контента',
 'Подготовить карточку':'Актуализировать карточку',
 'Подготовить BOM':'Сформировать BOM',
 'Получить предложения':'Загрузить цены и наличие',
 'Версия карточки':'Версия BOM',
 'Версия':'Версия BOM',
 'Готово?':'Готова к публикации?',
 'Принять':'Опубликовать карточку',
 'Вернуть на доработку':'Показать ошибки и вернуть на доработку',
 'Остаток':'Незавершённые данные',
 'Отбросить':'Зафиксировать ошибку'
}
for e in a['model']['elements']:
    if e['label'] in repls: e['label']=repls[e['label']]
for old,new in repls.items():
    a['source']=a['source'].replace(old,new)
    a['draft']=a['draft'].replace(old,new)
# keep source/model title exact after replacements
(aout:=out/'ПР4_Модель_деятельности.omni').write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8')
# State diagram PNG
W,H=1800,1050
img=Image.new('RGB',(W,H),'white'); dr=ImageDraw.Draw(img)
font_paths=[r'C:/Windows/Fonts/arial.ttf',r'C:/Windows/Fonts/ARIAL.TTF']
bold_paths=[r'C:/Windows/Fonts/arialbd.ttf',r'C:/Windows/Fonts/ARIALBD.TTF']
def f(sz,b=False):
    for p in (bold_paths if b else font_paths):
        if Path(p).exists(): return ImageFont.truetype(p,sz)
    return ImageFont.load_default()
F=f(28); FB=f(30,True); FS=f(24); FSB=f(26,True)
ink=(24,39,64); line=(50,68,95); pale=(247,249,252); error=(255,244,244); green=(239,249,241); yellow=(255,250,230)
# helpers
def center_text(box,text,font,fill=ink):
    x1,y1,x2,y2=box; bb=dr.multiline_textbbox((0,0),text,font=font,spacing=4,align='center'); tw=bb[2]-bb[0]; th=bb[3]-bb[1]; dr.multiline_text(((x1+x2-tw)/2,(y1+y2-th)/2),text,font=font,fill=fill,spacing=4,align='center')
def box(x,y,w,h,text,fill=pale,stroke=line):
    dr.rounded_rectangle((x,y,x+w,y+h),radius=22,fill=fill,outline=stroke,width=3); center_text((x,y,x+w,y+h),text,FB)
def arrow(p1,p2,label='',dash=False):
    dr.line([p1,p2],fill=line,width=4,joint='curve')
    import math
    ang=math.atan2(p2[1]-p1[1],p2[0]-p1[0]); L=18
    a1=(p2[0]-L*math.cos(ang-0.5),p2[1]-L*math.sin(ang-0.5)); a2=(p2[0]-L*math.cos(ang+0.5),p2[1]-L*math.sin(ang+0.5))
    dr.polygon([p2,a1,a2],fill=line)
    if label:
        mx=(p1[0]+p2[0])//2; my=(p1[1]+p2[1])//2-34
        dr.rounded_rectangle((mx-95,my-4,mx+95,my+32),radius=8,fill='white')
        bb=dr.textbbox((0,0),label,font=FS); dr.text((mx-(bb[2]-bb[0])/2,my),label,font=FS,fill=ink)
# title
center_text((0,20,W,85),'Жизненный цикл карточки товара',FB)
# positions
states={
 'draft':(90,180,250,115,'Черновик',pale),
 'check':(420,180,270,115,'На проверке',pale),
 'ready':(770,180,320,115,'Готова к публикации',green),
 'publish':(1180,180,280,115,'Публикуется',yellow),
 'published':(1510,180,220,115,'Опубликована',green),
 'checkerr':(420,510,270,115,'Ошибка проверки',error),
 'puberr':(1110,510,300,115,'Ошибка публикации',error),
 'retry':(1490,510,250,115,'Повторная отправка',yellow),
 'stale':(1510,760,220,115,'Требует\nактуализации',yellow)
}
for k,(x,y,w,h,t,fill) in states.items(): box(x,y,w,h,t,fill=fill)
# initial
cx,cy=45,237; dr.ellipse((cx-18,cy-18,cx+18,cy+18),fill=ink)
arrow((cx+20,cy),(90,237),''); center_text((0,300,190,350),'создание / изменение',FS)
arrow((340,237),(420,237),'отправить на проверку')
arrow((690,237),(770,237),'проверка пройдена')
arrow((1090,237),(1180,237),'опубликовать')
arrow((1460,237),(1510,237),'приём Ozon')
# error branches
arrow((555,295),(555,510),'ошибки обязательных данных')
arrow((1110,295),(1260,510),'отказ или ошибка API')
arrow((1410,567),(1490,567),'повторить после сверки')
arrow((1620,295),(1620,760),'изменение данных')
arrow((1620,760),(215,295),'новая версия',dash=True)
# annotations
center_text((20,920,W-20,1010),'Перед переходом к публикации система сохраняет версию BOM, результат проверки и попытку обмена с Ozon.',FS)
img.save(out/'ПР4_03_Диаграмма_состояний.png')



