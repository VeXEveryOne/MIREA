# Практическая работа №1. Введение в инструментарий анализа данных

## Содержание

- [Единый выполненный Notebook](Практика_1.ipynb) — анализ FiresRu, самостоятельный анализ Bike Sharing и ответы на 12 контрольных вопросов.
- [Контрольные вопросы](Контрольные_вопросы.md) — отдельный текстовый источник ответов, включённый в конец Notebook.

Для просмотра без Jupyter: [единый HTML-отчёт](reports/Практика_1.html). Он содержит весь код, таблицы, графики, выводы и ответы.

## Запуск

Откройте `start_jupyter.cmd` и выберите ядро **Python (BD Practice 1)**.
Для полного выполнения единого ноутбука и обновления HTML-отчёта запустите `run_all.cmd`.

Текстовые разделы ноутбука находятся в `scripts/01_FiresRu.py` и `scripts/02_BikeSharing.py`.
`run_all.cmd` объединяет их в `Практика_1.ipynb`, добавляет ответы и выполняет все ячейки в одном ядре.

## Установка на другом компьютере

Требуется Python 3.11 или 3.12. Из общего каталога `BD` выполните:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m ipykernel install --sys-prefix --name bd-practice-1 --display-name "Python (BD Practice 1)"
.\.venv\Scripts\python.exe practice_1\scripts\run_all.py
```

## Данные и результаты

`FiresRu.csv` предоставлен с заданием. Дневная таблица [Bike Sharing, UCI](https://doi.org/10.24432/C5W894)
сохранена в `data/bike_sharing/` вместе с описанием и сведениями об источнике.
Автор: Hadi Fanaee-T, лицензия [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Подготовленные таблицы CSV, JSON Lines и Parquet, групповые статистики и графики находятся
в `output/fires/` и `output/bike_sharing/`. Проверка повторного чтения включена в оба ноутбука.
