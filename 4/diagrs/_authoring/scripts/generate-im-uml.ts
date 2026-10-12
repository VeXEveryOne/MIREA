/** Author the IM UML model from report tables; this is not a behavior test. */
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { decodeUml, layoutUml, textModel } from "../src/notations/uml/document";
import {
  relationEnds,
  type UmlModel,
  type UmlRect,
} from "../src/notations/uml/model";
import { generateUnified } from "../src/language/unified";
import { encodeProject } from "../src/persistence/project";

const blocks = JSON.parse(
  await readFile(process.argv[2] ?? ".tools/im/report-content.json", "utf8"),
) as { text?: string; table?: string[][] }[];
const table = (n: string) => {
  const i = blocks.findIndex((b) => b.text?.startsWith(`Таблица ${n} –`));
  if (!blocks[i + 1]?.table) throw new Error(`Нет таблицы ${n}`);
  return blocks[i + 1].table!.slice(1);
};
const model: UmlModel = {
  id: "im_architecture",
  label: "ИС подготовки карточек · деятельность и архитектура",
  elements: [],
};
const rects: Record<string, UmlRect> = {};
function add(
  kind: string,
  id: string,
  label: string,
  properties: Record<string, string> = {},
) {
  const e = { kind, id, label, properties };
  model.elements.push(e);
  return e;
}
function view(
  sheet: string,
  element: string,
  rect: [number, number, number, number],
  parent?: string,
  suffix = "",
) {
  const id = `v_${sheet}_${element}${suffix}`;
  add("view", id, "", {
    diagram: sheet,
    element,
    ...(parent ? { parent } : {}),
  });
  const [x, y, width, height] = rect;
  rects[id] = { x, y, width, height };
  return id;
}
function edgeViews(sheet: string, ids: string[]) {
  for (const id of ids) {
    const e = model.elements.find((e) => e.id === id)!,
      ends = relationEnds(model, e);
    const vs = ends.map((end) =>
      model.elements.find(
        (v) =>
          v.kind === "view" &&
          v.properties.diagram === sheet &&
          v.properties.element === end,
      ),
    );
    if (vs.length !== 2 || vs.some((v) => !v))
      throw new Error(`Не показаны концы ${id}`);
    add("view", `v_${sheet}_${id}`, "", {
      diagram: sheet,
      element: id,
      from: vs[0]!.id,
      to: vs[1]!.id,
    });
  }
}
add("activity", "publish", "Подготовить и передать карточку", {
  precondition:
    "Менеджер выбрал карточку и имеет право отправки; используется согласованная версия.",
  postcondition:
    "Попытка сохранена до внешнего вызова; зафиксирован результат либо ожидание. Исправление завершает текущий сценарий.",
  description:
    "Источник: отчёт ИМ, таблицы 9.1–9.3. Учебная модель; guard не исполняется.",
});
add("diagram", "activity", "ИМ · Проверка и отправка карточки", {
  type: "activity",
  activity: "publish",
});
const laneIds = ["managerLane", "systemLane", "ozonLane"];
for (const [i, label] of [
  "Менеджер",
  "Информационная система",
  "Ozon",
].entries()) {
  add("partition", laneIds[i], label, { owner: "publish" });
  view("activity", laneIds[i], [i * 440, 0, 410, 1900]);
}
const activityRows: [string, string, string, number, number, number, number][] =
  [
    ["initial", "start", "", 0, 185, 80, 32],
    ["action", "selectCard", "Выбрать и подтвердить карточку", 0, 70, 170, 270],
    ["action", "check", "Проверить поля и версии", 1, 520, 300, 250],
    ["decision", "ready", "Карточка готова?", 1, 585, 445, 120],
    ["action", "fix", "Исправить замечания", 0, 70, 590, 270],
    ["action", "saveAttempt", "Сохранить попытку до вызова", 1, 500, 620, 280],
    ["action", "send", "Передать пакет", 1, 525, 780, 250],
    ["action", "process", "Принять и обработать", 2, 955, 900, 255],
    ["action", "receive", "Получить статус / тайм-аут", 1, 500, 1050, 280],
    ["decision", "answer", "Ответ есть?", 1, 585, 1190, 120],
    [
      "action",
      "waiting",
      "Сохранить ожидание той же операции",
      1,
      500,
      1530,
      290,
    ],
    ["action", "result", "Сохранить итог и замечания", 1, 500, 1370, 280],
    ["activityFinal", "done", "", 1, 625, 1810, 32],
    ["activityFinal", "fixDone", "", 0, 185, 790, 32],
  ];
for (const [kind, id, label, lane, x, y, w] of activityRows) {
  add(kind, id, label, {
    owner: "publish",
    ...(kind === "action" ? { kind: "opaque" } : {}),
  });
  add("partitionMember", `responsibility_${id}`, "", {
    owner: laneIds[lane],
    element: id,
  });
  view(
    "activity",
    id,
    [
      x,
      y,
      w,
      ["initial", "activityFinal"].includes(kind)
        ? w
        : kind === "decision"
          ? 95
          : 86,
    ],
    `v_activity_${laneIds[lane]}`,
  );
}
const flows: [string, string, string?][] = [
  ["start", "selectCard"],
  ["selectCard", "check"],
  ["check", "ready"],
  ["ready", "saveAttempt", "да"],
  ["ready", "fix", "else"],
  ["fix", "fixDone"],
  ["saveAttempt", "send"],
  ["send", "process"],
  ["process", "receive"],
  ["receive", "answer"],
  ["answer", "result", "ответ есть"],
  ["answer", "waiting", "else"],
  ["waiting", "done"],
  ["result", "done"],
];
const flowIds = flows.map(([from, to, guard], i) => {
  const id = `flow${i + 1}`;
  add("controlFlow", id, "", {
    owner: "publish",
    from,
    to,
    ...(guard ? { guard } : {}),
  });
  return id;
});
edgeViews("activity", flowIds);

add("diagram", "components", "ИМ · Компоненты и общие интерфейсы", {
  type: "component",
});
const componentIds = [
  "web",
  "services",
  "access",
  "repository",
  "importer",
  "ozonAdapter",
];
for (const [i, row] of table("10.2").entries()) {
  add("component", componentIds[i], row[0], {
    description: `${row[1]} ${row[2]} Источник: таблица 10.2.`,
  });
}
for (const [id, label] of [
  ["iAccess", "IAccess"],
  ["iRepository", "IRepository"],
  ["iPublisher", "IPublisher"],
])
  add("interface", id, label);
const positions: Record<string, [number, number, number, number]> = {
  web: [20, 40, 310, 150],
  services: [455, 40, 345, 240],
  importer: [930, 40, 300, 155],
  access: [20, 570, 310, 215],
  repository: [455, 570, 345, 250],
  ozonAdapter: [930, 570, 300, 165],
  iAccess: [20, 345, 260, 95],
  iRepository: [485, 350, 265, 95],
  iPublisher: [930, 345, 265, 95],
};
for (const [id, rect] of Object.entries(positions))
  view("components", id, rect);
const compEdges: string[] = [];
function relation(
  kind: string,
  id: string,
  from: string,
  to: string,
  label = "",
) {
  add(kind, id, label, { from, to });
  compEdges.push(id);
}
relation("dependency", "webCalls", "web", "services", "Команды и запросы");
relation(
  "dependency",
  "importCalls",
  "importer",
  "services",
  "Нормализованные записи",
);
for (const [id, target] of [
  ["access", "iAccess"],
  ["repository", "iRepository"],
  ["ozonAdapter", "iPublisher"],
])
  relation("realization", `provides_${id}`, id, target);
for (const target of ["iAccess", "iRepository", "iPublisher"])
  relation("usage", `uses_${target}`, "services", target);
relation("usage", "accessUsesRepository", "access", "iRepository");
edgeViews("components", compEdges);

add("diagram", "classes", "ИМ · Классы реализации компонентов", {
  type: "class",
});
const classRows = [
  ["Component", "services"],
  ["BomVersion", "services"],
  ["Card", "services"],
  ["PublicationAttempt", "services"],
  ["User", "access"],
  ["Role", "access"],
  ["AuditEvent", "access"],
  ["SupplierOffer", "importer"],
  ["StockSnapshot", "importer"],
];
for (const [i, [label, owner]] of classRows.entries()) {
  const id = `class${label}`;
  add("class", id, label, {
    description:
      "Предметная сущность из таблицы 10.2. Поля и методы не выдумываются в этом архитектурном срезе.",
  });
  add("componentRealization", `implements${label}`, "", {
    owner,
    classifier: id,
  });
  view("classes", id, [
    60 + (i % 3) * 290,
    60 + Math.floor(i / 3) * 210,
    230,
    145,
  ]);
}

add("diagram", "deployment", "ИМ · Узлы и размещение артефактов", {
  type: "deployment",
});
add("device", "workstation", "Рабочий компьютер", {
  description: table("10.3")[0].join(". "),
});
add("node", "server", "Серверная виртуальная машина", {
  description: table("10.3")[1].join(". "),
});
add("executionEnvironment", "application", "Среда приложения и фоновых задач", {
  owner: "server",
  technology: "Серверное приложение",
});
add("executionEnvironment", "postgres", "PostgreSQL", {
  owner: "server",
  technology: "PostgreSQL",
});
add("node", "backupStore", "Отдельное хранилище копий", {
  description: table("10.3")[2].join(". "),
});
add("node", "externalOzon", "Внешний узел Ozon", {
  description: table("10.3")[3].join(". "),
});
view("deployment", "workstation", [0, 80, 330, 260]);
view("deployment", "server", [465, 20, 620, 820]);
view("deployment", "application", [500, 110, 540, 285], "v_deployment_server");
view("deployment", "postgres", [500, 450, 300, 230], "v_deployment_server");
view("deployment", "backupStore", [0, 570, 330, 245]);
view("deployment", "externalOzon", [1220, 95, 335, 220]);
const artifacts = [
  ["frontend", "Интерфейс приложения в браузере", "workstation", "web"],
  ["appBuild", "Сборка приложения и фоновых задач", "application", "services"],
  ["dbSchema", "Схема БД и миграции", "postgres", "repository"],
  ["backups", "Копии БД и файлов", "backupStore", "repository"],
];
const artifactRects: [number, number, number, number][] = [
  [35, 200, 250, 100],
  [560, 260, 310, 95],
  [535, 560, 230, 90],
  [35, 695, 250, 95],
];
for (const [i, [id, label, location, component]] of artifacts.entries()) {
  add("artifact", id, label, {
    description:
      "Учебный тип артефакта по таблицам 10.1–10.3; не фактическая поставленная сборка.",
  });
  add("deployment", `deploy_${id}`, "", { location, artifact: id });
  add("manifestation", `manifest_${id}`, "", { from: id, to: component });
  view("deployment", id, artifactRects[i], `v_deployment_${location}`);
}
// The same component IDs occur here and on the component sheet.
view("deployment", "web", [0, 950, 300, 150]);
view("deployment", "services", [440, 950, 345, 250]);
view("deployment", "repository", [920, 950, 350, 250]);
for (const [id, from, to, protocol] of [
  ["https", "workstation", "application", "HTTPS"],
  ["marketplace", "application", "externalOzon", "Защищённый интерфейс Ozon"],
  ["sql", "application", "postgres", "Доступ к PostgreSQL"],
  ["backupChannel", "server", "backupStore", "Резервирование БД и файлов"],
])
  add("communicationPath", id, "", {
    from,
    to,
    protocol,
    ...(id === "https" ? { port: "443" } : {}),
  });
edgeViews("deployment", [
  "https",
  "marketplace",
  "sql",
  "backupChannel",
  ...artifacts.map(([id]) => `manifest_${id}`),
]);
add("deploymentSetting", "appSizing", "Стартовая оценка", {
  owner: "deploy_appBuild",
  key: "Ресурсы VM",
  value: "4 vCPU; 8 ГБ RAM; SSD 100 ГБ — ориентир, не результат испытаний",
});

const source =
  "// Источник содержания: ИМ_АлбахтинИВ_Отчёт.docx, таблицы 9.1–9.3 и 10.1–10.4. Учебная модель.\n" +
  generateUnified(textModel(model));
const layout = layoutUml(model);
Object.assign(layout.nodes, rects);
const document = decodeUml({
  formatVersion: 2,
  notation: "UML",
  profile: "NS-UML-2.5.1-2",
  model,
  source,
  draft: source,
  layout,
});
await writeFile(
  "examples/im/im-architecture.omni",
  await encodeProject(document),
);
execFileSync(process.execPath, ["scripts/generate-project-map.mjs"], {
  stdio: "inherit",
});
for (const name of [
  "activity-parallel-pins",
  "component-ports",
  "deployment-repeated-artifact",
]) {
  await copyFile(`examples/${name}.omni`, `examples/im/${name}.omni`);
  execFileSync(process.execPath, ["scripts/generate-project-map.mjs"], {
    stdio: "inherit",
  });
}
console.log("Создана общая модель ИМ: 4 листа и 3 отдельных примера профиля.");
