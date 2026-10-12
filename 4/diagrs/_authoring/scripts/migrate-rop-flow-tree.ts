/** Explicit migration of the four supplied drawings; no SQL/expressions are executed. */
import { declaration } from "../src/notations/structured/document";
import { flowchartEngine } from "../src/notations/flowchart/document";
import { functionTreeEngine } from "../src/notations/function-tree/document";
import type {
  SemanticElement,
  StructuredLayout,
} from "../src/notations/structured/model";
import { readDraft, writeDocument, writeReport, anchor } from "./rop/source";

const provenance: unknown[] = [],
  differences: string[] = [],
  figures: unknown[] = [];
const tree = await readDraft("D01_function_tree"),
  elements: SemanticElement[] = [],
  treePositions: StructuredLayout["nodes"] = {};
const root = tree.draft.nodes.filter(
  (n) => !tree.draft.edges.some((e) => e.target === n.id),
);
if (root.length !== 1) throw new Error("Неоднозначный корень D01.");
elements.push(
  declaration("diagram", tree.draft.id, tree.draft.title, {
    type: "tree",
    root: root[0].id,
  }),
);
for (const node of tree.draft.nodes) {
  const incoming = tree.draft.edges.filter((e) => e.target === node.id);
  if (incoming.length > 1)
    throw new Error(`D01/${node.id}: несколько родителей.`);
  const parent = incoming[0]?.source;
  const lines = !tree.draft.edges.some((e) => e.source === node.id)
    ? node.label.split("\n")
    : [node.label];
  const siblings = tree.draft.nodes
    .filter((n) =>
      tree.draft.edges.some((e) => e.target === n.id && e.source === parent),
    )
    .sort((a, b) => a.x - b.x);
  const ids: string[] = [];
  lines.forEach((label, i) => {
    const id = lines.length === 1 ? node.id : `${node.id}_${i + 1}`;
    ids.push(id);
    elements.push(
      declaration("function", id, label, {
        ...(parent ? { parent } : {}),
        order: String(
          lines.length > 1
            ? i
            : Math.max(
                0,
                siblings.findIndex((n) => n.id === node.id),
              ),
        ),
      }),
    );
    elements.push(
      declaration("view", `${id}_view`, "", {
        diagram: tree.draft.id,
        element: id,
      }),
    );
    treePositions[`${id}_view`] = {
      x: node.x,
      y: node.y + i * 100,
      width: node.w,
      height: lines.length > 1 ? 75 : Math.max(node.h, 75),
    };
  });
  provenance.push({ source: tree.path, sourceId: node.id, elements: ids });
  if (lines.length > 1)
    differences.push(
      `${node.id}: ${lines.length} перечисленные подфункции преобразованы в отдельные дочерние функции, без общей фиктивной вершины.`,
    );
}
let treeDocument = functionTreeEngine.create({
  id: "ropFunctions",
  label: tree.draft.title,
  elements,
});
treeDocument = functionTreeEngine.move(treeDocument, treePositions);
const treePath = await writeDocument(
  "РОП_Дерево_функций.omni",
  "rop-function-tree.omni",
  treeDocument,
);
figures.push({
  figure: 11,
  source: tree.path,
  sha256: tree.sha256,
  file: treePath,
  diagramId: tree.draft.id,
  manualReview: "не выполнена",
  export: null,
});

const flowElements: SemanticElement[] = [],
  positions: StructuredLayout["nodes"] = {},
  routes: StructuredLayout["edges"] = {};
const sources = [];
for (const [n, id] of [
  "D07_algorithm_price",
  "D08_algorithm_offer",
  "D09_algorithm_replace",
].entries()) {
  const source = await readDraft(id),
    draft = source.draft;
  sources.push(source);
  const prefix = id + ".",
    algorithm = prefix + "algorithm",
    nodeId = (id: string) => prefix + id,
    viewId = (id: string) => prefix + id + "_view",
    yOffset = n === 2 ? 130 : 0;
  flowElements.push(
    declaration("algorithm", algorithm, draft.title),
    declaration("diagram", id, draft.title, { type: "algorithm", algorithm }),
  );
  const incoming = new Set(draft.edges.map((e) => e.target)),
    outgoing = new Set(draft.edges.map((e) => e.source));
  const kinds = new Map<string, string>();
  for (const node of draft.nodes) {
    let kind =
      node.label === "Начало"
        ? "start"
        : node.kind === "decision"
          ? "decision"
          : node.kind === "io"
            ? incoming.has(node.id) && !outgoing.has(node.id)
              ? "output"
              : "input"
            : "operation";
    kinds.set(node.id, kind);
    flowElements.push(
      declaration(kind, nodeId(node.id), node.label, {
        owner: algorithm,
        ...(kind === "decision"
          ? { mode: "binary", expression: node.label.replace(/\n/g, " ") }
          : {}),
      }),
      declaration("view", viewId(node.id), "", {
        diagram: id,
        element: nodeId(node.id),
      }),
    );
    positions[viewId(node.id)] = {
      x: node.x,
      y: node.y + yOffset,
      width: node.w,
      height: node.h,
    };
    provenance.push({
      source: source.path,
      sourceId: node.id,
      elements: [nodeId(node.id)],
      decision: kind,
    });
  }
  for (const [i, edge] of draft.edges.entries()) {
    const idEdge = prefix + "flow" + (i + 1),
      p: Record<string, string> = {
        from: nodeId(edge.source),
        to: nodeId(edge.target),
      };
    if (kinds.get(edge.source) === "decision") {
      if (edge.label === "Нет") p.otherwise = "true";
      else
        p.guard = draft.nodes
          .find((n) => n.id === edge.source)!
          .label.replace(/\n/g, " ")
          .replace(/\?$/, "");
    }
    flowElements.push(
      declaration("flow", idEdge, edge.label, p),
      declaration("view", `${idEdge}_view`, "", {
        diagram: id,
        element: idEdge,
        from: viewId(edge.source),
        to: viewId(edge.target),
      }),
    );
    routes[`${idEdge}_view`] = {
      bends: edge.points.slice(1, -1).map(([x, y]) => ({ x, y: y + yOffset })),
      from: anchor(
        draft.nodes.find((n) => n.id === edge.source)!,
        edge.points[0],
      ),
      to: anchor(
        draft.nodes.find((n) => n.id === edge.target)!,
        edge.points.at(-1),
      ),
    };
    provenance.push({ source: source.path, edge: i, elements: [idEdge] });
  }
  if (![...kinds.values()].includes("start")) {
    const first = draft.nodes.filter((node) => !incoming.has(node.id));
    if (first.length !== 1) throw new Error(`${id}: неоднозначное начало.`);
    const start = prefix + "start",
      edge = prefix + "startFlow";
    flowElements.push(
      declaration("start", start, "Начало", { owner: algorithm }),
      declaration("view", `${start}_view`, "", { diagram: id, element: start }),
      declaration("flow", edge, "", { from: start, to: nodeId(first[0].id) }),
      declaration("view", `${edge}_view`, "", {
        diagram: id,
        element: edge,
        from: `${start}_view`,
        to: viewId(first[0].id),
      }),
    );
    positions[`${start}_view`] = {
      x: first[0].x + first[0].w / 2 - 130,
      y: 20,
      width: 260,
      height: 70,
    };
    differences.push(
      `${id}: добавлено явное start перед единственным входом схемы.`,
    );
  }
  for (const last of draft.nodes.filter((node) => !outgoing.has(node.id))) {
    const end = nodeId(last.id) + "_end",
      edge = end + "Flow";
    flowElements.push(
      declaration("end", end, "Конец", { owner: algorithm }),
      declaration("view", `${end}_view`, "", { diagram: id, element: end }),
      declaration("flow", edge, "", { from: nodeId(last.id), to: end }),
      declaration("view", `${edge}_view`, "", {
        diagram: id,
        element: edge,
        from: viewId(last.id),
        to: `${end}_view`,
      }),
    );
    positions[`${end}_view`] = {
      x: last.x + last.w / 2 - 100,
      y: last.y + last.h + yOffset + 60,
      width: 200,
      height: 60,
    };
    differences.push(
      `${id}: после терминального действия ${last.id} добавлено явное end; исходное действие сохранено.`,
    );
  }
}
let flowDocument = flowchartEngine.create({
  id: "ropAlgorithms",
  label: "Алгоритмы РОП",
  elements: flowElements,
});
flowDocument = flowchartEngine.move(flowDocument, positions);
// Keep the return to the next-BOM decision distinct from its completion exit.
// This is an explicit presentation correction of the supplied drawing only.
routes["D09_algorithm_replace.flow8_view"] = {
  from: { side: "right", offset: 0.5 },
  to: { side: "top", offset: 0.5 },
  bends: [
    { x: 1350, y: 1140 },
    { x: 1350, y: 280 },
    { x: 640, y: 280 },
  ],
};
differences.push(
  "D09: возврат после STALE отделён от выхода «Нет» во внешний коридор; семантические концы и исходные шаги не изменены.",
);
flowDocument = flowchartEngine.decode({
  ...flowDocument,
  layout: {
    ...flowDocument.layout,
    edges: { ...flowDocument.layout.edges, ...routes },
  },
});
const flowPath = await writeDocument(
  "РОП_Алгоритмы.omni",
  "rop-flowchart.omni",
  flowDocument,
);
for (const [i, source] of sources.entries())
  figures.push({
    figure: 26 + i,
    source: source.path,
    sha256: source.sha256,
    file: flowPath,
    diagramId: source.draft.id,
    manualReview: "не выполнена",
    export: null,
  });
const report = await writeReport("РОП_Дерево_Алгоритмы_перенос.json", {
  figures,
  provenance,
  differences,
  unresolved: [],
  diagnostics: {
    tree: functionTreeEngine.validate(treeDocument.model),
    algorithms: flowchartEngine.validate(flowDocument.model),
  },
});
process.stdout.write(
  JSON.stringify(
    { treePath, flowPath, report, diagrams: figures.length },
    null,
    2,
  ),
);
