import { writeFile } from "node:fs/promises";
import { createUmlExample } from "../src/notations/uml/examples";
import { encodeProject } from "../src/persistence/project";
await writeFile(
  "examples/cards-uml.omni",
  await encodeProject(createUmlExample()),
  "utf8",
);
console.log("Generated examples/cards-uml.omni: five linked UML diagrams.");
