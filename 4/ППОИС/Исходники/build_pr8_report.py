"""PR8 submission: role-specific native mockups and six editable equations."""
from pathlib import Path
import json
from docx.shared import Pt
from report_layout import Report, ROOT, SUBJECT
from report_math import equation as write_equation, sub, text, summation, fraction, delimiter
from build_report_7 import digest

SCHEMES = SUBJECT / 'Схемы'

def equation(r, *items):
    p = write_equation(r, *items)
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(6)

DESCRIPTIONS = {
 'catalog': 'Разработчик выбирает группу и поставщика, просматривает перечень компонентов, цены и остатки. Команда «Выбрать компонент» переносит выбранное предложение в состав. Данные поступают из component_group, component, supplier и offer.',
 'composition': 'Разработчик задаёт позиции и количества, выбирает предложения, проверяет совместимость и сохраняет новую версию состава. В форме показаны конфигурация, номер версии и результат проверки. Используются configuration, model_range_version и model_range_slot.',
 'revision': 'Менеджер вводит код продавца, заголовок и описание, выбирает версию состава и задаёт параметры цены и массы. Команды выполняют расчёт и сохраняют новую ревизию. Содержание карточки хранится в card и card_revision.',
 'calculation': 'Менеджер получает стоимость компонентов, себестоимость, цену до округления, итоговую цену и массу с упаковкой. Из результата можно открыть карточку или сохранить ревизию. Показатели вычисляются по model_range_slot, offer, component и параметрам card_revision.',
 'images': 'Дизайнер выбирает файл для ревизии, просматривает изображение и задаёт порядок показа. Форма содержит имя файла, размеры и порядковый номер. Метаданные хранятся в image, связь с ревизией и порядок — в revision_image.',
 'approval': 'Генеральный директор проверяет состав, цену, содержание и изображения выбранной ревизии. Команда «Утвердить ревизию» устанавливает READY после успешной проверки. При возврате на доработку ревизия остаётся DRAFT. Используются card, card_revision, model_range_version и revision_image.',
 'publication': 'Менеджер просматривает номер попытки, её состояние и внешний идентификатор. ACCEPTED означает принятие задачи; состояние PUBLISHED устанавливается после подтверждения публикации. Команда «Обновить результат» запрашивает актуальное состояние попытки из publication_attempt.',
 'card': 'Заполненная карточка объединяет заголовок, описание, состав, характеристики, изображение, цену и массу одной ревизии. Менеджер просматривает готовый результат и передаёт его на публикацию после утверждения.',
}

def inputs():
    proof = json.loads((SCHEMES / 'ПР8_Проверка_моделей.json').read_text(encoding='utf-8'))
    if proof['diagnostics'] or proof['models'] != {
            'screens': digest(SCHEMES / 'ПР8_Экранные_формы.omni'),
            'algorithms': digest(SCHEMES / 'ПР8_Алгоритмы.omni')}:
        raise ValueError('Stale native models')
    if proof['source_sha256'] != digest(Path(__file__).with_name('submission_model.json')):
        raise ValueError('Stale role or card data')
    manifest = json.loads((ROOT / '.cache/ppois-pr8-20261112/export.json').read_text(encoding='utf-8'))
    result = json.loads((Path(manifest['output']) / 'Отчёт_экспорта.json').read_text(encoding='utf-8'))
    if result['cancelled'] or len(result['items']) != 10:
        raise ValueError('Incomplete native export')
    for i, item in enumerate(result['items'], 1):
        if (item['status'] != 'completed' or len(item['files']) != 1
                or digest(SCHEMES / f'{i:02d}_{item["title"]}.png') != digest(item['files'][0])):
            raise ValueError('Image differs from native export')
    return proof

def formulas(r):
    r.paragraph('n — число позиций состава; i — индекс позиции от 1 до n; qᵢ — целое положительное количество компонентов в позиции i; pᵢ — цена единицы в рублях. Cкомп — стоимость всех компонентов, руб.:', keep=True)
    equation(r, sub('C', 'комп'), text(' = '), summation([sub('q', 'i'), text(' · '), sub('p', 'i')]))
    r.paragraph('A и B — стоимость сборки и упаковки в рублях; C — себестоимость изделия, руб.:', keep=True)
    equation(r, text('C = '), sub('C', 'комп'), text(' + A + B'))
    r.paragraph('m — доля наценки, 0 ≤ m ≤ 1; c — доля комиссии от цены продажи, 0 ≤ c < 1; L — расходы на логистику в рублях. P₀ — цена до округления, руб.:', keep=True)
    equation(r, sub('P', '0'), text(' = '), fraction(
        [text('C · '), delimiter([text('1 + m')]), text(' + L')], [text('1 − c')]))
    r.paragraph('d > 0 — шаг округления в рублях; P — итоговая цена, руб. Знак ⌈x⌉, или ceil(x), обозначает округление x вверх до ближайшего целого:', keep=True)
    equation(r, text('P = d · '), delimiter([fraction([sub('P', '0')], [text('d')])], '⌈', '⌉'))
    r.paragraph('wᵢ — масса единицы компонента позиции i в килограммах; b — масса упаковки, кг; W — масса изделия с упаковкой, кг:', keep=True)
    equation(r, text('W = '), summation([sub('q', 'i'), text(' · '), sub('w', 'i')]), text(' + b'))
    r.paragraph('K — множество позиций, потребляющих питание, без корпуса и блока питания; Hᵢ — мощность единицы компонента, Вт; HБП — мощность блока питания, Вт; β = 0,30 — доля запаса. Условие достаточности питания:', keep=True)
    equation(r, sub('H', 'БП'), text(' ≥ '), delimiter([text('1 + β')]), text(' · '), summation([sub('q', 'i'), text(' · '), sub('H', 'i')], 'i ∈ K', ''))
    r.paragraph('Цены и массы положительны; затраты A, B, L и масса упаковки b неотрицательны. Проверка совместимости также требует совпадения сокета процессора и платы, типа памяти и наличия обязательных групп компонентов.')

def build():
    proof = inputs()
    r = Report(8, 'Входная и результатная информация и математическое обеспечение ИС')
    r.heading('Входная и результатная информация и математическое обеспечение ИС')
    r.heading('Цель и задание', 2)
    r.paragraph('Цель работы — спроектировать входную и результатную информацию информационной системы формирования и актуализации карточек компьютерных систем ООО «Юкомс». Задание: представить и описать макеты экранных форм, согласовать их с базой данных практики 7, определить математическое обеспечение и построить алгоритмы в обозначениях ГОСТ 19.701-90.')
    r.heading('1 Экранные формы и их описание')
    r.paragraph('Разработчик работает с каталогом и составом конфигурации; менеджер — с содержанием карточки, расчётом и публикацией; дизайнер — с изображениями и их порядком; генеральный директор — с проверкой и утверждением ревизии. В заголовке формы указана роль, её меню и команды соответствуют выполняемой задаче.')
    for f in proof['forms']:
        landscape = f['id'] != 'card'
        same_orientation = r.landscape == landscape
        r.page(landscape)
        before = len(r.document.paragraphs)
        r.figure(f['title'] + ' — ' + f['role'].lower(), SCHEMES / f['file'],
                 max_height=19.5 if f['id'] == 'card' else 12.5,
                 lead=f'На рисунке {r.figure_count+1} представлена форма «{f["title"]}». ' + DESCRIPTIONS[f['id']])
        if same_orientation:
            r.document.paragraphs[before].paragraph_format.page_break_before = True
    r.page(False, new_page=True)
    r.heading('2 Математическое обеспечение')
    r.paragraph('t — момент расчёта. Для каждой позиции выбирается предложение с достаточным остатком, возрастом наблюдения не более 24 часов и датой не позже t. Среди допустимых выбирается минимальная цена; при равенстве — код поставщика и идентификатор предложения. Затем проверяются совместимость и параметры расчёта.')
    formulas(r)
    r.heading('3 Алгоритмы обработки информации')
    r.paragraph('Алгоритм подбора последовательно обрабатывает все позиции состава и возвращает выбранные предложения либо сообщение об ошибке. Алгоритм расчёта проверяет параметры и совместимость, затем определяет себестоимость, цену и массу. Ввод и вывод показаны параллелограммами, обработка — прямоугольниками, условия — ромбами, начало и конец — терминаторами.')
    for a, title in zip(proof['algorithms'], ['Алгоритм подбора предложений', 'Алгоритм проверки и расчёта']):
        r.page(False, new_page=True)
        r.figure(title, SCHEMES / a['file'], max_height=21)
    r.page(False, new_page=True)
    r.heading('Вывод')
    r.paragraph('Разработаны и описаны входные и результатные формы для четырёх пользовательских ролей, включая заполненную карточку. Состав информации согласован с таблицами базы данных практики 7. Определены формулы стоимости, цены и массы и условие достаточности питания; построены алгоритмы подбора предложений и расчёта показателей.')
    r.sources(['Практическая работа №8. Входная и результатная информация (макеты). Математическое обеспечение ИС. Методическое задание РТУ МИРЭА, 1 с.',
               'ГОСТ 19.701-90. Схемы алгоритмов, программ, данных и систем. Условные обозначения и правила выполнения.'])
    return r.save()

if __name__ == '__main__':
    build()
