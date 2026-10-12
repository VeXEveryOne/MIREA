# Практическая работа №2. Визуализация данных в Python

Итоговая ПР2 объединяет этот раздел с заданием по хранению данных: [DOCX](../ТИАБД_ПР2_АлбахтинИВ.docx), [PDF](../ТИАБД_ПР2_АлбахтинИВ.pdf). Здесь находятся исходный ноутбук, данные и результаты визуализации.

## Содержание

- `03_Visualization.ipynb` — выполненный Jupyter Notebook.
- `scripts/03_Visualization.py` — текстовый источник ноутбука в формате Jupytext.
- `output/figures/` — статические графики для отчёта.
- `output/interactive/` — интерактивные графики Plotly в HTML.
- `output/summary.json` — проверяемая сводка результатов и времени.
- [Отдельные ответы](../ТИАБД_ПР2_Визуализация_Ответы.md) — подробные ответы по Matplotlib, Plotly, t-SNE и UMAP; они включаются в конец notebook.

## Запуск

Из каталога `practice_2` выполните:

```powershell
..\.venv\Scripts\python.exe scripts\build_notebook.py
```

Для статического экспорта Plotly библиотеке Kaleido требуется установленный Chrome или Chromium.
