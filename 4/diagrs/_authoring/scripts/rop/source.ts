import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import { encodeProject } from "../../src/persistence/project";
import type { ProjectDocument } from "../../src/domain/project";

export const inputRoot = resolve(
  process.argv[2] ?? "D:/GitHub/MIREA/4/РОП/Практики_1-8",
);
export const outputRoot = resolve(
  process.argv[3] ?? join(inputRoot, "Модели_OmniNotation_v2"),
);
const node = z
  .object({
    id: z.string(),
    label: z.string(),
    x: z.number().finite(),
    y: z.number().finite(),
    w: z.number().positive(),
    h: z.number().positive(),
    kind: z.string(),
    body: z.string().nullable(),
  })
  .strict();
const edge = z
  .object({
    source: z.string(),
    target: z.string(),
    label: z.string(),
    points: z.array(z.tuple([z.number().finite(), z.number().finite()])),
    style: z.string(),
  })
  .strict();
export const draftSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    practice: z.number(),
    requirement: z.string(),
    status: z.string(),
    note: z.string(),
    width: z.number(),
    height: z.number(),
    nodes: z.array(node),
    edges: z.array(edge),
  })
  .strict();
export type Draft = z.infer<typeof draftSchema>;
export async function readDraft(id: string) {
  const path = join(inputRoot, "Черновики_схем", id + ".draft.json"),
    raw = await readFile(path, "utf8");
  return {
    draft: draftSchema.parse(JSON.parse(raw)),
    path,
    sha256: createHash("sha256").update(raw).digest("hex"),
  };
}
export function updateMap() {
  execFileSync(process.execPath, ["scripts/generate-project-map.mjs"], {
    stdio: "inherit",
  });
}
export async function uniquePath(name: string) {
  await mkdir(outputRoot, { recursive: true });
  let path = join(outputRoot, name),
    n = 2;
  while (true) {
    try {
      await access(path);
      path = join(outputRoot, name.replace(/(\.[^.]+)$/, `_${n++}$1`));
    } catch {
      return path;
    }
  }
}
export async function writeDocument(
  name: string,
  example: string,
  document: ProjectDocument,
) {
  const path = await uniquePath(name),
    raw = await encodeProject(document);
  await writeFile(path, raw, { encoding: "utf8", flag: "wx" });
  await writeFile(join("examples", example), raw, "utf8");
  updateMap();
  return path;
}
export async function writeReport(name: string, data: unknown) {
  const path = await uniquePath(name);
  await writeFile(path, JSON.stringify(data, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
  return path;
}
export function anchor(node: Draft["nodes"][number], point?: [number, number]) {
  if (!point) return { side: "bottom" as const, offset: 0.5 };
  const [x, y] = point,
    distances = [
      Math.abs(x - node.x),
      Math.abs(x - node.x - node.w),
      Math.abs(y - node.y),
      Math.abs(y - node.y - node.h),
    ];
  const side = (["left", "right", "top", "bottom"] as const)[
    distances.indexOf(Math.min(...distances))
  ];
  return {
    side,
    offset: Math.max(
      0,
      Math.min(
        1,
        side === "left" || side === "right"
          ? (y - node.y) / node.h
          : (x - node.x) / node.w,
      ),
    ),
  };
}
