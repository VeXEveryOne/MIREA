import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { decodeProject } from "../src/persistence/project";
import { exportSheets } from "../src/export/model";
import { inputRoot, writeDocument, writeReport } from "./rop/source";
const figures: unknown[] = [];
for (const [file, first, count] of [
  ["ПР1_IDEF0_AS_IS.nsidef0", 1, 2],
  ["ПР1_BPMN_AS_IS.nsbpmn", 3, 2],
  ["ПР2_IDEF0_TO_BE.nsidef0", 6, 2],
  ["ПР2_BPMN_TO_BE.nsbpmn", 8, 3],
] as const) {
  const source = join(inputRoot, "Модели_OmniNotation", file),
    raw = await readFile(source, "utf8"),
    document = await decodeProject(raw),
    sheets = exportSheets(document);
  if (sheets.length !== count)
    throw new Error(
      `${file}: изменилось число листов; пересмотрите соответствие рисунков.`,
    );
  const target = await writeDocument(
    file.replace(/\.[^.]+$/, ".omni"),
    `rop-${document.notation.toLowerCase()}-${first === 1 || first === 3 ? "as-is" : "to-be"}.omni`,
    document,
  );
  for (const [i, sheet] of sheets.entries())
    figures.push({
      figure: first + i,
      source,
      sha256: createHash("sha256").update(raw).digest("hex"),
      file: target,
      diagramId: sheet.id,
      title: sheet.title,
      manualReview: "не выполнена",
      export: null,
    });
}
process.stdout.write(
  await writeReport("РОП_Прежние_модели_перенос.json", {
    figures,
    differences: [
      "Прежние файлы прочитаны штатным декодером и сохранены собственным JSON-кодеком с расширением .omni. Исходные файлы не изменены.",
    ],
    unresolved: [],
  }),
);
