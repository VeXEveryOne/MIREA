"""Build storage and Spark reports exclusively from the new guest evidence."""
from pathlib import Path
import importlib.util
import json
import sys

import build_reports as personal
from build_reports import AlbakhtinReport, BD, PACK, n, read_json, save

SPARK = PACK / 'Spark'
STORAGE = PACK / 'Результаты/Хранение'
spec = importlib.util.spec_from_file_location('spark_report_builder', BD / 'spark_lab/build_reports.py')
original = importlib.util.module_from_spec(spec)
spec.loader.exec_module(original)
original.LAB = SPARK

def questions(number):
    """Read questions from the common immutable methodological originals."""
    from docx import Document
    import re
    ps = [p.text for p in Document(BD / 'spark_lab/assignment' / f'Практика №{number}.docx').paragraphs]
    index = next(i for i,t in enumerate(ps) if 'Контрольные вопросы' in t)
    return [t for t in ps[index+1:] if re.match(r'^\d+\. ',t)][:16 if number == 3 else 30]

original.questions = questions

class VMReport(AlbakhtinReport):
    def __init__(self, number, topic):
        self.number = number
        super().__init__(number, topic)
    def save(self, path):
        save(self.doc, f'ТИАБД_ПР{self.number}_АлбахтинИВ')
    def figure(self, path, caption, width=16):
        if not path.exists() and path.with_suffix('.png').exists():
            path = path.with_suffix('.png')
        return super().figure(path, caption, width)

def environment_table(report, result):
    e = result['environment']
    report.table('Паспорт личной виртуальной машины', ['Параметр', 'Фактическое значение'], [
        ['VM', 'TIABD-Albakhtin-IV'], ['ОС', 'Ubuntu Server 22.04.5 LTS'],
        ['Ресурсы', '2 vCPU; 4 ГБ RAM; независимый VDI 40 ГБ'],
        ['Python', e['python']], ['Java', e['java']], ['Spark', e['spark']],
        ['Master / parallelism', f'{e["master"]} / {e["parallelism"]}'],
        ['Shuffle partitions / AQE', f'{e["shuffle_partitions"]} / {e["aqe"]}'],
    ], [5.5, 11])
    report.p('Работа выполнена в новой VM с отдельной установкой Ubuntu и пользователем albakhtin. Каждый ноутбук запущен полностью в новом ядре. Local[*] использует два виртуальных ядра одного узла; физическая сеть кластера в таком режиме не проверяется. Методичка рекомендует Python 3.11; системный Python 3.10 совместим с выбранными Spark 3.5.7 и JDK 17.')

def storage_report():
    from build_pr2_storage_report import build
    build()


def build4():
    from build_pr4_report import build
    build()


if __name__ == '__main__':
    execution = read_json(PACK / 'Результаты/execution.json')
    assert len(execution['notebooks']) == 4 and all(x['errors'] == 0 for x in execution['notebooks'])
    assert execution['hostname'] == 'tiabd-albakhtin-iv'
    original.Report = VMReport
    original.environment_table = environment_table
    from build_pr3_report import build as build3
    storage_report(); build3(); build4()
