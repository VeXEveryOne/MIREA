import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, basename, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { decodeProject } from "../../src/persistence/project";
import { exportSheets } from "../../src/export/model";
import { inputRoot, outputRoot, updateMap } from "./source";
interface Figure {
  figure: number;
  source: string;
  file: string;
  diagramId: string;
  title?: string;
  sha256?: string;
  modelSha256?: string;
  manualReview: string;
  export: unknown;
  report?: string;
}
const files = await readdir(outputRoot),
  figures: Figure[] = [];
const previousFile = join(outputRoot, "Реестр_38_рисунков.json");
const previous = files.includes("Реестр_38_рисунков.json")
  ? (JSON.parse(await readFile(previousFile, "utf8")) as { figures: Figure[] })
  : undefined;
for (const base of [
  "РОП_Прежние_модели_перенос",
  "РОП_ERD_перенос",
  "РОП_Дерево_Алгоритмы_перенос",
  "РОП_Общие_схемы_перенос",
  "РОП_UML_Структура_перенос",
  "РОП_UML_Последовательности_перенос",
  "РОП_Каркасы_перенос",
  "РОП_Сравнение_перенос",
]) {
  const versions = files
    .filter((f) => new RegExp(`^${base}(?:_(\\d+))?\\.json$`).test(f))
    .sort(
      (a, b) =>
        Number(b.match(/_(\d+)\.json$/)?.[1] ?? 1) -
        Number(a.match(/_(\d+)\.json$/)?.[1] ?? 1),
    );
  if (!versions[0]) throw new Error(`Нет отчёта ${base}`);
  const report = join(outputRoot, versions[0]),
    raw = JSON.parse(await readFile(report, "utf8"));
  for (const figure of raw.figures ?? raw.diagrams)
    figures.push({ ...figure, report });
}
figures.sort((a, b) => a.figure - b.figure);
if (figures.length !== 38 || figures.some((f, i) => f.figure !== i + 1))
  throw new Error(
    "Неполное или неоднозначное соответствие 38 рисунков; реестр не записан.",
  );
for (const f of figures) {
  const modelBytes = await readFile(f.file),
    doc = await decodeProject(modelBytes.toString("utf8")),
    sheet = exportSheets(doc).find((s) => s.id === f.diagramId);
  if (!sheet)
    throw new Error(`Рисунок ${f.figure}: отсутствует лист ${f.diagramId}`);
  f.title = `Рисунок ${String(f.figure).padStart(2, "0")} — ${sheet.title}`;
  if (!isAbsolute(f.source))
    f.source = join(inputRoot, "Черновики_схем", f.source);
  f.sha256 = createHash("sha256")
    .update(await readFile(f.source))
    .digest("hex");
  f.modelSha256 = createHash("sha256").update(modelBytes).digest("hex");
  const old = previous?.figures.find(
    (p) =>
      p.figure === f.figure &&
      p.file === f.file &&
      p.diagramId === f.diagramId &&
      p.sha256 === f.sha256 &&
      p.modelSha256 === f.modelSha256,
  );
  if (old) {
    f.manualReview = old.manualReview;
    f.export = old.export;
  }
}
const register = {
  generatedAt: new Date().toISOString(),
  count: figures.length,
  figures,
  note: "Реестр связывает реальные модели и листы. manualReview не подтверждается декодированием или сборкой; изображения и ручную приёмку записывать после выполнения.",
};
await writeFile(
  join(outputRoot, "Реестр_38_рисунков.json"),
  JSON.stringify(register, null, 2),
);
const jobs = figures.map((f) => ({
  file: basename(f.file),
  diagramId: f.diagramId,
  title: f.title,
}));
for (const [name, output, options] of [
  ["Экспорт_PNG.json", "PNG", { format: "png", scale: 1.25 }],
  [
    "Экспорт_PDF.json",
    "PDF",
    {
      format: "pdf",
      page: "A3",
      orientation: "landscape",
      pagination: "poster",
      scale: 1,
      overlap: 24,
    },
  ],
  [
    "Экспорт_PDF_обзор.json",
    "PDF_обзор",
    { format: "pdf", page: "A3", orientation: "landscape", pagination: "fit" },
  ],
] as const)
  await writeFile(
    join(outputRoot, name),
    JSON.stringify({ output, options, jobs }, null, 2),
  );
updateMap();
process.stdout.write(
  JSON.stringify(
    {
      register: join(outputRoot, "Реестр_38_рисунков.json"),
      figures: figures.length,
    },
    null,
    2,
  ),
);
