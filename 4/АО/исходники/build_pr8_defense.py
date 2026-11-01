"""One-page PR8 cheat sheet, replacing the long reading guide."""
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

BASE = Path(__file__).resolve().parents[1]
DEST = BASE / 'АО_ПР8_Подготовка_к_защите_АлбахтинИВ.docx'

SPEECH = ('Я показал подготовку и публикацию карточки ПК в ООО «Юкомс». '
    'Подразделения исполняют роли менеджера, дизайнера, руководителя участка и разработчика. '
    'Группа согласует требования; затем уточняют конфигурацию, готовят изображения, формируют и публикуют карточку. '
    'Исполнители связаны назначением, этапы — триггерами, работа с информацией — доступом. '
    'Карточка — бизнес-объект; страница Ozon — её представление; запись ИС — объект данных. '
    'Страница и данные реализуют бизнес-содержание. Процесс публикации реализует сервис, канал предоставляет его Ozon.')

BLOCKS = [
 ('Актор / Actor', 'Кто действует: компания, отдел, Ozon.'),
 ('Роль / Role', 'Ответственность: менеджер, дизайнер. Актор исполняет роль.'),
 ('Сотрудничество / Collaboration', 'Кто работает вместе: группа подготовки.'),
 ('Взаимодействие / Interaction', 'Что делают вместе: согласуют требования.'),
 ('Процесс / Process', 'Последовательная работа с результатом: подготовить карточку.'),
 ('Функция / Function', 'Постоянная область работы: ведение карточек.'),
 ('Событие / Event', 'Факт изменения состояния: запрос получен, карточка готова.'),
 ('Сервис / Service', 'Предоставляемое поведение: публикация карточки.'),
 ('Интерфейс / Interface', 'Точка доступа к сервису: кабинет, канал передачи.'),
 ('Бизнес-объект / Business Object', 'Предметная информация: карточка, сведения, изображения.'),
 ('Представление / Representation', 'Видимая форма информации: страница карточки.'),
 ('Объект данных / Data Object', 'Информация для обработки приложением: запись в ИС.'),
]
ARROWS = [
 ('Композиция / Composition', 'Чёрный ромб у целого', 'Состоит из — зависимая часть.'),
 ('Агрегация / Aggregation', 'Пустой ромб у целого', 'Объединяет — часть самостоятельна.'),
 ('Назначение / Assignment', 'Точка → закрашенная стрелка', 'Исполняет роль / выполняет / предоставляет сервис.'),
 ('Реализация / Realization', 'Пунктир → пустой треугольник', 'Реализует: конкретное → абстрактное.'),
 ('Обслуживание / Serving', 'Сплошная → открытая стрелка', 'Обслуживает: поставщик → потребитель.'),
 ('Доступ / Access', 'Пунктир; направление по режиму', 'Записывает объект / читает объект.'),
 ('Триггер / Triggering', 'Сплошная → закрашенная стрелка', 'Запускает следующий этап / событие.'),
]
NOTES = [
 'Read: наконечник к читающему процессу; Write: к объекту; Read/Write: в обе стороны. В модели Source — процесс, Target — объект. В Archi 0=Write, 1=Read, 2=Access, 3=Read/Write; без атрибута — Write.',
 'Реализация ≠ создание во времени; создание — Access Write. Triggering — порядок, Flow — передаваемые данные. Цвет настраивается; тип проверяют по значку и Type. Структура — прямые углы, поведение — обычно скруглённые.',
 'Свойства: Name, Type, Documentation, Properties; у связи ещё Source/Target, у Access — режим. Производная: отдел — Assignment → менеджер — Assignment → процесс ⇒ отдел — Assignment → процесс; проверять допустимость типов.',
 'На этой схеме Ozon — получатель подготовленного контента. Сведения и изображения — части конкретной карточки. Общие справочники/медиатека потребовали бы Aggregation. Разработчику отдельное поведение пока не назначено.',
]

def set_font(style, size, bold=False):
    style.font.name='Times New Roman';style.font.size=Pt(size);style.font.bold=bold
    style.font.color.rgb=RGBColor(0,0,0)
    for rf in style.element.xpath('./w:rPr/w:rFonts'):
        for k in list(rf.attrib):
            if 'theme' in k.lower():del rf.attrib[k]
        for k in ['ascii','hAnsi','cs','eastAsia']:rf.set(qn('w:'+k),'Times New Roman')
    for border in style.element.xpath('./w:pPr/w:pBdr'):border.getparent().remove(border)

def table(doc, rows, widths):
    t=doc.add_table(rows=0,cols=len(widths));t.style='Table Grid';t.autofit=False
    for row in rows:
        for i,(c,s) in enumerate(zip(t.add_row().cells,row)):
            c.width=Cm(widths[i]);c.text=s
            for p in c.paragraphs:
                p.paragraph_format.space_before=Pt(0);p.paragraph_format.space_after=Pt(0)
                for run in p.runs:run.font.size=Pt(10.5);run.bold=(i==0)
    for col,w in zip(t.columns,widths):col.width=Cm(w)
    return t

def main():
    doc=Document();s=doc.sections[0]
    s.page_width=Cm(21);s.page_height=Cm(29.7)
    s.left_margin=Cm(1.4);s.right_margin=Cm(1.4);s.top_margin=Cm(1.1);s.bottom_margin=Cm(1.1)
    set_font(doc.styles['Normal'],11)
    f=doc.styles['Normal'].paragraph_format
    f.line_spacing=1;f.first_line_indent=Cm(0);f.space_before=Pt(0);f.space_after=Pt(2)
    set_font(doc.styles['Title'],15,True)
    f=doc.styles['Title'].paragraph_format;f.space_before=Pt(0);f.space_after=Pt(4);f.line_spacing=1
    set_font(doc.styles['Heading 1'],11.5,True)
    f=doc.styles['Heading 1'].paragraph_format;f.line_spacing=1;f.space_before=Pt(5);f.space_after=Pt(2);f.keep_with_next=True
    doc.add_paragraph('Шпаргалка по защите архитектуры Юкомс','Title')
    doc.add_paragraph('ПР8–9 • 28 блоков • 42 связи • бизнес-слой и два объекта данных приложений')
    doc.add_paragraph('Что сказать за минуту','Heading 1');doc.add_paragraph(SPEECH)
    doc.add_paragraph('Блоки кто что делает и с чем работает','Heading 1')
    table(doc,BLOCKS,[6.5,11.7])
    doc.add_paragraph('Стрелки тип обозначение и смысл','Heading 1')
    table(doc,ARROWS,[5.7,6.1,6.4])
    doc.add_paragraph('Четыре ответа на уточняющие вопросы','Heading 1')
    for txt in NOTES:doc.add_paragraph(txt)
    doc.core_properties.title='Шпаргалка по защите архитектуры Юкомс'
    doc.core_properties.author='Албахтин И.В.'
    doc.save(DEST);print(DEST)

if __name__=='__main__':main()
