import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateUnified } from "../src/language/unified";
import { decodeProject, encodeProject } from "../src/persistence/project";
import { bpmnTextModel } from "../src/notations/bpmn/text";
import { erdEngine } from "../src/notations/erd/document";
import { flowchartEngine } from "../src/notations/flowchart/document";
import { functionTreeEngine } from "../src/notations/function-tree/document";
import { schemeEngine } from "../src/notations/scheme/document";
import { wireframeEngine } from "../src/notations/wireframe/document";
import { chartEngine } from "../src/notations/chart/document";
import { applyUmlModel } from "../src/notations/uml/document";
import type { ProjectDocument } from "../src/domain/project";

const sourceRoot =
  "D:/GitHub/MIREA/4/РОП/Практики_1-8/Модели_OmniNotation_v2";
const targetRoot =
  "D:/GitHub/MIREA/4/РОП/Практики_1-8/Модели_для_отчёта";

const phraseMap: [string, string][] = [
  ["Схема кодирования BOM", "Схема кодирования модельного ряда"],
  ["Формат кода BOM", "Формат кода модельного ряда"],
  ["Редактор версии BOM", "Редактор версии модельного ряда"],
  ["Редактор BOM", "Редактор модельного ряда"],
  ["Версионируемая BOM", "Версионируемый модельный ряд"],
  ["версионируемая BOM", "версионируемый модельный ряд"],
  ["Проверенная версия BOM", "Проверенная версия модельного ряда"],
  ["проверенная версия BOM", "проверенная версия модельного ряда"],
  ["Проверенная BOM", "Проверенный модельный ряд"],
  ["проверенная BOM", "проверенный модельный ряд"],
  ["BOM проверена", "Модельный ряд проверен"],
  ["Исходную BOM", "Исходный модельный ряд"],
  ["исходную BOM", "исходный модельный ряд"],
  ["Следующая BOM", "Следующий модельный ряд"],
  ["следующая BOM", "следующий модельный ряд"],
  ["каждой BOM", "каждого модельного ряда"],
  ["этой BOM", "этого модельного ряда"],
  ["Пустая BOM", "Пустой модельный ряд"],
  ["пустая BOM", "пустой модельный ряд"],
  ["версией BOM", "версией модельного ряда"],
  ["версии BOM", "версии модельного ряда"],
  ["версию BOM", "версию модельного ряда"],
  ["Версия BOM", "Версия модельного ряда"],
  ["версия BOM", "версия модельного ряда"],
  ["слоты BOM", "слоты модельного ряда"],
  ["Слот BOM", "Слот модельного ряда"],
  ["слот BOM", "слот модельного ряда"],
  ["списка BOM", "списка модельных рядов"],
  ["список BOM", "список модельных рядов"],
  ["активные BOM", "активные модельные ряды"],
  ["затронутых BOM", "затронутых модельных рядов"],
  ["результаты по BOM", "результаты по модельным рядам"],
  ["для BOM", "для модельного ряда"],
  ["из BOM", "из модельного ряда"],
  ["в BOM", "в модельном ряду"],
  ["по BOM", "по модельному ряду"],
  ["BOM и правила", "Модельный ряд и правила"],
  ["BOM и версия", "Модельный ряд и версия"],
  ["BOM, выбранные", "Модельный ряд, выбранные"],
  ["BOM;", "Модельный ряд;"],
  ["BOM-", "MR-"],
  ["BOM", "Модельный ряд"],
  ["БОМ", "Модельный ряд"],
];

function visible(text: string): string {
  let result = text
    .replaceAll("bom_", "model_line_")
    .replaceAll("bom_version_id", "model_line_version_id")
    .replaceAll("bom_slot", "model_line_slot")
    .replaceAll("bom_version", "model_line_version")
    .replaceAll("bom_id", "model_line_id")
    .replaceAll("ix_bom_case", "ix_model_line_case")
    .replace(/\bbom\b/g, "model_line")
    .replace(
      /Каркас SVG для переноса в Figma\/OmniNotation\. Значения демонстрационные\. Прототип не является рабочим интерфейсом\.\n?/g,
      "",
    );
  for (const [before, after] of phraseMap) result = result.replaceAll(before, after);
  return result;
}

function cleanRecord<T>(input: T, key = ""): T {
  if (Array.isArray(input)) return input.map((item) => cleanRecord(item)) as T;
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input).map(([name, value]) => [name, cleanRecord(value, name)]),
    ) as T;
  }
  if (
    typeof input === "string" &&
    [
      "label",
      "name",
      "title",
      "description",
      "text",
      "value",
      "literal",
      "expression",
      "guard",
      "sqlName",
      "default",
      "defaultSequence",
      "code",
      "note",
    ].includes(key)
  )
    return visible(input) as T;
  return input;
}

function technicalDeep<T>(input: T): T {
  if (Array.isArray(input)) return input.map((item) => technicalDeep(item)) as T;
  if (input && typeof input === "object")
    return Object.fromEntries(
      Object.entries(input).map(([name, value]) => [
        name.replaceAll("bom_", "model_line_").replace(/\bbom\b/g, "model_line"),
        technicalDeep(value),
      ]),
    ) as T;
  if (typeof input === "string")
    return input
      .replaceAll("bom_", "model_line_")
      .replace(/\bbom\b/g, "model_line") as T;
  return input;
}

const structuredEngines: Record<string, any> = {
  ERD: erdEngine,
  FLOWCHART: flowchartEngine,
  FUNCTION_TREE: functionTreeEngine,
  SCHEME: schemeEngine,
  WIREFRAME: wireframeEngine,
  CHART: chartEngine,
};

async function sanitize(name: string) {
  const raw = await readFile(path.join(sourceRoot, name), "utf8");
  const original: any = await decodeProject(raw);
  let result: ProjectDocument;
  if (original.notation === "IDEF0") {
    const model = cleanRecord(structuredClone(original.model));
    const source = generateUnified(model);
    result = await decodeProject(
      JSON.stringify({ ...original, model, source, draft: source }),
    );
  } else if (original.notation === "BPMN") {
    const data = cleanRecord({ model: structuredClone(original.model), layout: original.layout });
    const source = generateUnified(bpmnTextModel(data as any));
    result = await decodeProject(
      JSON.stringify({ ...original, ...data, source, draft: source }),
    );
  } else if (original.notation === "UML") {
    const model = cleanRecord(structuredClone(original.model));
    result = applyUmlModel(original, model, original.layout);
  } else {
    const engine = structuredEngines[original.notation];
    if (!engine) throw new Error(`Unsupported notation ${original.notation}`);
    const model = cleanRecord(
      original.notation === "ERD"
        ? technicalDeep(structuredClone(original.model))
        : structuredClone(original.model),
    );
    const layout =
      original.notation === "ERD"
        ? technicalDeep(structuredClone(original.layout))
        : original.layout;
    result = engine.withModel(original, model, layout);
  }
  await writeFile(path.join(targetRoot, name), await encodeProject(result), "utf8");
}

await mkdir(targetRoot, { recursive: true });
const manifest = JSON.parse(
  await readFile(path.join(sourceRoot, "Экспорт_PNG.json"), "utf8"),
);
const names = [...new Set<string>(manifest.jobs.map((job: any) => job.file))];
for (const name of names) await sanitize(name);
manifest.output = "PNG_final4";
manifest.options.scale = 1.5;
for (const job of manifest.jobs) job.title = visible(job.title);
await writeFile(
  path.join(targetRoot, "Экспорт_PNG.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);
console.log(`Sanitized ${names.length} models and ${manifest.jobs.length} jobs.`);
