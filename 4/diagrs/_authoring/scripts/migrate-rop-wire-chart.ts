import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { z } from "zod";
import { declaration as el } from "../src/notations/structured/document";
import { wireframeEngine } from "../src/notations/wireframe/document";
import { chartEngine } from "../src/notations/chart/document";
import type {
  SemanticElement,
  StructuredLayout,
} from "../src/notations/structured/model";
import { inputRoot, readDraft, writeDocument, writeReport } from "./rop/source";

const elements: SemanticElement[] = [],
  nodes: StructuredLayout["nodes"] = {},
  provenance: unknown[] = [],
  figures: Record<string, unknown>[] = [];
const columns = [
  ["Код BOM", "Название", "Статус", "Версия"],
  ["Слот", "Компонент / группа", "Количество", "Характеристика / разрешение"],
  ["Поставщик", "SKU", "Цена", "Остаток", "Актуальность"],
  ["Код BOM", "Версия / конфликт", "Цена / действие", "Результат"],
  ["Показатель", "Значение", "Дополнительно"],
  ["Публикация", "Результат", "Повтор / причина", "Следующая попытка"],
];
for (let i = 1; i <= 6; i++) {
  const source = await readDraft(`D05_wireframe_0${i}`),
    d = source.draft,
    prefix = d.id + ".",
    screen = prefix + "screen",
    rootView = prefix + "screenView";
  elements.push(
    el("screen", screen, d.title.replace(/^Экран /, ""), {
      description: d.note,
      role: "Сотрудник",
      ...(i === 1 ? { initial: "true" } : {}),
    }),
    el("diagram", d.id, d.title, { type: "screen", screen }),
    el("view", rootView, "", { diagram: d.id, element: screen }),
  );
  nodes[rootView] = { x: 0, y: 0, width: 1280, height: 900, z: -10 };
  function widget(
    id: string,
    label: string,
    type: string,
    x: number,
    y: number,
    width: number,
    height: number,
    p: Record<string, string> = {},
    owner = screen,
  ) {
    const key = prefix + id;
    elements.push(
      el("widget", key, label, {
        owner,
        type,
        order: String(elements.length),
        ...p,
      }),
      el("view", key + "View", "", {
        diagram: d.id,
        element: key,
        parent: owner === screen ? rootView : owner + "View",
      }),
    );
    nodes[key + "View"] = { x, y, width, height };
    return key;
  }
  function action(
    owner: string,
    target: string,
    kind = "navigate",
    label = "",
  ) {
    const id = owner + "Action" + elements.length;
    elements.push(
      el("uiAction", id, label, { owner, event: "click", kind, target }),
    );
    return id;
  }
  const original = new Map(d.nodes.map((n) => [n.id, n]));
  for (const n of d.nodes)
    if (n.kind !== "box" || n.body !== null)
      throw new Error(`Изменён исходный тип ${d.id}/${n.id}.`);
  widget("app", original.get("app")!.label, "heading", 25, 55, 1220, 55, {
    text: original.get("app")!.label,
  });
  const sidebar = widget("nav", "Разделы", "sidebar", 20, 125, 190, 650);
  for (const [j, label] of original.get("nav")!.label.split(/\n+/).entries()) {
    const id = widget(
      "nav" + j,
      label,
      "button",
      30,
      175 + j * 80,
      170,
      50,
      {},
      sidebar,
    );
    action(
      id,
      `D05_wireframe_0${[1, 2, 3, 4, 6][j]}.screen`,
      "navigate",
      label,
    );
  }
  widget(
    "title",
    d.title.replace(/^Экран /, ""),
    "heading",
    240,
    120,
    970,
    40,
    { text: d.title.replace(/^Экран /, "") },
  );
  const fieldSpecs: [string, string, string][] =
    i === 1
      ? [
          ["Поиск по BOM, корпусу, компоненту и поставщику", "input", ""],
          ["Статус", "select", "Все"],
          ["Ответственный", "select", "Все"],
        ]
      : i === 2
        ? [
            ["BOM и версия", "input", "BOM-000153 · версия 3"],
            ["Корпус", "input", "CASE-001"],
            ["Слот", "select", "плата"],
            ["Выбор", "select", "точная модель / группа характеристик"],
          ]
        : i === 3
          ? [
              ["Компонент", "input", "BOARD-002"],
              ["Поставщик", "select", "Все"],
              ["Актуальность, часов ≤", "number", "24"],
            ]
          : i === 4
            ? [
                ["Исходный компонент", "input", "RAM-001"],
                ["Замена", "input", "RAM-002"],
                ["Область", "select", "Все активные BOM"],
              ]
            : i === 5
              ? [
                  ["BOM и версии", "input", "BOM-000153 v3 · Карточка v5"],
                  ["Название и категория", "input", ""],
                ]
              : [
                  ["Период", "select", "Сегодня"],
                  ["Результат", "select", "Все"],
                  ["Карточка", "input", "BOM-000153"],
                ];
  for (const [j, [label, type, value]] of fieldSpecs.entries()) {
    const key = widget(
      "field" + j,
      label,
      type,
      240 + (j % 3) * 330,
      185 + Math.floor(j / 3) * 70,
      310,
      60,
      {
        value,
        description: [
          original.get("f0")!.label,
          original.get("f1")!.label,
        ].join(" | "),
      },
    );
    if (type === "select")
      elements.push(
        el("option", key + "Option", value, {
          owner: key,
          value,
          selected: "true",
          order: "0",
        }),
      );
  }
  // The source's combined lines remain available verbatim; separate controls are explicit.
  widget(
    "sourceFields",
    original.get("f1")!.label,
    "text",
    240,
    i === 2 ? 325 : 295,
    990,
    35,
    {
      text: original.get("f1")!.label,
      description: original.get("f0")!.label,
    },
  );
  const tabs = widget(
    "tabs",
    "Сведения",
    "tabs",
    240,
    i === 2 ? 370 : 340,
    990,
    40,
  );
  elements.push(
    el("option", prefix + "dataTab", "Данные", {
      owner: tabs,
      value: "data",
      selected: "true",
      order: "0",
    }),
    el("option", prefix + "helpTab", "Примечания", {
      owner: tabs,
      value: "help",
      order: "1",
    }),
  );
  const dataPanel = widget(
    "dataPanel",
    "Данные",
    "tabPanel",
    235,
    i === 2 ? 413 : 383,
    1000,
    255,
    {
      tab: prefix + "dataTab",
    },
  );
  nodes[dataPanel + "View"].z = -1;
  const helpPanel = widget(
    "helpPanel",
    "Примечания к каркасу",
    "tabPanel",
    235,
    i === 2 ? 413 : 383,
    1000,
    255,
    { tab: prefix + "helpTab" },
  );
  nodes[helpPanel + "View"].z = -1;
  widget(
    "helpText",
    "Описание",
    "text",
    255,
    i === 2 ? 450 : 420,
    955,
    150,
    {
      text:
        d.note +
        "\n" +
        original.get("f0")!.label +
        "\n" +
        original.get("f1")!.label,
    },
    helpPanel,
  );
  const table = widget(
    "data",
    "Демонстрационные данные",
    "table",
    245,
    i === 2 ? 445 : 415,
    980,
    210,
    {},
    dataPanel,
  );
  const sourceRows = ["r0", "r1", "r2"].map((id) => original.get(id)!);
  const rawRows = sourceRows.map((n) => n.label.split(/\s{2,}/));
  // D05/03 r2 is a note, D05/04 r0 is a summary; retain them as independent text.
  const excluded = i === 3 ? 2 : i === 4 ? 0 : -1;
  for (let c = 0; c < columns[i - 1].length; c++)
    elements.push(
      el("tableColumn", table + "Column" + c, columns[i - 1][c], {
        owner: table,
        key: "column" + c,
        dataType: "text",
        order: String(c),
      }),
    );
  for (const [r, row] of rawRows.entries()) {
    if (r === excluded) {
      widget("rowNote", sourceRows[r].label, "text", 245, 642, 980, 35, {
        text: sourceRows[r].label,
      });
      continue;
    }
    if (row.length > columns[i - 1].length)
      throw new Error(`Неразобранные ячейки ${d.id}/r${r}.`);
    const rid = table + "Row" + r;
    elements.push(
      el("tableRow", rid, "", {
        owner: table,
        order: String(r),
        description: sourceRows[r].label,
      }),
    );
    for (let c = 0; c < columns[i - 1].length; c++)
      elements.push(
        el("tableCell", rid + "Cell" + c, "", {
          owner: rid,
          column: table + "Column" + c,
          value: row[c] ?? "",
        }),
      );
  }
  const buttons = ["b0", "b1"].map((id, j) =>
    widget(id, original.get(id)!.label, "button", 240 + j * 500, 695, 480, 60),
  );
  const modal = widget(
    "modal",
    "Локальный предпросмотр",
    "modal",
    350,
    240,
    700,
    310,
    { state: "hidden" },
  );
  nodes[modal + "View"].z = 20;
  const message = widget(
    "modalText",
    "Описание",
    "text",
    380,
    305,
    640,
    120,
    {
      text:
        "Демонстрационный переход. " +
        original.get("b0")!.label +
        ". Изменения, запросы и публикации во внешних системах не выполняются.",
    },
    modal,
  );
  nodes[message + "View"].z = 21;
  const close = widget(
    "modalClose",
    "Закрыть",
    "button",
    570,
    460,
    260,
    55,
    {},
    modal,
  );
  nodes[close + "View"].z = 21;
  action(close, modal, "closeModal");
  action(
    buttons[0],
    i === 1 ? "D05_wireframe_02.screen" : modal,
    i === 1 ? "navigate" : "openModal",
    original.get("b0")!.label,
  );
  action(
    buttons[1],
    i === 1
      ? "D05_wireframe_05.screen"
      : i === 5
        ? "D05_wireframe_02.screen"
        : i === 2
          ? modal
          : "D05_wireframe_01.screen",
    i === 2 ? "openModal" : "navigate",
    original.get("b1")!.label,
  );
  widget("footer", "Примечание", "text", 240, 795, 990, 80, {
    text: "Редактируемый каркас OmniNotation. Значения демонстрационные; действия выполняются локально в режиме прототипа.",
  });
  provenance.push({
    source: source.path,
    sha256: source.sha256,
    sourceIds: d.nodes.map((n) => n.id),
    targetPrefix: prefix,
    mapping: {
      app: "heading",
      nav: "sidebar + 5 buttons/navigate",
      f0: "inputs/selects/number (original in description)",
      f1: "text + controls",
      r0_r2: "tableRow/tableCell or explicit note",
      b0_b1: "button/uiAction",
    },
    sourceNodes: d.nodes.length,
    sourceEdges: d.edges.length,
  });
  figures.push({
    figure: 18 + i,
    source: source.path,
    diagramId: d.id,
    manualReview: "не выполнена",
    export: null,
  });
}
elements.push(
  el("diagram", "navigation", "Карта переходов", { type: "navigation" }),
);
for (const [i, screen] of elements
  .filter((e) => e.kind === "screen")
  .entries()) {
  const id = screen.id + "NavView";
  elements.push(
    el("view", id, "", { diagram: "navigation", element: screen.id }),
  );
  nodes[id] = {
    x: 60 + (i % 3) * 400,
    y: 60 + Math.floor(i / 3) * 350,
    width: 300,
    height: 140,
  };
}
for (const action of elements.filter(
  (e) => e.kind === "uiAction" && e.properties.kind === "navigate",
)) {
  const prefix = action.id.split(".")[0];
  elements.push(
    el("view", action.id + "NavView", "", {
      diagram: "navigation",
      element: action.id,
      from: prefix + ".screenNavView",
      to: action.properties.target + "NavView",
    }),
  );
}
let wire = wireframeEngine.create({
  id: "ropPrototype",
  label: "Шесть экранов РОП",
  elements,
});
wire = wireframeEngine.move(wire, nodes);
const wirePath = await writeDocument(
  "РОП_Каркасы.omni",
  "rop-wireframe.omni",
  wire,
);
for (const f of figures) f.file = wirePath;
const wireReport = await writeReport("РОП_Каркасы_перенос.json", {
  figures,
  provenance,
  differences: [
    "Текстовые строки рисунков разделены на реальные поля, варианты, таблицы и ячейки; оригиналы комбинированных подписей сохранены в text/description.",
    "Для локальной демонстрации добавлены навигация, вкладки и modal. Эти переходы отсутствовали в рисунках и являются явным уточнением прототипа.",
    "Добавлены заголовки столбцов по смыслу данных; пустые исходные ячейки оставлены пустыми. Высота экранов увеличена до 900 для заголовков и примечаний.",
  ],
  unresolved: [],
  diagnostics: wireframeEngine.validate(wire.model),
});

const sourcePath = join(inputRoot, "content.json"),
  raw = await readFile(sourcePath, "utf8"),
  content: unknown = JSON.parse(raw);
const source = z
  .array(
    z.object({ type: z.string(), title: z.string().optional() }).passthrough(),
  )
  .parse(content);
const table = z
  .object({ heads: z.array(z.string()), rows: z.array(z.array(z.string())) })
  .parse(
    source.find(
      (e) => e.type === "table" && e.title === "Оценки применимости аналогов",
    ),
  );
const row = table.rows.find((r) => r[0] === "Средняя оценка");
if (!row || row.length !== table.heads.length)
  throw new Error("Исходная таблица сравнения изменилась.");
const chartElements = [
  el("plot", "comparison", "Средняя экспертная оценка применимости аналогов", {
    kind: "column",
    unit: "балл (0–5)",
    minimum: "0",
    maximum: "5",
    decimals: "1",
    showValues: "true",
    sourceNote:
      "Источник: content.json, ПР1, таблица «Оценки применимости аналогов». Авторские экспертные оценки; 5 у проектируемой ИС — целевое покрытие, не измеренный результат.",
  }),
  el("diagram", "D00_comparison", "Сравнение аналогов", {
    type: "chart",
    plot: "comparison",
  }),
  el("view", "comparisonView", "", {
    diagram: "D00_comparison",
    element: "comparison",
  }),
  el("series", "average", "Средняя оценка", {
    owner: "comparison",
    order: "0",
  }),
];
for (let i = 1; i < row.length; i++)
  chartElements.push(
    el("category", "analog" + i, table.heads[i], {
      owner: "comparison",
      order: String(i - 1),
    }),
    el("value", "score" + i, "", {
      owner: "average",
      category: "analog" + i,
      number: row[i],
    }),
  );
let chart = chartEngine.create({
  id: "ropComparison",
  label: "Сравнение аналогов РОП",
  elements: chartElements,
});
chart = chartEngine.move(chart, {
  comparisonView: { width: 1100, height: 690 },
});
const chartPath = await writeDocument(
  "РОП_Сравнение.omni",
  "rop-chart.omni",
  chart,
);
const chartReport = await writeReport("РОП_Сравнение_перенос.json", {
  figures: [
    {
      figure: 5,
      source: sourcePath,
      sha256: createHash("sha256").update(raw).digest("hex"),
      sourceTable: "Оценки применимости аналогов",
      sourceRow: row,
      file: chartPath,
      diagramId: "D00_comparison",
      manualReview: "не выполнена",
      export: null,
    },
  ],
  unresolved: [],
  diagnostics: chartEngine.validate(chart.model),
});
process.stdout.write(
  JSON.stringify(
    {
      wirePath,
      wireReport,
      chartPath,
      chartReport,
      widgets: wire.model.elements.filter((e) => e.kind === "widget").length,
    },
    null,
    2,
  ),
);
