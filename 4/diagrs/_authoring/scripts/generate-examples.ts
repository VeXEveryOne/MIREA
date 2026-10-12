import { mkdir, writeFile } from "node:fs/promises";
import { createDocument } from "../src/domain/document";
import { encode } from "../src/persistence/format";
import { createBpmnDocument } from "../src/notations/bpmn/document";
import {
  addIdef0Context,
  idef0DocumentFromSource,
} from "../src/notations/idef0/document";
import {
  contextExample,
  decompositionExample,
} from "../src/notations/idef0/examples";
import { encodeProject } from "../src/persistence/project";

function createExampleIdFactory() {
  const counters = new Map<string, number>();
  return (prefix: string) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_example_${next}`;
  };
}

await mkdir("examples", { recursive: true });
await writeFile("examples/orders.omni", encode(createDocument(true)), "utf8");
await writeFile(
  "examples/process.omni",
  await encodeProject(createBpmnDocument()),
  "utf8",
);
for (const [name, source] of [
  ["cards-context", contextExample],
  ["cards-decomposition", decompositionExample],
]) {
  await writeFile(
    `examples/${name}.omni`,
    await encodeProject(idef0DocumentFromSource(source)),
    "utf8",
  );
}
await writeFile(
  "examples/cards-hierarchy.omni",
  await encodeProject(
    addIdef0Context(
      idef0DocumentFromSource(decompositionExample),
      createExampleIdFactory(),
    ),
  ),
  "utf8",
);
console.log("Generated versioned JSON examples.");
