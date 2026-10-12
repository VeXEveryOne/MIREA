import { writeFile } from "node:fs/promises";
import { BpmnModdle, type BpmnElement } from "bpmn-moddle";
import { captureBpmn } from "../src/notations/bpmn/model";
import { bpmnTextModel } from "../src/notations/bpmn/text";
import { generateUnified } from "../src/language/unified";
import { encodeProject } from "../src/persistence/project";

const factory = new BpmnModdle();
const create = (type: string, props: Record<string, unknown> = {}) =>
  factory.create(type, props);

const start = create("bpmn:StartEvent", {
  id: "Start_Request",
  name: "Потребность в карточке",
});
const init = create("bpmn:ManualTask", {
  id: "Task_Init",
  name: "Инициировать создание или изменение карточки",
});
const bom = create("bpmn:ManualTask", {
  id: "Task_BOM",
  name: "Сформировать BOM и сопоставить позиции поставщиков",
});
const compatibility = create("bpmn:ManualTask", {
  id: "Task_Compatibility",
  name: "Проверить совместимость комплектующих",
});
const compatible = create("bpmn:ExclusiveGateway", {
  id: "Gateway_Compatible",
  name: "Совместимо?",
});
const fixCompatibility = create("bpmn:ManualTask", {
  id: "Task_FixCompatibility",
  name: "Исправить несовместимую конфигурацию",
});
const supplier = create("bpmn:ManualTask", {
  id: "Task_Supplier",
  name: "Получить цены и наличие поставщиков",
});
const available = create("bpmn:ExclusiveGateway", {
  id: "Gateway_Available",
  name: "Комплектующие доступны?",
});
const localReplace = create("bpmn:ManualTask", {
  id: "Task_LocalReplace",
  name: "Локально заменить компонент в отдельных BOM",
});
const calculate = create("bpmn:ManualTask", {
  id: "Task_Calculate",
  name: "Рассчитать цену и вес",
});
const images = create("bpmn:ManualTask", {
  id: "Task_Images",
  name: "Подготовить изображения",
});
const publish = create("bpmn:ManualTask", {
  id: "Task_Publish",
  name: "Повторно ввести данные и отправить карточку",
});
const ozonReview = create("bpmn:ManualTask", {
  id: "Task_OzonReview",
  name: "Проверить карточку",
});
const accepted = create("bpmn:ExclusiveGateway", {
  id: "Gateway_Accepted",
  name: "Карточка принята?",
});
const correct = create("bpmn:ManualTask", {
  id: "Task_Correct",
  name: "Исправить отклонённую карточку",
});
const end = create("bpmn:EndEvent", {
  id: "End_Published",
  name: "Карточка опубликована",
});

const flowElements: BpmnElement[] = [
  start,
  init,
  bom,
  compatibility,
  compatible,
  fixCompatibility,
  supplier,
  available,
  localReplace,
  calculate,
  images,
  publish,
  ozonReview,
  accepted,
  correct,
  end,
];

function connect(
  id: string,
  source: BpmnElement,
  target: BpmnElement,
  name = "",
) {
  const flow = create("bpmn:SequenceFlow", {
    id,
    ...(name ? { name } : {}),
    sourceRef: source,
    targetRef: target,
  });
  const outgoing = Array.isArray(source.outgoing)
    ? (source.outgoing as BpmnElement[])
    : [];
  const incoming = Array.isArray(target.incoming)
    ? (target.incoming as BpmnElement[])
    : [];
  source.set("outgoing", [...outgoing, flow]);
  target.set("incoming", [...incoming, flow]);
  flowElements.push(flow);
  return flow;
}

const flows = [
  connect("Flow_01", start, init),
  connect("Flow_02", init, bom),
  connect("Flow_03", bom, compatibility),
  connect("Flow_04", compatibility, compatible),
  connect("Flow_05", compatible, supplier, "Да"),
  connect("Flow_06", compatible, fixCompatibility, "Нет"),
  connect("Flow_07", fixCompatibility, compatibility, "Повторная проверка"),
  connect("Flow_08", supplier, available),
  connect("Flow_09", available, calculate, "Да"),
  connect("Flow_10", available, localReplace, "Нет"),
  connect("Flow_11", localReplace, compatibility, "Уточнить BOM"),
  connect("Flow_12", calculate, images),
  connect("Flow_13", images, publish),
  connect("Flow_14", publish, ozonReview),
  connect("Flow_15", ozonReview, accepted),
  connect("Flow_16", accepted, end, "Да"),
  connect("Flow_17", accepted, correct, "Нет"),
  connect("Flow_18", correct, publish, "Повторная отправка"),
];

const lanes = [
  create("bpmn:Lane", {
    id: "Lane_Manager",
    name: "Менеджер маркетплейсов",
    flowNodeRef: [start, init, publish, correct, end],
  }),
  create("bpmn:Lane", {
    id: "Lane_Technical",
    name: "Технический специалист",
    flowNodeRef: [
      bom,
      compatibility,
      compatible,
      fixCompatibility,
      localReplace,
      calculate,
    ],
  }),
  create("bpmn:Lane", {
    id: "Lane_Supplier",
    name: "Склад и поставщики",
    flowNodeRef: [supplier, available],
  }),
  create("bpmn:Lane", {
    id: "Lane_Designer",
    name: "Дизайнер",
    flowNodeRef: [images],
  }),
  create("bpmn:Lane", {
    id: "Lane_Ozon",
    name: "Ozon",
    flowNodeRef: [ozonReview, accepted],
  }),
];
const laneSet = create("bpmn:LaneSet", { id: "LaneSet_1", lanes });
const bpmnProcess = create("bpmn:Process", {
  id: "Process_Cards_ASIS",
  name: "Формирование и актуализация карточек товаров AS IS",
  isExecutable: false,
  laneSets: [laneSet],
  flowElements,
});
const participant = create("bpmn:Participant", {
  id: "Participant_Ucoms",
  name: "ООО «Юкомс» · Формирование карточек товаров",
  processRef: bpmnProcess,
});
const collaboration = create("bpmn:Collaboration", {
  id: "Collaboration_Cards",
  participants: [participant],
});

const bounds = (x: number, y: number, width: number, height: number) =>
  create("dc:Bounds", { x, y, width, height });
const shape = (
  element: BpmnElement,
  x: number,
  y: number,
  width: number,
  height: number,
  horizontal?: boolean,
) =>
  create("bpmndi:BPMNShape", {
    id: `${element.id}_di`,
    bpmnElement: element,
    bounds: bounds(x, y, width, height),
    ...(horizontal === undefined ? {} : { isHorizontal: horizontal }),
  });

const positions: Record<string, [number, number, number, number]> = {
  Start_Request: [160, 155, 36, 36],
  Task_Init: [225, 132, 130, 82],
  Task_BOM: [390, 280, 140, 86],
  Task_Compatibility: [565, 280, 140, 86],
  Gateway_Compatible: [740, 298, 50, 50],
  Task_FixCompatibility: [690, 382, 145, 70],
  Task_Supplier: [840, 430, 145, 82],
  Gateway_Available: [1020, 446, 50, 50],
  Task_LocalReplace: [965, 280, 145, 86],
  Task_Calculate: [1145, 280, 130, 82],
  Task_Images: [1140, 580, 135, 82],
  Task_Publish: [1320, 132, 145, 82],
  Task_OzonReview: [1320, 730, 135, 82],
  Gateway_Accepted: [1490, 746, 50, 50],
  Task_Correct: [1485, 132, 145, 82],
  End_Published: [1670, 155, 36, 36],
};

const laneTop = 100;
const laneHeight = 150;
const planeElements: BpmnElement[] = [
  shape(participant, 100, laneTop, 1660, laneHeight * 5, true),
  ...lanes.map((lane, index) =>
    shape(lane, 130, laneTop + index * laneHeight, 1630, laneHeight, true),
  ),
  ...Object.entries(positions).map(([id, [x, y, width, height]]) =>
    shape(
      flowElements.find((element) => element.id === id)!,
      x,
      y,
      width,
      height,
    ),
  ),
];

function waypoint(x: number, y: number) {
  return create("dc:Point", { x, y });
}
function route(flow: BpmnElement): BpmnElement[] {
  const routes: Record<string, Array<[number, number]>> = {
    Flow_01: [
      [196, 173],
      [225, 173],
    ],
    Flow_02: [
      [355, 173],
      [372, 173],
      [372, 323],
      [390, 323],
    ],
    Flow_03: [
      [530, 323],
      [565, 323],
    ],
    Flow_04: [
      [705, 323],
      [740, 323],
    ],
    Flow_05: [
      [790, 323],
      [815, 323],
      [815, 471],
      [840, 471],
    ],
    Flow_06: [
      [765, 348],
      [765, 382],
    ],
    Flow_07: [
      [690, 417],
      [640, 417],
      [640, 366],
    ],
    Flow_08: [
      [985, 471],
      [1020, 471],
    ],
    Flow_09: [
      [1070, 471],
      [1115, 471],
      [1115, 321],
      [1145, 321],
    ],
    Flow_10: [
      [1045, 446],
      [1045, 366],
      [1038, 366],
    ],
    Flow_11: [
      [965, 323],
      [930, 323],
      [930, 260],
      [705, 260],
      [705, 323],
    ],
    Flow_12: [
      [1210, 362],
      [1210, 580],
    ],
    Flow_13: [
      [1275, 621],
      [1295, 621],
      [1295, 173],
      [1320, 173],
    ],
    Flow_14: [
      [1393, 214],
      [1393, 730],
    ],
    Flow_15: [
      [1455, 771],
      [1490, 771],
    ],
    Flow_16: [
      [1540, 771],
      [1645, 771],
      [1645, 173],
      [1670, 173],
    ],
    Flow_17: [
      [1515, 746],
      [1515, 214],
      [1558, 214],
    ],
    Flow_18: [
      [1485, 173],
      [1475, 173],
      [1475, 110],
      [1300, 110],
      [1300, 173],
      [1320, 173],
    ],
  };
  return routes[flow.id!].map(([x, y]) => waypoint(x, y));
}
for (const flow of flows) {
  planeElements.push(
    create("bpmndi:BPMNEdge", {
      id: `${flow.id}_di`,
      bpmnElement: flow,
      waypoint: route(flow),
    }),
  );
}

const plane = create("bpmndi:BPMNPlane", {
  id: "Plane_Cards",
  bpmnElement: collaboration,
  planeElement: planeElements,
});
const diagram = create("bpmndi:BPMNDiagram", {
  id: "Diagram_Cards",
  plane,
});
const definitions = create("bpmn:Definitions", {
  id: "Definitions_Cards",
  targetNamespace: "urn:omninotation:rop:cards",
  rootElements: [bpmnProcess, collaboration],
  diagrams: [diagram],
});
const data = captureBpmn(definitions);
const source = generateUnified(bpmnTextModel(data));
const document = {
  formatVersion: 3 as const,
  notation: "BPMN" as const,
  ...data,
  source,
  draft: source,
};
const output = process.argv[2];
if (!output) throw new Error("Укажите путь выходного .omni.");
await writeFile(output, await encodeProject(document), "utf8");
console.log(output);
