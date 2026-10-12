/** Controlled migration of the supplied ROP data dictionary, not a general SQL importer. */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import { declaration } from "../src/notations/structured/document";
import type { SemanticElement } from "../src/notations/structured/model";
import { erdEngine } from "../src/notations/erd/document";
import { generateErdDdl } from "../src/notations/erd/ddl";
import { encodeProject } from "../src/persistence/project";

const input = resolve(process.argv[2] ?? "D:/GitHub/MIREA/4/РОП/Практики_1-8");
const output = resolve(
  process.argv[3] ?? join(input, "Модели_OmniNotation_v2"),
);
const dictionaryText = await readFile(
    join(input, "База_данных/model.json"),
    "utf8",
  ),
  sql = await readFile(join(input, "База_данных/schema.sql"), "utf8");
const columnSchema = z
  .object({
    name: z.string(),
    type: z.string(),
    rule: z.string(),
    meaning: z.string(),
    ref: z.string().nullable(),
  })
  .strict();
const dictionary = z
  .object({
    tables: z.array(
      z
        .object({
          name: z.string(),
          title: z.string(),
          columns: z.array(columnSchema),
          constraints: z.array(z.string()),
          group: z.number(),
        })
        .strict(),
    ),
    indexes: z.array(z.tuple([z.string(), z.string(), z.string()])),
  })
  .strict()
  .parse(JSON.parse(dictionaryText));
const elements: SemanticElement[] = [],
  recognized: { source: string; ids: string[] }[] = [],
  differences: string[] = [],
  unresolved: string[] = [];
const add = (
  kind: string,
  id: string,
  label: string,
  properties: Record<string, string> = {},
) => {
  const e = declaration(kind, id, label, properties);
  elements.push(e);
  return e;
};
const attributeId = (table: string, column: string) => `${table}.${column}`;
const counters = new Map<string, number>();
const next = (prefix: string) => {
  const n = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, n);
  return prefix + n;
};
const keys = new Map<string, string>();
const pendingForeign: {
  table: string;
  columns: string[];
  target: string;
  targets: string[];
  source: string;
}[] = [];

function splitOutside(text: string, separator: string): string[] {
  const result: string[] = [];
  let start = 0,
    depth = 0,
    quote = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote && text[i + 1] === quote) i++;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === "'" || c === '"') quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === separator && depth === 0) {
      result.push(text.slice(start, i).trim());
      start = i + 1;
    }
    if (depth < 0) throw new Error("Неверный баланс скобок в исходном SQL.");
  }
  if (quote || depth !== 0)
    throw new Error("Незакрытая строка/скобка в исходном SQL.");
  result.push(text.slice(start).trim());
  return result.filter(Boolean);
}
const normalize = (s: string) =>
  s
    .replace(/'(?:[^']|'')*'|\s+/g, (part) =>
      part.startsWith("'") ? part : " ",
    )
    .trim();
function parens(text: string) {
  let depth = 0,
    quote = false;
  if (!text.startsWith("(")) throw new Error("Ожидается скобка ограничения.");
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "'") {
      if (quote && text[i + 1] === "'") {
        i++;
        continue;
      }
      quote = !quote;
    }
    if (quote) continue;
    if (text[i] === "(") depth++;
    if (text[i] === ")" && --depth === 0)
      return { value: text.slice(1, i), rest: text.slice(i + 1).trim() };
  }
  throw new Error("Незакрытое выражение ограничения.");
}
function key(table: string, columns: string[], kind: string, source: string) {
  const id = next(`${table}.${kind === "primary" ? "pk" : "uq"}`);
  add("key", id, kind === "primary" ? "Первичный ключ" : "Уникальный ключ", {
    owner: table,
    kind,
    sqlName: `${table}_${kind === "primary" ? "pkey" : "uq_" + counters.get(`${table}.uq`)}`,
  });
  columns.forEach((c, order) => {
    add("keyPart", `${id}.part${order}`, "", {
      owner: id,
      attribute: attributeId(table, c),
      order: String(order),
    });
    if (kind === "primary")
      elements.find(
        (e) => e.id === attributeId(table, c),
      )!.properties.nullable = "false";
  });
  keys.set(`${table}\0${columns.join("\0")}`, id);
  recognized.push({ source, ids: [id] });
}
function check(table: string, expression: string, source: string) {
  const id = next(`${table}.check`);
  add("check", id, "Проверка строки", { owner: table, expression });
  recognized.push({ source, ids: [id] });
}
function columnRule(
  table: string,
  column: z.infer<typeof columnSchema>,
  element: SemanticElement,
) {
  let rule = column.rule.trim();
  while (rule) {
    if (rule.startsWith("NOT NULL")) {
      element.properties.nullable = "false";
      rule = rule.slice(8).trim();
    } else if (rule.startsWith("PRIMARY KEY")) {
      key(
        table,
        [column.name],
        "primary",
        `${table}.${column.name}: PRIMARY KEY`,
      );
      rule = rule.slice(11).trim();
    } else if (rule.startsWith("UNIQUE")) {
      key(table, [column.name], "unique", `${table}.${column.name}: UNIQUE`);
      rule = rule.slice(6).trim();
    } else if (rule.startsWith("GENERATED ALWAYS AS IDENTITY")) {
      element.properties.identity = "always";
      rule = rule.slice(28).trim();
    } else if (rule.startsWith("REFERENCES ")) {
      const match = /^REFERENCES (\w+)\(([^)]+)\)/.exec(rule);
      if (!match) throw new Error(`Неизвестный REFERENCES: ${rule}`);
      pendingForeign.push({
        table,
        columns: [column.name],
        target: match[1],
        targets: match[2].split(",").map((s) => s.trim()),
        source: `${table}.${column.name}: ${match[0]}`,
      });
      if (column.ref && column.ref !== match[1])
        unresolved.push(
          `${table}.${column.name}: ref=${column.ref}, REFERENCES=${match[1]}.`,
        );
      rule = rule.slice(match[0].length).trim();
    } else if (rule.startsWith("CHECK ")) {
      const result = parens(rule.slice(6).trim());
      check(
        table,
        result.value,
        `${table}.${column.name}: CHECK (${result.value})`,
      );
      rule = result.rest;
    } else if (rule.startsWith("DEFAULT ")) {
      const expr = rule.slice(8).trim();
      if (expr.startsWith("(")) {
        const result = parens(expr);
        element.properties.default = `(${result.value})`;
        rule = result.rest;
      } else {
        const match = /^('(?:[^']|'')*'(?:\:\:\w+)?|\S+)/.exec(expr);
        if (!match) throw new Error(`DEFAULT не распознан: ${expr}`);
        element.properties.default = match[1];
        rule = expr.slice(match[0].length).trim();
      }
    } else {
      unresolved.push(`${table}.${column.name}: остаток rule «${rule}».`);
      break;
    }
  }
}

// Compare complete table declarations, not the incomplete legacy ref hints.
const sqlTables = new Map(
  [...sql.matchAll(/CREATE TABLE (\w+) \(\r?\n([\s\S]*?)\r?\n\);/g)].map(
    (m) => [m[1], splitOutside(m[2], ",").map(normalize)],
  ),
);
for (const table of dictionary.tables) {
  const expected = [
    ...table.columns.map((c) => normalize(`${c.name} ${c.type} ${c.rule}`)),
    ...table.constraints.map(normalize),
  ];
  if (JSON.stringify(sqlTables.get(table.name)) !== JSON.stringify(expected))
    unresolved.push(`CREATE TABLE ${table.name} отличается от model.json.`);
  add("entity", table.name, table.title, {
    schema: "rop",
    sqlName: table.name,
  });
  table.columns.forEach((column, order) => {
    const match = /^(\w+)(?:\((\d+)(?:,(\d+))?\))?$/.exec(column.type);
    if (!match) throw new Error(`Тип вне известной схемы: ${column.type}`);
    const p: Record<string, string> = {
      owner: table.name,
      sqlName: column.name,
      sqlType: match[1],
      nullable: "true",
      order: String(order),
    };
    if (match[2]) p[match[1] === "numeric" ? "precision" : "length"] = match[2];
    if (match[3]) p.scale = match[3];
    add(
      "attribute",
      attributeId(table.name, column.name),
      column.meaning || column.name,
      p,
    );
  });
  for (const column of table.columns)
    columnRule(
      table.name,
      column,
      elements.find((e) => e.id === attributeId(table.name, column.name))!,
    );
  for (const constraint of table.constraints) {
    const k = /^(PRIMARY KEY|UNIQUE) \(([^)]+)\)$/.exec(constraint);
    if (k)
      key(
        table.name,
        k[2].split(",").map((s) => s.trim()),
        k[1] === "PRIMARY KEY" ? "primary" : "unique",
        `${table.name}: ${constraint}`,
      );
    else if (constraint.startsWith("CHECK ")) {
      const p = parens(constraint.slice(6));
      if (p.rest) unresolved.push(`${table.name}: ${p.rest}`);
      check(table.name, p.value, `${table.name}: ${constraint}`);
    } else unresolved.push(`${table.name}: ${constraint}`);
  }
}
if (sqlTables.size !== dictionary.tables.length)
  unresolved.push("Число CREATE TABLE отличается от словаря.");
for (const foreign of pendingForeign) {
  const targetKey = keys.get(
    `${foreign.target}\0${foreign.targets.join("\0")}`,
  );
  if (!targetKey) {
    unresolved.push(`Не найден PK/UQ: ${foreign.source}`);
    continue;
  }
  const id = next(`${foreign.table}.fk`),
    relation = `${id}.relation`;
  const columns = foreign.columns.map((c) =>
    elements.find((e) => e.id === attributeId(foreign.table, c))!,
  );
  const unique = keys.has(`${foreign.table}\0${foreign.columns.join("\0")}`);
  add("relation", relation, "", {
    from: foreign.target,
    to: foreign.table,
    fromMin: columns.every((a) => a.properties.nullable === "false")
      ? "1"
      : "0",
    fromMax: "1",
    toMin: "0",
    toMax: unique ? "1" : "many",
  });
  add("foreignKey", id, `${foreign.table} → ${foreign.target}`, {
    owner: foreign.table,
    targetKey,
    relation,
    onDelete: "noAction",
    onUpdate: "noAction",
    match: "simple",
  });
  foreign.columns.forEach((column, order) =>
    add("fkPart", `${id}.part${order}`, "", {
      owner: id,
      attribute: attributeId(foreign.table, column),
      target: attributeId(foreign.target, foreign.targets[order]),
      order: String(order),
    }),
  );
  recognized.push({ source: foreign.source, ids: [id, relation] });
}
const sqlIndexes = [
  ...sql.matchAll(
    /CREATE (UNIQUE )?INDEX (\w+) ON (\w+)\s*\(([^;]+?)\)(?: WHERE ([^;]+))?;/g,
  ),
];
for (const entry of dictionary.indexes)
  if (
    !sqlIndexes.some(
      (m) =>
        m[2] === entry[0] &&
        m[3] === entry[1] &&
        normalize(m[4]) === normalize(entry[2]) &&
        !m[1] &&
        !m[5],
    )
  )
    unresolved.push(`Индекс ${entry[0]} отличается от schema.sql.`);
for (const match of sqlIndexes) {
  add("index", match[2], match[2], {
    owner: match[3],
    sqlName: match[2],
    method: "btree",
    unique: match[1] ? "true" : "false",
    ...(match[5] ? { predicate: match[5] } : {}),
  });
  match[4].split(",").forEach((column, order) => {
    const c = /^(\w+)(?:\s+(ASC|DESC))?$/.exec(column.trim());
    if (!c) throw new Error(`Неподдержанная колонка индекса: ${column}`);
    add("indexPart", `${match[2]}.part${order}`, "", {
      owner: match[2],
      attribute: attributeId(match[3], c[1]),
      direction: c[2]?.toLowerCase() ?? "asc",
      order: String(order),
    });
  });
  recognized.push({ source: match[0], ids: [match[2]] });
  if (!dictionary.indexes.some((e) => e[0] === match[2]))
    differences.push(
      `${match[2]} отсутствует в model.json; перенесён из schema.sql как типизированный частичный UNIQUE-индекс.`,
    );
}
for (const match of sql.matchAll(
  /CREATE SEQUENCE (\w+) MINVALUE (\d+) MAXVALUE (\d+) NO CYCLE;/g,
)) {
  add("sequence", match[1], match[1], {
    schema: "rop",
    sqlName: match[1],
    minimum: match[2],
    maximum: match[3],
    start: match[2],
    increment: "1",
    cycle: "false",
  });
  for (const attribute of elements.filter(
    (e) =>
      e.kind === "attribute" &&
      e.properties.default?.includes(`nextval('${match[1]}')`),
  ))
    attribute.properties.defaultSequence = match[1];
  recognized.push({ source: match[0], ids: [match[1]] });
  differences.push(
    `${match[1]} отсутствует в model.json; перенесена последовательность из schema.sql.`,
  );
}
const statements = splitOutside(sql.replace(/^\s*--[^\r\n]*/gm, ""), ";");
for (const statement of statements)
  if (
    !/^(BEGIN|COMMIT|SET search_path|CREATE SCHEMA|CREATE TABLE|CREATE SEQUENCE|CREATE (?:UNIQUE )?INDEX|COMMENT ON TABLE|INSERT INTO role)/.test(
      statement,
    )
  )
    unresolved.push(`Не классифицирован SQL: ${statement}`);
differences.push(
  "INSERT INTO role — демонстрационные данные, не структура; исходный schema.sql сохранён, вставка не исполнялась и не включена в DDL модели.",
);
if (unresolved.length)
  throw new Error(
    "Перенос остановлен до записи модели:\n" + unresolved.join("\n"),
  );

const draftSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    practice: z.number(),
    requirement: z.string(),
    status: z.string(),
    note: z.string(),
    width: z.number(),
    height: z.number(),
    nodes: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          x: z.number(),
          y: z.number(),
          w: z.number(),
          h: z.number(),
          kind: z.string(),
          body: z.string().nullable(),
        })
        .strict(),
    ),
    edges: z.array(
      z
        .object({
          source: z.string(),
          target: z.string(),
          label: z.string(),
          points: z.array(z.tuple([z.number(), z.number()])),
          style: z.string(),
        })
        .strict(),
    ),
  })
  .strict();
const drafts = [];
for (const prefix of ["D03_logical", "D20_physical"])
  for (let i = 1; i <= 5; i++) {
    const draft = draftSchema.parse(
      JSON.parse(
        await readFile(
          join(input, "Черновики_схем", `${prefix}_${i}.draft.json`),
          "utf8",
        ),
      ),
    );
    drafts.push(draft);
    const type = prefix === "D03_logical" ? "logical" : "physical";
    add("diagram", draft.id, draft.title, { type });
    const shown = new Set(draft.nodes.map((n) => n.id));
    for (const node of draft.nodes) {
      if (!dictionary.tables.some((t) => t.name === node.id))
        throw new Error(`Неоднозначная фигура ${draft.id}/${node.id}.`);
      add("view", `${draft.id}.${node.id}`, "", {
        diagram: draft.id,
        element: node.id,
      });
    }
    for (const foreign of elements.filter((e) => e.kind === "foreignKey")) {
      const parent = elements.find(
        (e) => e.id === foreign.properties.targetKey,
      )!.properties.owner;
      if (!shown.has(parent) || !shown.has(foreign.properties.owner)) continue;
      add("view", `${draft.id}.${foreign.id}.view`, "", {
        diagram: draft.id,
        element: type === "logical" ? foreign.properties.relation : foreign.id,
        from: `${draft.id}.${type === "logical" ? parent : foreign.properties.owner}`,
        to: `${draft.id}.${type === "logical" ? foreign.properties.owner : parent}`,
      });
    }
  }
let document = erdEngine.create({
  id: "ropData",
  label: "Карточки компьютерных систем ООО Юкомс",
  elements,
});
const placements: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {};
for (const draft of drafts)
  for (const node of draft.nodes) {
    const count = elements.filter(
      (e) => e.kind === "attribute" && e.properties.owner === node.id,
    ).length;
    placements[`${draft.id}.${node.id}`] = {
      x: node.x * 2,
      y: node.y * 1.8,
      width: 680,
      height: 110 + count * 34,
    };
  }
document = erdEngine.move(document, placements);
const encoded = await encodeProject(document),
  ddl = generateErdDdl(document);
await mkdir(output, { recursive: true });
async function availablePath(name: string) {
  let candidate = join(output, name),
    i = 1;
  while (true) {
    try {
      await access(candidate);
      candidate = join(output, name.replace(/(\.[^.]+)$/, `_${i++}$1`));
    } catch {
      return candidate;
    }
  }
}
const target = await availablePath("РОП_ERD.omni"),
  sqlTarget = await availablePath("РОП_ERD.sql"),
  reportTarget = await availablePath("РОП_ERD_перенос.json");
await writeFile(target, encoded, { encoding: "utf8", flag: "wx" });
await writeFile(sqlTarget, ddl.sql, { encoding: "utf8", flag: "wx" });
const report = {
  source: input,
  hashes: {
    model: createHash("sha256").update(dictionaryText).digest("hex"),
    sql: createHash("sha256").update(sql).digest("hex"),
  },
  target,
  ddl: sqlTarget,
  counts: Object.fromEntries(
    [...new Set(elements.map((e) => e.kind))].map((kind) => [
      kind,
      elements.filter((e) => e.kind === kind).length,
    ]),
  ),
  differences,
  unresolved,
  recognized,
  diagrams: drafts.map((d, i) => ({
    figure: i < 5 ? 13 + i : 30 + i - 5,
    source: `${d.id}.draft.json`,
    file: target,
    diagramId: d.id,
    elements: elements.filter(
      (e) => e.kind === "view" && e.properties.diagram === d.id,
    ).length,
    manualReview: "не выполнена",
    export: null,
  })),
  manualReview: "не выполнена",
  warnings: ddl.warnings,
};
await writeFile(reportTarget, JSON.stringify(report, null, 2), {
  encoding: "utf8",
  flag: "wx",
});
await writeFile("examples/rop-erd.omni", encoded, "utf8");
execFileSync(process.execPath, ["scripts/generate-project-map.mjs"], {
  stdio: "inherit",
});
console.log(
  JSON.stringify(
    { target, sqlTarget, reportTarget, counts: report.counts, differences },
    null,
    2,
  ),
);
