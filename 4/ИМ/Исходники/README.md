# Сборка отчёта ИМ

Готовый отчёт и PDF находятся в каталоге предмета; модели — в `../OmniNotation/`. `Основа_отчёта.docx` — сохранённый исходный документ для контролируемого преобразования. Его не заменять результатом работы `revise_report.py`: индексы исходных разделов и проверка сохранения титульного листа относятся к этой основе.

Python: `python-docx`, lxml, Pillow, pypdf. Node: внешний OmniNotation с `tsx` и комплектный `sharp`. Общий `tools/runtime.mjs` находит зависимости. `OMNINOTATION_ROOT` задаёт путь к внешнему репозиторию, `IM_MODEL_OUTPUT` — каталог пробных моделей.

Из корня MIREA запускать TypeScript через `node <OMNINOTATION_ROOT>/node_modules/tsx/dist/cli.mjs <путь_скрипта>`:

1. `build_idef0.mts` создаёт AS IS и TO BE; `build_report_uml.mts` — UML; `build_gantt.mts` — календарный план. `prepare_term_clean_models.mts` нормализует терминологию импортированных моделей. Сохраняются шесть проектов.
2. `build_print_idef0.mts` обновляет читаемую геометрию четырёх листов IDEF0 и их печатные рисунки. `build_print_figures.mts` формирует остальные рисунки из актуальных моделей. Результат — 14 PNG и SVG в `report_figures/`.
3. `revise_report.py` выполняет контролируемую переработку содержания, сметы и оформления. Пять аргументов обязательны: `--baseline`, `--figures`, `--models`, `--output`, `--working`.
4. `tools/export_coursework_word.ps1 -Documents <DOCX> -UpdateSource` обновляет содержание и поля и сохраняет PDF через Microsoft Word.
5. `tools/render_coursework.py <DOCX> <PDF> <папка> --dpi 110` создаёт страницы для визуальной проверки. Проверить все страницы, подписи, таблицы и согласованность рисунков с моделями до замены канонических файлов. После замены запустить `sync_final_outputs.py`: он сверяет 14 актуальных PNG и записывает относительные пути и SHA-256 моделей, PNG, SVG, DOCX и PDF в `../OmniNotation/Реестр_рисунков.json`.

Пример контролируемой сборки (из корня; Python/Node должны разрешаться в выбранном окружении):

```powershell
python 4/ИМ/Исходники/revise_report.py --baseline 4/ИМ/Исходники/Основа_отчёта.docx --figures 4/ИМ/OmniNotation/report_figures --models 4/ИМ/OmniNotation --output .cache/им/ИМ_АлбахтинИВ_Отчёт.docx --working .cache/им
./tools/export_coursework_word.ps1 -Documents "$PWD/.cache/им/ИМ_АлбахтинИВ_Отчёт.docx" -UpdateSource
python tools/render_coursework.py .cache/им/ИМ_АлбахтинИВ_Отчёт.docx .cache/им/ИМ_АлбахтинИВ_Отчёт.pdf .cache/им/pages --dpi 110
```

Генераторы моделей сами по себе не обновляют DOCX. Пробные сборки, журналы и изображения страниц не добавлять в Git.
