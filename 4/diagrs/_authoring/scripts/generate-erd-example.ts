import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createErdExample } from "../src/notations/erd/examples";
import { encodeProject } from "../src/persistence/project";
import { generateErdDdl } from "../src/notations/erd/ddl";
const document = createErdExample();
await writeFile("examples/bom-erd.omni", await encodeProject(document), "utf8");
execFileSync(process.execPath, ["scripts/generate-project-map.mjs"], {
  stdio: "inherit",
});
await writeFile("examples/bom-erd.sql", generateErdDdl(document).sql, "utf8");
execFileSync(process.execPath, ["scripts/generate-project-map.mjs"], {
  stdio: "inherit",
});
console.log(
  "Созданы examples/bom-erd.omni и bom-erd.sql: одна модель, два листа, составной FK и индекс DESC.",
);
