-- Учебный проект РОП. PostgreSQL 18. Кодировка UTF8.

-- Создание в отдельной пустой схеме. Исторические версии не удаляются.

BEGIN;

CREATE SCHEMA IF NOT EXISTS rop;

SET search_path TO rop, public;

CREATE SEQUENCE bom_code_seq MINVALUE 1 MAXVALUE 999999 NO CYCLE;

CREATE SEQUENCE component_code_seq MINVALUE 1 MAXVALUE 999999 NO CYCLE;

CREATE SEQUENCE card_code_seq MINVALUE 1 MAXVALUE 999999 NO CYCLE;

CREATE TABLE role (
  code varchar(16) PRIMARY KEY,
  name varchar(80) NOT NULL
);

COMMENT ON TABLE role IS 'Роль';

CREATE TABLE app_user (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  login varchar(80) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  display_name varchar(120) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE app_user IS 'Пользователь';

CREATE TABLE user_role (
  user_id bigint NOT NULL REFERENCES app_user(id),
  role_code varchar(16) NOT NULL REFERENCES role(code),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_code)
);

COMMENT ON TABLE user_role IS 'Назначение роли';

CREATE TABLE supplier (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(16) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  priority smallint NOT NULL CHECK (priority > 0),
  enabled boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE supplier IS 'Поставщик';

CREATE TABLE component (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(20) NOT NULL UNIQUE DEFAULT ('CMP-' || lpad(nextval('component_code_seq')::text, 6, '0')),
  kind varchar(12) NOT NULL CHECK (kind IN ('CASE','CPU','BOARD','RAM','GPU','SSD','PSU','COOLER')),
  model varchar(150) NOT NULL,
  mass_kg numeric(8,3) NOT NULL CHECK (mass_kg > 0),
  active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE component IS 'Компонент';

CREATE TABLE characteristic (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(32) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  value_kind varchar(8) NOT NULL CHECK (value_kind IN ('NUMBER','TEXT')),
  unit varchar(16)
);

COMMENT ON TABLE characteristic IS 'Характеристика';

CREATE TABLE component_value (
  component_id bigint NOT NULL REFERENCES component(id),
  characteristic_id bigint NOT NULL REFERENCES characteristic(id),
  number_value numeric(14,4),
  text_value varchar(150),
  PRIMARY KEY (component_id, characteristic_id),
  CHECK ((number_value IS NULL) <> (text_value IS NULL))
);

COMMENT ON TABLE component_value IS 'Значение характеристики';

CREATE TABLE component_group (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(32) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  kind varchar(12) NOT NULL,
  criteria jsonb NOT NULL CHECK (jsonb_typeof(criteria) = 'object')
);

COMMENT ON TABLE component_group IS 'Группа компонентов';

CREATE TABLE supplier_product (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id bigint NOT NULL REFERENCES supplier(id),
  external_sku varchar(80) NOT NULL,
  title varchar(180) NOT NULL,
  component_id bigint REFERENCES component(id),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (supplier_id, external_sku)
);

COMMENT ON TABLE supplier_product IS 'Товар поставщика';

CREATE TABLE supplier_offer (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES supplier_product(id),
  price numeric(14,2) NOT NULL CHECK (price > 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency = 'RUB'),
  available_qty integer NOT NULL CHECK (available_qty >= 0),
  observed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_hash varchar(64) NOT NULL,
  UNIQUE (product_id, observed_at, source_hash)
);

COMMENT ON TABLE supplier_offer IS 'Предложение поставщика';

CREATE TABLE bom (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(24) NOT NULL UNIQUE DEFAULT ('BOM-' || lpad(nextval('bom_code_seq')::text, 6, '0')),
  name varchar(150) NOT NULL,
  created_by bigint NOT NULL REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE bom IS 'BOM';

CREATE TABLE change_request (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bom_id bigint NOT NULL REFERENCES bom(id),
  created_by bigint NOT NULL REFERENCES app_user(id),
  kind varchar(12) NOT NULL CHECK (kind IN ('CREATE','UPDATE','REPLACE')),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE change_request IS 'Запрос на изменение';

CREATE TABLE bom_version (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bom_id bigint NOT NULL REFERENCES bom(id),
  version_no integer NOT NULL CHECK (version_no > 0),
  request_id bigint NOT NULL REFERENCES change_request(id),
  case_component_id bigint NOT NULL REFERENCES component(id),
  state varchar(12) NOT NULL CHECK (state IN ('DRAFT','CHECKED','ARCHIVED')),
  created_by bigint NOT NULL REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (bom_id, version_no)
);

COMMENT ON TABLE bom_version IS 'Версия BOM';

CREATE TABLE bom_slot (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id bigint NOT NULL REFERENCES bom_version(id),
  slot_code varchar(20) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  component_id bigint REFERENCES component(id),
  group_id bigint REFERENCES component_group(id),
  pinned_product_id bigint REFERENCES supplier_product(id),
  UNIQUE (version_id, slot_code),
  CHECK ((component_id IS NULL) <> (group_id IS NULL)),
  CHECK (pinned_product_id IS NULL OR component_id IS NOT NULL)
);

COMMENT ON TABLE bom_slot IS 'Слот BOM';

CREATE TABLE slot_selection (
  slot_id bigint PRIMARY KEY REFERENCES bom_slot(id),
  offer_id bigint NOT NULL REFERENCES supplier_offer(id),
  resolved_component_id bigint NOT NULL REFERENCES component(id),
  selected_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE slot_selection IS 'Разрешённый слот';

CREATE TABLE compatibility_rule (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(32) NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  name varchar(150) NOT NULL,
  expression jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (code, revision)
);

COMMENT ON TABLE compatibility_rule IS 'Правило совместимости';

CREATE TABLE validation_result (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id bigint NOT NULL REFERENCES bom_version(id),
  valid boolean NOT NULL,
  rules_snapshot jsonb NOT NULL,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE validation_result IS 'Результат проверки';

CREATE TABLE replacement_rule (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(32) NOT NULL UNIQUE,
  from_component_id bigint NOT NULL REFERENCES component(id),
  to_component_id bigint NOT NULL REFERENCES component(id),
  from_product_id bigint REFERENCES supplier_product(id),
  to_product_id bigint REFERENCES supplier_product(id),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  CHECK (from_component_id <> to_component_id OR from_product_id IS DISTINCT FROM to_product_id)
);

COMMENT ON TABLE replacement_rule IS 'Правило замены';

CREATE TABLE replacement_batch (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rule_id bigint NOT NULL REFERENCES replacement_rule(id),
  created_by bigint NOT NULL REFERENCES app_user(id),
  state varchar(12) NOT NULL CHECK (state IN ('PREVIEW','RUNNING','DONE','PARTIAL','CANCELLED')),
  rule_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE replacement_batch IS 'Пакет массовой замены';

CREATE TABLE replacement_item (
  batch_id bigint NOT NULL REFERENCES replacement_batch(id),
  bom_id bigint NOT NULL REFERENCES bom(id),
  old_version_id bigint NOT NULL REFERENCES bom_version(id),
  new_version_id bigint REFERENCES bom_version(id),
  result varchar(12) NOT NULL CHECK (result IN ('PENDING','APPLIED','CONFLICT','SKIPPED')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (batch_id, bom_id)
);

COMMENT ON TABLE replacement_item IS 'Результат замены BOM';

CREATE TABLE calculation_rule (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(24) NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  markup_rate numeric(6,4) NOT NULL CHECK (markup_rate >= 0),
  assembly_cost numeric(12,2) NOT NULL CHECK (assembly_cost >= 0),
  packaging_cost numeric(12,2) NOT NULL CHECK (packaging_cost >= 0),
  packaging_mass numeric(8,3) NOT NULL CHECK (packaging_mass >= 0),
  round_step numeric(8,2) NOT NULL CHECK (round_step > 0),
  offer_ttl_hours integer NOT NULL CHECK (offer_ttl_hours > 0),
  UNIQUE (code, revision)
);

COMMENT ON TABLE calculation_rule IS 'Правило цены и веса';

CREATE TABLE card (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bom_id bigint NOT NULL REFERENCES bom(id),
  offer_id varchar(64) NOT NULL UNIQUE DEFAULT ('UCOMS-' || lpad(nextval('card_code_seq')::text, 6, '0')),
  status varchar(20) NOT NULL CHECK (status IN ('DRAFT','REVIEW','READY','PUBLISHED','STALE','PUBLISH_ERROR')),
  responsible_id bigint NOT NULL REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE card IS 'Карточка товара';

CREATE TABLE card_version (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id bigint NOT NULL REFERENCES card(id),
  version_no integer NOT NULL CHECK (version_no > 0),
  bom_version_id bigint NOT NULL REFERENCES bom_version(id),
  validation_id bigint NOT NULL REFERENCES validation_result(id),
  calculation_rule_id bigint NOT NULL REFERENCES calculation_rule(id),
  title varchar(200) NOT NULL,
  description text NOT NULL,
  attributes jsonb NOT NULL,
  cost numeric(14,2) NOT NULL CHECK (cost > 0),
  price numeric(14,2) NOT NULL CHECK (price > 0),
  mass_kg numeric(8,3) NOT NULL CHECK (mass_kg > 0),
  calculation_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (card_id, version_no)
);

COMMENT ON TABLE card_version IS 'Версия карточки';

CREATE TABLE image_template (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(32) NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  storage_key varchar(255) NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  UNIQUE (code, revision)
);

COMMENT ON TABLE image_template IS 'Шаблон изображения';

CREATE TABLE image_asset (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id bigint REFERENCES image_template(id),
  storage_key varchar(255) NOT NULL UNIQUE,
  sha256 varchar(64) NOT NULL,
  width_px integer NOT NULL CHECK (width_px > 0),
  height_px integer NOT NULL CHECK (height_px > 0),
  created_by bigint NOT NULL REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE image_asset IS 'Изображение';

CREATE TABLE card_image (
  card_version_id bigint NOT NULL REFERENCES card_version(id),
  image_id bigint NOT NULL REFERENCES image_asset(id),
  position smallint NOT NULL CHECK (position > 0),
  PRIMARY KEY (card_version_id, image_id),
  UNIQUE (card_version_id, position)
);

COMMENT ON TABLE card_image IS 'Изображения версии карточки';

CREATE TABLE publication (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_version_id bigint NOT NULL REFERENCES card_version(id),
  operation_key varchar(64) NOT NULL UNIQUE,
  external_task_id varchar(100),
  external_product_id varchar(100),
  state varchar(16) NOT NULL CHECK (state IN ('QUEUED','SENDING','WAITING','RETRY','SUCCESS','FAILED','UNCERTAIN')),
  retry_count smallint NOT NULL DEFAULT 0 CHECK (retry_count BETWEEN 0 AND 3),
  next_attempt_at timestamptz,
  request_snapshot jsonb NOT NULL,
  response jsonb,
  error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz
);

COMMENT ON TABLE publication IS 'Публикация и очередь';

CREATE TABLE audit_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id bigint REFERENCES app_user(id),
  actor_kind varchar(12) NOT NULL CHECK (actor_kind IN ('USER','SERVICE')),
  resource_type varchar(40) NOT NULL,
  resource_key varchar(100) NOT NULL,
  action varchar(40) NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_event IS 'Событие аудита';

CREATE TABLE notification (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_id bigint NOT NULL REFERENCES app_user(id),
  card_id bigint REFERENCES card(id),
  kind varchar(32) NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at timestamptz
);

COMMENT ON TABLE notification IS 'Уведомление';

CREATE INDEX ix_offer_latest ON supplier_offer (product_id, observed_at DESC);

CREATE INDEX ix_product_component ON supplier_product (component_id);

CREATE INDEX ix_bom_case ON bom_version (case_component_id);

CREATE INDEX ix_slot_component ON bom_slot (component_id);

CREATE INDEX ix_slot_group ON bom_slot (group_id);

CREATE INDEX ix_slot_product ON bom_slot (pinned_product_id);

CREATE INDEX ix_card_status ON card (status, responsible_id);

CREATE INDEX ix_publication_due ON publication (state, next_attempt_at);

CREATE INDEX ix_audit_time ON audit_event (created_at);

CREATE INDEX ix_notification_user ON notification (recipient_id, read_at);

CREATE UNIQUE INDEX ux_publication_active_version ON publication(card_version_id) WHERE state NOT IN ('SUCCESS','FAILED');

INSERT INTO role(code,name) VALUES ('MANAGER','Менеджер маркетплейсов'),('ENGINEER','Технический специалист'),('STOCK','Сотрудник склада'),('DESIGNER','Дизайнер'),('ADMIN','Администратор');

COMMIT;

-- Проверки готовности, принадлежности версии и RBAC выполняются сервисом в транзакции.

-- DDL не устанавливает роли ОС/СУБД и не подменяет миграции рабочего приложения.
