-- OmniNotation · PostgreSQL 18 · только генерация, без исполнения
-- ERD_MULTIPLICITY_REVIEW · contains: Логическая обязательность требует сопоставления с FK/NULL/UQ; наличие детей у каждого родителя одним FK не обеспечивается.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "public"."bom_slot" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "bom_id" bigint NOT NULL,
  "revision" integer NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  CONSTRAINT "bom_slot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "positive" CHECK (quantity > 0)
);

CREATE TABLE "public"."bom_version" (
  "bom_id" bigint NOT NULL,
  "revision" integer NOT NULL,
  CONSTRAINT "bom_version_pkey" PRIMARY KEY ("bom_id", "revision")
);

ALTER TABLE "public"."bom_slot" ADD CONSTRAINT "slotVersion"
  FOREIGN KEY ("bom_id", "revision")
  REFERENCES "public"."bom_version" ("bom_id", "revision")
  MATCH FULL ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE INDEX "slot_version_idx" ON "public"."bom_slot" USING btree ("bom_id" ASC, "revision" DESC);
