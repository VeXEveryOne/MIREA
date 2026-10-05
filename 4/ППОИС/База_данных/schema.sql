-- PostgreSQL 18; run only in a dedicated coursework database.
-- DDL01: isolated namespace, no destructive reset.
CREATE SCHEMA ppois;
COMMENT ON SCHEMA ppois IS 'Учебная ИС подготовки карточек ООО Юкомс';

-- DDL02: catalog entities.
CREATE TABLE ppois.component_group (
    id uuid PRIMARY KEY,
    code varchar(20) NOT NULL UNIQUE,
    name varchar(120) NOT NULL,
    role_code varchar(12) NOT NULL CHECK (role_code IN ('CPU','BOARD','RAM','SSD','CASE','PSU','COOLER'))
);
CREATE TABLE ppois.component (
    id uuid PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES ppois.component_group(id),
    sku varchar(60) NOT NULL UNIQUE,
    name varchar(160) NOT NULL,
    mass_kg numeric(9,3) NOT NULL CHECK (mass_kg > 0),
    socket varchar(30),
    memory_type varchar(20),
    power_w integer CHECK (power_w > 0)
);
CREATE TABLE ppois.supplier (
    id uuid PRIMARY KEY,
    code varchar(20) NOT NULL UNIQUE,
    name varchar(120) NOT NULL
);
CREATE TABLE ppois.offer (
    id uuid PRIMARY KEY,
    component_id uuid NOT NULL REFERENCES ppois.component(id),
    supplier_id uuid NOT NULL REFERENCES ppois.supplier(id),
    unit_price_rub numeric(12,2) NOT NULL CHECK (unit_price_rub > 0),
    stock integer NOT NULL CHECK (stock >= 0),
    observed_at timestamptz NOT NULL
);

-- DDL03: configuration and identifying weak entities.
CREATE TABLE ppois.configuration (
    id uuid PRIMARY KEY,
    code varchar(30) NOT NULL UNIQUE,
    name varchar(160) NOT NULL
);
CREATE TABLE ppois.bom_version (
    configuration_id uuid NOT NULL REFERENCES ppois.configuration(id),
    version_no integer NOT NULL CHECK (version_no > 0),
    state varchar(12) NOT NULL CHECK (state IN ('DRAFT','CHECKED','FROZEN')),
    created_at timestamptz NOT NULL,
    PRIMARY KEY (configuration_id, version_no)
);
CREATE TABLE ppois.bom_slot (
    configuration_id uuid NOT NULL,
    version_no integer NOT NULL,
    line_no integer NOT NULL CHECK (line_no > 0),
    group_id uuid REFERENCES ppois.component_group(id),
    requested_component_id uuid REFERENCES ppois.component(id),
    offer_id uuid REFERENCES ppois.offer(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (configuration_id, version_no, line_no),
    FOREIGN KEY (configuration_id, version_no) REFERENCES ppois.bom_version(configuration_id, version_no),
    CHECK ((group_id IS NOT NULL AND requested_component_id IS NULL)
        OR (requested_component_id IS NOT NULL AND group_id IS NULL))
);

-- DDL04: cards, immutable revision snapshots, images and publication attempts.
CREATE TABLE ppois.card (
    id uuid PRIMARY KEY,
    seller_code varchar(60) NOT NULL UNIQUE,
    name varchar(160) NOT NULL
);
CREATE TABLE ppois.card_revision (
    card_id uuid NOT NULL REFERENCES ppois.card(id),
    revision_no integer NOT NULL CHECK (revision_no > 0),
    configuration_id uuid NOT NULL,
    version_no integer NOT NULL,
    state varchar(12) NOT NULL CHECK (state IN ('DRAFT','READY','STALE')),
    title varchar(200) NOT NULL,
    description text NOT NULL,
    assembly_rub numeric(10,2) NOT NULL CHECK (assembly_rub >= 0),
    packaging_rub numeric(10,2) NOT NULL CHECK (packaging_rub >= 0),
    logistics_rub numeric(10,2) NOT NULL CHECK (logistics_rub >= 0),
    markup_rate numeric(6,4) NOT NULL CHECK (markup_rate >= 0 AND markup_rate <= 1),
    commission_rate numeric(6,4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate < 1),
    round_step_rub numeric(8,2) NOT NULL CHECK (round_step_rub > 0),
    packaging_mass_kg numeric(9,3) NOT NULL CHECK (packaging_mass_kg >= 0),
    calculated_at timestamptz NOT NULL,
    PRIMARY KEY (card_id, revision_no),
    FOREIGN KEY (configuration_id, version_no) REFERENCES ppois.bom_version(configuration_id, version_no)
);
CREATE TABLE ppois.image (
    id uuid PRIMARY KEY,
    uri varchar(250) NOT NULL,
    sha256 char(64) NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    width_px integer NOT NULL CHECK (width_px > 0),
    height_px integer NOT NULL CHECK (height_px > 0)
);
CREATE TABLE ppois.revision_image (
    card_id uuid NOT NULL,
    revision_no integer NOT NULL,
    image_id uuid NOT NULL REFERENCES ppois.image(id),
    ordinal integer NOT NULL CHECK (ordinal > 0),
    PRIMARY KEY (card_id, revision_no, image_id),
    UNIQUE (card_id, revision_no, ordinal),
    FOREIGN KEY (card_id, revision_no) REFERENCES ppois.card_revision(card_id, revision_no)
);
CREATE TABLE ppois.publication_attempt (
    card_id uuid NOT NULL,
    revision_no integer NOT NULL,
    attempt_no integer NOT NULL CHECK (attempt_no > 0),
    state varchar(12) NOT NULL CHECK (state IN ('NEW','ACCEPTED','PUBLISHED','REJECTED','TEMP_ERROR','UNKNOWN')),
    external_task_id varchar(80),
    error_code varchar(60),
    confirmed_not_accepted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL,
    next_check_at timestamptz,
    PRIMARY KEY (card_id, revision_no, attempt_no),
    FOREIGN KEY (card_id, revision_no) REFERENCES ppois.card_revision(card_id, revision_no),
    CHECK (state NOT IN ('ACCEPTED','PUBLISHED') OR external_task_id IS NOT NULL),
    CHECK (state NOT IN ('REJECTED','TEMP_ERROR') OR error_code IS NOT NULL),
    CHECK (NOT confirmed_not_accepted OR state = 'TEMP_ERROR')
);

-- DDL05: operational indexes; all PK/UNIQUE indexes already exist.
CREATE INDEX offer_freshness_idx ON ppois.offer(component_id, observed_at DESC, unit_price_rub);
CREATE INDEX revision_bom_idx ON ppois.card_revision(configuration_id, version_no);
CREATE INDEX attempt_reconcile_idx ON ppois.publication_attempt(state, next_check_at)
    WHERE state IN ('ACCEPTED','UNKNOWN','TEMP_ERROR');

-- DDL06: read model does not collapse task acceptance into publication.
CREATE VIEW ppois.card_status AS
SELECT c.seller_code, r.card_id, r.revision_no, r.state AS revision_state,
       calc.component_cost_rub + r.assembly_rub + r.packaging_rub AS cost_rub,
       ceil(((calc.component_cost_rub + r.assembly_rub + r.packaging_rub) * (1+r.markup_rate)
           + r.logistics_rub) / (1-r.commission_rate) / r.round_step_rub) * r.round_step_rub AS price_rub,
       calc.component_mass_kg + r.packaging_mass_kg AS mass_kg,
       p.attempt_no, p.state AS publication_state,
       p.external_task_id, p.error_code
FROM ppois.card c JOIN ppois.card_revision r ON r.card_id = c.id
LEFT JOIN LATERAL (
    SELECT SUM(s.quantity * o.unit_price_rub) AS component_cost_rub,
           SUM(s.quantity * cmp.mass_kg) AS component_mass_kg
    FROM ppois.bom_slot s JOIN ppois.offer o ON o.id=s.offer_id
    JOIN ppois.component cmp ON cmp.id=o.component_id
    WHERE (s.configuration_id,s.version_no)=(r.configuration_id,r.version_no)
) calc ON true
LEFT JOIN LATERAL (
    SELECT * FROM ppois.publication_attempt a
    WHERE a.card_id = r.card_id AND a.revision_no = r.revision_no
    ORDER BY a.attempt_no DESC LIMIT 1
) p ON true;

-- DDL07: immutable economic snapshots; state may become STALE, content may not change.
CREATE FUNCTION ppois.guard_revision_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (to_jsonb(OLD) - 'state') IS DISTINCT FROM (to_jsonb(NEW) - 'state') THEN
        RAISE EXCEPTION 'REVISION_IMMUTABLE: create a new revision' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER revision_snapshot_guard BEFORE UPDATE ON ppois.card_revision
FOR EACH ROW EXECUTE FUNCTION ppois.guard_revision_snapshot();

-- DDL08: the BOM referenced by a revision is frozen; group resolution must match.
CREATE FUNCTION ppois.guard_bom_slot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c uuid; v integer; actual_group uuid; actual_component uuid;
BEGIN
    IF TG_OP = 'UPDATE' AND EXISTS (
        SELECT 1 FROM ppois.card_revision
        WHERE configuration_id = OLD.configuration_id AND version_no = OLD.version_no
    ) THEN
        RAISE EXCEPTION 'BOM_FROZEN: cannot move a referenced slot' USING ERRCODE = '23514';
    END IF;
    c := COALESCE(NEW.configuration_id, OLD.configuration_id);
    v := COALESCE(NEW.version_no, OLD.version_no);
    IF EXISTS (SELECT 1 FROM ppois.card_revision WHERE configuration_id = c AND version_no = v) THEN
        RAISE EXCEPTION 'BOM_FROZEN: create a new version' USING ERRCODE = '23514';
    END IF;
    IF TG_OP <> 'DELETE' AND NEW.offer_id IS NOT NULL THEN
        SELECT cmp.group_id, cmp.id INTO actual_group,actual_component
        FROM ppois.offer o JOIN ppois.component cmp ON cmp.id=o.component_id WHERE o.id=NEW.offer_id;
        IF NOT FOUND THEN RETURN NEW; END IF; -- let the FK report the missing offer
        IF NEW.group_id IS NOT NULL AND actual_group IS DISTINCT FROM NEW.group_id THEN
            RAISE EXCEPTION 'GROUP_MISMATCH' USING ERRCODE = '23514';
        END IF;
        IF NEW.requested_component_id IS NOT NULL AND actual_component IS DISTINCT FROM NEW.requested_component_id THEN
            RAISE EXCEPTION 'EXACT_COMPONENT_MISMATCH' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER bom_slot_guard BEFORE INSERT OR UPDATE OR DELETE ON ppois.bom_slot
FOR EACH ROW EXECUTE FUNCTION ppois.guard_bom_slot();

-- DDL09: observations and component masses referenced by snapshots cannot change.
CREATE FUNCTION ppois.guard_used_catalog() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME='offer' AND EXISTS (
        SELECT 1 FROM ppois.bom_slot s JOIN ppois.card_revision r
        ON (r.configuration_id,r.version_no)=(s.configuration_id,s.version_no) WHERE s.offer_id=OLD.id
    ) THEN
        RAISE EXCEPTION 'OFFER_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514';
    ELSIF TG_TABLE_NAME='component' AND EXISTS (
        SELECT 1 FROM ppois.bom_slot s JOIN ppois.offer o ON o.id=s.offer_id JOIN ppois.card_revision r
        ON (r.configuration_id,r.version_no)=(s.configuration_id,s.version_no) WHERE o.component_id=OLD.id
    ) THEN
        RAISE EXCEPTION 'COMPONENT_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER used_offer_guard BEFORE UPDATE ON ppois.offer
FOR EACH ROW EXECUTE FUNCTION ppois.guard_used_catalog();
CREATE TRIGGER used_component_guard BEFORE UPDATE ON ppois.component
FOR EACH ROW EXECUTE FUNCTION ppois.guard_used_catalog();

COMMENT ON TABLE ppois.bom_slot IS 'Слабая сущность: номер строки уникален внутри версии BOM';
COMMENT ON TABLE ppois.card_revision IS 'Слабая сущность: неизменяемый снимок с локальным номером ревизии';
COMMENT ON TABLE ppois.publication_attempt IS 'Слабая сущность: попытка конкретной ревизии; внутренние статусы';
