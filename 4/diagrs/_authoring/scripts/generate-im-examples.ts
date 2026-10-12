/** Author editable IM examples from the read-only DOCX extraction. No behavior tests. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  createFunctionTreeDocument,
  functionTreeEngine,
  treeNumbers,
} from "../src/notations/function-tree/document";
import { arrangeTree } from "../src/notations/function-tree/layout";
import { declaration } from "../src/notations/structured/document";
import { encodeProject } from "../src/persistence/project";
import type { SemanticModel } from "../src/notations/structured/model";
import type { TreeProfile } from "../src/notations/function-tree/profile";
import {
  createGanttDocument,
  ganttEngine,
  type GanttDocument,
} from "../src/notations/gantt/document";

const extraction = process.argv[2];
if (!extraction)
  throw new Error(
    "Укажите JSON извлечённых блоков исходного отчёта; исходный DOCX не изменяется.",
  );
const blocks = JSON.parse(await readFile(extraction, "utf8")) as {
  text?: string;
  table?: string[][];
}[];
function table(caption: string) {
  const i = blocks.findIndex((b) => b.text?.startsWith(`Таблица ${caption} –`));
  const rows = blocks[i + 1]?.table;
  if (i < 0 || !rows)
    throw new Error(`В исходном отчёте не найдена таблица ${caption}.`);
  return rows.slice(1);
}
const map = () =>
  execFileSync(process.execPath, ["scripts/generate-project-map.mjs"], {
    stdio: "inherit",
  });
async function save(profile: TreeProfile, model: SemanticModel) {
  for (const node of model.elements.filter((e) => e.kind === "node"))
    if (
      !model.elements.some(
        (v) => v.kind === "view" && v.properties.element === node.id,
      )
    )
      model.elements.push(
        declaration("view", `v_${node.id}`, "", {
          diagram: "main",
          element: node.id,
        }),
      );
  const d = functionTreeEngine.create(model);
  d.layout.diagrams.main.direction = "right";
  // Size cards for all stored lines; no report figure captions are added to the model.
  for (const v of model.elements.filter((e) => e.kind === "view")) {
    const e = model.elements.find((e) => e.id === v.properties.element)!;
    const text = [
      e.label,
      e.properties.text,
      e.properties.acceptance,
      e.properties.deliverable,
      e.properties.function,
    ]
      .filter(Boolean)
      .join("\n");
    const r = d.layout.nodes[v.id];
    if (r) {
      r.width = e.properties.kind === "requirement" ? 500 : 360;
      r.height = Math.max(
        150,
        75 + Math.ceil(text.length / (r.width / 8)) * 22,
      );
    }
  }
  const result = functionTreeEngine.decode({
    ...d,
    layout: arrangeTree(model, d.layout, "main"),
  });
  await mkdir("examples/im", { recursive: true });
  await writeFile(
    `examples/im/im-${profile}.omni`,
    await encodeProject(result),
  );
  map();
  console.log(`Создан examples/im/im-${profile}.omni`);
}

const wbs = createFunctionTreeDocument("wbs").model;
wbs.id = "im_wbs";
wbs.label = "Проект ИС подготовки и актуализации карточек";
wbs.elements.find((e) => e.id === "root")!.label =
  "ИС подготовки и актуализации карточек";
for (const [i, label] of [
  "Обследование и требования",
  "Проектирование",
  "Разработка",
  "Испытания и внедрение",
].entries())
  wbs.elements.push(
    declaration("node", `stage${i + 1}`, label, {
      kind: "summary",
      parent: "root",
      order: String(i),
    }),
  );
for (const row of [...table("3.4"), ...table("3.5")]) {
  const [code, label, ownerRole, period, effortHours, deliverable] = row;
  wbs.elements.push(
    declaration("node", `wp${code.replace(".", "_")}`, label, {
      kind: "workPackage",
      parent: `stage${code.split(".")[0]}`,
      order: String(Number(code.split(".")[1]) - 1),
      externalCode: code,
      ownerRole,
      effortHours,
      deliverable,
      acceptance: deliverable,
      description: `Источник: отчёт ИМ, таблицы 3.4–3.5. Плановый период ${period}; иерархия не задаёт зависимости. Критерий завершения перенесён из колонки проверяемого результата.`,
    }),
  );
}
await save("wbs", wbs);

const furps = createFunctionTreeDocument("furps").model;
furps.id = "im_furps";
furps.label = "Требования к ИС подготовки карточек";
for (const row of [...table("6.1"), ...table("6.2")]) {
  const [code, text, acceptance] = row;
  furps.elements.push(
    declaration("node", `req${code.replace("-", "_")}`, text, {
      kind: "requirement",
      parent: `category${code[0]}`,
      order: String(Number(code.slice(2)) - 1),
      code,
      text,
      acceptance,
      priority: "must",
      status: "draft",
      source: `Отчёт ИМ, таблица ${code.startsWith("F") ? "6.1" : "6.2"}, ${code}`,
      description:
        "Must — исходный приоритет учебного примера; согласование и подтверждение ещё не выполнялись.",
    }),
  );
}
await save("furps", furps);

const org = createFunctionTreeDocument("org").model;
org.id = "im_org";
org.label = "Организационная структура ООО «Юкомс»";
org.elements.find((e) => e.id === "root")!.label = "ООО «Юкомс»";
// The original practice-1 figure (PDF p.7) supplies reporting roles. The table adds responsibilities.
const orgRows: [string, string, string, string, string?][] = [
  ["director", "Генеральный директор", "role", "root"],
  ["commerce", "Отдел электронной коммерции", "department", "root"],
  ["marketManager", "Менеджер маркетплейсов", "role", "commerce"],
  ["designer", "Дизайнер", "role", "marketManager"],
  [
    "production",
    "Производственный участок",
    "department",
    "root",
    "productionLead",
  ],
  [
    "productionLead",
    "Руководитель производственного участка",
    "role",
    "production",
  ],
  ["platformAssembler", "Сборщик платформ", "role", "productionLead"],
  ["pcAssembler", "Сборщик ПК", "role", "platformAssembler"],
  [
    "warehouse",
    "Складской отдел",
    "department",
    "production",
    "productionLead",
  ],
  [
    "support",
    "Отдел клиентской поддержки и сервисного обслуживания",
    "department",
    "root",
  ],
  ["supportSpecialist", "Специалист поддержки", "role", "support"],
  [
    "it",
    "Отдел ИТ-поддержки и технического сопровождения",
    "department",
    "root",
  ],
  ["leadDeveloper", "Ведущий разработчик", "role", "it"],
  ["developer", "Разработчик", "role", "leadDeveloper"],
  ["logistics", "Отдел логистики", "department", "root"],
  ["driver", "Водитель", "role", "logistics"],
];
for (const [i, [id, label, kind, parent, manager]] of orgRows.entries()) {
  const row = table("1.5").find((row) =>
    row[0].split(/[\/,]/).some(name => name.trim().toLowerCase() === label.toLowerCase()),
  );
  org.elements.push(
    declaration("node", id, label, {
      kind,
      parent,
      order: String(i),
      ...(manager ? { manager } : {}),
      ...(row ? { function: row[1] } : {}),
      description:
        id === "warehouse"
          ? "Исходный рисунок: склад под руководителем производственного участка. В редакторском профиле склад вложен в производственный участок, а руководитель указан отдельной ссылкой manager; роль не содержит подразделение."
          : "Источник: организационная структура практики 1, рисунок 1 (стр. 7 PDF), таблица 1.5 общего отчёта. Только должности и подразделения; фактические сотрудники и штатная численность не указаны.",
    }),
  );
}
await save("org", org);

async function savePlan(name: string, model: SemanticModel) {
  let d = ganttEngine.create(model);
  for (const e of model.elements.filter((e) => e.kind === "task"))
    d = ganttEngine.show(d, e.id, "main").document;
  for (const e of model.elements.filter((e) => e.kind === "dependency"))
    d = ganttEngine.show(d, e.id, "main").document;
  const layout = structuredClone(d.layout);
  layout.diagrams.main.gantt = {
    scale: "weeks",
    tableWidth: 1000,
    today: false,
  };
  d = ganttEngine.decode({ ...d, layout });
  await writeFile(`examples/im/${name}.omni`, await encodeProject(d));
  map();
  console.log(`Создан examples/im/${name}.omni`);
}
const scheduleModel = createGanttDocument().model;
scheduleModel.id = "im_plan";
scheduleModel.label = "План реализации ИС · Н1–Н12";
const projectPlan = scheduleModel.elements.find((e) => e.kind === "plan")!;
projectPlan.properties.sourceDocumentId = "im_wbs";
projectPlan.properties.description =
  "Отчёт ИМ: таблицы 11.1–11.3 и 3.7. Н1–Н12 — первичный ориентир. 28.09.2026 — только демонстрационный старт пятидневного календаря без автоматически добавленных праздников. Не фактическая дата проекта. Часы распределены равномерно; роль разработчика ограничена 32 ч/нед. (6.4 ч/день).";
for (const e of wbs.elements.filter((e) => e.kind === "node")) {
  const leaf = e.properties.kind === "workPackage";
  const row = leaf
    ? table("11.1").find((row) => row[0] === e.properties.externalCode)!
    : undefined;
  const details = leaf
    ? table("11.2").find((row) => row[0] === e.properties.externalCode)!
    : undefined;
  scheduleModel.elements.push(
    declaration("task", e.id, e.label, {
      kind: leaf ? "task" : "summary",
      order: e.properties.order,
      ...(e.properties.parent ? { parent: e.properties.parent } : {}),
      sourceDocumentId: wbs.id,
      sourceNodeId: e.id,
      wbsCode: treeNumbers(wbs, "root").get(e.id) ?? e.properties.externalCode ?? "",
      ...(row
        ? {
            duration: row[3],
            effortHours: e.properties.effortHours,
            wbsCode: row[0],
            deliverable: details![2],
            description: `Недельный ориентир: ${row[2]}. ${details![1]} ${row[6]}.`,
          }
        : {}),
    }),
  );
}
const roleIds = ["analyst", "lead", "developer", "qa", "experts", "admin"];
for (const [i, row] of table("11.3")
  .filter((row) => row[0] !== "Всего")
  .entries())
  scheduleModel.elements.push(
    declaration("resource", roleIds[i], row[0], {
      capacityHoursPerDay: i === 2 ? "6.4" : "8",
      role: row[3],
      description: "Учебная доступность; не фактический табель.",
    }),
  );
for (const row of table("3.7").filter((row) => row[0] !== "Итого"))
  for (let i = 0; i < 6; i++)
    if (Number(row[i + 1]) > 0)
      scheduleModel.elements.push(
        declaration(
          "assignment",
          `assign${row[0].replace(".", "_")}_${roleIds[i]}`,
          "",
          {
            task: `wp${row[0].replace(".", "_")}`,
            resource: roleIds[i],
            effortHours: row[i + 1],
          },
        ),
      );
const links: [string, string, string, number][] = [
  ["1.1", "1.2", "FS", 0],
  ["1.2", "2.1", "FS", 0],
  ["1.2", "2.2", "FS", 0],
  ["2.1", "3.1", "FS", 0],
  ["2.2", "3.1", "SS", 5],
  ["3.1", "3.2", "SS", 10],
  ["3.2", "3.3", "SS", 5],
  ["3.1", "4.1", "FS", 0],
  ["3.2", "4.1", "FS", 0],
  ["3.3", "4.1", "FS", 0],
  ["4.1", "4.2", "FS", 0],
  ["4.2", "4.3", "FS", 0],
];
for (const [i, [from, to, type, lag]] of links.entries())
  scheduleModel.elements.push(
    declaration("dependency", `dependency${i + 1}`, "", {
      from: `wp${from.replace(".", "_")}`,
      to: `wp${to.replace(".", "_")}`,
      type,
      lag: String(lag),
    }),
  );
await savePlan("im-plan", scheduleModel);

const edgeCases = createGanttDocument().model;
edgeCases.id = "gantt_dependencies";
edgeCases.label = "Четыре типа зависимостей и отрицательный лаг";
edgeCases.elements.push(
  declaration("task", "a", "A · пять дней", {
    duration: "5",
    effortHours: "40",
    order: "0",
  }),
);
for (const [i, [id, type, lag]] of (
  [
    ["fs", "FS", 2],
    ["ss", "SS", 2],
    ["ff", "FF", 1],
    ["sf", "SF", 4],
    ["lead", "FS", -2],
  ] as const
).entries()) {
  edgeCases.elements.push(
    declaration("task", id, `${type} ${lag >= 0 ? "+" : ""}${lag}`, {
      duration: "3",
      effortHours: "8",
      order: String(i + 1),
    }),
  );
  edgeCases.elements.push(
    declaration("dependency", `link_${id}`, "", {
      from: "a",
      to: id,
      type,
      lag: String(lag),
    }),
  );
}
await savePlan("gantt-dependency-types", edgeCases);
const calendarExample: GanttDocument["model"] = createGanttDocument().model;
calendarExample.id = "gantt_calendar";
calendarExample.label = "Граница вехи и исключение календаря";
for (const [i, [id, label, duration]] of (
  [
    ["analysis", "Обследование", "5"],
    ["requirements", "Требования", "5"],
    ["build", "Разработка", "10"],
    ["accepted", "Приёмка", "0"],
  ] as const
).entries())
  calendarExample.elements.push(
    declaration("task", id, label, {
      kind: id === "accepted" ? "milestone" : "task",
      duration,
      order: String(i),
      effortHours: id === "accepted" ? "0" : "40",
    }),
  );
for (const [i, [from, to]] of [
  ["analysis", "requirements"],
  ["requirements", "build"],
  ["build", "accepted"],
].entries())
  calendarExample.elements.push(
    declaration("dependency", `link${i}`, "", {
      from,
      to,
      type: "FS",
      lag: "0",
    }),
  );
await savePlan("gantt-calendar-milestone", calendarExample);
const reserves = createGanttDocument().model;
reserves.id = "gantt_reserves";
reserves.label = "Резервы A / B / C";
for (const [i, [id, duration]] of [
  ["a", "5"],
  ["b", "3"],
  ["c", "2"],
].entries())
  reserves.elements.push(
    declaration("task", id, id.toUpperCase(), {
      duration,
      order: String(i),
      effortHours: "8",
    }),
  );
reserves.elements.push(
  declaration("dependency", "ab", "", { from: "a", to: "b", type: "FS" }),
  declaration("dependency", "ac", "", { from: "a", to: "c", type: "FS" }),
);
await savePlan("gantt-reserves", reserves);
