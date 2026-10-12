import { decodeUml, element, layoutUml, textModel } from "./document";
import { generateUnified } from "../../language/unified";
import {
  interactionFingerprint,
  ancestors,
  type UmlDocument,
  type UmlElement,
  type UmlModel,
} from "./model";
/** An authored TO BE example, not an executable integration with a marketplace. */
export function createUmlExample(): UmlDocument {
  const model: UmlModel = {
    id: "cards_uml",
    label: "BOM и публикация карточек компьютерных систем",
    elements: [],
  };
  const add = (
    kind: string,
    id: string,
    label: string,
    p: Record<string, string> = {},
  ) => {
    const e = element(kind, label, p, id);
    model.elements.push(e);
    return e;
  };
  const viewCounts = new Map<string, number>();
  const addView = (
    model: UmlModel,
    diagram: string,
    id: string,
    properties: Record<string, string> = {},
  ) => {
    const key = `v_${diagram}_${id}`,
      count = (viewCounts.get(key) ?? 0) + 1;
    viewCounts.set(key, count);
    const view = element(
      "view",
      "",
      { diagram, element: id, ...properties },
      `${key}_${count}`,
    );
    model.elements.push(view);
    return view;
  };
  const bom = add("interaction", "form_bom", "Формирование версии BOM"),
    publication = add(
      "interaction",
      "publish_card",
      "Публикация карточки товара",
    );
  const use = add("diagram", "usecases", "Варианты использования", {
      type: "usecase",
    }),
    classes = add("diagram", "analysis", "Классы анализа", { type: "class" });
  const bomSheet = add("diagram", "bom_sequence", "Формирование версии BOM", {
    type: "sequence",
    interaction: bom.id,
  });
  const pubSheet = add(
    "diagram",
    "publication_sequence",
    "Публикация карточки товара",
    { type: "sequence", interaction: publication.id },
  );
  const comm = add(
    "diagram",
    "publication_communication",
    "Публикация карточки товара — кооперация",
    { type: "communication", interaction: publication.id },
  );
  const manager = add("actor", "manager", "Менеджер маркетплейса"),
    specialist = add("actor", "specialist", "Технический специалист"),
    designer = add("actor", "designer", "Дизайнер"),
    market = add("actor", "marketplace", "Маркетплейс Ozon");
  const system = add(
      "system",
      "cards_system",
      "Управление конфигурациями и карточками",
    ),
    systemView = addView(model, use.id, system.id);
  const roles = [manager, specialist, designer, market];
  roles.forEach((e) => addView(model, use.id, e.id));
  const usecases = [
    ["uc_bom", "Сформировать версию BOM", specialist.id, bom.id],
    ["uc_compatibility", "Проверить совместимость", specialist.id, ""],
    ["uc_approve", "Согласовать версию BOM", specialist.id, ""],
    ["uc_card", "Подготовить карточку", manager.id, ""],
    ["uc_calculate", "Рассчитать цену и вес", manager.id, ""],
    ["uc_images", "Подготовить изображения", designer.id, ""],
    ["uc_publish", "Опубликовать карточку", manager.id, publication.id],
    ["uc_ready", "Проверить готовность", manager.id, ""],
    ["uc_result", "Посмотреть результат", manager.id, ""],
    ["uc_create", "Создать карточку", manager.id, ""],
    ["uc_retry", "Повторно отправить карточку", manager.id, publication.id],
    ["uc_update", "Обновить карточку", manager.id, ""],
  ];
  for (const [id, label, actor, interaction] of usecases) {
    add("usecase", id, label, {
      precondition: ["uc_publish", "uc_retry"].includes(id)
        ? "Выбрана ревизия с согласованной BOM; заполнены данные, показатели и изображения"
        : "Пользователь имеет право выполнить действие",
      postcondition:
        id === "uc_bom"
          ? "Создана новая подготовленная версия; согласование выполняется отдельно"
          : id === "uc_publish"
            ? "Попытка сохранена, приём и подтверждение публикации различаются"
            : "Результат действия сохранён",
      ...(interaction ? { interaction } : {}),
    });
    add("subject", id + "_subject", "", { owner: id, system: system.id });
    addView(model, use.id, id, { parent: systemView.id });
    const edge = add("participation", id + "_actor", "", {
      from: actor,
      to: id,
    });
    addView(model, use.id, edge.id);
  }
  for (const [a, b] of [
    ["uc_bom", "uc_compatibility"],
    ["uc_approve", "uc_compatibility"],
    ["uc_publish", "uc_ready"],
    ["uc_retry", "uc_ready"],
  ]) {
    const e = add("include", a + "_includes_" + b, "", { from: a, to: b });
    addView(model, use.id, e.id);
  }
  const platformParticipation = add("participation", "platform_publish", "", {
    from: market.id,
    to: "uc_publish",
  });
  addView(model, use.id, platformParticipation.id);
  const classSpecs = [
    ["Configuration", "Конфигурация", "entity"],
    ["BomVersion", "Версия BOM", "entity"],
    ["BomItem", "Позиция BOM", "entity"],
    ["Component", "Комплектующая", "entity"],
    ["Offer", "Предложение поставщика", "entity"],
    ["Card", "Карточка товара", "entity"],
    ["CardRevision", "Ревизия карточки", "entity"],
    ["Image", "Изображение", "entity"],
    ["PublicationAttempt", "Попытка публикации", "entity"],
    ["BomForm", "Форма BOM", "boundary"],
    ["CardForm", "Форма карточки", "boundary"],
    ["MarketplaceGateway", "Шлюз маркетплейса", "boundary"],
    ["BomControl", "Управление BOM", "control"],
    ["Compatibility", "Проверка совместимости", "control"],
    ["PublicationControl", "Управление публикацией", "control"],
    ["Readiness", "Проверка готовности", "control"],
    ["Catalog", "Каталог комплектующих", "entity"],
    ["BomRegistry", "Реестр версий BOM", "entity"],
    ["PublicationRegistry", "Реестр публикаций", "entity"],
    ["Calculation", "Расчёт показателей", "control"],
  ];
  const stringType = add("datatype", "String", "Строка", { primitive: "true" }),
    numberType = add("datatype", "Number", "Число", { primitive: "true" });
  for (const [id, label, role] of classSpecs) {
    add("class", id, label, { role });
    addView(model, classes.id, id);
  }
  for (const [owner, name, type] of [
    ["BomVersion", "Номер", numberType.id],
    ["BomVersion", "Статус", stringType.id],
    ["BomVersion", "Автор", stringType.id],
    ["BomVersion", "Дата", stringType.id],
    ["BomItem", "Количество", numberType.id],
    ["BomItem", "Единица", stringType.id],
    ["CardRevision", "Название", stringType.id],
    ["CardRevision", "Цена", numberType.id],
    ["CardRevision", "Вес", numberType.id],
    ["CardRevision", "Характеристики", stringType.id],
    ["PublicationAttempt", "Состояние", stringType.id],
    ["PublicationAttempt", "Внешний идентификатор", stringType.id],
    ["PublicationAttempt", "Сообщение об ошибке", stringType.id],
  ])
    add(
      "attribute",
      owner +
        "_" +
        name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "") +
        String(model.elements.length),
      name,
      { owner, classifier: type, visibility: "private" },
    );
  for (const [owner, name, method] of [
    ["BomControl", "Сформировать версию", "formVersion"],
    ["Compatibility", "Проверить совместимость", "checkCompatibility"],
    ["Readiness", "Проверить готовность", "checkReadiness"],
    ["PublicationControl", "Запросить публикацию", "requestPublication"],
    ["MarketplaceGateway", "Получить результат", "getResult"],
    ["Calculation", "Рассчитать цену и вес", "calculate"],
  ]) {
    const op = add("operation", method, name, { owner, visibility: "public" });
    add("parameter", method + "_input", "Данные", {
      owner: op.id,
      classifier: stringType.id,
      direction: "in",
      order: "0",
    });
    add("parameter", method + "_result", "Результат", {
      owner: op.id,
      classifier: stringType.id,
      direction: "return",
      order: "1",
    });
  }
  const association = (
    id: string,
    a: string,
    b: string,
    upper: string,
    composition = false,
    lower = "0",
  ) => {
    const e = add("association", id, "", {});
    add("end", id + "_a", "", {
      owner: id,
      classifier: a,
      lower: "1",
      upper: "1",
      order: "0",
    });
    add("end", id + "_b", "", {
      owner: id,
      classifier: b,
      lower,
      upper,
      order: "1",
      ...(composition ? { aggregation: "composite" } : {}),
    });
    addView(model, classes.id, e.id);
  };
  association("config_versions", "Configuration", "BomVersion", "*");
  association("version_items", "BomVersion", "BomItem", "*", true);
  association("component_positions", "Component", "BomItem", "*");
  association("component_offers", "Component", "Offer", "*");
  association("card_revisions", "Card", "CardRevision", "*");
  association("bom_card_revisions", "BomVersion", "CardRevision", "*");
  model.elements.find(
    (e) => e.id === "bom_card_revisions_a",
  )!.properties.lower = "0";
  association("revision_attempts", "CardRevision", "PublicationAttempt", "*");
  const imgAssoc = add("association", "revision_images", "Использует");
  add("end", "image_revision_end", "", {
    owner: imgAssoc.id,
    classifier: "CardRevision",
    lower: "0",
    upper: "*",
    order: "0",
  });
  add("end", "image_image_end", "", {
    owner: imgAssoc.id,
    classifier: "Image",
    lower: "0",
    upper: "*",
    order: "1",
  });
  addView(model, classes.id, imgAssoc.id);
  function interactionBuilder(
    interaction: UmlElement,
    sheet: UmlElement,
    participants: [string, string][],
    withCommunication = false,
  ) {
    const lanes: Record<string, UmlElement> = {};
    let order = 0,
      count = 0;
    for (const [name, type] of participants) {
      const lane = add(
        "lifeline",
        interaction.id + "_" + name,
        model.elements.find((e) => e.id === type)!.label,
        { owner: interaction.id, classifier: type },
      );
      lanes[name] = lane;
      addView(model, sheet.id, lane.id);
      if (withCommunication) addView(model, comm.id, lane.id);
    }
    const allMessages: UmlElement[] = [],
      connectors = new Map<string, UmlElement>();
    const message = (
      from: string,
      to: string,
      label: string,
      options: {
        owner?: string;
        sort?: string;
        reply?: UmlElement;
        call?: UmlElement;
        seq?: number;
        thread?: string;
      } = {},
    ) => {
      count++;
      const id = interaction.id + "_m" + count,
        owner = options.owner || interaction.id;
      const send = add("occurrence", id + "_send", "", {
          owner,
          lifeline: lanes[from].id,
          order: String(order++),
        }),
        receive = add("occurrence", id + "_receive", "", {
          owner,
          lifeline: lanes[to].id,
          order: String(order++),
        });
      const pair = [lanes[from].id, lanes[to].id].sort().join("|");
      let connector = connectors.get(pair);
      if (withCommunication && !connector) {
        connector = add(
          "connector",
          interaction.id + "_channel" + connectors.size,
          "",
          { owner: interaction.id, from: lanes[from].id, to: lanes[to].id },
        );
        connectors.set(pair, connector);
        addView(model, comm.id, connector.id);
      }
      const nesting = options.call ?? options.reply;
      const nextSequence =
        Math.max(
          0,
          ...allMessages
            .filter((m) => (m.properties.call || "") === (nesting?.id || ""))
            .map((m) => Number(m.properties.sequence)),
        ) + 1;
      const e = add("message", id, label, {
        owner: interaction.id,
        send: send.id,
        receive: receive.id,
        sort: options.sort || (options.reply ? "reply" : "synchCall"),
        sequence: String(options.seq ?? nextSequence),
        ...(options.thread ? { thread: options.thread } : {}),
        ...(options.reply ? { replyTo: options.reply.id } : {}),
        ...(nesting ? { call: nesting.id } : {}),
        ...(connector ? { connector: connector.id } : {}),
      });
      allMessages.push(e);
      addView(model, sheet.id, e.id);
      if (withCommunication) addView(model, comm.id, e.id);
      return e;
    };
    const fragment = (
      id: string,
      label: string,
      operator: string,
      owner = interaction.id,
    ) => {
      const f = add("fragment", id, label, {
        owner,
        operator,
        order: String(order++),
      });
      for (const lane of Object.values(lanes))
        add("coverage", id + "_" + lane.id, "", {
          owner: id,
          lifeline: lane.id,
        });
      addView(model, sheet.id, id);
      return f;
    };
    const operand = (f: UmlElement, id: string, guard: string, ordinal = 0) =>
      add("operand", id, guard, { owner: f.id, guard, order: String(ordinal) });
    const activation = (
      id: string,
      lane: string,
      call: UmlElement,
      reply: UmlElement,
    ) => {
      const e = add("execution", id, "", {
        owner: interaction.id,
        lifeline: lanes[lane].id,
        start: call.properties.receive,
        finish: reply.properties.send,
      });
      addView(model, sheet.id, e.id);
    };
    return { message, fragment, operand, activation, allMessages };
  }
  const b = interactionBuilder(bom, bomSheet, [
    ["specialist", specialist.id],
    ["form", "BomForm"],
    ["control", "BomControl"],
    ["catalog", "Catalog"],
    ["check", "Compatibility"],
    ["registry", "BomRegistry"],
  ]);
  b.message("specialist", "form", "Открыть конфигурацию");
  b.message("form", "control", "Получить состав");
  const catalogue = b.message("control", "catalog", "Получить комплектующие");
  b.message("catalog", "control", "Каталог комплектующих", {
    reply: catalogue,
  });
  const editing = b.fragment("bom_edit", "Редактирование состава", "loop"),
    editBody = b.operand(editing, "bom_edit_body", "пока состав редактируется");
  b.message("specialist", "form", "Изменить комплектующие и количества", {
    owner: editBody.id,
  });
  b.message("form", "control", "Обновить кандидат состава", {
    owner: editBody.id,
  });
  b.message("specialist", "form", "Сформировать версию");
  const formVersion = b.message("form", "control", "Сформировать новую версию"),
    check = b.message("control", "check", "Проверить совместимость");
  const checked = b.message("check", "control", "Результат проверки", {
    reply: check,
  });
  b.activation("compatibility_execution", "check", check, checked);
  const bomResult = b.fragment("bom_result", "Результат проверки", "alt"),
    invalidBom = b.operand(bomResult, "bom_invalid", "найдены несовместимости"),
    validBom = b.operand(bomResult, "bom_valid", "else", 1);
  b.message("control", "form", "Показать ошибки состава", {
    owner: invalidBom.id,
    reply: formVersion,
  });
  const saveBom = b.message(
    "control",
    "registry",
    "Сохранить снимок и номер версии",
    { owner: validBom.id },
  );
  b.message("registry", "control", "Версия сохранена", {
    owner: validBom.id,
    reply: saveBom,
  });
  b.message("control", "form", "Версия подготовлена", {
    owner: validBom.id,
    reply: formVersion,
  });
  const p = interactionBuilder(
    publication,
    pubSheet,
    [
      ["manager", manager.id],
      ["form", "CardForm"],
      ["control", "PublicationControl"],
      ["revision", "CardRevision"],
      ["check", "Readiness"],
      ["registry", "PublicationRegistry"],
      ["gateway", "MarketplaceGateway"],
      ["market", market.id],
    ],
    true,
  );
  const request = p.message("manager", "form", "Опубликовать ревизию", {
      seq: 1,
    }),
    start = p.message("form", "control", "Начать публикацию", {
      call: request,
      seq: 1,
    });
  const read = p.message(
    "control",
    "revision",
    "Получить зафиксированные данные",
    { call: start, seq: 1 },
  );
  p.message("revision", "control", "Данные ревизии", { reply: read });
  const ready = p.message("control", "check", "Проверить готовность", {
    call: start,
    seq: 2,
  });
  const readyReply = p.message("check", "control", "Результат проверки", {
    reply: ready,
  });
  p.activation("readiness_execution", "check", ready, readyReply);
  const readiness = p.fragment(
      "publish_readiness",
      "Готовность карточки",
      "alt",
    ),
    bad = p.operand(readiness, "publish_bad", "данные не готовы"),
    good = p.operand(readiness, "publish_good", "else", 1);
  p.message("control", "form", "Показать ошибки готовности", {
    owner: bad.id,
    reply: start,
  });
  const recorded = p.message(
    "control",
    "registry",
    "Зафиксировать попытку публикации",
    { owner: good.id, call: start, seq: 3 },
  );
  p.message("registry", "control", "Попытка зарегистрирована", {
    owner: good.id,
    reply: recorded,
  });
  const submit = p.message("control", "gateway", "Передать данные ревизии", {
    owner: good.id,
    call: start,
    seq: 4,
  });
  const send = p.message("gateway", "market", "Отправить карточку", {
    owner: good.id,
    call: submit,
    seq: 1,
  });
  const acceptance = p.fragment(
      "publish_acceptance",
      "Приём запроса площадкой",
      "alt",
      good.id,
    ),
    accepted = p.operand(acceptance, "publish_accepted", "запрос принят"),
    failed = p.operand(
      acceptance,
      "publish_acceptance_failed",
      "получен отказ приёма",
      1,
    ),
    timeout = p.operand(
      acceptance,
      "publish_acceptance_unknown",
      "ответ не получен",
      2,
    );
  p.message("market", "gateway", "Отказ приёма", {
    owner: failed.id,
    reply: send,
  });
  p.message("gateway", "control", "Данные не приняты площадкой", {
    owner: failed.id,
    reply: submit,
  });
  p.message("control", "registry", "Зафиксировать отказ приёма", {
    owner: failed.id,
  });
  p.message("control", "form", "Показать отказ приёма", {
    owner: failed.id,
    reply: start,
  });
  p.message("form", "manager", "Сообщить причины отказа", {
    owner: failed.id,
    reply: request,
  });
  p.message("gateway", "gateway", "Истекло ожидание ответа", {
    owner: timeout.id,
    sort: "asynchSignal",
  });
  p.message("gateway", "control", "Ответ не получен", {
    owner: timeout.id,
    reply: submit,
  });
  p.message(
    "control",
    "registry",
    "Сохранить неизвестный результат и необходимость сверки",
    { owner: timeout.id },
  );
  p.message("control", "form", "Требуется сверка до повторной отправки", {
    owner: timeout.id,
    reply: start,
  });
  p.message("form", "manager", "Показать неопределённый результат", {
    owner: timeout.id,
    reply: request,
  });
  p.message("market", "gateway", "Запрос принят, идентификатор обработки", {
    owner: accepted.id,
    reply: send,
  });
  p.message("gateway", "control", "Подтверждение приёма", {
    owner: accepted.id,
    reply: submit,
  });
  p.message("control", "registry", "Сохранить состояние «В обработке»", {
    owner: accepted.id,
    call: start,
    seq: 5,
  });
  p.message("control", "form", "Запрос принят в обработку", {
    owner: accepted.id,
    reply: start,
  });
  p.message("form", "manager", "Показать состояние обработки", {
    owner: accepted.id,
    reply: request,
  });
  const polling = p.fragment(
      "publish_poll",
      "Отдельная фаза проверки результата",
      "loop",
      accepted.id,
    ),
    poll = p.operand(
      polling,
      "publish_poll_body",
      "пока обработка не завершена",
    );
  const query = p.message(
      "control",
      "gateway",
      "Запросить результат обработки",
      { owner: poll.id, seq: 2 },
    ),
    state = p.message("gateway", "market", "Получить состояние публикации", {
      owner: poll.id,
      call: query,
      seq: 1,
    });
  p.message("market", "gateway", "Состояние обработки", {
    owner: poll.id,
    reply: state,
  });
  p.message("gateway", "control", "Результат обработки", {
    owner: poll.id,
    reply: query,
  });
  const final = p.fragment(
      "publish_result",
      "Результат публикации",
      "alt",
      accepted.id,
    ),
    published = p.operand(final, "publish_success", "публикация подтверждена"),
    rejected = p.operand(
      final,
      "publish_rejected",
      "получен окончательный отказ",
      1,
    ),
    uncertain = p.operand(final, "publish_uncertain", "else", 2);
  p.message("control", "registry", "Сохранить подтверждённую публикацию", {
    owner: published.id,
    seq: 3,
  });
  p.message("control", "registry", "Сохранить окончательный отказ", {
    owner: rejected.id,
    seq: 3,
  });
  p.message(
    "control",
    "registry",
    "Сохранить неопределённый результат для сверки",
    { owner: uncertain.id, seq: 3 },
  );
  const scenario = add(
    "scenario",
    "publication_success",
    "Успешная публикация после одной проверки результата",
    { owner: publication.id },
  );
  comm.properties.scenario = scenario.id;
  for (const [fragment, operand] of [
    [readiness, good],
    [acceptance, accepted],
    [polling, poll],
    [final, published],
  ])
    add("choice", scenario.id + "_" + fragment.id, "", {
      owner: scenario.id,
      fragment: fragment.id,
      operand: operand.id,
      iterations: "1",
    });
  const excluded = new Set([
    bad.id,
    failed.id,
    timeout.id,
    rejected.id,
    uncertain.id,
  ]);
  let step = 0;
  for (const message of p.allMessages) {
    const event = model.elements.find((e) => e.id === message.properties.send)!;
    if (ancestors(model, event.id).some((e) => excluded.has(e.id))) continue;
    add("step", scenario.id + "_step" + ++step, "", {
      owner: scenario.id,
      message: message.id,
      order: String(step),
      iteration: "1",
    });
  }
  scenario.properties.fingerprint = interactionFingerprint(
    model,
    publication.id,
  );
  const note = add(
    "annotation",
    "domain_assumptions",
    "Предлагаемый TO BE. BOM — состав компьютерной системы. Статусы внутренние; контракт API Ozon не задан.",
  );
  addView(model, classes.id, note.id);
  const layout = layoutUml(model);
  for (const view of model.elements.filter((e) => e.kind === "view")) {
    const target = model.elements.find(
      (e) => e.id === view.properties.element,
    )!;
    if (view.id === systemView.id)
      layout.nodes[view.id] = { x: 260, y: 35, width: 900, height: 950 };
    if (view.properties.diagram === use.id && target.kind === "actor") {
      const i = roles.findIndex((e) => e.id === target.id);
      layout.nodes[view.id] = {
        x: i === 3 ? 1210 : 60,
        y: 60 + (i % 3) * 220,
        width: 130,
        height: 130,
      };
    }
    if (view.properties.diagram === use.id && target.kind === "usecase") {
      const i = usecases.findIndex(([id]) => id === target.id);
      layout.nodes[view.id] = {
        x: 310 + (i % 3) * 275,
        y: 110 + Math.floor(i / 3) * 210,
        width: 230,
        height: 125,
      };
    }
    if (view.properties.diagram === classes.id && target.kind === "class") {
      const i = classSpecs.findIndex(([id]) => id === target.id);
      layout.nodes[view.id] = {
        x: 70 + (i % 5) * 300,
        y: 60 + Math.floor(i / 5) * 250,
        width: 250,
        height: 195,
      };
    }
    if (
      [bomSheet.id, pubSheet.id].includes(view.properties.diagram) &&
      target.kind === "lifeline"
    ) {
      const lanes = model.elements.filter(
          (e) =>
            e.kind === "lifeline" &&
            e.properties.owner === target.properties.owner,
        ),
        i = lanes.findIndex((e) => e.id === target.id);
      layout.nodes[view.id] = {
        x: 60 + i * 260,
        y: 30,
        width: 220,
        height: 500,
      };
    }
    if (view.properties.diagram === comm.id && target.kind === "lifeline") {
      const lanes = model.elements.filter(
          (e) => e.kind === "lifeline" && e.properties.owner === publication.id,
        ),
        i = lanes.findIndex((e) => e.id === target.id);
      layout.nodes[view.id] = {
        x: 80 + (i % 4) * 380,
        y: 100 + Math.floor(i / 4) * 420,
        width: 240,
        height: 85,
      };
    }
    if (target.id === note.id)
      layout.nodes[view.id] = { x: 70, y: 1100, width: 640, height: 100 };
  }
  const source = generateUnified(textModel(model));
  return decodeUml({
    formatVersion: 2,
    notation: "UML",
    profile: "NS-UML-2.5.1-2",
    model,
    source,
    draft: source,
    layout,
  });
}
