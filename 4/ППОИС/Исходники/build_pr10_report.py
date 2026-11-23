"""PR10: only the function tree, role dialogs and client structural scheme."""
import json
from pathlib import Path
from report_layout import Report, ROOT, SUBJECT
from build_report_7 import digest

SCHEMES = SUBJECT / 'Схемы'

def inputs():
    source = SUBJECT / 'Исходники/practice10_model.json'
    data = json.loads(source.read_text(encoding='utf-8'))
    proof = json.loads((SCHEMES / 'ПР10_Проверка_модели.json').read_text(encoding='utf-8'))
    if (proof['source_sha256'] != digest(source)
            or proof['model_sha256'] != digest(SCHEMES / 'ПР10_Функции_и_диалоги.omni')
            or any(d.get('blocksCommit') or d.get('blocksExport') for d in proof['diagnostics'])):
        raise ValueError('Stale or invalid native model')
    if len(data['roles']) != 4 or sum(len(r['tasks']) for r in data['roles']) != 15:
        raise ValueError('Incomplete role task catalog')
    manifest = json.loads((ROOT / '.cache/ppois-pr10-20261112/export.json').read_text(encoding='utf-8'))
    result = json.loads((Path(manifest['output']) / 'Отчёт_экспорта.json').read_text(encoding='utf-8'))
    if result['cancelled'] or len(result['items']) != 6:
        raise ValueError('Incomplete native export')
    for filename, item in zip(proof['files'], result['items']):
        if (item['status'] != 'completed' or len(item['files']) != 1
                or digest(SCHEMES / filename) != digest(item['files'][0])):
            raise ValueError('Canonical image differs from native export')
    return data, proof

def build():
    data, proof = inputs()
    r = Report(10, 'Описание реализации клиентской части ИС')
    r.heading('Описание реализации клиентской части ИС')
    r.heading('Цель и задание', 2)
    r.paragraph('Цель работы — описать организацию клиентской части информационной системы формирования и актуализации карточек компьютерных систем ООО «Юкомс». Задание: представить дерево основных и служебных функций, сценарии диалога пользовательских ролей и структурную схему проектируемой системы.')
    r.heading('1 Все варианты работы и дерево функций')
    r.paragraph('Предусмотрены четыре пользовательские роли. Полный перечень задач приведён в таблице 1; далее на рисунке 1 показана их иерархия. Функции соответствуют формам практики 8: состав, подготовка карточек, изображения и согласование.')
    r.table('Все варианты работы пользовательских ролей', ['Роль', 'Доступные задачи'],
            [[role['name'], '; '.join(t['title'] for t in role['tasks'])] for role in data['roles']],
            [4.5, 12], keep_rows=True)
    r.paragraph('Вход открывает главное меню роли. Ошибка ввода возвращает к той же задаче с сообщением о причине. Отмена и возврат из результата открывают меню; выход завершает сеанс. Служебные функции обеспечивают проверку прав, ввод данных, справку и навигацию.')
    r.page(True)
    r.figure('Дерево основных и служебных функций', SCHEMES / proof['files'][0], max_height=13,
             lead='На рисунке 1 представлены все основные задачи четырёх ролей и общие служебные функции клиента.')
    for i, role in enumerate(data['roles']):
        # Page-break-before avoids trailing blank paragraphs on full diagram pages.
        heading = r.heading('2 Сценарии диалога' if i == 0 else f'2.{i+1} {role["name"]}',
                            1 if i == 0 else 2, new_page=True)
        if i == 0:
            r.heading('2.1 ' + role['name'], 2)
        r.figure('Сценарий диалога — ' + role['name'].lower(), SCHEMES / proof['files'][i+1], max_height=11.2 if i == 0 else 12.8,
                 lead=f'На рисунке {i+2} представлены все задачи роли «{role["name"]}»: выбор из меню, действия пользователя, результат и причина отказа.')
    r.heading('3 Структурная схема', new_page=True)
    r.paragraph('Визуальная часть содержит форму входа, главное меню и представления четырёх ролей. Невизуальные модули управляют сеансом и правами, проверяют ввод, обрабатывают команды и обновляют представления. Команды передаются прикладному сервису, который выполняет предметные операции и возвращает результаты.')
    r.figure('Структурная схема клиентской части ИС', SCHEMES / proof['files'][5], max_height=11.8,
             lead='На рисунке 6 показаны модули клиента и их связи с прикладным сервисом.')
    return r.save()

if __name__ == '__main__':
    build()
