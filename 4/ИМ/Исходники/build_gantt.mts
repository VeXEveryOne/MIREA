import { readFile, writeFile } from "node:fs/promises";
import path from 'node:path';
import {MODEL_DIR, OMNI_ROOT, omniModule} from './runtime.mjs';
const {decodeProject, encodeProject} = await omniModule('src/persistence/project.ts');

const input = path.join(OMNI_ROOT, 'examples/im/im-plan.omni');
const output = path.join(MODEL_DIR, 'ИМ_ПР11_Гант.omni');
const raw = await readFile(input, "utf8");
const doc: any = await decodeProject(raw);
const oldDescription =
  "Часы распределены равномерно; роль разработчика ограничена 32 ч/нед. (6.4 ч/день).";
const newDescription =
  "Часы распределены равномерно; доступность разработчика ограничена 40 ч/нед. Максимальная расчётная загрузка составляет 36 ч/нед.";
doc.source = doc.source
  .replace(oldDescription, newDescription)
  .replace(
    "resource developer Разработчик capacityHoursPerDay=6.4",
    "resource developer Разработчик capacityHoursPerDay=8",
  );
doc.draft = doc.source;
const plan = doc.model.elements.find((item: any) => item.id === "plan");
plan.properties.description = plan.properties.description.replace(
  oldDescription,
  newDescription,
);
const developer = doc.model.elements.find((item: any) => item.id === "developer");
developer.properties.capacityHoursPerDay = "8";
await writeFile(output, `${await encodeProject(doc)}\n`, "utf8");
console.log(output);
