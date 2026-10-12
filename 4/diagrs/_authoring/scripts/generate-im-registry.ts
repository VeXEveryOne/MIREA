import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ExportItem = {
  order: number;
  notation: string;
  documentId: string;
  diagramId: string;
  title: string;
  status: string;
  files: string[];
};

const root = process.cwd();
const resultFiles = [
  "export-png-result.json",
  "export-overview-result.json",
  "export-poster-result.json",
];
const profiles = new Map([
  ["im_org", "FUNCTION_TREE/org"],
  ["im_wbs", "FUNCTION_TREE/wbs"],
  ["im_furps", "FUNCTION_TREE/furps"],
  ["im_plan", "GANTT"],
  ["im_architecture", "UML/activity+component+class+deployment"],
  ["activity-parallel-pins", "UML/activity"],
  ["component-ports", "UML/component"],
  ["deployment-repeated-artifact", "UML/deployment"],
  ["gantt-calendar-milestone", "GANTT/calendar"],
  ["gantt-dependency-types", "GANTT/dependencies"],
  ["gantt-reserves", "GANTT/reserves"],
]);
const sourceStems = new Map([
  ["parallel", "activity-parallel-pins"],
  ["ports", "component-ports"],
  ["placements", "deployment-repeated-artifact"],
  ["gantt_calendar", "gantt-calendar-milestone"],
  ["gantt_dependencies", "gantt-dependency-types"],
  ["gantt_reserves", "gantt-reserves"],
  ["im_architecture", "im-architecture"],
  ["im_furps", "im-furps"],
  ["im_org", "im-org"],
  ["im_plan", "im-plan"],
  ["im_wbs", "im-wbs"],
]);
const results = await Promise.all(
  resultFiles.map(async (name) =>
    JSON.parse(await readFile(path.join(root, ".tools", "im", name), "utf8")) as {
      items: ExportItem[];
    },
  ),
);
const manifests = await Promise.all(
  ["export-png.json", "export-overview.json", "export-poster.json"].map(async (name) =>
    JSON.parse(await readFile(path.join(root, ".tools", "im", name), "utf8")) as {
      options: Record<string, unknown>;
    },
  ),
);
const documents = [
  ...new Map(
    results
      .flatMap((result) => result.items)
      .map((item) => [item.documentId, item] as const),
  ).values(),
]
  .map((item) => ({
    documentId: item.documentId,
    file: path.join(root, "examples", "im", `${sourceStems.get(item.documentId) ?? item.documentId}.omni`),
    profile: profiles.get(item.documentId) ?? profiles.get(sourceStems.get(item.documentId) ?? item.documentId) ?? "UML/GANTT",
  }))
  .sort((a, b) => a.documentId.localeCompare(b.documentId));
const registry = {
  generatedAt: new Date().toISOString(),
  source: path.join(root, "examples", "im"),
  documentCount: documents.length,
  sheetCount: results[0].items.length,
  documents,
  exports: results.map((result, index) => ({
    profile: manifests[index].options,
    resultFile: path.join(root, ".tools", "im", resultFiles[index]),
    items: result.items,
  })),
};
await mkdir(path.join(root, "out", "im"), { recursive: true });
await writeFile(
  path.join(root, "out", "im", "REGISTRY.json"),
  `${JSON.stringify(registry, null, 2)}\n`,
);
const lines = [
  "# Реестр примеров ИМ",
  "",
  `Сгенерирован: ${registry.generatedAt}. Документы: ${registry.documentCount}; листов в каждом профиле экспорта: ${registry.sheetCount}.`,
  "",
  "## Документы",
  "",
  "| ID | Профиль | Файл |",
  "| --- | --- | --- |",
  ...documents.map(
    (item) => `| ${item.documentId} | ${item.profile} | ${item.file} |`,
  ),
  "",
  "## Экспорт",
  "",
  ...results.map(
    (result, index) =>
      `- ${resultFiles[index]}: ${result.items.filter((item) => item.status === "completed").length}/${result.items.length} листов завершено; профиль ${String(manifests[index].options.format ?? "unknown")}.`,
  ),
  "",
  "Реестр фиксирует файлы, созданные штатным CLI. Он не заменяет ручную проверку сохранения, восстановления и поведения редактора.",
  "",
];
await writeFile(path.join(root, "out", "im", "REGISTRY.md"), lines.join("\n"));
