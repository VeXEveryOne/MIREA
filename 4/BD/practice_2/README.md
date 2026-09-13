# Практическая работа №2. Визуализация данных в Python

## Содержание

- `03_Visualization.ipynb` — выполненный Jupyter Notebook.
- `scripts/03_Visualization.py` — текстовый источник ноутбука в формате Jupytext.
- `output/figures/` — статические графики для отчёта.
- `output/interactive/` — интерактивные графики Plotly в HTML.
- `output/summary.json` — проверяемая сводка результатов и времени.
- `Контрольные вопросы.md` — ответы на вопросы по Matplotlib, Plotly, t-SNE и UMAP.

## Запуск

Из каталога `practice_2` выполните:

```powershell
..\.venv\Scripts\python.exe -m jupytext --to ipynb scripts\03_Visualization.py --output 03_Visualization.ipynb
..\.venv\Scripts\python.exe -m jupyter nbconvert --to notebook --execute 03_Visualization.ipynb --output 03_Visualization.ipynb --ExecutePreprocessor.timeout=1200
..\.venv\Scripts\python.exe -m jupyter nbconvert --to html 03_Visualization.ipynb --output-dir reports
```

Для статического экспорта Plotly библиотеке Kaleido требуется установленный Chrome или Chromium.

