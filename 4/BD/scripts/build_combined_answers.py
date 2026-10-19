"""Assemble one study file for practice 2 and lecture 2."""
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
    lecture = question_body('ТИАБД_Лекция_2_Ответы.md', 8, end='\n# Практическая работа №2.')
    visual_source = link('Методичка по визуализации', 'practice_2/assignment/Практика №2.pdf')
    storage_source = link('Методичка по хранению', 'practice_2/assignment/Практическая работа №2_Хранение.docx')
    lecture_source = link('Лекция №2', 'Методички/Технологии и инструментарий анализа больших данных_Лекции №2.pdf')
    text = f'''# Практическая работа 2 и лекция 2 ответы на вопросы

Все ответы для подготовки по практике №2 и лекции №2 собраны в одном файле: 16 учебных вопросов по визуализации, 12 контрольных вопросов по хранению данных и 8 контрольных вопросов лекции. Всего 36 ответов; нумерация начинается заново в каждом разделе.

- [Визуализация](#i-практика-2-визуализация)
- [Хранение данных](#ii-практика-2-хранение-данных)
- [Лекция 2](#iii-лекция-2)

## I Практика 2 Визуализация

{visual_source}. Отдельного списка контрольных вопросов в этой методичке нет; 16 вопросов ниже охватывают Matplotlib, Plotly, t-SNE, UMAP и интерпретацию результатов практики. Примеры относятся к поездкам Bike Sharing и изображениям рукописных цифр, использованным в выполненной работе.

{visual}

## II Практика 2 Хранение данных

{storage_source}, раздел 6 «Контрольные вопросы». Все 12 формулировок сохранены; примеры относятся к базе ecommerce, таблицам Olist и Grafana.

{storage}

## III Лекция 2

{lecture_source}, страница 107 PDF, раздел «Контрольные вопросы». Все 8 формулировок сохранены.

{lecture}

'''
    assert len(re.findall(r'^\d+\. \*\*', text, re.M)) == 36
    assert text.count('```') % 2 == 0
    TARGET.write_text(text.rstrip() + '\n', encoding='utf-8')
    print(f'{TARGET.name}: 16 + 12 + 8 = 36 answers')


if __name__ == '__main__':
    build()
