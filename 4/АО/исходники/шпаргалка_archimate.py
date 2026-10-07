"""Одностраничная шпаргалка по предоставленным практикам 1-5."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

DEST = Path(__file__).resolve().parents[1] / 'ArchiMate_шпаргалка.pdf'
for name, file in [('R', 'arial.ttf'), ('B', 'arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts') / file)))
pdfmetrics.registerFontFamily('R', normal='R', bold='B')
W, H = A4
c = canvas.Canvas(str(DEST), pagesize=A4)
c.setTitle('ArchiMate: шпаргалка по практикам 1-5')
c.setAuthor('Учебные материалы АО')
INK = HexColor('#152534')
MUTED = HexColor('#536271')
RULE = HexColor('#c7d0d7')

def text(x, top, value, size=9.5, bold=False, color=INK):
    c.setFillColor(color)
    c.setFont('B' if bold else 'R', size)
    c.drawString(x, H-top-size, value)

def para(x, top, value, width, size=9.5, leading=11.4):
    p = Paragraph(value, ParagraphStyle('p', fontName='R', fontSize=size,
                  leading=leading, textColor=INK))
    _, height = p.wrap(width, 1000)
    p.drawOn(c, x, H-top-height)
    return height

def line(x1, top, x2, color=RULE, width=.45):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, H-top, x2, H-top)

def shape(points, fill=False):
    p = c.beginPath()
    p.moveTo(*points[0])
    for point in points[1:]:
        p.lineTo(*point)
    p.close()
    c.drawPath(p, stroke=1, fill=int(fill))

def relation(kind, top, x=196, end=246):
    y = H-top
    c.saveState()
    c.setStrokeColor(INK)
    c.setFillColor(INK)
    c.setLineWidth(.95)
    start=x
    if kind in ('composition', 'aggregation'):
        c.setFillColor(INK if kind=='composition' else white)
        shape([(x,y),(x+5,y+3.2),(x+10,y),(x+5,y-3.2)],True)
        start=x+10
    if kind=='assignment':
        c.circle(x+2.5,y,2.5,stroke=1,fill=1)
        start=x+5
    if kind=='access':
        c.setDash(1,2)
    if kind in ('realization','flow','influence'):
        c.setDash(4,2.5)
    c.line(start,y,end-(7 if kind in ('realization','specialization') else 0),y)
    c.setDash()
    if kind in ('serving','access','influence'):
        c.line(end-6,y+3,end,y)
        c.line(end-6,y-3,end,y)
    if kind in ('assignment','triggering','flow'):
        shape([(end,y),(end-7,y+3),(end-7,y-3)],True)
    if kind in ('realization','specialization'):
        c.setFillColor(white)
        shape([(end,y),(end-7,y+3.8),(end-7,y-3.8)],True)
    c.restoreState()

text(28,24,'ArchiMate',23,True)
text(170,32,'КОРОТКАЯ ШПАРГАЛКА • ПРАКТИКИ 1-5',10,True)
text(28,57,'Читай схему как предложение: кто → что делает → с чем работает.',10)

cards=[(28,'#e9eef3','АКТИВНАЯ СТРУКТУРА','Кто выполняет?','Актор, роль, компонент, узел.'),
       (210,'#edf3f6','ПОВЕДЕНИЕ','Что происходит?','Процесс, функция, сервис, событие.'),
       (392,'#f3f5f6','ПАССИВНАЯ СТРУКТУРА','С чем работают?','Объект, данные, артефакт.')]
for x,color,title,question,examples in cards:
    c.setFillColor(HexColor(color)); c.setStrokeColor(RULE); c.setLineWidth(.6)
    if title=='ПОВЕДЕНИЕ':
        c.roundRect(x,H-124,175,45,7,stroke=1,fill=1)
    else:
        c.rect(x,H-124,175,45,stroke=1,fill=1)
    text(x+8,84,title,9,True)
    text(x+8,97,question,9.5,True)
    text(x+8,111,examples,7.6)

text(28,132,'Углы: прямые - структура; скруглённые - поведение; скошенные - мотивация (цель).',9.2)
text(28,145,'Конкретный тип уточняй по значку. Цвет выбирает автор модели.',9.2)
para(28,161,'<b>Актор</b> - конкретный исполнитель; <b>роль</b> - его ответственность. <b>Процесс</b> - последовательность действий;<br/><b>функция</b> - группа действий по общему признаку. <b>Событие</b> - изменение состояния.',539,9.2,11.5)
text(28,188,'Сервис - доступная извне функциональность; интерфейс - точка доступа к ней.',9.2)

for x,color,label in [(28,'#fff3bf','Бизнес: люди и работа'),(210,'#d9f0f6','Приложения: ПО и данные'),(392,'#e1efcf','Технологии: узлы, устройства')]:
    c.setFillColor(HexColor(color));c.rect(x,H-223,175,18,fill=1,stroke=0)
    text(x+6,209,label,8.3,True)
text(28,230,'Группировка объединяет по общему признаку; местоположение показывает, где размещено.',9.1)
text(28,244,'Сервисы связывают слои. Вложение блоков может заменять структурную связь.',9.1)

text(28,265,'СВЯЗИ: A СЛЕВА, B СПРАВА',10,True)
text(28,282,'Тип / группа',8,color=MUTED)
text(184,282,'Обозначение',8,color=MUTED)
text(273,282,'Как читать и что помнить',8,color=MUTED)
line(28,296,567)

rows=[
('Композиция','Composition • структурная','composition','<b>A состоит из B.</b> Чёрный ромб у целого A;<br/>существование части зависит от целого.',25),
('Агрегация','Aggregation • структурная','aggregation','<b>A объединяет B.</b> Белый ромб у целого A;<br/>часть может существовать самостоятельно.',25),
('Назначение','Assignment • структурная','assignment','<b>A выполняет B / отвечает за B.</b><br/>Например: роль выполняет процесс; актор играет роль.',25),
('Реализация','Realization • структурная','realization','<b>A реализует B.</b> От конкретного к абстрактному:<br/>например, функция реализует сервис.',25),
('Обслуживание','Serving • зависимость','serving','<b>A обслуживает B.</b> Стрелка к потребителю.<br/>Например: сервис приложения поддерживает процесс.',25),
('Доступ','Access • зависимость','access','<b>A работает с объектом B.</b> Точечная линия.<br/>Стрелка к B - запись; к A - чтение; в обе стороны -<br/>чтение и запись; без стрелок - доступ без уточнения.',36),
('Ассоциация','Association • зависимость','association','<b>A связан с B.</b> Общая связь без точного типа;<br/>может быть направленной (половина наконечника).',25),
('Влияние','Influence • зависимость','influence','<b>A влияет на B</b> (элемент мотивации).<br/>Знак + / - и сила влияния могут быть подписаны.',25),
('Запуск / триггер','Triggering • динамическая','triggering','<b>A запускает B.</b> Причинная / временная связь:<br/>B начинается после нужной части A.',25),
('Поток','Flow • динамическая','flow','<b>A передаёт что-то B:</b> данные, деньги, товар.<br/>Сам по себе поток не означает запуск B.',25),
('Специализация','Specialization • другая','specialization','<b>A - разновидность B.</b> Треугольник к общему B;<br/>соединяются элементы одного типа.',25),
]
top=298
for ru,en,kind,reading,height in rows:
    text(28,top+2,ru,9.5,True)
    text(28,top+14,en,7.2,color=MUTED)
    text(181,top+7,'A',8.5)
    text(253,top+7,'B',8.5)
    relation(kind,top+13)
    para(273,top+2,reading,294,8.8,10.3)
    line(28,top+height,567)
    top+=height

text(28,595,'Коннекторы',9.5,True)
c.setFillColor(INK);c.setStrokeColor(INK)
c.circle(109,H-602,3,fill=1,stroke=1)
text(117,595,'И: все ветви.',9.2)
c.setFillColor(white);c.circle(199,H-602,3,fill=1,stroke=1)
text(207,595,'ИЛИ: одна или несколько ветвей.',9.2)
text(28,610,'Соединяют связи одного типа: зависимости, динамические, назначение или реализацию.',8.9)

text(28,632,'ПРОИЗВОДНЫЕ СВЯЗИ: ПРАВИЛА ИЗ ПРАКТИКИ 5',10,True)
text(28,649,'Сила: композиция > агрегация > назначение > реализация.',9.2)
text(28,663,'Зависимости: обслуживание > доступ > влияние > ассоциация.',9.2)
para(28,679,'Для разрешённой цепочки <b>A → B → C</b> выводим A → C в том же направлении:<br/>• две структурные / две зависимости - берём <b>слабейшую</b>;<br/>• структурная + зависимость / динамическая - берём <b>вторую</b>;<br/>• две специализации → специализация; два запуска → запуск.',539,9.2,12.3)
para(28,733,'Область правил в методичке: ядро языка. Для связей ядра с мотивацией, стратегией,<br/>реализацией и миграцией указаны исключения: реализация и влияние.',539,8.3,10.5)

line(28,766,567)
text(28,775,'Запомни: выполняет • реализует • обслуживает • запускает • передаёт.',10,True)
text(28,800,'Основание: Практика 1, с. 10-26; Практика 2, с. 3-14; Практика 3, с. 1-9;',7.3,color=MUTED)
text(28,811,'Практика 4, с. 1-9; Практика 5, с. 1-11. Конспект ограничен материалом этих практик.',7.3,color=MUTED)
c.save()
print(DEST)
