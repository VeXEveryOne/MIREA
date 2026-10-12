import { BpmnModdle, type BpmnElement } from "bpmn-moddle";
import { z } from "zod";

export type BpmnValue = string | number | boolean | { ref: string };
export interface BpmnRecord {
  type: string;
  properties: Record<string, BpmnValue | BpmnValue[]>;
  attributes?: Record<string, string>;
}
export interface BpmnData {
  model: { root: string; objects: Record<string, BpmnRecord> };
  layout: { objects: Record<string, BpmnRecord> };
}
const scalar = z.union([
  z.string().max(2_000_000),
  z.number().finite(),
  z.boolean(),
  z.object({ ref: z.string().max(500) }).strict(),
]);
const record = z
  .object({
    type: z.string().max(200),
    properties: z.record(
      z.string(),
      z.union([scalar, z.array(scalar).max(30000)]),
    ),
    attributes: z.record(z.string(), z.string()).optional(),
  })
  .strict();
export const bpmnDataSchema = z
  .object({
    model: z
      .object({
        root: z.string().max(500),
        objects: z.record(z.string(), record),
      })
      .strict(),
    layout: z.object({ objects: z.record(z.string(), record) }).strict(),
  })
  .strict();
const isLayout = (type: string) => /^(bpmndi|dc|di|bioc|color):/.test(type);
const forbidden = (name: string) =>
  ["__proto__", "prototype", "constructor"].includes(name);

/** Own JSON graph. References are explicit; semantic objects and presentation objects are separate. */
export function captureBpmn(definitions: BpmnElement): BpmnData {
  const model: BpmnData["model"] = { root: "", objects: {} };
  const layout: BpmnData["layout"] = { objects: {} };
  const keys = new Map<BpmnElement, string>();
  const queue: BpmnElement[] = [];
  const ids = new Set<string>();
  let anonymous = 0;
  function reference(element: BpmnElement): { ref: string } {
    let key = keys.get(element);
    if (!key) {
      if (element.id) {
        if (ids.has(element.id))
          throw new Error(`Повторный BPMN ID: ${element.id}`);
        ids.add(element.id);
      }
      key = element.id ? "id:" + element.id : "object:" + ++anonymous;
      keys.set(element, key);
      queue.push(element);
    }
    return { ref: key };
  }
  model.root = reference(definitions).ref;
  for (let index = 0; index < queue.length; index++) {
    if (queue.length > 50000) throw new Error("Слишком много объектов BPMN.");
    const element = queue[index];
    if (element.$descriptor.isGeneric)
      throw new Error(
        "Неизвестное расширение BPMN нельзя сохранить без потерь.",
      );
    const properties: BpmnRecord["properties"] = {};
    const value = (v: unknown): BpmnValue => {
      if (
        typeof v === "string" ||
        typeof v === "boolean" ||
        (typeof v === "number" && Number.isFinite(v))
      )
        return v;
      if (v && typeof v === "object" && "$type" in v)
        return reference(v as BpmnElement);
      throw new Error("Неподдерживаемое значение в модели BPMN.");
    };
    for (const property of element.$descriptor.properties) {
      if (property.isVirtual || !Object.hasOwn(element, property.name))
        continue;
      const v = element[property.name];
      if (v === undefined || v === null) continue;
      properties[property.name] = Array.isArray(v) ? v.map(value) : value(v);
    }
    const record: BpmnRecord = { type: element.$type, properties };
    if (element.$attrs && Object.keys(element.$attrs).length)
      record.attributes = { ...element.$attrs };
    (isLayout(element.$type) ? layout.objects : model.objects)[
      keys.get(element)!
    ] = record;
  }
  return { model, layout };
}

/** Restore engine objects from our JSON. No text interchange format or parser is involved. */
export function restoreBpmn(
  data: BpmnData,
  factory = new BpmnModdle(),
): {
  definitions: BpmnElement;
  elementsById: Record<string, BpmnElement>;
  elements: BpmnElement[];
} {
  const checked = bpmnDataSchema.safeParse({
    model: data.model,
    layout: data.layout,
  });
  if (!checked.success)
    throw new Error("Неверная структура собственной модели BPMN.");
  const records = { ...data.model.objects, ...data.layout.objects };
  if (
    Object.keys(records).length > 50000 ||
    Object.keys(records).length !==
      Object.keys(data.model.objects).length +
        Object.keys(data.layout.objects).length
  )
    throw new Error("Неверное число объектов BPMN или повторные ключи.");
  const objects = new Map<string, BpmnElement>();
  const elementsById: Record<string, BpmnElement> = Object.create(
    null,
  ) as Record<string, BpmnElement>;
  for (const [key, record] of Object.entries(records)) {
    if (
      forbidden(key) ||
      isLayout(record.type) !== Object.hasOwn(data.layout.objects, key)
    )
      throw new Error(
        "Семантика BPMN и расположение должны храниться отдельно.",
      );
    if (!/^(bpmn|bpmndi|dc|di|bioc|color):/.test(record.type))
      throw new Error("Неподдерживаемый тип BPMN: " + record.type);
    const element = factory.create(record.type);
    objects.set(key, element);
  }
  const parents = new Map<BpmnElement, BpmnElement>();
  for (const [key, record] of Object.entries(records)) {
    const element = objects.get(key)!;
    for (const [name, raw] of Object.entries(record.properties)) {
      const descriptor = element.$descriptor.propertiesByName[name];
      if (forbidden(name) || !descriptor || descriptor.isVirtual)
        throw new Error("Неизвестное свойство BPMN: " + name);
      if (Array.isArray(raw) !== !!descriptor.isMany)
        throw new Error("Неверная кратность свойства BPMN: " + name);
      const decode = (v: BpmnValue): unknown => {
        if (typeof v !== "object") {
          if (
            descriptor.isReference ||
            (!descriptor.isAttr &&
              !["String", "Boolean", "Integer", "Real"].includes(
                descriptor.type,
              ))
          )
            throw new Error("Ожидалась ссылка BPMN: " + name);
          if (
            (descriptor.type === "Boolean" && typeof v !== "boolean") ||
            (["Integer", "Real"].includes(descriptor.type) &&
              typeof v !== "number") ||
            (descriptor.type === "String" && typeof v !== "string")
          )
            throw new Error("Неверный тип значения BPMN: " + name);
          return v;
        }
        const target = objects.get(v.ref);
        if (!target) throw new Error("Не найдена ссылка BPMN: " + v.ref);
        if (
          descriptor.type !== "Element" &&
          !target.$instanceOf(descriptor.type)
        )
          throw new Error("Несовместимый тип ссылки BPMN: " + name);
        if (!descriptor.isReference) {
          if (parents.has(target) && parents.get(target) !== element)
            throw new Error("У BPMN-объекта несколько владельцев.");
          parents.set(target, element);
          target.$parent = element;
        }
        return target;
      };
      element.set(name, Array.isArray(raw) ? raw.map(decode) : decode(raw));
    }
    if (record.attributes) {
      if (Object.keys(record.attributes).some(forbidden))
        throw new Error("Недопустимый атрибут BPMN.");
      Object.assign(element.$attrs!, record.attributes);
    }
    if (element.id) {
      if (
        typeof element.id !== "string" ||
        Object.hasOwn(elementsById, element.id)
      )
        throw new Error("Повторный или неверный BPMN ID.");
      elementsById[element.id] = element;
    }
  }
  const definitions = objects.get(data.model.root);
  if (definitions?.$type !== "bpmn:Definitions")
    throw new Error("Не найден корень модели BPMN.");
  for (const element of objects.values()) {
    let current: BpmnElement | undefined = element;
    const visited = new Set<BpmnElement>();
    while (current && current !== definitions) {
      if (visited.has(current)) throw new Error("Цикл вложенности BPMN.");
      visited.add(current);
      current = parents.get(current);
    }
    if (!current) throw new Error("BPMN-объект не принадлежит документу.");
  }
  factory.ids?.clear();
  for (const [id, element] of Object.entries(elementsById))
    factory.ids?.claim(id, element);
  return { definitions, elementsById, elements: [...objects.values()] };
}
export function initialBpmnData(): BpmnData {
  const factory = new BpmnModdle();
  const create = (type: string, props: Record<string, unknown> = {}) =>
    factory.create(type, props);
  const start = create("bpmn:StartEvent", { id: "Start_1", name: "Начало" });
  const task = create("bpmn:Task", { id: "Task_1", name: "Обработать заявку" });
  const end = create("bpmn:EndEvent", { id: "End_1", name: "Завершено" });
  const flow1 = create("bpmn:SequenceFlow", {
    id: "Flow_1",
    sourceRef: start,
    targetRef: task,
  });
  const flow2 = create("bpmn:SequenceFlow", {
    id: "Flow_2",
    sourceRef: task,
    targetRef: end,
  });
  start.set("outgoing", [flow1]);
  task.set("incoming", [flow1]);
  task.set("outgoing", [flow2]);
  end.set("incoming", [flow2]);
  const process = create("bpmn:Process", {
    id: "Process_1",
    name: "Новый процесс",
    isExecutable: false,
    flowElements: [start, task, end, flow1, flow2],
  });
  const shape = (
    element: BpmnElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ) =>
    create("bpmndi:BPMNShape", {
      id: element.id + "_di",
      bpmnElement: element,
      bounds: create("dc:Bounds", { x, y, width, height }),
    });
  const edge = (element: BpmnElement, x1: number, x2: number) =>
    create("bpmndi:BPMNEdge", {
      id: element.id + "_di",
      bpmnElement: element,
      waypoint: [
        create("dc:Point", { x: x1, y: 178 }),
        create("dc:Point", { x: x2, y: 178 }),
      ],
    });
  const plane = create("bpmndi:BPMNPlane", {
    id: "Plane_1",
    bpmnElement: process,
    planeElement: [
      shape(start, 180, 160, 36, 36),
      shape(task, 280, 138, 120, 80),
      shape(end, 470, 160, 36, 36),
      edge(flow1, 216, 280),
      edge(flow2, 400, 470),
    ],
  });
  const diagram = create("bpmndi:BPMNDiagram", { id: "Diagram_1", plane });
  return captureBpmn(
    create("bpmn:Definitions", {
      id: "Definitions_1",
      targetNamespace: "urn:omninotation:bpmn",
      rootElements: [process],
      diagrams: [diagram],
    }),
  );
}
