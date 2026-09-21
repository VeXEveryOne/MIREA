from pathlib import Path
import json,html,textwrap
from schema import tables,ROOT
OUT=ROOT/'Черновики_схем';OUT.mkdir(parents=True,exist_ok=True)
catalog=[]
def esc(s):return html.escape(str(s),quote=True)
class Svg:
 def __init__(self,w,h):
  self.w=w;self.h=h;self.parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">','<defs><marker id="arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><path d="M0 0 L9 3.5 L0 7" fill="none" stroke="#333"/></marker></defs>',f'<rect width="{w}" height="{h}" fill="white"/>'];self.nodes=[];self.edges=[]
 def text(self,x,y,text,size=20,anchor='middle',bold=False,width=None):
  lines=[]
  for ln in str(text).split('\n'):lines.extend(textwrap.wrap(ln,width=int(width/(size*.54)),break_long_words=False,break_on_hyphens=False) if width and ln else [ln])
  for i,ln in enumerate(lines):self.parts.append(f'<text x="{x}" y="{y+i*size*1.25}" font-family="Arial" font-size="{size}" font-weight="{"bold" if bold else "normal"}" text-anchor="{anchor}" fill="#111">{esc(ln)}</text>')
  return len(lines)*size*1.25
 def box(self,id,label,x,y,w=260,h=95,kind='box',size=20,body=None):
  self.nodes.append(dict(id=id,label=label,x=x,y=y,w=w,h=h,kind=kind,body=body))
  if kind=='decision':self.parts.append(f'<polygon points="{x+w/2},{y} {x+w},{y+h/2} {x+w/2},{y+h} {x},{y+h/2}" fill="white" stroke="#222" stroke-width="2"/>')
  elif kind in ('start','end'):
   self.parts.append(f'<circle cx="{x+w/2}" cy="{y+h/2}" r="{min(w,h)/2-3}" fill="{"#222" if kind=="start" else "white"}" stroke="#222" stroke-width="2"/>')
   if kind=='end':self.parts.append(f'<circle cx="{x+w/2}" cy="{y+h/2}" r="{min(w,h)/2-9}" fill="#222"/>')
  elif kind=='io':self.parts.append(f'<polygon points="{x+22},{y} {x+w},{y} {x+w-22},{y+h} {x},{y+h}" fill="white" stroke="#222" stroke-width="2"/>')
  else:self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{15 if kind=="action" else 0}" fill="white" stroke="#222" stroke-width="2"/>')
  if kind not in ('start','end'):
   if body is not None:
    self.text(x+w/2,y+28,label,size,bold=True,width=w-18);self.parts.append(f'<path d="M{x} {y+42} H{x+w}" stroke="#222"/>');self.text(x+12,y+65,body,size-2,'start',width=w-22)
   else:
    ls=sum(max(1,len(textwrap.wrap(l,int((w-20)/(size*.54)),break_long_words=False))) for l in label.split('\n'))
    self.text(x+w/2,y+h/2-(ls-1)*size*.625+size*.32,label,size,width=w-24)
  return id
 def line(self,a,b,label='',points=None,style='solid',labelpos=None,arrow=True):
  na=next(n for n in self.nodes if n['id']==a);nb=next(n for n in self.nodes if n['id']==b)
  if points is None:
   ax=na['x']+na['w']/2;ay=na['y']+na['h']/2;bx=nb['x']+nb['w']/2;by=nb['y']+nb['h']/2
   if abs(by-ay)>=abs(bx-ax)*.6:
    ay+=na['h']/2*(1 if by>ay else -1);by-=nb['h']/2*(1 if by>ay else -1);points=[(ax,ay),(ax,(ay+by)/2),(bx,(ay+by)/2),(bx,by)]
   else:
    ax+=na['w']/2*(1 if bx>ax else -1);bx-=nb['w']/2*(1 if bx>ax else -1);points=[(ax,ay),((ax+bx)/2,ay),((ax+bx)/2,by),(bx,by)]
  self.parts.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" fill="none" stroke="#333" stroke-width="1.8" {"stroke-dasharray=\"7 5\"" if style=="dashed" else ""} {"marker-end=\"url(#arrow)\"" if arrow else ""}/>')
  if label:
   x,y=labelpos or ((points[0][0]+points[-1][0])/2+12,(points[0][1]+points[-1][1])/2-8)
   self.parts.append(f'<rect x="{x-len(label)*4.6}" y="{y-19}" width="{len(label)*9.2}" height="24" fill="white"/>');self.text(x,y,label,17)
  self.edges.append(dict(source=a,target=b,label=label,points=points,style=style))
 def save(self,id,title,practice,requirement,note=''):
  p=OUT/(id+'.svg');p.write_text(''.join(self.parts)+ '</svg>',encoding='utf-8')
  spec=dict(id=id,title=title,practice=practice,requirement=requirement,status='Черновик для переноса в OmniNotation',note=note,width=self.w,height=self.h,nodes=self.nodes,edges=self.edges)
  (OUT/(id+'.draft.json')).write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf-8')
  catalog.append(spec)

def function_tree():
 s=Svg(1560,690);s.box('root','Подготовить и актуализировать\nкарточки компьютерных систем',480,20,600,85)
 branches=[('b1','BOM и правила','Версии и слоты\nСовместимость\nМассовая замена'),('b2','Предложения','Сопоставление SKU\nЗагрузка цен и остатков\nВыбор предложения'),('b3','Расчёты и контент','Цена и масса\nАтрибуты и описание\nИзображения'),('b4','Публикация','Контроль готовности\nОтправка и статус\nПовторы и уведомления'),('b5','Администрирование','Пользователи и роли\nАудит изменений\nПравила и справочники')]
 for i,(id,t,b) in enumerate(branches):
  x=20+i*310;s.box(id,t,x,210,280,65);s.box(id+'d',b,x,410,280,165);s.line('root',id,points=[(780,105),(780,155),(x+140,155),(x+140,210)]);s.line(id,id+'d')
 s.save('D01_function_tree','Дерево функций',2,'ПР2 с.2–3')

def component():
 s=Svg(1480,840)
 nodes=[('ui','«component»\nВеб-интерфейс',30,280,270,115),('auth','«component»\nПроверка прав и аудит',385,35,280,110),('bom','«component»\nBOM и правила',385,235,280,110),('content','«component»\nРасчёты и контент',385,480,280,110),('pub','«component»\nПубликации и очередь',800,480,280,110),('sup','«component»\nАдаптеры поставщиков',800,235,280,110),('db','«component»\nРепозитории PostgreSQL',780,35,310,110),('ext','«external»\nPC4Games и ITPartner',1160,235,290,110),('oz','«external»\nOzon Seller',1160,480,290,110),('media','«component»\nХранилище изображений',785,700,310,110)]
 for a,b,x,y,w,h in nodes:s.box(a,b,x,y,w,h)
 for a,b,l in [('ui','bom','HTTPS / JSON'),('bom','auth','проверка роли'),('bom','db','репозитории'),('bom','sup','предложения'),('sup','ext','адаптер'),('bom','content','версия BOM'),('content','pub','версия карточки'),('pub','oz','HTTPS / JSON'),('content','media','файлы')]:s.line(a,b,l,style='dashed')
 s.text(735,655,'Стрелка зависимости направлена к используемому компоненту',18)
 s.save('D02_component','Диаграмма компонентов',2,'ПР2 с.2–4','Модульный монолит. Репозитории и аудит используются всеми бизнес-модулями; повторяющиеся зависимости опущены для читаемости.')

def erd():
 # Six coherent views keep complete attributes readable; all FK links are also listed in the model.
 groups=[['supplier','component','characteristic','component_value','component_group','supplier_product','supplier_offer'],['bom','change_request','bom_version','bom_slot','slot_selection','compatibility_rule','validation_result'],['replacement_rule','replacement_batch','replacement_item','calculation_rule'],['card','card_version','image_template','image_asset','card_image','publication'],['role','app_user','user_role','audit_event','notification']]
 lookup={t['name']:t for t in tables}
 for physical in [False,True]:
  for j,names in enumerate(groups,1):
   # Tables at top and bottom connected through a central routing band.
   s=Svg(1640,940 if len(names)>4 else 520);s.text(820,30,('Физическая' if physical else 'Логическая')+' модель. Представление '+str(j),28,bold=True)
   for i,name in enumerate(names):
    t=lookup[name];x=30+(i%4)*405;y=80+(i//4)*430;lines=[]
    keys=[c for c in t['columns'] if 'PRIMARY KEY' in c['rule'] or 'REFERENCES' in c['rule']]
    others=[c for c in t['columns'] if c not in keys][:2]
    selected=keys+others
    for c in selected:
     mark='PK ' if 'PRIMARY KEY' in c['rule'] else ('FK ' if 'REFERENCES' in c['rule'] else '')
     typ=c['type'].replace('bigint','i8').replace('integer','i4').replace('smallint','i2').replace('varchar','v').replace('numeric','n').replace('timestamptz','tz').replace('boolean','bool').replace('jsonb','json')
     lines.append(mark+c['name']+(' '+typ if physical else ''))
    if len(selected)<len(t['columns']):lines.append('… полный состав в словаре')
    body='\n'.join(lines);h=max(170,75+len(lines)*30)
    s.box(name,name,x,y,370,h,size=24,body=body)
   for a in s.nodes[:]:
    t=lookup[a['id']]
    refs={c['ref'] for c in t['columns'] if c['ref'] in names and c['ref']!=a['id']}
    # Each FK arrow is navigated via the outer side corridor to avoid covering fields.
    for k,b in enumerate(sorted(refs)):
     nb=next(n for n in s.nodes if n['id']==b)
     offset=16+k*8
     x1=a['x']+a['w'];y1=a['y']+48+k*16;x2=nb['x']+nb['w'];y2=nb['y']+48+k*16
     if (a['y']==nb['y']):
      yy=a['y']-16-k*9;points=[(x1,y1),(x1+offset,y1),(x1+offset,yy),(x2+offset,yy),(x2+offset,y2),(x2,y2)]
     else:
      yy=480+k*7;points=[(x1,y1),(x1+offset,y1),(x1+offset,yy),(x2+offset,yy),(x2+offset,y2),(x2,y2)]
     s.line(a['id'],b,points=points)
   s.text(25,s.h-45,'FK → родитель: N : 1; NULL допускает 0..1. Составные PK и все атрибуты — в словаре.',23,'start')
   if physical:s.text(25,s.h-15,'i8/i4/i2 — целые; v(n) — varchar; n(p,s) — numeric; tz — timestamptz; json — jsonb.',21,'start')
   id=('D20_physical_' if physical else 'D03_logical_')+str(j)
   s.save(id,('Физическая' if physical else 'Логическая')+' модель данных, вид '+str(j),7 if physical else 3,'ПР7 с.2–4' if physical else 'ПР3 с.2–3','Полный словарь атрибутов, составные ключи и межвидовые FK — в отчёте и База_данных/model.json. Диаграммы вместе составляют одну модель из 29 таблиц.')

def coding():
 s=Svg(1280,590);s.text(640,60,'BOM-000153',42,bold=True)
 for i,(id,title,body) in enumerate([('prefix','BOM','Тип объекта: конфигурация\nПостоянный префикс'),('seq','000153','Номер из sequence\n000001–999999')]):s.box(id,title,140+i*565,155,445,80);s.box(id+'v',body,140+i*565,340,445,125);s.line(id,id+'v')
 s.text(640,535,'UNIQUE(code); номера не переиспользуются; пропуски допустимы',22)
 s.save('D04_coding','Схема кодирования BOM',3,'ПР3 с.4','При исчерпании диапазона миграция формата. Версия хранится отдельно как version_no.')

def wireframes():
 specs=[('01','Список карточек',['Поиск по BOM, корпусу, компоненту и поставщику','Статус: все     Ответственный: все     [Найти]'],['BOM-000153     ПК на базе AM5     Готова     версия 3','BOM-000154     ПК на базе LGA1700     Ошибка публикации','BOM-000155     Компактный ПК     Требует актуализации'],['Создать запрос','Открыть карточку'],'Выбор строки открывает карточку. Ошибка содержит код и ссылку на попытку.'),('02','Редактор версии BOM',['BOM-000153  Версия 3  Корпус: CASE-001  Черновик','Слот: плата  Выбор: точная модель / группа характеристик'],['CPU     CPU-001     1 шт.     AM5','BOARD     группа LGA1700     1 шт.     разрешена BOARD-002','RAM     RAM-001     2 шт.     DDR5'],['Сохранить черновик','Проверить совместимость'],'Конфликт: сокет платы не соответствует CPU. Показать правило COMP-SOCKET.'),('03','Предложения и сопоставления',['Компонент: BOARD-002   Поставщик: все   Актуальность ≤ 24 ч','Неразрешённые позиции: 3  [Открыть список]'],['PC4Games    SKU 1840    11 500 ₽    8 шт.    17.09 10:00','ITPartner   SKU B6-22   11 700 ₽    5 шт.    17.09 09:45','Локальный остаток отображается справочно'],['Сопоставить SKU','Обновить предложения'],'Устаревшие данные видны с датой. Публикация по ним блокируется.'),('04','Массовая замена',['Исходный компонент: RAM-001   Замена: RAM-002','Область: все активные BOM  [Предпросмотр]'],['Затронуто: 18 BOM    Допустимо: 16    Конфликтов: 2','BOM-000153   версия 3 → 4   цена +400 ₽   совместимо','BOM-000162   конфликт DDR4/DDR5   пропустить'],['Применить к 16 BOM','Отменить'],'Перед применением сверяется версия. Конфликт не меняет исходную BOM.'),('05','Карточка и публикация',['BOM-000153 v3   Карточка v5   Статус: готова','Название и категория   [Предпросмотр на площадке]'],['Себестоимость 79 000 ₽   Цена 98 800 ₽   Масса 10,250 кг','Обязательные атрибуты: заполнены   Изображения: 3','Проверка: совместимо   Предложения: актуальны'],['Утвердить и отправить','Вернуть на исправление'],'После отправки показываются локальный ключ, внешний ID и результат проверки статуса.'),('06','Журнал публикаций и уведомления',['Период: сегодня   Результат: все   Карточка: BOM-000153','Очередь: 2   Ожидают проверки статуса: 1'],['PUB-153-v5   RETRY      повтор 1/3   следующий 10:15','PUB-154-v2   FAILED     обязательный атрибут отсутствует','PUB-152-v7   SUCCESS    внешний ID сохранён'],['Открыть детали','Повторить после исправления'],'Секреты скрыты. При неизвестном результате сначала выполняется сверка статуса.')]
 for num,title,filters,rows,buttons,note in specs:
  s=Svg(1280,800);s.box('app','Юкомс — карточки компьютерных систем',20,20,1240,65,size=24)
  s.box('nav','Карточки\n\nBOM\n\nПредложения\n\nЗамены\n\nПубликации',20,105,190,650,size=20)
  s.text(245,140,title,29,'start',True)
  for i,tx in enumerate(filters):s.box('f'+str(i),tx,240,170+i*70,990,55,size=20)
  for i,tx in enumerate(rows):s.box('r'+str(i),tx,240,350+i*67,990,67,size=19)
  for i,tx in enumerate(buttons):s.box('b'+str(i),tx,240+i*500,590,480,65,size=21)
  s.text(255,710,note,19,'start',width=950)
  s.save('D05_wireframe_'+num,'Экран '+title,4,'ПР4 с.2–3','Каркас SVG для переноса в Figma/OmniNotation. Значения демонстрационные. Прототип не является рабочим интерфейсом.')

def flow(id,title,practice,steps,edges,w=1300,h=1100):
 s=Svg(w,h)
 for node in steps:s.box(*node)
 for edge in edges:
  a,b,*extra=edge;s.line(a,b,**(extra[0] if extra else {}))
 s.save(id,title,practice,'ПР4 с.4–5' if practice==4 else 'ПР5 с.2–3')

def activities():
 flow('D06_activity','Деятельность по подготовке и публикации карточки',4,[('a','',610,15,40,40,'start'),('b','Выбрать BOM\nсоздать новую версию',460,90,340,90,'action'),('c','Изменить состав\nи разрешить группы',460,230,340,90,'action'),('d','Совместимо и\nданные актуальны?',435,380,390,150,'decision'),('e','Рассчитать показатели\nподготовить контент',460,610,340,100,'action'),('f','Утвердить\nи запустить публикацию',460,780,340,95,'action'),('g','Зафиксировать успех\nили ошибку и уведомить',460,950,340,95,'action'),('z','',610,1110,40,40,'end'),('fix','Показать конфликт\nисправить данные',25,385,310,105,'action')],[('a','b'),('b','c'),('c','d'),('d','fix',{'label':'Нет'}),('fix','c',{'points':[(180,385),(180,275),(460,275)]}),('d','e',{'label':'Да'}),('e','f'),('f','g'),('g','z')],1280,1180)
 flow('D07_algorithm_price','Алгоритм расчёта цены и массы',5,[('a','Начало',465,20,350,60,'action'),('b','BOM, выбранные предложения\nи версия правил',440,135,400,95,'io'),('c','Все слоты разрешены,\nцены свежие и масса > 0?',420,290,440,170,'decision'),('err','Выдать причины\nрасчёт не сохранять',30,315,310,105,'io'),('d','C = Σ qᵢpᵢ + A + U\nW = wкорпуса + Σ qᵢwᵢ + wуп',430,530,420,105),('e','P = ceil(C(1 + m)/s) × s\nокруглить массу до 0,001 кг',430,705,420,105),('f','Сохранить расчёт и снимок\nцен, состава и правил',430,885,420,105,'io')],[('a','b'),('b','c'),('c','err',{'label':'Нет'}),('c','d',{'label':'Да'}),('d','e'),('e','f')],1280,1040)
 flow('D08_algorithm_offer','Алгоритм выбора предложения для слота',5,[('a','Начало',440,20,390,60,'action'),('b','Компонент или группа\nколичество и закреплённый SKU',415,135,440,95,'io'),('c','Отфильтровать по совместимости,\nналичию и сроку актуальности',415,305,440,100),('d','Есть допустимые\nпредложения?',415,485,440,150,'decision'),('err','Зафиксировать причину\nпотребовать ручное решение',25,505,320,105,'io'),('e','Сортировать: приоритет поставщика,\nцена, время, идентификатор',405,725,470,105),('f','Сохранить offer_id\nи разрешённый компонент',430,920,420,95,'io')],[('a','b'),('b','c'),('c','d'),('d','err',{'label':'Нет'}),('d','e',{'label':'Да'}),('e','f')],1280,1070)
 flow('D09_algorithm_replace','Алгоритм массовой замены',5,[('a','Предпросмотр и подтверждение\nсписка BOM и версий',430,20,420,95,'io'),('b','Есть следующая BOM?',425,175,430,145,'decision'),('end','Завершить пакет\nпоказать APPLIED / CONFLICT',930,190,330,110,'io'),('c','Версия не изменилась?',425,395,430,145,'decision'),('skip','Сохранить CONFLICT\nисходную BOM не менять',35,420,310,105),('d','Создать новую версию\nзаменить выбранные позиции',430,610,420,100),('e','Проверить и пересчитать\nсохранить атомарно для BOM',430,785,420,100),('f','Отметить карточки STALE\nи добавить аудит',430,960,420,100)],[('a','b'),('b','end',{'label':'Нет'}),('b','c',{'label':'Да'}),('c','skip',{'label':'Нет'}),('c','d',{'label':'Да'}),('d','e'),('e','f'),('f','b',{'points':[(850,1010),(900,1010),(900,250),(855,250)]}),('skip','b',{'points':[(190,420),(190,248),(425,248)]})],1300,1130)

def infra():
 for deploy in [False,True]:
  s=Svg(1500,990)
  boxes=[('client','«device» Рабочие станции\nБраузеры сотрудников',30,330,280,130),('edge','«node» Шлюз / DMZ\nNginx: HTTPS 443\nTLS и маршрутизация',390,315,300,160),('app','«node» Прикладной сервер\nJRE 21: Spring Boot\nAPI и worker публикаций',805,165,310,170),('db','«node» Сервер БД\nPostgreSQL 18\nДанные и очередь',805,485,310,160),('media','«node» Файловое хранилище\nИзображения по storage_key',805,780,310,130),('ext','«external»\nOzon и поставщики\nИнтернет',1170,165,300,145),('backup','«node» Резервное хранилище\nБД и изображения\nОтдельные учётные данные',1170,685,300,160)]
  for a,b,x,y,w,h in boxes:s.box(a,b,x,y,w,h)
  s.line('client','edge','HTTPS 443');s.line('edge','app','HTTPS 8443');s.line('app','db','TLS 5432');s.line('app','ext','HTTPS 443');s.line('db','backup','копия БД',labelpos=(1270,585));s.line('app','media','HTTPS',points=[(805,285),(735,285),(735,845),(805,845)],labelpos=(735,735));s.line('media','backup','копия файлов',labelpos=(1300,885))
  if deploy:
   s.text(25,50,'Размещение артефактов',26,'start',True)
   s.text(25,105,'Nginx: frontend.dist и nginx.conf\nJRE: cards-service.jar + worker профиль\nPostgreSQL: schema.sql и миграции\nХранилище: изображения и шаблоны',20,'start')
  else:s.text(25,55,'Сети: пользователи → DMZ → закрытый серверный сегмент',26,'start',True)
  s.text(25,960,'Удалённое администрирование через VPN. БД не публикуется в Интернет. Резервные копии шифруются.',20,'start')
  s.save('D21_deployment' if deploy else 'D10_infrastructure','Диаграмма развёртывания' if deploy else 'Инфраструктурная схема',7 if deploy else 6,'ПР7 с.4–5' if deploy else 'ПР6 с.2–3','Ресурсы и число узлов — проектное предложение; нагрузочная проверка ещё не проводилась.')

def sequence(id,title,participants,messages,frames):
 w=1550;h=1450;s=Svg(w,h);xs=[100+i*(1350/(len(participants)-1)) for i in range(len(participants))]
 short_sup=['1. Обновить','2. Проверить роль','3. Получить данные','4. HTTPS / JSON','5. Предложения','6. Валидация','7. Записать снимки','8. STALE и аудит','9. Итог импорта','10. Показать итог','11. Сбой / повтор','12. Прежняя дата']
 short_oz=['1. Утвердить','2. QUEUED + ключ','3. ID операции','4. Захватить','5. HTTPS / JSON','6. ID задачи','7. WAITING','8. Проверить статус','9. Успех + ID','10. SUCCESS','11. RETRY / UNCERTAIN','12. FAILED']
 labels=short_sup if 'suppliers' in id else short_oz
 for i,p in enumerate(participants):
  s.box(str(i),p,xs[i]-95,20,190,110,size=29);s.parts.append(f'<path d="M{xs[i]} 130 V1390" stroke="#888" stroke-dasharray="8 6"/>')
 for msg_index,(y,a,b,tx,kind) in enumerate(messages):
  x1,x2=xs[a],xs[b]
  s.parts.append(f'<path d="M{x1} {y} H{x2}" stroke="#222" fill="none" stroke-width="2" {"stroke-dasharray=\"8 5\"" if kind=="return" else ""} marker-end="url(#arrow)"/>')
  s.text((x1+x2)/2,y-14,labels[msg_index],29)
  if kind=='call':s.parts.append(f'<rect x="{x2-5}" y="{y+4}" width="10" height="35" fill="white" stroke="#777"/>')
  s.edges.append(dict(source=str(a),target=str(b),label=tx,kind=kind,y=y))
 y0=frames[0][0];yb=frames[-1][0]+frames[-1][1]
 s.parts.append(f'<rect x="15" y="{y0}" width="1520" height="{yb-y0}" fill="none" stroke="#555" stroke-width="1.5"/>')
 for fi,(y,hg,label) in enumerate(frames):
  if fi:s.parts.append(f'<path d="M15 {y} H1535" stroke="#555" stroke-dasharray="8 6"/>')
  s.text(30,y+31,'alt [успешный обмен]' if fi==0 else '[ошибка или неизвестный результат]',26,'start',True)
 s.save(id,title,8,'ПР8 с.2–4','Сообщения описывают сценарий, а не собственную спецификацию API. Имена методов и реальные endpoint не задаются. Пунктир — ответ.')

def sequences():
 sequence('D22_sequence_suppliers','Последовательность обновления предложений',['Сотрудник\nсклада','Web / API','Сервис\nпредложений','Адаптер','Поставщик','PostgreSQL'],[
 (175,0,1,'Обновить выбранного поставщика; HTTPS / JSON','call'),(255,1,2,'Проверить роль STOCK; начать импорт','call'),(335,2,3,'Запросить свежие предложения','call'),(415,3,4,'HTTPS; согласованный JSON/файл','call'),(565,4,3,'Ответ с ценами, остатками и временем','return'),(655,3,2,'Проверенные записи и неизвестные SKU','return'),(755,2,5,'Транзакция: добавить снимки предложений','call'),(845,2,5,'Зависимые карточки → STALE; аудит','call'),(935,2,1,'Сводка: принято / отклонено','return'),(1035,1,0,'Показать дату и ошибки сопоставления','return'),(1165,3,2,'Тайм-аут / 429 / 5xx: отложенный повтор','return'),(1285,2,1,'Старые данные сохранены с прежней датой','return')],[(485,595,'alt [корректный ответ]'),(1100,230,'else [временный сбой или неверные записи]')])
 sequence('D23_sequence_ozon','Последовательность публикации версии карточки',['Менеджер','Web / API','PostgreSQL','Worker /\nадаптер Ozon','Ozon'],[
 (180,0,1,'Утвердить card_version; HTTPS / JSON','call'),(275,1,2,'Проверки и запись QUEUED + operation_key','call'),(365,1,0,'Принято в очередь; локальный ID','return'),(455,3,2,'Захватить операцию, проверить версию','call'),(545,3,4,'Отправить карточку; HTTPS / JSON','call'),(655,4,3,'Идентификатор задачи / текущий результат','return'),(755,3,2,'Сохранить внешний ID и WAITING','call'),(865,3,4,'Запросить результат по известному ID','call'),(965,4,3,'Успех: внешний ID товара','return'),(1055,3,2,'SUCCESS, PUBLISHED и уведомление','call'),(1185,3,2,'Временный сбой: RETRY ≤ 3; неизвестный итог: UNCERTAIN','call'),(1300,3,2,'Постоянная ошибка: FAILED; сохранить причины','call')],[(595,495,'alt [операция принята и подтверждена]'),(1120,250,'else [ошибка / тайм-аут; сначала сверка результата]')])
 s=Svg(1430,700)
 for n in [('u','Пользователь\nи назначенные роли',25,275,270,110),('a','Аутентификация\nи серверная сессия',370,275,290,110),('r','Проверка RBAC\nресурс + операция + условие',770,275,300,110),('ok','Разрешённое действие\nв транзакции',1120,105,285,110),('deny','Отказ в доступе\nбез изменения данных',1120,470,285,110)]:s.box(*n)
 s.line('u','a','HTTPS');s.line('a','r','пользователь');s.line('r','ok','Разрешено');s.line('r','deny','Запрещено');s.text(715,655,'По умолчанию отказ. Администратор управляет доступом, но не получает право публикации автоматически.',20)
 s.save('D24_access','Схема проверки доступа',8,'ПР8 с.2,4–6','Учебная RBAC-модель. Сервисный worker использует отдельную техническую роль.')

function_tree();component();erd();coding();wireframes();activities();infra();sequences()
(ROOT/'diagram_catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
print('Drafts',len(catalog))

