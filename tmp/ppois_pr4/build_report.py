from pathlib import Path
from copy import deepcopy
from docx import Document
from docx.shared import Cm, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.section import WD_SECTION

ROOT=Path(r'D:/GitHub/MIREA')
DEST=ROOT/'4/ППОИС'
TMP=ROOT/'tmp/ppois_pr4'
OUT=DEST/'ППОИС_4_АлбахтинИВ.docx'
# Keep the approved cover from the previous report, replace only the work number.
d=Document(DEST/'ППОИС_3_АлбахтинИВ.docx')
for p in d.paragraphs:
    if 'ОТЧЕТ ПО ПРАКТИЧЕСКОЙ РАБОТЕ № 3' in p.text:
        for r in p.runs: r.text=r.text.replace('№ 3','№ 4')
    if p.text.strip()=='Москва 2026 г.':
        pass
body=d._element.body
# Remove previous report body, preserving the cover (through the city/year paragraph at index 15) and sectPr.
children=list(body)
for child in children[16:]:
    if child.tag != qn('w:sectPr'):
        body.remove(child)
# Base styles according to the repository handbook.
styles=d.styles
normal=styles['Normal']
normal.font.name='Times New Roman'; normal._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); normal.font.size=Pt(14)
normal.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
normal.paragraph_format.first_line_indent=Cm(1.25)
normal.paragraph_format.line_spacing=1.5
normal.paragraph_format.space_before=Pt(0); normal.paragraph_format.space_after=Pt(0)
for nm,align in [('Heading 1',WD_ALIGN_PARAGRAPH.CENTER),('Heading 2',WD_ALIGN_PARAGRAPH.LEFT)]:
    st=styles[nm]; st.font.name='Times New Roman'; st._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); st.font.size=Pt(14); st.font.bold=True
    st.paragraph_format.alignment=align; st.paragraph_format.first_line_indent=Cm(0); st.paragraph_format.space_before=Pt(12); st.paragraph_format.space_after=Pt(6); st.paragraph_format.line_spacing=1.5

def keep(p,next_=False,lines=True):
    pPr=p._p.get_or_add_pPr()
    if next_:
        el=OxmlElement('w:keepNext'); pPr.append(el)
    if lines:
        el=OxmlElement('w:keepLines'); pPr.append(el)

def add_p(text='', style=None, align=None, first=None, size=14, bold=False, italic=False):
    p=d.add_paragraph(style=style)
    if text:
        r=p.add_run(text); r.font.name='Times New Roman'; r._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); r.font.size=Pt(size); r.bold=bold; r.italic=italic
    if align is not None: p.alignment=align
    if first is not None: p.paragraph_format.first_line_indent=Cm(first)
    if style is None:
        p.paragraph_format.line_spacing=1.5; p.paragraph_format.space_before=Pt(0); p.paragraph_format.space_after=Pt(0)
        p.paragraph_format.alignment=align or WD_ALIGN_PARAGRAPH.JUSTIFY; p.paragraph_format.first_line_indent=Cm(1.25 if first is None else first)
    return p

def heading(text, level=1):
    p=d.add_paragraph(text, style='Heading 1' if level==1 else 'Heading 2'); keep(p,True,True)
    for r in p.runs: r.font.name='Times New Roman'; r._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); r.font.size=Pt(14); r.bold=True
    return p

def caption(text, table=False):
    p=d.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.LEFT if table else WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent=Cm(0); p.paragraph_format.left_indent=Cm(0); p.paragraph_format.right_indent=Cm(0); p.paragraph_format.line_spacing=1.0; p.paragraph_format.space_before=Pt(6 if table else 3); p.paragraph_format.space_after=Pt(3 if table else 6)
    r=p.add_run(text); r.font.name='Times New Roman'; r._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); r.font.size=Pt(12 if table else 14); r.italic=table; r.bold=False
    keep(p,True,True); return p

def clear_cell_fill(cell):
    tcPr=cell._tc.get_or_add_tcPr()
    for shd in tcPr.findall(qn('w:shd')): tcPr.remove(shd)
    # Explicitly remove inherited banding and set transparent/no-fill.
    shd=OxmlElement('w:shd'); shd.set(qn('w:val'),'clear'); shd.set(qn('w:color'),'auto'); shd.set(qn('w:fill'),'FFFFFF'); tcPr.append(shd)

def set_cell(cell,text,bold=False,align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text=''; cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; clear_cell_fill(cell)
    p=cell.paragraphs[0]; p.alignment=align; p.paragraph_format.first_line_indent=Cm(0); p.paragraph_format.left_indent=Cm(0); p.paragraph_format.right_indent=Cm(0); p.paragraph_format.space_before=Pt(0); p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.0
    r=p.add_run(str(text)); r.font.name='Times New Roman'; r._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); r.font.size=Pt(12); r.bold=bold

def add_table(title, headers, rows, widths=None):
    caption(title,table=True)
    t=d.add_table(rows=1, cols=len(headers)); t.style='Table Grid'; t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=True
    hdr=t.rows[0]; hdr._tr.get_or_add_trPr().append(OxmlElement('w:tblHeader'))
    for j,h in enumerate(headers): set_cell(hdr.cells[j],h,bold=True,align=WD_ALIGN_PARAGRAPH.CENTER)
    for row in rows:
        cells=t.add_row().cells
        trPr=t.rows[-1]._tr.get_or_add_trPr(); trPr.append(OxmlElement('w:cantSplit'))
        for j,val in enumerate(row): set_cell(cells[j],val,bold=False)
    if widths:
        for row in t.rows:
            for j,w in enumerate(widths): row.cells[j].width=Cm(w)
    return t

def add_fig(path, cap, width=16.2):
    p=d.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.first_line_indent=Cm(0); p.paragraph_format.space_before=Pt(0); p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.0; keep(p,True,True)
    p.add_run().add_picture(str(path),width=Cm(width))
    caption(cap,table=False)

# The approved cover already ends with a page break.
heading('ПРАКТИЧЕСКАЯ РАБОТА № 4',1)
p=add_p('Формирование функциональных требований к ИС (объектный анализ). Модель проектирования.',align=WD_ALIGN_PARAGRAPH.CENTER,first=0,bold=True)
heading('1 Цель и индивидуальное задание',1)
add_p('Цель работы — выполнить детализированное описание внутренней архитектуры и алгоритмов работы информационной системы формирования и актуализации карточек товаров компьютерных систем ООО «Юкомс». В работе уточняется статическая структура предметной области и показывается поведение системы при подготовке, проверке и публикации карточки.')
add_p('Индивидуальное задание: разработать модель проектирования для ИС, сформированной в практических работах № 1–3. Построить диаграммы классов, деятельности и состояний, определить атрибуты, операции, отношения и переходы для процесса формирования BOM и публикации карточки товара.')
heading('2 Этапы выполнения работы',1)
for text in [
'1. На основании диаграммы классов анализа выделены классы проектирования: граничные, управляющие и сущности предметной области.',
'2. Для классов определены атрибуты, операции, типы данных и кратности связей.',
'3. Построена диаграмма деятельности с параллельными ветвями подготовки BOM и получения актуальных предложений поставщиков.',
'4. Построена диаграмма состояний карточки товара с обработкой ошибок проверки, отказов API и повторной отправки.',
'5. Проверена согласованность проектных решений с требованиями и сценариями практических работ № 1–3.'
]: add_p(text,first=0)
heading('3 Диаграмма классов проектирования',1)
add_p('Диаграмма классов проектирования развивает классы анализа из практической работы № 3. Граничные классы принимают действия пользователей и передают запросы контроллерам. Управляющие классы координируют проверки и расчёты. Классы-сущности хранят версии BOM, состав комплектующих, карточки товара и результаты публикации.')
add_fig(DEST/'Схемы/ПР4_01_Классы_проектирования.png','Рисунок 1 – Диаграмма классов проектирования',width=16.2)
add_table('Таблица 1 – Описание классов диаграммы',['Название класса','Стереотип','Назначение и основные данные'],[
['Конфигурация','entity','Связывает корпус с версиями BOM и задаёт код товарной конфигурации.'],
['Версия BOM','entity','Хранит номер, статус, автора и дату версии состава компьютерной системы.'],
['Позиция BOM','entity','Слот версии BOM с количеством и единицей измерения; ссылается на комплектующую.'],
['Комплектующая','entity','Нормализованная внутренняя модель компонента с техническими характеристиками.'],
['Предложение поставщика','entity','Точная модель, цена, наличие и дата актуальности позиции внешнего поставщика.'],
['Карточка товара','entity','Публикуемый набор данных, связанный с выбранной версией BOM.'],
['Ревизия карточки','entity','Версия названия, цены, веса и характеристик перед отправкой в Ozon.'],
['Изображение','entity','Файл или результат генерации визуального представления карточки.'],
['Попытка публикации','entity','Состояние обмена, внешний идентификатор и сообщение об ошибке.'],
['Форма BOM','boundary','Экран ввода состава и отображения результатов проверки.'],
['Форма карточки','boundary','Экран подготовки, проверки и запуска публикации карточки.'],
['Шлюз маркетплейса','boundary','Адаптер вызовов API Ozon и преобразования внешнего ответа.'],
['Управление BOM','control','Создание версии BOM, заполнение слотов и сохранение согласованного состава.'],
['Проверка совместимости','control','Проверка сокета, форм-фактора, габаритов, мощности и интерфейсов.'],
['Управление публикацией','control','Формирование запроса, регистрация попытки и сохранение результата публикации.'],
['Проверка готовности','control','Контроль обязательных атрибутов, цены, веса и изображений перед отправкой.'],
['Расчёт показателей','control','Расчёт себестоимости, цены и массы карточки по актуальным данным.']
],widths=[4,3,9.5])
add_table('Таблица 2 – Взаимодействие между классами',['Класс-источник','Кратность','Тип отношения','Класс-назначение'],[
['Конфигурация','1 — 0..*','Ассоциация','Версия BOM'],
['Версия BOM','1 — 0..*','Композиция','Позиция BOM'],
['Комплектующая','1 — 0..*','Ассоциация','Позиция BOM'],
['Комплектующая','1 — 0..*','Ассоциация','Предложение поставщика'],
['Карточка товара','1 — 0..*','Ассоциация','Ревизия карточки'],
['Версия BOM','0..1 — 0..*','Ассоциация','Ревизия карточки'],
['Ревизия карточки','1 — 0..*','Ассоциация','Попытка публикации'],
['Ревизия карточки','0..* — 0..*','Ассоциация','Изображение']
],widths=[4.2,3.3,4,5])
add_p('Методы контроллеров соответствуют сообщениям сценариев UC02 и UC05: формирование версии, проверка совместимости, проверка готовности, расчёт показателей и запрос публикации. Разделение ответственности позволяет изменять правила проверки и интеграции без переноса логики в формы.')
heading('4 Диаграмма деятельности',1)
add_p('Диаграмма деятельности показывает алгоритм актуализации карточки. После запуска процесса выполняются параллельные действия: формирование BOM и загрузка цен с наличием поставщиков. После синхронизации система проверяет готовность карточки. Успешная ветвь передаёт данные на публикацию, а ветвь с ошибками возвращает карточку на доработку.')
add_fig(DEST/'Схемы/ПР4_02_Деятельность.png','Рисунок 2 – Диаграмма деятельности формирования и публикации карточки',width=15.5)
add_table('Таблица 3 – Основные действия диаграммы деятельности',['Действие','Ответственный','Вход','Результат'],[
['Сформировать BOM','Технический специалист','Запрос и выбранный корпус','Версия BOM со слотами и компонентами'],
['Загрузить цены и наличие','Система / администратор интеграций','Идентификаторы товаров поставщиков','Актуальные предложения'],
['Проверить готовность','Система','BOM, предложения, характеристики, изображения','Решение «готова / ошибки»'],
['Опубликовать карточку','Менеджер маркетплейсов','Подготовленная ревизия карточки','Запрос в API Ozon и запись попытки'],
['Показать ошибки и вернуть на доработку','Система и технический специалист','Протокол несовместимости или неполноты','Исправленные данные и повторная проверка']
],widths=[5,4,4,4.5])
heading('5 Диаграмма состояний',1)
add_p('Состояние карточки отражает её жизненный цикл от создания до публикации. Переход «На проверке» выполняется после сохранения версии BOM. При ошибке обязательных данных карточка получает состояние «Ошибка проверки». После исправления она снова проходит проверку. Результат обмена с Ozon разделяется на подтверждённую публикацию и ошибку публикации с возможностью повторной отправки.')
add_fig(DEST/'Схемы/ПР4_03_Состояния.png','Рисунок 3 – Диаграмма состояний карточки товара',width=16.2)
add_table('Таблица 4 – Состояния и переходы карточки',['Состояние','Событие перехода','Следующее состояние','Сохраняемые данные'],[
['Черновик','Создан запрос или изменены исходные данные','На проверке','Запрос, версия BOM, автор и время изменения'],
['На проверке','Найдены ошибки обязательных данных','Ошибка проверки','Протокол ошибок и ответственный'],
['На проверке','Все проверки пройдены','Готова к публикации','Результаты совместимости, цена, вес и изображения'],
['Готова к публикации','Менеджер запускает отправку','Публикуется','Ревизия карточки и попытка публикации'],
['Публикуется','Ozon подтвердил приём','Опубликована','Внешний идентификатор и ответ API'],
['Публикуется','Отказ или ошибка API','Ошибка публикации','Код ошибки, ответ и доступность повтора'],
['Ошибка публикации','Сверка результата и повторная отправка','Публикуется','Новая попытка с сохранением предыдущей'],
['Опубликована','Изменены BOM, цена, вес или контент','Требует актуализации','Связь с новой версией BOM'],
['Требует актуализации','Создана новая ревизия','Черновик','Новая ревизия и перечень изменённых полей']
],widths=[4,5.5,4,4.5])
heading('6 Согласованность проектной модели',1)
add_p('Класс «Управление BOM» реализует функции A2 и A3 из IDEF0 второй практической работы: формирует состав и передаёт его на проверку совместимости. «Управление публикацией» реализует функции A4 и A5, а «Шлюз маркетплейса» изолирует внешний API Ozon. Сущности «Версия BOM», «Ревизия карточки» и «Попытка публикации» обеспечивают версионирование и аудит.')
add_p('Параллельные ветви диаграммы деятельности соответствуют независимому получению данных поставщиков и заполнению состава BOM. Синхронизация не разрешает переход к публикации, пока обе ветви не завершены. Диаграмма состояний уточняет требования ФТ-01, ФТ-03 и ФТ-04: ошибки не удаляют подготовленные данные, каждая отправка фиксируется, а повторная отправка выполняется после сверки предыдущего результата.')
add_p('Модели подготовлены в OmniNotation: классы и деятельность сохранены в собственных контейнерах .omni. Изображения диаграмм экспортированы из этих моделей; диаграмма состояний включена в отчёт как отдельная проектная схема с теми же обозначениями и идентификаторами переходов.')
heading('7 Вывод',1)
add_p('В ходе практической работы разработана модель проектирования ИС формирования и актуализации карточек компьютерных систем. Уточнены классы границы, управления и сущности, их атрибуты, операции и отношения. Построена диаграмма деятельности с параллельной подготовкой BOM и предложений поставщиков. Описан жизненный цикл карточки с обработкой ошибок проверки, отказов внешнего API и повторной отправки.')
add_p('Модель проектирования согласована с функциональными требованиями, IDEF0 и сценариями объектного анализа. Она задаёт основу для последующего проектирования компонентов, базы данных и интерфейсов информационной системы.')
heading('Список использованных источников',1)
for text in [
'1. Проектирование предметно-ориентированных информационных систем. Практическая работа № 4. Методические материалы.',
'2. Албахтин И.В. ППОИС. Отчёт по практической работе № 1. Москва, 2026.',
'3. Албахтин И.В. ППОИС. Отчёт по практической работе № 2. Москва, 2026.',
'4. Албахтин И.В. ППОИС. Отчёт по практической работе № 3. Москва, 2026.',
'5. OmniNotation. Руководство по UML и собственному формату .omni.'
]: add_p(text,first=0)
# Normalize all table cells and ensure no table style applies shading.
for t in d.tables:
    for row in t.rows:
        for cell in row.cells: clear_cell_fill(cell)
# Save.
d.save(OUT)
print(OUT)


