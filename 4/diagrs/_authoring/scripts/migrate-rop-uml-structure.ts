import {
  element,
  addView,
  layoutUml,
  textModel,
  decodeUml,
} from "../src/notations/uml/document";
import { generateUnified } from "../src/language/unified";
import { validateUml } from "../src/notations/uml/validation";
import type { UmlModel, UmlLayout } from "../src/notations/uml/model";
import { readDraft, writeDocument, writeReport } from "./rop/source";

const model: UmlModel = {
  id: "ropUmlStructure",
  label: "РОП — компоненты, деятельность и развёртывание",
  elements: [],
};
const rects: UmlLayout["nodes"] = {},
  routes: UmlLayout["edges"] = {},
  provenance: unknown[] = [],
  differences: string[] = [],
  figures: Record<string, unknown>[] = [];
for (const [i, id] of [
  "D02_component",
  "D06_activity",
  "D21_deployment",
].entries()) {
  const { draft, path, sha256 } = await readDraft(id),
    prefix = id + ".",
    kind = ["component", "activity", "deployment"][i];
  model.elements.push(
    element(
      "diagram",
      draft.title,
      {
        type: kind,
        ...(kind === "activity" ? { activity: "prepareCard" } : {}),
      },
      id,
    ),
  );
  if (kind === "activity")
    model.elements.push(element("activity", draft.title, {}, "prepareCard"));
  const show = (
    id: string,
    elementId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    props: Record<string, string> = {},
  ) => {
    model.elements.push(
      element(
        "view",
        "",
        { diagram: draft.id, element: elementId, ...props },
        id,
      ),
    );
    rects[id] = { x, y, width, height };
    return id;
  };
  for (const n of draft.nodes) {
    const nodeKind =
      kind === "component"
        ? "component"
        : kind === "activity"
          ? (
              {
                start: "initial",
                end: "activityFinal",
                action: "action",
                decision: "decision",
              } as Record<string, string>
            )[n.kind]
          : n.id === "client"
            ? "device"
            : "node";
    if (!nodeKind)
      throw new Error(
        `Неизвестное соответствие ${draft.id}/${n.id}: ${n.kind}`,
      );
    model.elements.push(
      element(
        nodeKind,
        n.label.replace(/«(?:component|device|node|external)»\s*/g, ""),
        {
          ...(kind === "activity" ? { owner: "prepareCard" } : {}),
          ...(n.body ? { description: n.body } : {}),
        },
        prefix + n.id,
      ),
    );
    show(prefix + n.id + "View", prefix + n.id, n.x, n.y, n.w, n.h);
    provenance.push({
      source: path,
      sourceId: n.id,
      element: prefix + n.id,
      type: nodeKind,
    });
  }
  if (kind === "activity") {
    model.elements.push(
      element(
        "merge",
        "",
        { owner: "prepareCard" },
        prefix + "mergeCorrections",
      ),
    );
    show(
      prefix + "mergeCorrectionsView",
      prefix + "mergeCorrections",
      610,
      192,
      40,
      30,
    );
    model.elements.push(
      element(
        "controlFlow",
        "",
        {
          owner: "prepareCard",
          from: prefix + "mergeCorrections",
          to: prefix + "c",
        },
        prefix + "continueEditing",
      ),
    );
    addView(model, id, prefix + "continueEditing", {
      from: prefix + "mergeCorrectionsView",
      to: prefix + "cView",
    });
    differences.push(
      "D06: добавлен явный merge перед редактированием состава. Альтернативы первого прохода и исправления объединяются без неявной синхронизации нескольких входов action.",
    );
  }
  for (const [j, edge] of draft.edges.entries()) {
    const eid = prefix + "edge" + (j + 1),
      protocol = /^(HTTPS|TLS)(?: (\d+))?$/.exec(edge.label);
    const target =
      kind === "activity" && edge.target === "c"
        ? "mergeCorrections"
        : edge.target;
    const from = prefix + edge.source,
      to = prefix + target;
    const props =
      kind === "activity"
        ? {
            owner: "prepareCard",
            from,
            to,
            ...(edge.label
              ? {
                  guard:
                    edge.label === "Нет"
                      ? "else"
                      : "Совместимо и данные актуальны",
                }
              : {}),
          }
        : {
            from,
            to,
            ...(protocol
              ? {
                  protocol: protocol[1],
                  ...(protocol[2] ? { port: protocol[2] } : {}),
                }
              : {}),
          };
    model.elements.push(
      element(
        kind === "component"
          ? "dependency"
          : kind === "activity"
            ? "controlFlow"
            : "communicationPath",
        kind === "activity" || protocol ? "" : edge.label,
        props,
        eid,
      ),
    );
    const v = addView(model, id, eid, { from: from + "View", to: to + "View" });
    const runs = edge.points
        .slice(1)
        .map((b, i) => ({
          a: edge.points[i],
          b,
          length: Math.hypot(
            b[0] - edge.points[i][0],
            b[1] - edge.points[i][1],
          ),
        }))
        .sort((a, b) => b.length - a.length),
      run = runs[0];
    routes[v.id] = {
      bends:
        target === "mergeCorrections"
          ? edge.source === "fix"
            ? [
                { x: 180, y: 207 },
                { x: 610, y: 207 },
              ]
            : []
          : edge.points.slice(1, -1).map(([x, y]) => ({ x, y })),
      ...(edge.label && run && kind !== "component"
        ? {
            label: {
              x: (run.a[0] + run.b[0]) / 2 + (run.a[0] === run.b[0] ? 70 : 0),
              y: (run.a[1] + run.b[1]) / 2 - 10,
            },
          }
        : {}),
    };
    provenance.push({
      source: path,
      sourceEdge: j,
      element: eid,
      originalLabel: edge.label,
    });
  }
  if (kind === "deployment") {
    Object.assign(rects, {
      [prefix + "clientView"]: { x: 30, y: 180, width: 280, height: 170 },
      [prefix + "edgeView"]: { x: 410, y: 180, width: 270, height: 190 },
      [prefix + "appView"]: { x: 800, y: 40, width: 840, height: 470 },
      [prefix + "dbView"]: { x: 810, y: 650, width: 400, height: 360 },
      [prefix + "mediaView"]: { x: 1320, y: 650, width: 320, height: 185 },
      [prefix + "backupView"]: { x: 1810, y: 680, width: 300, height: 195 },
      [prefix + "extView"]: { x: 1810, y: 150, width: 300, height: 180 },
    });
    for (const v of model.elements.filter(
      (v) => v.kind === "view" && v.properties.diagram === id && routes[v.id],
    ))
      delete routes[v.id];
    for (const [edge, label] of [
      ["edge1", { x: 360, y: 245 }],
      ["edge2", { x: 740, y: 250 }],
    ] as const) {
      const view = model.elements.find(
        (v) => v.kind === "view" && v.properties.element === prefix + edge,
      )!;
      routes[view.id] = { label };
    }
    const environments = [
      ["apiRuntime", "JRE 21 · API", "app", "Java", "21", 840, 235],
      [
        "workerRuntime",
        "JRE 21 · worker публикаций",
        "app",
        "Java",
        "21",
        1240,
        235,
      ],
      ["postgres", "PostgreSQL", "db", "PostgreSQL", "18", 840, 820],
    ] as const;
    for (const [
      suffix,
      label,
      owner,
      technology,
      version,
      x,
      y,
    ] of environments) {
      const eid = prefix + suffix;
      model.elements.push(
        element(
          "executionEnvironment",
          label,
          { owner: prefix + owner, technology, version },
          eid,
        ),
      );
      show(eid + "View", eid, x, y, 335, owner === "app" ? 235 : 150, {
        parent: prefix + owner + "View",
      });
    }
    const artifact = prefix + "applicationArtifact";
    model.elements.push(
      element(
        "artifact",
        "Приложение карточек",
        {
          description:
            "Артефакт модульного монолита: API и worker используют общий пакет. Разделение сред уточняет исходный рисунок; физическая топология не проверялась.",
        },
        artifact,
      ),
    );
    for (const [j, env] of ["apiRuntime", "workerRuntime"].entries()) {
      const artifactView = show(
        artifact + env + "View",
        artifact,
        j ? 1260 : 860,
        365,
        290,
        85,
        { parent: prefix + env + "View" },
      );
      const eid = prefix + env + "Deploy";
      model.elements.push(
        element("deployment", "", { location: prefix + env, artifact }, eid),
      );
      // Nested artifact views and explicit deployment relations share one artifact identity.
      provenance.push({
        element: artifact,
        view: artifactView,
        deployment: eid,
      });
    }
    const schema = prefix + "databaseSchema";
    model.elements.push(
      element(
        "artifact",
        "Схема базы данных",
        { fileName: "schema.sql" },
        schema,
      ),
    );
    show(schema + "View", schema, 1260, 950, 300, 100);
    const deploy = element("deployment", "", {
      location: prefix + "postgres",
      artifact: schema,
    });
    model.elements.push(deploy);
    addView(model, id, deploy.id, {
      from: prefix + "postgresView",
      to: schema + "View",
    });
    for (const component of model.elements.filter(
      (e) => e.kind === "component" && e.id !== "D02_component.ui",
    )) {
      const manifest = element("manifestation", "", {
        from: artifact,
        to: component.id,
      });
      model.elements.push(manifest);
    }
    differences.push(
      "D21: JRE 21 (API и worker) и PostgreSQL 18 выделены в executionEnvironment из подписей; добавлены артефакты приложения и существующего schema.sql. Общий пакет модульного монолита размещён в двух логических средах и связан manifestation с бизнес-компонентами D02. Это явно зафиксированное проектное уточнение исходного черновика, не подтверждение фактических серверов/сборок.",
    );
    differences.push(
      "D21: «external» заменён UML node с исходным именем Ozon/поставщики; communicationPath изображается без направления. Направленные подписи копирования сохранены как назначение канала, а не UML-сообщения.",
    );
  }
  if (draft.note) {
    const note = element("annotation", draft.note);
    model.elements.push(note);
    show(
      note.id + "View",
      note.id,
      30,
      kind === "deployment" ? 1180 : draft.height + 30,
      1100,
      95,
    );
  }
  figures.push({
    figure: [12, 25, 35][i],
    source: path,
    sha256,
    diagramId: id,
    sourceNodes: draft.nodes.length,
    sourceEdges: draft.edges.length,
    manualReview: "не выполнена",
    export: null,
  });
}
const layout = layoutUml(model);
Object.assign(layout.nodes, rects);
Object.assign(layout.edges, routes);
const source = generateUnified(textModel(model));
const document = decodeUml({
  formatVersion: 2,
  notation: "UML",
  profile: "NS-UML-2.5.1-2",
  model,
  source,
  draft: source,
  layout,
});
const path = await writeDocument(
  "РОП_UML_Структура.omni",
  "rop-uml-structure.omni",
  document,
);
for (const figure of figures) figure.file = path;
const report = await writeReport("РОП_UML_Структура_перенос.json", {
  figures,
  provenance,
  differences,
  unresolved: [],
  diagnostics: validateUml(model),
});
process.stdout.write(
  JSON.stringify(
    { path, report, declarations: model.elements.length },
    null,
    2,
  ),
);
