"""Register the current native models, print figures and matching report pair."""
from pathlib import Path
from hashlib import sha256
from datetime import date
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MODELS=ROOT/'OmniNotation'
FIGURES=MODELS/'report_figures'
MAPPING={
    'ИМ_ПР6_FURPS.omni':['ПР6_FURPS_Функции','ПР6_FURPS_Качества'],
    'ИМ_ПР4_IDEF0_AS-IS.omni':['ПР4_AS_IS_context','ПР4_AS_IS_decomposition'],
    'ИМ_ПР5_IDEF0_TO-BE.omni':['ПР5_TO_BE_context','ПР5_TO_BE_decomposition'],
    'ИМ_ПР8-10_UML.omni':['ПР8_Прецеденты_данные','ПР8_Прецеденты_публикация','ПР9_Последовательность'],
    'ИМ_ПР9-10_Архитектура.omni':['ПР9_Деятельность','ПР10_Компоненты','ПР10_Развёртывание'],
    'ИМ_ПР11_Гант.omni':['ПР11_Гант'],
}

def entry(path):
    assert path.is_file(),path
    return {'file':path.relative_to(ROOT).as_posix(),'sha256':sha256(path.read_bytes()).hexdigest()}

def main():
    figures=[]
    expected={name+'.png' for names in MAPPING.values() for name in names}|{'ПР1_Оргструктура.png'}
    assert {p.name for p in FIGURES.glob('*.png')}==expected,'Stale or missing print exports'
    for model,names in MAPPING.items():
        native=entry(MODELS/model)
        for name in names:
            png=FIGURES/(name+'.png');svg=FIGURES/'SVG'/(name+'.svg')
            with Image.open(png) as image:width,height=image.size
            figures.append({'name':name,'model':native,'png':{**entry(png),'width':width,'height':height},'svg':entry(svg)})
    png=FIGURES/'ПР1_Оргструктура.png'
    with Image.open(png) as image:width,height=image.size
    figures.insert(0,{'name':'ПР1_Оргструктура',
                     'source':entry(ROOT/'Исходники'/'build_print_figures.mts'),
                     'provenance':'Структура организации из исходной схемы ППОИС 1; не является проекцией FURPS.',
                     'png':{**entry(png),'width':width,'height':height},
                     'svg':entry(FIGURES/'SVG'/'ПР1_Оргструктура.svg')})
    result={'reviewedAt':date.today().isoformat(),'count':len(figures),'figures':figures,
            'report':{suffix:entry(ROOT/('ИМ_АлбахтинИВ_Отчёт.'+suffix)) for suffix in ['docx','pdf']}}
    (MODELS/'Реестр_рисунков.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Registered {len(MAPPING)} models and {len(figures)} print figures')

if __name__=='__main__':main()
