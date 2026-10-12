import type { Document, Model } from "./model";
import { parse } from "../language/parser";
import { generate, patchSource } from "../language/generator";
export function createDocument(example = false): Document {
  const model: Model = example
    ? {
        id: "orders",
        label: "Обработка заказов",
        blocks: [
          { id: "customer", kind: "entity", label: "Клиент" },
          { id: "receive", kind: "process", label: "Принять заказ" },
          { id: "orders", kind: "store", label: "Заказы" },
          { id: "fulfil", kind: "process", label: "Собрать заказ" },
          { id: "warehouse", kind: "entity", label: "Склад" },
        ],
        flows: [
          {
            id: "request",
            source: "customer",
            target: "receive",
            label: "Заказ",
          },
          {
            id: "record",
            source: "receive",
            target: "orders",
            label: "Данные заказа",
          },
          {
            id: "read",
            source: "orders",
            target: "fulfil",
            label: "Состав заказа",
          },
          {
            id: "shipment",
            source: "fulfil",
            target: "warehouse",
            label: "Задание на отгрузку",
          },
          {
            id: "confirmation",
            source: "receive",
            target: "customer",
            label: "Подтверждение",
          },
        ],
      }
    : { id: "diagram", label: "Новая диаграмма", blocks: [], flows: [] };
  const source = generate(model);
  return {
    formatVersion: 3,
    notation: "DFD",
    model,
    source,
    draft: source,
    layout: {
      positions: example
        ? {
            customer: { x: 40, y: 140 },
            receive: { x: 340, y: 140 },
            orders: { x: 640, y: 140 },
            fulfil: { x: 640, y: 380 },
            warehouse: { x: 940, y: 380 },
          }
        : {},
      routes: {},
      labels: {},
      attachments: {},
    },
    settings: { snapToGrid: true },
  };
}
export function applyText(
  doc: Document,
  draft: string,
  parsed = parse(draft),
): Document {
  if (!parsed.model) return { ...doc, draft };
  const positions = Object.fromEntries(
    parsed.model.blocks.map((b, i) => [
      b.id,
      doc.layout.positions[b.id] ?? {
        x: 80 + (i % 4) * 240,
        y: 80 + Math.floor(i / 4) * 180,
      },
    ]),
  );
  return {
    ...doc,
    model: parsed.model,
    draft,
    source: draft,
    layout: {
      positions,
      routes: Object.fromEntries(
        parsed.model.flows
          .filter((flow) => Object.hasOwn(doc.layout.routes, flow.id))
          .map((flow) => [flow.id, doc.layout.routes[flow.id]]),
      ),
      labels: Object.fromEntries(
        parsed.model.flows
          .filter((flow) => Object.hasOwn(doc.layout.labels, flow.id))
          .map((flow) => [flow.id, doc.layout.labels[flow.id]]),
      ),
      attachments: Object.fromEntries(
        parsed.model.flows
          .filter((flow) => Object.hasOwn(doc.layout.attachments, flow.id))
          .map((flow) => [flow.id, doc.layout.attachments[flow.id]]),
      ),
    },
  };
}
export function applyVisual(
  doc: Document,
  model: Model,
  positions = doc.layout.positions,
): Document {
  if (doc.draft !== doc.source)
    throw new Error("Сначала исправьте или отмените текстовый черновик.");
  const source = patchSource(doc.source, doc.model, model);
  const result = parse(source);
  if (!result.model)
    throw new Error("Изменение создаёт неверные ссылки или идентификаторы.");
  return {
    ...doc,
    model,
    source,
    draft: source,
    layout: {
      positions: Object.fromEntries(
        model.blocks.map((b, i) => [
          b.id,
          positions[b.id] ?? {
            x: 100 + (i % 4) * 220,
            y: 100 + Math.floor(i / 4) * 160,
          },
        ]),
      ),
      routes: Object.fromEntries(
        model.flows
          .filter((flow) => Object.hasOwn(doc.layout.routes, flow.id))
          .map((flow) => [flow.id, doc.layout.routes[flow.id]]),
      ),
      labels: Object.fromEntries(
        model.flows
          .filter((flow) => Object.hasOwn(doc.layout.labels, flow.id))
          .map((flow) => [flow.id, doc.layout.labels[flow.id]]),
      ),
      attachments: Object.fromEntries(
        model.flows
          .filter((flow) => Object.hasOwn(doc.layout.attachments, flow.id))
          .map((flow) => [flow.id, doc.layout.attachments[flow.id]]),
      ),
    },
  };
}
