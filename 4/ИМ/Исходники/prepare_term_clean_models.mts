import { readFile, writeFile } from "node:fs/promises";
import path from 'node:path';
import {MODEL_DIR, OMNI_ROOT, omniModule} from './runtime.mjs';
const {decodeProject, encodeProject} = await omniModule('src/persistence/project.ts');

async function prepare(input: string, output: string) {
  let raw = await readFile(input, "utf8");
  raw = raw
    .replaceAll("BomVersion", "ModelRangeVersion")
    .replaceAll("BomItem", "ModelRangeItem")
    .replaceAll("BOM", "модельный ряд");
  const document = await decodeProject(raw);
  await writeFile(output, `${await encodeProject(document)}\n`, "utf8");
  console.log(output);
}

await prepare(
  path.join(OMNI_ROOT, 'examples/im/im-architecture.omni'),
  path.join(MODEL_DIR, 'ИМ_ПР9-10_Архитектура.omni'),
);
await prepare(
  path.join(MODEL_DIR, 'ИМ_ПР11_Гант.omni'),
  path.join(MODEL_DIR, 'ИМ_ПР11_Гант.omni'),
);
await prepare(
  path.join(OMNI_ROOT, 'examples/im/im-furps.omni'),
  path.join(MODEL_DIR, 'ИМ_ПР6_FURPS.omni'),
);
