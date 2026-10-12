"""Apply the course vocabulary consistently without rewriting document formatting."""
from pathlib import Path
import re
from zipfile import ZipFile
from lxml import etree

LEGACY = 'B' + 'OM'


def terminology(text):
    for old, new in [
        ('B' + 'OMController', 'ModelRangeController'),
        ('Form' + LEGACY, 'ModelRangeForm'),
        ('Bom', 'ModelRange'),
        ('bom', 'model_range'),
        ('Деятельность_' + LEGACY, 'Деятельность_Модельный_ряд'),
        ('Согласованная ' + LEGACY, 'Согласованный модельный ряд'),
        ('Проверенная ' + LEGACY, 'Проверенный модельный ряд'),
        ('проверенной ' + LEGACY, 'проверенному модельному ряду'),
        ('проверенному ' + LEGACY, 'проверенному модельному ряду'),
        ('версия состава ' + LEGACY, 'версия модельного ряда'),
        ('Версия ' + LEGACY, 'Версия модельного ряда'),
        ('версия ' + LEGACY, 'версия модельного ряда'),
        ('версию ' + LEGACY, 'версию модельного ряда'),
        ('версии ' + LEGACY, 'версии модельного ряда'),
        ('Позиция ' + LEGACY, 'Позиция модельного ряда'),
        ('позиция ' + LEGACY, 'позиция модельного ряда'),
        ('позиции ' + LEGACY, 'позиции модельного ряда'),
        ('позиций ' + LEGACY, 'позиций модельного ряда'),
        ('слоты ' + LEGACY, 'позиции модельного ряда'),
        ('слотов ' + LEGACY, 'позиций модельного ряда'),
        ('Формы ' + LEGACY, 'Формы модельного ряда'),
        ('Форма ' + LEGACY, 'Форма модельного ряда'),
        ('Управление ' + LEGACY, 'Управление модельным рядом'),
        ('управлению ' + LEGACY, 'управлению модельным рядом'),
        ('Правила ' + LEGACY, 'Правила модельного ряда'),
        ('Основа ' + LEGACY, 'Основа модельного ряда'),
        ('Состав ' + LEGACY, 'Состав модельного ряда'),
        ('черновик ' + LEGACY, 'черновик модельного ряда'),
        ('Изменились ' + LEGACY, 'Изменился модельный ряд'),
        ('формирование ' + LEGACY, 'формирование модельного ряда'),
        ('формирования ' + LEGACY, 'формирования модельного ряда'),
        ('Формирование ' + LEGACY, 'Формирование модельного ряда'),
        ('Сформировать ' + LEGACY, 'Сформировать модельный ряд'),
        ('сформировать ' + LEGACY, 'сформировать модельный ряд'),
    ]:
        text = text.replace(old, new)
    text=text.replace(LEGACY, 'модельный ряд')
    for old,new in [
        ('В проекте такая конфигурация представляется спецификацией изделия модельный ряд. Элемент модельный ряд',
         'В проекте варианты конфигурации входят в модельный ряд. Позиция состава'),
        ('ведения модельный ряд','ведения модельных рядов'),
        ('ведении модельный ряд','ведении модельных рядов'),
        ('часть модельный ряд','часть модельных рядов'),
        ('управление модельный ряд','управление модельным рядом'),
        ('связанных модельный ряд','связанных модельных рядов'),
        ('модельный ряд, связанная','модельный ряд, связанный'),
        ('. модельный ряд содержит','. Модельный ряд содержит'),
        ('изменением модельный ряд','изменением модельного ряда'),
        ('изменении модельный ряд','изменении модельного ряда'),
        ('Изменение модельный ряд','Изменение модельного ряда'),
        ('изменения модельный ряд','изменения модельного ряда'),
        ('версионирование модельный ряд','версионирование модельного ряда'),
        ('корректность модельный ряд','корректность модельного ряда'),
        ('Карточка модельный ряд','Карточка модельного ряда'),
        ('затрагиваемые модельный ряд','затрагиваемые модельные ряды'),
        ('составу модельный ряд','составу модельного ряда'),
        ('все модельный ряд','все модельные ряды'),
        ('затрагиваемых модельный ряд','затрагиваемых модельных рядов'),
        ('изменённых модельный ряд','изменённых модельных рядов'),
        ('данных модельный ряд','данных модельного ряда'),
        ('версий модельный ряд','версий модельного ряда'),
        ('фильтрацию модельный ряд','фильтрацию модельных рядов'),
        ('затронутых модельный ряд','затронутых модельных рядов'),
        ('затронутые модельный ряд','затронутые модельные ряды'),
        ('Для каждой модельный ряд','Для каждого модельного ряда'),
        ('Реестр модельный ряд','Реестр модельных рядов'),
        ('согласованную модельный ряд','согласованный модельный ряд'),
        ('согласованной модельный ряд','согласованного модельного ряда'),
        ('нескольких модельный ряд','нескольких модельных рядах'),
        ('сохранении модельный ряд','сохранении модельного ряда'),
        ('сохранения модельный ряд','сохранения модельного ряда'),
        ('Контроллер модельный ряд','Контроллер модельного ряда'),
        ('Слот модельный ряд','Позиция модельного ряда'),
        ('версией модельный ряд','версией модельного ряда'),
        ('Изменился модельный ряд, предложения','Изменились модельный ряд, предложения'),
        ('модельный ряд-ссылка','ссылка на версию состава'),
        ('модельный ряд — спецификация состава компьютерной системы.',
         'Модельный ряд — набор конфигураций компьютерных систем с версиями состава.'),
        ('Версия модельного ряда содержит один или несколько слотов (композиция).',
         'Версия модельного ряда связана с одной или несколькими позициями состава (ассоциация).'),
        ('В таблице 5 приведены сообщения рисунка 4. Все вызовы синхронные.',
         'В таблице 5 приведены сообщения рисунка 4. Вызовы 11 и 12 асинхронные; остальные вызовы синхронные.'),
        ('составом компьютерных конфигураций модельный ряд','составом компьютерных конфигураций модельного ряда'),
    ]:text=text.replace(old,new)
    if text.startswith('модельный ряд'):text='М'+text[1:]
    return text


def patch_docx(path):
    """Replace split-run text while retaining every run and its formatting."""
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    changes = {}
    with ZipFile(path) as original:
        for name in original.namelist():
            if not name.startswith('word/') or not name.endswith('.xml'):
                continue
            root = etree.fromstring(original.read(name))
            altered = False
            for paragraph in root.xpath('//w:p', namespaces=ns):
                nodes = paragraph.xpath('.//w:t', namespaces=ns)
                text = ''.join(n.text or '' for n in nodes)
                updated = terminology(text)
                if updated == text:
                    continue
                # Assign each edit to its original run, preserving unaffected text.
                import difflib
                for tag, a, b, c, d in reversed(list(difflib.SequenceMatcher(None, text, updated).get_opcodes())):
                    if tag == 'equal':
                        continue
                    offset = 0
                    positions = []
                    for node in nodes:
                        positions.append((node, offset, offset + len(node.text or '')))
                        offset += len(node.text or '')
                    touched = [(n, start, end) for n, start, end in positions if start < b and end > a]
                    if not touched and tag == 'insert':
                        touched = [(n, start, end) for n, start, end in positions if start <= a <= end][-1:]
                    for i, (node, start, end) in enumerate(touched):
                        value = node.text or ''
                        lo, hi = max(0, a-start), min(len(value), b-start)
                        node.text = value[:lo] + (updated[c:d] if i == 0 else '') + value[hi:]
                        node.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                assert ''.join(n.text or '' for n in nodes) == updated
                altered = True
            if altered:
                changes[name] = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
        if not changes:
            return 0
        temporary = path.with_suffix('.writing.docx')
        with ZipFile(temporary, 'w') as result:
            for item in original.infolist():
                result.writestr(item, changes.get(item.filename, original.read(item.filename)))
    temporary.replace(path)
    return len(changes)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('documents', nargs='+', type=Path)
    for document in parser.parse_args().documents:
        print(document, patch_docx(document))
