# Система хранения данных — официальный ADPG

18.10.2026 стенд Албахтина исправлен по методичке: вместо контейнера `postgres:16` установлен официальный ADPG Community через ADCM. Кластер `TIABD Albakhtin IV ADPG` использует бандл `16.3_arenadata6.5_b2-1`; продукт в его интерфейсе называется ADP, служба базы — ADPG. ADPG, Chrony и Monitoring имеют состояние `installed` и статус `Up`.

## Фактическая конфигурация

- ВМ `TIABD-Albakhtin-IV`, Ubuntu Server 22.04.5 LTS, 2 vCPU, 4 ГБ RAM, диск 40 ГБ.
- NAT: `10.0.2.15/24`; Host-Only: `192.168.56.103/24`.
- Docker Compose запускает только ADCM 2.12.0 и его служебную БД.
- Официальный бандл устанавливает системные службы `adpg16`, `chrony`, `admprom-prometheus`, `admprom-grafana`, `admprom-node-exporter` и `adpg16-pgwatch2`.
- Установленный пакет `adpg16-server`: `16.3-arenadata1-102+git05ffe93`; бинарный файл psql: `/usr/lib/adpg16/bin/psql`.
- ADCM: `http://127.0.0.1:8001`; ADPG: `127.0.0.1:5433`; Grafana: `http://127.0.0.1:11211`; Prometheus: `http://192.168.56.103:11200`.

## Установка по методичке

1. Подготовить Ubuntu Server и оба сетевых адаптера. В настройках ADCM указать `global.adcm_url = http://192.168.56.103:8000` для обратных запросов statuschecker.
2. Создать локальный `.env` с `TIABD_ADCM_DB_PASSWORD` и запустить `docker compose up -d adcm-db adcm`. Пароли не добавлять в Git.
3. Скачать два официальных архива по [манифесту](official_bundles.json), проверить SHA-256 и загрузить через Bundles. Продуктовый бандл содержит условия Community Edition.
4. Создать SSH Common hostprovider и хост `192.168.56.103`: пользователь `albakhtin`, SSH-пароль, `Ansible become = true`, пароль sudo. Установить host statuschecker.
5. Создать кластер ADPG и добавить ADPG, Chrony и Monitoring. На единственный учебный хост назначить ADPG, NTP Master, Prometheus Server, Grafana, Node Exporter и ADPG Exporter. Для Monitoring задать сильные пароли Grafana и доступа Grafana к Prometheus. Выполнить Install. На совмещённом учебном хосте автоматическую перезагрузку в действии отключить, затем выполнить обычную перезагрузку ВМ после настройки.
6. В конфигурации ADPG задать `pg_hba_customs` и выполнить Reconfigure and Restart:

```text
host ecommerce ecommerce_grafana 127.0.0.1/32 scram-sha-256
host all postgres 192.168.56.1/32 scram-sha-256
host all postgres 10.0.2.2/32 scram-sha-256
```

При изменении ADCM URL после первой установки statuschecker перезапустить три службы, чтобы запущенные процессы перечитали адрес:

```bash
sudo systemctl restart adcm-status-checker adcm-host-status-checker adcm-docker-status-checker
```

В качестве резервной точки до исправления сохранён снимок VirtualBox `before-pr2-adpg-20261018`; в ВМ также находится дамп прежней базы `/home/albakhtin/tiabd/pr2-rework-backup/ecommerce-before-adpg.dump`.

## Загрузка данных и повторная проверка

Рабочая папка в ВМ: `/home/albakhtin/tiabd/storage`. Подготовить 11 CSV Olist в `data/` через `prepare_data.py`. Исходные CSV не изменяются. `bootstrap.py` запускает только ADCM и создаёт `ecommerce` в уже установленном официальном ADPG. Пустая схема загружается атомарно; существующие 11 таблиц сохраняются. Каталог `/import` ссылается на `data/`, а postgres получает необходимый доступ через ACL.

Скопировать `.official.env.example` в локальный `.official.env`, указать фактические пароли; пароль администратора Grafana должен совпадать с настройкой Monitoring в ADCM. Этот файл хранится только в ВМ. Затем выполнить:

```bash
python3 bootstrap.py
/home/albakhtin/tiabd/.venv/bin/python configure_official_grafana.py
/home/albakhtin/tiabd/.venv/bin/python collect_official_results.py
/home/albakhtin/tiabd/.venv/bin/python setup_adcm.py
sudo -u postgres /usr/lib/adpg16/bin/psql -Xq -h /tmp -d ecommerce -f show_schema.sql
```

`schema.sql` создаёт 11 таблиц и 9 внешних ключей; `load.sql` выполняет импорт в порядке зависимостей. Промежуточные таблицы сохраняют все строки при обработке отсутствующих справочников. `analytics.sql` содержит четыре задания. Отзывы усредняются до одной строки на заказ, уникальные покупатели считаются по `customer_unique_id`, средняя доставка продавца — по `freight_value` товарных позиций.

`configure_official_grafana.py` создаёт пользователя БД только для чтения, datasource и дашборд, проверяя возврат данных всеми шестью запросами. `collect_official_results.py` проверяет пакеты Arenadata, ключи, показатели и мониторинг. `setup_adcm.py` фиксирует именно официальный кластер и успешное действие Install; подменяющий учебный бандл больше не создаётся.

Результаты записываются в `АлбахтинИВ/Результаты/Хранение/`. Снимки `03_adcm.png`, `05_schema.png`, `04_grafana.png`, `06_grafana_revenue.png`, `07_grafana_buyers.png` получены с работающего стенда. Папка `adcm_bundle/` и `collect_results.py` относятся к прежнему учебному варианту и не используются для актуального отчёта.

## Пересборка отчёта на Windows

Из корня репозитория выполнить `python 4/BD/АлбахтинИВ/Исходники/build_pr2_storage_report.py`, затем `python 4/BD/scripts/prepare_combined_pr2.py --student АлбахтинИВ` и `./4/BD/scripts/build_combined_pr2.ps1 -Students АлбахтинИВ`. Раздел визуализации сохраняется, раздел хранения обновляется. DOCX/PDF Губарева эти команды не затрагивают. Временные рендеры — только в корневой `.cache/`.
