# Практическая работа №1. Введение в инструментарий анализа данных

## Содержание

- [Анализ FiresRu](01_FiresRu.ipynb) — основная часть: загрузка, предобработка, статистика, графики и экспорт.
- [Анализ Bike Sharing](02_BikeSharing.ipynb) — самостоятельная часть: исследование спроса на прокат велосипедов.
- [Контрольные вопросы](Контрольные_вопросы.md) — ответы на 12 вопросов.

Для просмотра без Jupyter: [FiresRu](reports/01_FiresRu.html) и [Bike Sharing](reports/02_BikeSharing.html). Отчёты содержат код, таблицы, графики и выводы.

## Запуск

Откройте `start_jupyter.cmd` и выберите ядро **Python (BD Practice 1)**.
Для полного выполнения обоих ноутбуков и обновления HTML-отчётов запустите `run_all.cmd`.

Текстовые исходники ноутбуков находятся в `scripts/01_FiresRu.py` и `scripts/02_BikeSharing.py`.
`run_all.cmd` пересоздаёт ноутбуки из этих файлов, поэтому изменения перед повторной сборкой нужно вносить в соответствующий `.py`.

## Установка на другом компьютере

Требуется Python 3.11. В папке практики выполните:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m ipykernel install --sys-prefix --name bd-practice-1 --display-name "Python (BD Practice 1)"
.\.venv\Scripts\python.exe scripts\run_all.py
```

## Данные и результаты

`FiresRu.csv` предоставлен с заданием. Дневная таблица [Bike Sharing, UCI](https://doi.org/10.24432/C5W894)
сохранена в `data/bike_sharing/` вместе с описанием и сведениями об источнике.
Автор: Hadi Fanaee-T, лицензия [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Подготовленные таблицы CSV, JSON Lines и Parquet, групповые статистики и графики находятся
в `output/fires/` и `output/bike_sharing/`. Проверка повторного чтения включена в оба ноутбука.
