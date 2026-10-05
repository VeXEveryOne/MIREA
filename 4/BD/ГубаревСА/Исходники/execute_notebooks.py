"""Execute the two personal Python notebooks; original course data are read only."""
import asyncio
import json
from pathlib import Path

import nbformat
from nbclient import NotebookClient

PACK = Path(__file__).resolve().parents[1]
BD = PACK.parent
NOTEBOOKS = PACK / 'Ноутбуки'


def prepare_notebooks():
    NOTEBOOKS.mkdir(parents=True, exist_ok=True)
    entries = [
        (BD / 'practice_1/Практика_1.ipynb', 'ТИАБД_ПР1_ГубаревСА.ipynb'),
        (BD / 'practice_2/03_Visualization.ipynb', 'ТИАБД_ПР2_Визуализация_ГубаревСА.ipynb'),
    ]
    locate = 'PROJECT = next(p for p in [Path.cwd(), *Path.cwd().parents] if (p / "practice_1" / "FiresRu.csv").is_file())\n'
    for original, name in entries:
        book = nbformat.read(original, as_version=4)
        for cell in book.cells:
            if cell.cell_type == 'code':
                if 'ПР1' in name:
                    cell.source = cell.source.replace('ROOT = Path.cwd()', locate + 'ROOT = PROJECT / "practice_1"')
                    cell.source = cell.source.replace('OUT = ROOT / "output" / "fires"', 'OUT = PROJECT / "ГубаревСА" / "Результаты" / "ПР1" / "fires"')
                    cell.source = cell.source.replace('OUT = ROOT / "output" / "bike_sharing"', 'OUT = PROJECT / "ГубаревСА" / "Результаты" / "ПР1" / "bike_sharing"')
                else:
                    old = 'ROOT = Path.cwd()\nif not (ROOT / "data" / "day.csv").exists():\n    ROOT = Path(__file__).resolve().parents[1]'
                    cell.source = cell.source.replace(old, locate + 'ROOT = PROJECT / "practice_2"')
                    cell.source = cell.source.replace('OUTPUT = ROOT / "output"', 'OUTPUT = PROJECT / "ГубаревСА" / "Результаты" / "Визуализация"')
                    cell.source = cell.source.replace('season_names = {1: "Весна", 2: "Лето", 3: "Осень", 4: "Зима"}', 'season_names = {1: "Код сезона 1", 2: "Код сезона 2", 3: "Код сезона 3", 4: "Код сезона 4"}')
                    cell.source = cell.source.replace('.reindex(["Весна", "Лето", "Осень", "Зима"])', '.reindex(list(season_names.values()))')
                    cell.source = cell.source.replace('clean["temp_c"] = clean["temp"] * 41\n', '')
                    cell.source = cell.source.replace('clean["atemp_c"] = clean["atemp"] * 50\n', '')
                    cell.source = cell.source.replace('clean["windspeed_kmh"] = clean["windspeed"] * 67\n', '')
                cell.outputs = []; cell.execution_count = None
            elif 'переводятся в исходные единицы' in cell.source:
                cell.source = 'Пропусков и полных дубликатов нет. Температура и ветер сохраняются в нормированной шкале. Влажность переводится в проценты по метаданным. Сезоны подписываются исходными кодами, поскольку описания набора дают разные словесные расшифровки.'
        book.cells[0].source += '\n\n**Студент: Губарев С.А., ИНБО-12-23.**'
        book.metadata['authors'] = [{'name': 'Губарев С.А.'}]
        book.metadata['kernelspec'] = {'display_name': 'Python (BD - VS Code)', 'language': 'python', 'name': 'bd-vscode'}
        nbformat.write(book, NOTEBOOKS / name)


def execute():
    if __import__('sys').platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    for path in sorted(NOTEBOOKS.glob('*.ipynb')):
        book = nbformat.read(path, as_version=4)
        print('Executing ' + path.name, flush=True)
        NotebookClient(book, kernel_name='bd-vscode', timeout=1200,
                       resources={'metadata': {'path': str(BD)}}, allow_errors=False).execute()
        code = [c for c in book.cells if c.cell_type == 'code']
        assert all(c.execution_count is not None for c in code)
        assert not any(o.output_type == 'error' for c in code for o in c.outputs)
        nbformat.write(book, path)
        print(f'{len(code)} executed cells, 0 errors', flush=True)


if __name__ == '__main__':
    prepare_notebooks()
    execute()
