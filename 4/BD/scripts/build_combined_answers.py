"""Assemble one practice 2 study file from the retained answer components."""
from pathlib import Path
from urllib.parse import quote
import re

BD = Path(__file__).resolve().parents[1]
TARGET = BD / 'ТИАБД_ПР2_Ответы.md'


def question_body(name, count, end=None):
    text = (BD / name).read_text(encoding='utf-8-sig')
    if end:
        text = text.split(end, 1)[0]
    start = re.search(r'^1\. \*\*', text, re.M)
    if not start:
        raise ValueError(f'Question list is missing: {name}')
    body = text[start.start():].strip()
    blocks = re.findall(r'(?ms)^(\d+)\. \*\*(.*?)\*\*\s*\n(.*?)(?=^\d+\. \*\*|\Z)', body)
    assert [int(number) for number, _, _ in blocks] == list(range(1, count + 1)), name
    assert all(answer.strip() for _, _, answer in blocks), name
    return body


def link(label, relative):
    return f'[{label}]({quote(relative, safe="/")})'


def build():
    visual = question_body('ТИАБД_ПР2_Визуализация_Ответы.md', 16)
    storage = question_body('ТИАБД_ПР2_Хранение_Ответы.md', 12)
    visual_source = link('Методичка по визуализации', 'practice_2/assignment/Практика №2.pdf')
    storage_source = link('Методичка по хранению', 'practice_2/assignment/Практическая работа №2_Хранение.docx')
    text = f'''# Практическая работа 2 ответы на вопросы

Все ответы для подготовки по двум заданиям практики №2 собраны в одном файле: 16 учебных вопросов по визуализации и 12 контрольных вопросов по хранению данных. Всего 28 ответов; нумерация начинается заново в каждом разделе.

- [Визуализация](#i-практика-2-визуализация)
- [Хранение данных](#ii-практика-2-хранение-данных)

## I Практика 2 Визуализация

{visual_source}. Отдельного списка контрольных вопросов в этой методичке нет; 16 вопросов ниже охватывают Matplotlib, Plotly, t-SNE, UMAP и интерпретацию результатов практики. Примеры относятся к поездкам Bike Sharing и изображениям рукописных цифр, использованным в выполненной работе.

{visual}

## II Практика 2 Хранение данных

{storage_source}, раздел 6 «Контрольные вопросы». Все 12 формулировок сохранены; примеры относятся к базе ecommerce, таблицам Olist и Grafana.

{storage}

'''
    assert len(re.findall(r'^\d+\. \*\*', text, re.M)) == 28
    assert text.count('```') % 2 == 0
    TARGET.write_text(text.rstrip() + '\n', encoding='utf-8')
    print(f'{TARGET.name}: 16 + 12 = 28 answers')


if __name__ == '__main__':
    build()
