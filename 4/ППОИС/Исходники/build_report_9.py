"""PPOIS9: bounded hierarchical classifier, all values and code examples."""
import json
import sys
from pathlib import Path

from report_layout import Report, SUBJECT, ROOT
from build_report_7 import digest

sys.path.insert(0,str(SUBJECT/'Классификация'))
from classifier import decode, all_codes


def build():
    spec=json.loads((SUBJECT/'Классификация/classifier.json').read_text(encoding='utf-8'))
    evidence=json.loads((SUBJECT/'Классификация/Результаты_проверки.json').read_text(encoding='utf-8'))
    diagram=json.loads((SUBJECT/'Схемы/ПР9_Проверка_дерева.json').read_text(encoding='utf-8'))
    assert set(all_codes())==set(diagram['leaf_codes'])
    proof=json.loads((SUBJECT/'Схемы/ПР9_Экспорт_проверка.json').read_text(encoding='utf-8'))
    if (proof['model_sha256']!=digest(SUBJECT/'Схемы/ПР9_Классификация.omni')
            or proof['classifier_sha256']!=digest(SUBJECT/'Классификация/classifier.json')
            or proof['card_sha256']!=digest(SUBJECT/'Схемы/08_ПР8_card.png')
            or proof['diagnostics'] or set(proof['leaves'])!=set(all_codes())):
        raise ValueError('Stale classifier or card evidence')
    manifest=json.loads((ROOT/'.cache/ppois-pr9-20261112/export.json').read_text(encoding='utf-8'))
    result=json.loads((Path(manifest['output'])/'Отчёт_экспорта.json').read_text(encoding='utf-8'))
    if result['cancelled'] or len(result['items'])!=8:
        raise ValueError('Incomplete native classifier export')
    for filename,item in zip(proof['files'],result['items']):
        if item['status']!='completed' or len(item['files'])!=1 or digest(SUBJECT/'Схемы'/filename)!=digest(item['files'][0]):
            raise ValueError('Classifier image differs from native export')
    r=Report(9,'Классификация и кодирование компьютерных конфигураций')
    r.heading('Классификация и кодирование компьютерных конфигураций')
    r.heading('Цель и задание',2)
    r.paragraph('Цель работы — классифицировать компьютерные конфигурации проекта ООО «Юкомс» и определить последовательный код класса. Задание включает признаки и их соподчинённость, все значения и их количество, максимумы, дерево и правила расшифровки кода.')
    r.paragraph('Объект классификации — класс конфигураций учебного каталога. Пять признаков образуют 48 классов. Несколько конфигураций могут иметь один классификационный код, но разные UUID и коды записей. Примеры расшифровки приведены в разделе 4.')
    r.heading('1 Признаки и их соподчинённость')
    r.paragraph('Уровни последовательно уточняют назначение, корпус, платформу, ОЗУ и SSD. Одинаковые значения под разными родителями являются разными узлами: например, AM5 в путях C1-1-1-1 и C1-2-1-1. Каждый узел, кроме корня, имеет ровно одного родителя.')
    r.table('Иерархия классификационных признаков',
            ['№','Признак','Родительский уровень','Число\nзначений','Максимум\nкода'],[
                [1,'Назначение','Корень каталога',3,3],
                [2,'Исполнение корпуса','Назначение',2,2],
                [3,'Платформа процессора','Исполнение корпуса',2,2],
                [4,'Объём ОЗУ','Платформа процессора',2,2],
                [5,'Объём SSD','Объём ОЗУ',2,2],
            ],[.9,5.1,5.3,2.5,2.7],center=(0,3,4),keep_rows=True)
    r.heading('2 Значения и размер классификатора',new_page=True)
    values=[]
    for feature in spec['features']:
        for code,label in feature['values'].items():
            values.append([feature['position'],feature['name'],code,label])
    r.table('Все допустимые значения признаков',['Ур.','Признак','Код','Значение'],values,[1.2,6,1.2,8.1],center=(0,2),keep_rows=True)
    r.paragraph('Количество значений по уровням равно 3, 2, 2, 2 и 2. Максимум количества значений — три у назначения; максимальное числовое значение кода также равно трём. Все значения одного признака имеют одинаковую ширину — одну десятичную цифру. Число листьев полного дерева равно 3 × 2 × 2 × 2 × 2 = 48. В каждой ветви назначения находятся 16 классов, а в каждой ветви корпуса — восемь.')
    r.paragraph('Классификатор охватывает перечисленные значения учебного каталога. Код определяет класс конфигурации; совместимость конкретных комплектующих проверяется отдельно при формировании состава.')
    r.page(True)
    r.heading('3 Дерево классификации')
    r.paragraph('Обзор показывает корень, три назначения и шесть вариантов корпуса. Каждая ветвь корпуса далее раскрывается на отдельном листе до восьми классов. Обзор и детализации используют одни и те же родительские узлы модели.')
    r.figure('Обзор дерева классификации C1',SUBJECT/'Схемы'/proof['files'][0],max_height=10.4,
             lead='На рисунке 1 показаны первые два уровня дерева. Префиксы шести ветвей связывают обзор с детализациями на рисунках 2–7.')
    for i,sheet in enumerate(diagram['sheets']):
        r.page(True,new_page=True)
        purpose=spec['features'][0]['values'][sheet['purpose']]
        case=spec['features'][1]['values'][sheet['caseCode']]
        purpose_title=purpose if sheet['purpose']=='3' else purpose+' конфигурация'
        r.heading(f'3.{i+1} {purpose_title} и {case.lower()} корпус',2)
        r.figure(f'Ветвь классификации C1-{sheet["purpose"]}-{sheet["caseCode"]}',
                 SUBJECT/'Схемы'/proof['files'][i+1],max_height=12.2,
                 lead=f'На рисунке {i+2} показаны все восемь классов ветви C1-{sheet["purpose"]}-{sheet["caseCode"]}. Префикс объединяет назначение и корпус; справа приведены полные коды листьев.')
    r.page(False)
    r.heading('4 Структура и расшифровка кода')
    r.paragraph('Для класса используется формат C1-A-B-C-D-E. C1 является литералом версии классификатора; A, B, C, D и E — однозначные коды назначения, корпуса, платформы, ОЗУ и SSD соответственно. Пять дефисов служат разделителями и не несут собственного классификационного значения. Полный код содержит 12 символов: два символа версии, пять цифр значений и пять дефисов.')
    r.figure('Структура классификационного кода',SUBJECT/'Схемы'/proof['files'][7],max_height=4,
             lead='На рисунке 8 показано назначение каждого сегмента кода. Цифровые значения A–E соответствуют уровням дерева.')
    examples=['C1-1-1-1-2-2','C1-2-2-2-1-1','C1-3-1-2-2-2']
    rows=[]
    for code in examples:
        decoded=decode(code)
        purpose=decoded['purpose']['label']
        purpose_title=purpose if decoded['purpose']['code']=='3' else purpose+' конфигурация'
        description=(f'{purpose_title}; {decoded["case"]["label"].lower()} корпус; '
                     f'{decoded["platform"]["label"]}; ОЗУ {decoded["ram"]["label"]}; '
                     f'SSD {decoded["ssd"]["label"]}')
        rows.append([code,description])
    r.table('Примеры расшифровки',['Код класса','Описание'],rows,[5,11.5])
    r.heading('5 Пример классифицированной карточки',new_page=True)
    sample=json.loads((SUBJECT/'Исходники/submission_model.json').read_text(encoding='utf-8'))['card_example']
    r.paragraph('Для классификации выбрана заполненная карточка '+sample['seller_code']+' из результатной формы практики 8. Менеджер просматривает её после подготовки состава разработчиком, оформления изображений дизайнером и утверждения генеральным директором. Все признаки берутся из характеристик, показанных на этой форме.')
    r.table('Определение кода класса по заполненной карточке',['Признак','Значение в карточке','Код'],[
        ['Назначение',sample['purpose'],'1'],['Исполнение корпуса',sample['case'],'1'],
        ['Платформа процессора',sample['platform'],'1'],['Объём ОЗУ',sample['ram'],'2'],
        ['Объём SSD',sample['ssd'],'2']], [5.2,9.8,1.5],center=(2,))
    r.paragraph('Последовательность значений 1–1–1–2–2 даёт код класса '+sample['classification']+'. Он получен по характеристикам карточки. В самой экранной форме отдельно показан код продавца '+sample['seller_code']+', который идентифицирует товарную карточку.')
    r.paragraph('Конфигурация содержит процессор '+sample['cpu']+', плату '+sample['board']+', память '+sample['ram']+' и накопитель '+sample['ssd']+'. Цена на результатной форме — '+sample['price_rub']+' руб., масса с упаковкой — '+sample['mass_kg']+' кг. На рисунке 9 приведена эта же карточка с заполненным описанием и изображением.')
    r.page(False,new_page=True)
    r.figure('Полностью заполненная карточка компьютерной конфигурации',SUBJECT/'Схемы/08_ПР8_card.png',max_height=20,
             lead='На рисунке 9 представлена заполненная результатная форма менеджера. Её характеристики использованы для определения класса в таблице 4.')
    r.heading('Вывод',new_page=True)
    r.paragraph('Сформирован и проверен иерархический классификатор компьютерных конфигураций с пятью признаками и 48 классами. Перечислены все значения, установлены соподчинённость и ширина сегментов, построено полное дерево и определён формат кода C1. Классификационный код отделён от идентификатора записи и от результата проверки совместимости.')
    r.sources(['Практическая работа №9. Классификация и кодирование технико-экономической информации. Информационные объекты. Методические материалы ППОИС, предоставленные к заданию, 4 с.',
               'Албахтин И.В. Индивидуальный проект ИС формирования и актуализации карточек компьютерных систем ООО «Юкомс». Практические работы ППОИС 1–4, 2026.',
               'Классификатор компьютерных конфигураций ООО «Юкомс». Словарь признаков, версия C1. Материалы индивидуального проекта, 2026.'])
    return r.save()


if __name__=='__main__':
    build()
