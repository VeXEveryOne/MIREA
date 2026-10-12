import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { declaration } from "../src/notations/structured/document";
import { schemeEngine } from "../src/notations/scheme/document";
import type {
  SemanticElement,
  StructuredLayout,
} from "../src/notations/structured/model";
import {
  inputRoot,
  readDraft,
  writeDocument,
  writeReport,
  anchor,
} from "./rop/source";

const elements: SemanticElement[] = [],
  nodes: StructuredLayout["nodes"] = {},
  edges: StructuredLayout["edges"] = {},
  figures: Record<string, unknown>[] = [],
  differences: string[] = [],
  provenance: unknown[] = [];
const sources = await Promise.all(
  ["D04_coding", "D10_infrastructure", "D24_access"].map(readDraft),
);
for (const [i, source] of sources.entries()) {
  const draft = source.draft,
    type = ["coding", "infrastructure", "access"][i];
  elements.push(declaration("diagram", draft.id, draft.title, { type }));
  if (type === "coding") {
    const lookup = new Map(draft.nodes.map((n) => [n.id, n]));
    if (
      !["prefix", "prefixv", "seq", "seqv"].every((id) => lookup.has(id)) ||
      draft.nodes.length !== 4 ||
      draft.edges.length !== 2
    )
      throw new Error(
        "Структура D04 изменилась; требуется пересмотр переноса.",
      );
    const sql = await readFile(
      join(inputRoot, "База_данных/schema.sql"),
      "utf8",
    );
    if (!sql.includes("'BOM-' || lpad(nextval('bom_code_seq')::text, 6, '0')"))
      throw new Error("Формат BOM в SQL изменён.");
    elements.push(
      declaration("codePattern", "bomCode", "Формат кода BOM", {
        description: draft.note,
      }),
      declaration("segment", "bomPrefix", "Префикс", {
        owner: "bomCode",
        kind: "literal",
        literal: lookup.get("prefix")!.label,
        meaning: lookup.get("prefixv")!.label,
        order: "0",
      }),
      declaration("segment", "bomSeparator", "Разделитель", {
        owner: "bomCode",
        kind: "literal",
        literal: "-",
        meaning: "Разделитель по DEFAULT таблицы bom",
        order: "1",
      }),
      declaration("segment", "bomNumber", "Порядковый номер", {
        owner: "bomCode",
        kind: "counter",
        width: "6",
        alphabet: "digits",
        example: lookup.get("seq")!.label,
        meaning: lookup.get("seqv")!.label,
        order: "2",
      }),
      declaration("view", "bomCodeView", "", {
        diagram: draft.id,
        element: "bomCode",
      }),
    );
    nodes.bomCodeView = {
      x: 60,
      y: 110,
      width: 1040,
      height: 300,
      parts: {
        bomPrefix: { width: 4, label: { x: 180, y: 160 } },
        bomSeparator: { width: 1, label: { x: 520, y: 160 } },
        bomNumber: { width: 4, label: { x: 860, y: 160 } },
      },
    };
    differences.push(
      "D04: отдельные блоки и выноски заменены codePattern/segment; добавлен явный '-' из schema.sql, отсутствующий отдельным блоком черновика. Номера не выдаются редактором.",
    );
    provenance.push({
      source: source.path,
      sourceIds: ["prefix", "prefixv", "seq", "seqv"],
      elements: ["bomCode", "bomPrefix", "bomNumber"],
      addedFromSql: "bomSeparator",
    });
  } else {
    const roles: Record<string, string> =
      type === "infrastructure"
        ? {
            client: "client",
            edge: "gateway",
            app: "application",
            db: "database",
            media: "storage",
            ext: "external",
            backup: "storage",
          }
        : {
            u: "principal",
            a: "authentication",
            r: "authorization",
            ok: "operation",
            deny: "deny",
          };
    const pref = draft.id + ".",
      view = (id: string) => pref + id + "_view";
    for (const node of draft.nodes) {
      if (!roles[node.id])
        throw new Error(`Неоднозначная роль ${draft.id}/${node.id}.`);
      const technology: Record<string, string> =
        type === "infrastructure"
          ? {
              client: "Браузер",
              edge: "Nginx",
              app: "JRE / Spring Boot",
              db: "PostgreSQL",
            }
          : {};
      elements.push(
        declaration(
          "block",
          pref + node.id,
          node.label.replace(/«(?:device|node|external)»\s*/g, ""),
          {
            role: roles[node.id],
            shape:
              roles[node.id] === "database" || roles[node.id] === "storage"
                ? "cylinder"
                : roles[node.id] === "external"
                  ? "cloud"
                  : roles[node.id] === "authorization"
                    ? "diamond"
                    : "rectangle",
            ...(technology[node.id] ? { technology: technology[node.id] } : {}),
            ...(node.id === "db"
              ? { version: "18" }
              : node.id === "app"
                ? { version: "21 (JRE)" }
                : {}),
            ...(roles[node.id] === "authorization"
              ? { policy: "RBAC: ресурс + операция + условие" }
              : {}),
          },
        ),
        declaration("view", view(node.id), "", {
          diagram: draft.id,
          element: pref + node.id,
        }),
      );
      nodes[view(node.id)] = {
        x: node.x,
        y: node.y,
        width: node.w,
        height: node.h,
      };
      provenance.push({
        source: source.path,
        sourceId: node.id,
        element: pref + node.id,
        role: roles[node.id],
      });
    }
    for (const [i, edge] of draft.edges.entries()) {
      const id = pref + "link" + (i + 1),
        protocol = /^(HTTPS|TLS)(?: (\d+))?$/.exec(edge.label);
      elements.push(
        declaration("link", id, edge.label, {
          from: pref + edge.source,
          to: pref + edge.target,
          kind: "directed",
          ...(protocol
            ? {
                protocol: protocol[1],
                ...(protocol[2] ? { port: protocol[2] } : {}),
              }
            : { purpose: edge.label }),
        }),
        declaration("view", id + "_view", "", {
          diagram: draft.id,
          element: id,
          from: view(edge.source),
          to: view(edge.target),
        }),
      );
      edges[id + "_view"] = {
        bends: edge.points.slice(1, -1).map(([x, y]) => ({ x, y })),
        from: anchor(
          draft.nodes.find((n) => n.id === edge.source)!,
          edge.points[0],
        ),
        to: anchor(
          draft.nodes.find((n) => n.id === edge.target)!,
          edge.points.at(-1),
        ),
      };
      provenance.push({ source: source.path, edge: i, element: id });
    }
    if (type === "infrastructure")
      differences.push(
        "D10: исторические текстовые маркеры «node»/«device» заменены локальными SCHEME role; схема не объявляется UML Deployment.",
      );
  }
  if (draft.note) {
    const id = draft.id + ".note";
    elements.push(
      declaration("note", id, "Примечание", { text: draft.note }),
      declaration("view", id + "View", "", { diagram: draft.id, element: id }),
    );
    nodes[id + "View"] = {
      x: 50,
      y: draft.height + 30,
      width: 850,
      height: 100,
    };
  }
  figures.push({
    figure: [18, 29, 38][i],
    source: source.path,
    sha256: source.sha256,
    diagramId: draft.id,
    manualReview: "не выполнена",
    export: null,
  });
}
let document = schemeEngine.create({
  id: "ropSchemes",
  label: "Кодирование, инфраструктура и доступ РОП",
  elements,
});
document = schemeEngine.move(document, nodes);
document = schemeEngine.decode({
  ...document,
  layout: { ...document.layout, edges: { ...document.layout.edges, ...edges } },
});
const path = await writeDocument(
  "РОП_Общие_схемы.omni",
  "rop-scheme.omni",
  document,
);
for (const figure of figures) figure.file = path;
const report = await writeReport("РОП_Общие_схемы_перенос.json", {
  figures,
  provenance,
  differences,
  unresolved: [],
  diagnostics: schemeEngine.validate(document.model),
});
process.stdout.write(
  JSON.stringify({ path, report, diagrams: figures.length }, null, 2),
);
