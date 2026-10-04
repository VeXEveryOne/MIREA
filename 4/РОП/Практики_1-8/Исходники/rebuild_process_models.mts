import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { ROOT as root, MODEL_DIR as canonical, omniModule } from './runtime.mjs';
const {idef0DocumentFromSource, layoutIdef0} = await omniModule('src/notations/idef0/document.ts');
const {arrowAnchor} = await omniModule('src/notations/idef0/arrows.ts');
const {validateIdef0Complete} = await omniModule('src/notations/idef0/model.ts');
const {bpmnAdapter} = await omniModule('src/notations/bpmn/adapter.ts');
const {validateBpmnData} = await omniModule('src/notations/bpmn/validation.ts');
const {decodeProject, encodeProject} = await omniModule('src/persistence/project.ts');

type Role = "input" | "control" | "output" | "mechanism";
type Side = "left" | "top" | "right" | "bottom";
type Interface = {
  id: string;
  label: string;
  role: Role;
  side: Side;
  target: string;
};
type Feedback = { id: string; label: string; from: string; to: string };
type Idef0Spec = {
  key: "AS_IS" | "TO_BE";
  title: string;
  purpose: string;
  date: string;
  project: string;
  functions: string[];
  interfaces: Interface[];
  steps: string[];
  feedback: Feedback[];
};

const q = (value: string) => JSON.stringify(value);

const asIsIdef0: Idef0Spec = {
  key: "AS_IS",
  title: "Вручную формировать и актуализировать карточки компьютерных систем",
  purpose: "Показать разрозненные ручные операции, повторный ввод и позднее обнаружение ошибок",
  date: "28.09.2026",
  project: "РОП Практика 1 — ООО Юкомс",
  functions: [
    "Получить неформальный запрос и найти исходные материалы",
    "Скопировать предыдущий состав и вручную подобрать комплектующие",
    "Проверить совместимость по опыту, сайтам и переписке",
    "Запросить и вручную свести цены и остатки поставщиков",
    "Отдельно рассчитать цену и массу, подготовить изображения и текст",
    "Повторно ввести данные в Ozon и исправлять отклонения",
  ],
  interfaces: [
    { id: "request", label: "Запрос из почты или мессенджера", role: "input", side: "left", target: "A1" },
    { id: "data", label: "Разрозненные прайс-листы, остатки, характеристики и изображения", role: "input", side: "left", target: "A2" },
    { id: "assignment", label: "Неформальный порядок назначения исполнителей", role: "control", side: "top", target: "A1" },
    { id: "templates", label: "Локальные шаблоны Excel и устные договорённости", role: "control", side: "top", target: "A2" },
    { id: "compatibility", label: "Неформализованные правила совместимости", role: "control", side: "top", target: "A3" },
    { id: "supplierRoutine", label: "Привычный способ запроса и сведения предложений", role: "control", side: "top", target: "A4" },
    { id: "calculation", label: "Формулы цены и массы, обновляемые вручную", role: "control", side: "top", target: "A5" },
    { id: "ozon", label: "Требования Ozon, проверяемые при заполнении", role: "control", side: "top", target: "A6" },
    { id: "table", label: "Локальная таблица состава без гарантированной версии", role: "output", side: "right", target: "A2" },
    { id: "values", label: "Рассчитанные вручную цена, масса, изображения и текст", role: "output", side: "right", target: "A5" },
    { id: "card", label: "Карточка в Ozon или отклонение", role: "output", side: "right", target: "A6" },
    { id: "waste", label: "Расхождения, замечания и повторная работа", role: "output", side: "right", target: "A6" },
    { id: "manager", label: "Менеджер маркетплейсов", role: "mechanism", side: "bottom", target: "A1" },
    { id: "staff", label: "Технический специалист, склад и дизайнер", role: "mechanism", side: "bottom", target: "A3" },
    { id: "desktop", label: "Excel, калькулятор и браузер", role: "mechanism", side: "bottom", target: "A5" },
    { id: "messages", label: "Почта, мессенджеры и общие папки", role: "mechanism", side: "bottom", target: "A4" },
    { id: "seller", label: "Кабинет Ozon Seller", role: "mechanism", side: "bottom", target: "A6" },
  ],
  steps: [
    "Найденные файлы и выбранная таблица",
    "Черновой состав в локальном файле",
    "Состав после ручной проверки",
    "Сведённые вручную цены и остатки",
    "Файлы и значения для повторного ввода",
  ],
  feedback: [
    { id: "compat", label: "Несовместимость и ручные замечания", from: "A3", to: "A2" },
    { id: "unavailable", label: "Нет товара или сведения устарели", from: "A4", to: "A2" },
    { id: "missing", label: "Не хватает характеристик или файлов", from: "A5", to: "A2" },
    { id: "rejected", label: "Отклонение Ozon и повторное исправление", from: "A6", to: "A5" },
  ],
};

const toBeIdef0: Idef0Spec = {
  key: "TO_BE",
  title: "Управлять подготовкой и публикацией карточек компьютерных систем",
  purpose: "Спроектировать единый версионированный процесс с автоматическими проверками и управляемой публикацией",
  date: "28.09.2026",
  project: "РОП Практика 2 — ООО Юкомс",
  functions: [
    "Зарегистрировать запрос и открыть управляемую версию",
    "Импортировать предложения и сформировать конфигурацию",
    "Проверить и зафиксировать неизменяемый снимок",
    "Рассчитать показатели, сформировать и утвердить контент",
    "Опубликовать, сверить результат и зафиксировать аудит",
  ],
  interfaces: [
    { id: "request", label: "Зарегистрированный запрос на создание или изменение", role: "input", side: "left", target: "A1" },
    { id: "catalog", label: "Справочник компонентов и характеристики", role: "input", side: "left", target: "A2" },
    { id: "offers", label: "Потоки предложений поставщиков и шаблоны контента", role: "input", side: "left", target: "A2" },
    { id: "states", label: "Модель состояний, версии и правила утверждения", role: "control", side: "top", target: "A1" },
    { id: "mapping", label: "Правила сопоставления SKU и выбора предложений", role: "control", side: "top", target: "A2" },
    { id: "rules", label: "Версионируемые правила совместимости, выбора, цены и массы", role: "control", side: "top", target: "A3" },
    { id: "ozon", label: "Схема и требования Ozon к карточке", role: "control", side: "top", target: "A4" },
    { id: "approval", label: "Маршрут проверки и критерии утверждения версии", role: "control", side: "top", target: "A4" },
    { id: "security", label: "RBAC, идемпотентность и политика повторов", role: "control", side: "top", target: "A5" },
    { id: "version", label: "Проверенная неизменяемая версия модельного ряда", role: "output", side: "right", target: "A3" },
    { id: "content", label: "Воспроизводимый расчёт и версия контента", role: "output", side: "right", target: "A4" },
    { id: "status", label: "Подтверждённый статус публикации и внешний ID", role: "output", side: "right", target: "A5" },
    { id: "audit", label: "Журнал аудита и уведомления ответственным", role: "output", side: "right", target: "A5" },
    { id: "roles", label: "Сотрудники с назначенными ролями", role: "mechanism", side: "bottom", target: "A1" },
    { id: "system", label: "Единая информационная система и API", role: "mechanism", side: "bottom", target: "A3" },
    { id: "storage", label: "PostgreSQL и файловое хранилище", role: "mechanism", side: "bottom", target: "A4" },
    { id: "adapters", label: "Адаптеры поставщиков и механизм правил", role: "mechanism", side: "bottom", target: "A2" },
    { id: "worker", label: "Worker и адаптер Ozon", role: "mechanism", side: "bottom", target: "A5" },
  ],
  steps: [
    "Черновая версия модельного ряда",
    "Версия с выбранными предложениями",
    "Проверенный неизменяемый снимок",
    "Утверждённая версия карточки и ключ операции",
  ],
  feedback: [
    { id: "correction", label: "Протокол проверки с точными причинами", from: "A3", to: "A2" },
  ],
};

function buildIdef0(spec: Idef0Spec) {
  const lines: string[] = [
    `idef0 rop_cards ${q(`Карточки компьютерных систем ООО Юкомс ${spec.key.replace("_", " ")}`)}`,
  ];
  const add = (line: string) => lines.push(line);
  const sheet = (id: string, node: string, parent = "") =>
    add(
      `diagram ${id} ${q(spec.title)} ${parent ? `in=${parent} ` : ""}node=${node} purpose=${q(spec.purpose)} viewpoint="Менеджер маркетплейсов" author="Албахтин И.В." date=${q(spec.date)} project=${q(spec.project)} status=publication context=${node === "A-0" ? "TOP" : "A-0"} pageNumber=${node === "A-0" ? "1" : "2"}`,
    );
  sheet("context", "A-0");
  add(`function root ${q(spec.title)} in=context number=0`);
  const boundary = (item: Interface, prefix: string, owner: string, parent = false) => {
    const outgoing = item.role === "output";
    add(
      `boundary ${prefix}${item.id} ${q(item.label)} in=${owner} side=${item.side} direction=${outgoing ? "out" : "in"}${parent ? ` parentArrow=c_${item.id} parentEnd=${outgoing ? "from" : "to"}` : ""}`,
    );
    const functionId = parent ? item.target : "root";
    add(
      `arrow ${parent ? "d" : "c"}_${item.id} ${q(item.label)} from=${outgoing ? functionId : prefix + item.id} to=${outgoing ? prefix + item.id : functionId} role=${item.role}`,
    );
  };
  spec.interfaces.forEach((item) => boundary(item, "ctx_", "context"));
  sheet("decomposition", "A0", "root");
  spec.functions.forEach((label, index) =>
    add(`function A${index + 1} ${q(label)} in=decomposition number=${index + 1}`),
  );
  spec.interfaces.forEach((item) => boundary(item, "dec_", "decomposition", true));
  spec.steps.forEach((label, index) =>
    add(
      `arrow step${index + 1}${index + 2} ${q(label)} from=A${index + 1} to=A${index + 2} role=input`,
    ),
  );
  spec.feedback.forEach((item) =>
    add(`arrow feedback_${item.id} ${q(item.label)} from=${item.from} to=${item.to} role=control`),
  );
  let document = idef0DocumentFromSource(lines.join("\n") + "\n");
  const frameContext = { x: 0, y: 0, width: 2100, height: 980 };
  const frameDecomposition = { x: 0, y: 0, width: 3000, height: 1600 };
  document.layout.frames = { context: frameContext, decomposition: frameDecomposition };
  document.layout.positions.root = { x: 690, y: 335 };
  document.layout.sizes.root = { width: 720, height: 250 };
  // AS IS preserves the long manual staircase. TO BE is a regular managed
  // pipeline. The different geometry reinforces the change in the process,
  // while explicit ICOM lanes below keep both diagrams readable.
  const functionPositions = spec.key === "AS_IS"
    ? [
        { x: 140, y: 230 },
        { x: 600, y: 410 },
        { x: 1060, y: 590 },
        { x: 1520, y: 770 },
        { x: 1980, y: 950 },
        { x: 2440, y: 1130 },
      ]
    : [
        { x: 100, y: 650 },
        { x: 650, y: 650 },
        { x: 1200, y: 650 },
        { x: 1750, y: 650 },
        { x: 2300, y: 650 },
      ];
  functionPositions.forEach((position, index) => {
    document.layout.positions[`A${index + 1}`] = position;
    document.layout.sizes[`A${index + 1}`] = spec.key === "AS_IS"
      ? { width: 360, height: 160 }
      : { width: 420, height: 190 };
  });

  // Give every arrow a stable editable layout record before routing.
  for (const edge of document.model.edges)
    document.layout.arrows[edge.id] = {
      ...document.layout.arrows[edge.id],
      fromOffset: 0.5,
      toOffset: 0.5,
    };

  const byRole = (role: Role) => spec.interfaces.filter((item) => item.role === role);
  for (const role of ["input", "control", "output", "mechanism"] as Role[]) {
    const items = byRole(role);
    items.forEach((item, index) => {
      const offset = (index + 1) / (items.length + 1);
      const arrow = document.layout.arrows[`c_${item.id}`];
      if (role === "output") arrow.fromOffset = offset;
      else arrow.toOffset = offset;
    });
  }

  // Decomposition ports are distributed only among arrows that use the same
  // ICOM side of the same function. This prevents piled-up arrowheads.
  for (const item of spec.interfaces) {
    const peers = spec.interfaces.filter(
      (candidate) => candidate.target === item.target && candidate.role === item.role,
    );
    const index = peers.findIndex((candidate) => candidate.id === item.id);
    const offset = peers.length === 1 ? 0.5 : 0.25 + (0.5 * index) / (peers.length - 1);
    const arrow = document.layout.arrows[`d_${item.id}`];
    if (item.role === "output") arrow.fromOffset = offset;
    else arrow.toOffset = offset;
  }
  spec.steps.forEach((_, index) => {
    const arrow = document.layout.arrows[`step${index + 1}${index + 2}`];
    arrow.fromOffset = spec.key === "AS_IS" ? 0.62 : 0.5;
    arrow.toOffset = spec.key === "AS_IS" ? 0.38 : 0.5;
  });
  if (spec.key === "AS_IS") {
    document.layout.arrows.d_templates.toOffset = 0.12;
    document.layout.arrows.feedback_compat.toOffset = 0.34;
    document.layout.arrows.feedback_unavailable.toOffset = 0.56;
    document.layout.arrows.feedback_missing.toOffset = 0.78;
    document.layout.arrows.feedback_compat.fromOffset = 0.22;
    document.layout.arrows.feedback_unavailable.fromOffset = 0.28;
    document.layout.arrows.feedback_missing.fromOffset = 0.34;
    document.layout.arrows.feedback_rejected.fromOffset = 0.28;
    document.layout.arrows.feedback_rejected.toOffset = 0.78;
  } else {
    document.layout.arrows.d_mapping.toOffset = 0.32;
    document.layout.arrows.feedback_correction.toOffset = 0.72;
    document.layout.arrows.feedback_correction.fromOffset = 0.3;
  }

  // Boundary ports are aligned with their function ports. Most interfaces are
  // therefore single straight orthogonal segments instead of long detours.
  const rootPosition = document.layout.positions.root;
  const rootSize = document.layout.sizes.root;
  for (const item of spec.interfaces) {
    const contextArrow = document.layout.arrows[`c_${item.id}`];
    const contextOffset = item.role === "output"
      ? contextArrow.fromOffset ?? 0.5
      : contextArrow.toOffset ?? 0.5;
    document.layout.positions[`ctx_${item.id}`] =
      item.side === "left"
        ? { x: 0, y: rootPosition.y + rootSize.height * contextOffset }
        : item.side === "right"
          ? { x: frameContext.width, y: rootPosition.y + rootSize.height * contextOffset }
          : item.side === "top"
            ? { x: rootPosition.x + rootSize.width * contextOffset, y: 0 }
            : { x: rootPosition.x + rootSize.width * contextOffset, y: frameContext.height };

    const functionPosition = document.layout.positions[item.target];
    const functionSize = document.layout.sizes[item.target];
    const decompositionArrow = document.layout.arrows[`d_${item.id}`];
    const decompositionOffset = item.role === "output"
      ? decompositionArrow.fromOffset ?? 0.5
      : decompositionArrow.toOffset ?? 0.5;
    document.layout.positions[`dec_${item.id}`] =
      item.side === "left"
        ? { x: 0, y: functionPosition.y + functionSize.height * decompositionOffset }
        : item.side === "right"
          ? { x: frameDecomposition.width, y: functionPosition.y + functionSize.height * decompositionOffset }
          : item.side === "top"
            ? { x: functionPosition.x + functionSize.width * decompositionOffset, y: 0 }
            : {
                x: functionPosition.x + functionSize.width * decompositionOffset,
                y: frameDecomposition.height,
              };
  }
  document.layout = layoutIdef0(document.model, document.layout);

  const route = (
    id: string,
    middle: { x: number; y: number }[],
    label: { x: number; y: number },
  ) => {
    const from = arrowAnchor(document, id, "from");
    const to = arrowAnchor(document, id, "to");
    document.layout.arrows[id] = {
      ...document.layout.arrows[id],
      bends: [
        { x: from.point.x + from.normal.x * 34, y: from.point.y + from.normal.y * 34 },
        ...middle,
        { x: to.point.x + to.normal.x * 34, y: to.point.y + to.normal.y * 34 },
      ],
      label,
    };
  };

  // Context: four compact ICOM groups around one function, without crossings.
  for (const item of spec.interfaces) {
    const id = `c_${item.id}`;
    const boundary = arrowAnchor(document, id, item.role === "output" ? "to" : "from");
    const roleIndex = byRole(item.role).findIndex((candidate) => candidate.id === item.id);
    const label = item.role === "input"
      ? { x: 95, y: boundary.point.y - 42 }
      : item.role === "output"
        ? { x: 1570, y: boundary.point.y - 42 }
        : item.role === "control"
          ? { x: boundary.point.x - 90, y: 72 + (roleIndex % 2) * 82 }
          : { x: boundary.point.x - 90, y: 790 + (roleIndex % 2) * 72 };
    route(id, [], label);
  }

  // Decomposition interfaces: vertical control/mechanism lanes and horizontal
  // input/output lanes, each aligned to its destination/source port.
  if (spec.key === "TO_BE") {
    // The target model is one horizontal pipeline. External data for A2 and
    // intermediate outputs therefore use lanes above/below the function row
    // instead of cutting through neighbouring blocks.
    const actualFrame = document.layout.frames.decomposition;
    document.layout.positions.dec_catalog = { x: actualFrame.x, y: 515 };
    document.layout.positions.dec_offers = { x: actualFrame.x, y: 900 };
    document.layout.positions.dec_version = {
      x: actualFrame.x + actualFrame.width,
      y: 470,
    };
    document.layout.positions.dec_content = {
      x: actualFrame.x + actualFrame.width,
      y: 540,
    };
  }
  for (const item of spec.interfaces) {
    const id = `d_${item.id}`;
    const boundary = arrowAnchor(document, id, item.role === "output" ? "to" : "from");
    const roleIndex = byRole(item.role).findIndex((candidate) => candidate.id === item.id);
    const label = item.role === "input"
      ? { x: 80, y: boundary.point.y - 42 }
      : item.role === "output"
        ? { x: 2700, y: boundary.point.y - 42 }
        : item.role === "control"
          ? { x: boundary.point.x - 95, y: 72 + (roleIndex % 2) * 72 }
          : { x: boundary.point.x - 95, y: 1430 + (roleIndex % 2) * 62 };
    if (spec.key === "TO_BE" && (item.id === "catalog" || item.id === "offers")) {
      const from = arrowAnchor(document, id, "from");
      const to = arrowAnchor(document, id, "to");
      const laneX = 575;
      route(
        id,
        [
          { x: laneX, y: from.point.y },
          { x: laneX, y: to.point.y },
        ],
        { x: 80, y: from.point.y - 42 },
      );
    } else if (spec.key === "TO_BE" && (item.id === "version" || item.id === "content")) {
      const from = arrowAnchor(document, id, "from");
      const corridorY = item.id === "version" ? 470 : 540;
      const laneX = from.point.x + 55;
      route(
        id,
        [
          { x: laneX, y: from.point.y },
          { x: laneX, y: corridorY },
          {
            x:
              document.layout.frames.decomposition.x +
              document.layout.frames.decomposition.width,
            y: corridorY,
          },
        ],
        { x: 2700, y: corridorY - 42 },
      );
    } else {
      route(id, [], label);
    }
  }

  // Main process flows use only a short elbow between neighbouring functions.
  spec.steps.forEach((label, index) => {
    const id = `step${index + 1}${index + 2}`;
    const from = arrowAnchor(document, id, "from");
    const to = arrowAnchor(document, id, "to");
    const middleX = (from.point.x + to.point.x) / 2;
    route(
      id,
      Math.abs(from.point.y - to.point.y) < 4
        ? []
        : [
            { x: middleX, y: from.point.y },
            { x: middleX, y: to.point.y },
          ],
      { x: middleX - 100, y: Math.min(from.point.y, to.point.y) - 52 },
    );
  });

  // Feedback is deliberately separated into dedicated upper corridors. No
  // feedback line runs through a function block or through another label.
  spec.feedback.forEach((item, index) => {
    const id = `feedback_${item.id}`;
    const from = arrowAnchor(document, id, "from");
    const to = arrowAnchor(document, id, "to");
    const corridorY = spec.key === "AS_IS"
      ? [370, 295, 135, 890][index]
      : 505;
    const outerX = from.point.x + 70;
    route(
      id,
      [
        { x: outerX, y: from.point.y },
        { x: outerX, y: corridorY },
        { x: to.point.x, y: corridorY },
      ],
      {
        x: (outerX + to.point.x) / 2 - 100,
        y: corridorY - 48,
      },
    );
  });
  const diagnostics = validateIdef0Complete(document.model);
  const errors = diagnostics.filter((item) => item.severity === "error");
  if (errors.length) throw new Error(`${spec.key}: ${JSON.stringify(errors)}`);
  return { document, diagnostics };
}

const asIsBpmnSource = String.raw`bpmn Collaboration "AS IS: ручная подготовка и повторный ввод"
pool Ucoms "ООО «Юкомс»"
pool PC4Games "Поставщик PC4Games"
pool ITPartner "Поставщик ITPartner"
pool Ozon Ozon
event Start "Запрос в почте\nили мессенджере" in=Ucoms position=start
process Init "Найти старые файлы\nи договориться\nоб исполнителях" in=Ucoms type=manual
process Prepare "Вручную подготовить\nданные карточки" in=Ucoms type=subprocess
process Submit "Скопировать данные\nв кабинет Ozon" in=Ucoms type=manual
process Result "Проверить статус\nвручную" in=Ucoms type=manual
gateway Accepted "Карточка принята?" in=Ucoms type=exclusive
event Published "Карточка\nопубликована" in=Ucoms position=end
process RecordError "Разобрать замечания\nи исправить файлы" in=Ucoms type=manual
lane Manager "Менеджер маркетплейсов" in=Prepare
lane Technical "Технический специалист" in=Prepare
lane Stock "Сотрудник склада" in=Prepare
lane Designer Дизайнер in=Prepare
event PrepStart "Начало\nручной подготовки" in=Prepare position=start
process FindFiles "Найти переписку,\nтаблицы и изображения" in=Prepare type=manual
process Copy "Скопировать прежний состав\nв локальную таблицу" in=Prepare type=manual
process Check "Сверить совместимость\nпо опыту и сайтам" in=Prepare type=manual
gateway Compatible "Совместимо?" in=Prepare type=exclusive
process Fix "Исправить состав\nв локальном файле" in=Prepare type=manual
process Offers "Запросить цены и остатки\nв переписке" in=Prepare type=manual
gateway Available "Данные актуальны\nи товар доступен?" in=Prepare type=exclusive
process Replace "Подобрать замену\nи переписать состав" in=Prepare type=manual
process Calculate "Посчитать цену и массу\nв Excel и калькуляторе" in=Prepare type=manual
process Images "Подготовить изображения\nи текст в отдельных файлах" in=Prepare type=manual
gateway Complete "Все данные найдены?" in=Prepare type=exclusive
process Missing "Искать недостающие\nхарактеристики и файлы" in=Prepare type=manual
event PrepEnd "Файлы переданы\nменеджеру" in=Prepare position=end
flow F01 "" from=Start to=Init
flow F02 "" from=Init to=Prepare
flow F03 "" from=Prepare to=Submit
flow F04 "" from=Submit to=Result
flow F05 "" from=Result to=Accepted
flow F06 Да condition="status = published" from=Accepted to=Published
flow F07 Нет condition="status = rejected" from=Accepted to=RecordError
flow F08 "Повторить подготовку и ввод" from=RecordError to=Prepare
flow M01 "Запрос цен и наличия" from=Prepare to=PC4Games type=message
flow M02 "Прайс-лист или сообщение" from=PC4Games to=Prepare type=message
flow M03 "Запрос цен и наличия" from=Prepare to=ITPartner type=message
flow M04 "Прайс-лист или сообщение" from=ITPartner to=Prepare type=message
flow M05 "Повторно введённые данные" from=Submit to=Ozon type=message
flow M06 "Статус и замечания" from=Ozon to=Result type=message
flow D01 "" from=PrepStart to=FindFiles
flow D02 "" from=FindFiles to=Copy
flow D03 "" from=Copy to=Check
flow D04 "" from=Check to=Compatible
flow D05 Нет condition="compatible = false" from=Compatible to=Fix
flow D06 "Повторная ручная проверка" from=Fix to=Check
flow D07 Да condition="compatible = true" from=Compatible to=Offers
flow D08 "" from=Offers to=Available
flow D09 Нет condition="available = false" from=Available to=Replace
flow D10 "Вернуться к составу" from=Replace to=Copy
flow D11 Да condition="available = true" from=Available to=Calculate
flow D12 "" from=Calculate to=Images
flow D13 "" from=Images to=Complete
flow D14 Нет condition="complete = false" from=Complete to=Missing
flow D15 "Повторно собрать данные" from=Missing to=FindFiles
flow D16 Да condition="complete = true" from=Complete to=PrepEnd
`;

const toBeBpmnSource = String.raw`bpmn Collaboration "TO BE: управляемая подготовка и публикация"
pool Ucoms "ООО «Юкомс»"
pool PC4Games PC4Games
pool ITPartner ITPartner
pool Ozon Ozon
event Start "Зарегистрированный\nзапрос" in=Ucoms position=start
process Init "Создать запрос\nи черновую версию" in=Ucoms type=user
process Prepare "Подготовить и проверить\nверсию карточки" in=Ucoms type=subprocess
process Approve "Утвердить конкретную\nверсию карточки" in=Ucoms type=user
process Publish "Опубликовать, сверить\nи зафиксировать результат" in=Ucoms type=subprocess
event Finish "Статус, аудит\nи уведомление сохранены" in=Ucoms position=end
lane Technical "Технический специалист" in=Prepare
lane System "Информационная система" in=Prepare
lane Designer Дизайнер in=Prepare
event PStart Начало in=Prepare position=start
process Version "Выбрать состав\nчерновой версии" in=Prepare type=user
process Fix "Исправить состав\nили сопоставление" in=Prepare type=user
process Offers "Импортировать предложения,\nсопоставить SKU и разрешить слоты" in=Prepare type=service
process Validate "Проверить совместимость,\nактуальность и полноту" in=Prepare type=rule
gateway Valid "Проверка успешна?" in=Prepare type=exclusive
process Calc "Рассчитать цену и массу,\nсохранить единый снимок" in=Prepare type=service
process Media "Подтвердить шаблон\nи изображения" in=Prepare type=user
process Content "Сформировать контент\nиз проверенного снимка" in=Prepare type=service
gateway Complete "Версия готова?" in=Prepare type=exclusive
event PDone "Версия готова\nк утверждению" in=Prepare position=end
event QStart "Публикация разрешена" in=Publish position=start
process Save "Поставить версию в очередь\nи сохранить ключ операции" in=Publish type=service
process Send "Сверить статус и отправить\nтолько отсутствующую операцию" in=Publish type=service
process Result "Получить ID, результат\nили ошибку связи" in=Publish type=service
gateway Outcome "Результат?" in=Publish type=exclusive
process Success "Сохранить внешний ID,\nстатус и аудит" in=Publish type=service
event QDone "Опубликовано\nи уведомлено" in=Publish position=end
gateway Retry "Временный сбой\nи повтор допустим?" in=Publish type=exclusive
event Wait "Задержка повтора" definition=timer in=Publish position=catch timeDuration=PT1M
process Increment "Увеличить счётчик\nповторов" in=Publish type=service
process Error "Сохранить точную ошибку,\nаудит и уведомление" in=Publish type=service
event QFail "Ошибка публикации\nзафиксирована" in=Publish position=end
flow F1 "" from=Start to=Init
flow F2 "" from=Init to=Prepare
flow F3 "" from=Prepare to=Approve
flow F4 "" from=Approve to=Publish
flow F5 "" from=Publish to=Finish
flow M1 "Запрос предложений" from=Prepare to=PC4Games type=message
flow M2 "Цены, остатки и время" from=PC4Games to=Prepare type=message
flow M3 "Запрос предложений" from=Prepare to=ITPartner type=message
flow M4 "Цены, остатки и время" from=ITPartner to=Prepare type=message
flow M5 "Версия карточки или запрос статуса" from=Publish to=Ozon type=message
flow M6 "ID операции и итоговый результат" from=Ozon to=Publish type=message
flow P1 "" from=PStart to=Version
flow P2 "" from=Version to=Offers
flow P3 "" from=Offers to=Validate
flow P4 "" from=Validate to=Valid
flow P5 Нет condition="valid = false" from=Valid to=Fix
flow P6 "Контролируемое исправление" from=Fix to=Offers
flow P7 Да condition="valid = true" from=Valid to=Calc
flow P8 "" from=Calc to=Media
flow P9 "" from=Media to=Content
flow P10 "" from=Content to=Complete
flow P11 Нет condition="complete = false" from=Complete to=Fix
flow P12 Да condition="complete = true" from=Complete to=PDone
flow Q1 "" from=QStart to=Save
flow Q2 "" from=Save to=Send
flow Q3 "" from=Send to=Result
flow Q4 "" from=Result to=Outcome
flow Q5 Успех condition="result = success" from=Outcome to=Success
flow Q6 "" from=Success to=QDone
flow Q7 "Ошибка или неизвестный результат" condition="result != success" from=Outcome to=Retry
flow Q8 Да condition="temporary = true and retries < 3" from=Retry to=Wait
flow Q9 "" from=Wait to=Increment
flow Q10 "Сверить перед повтором" from=Increment to=Send
flow Q11 Нет condition="temporary = false or retries >= 3" from=Retry to=Error
flow Q12 "" from=Error to=QFail
`;

async function updateBpmn(fileName: string, source: string) {
  const original = await decodeProject(
    await fs.readFile(path.join(canonical, fileName), "utf8"),
  );
  if (original.notation !== "BPMN") throw new Error(`${fileName}: ожидался BPMN`);
  const result = bpmnAdapter.applyText(original, source);
  const errors = result.diagnostics.filter((item) => item.severity === "error");
  if (errors.length) throw new Error(`${fileName}: ${JSON.stringify(errors)}`);
  const document = result.document;
  const validation = validateBpmnData(document);
  if (validation.some((item) => item.severity === "error"))
    throw new Error(`${fileName}: ${JSON.stringify(validation)}`);
  return { document, diagnostics: validation };
}

async function writeProject(canonicalName: string, document: any) {
  const encoded = await encodeProject(document);
  await fs.writeFile(path.join(canonical, canonicalName), encoded, "utf8");
}

await fs.mkdir(canonical, { recursive: true });

const asIs = buildIdef0(asIsIdef0);
const toBe = buildIdef0(toBeIdef0);
await writeProject('ПР1_IDEF0_AS_IS.omni', asIs.document);
await writeProject('ПР2_IDEF0_TO_BE.omni', toBe.document);

const asIsBpmn = await updateBpmn("ПР1_BPMN_AS_IS.omni", asIsBpmnSource);
const toBeBpmn = await updateBpmn("ПР2_BPMN_TO_BE.omni", toBeBpmnSource);
await writeProject('ПР1_BPMN_AS_IS.omni', asIsBpmn.document);
await writeProject('ПР2_BPMN_TO_BE.omni', toBeBpmn.document);

const figureTitles = new Map<string, string>([
  ["ПР1_IDEF0_AS_IS.omni|context", "Рисунок 01 — IDEF0 AS IS: контекст ручной подготовки карточки"],
  ["ПР1_IDEF0_AS_IS.omni|decomposition", "Рисунок 02 — IDEF0 AS IS: ручная подготовка и повторный ввод"],
  ["ПР1_BPMN_AS_IS.omni|Plane_Main", "Рисунок 03 — BPMN AS IS: ручная публикация и возврат отклонённой карточки"],
  ["ПР1_BPMN_AS_IS.omni|Plane_Preparation", "Рисунок 04 — BPMN AS IS: подготовка данных в разрозненных инструментах"],
  ["ПР2_IDEF0_TO_BE.omni|context", "Рисунок 06 — IDEF0 TO BE: контекст управляемого процесса"],
  ["ПР2_IDEF0_TO_BE.omni|decomposition", "Рисунок 07 — IDEF0 TO BE: версионированная подготовка и публикация"],
  ["ПР2_BPMN_TO_BE.omni|Plane_Main", "Рисунок 08 — BPMN TO BE: целевой процесс подготовки и публикации"],
  ["ПР2_BPMN_TO_BE.omni|Plane_Preparation", "Рисунок 09 — BPMN TO BE: автоматизированная подготовка версии карточки"],
  ["ПР2_BPMN_TO_BE.omni|Plane_Publication", "Рисунок 10 — BPMN TO BE: очередь, сверка статуса и обработка результата"],
]);
const manifestPath = path.join(canonical, "Экспорт_PNG.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
for (const job of manifest.jobs) {
  const title = figureTitles.get(`${job.file}|${job.diagramId}`);
  if (title) job.title = title;
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const registryPath = path.join(canonical, "Реестр_38_рисунков.json");
const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
for (const item of registry.figures) {
  const fileName = path.basename(item.file ?? "");
  const title = figureTitles.get(`${fileName}|${item.diagramId}`);
  if (!title) continue;
  item.title = title;
  const canonicalBytes = await fs.readFile(path.resolve(root, item.file));
  item.modelSha256 = digest(canonicalBytes);
  if (item.source) {
    const sourceBytes = await fs.readFile(path.resolve(root, item.source));
    item.sha256 = digest(sourceBytes);
  }
}
await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), "utf8");

const summary = {
  idef0: {
    AS_IS: asIs.diagnostics,
    TO_BE: toBe.diagnostics,
  },
  bpmn: {
    AS_IS: asIsBpmn.diagnostics,
    TO_BE: toBeBpmn.diagnostics,
  },
};
await fs.writeFile(
  path.join(root, "ПРОВЕРКА_процессных_моделей.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);
console.log(JSON.stringify(summary, null, 2));
