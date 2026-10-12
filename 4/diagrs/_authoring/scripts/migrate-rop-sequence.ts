import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  element,
  addView,
  decodeUml,
  layoutUml,
  textModel,
} from "../src/notations/uml/document";
import { generateUnified } from "../src/language/unified";
import { validateUml } from "../src/notations/uml/validation";
import { buildUmlScene } from "../src/notations/uml/projection";
import type {
  UmlElement,
  UmlLayout,
  UmlModel,
} from "../src/notations/uml/model";
import {
  draftSchema,
  inputRoot,
  writeDocument,
  writeReport,
} from "./rop/source";
const sequenceSchema = draftSchema.extend({
  edges: z.array(
    z
      .object({
        source: z.string(),
        target: z.string(),
        label: z.string(),
        kind: z.enum(["call", "return"]),
        y: z.number().finite(),
      })
      .strict(),
  ),
});
const model: UmlModel = {
    id: "ropSequences",
    label: "Интеграционные сценарии РОП",
    elements: [],
  },
  rects: UmlLayout["nodes"] = {},
  provenance: unknown[] = [],
  figures: Record<string, unknown>[] = [];
const textSource = join(inputRoot, "content.json"),
  textRaw = await readFile(textSource, "utf8");
const content = z
  .array(
    z.object({ type: z.string(), title: z.string().optional() }).passthrough(),
  )
  .parse(JSON.parse(textRaw));
const errors = z
  .object({ rows: z.array(z.array(z.string())) })
  .parse(
    content.find(
      (e) => e.type === "table" && e.title === "Обработка ошибок интеграции",
    ),
  );
if (
  errors.rows.length !== 6 ||
  !errors.rows.some((r) => r.join(" ").includes("До 3 повторов"))
)
  throw new Error("Текст ПР8 изменён; нужен пересмотр поведения повторов.");
for (const [i, name] of [
  "D22_sequence_suppliers",
  "D23_sequence_ozon",
].entries()) {
  const path = join(inputRoot, "Черновики_схем", name + ".draft.json"),
    raw = await readFile(path, "utf8"),
    d = sequenceSchema.parse(JSON.parse(raw)),
    prefix = name + ".",
    interaction = prefix + "interaction";
  let order = 0,
    counter = 0,
    sequence = 0;
  function add(
    kind: string,
    id: string,
    label: string,
    properties: Record<string, string>,
  ) {
    const e = element(kind, label, properties, prefix + id);
    model.elements.push(e);
    return e;
  }
  function show(e: UmlElement) {
    return addView(model, name, e.id);
  }
  add("interaction", "interaction", d.title, {});
  model.elements.push(
    element("diagram", d.title, { type: "sequence", interaction }, name),
  );
  const lanes = new Map(
    d.nodes.map((n) => {
      const classifier = add(
        /менеджер|сотрудник|пользователь/i.test(n.label)
          ? "actor"
          : "component",
        "participantType" + n.id,
        n.label.replace(/\n/g, " "),
        {},
      );
      const e = add("lifeline", "lane" + n.id, n.label.replace(/\n/g, " "), {
          owner: interaction,
          classifier: classifier.id,
        }),
        v = show(e);
      rects[v.id] = {
        x: 80 + Number(n.id) * 360,
        y: 30,
        width: 230,
        height: 700,
      };
      return [n.id, e.id];
    }),
  );
  function message(
    from: string,
    to: string,
    label: string,
    owner = interaction,
    sort = "synchCall",
    reply?: UmlElement,
    sourceEdge?: number,
  ) {
    const id = "m" + ++counter,
      send = add("occurrence", id + "Send", "", {
        owner,
        lifeline: lanes.get(from)!,
        order: String(order++),
      }),
      receive = add("occurrence", id + "Receive", "", {
        owner,
        lifeline: lanes.get(to)!,
        order: String(order++),
      });
    const m = add("message", id, label, {
      owner: interaction,
      send: send.id,
      receive: receive.id,
      sort,
      sequence: String(++sequence),
      ...(reply ? { replyTo: reply.id } : {}),
    });
    show(m);
    provenance.push({
      source: sourceEdge === undefined ? textSource : path,
      sourceEdge: sourceEdge ?? null,
      element: m.id,
      label,
      sort,
    });
    return m;
  }
  function original(
    n: number,
    owner = interaction,
    sort?: string,
    reply?: UmlElement,
  ) {
    const e = d.edges[n];
    return message(
      e.source,
      e.target,
      e.label,
      owner,
      sort || (e.kind === "return" ? "reply" : "synchCall"),
      reply,
      n,
    );
  }
  function fragment(
    id: string,
    label: string,
    operator: string,
    owner = interaction,
  ) {
    const f = add("fragment", id, label, {
      owner,
      operator,
      order: String(order++),
    });
    for (const [lane, lifeline] of lanes)
      add("coverage", id + "Cover" + lane, "", { owner: f.id, lifeline });
    show(f);
    return f;
  }
  function operand(
    f: UmlElement,
    id: string,
    guard: string,
    n: number,
    max?: string,
  ) {
    return add("operand", id, "", {
      owner: f.id,
      guard,
      order: String(n),
      ...(max ? { min: "1", max } : {}),
    }).id;
  }
  if (i === 0) {
    const request = original(0);
    original(1, interaction, "asynchCall");
    message(
      "1",
      "0",
      "Импорт принят в фоновую обработку",
      interaction,
      "reply",
      request,
    );
    const retry = fragment(
        "retry",
        "Первая попытка и до 3 отложенных повторов",
        "loop",
      ),
      body = operand(
        retry,
        "retryBody",
        "не завершено и попытка ≤ 4; дождаться next_attempt_at / срока сервера",
        0,
        "4",
      );
    const adapter = original(2, body),
      supplier = original(3, body);
    const outcome = fragment(
        "outcome",
        "Результат получения предложений",
        "alt",
        body,
      ),
      success = operand(outcome, "received", "получены данные", 0),
      failed = operand(outcome, "temporary", "тайм-аут либо 429 либо 5xx", 1);
    original(4, success, "reply", supplier);
    original(5, success, "reply", adapter);
    const validation = fragment(
        "validation",
        "Валидация полученных записей",
        "alt",
        success,
      ),
      valid = operand(
        validation,
        "validRecords",
        "есть корректные сопоставленные записи",
        0,
      ),
      invalid = operand(validation, "invalidRecords", "else", 1);
    original(6, valid);
    original(7, valid);
    message(
      "2",
      "5",
      "Не принимать неверные записи; сохранить причины и прежнюю дату",
      invalid,
    );
    original(8, success, "asynchSignal");
    original(9, success, "asynchSignal");
    original(10, failed, "reply", adapter);
    original(11, failed, "asynchSignal");
    message(
      "2",
      "5",
      "Записать retry_count, next_attempt_at и причину; после 3 повторов завершить с ошибкой",
      failed,
    );
    const fallback = add(
      "annotation",
      "fallback",
      "Если согласованный автоматический канал недоступен, сотрудник загружает файл через тот же этап валидации. Наличие публичного API поставщиков не предполагается.",
      {},
    );
    const view = show(fallback);
    rects[view.id] = { x: 70, y: 50, width: 900, height: 110 };
  } else {
    const request = original(0);
    original(1);
    original(2, interaction, "reply", request);
    message(
      "1",
      "3",
      "Уведомление о доступной очереди; обработка независимо от HTTP-запроса",
      interaction,
      "asynchSignal",
    );
    original(3);
    const version = fragment("version", "Проверка перед отправкой", "alt"),
      current = operand(version, "current", "версия актуальна и утверждена", 0),
      stale = operand(version, "stale", "else", 1);
    message(
      "3",
      "2",
      "Не отправлять устаревшую версию; аудит и требование нового утверждения",
      stale,
    );
    const attempts = fragment(
        "attempts",
        "Ограниченные безопасные повторы",
        "loop",
        current,
      ),
      body = operand(
        attempts,
        "attemptBody",
        "операция не завершена; автоматический повтор разрешён; попытка ≤ 4",
        0,
        "4",
      );
    const submit = original(4, body);
    const result = fragment("result", "Исход отправки", "alt", body),
      accepted = operand(result, "accepted", "получен ответ с ID задачи", 0),
      transient = operand(
        result,
        "transient",
        "временный отказ / 429 / 5xx без неизвестного исхода",
        1,
      ),
      uncertain = operand(
        result,
        "uncertain",
        "ответ потерян и результат отправки неизвестен",
        2,
      ),
      permanent = operand(
        result,
        "permanent",
        "постоянная ошибка обязательных атрибутов",
        3,
      );
    original(5, accepted, "reply", submit);
    original(6, accepted);
    const poll = fragment(
        "poll",
        "Ожидание обработки по известному ID",
        "loop",
        accepted,
      ),
      polling = operand(
        poll,
        "polling",
        "статус WAITING; наступил срок проверки",
        0,
        "*",
      );
    const query = original(7, polling);
    const final = fragment(
        "final",
        "Ответ на проверку статуса",
        "alt",
        polling,
      ),
      waiting = operand(final, "waiting", "ещё обрабатывается", 0),
      done = operand(final, "done", "успешно", 1),
      bad = operand(final, "bad", "ошибка обработки", 2);
    message(
      "4",
      "3",
      "WAITING: задача ещё обрабатывается",
      waiting,
      "reply",
      query,
    );
    original(8, done, "reply", query);
    original(9, done);
    message(
      "4",
      "3",
      "Ошибка обработки: причины отклонения",
      bad,
      "reply",
      query,
    );
    original(11, bad);
    message(
      "3",
      "2",
      "RETRY: не более 3 повторов; сохранить причину и next_attempt_at; соблюдать срок сервера",
      transient,
      "synchCall",
      undefined,
      10,
    );
    message(
      "3",
      "3",
      "Ожидать next_attempt_at, не блокируя пользовательский запрос",
      transient,
      "asynchSignal",
    );
    message(
      "3",
      "2",
      "UNCERTAIN: сохранить тот же operation_key и снимок запроса",
      uncertain,
      "synchCall",
      undefined,
      10,
    );
    message(
      "3",
      "4",
      "Сверить по внешнему ID или стабильному offer_id; не повторять отправку вслепую",
      uncertain,
    );
    message(
      "3",
      "2",
      "Если сверка неоднозначна — прекратить автоповторы до решения сотрудника",
      uncertain,
    );
    original(11, permanent);
  }
  const note = add(
    "annotation",
    "note",
    d.note +
      "\nЛокальная уникальность operation_key не гарантирует exactly-once во внешнем сервисе.",
    {},
  );
  const view = show(note);
  rects[view.id] = { x: 50, y: 10, width: 1050, height: 100 };
  figures.push({
    figure: 36 + i,
    source: path,
    sha256: createHash("sha256").update(raw).digest("hex"),
    diagramId: name,
    sourceNodes: d.nodes.length,
    sourceEdges: d.edges.length,
    manualReview: "не выполнена",
    export: null,
  });
}
const layout = layoutUml(model);
Object.assign(layout.nodes, rects);
const source = generateUnified(textModel(model));
let doc = decodeUml({
  formatVersion: 2,
  notation: "UML",
  profile: "NS-UML-2.5.1-2",
  model,
  source,
  draft: source,
  layout,
});
for (const sheet of model.elements.filter((e) => e.kind === "diagram")) {
  const scene = buildUmlScene(doc, sheet.id),
    content = scene.nodes.filter((n) => n.kind !== "annotation");
  let y = Math.max(0, ...content.map((n) => n.position.y + n.height)) + 50;
  for (const node of scene.nodes.filter((n) => n.kind === "annotation")) {
    Object.assign(doc.layout.nodes[node.id], { x: 80, y });
    y += node.height + 30;
  }
}
doc = decodeUml(doc);
const path = await writeDocument(
  "РОП_UML_Последовательности.omni",
  "rop-uml-sequences.omni",
  doc,
);
for (const f of figures) f.file = path;
const report = await writeReport("РОП_UML_Последовательности_перенос.json", {
  figures,
  sourceText: {
    path: textSource,
    sha256: createHash("sha256").update(textRaw).digest("hex"),
    table: "Обработка ошибок интеграции",
    rows: errors.rows,
  },
  provenance,
  differences: [
    "Линейные стрелки рисунков дополнены alt/loop и guards по ПР8. Сохранены все 24 исходных сообщения; объединённый RETRY/UNCERTAIN разделён на две исключающие ветви.",
    "Фоновая обработка представлена asynchCall/asynchSignal; ответы на синхронный HTTP-запрос сохранены как reply. Поздний результат публикации не изображён ответом на уже завершённый запрос постановки в очередь.",
    "Геометрия сообщений рассчитывается штатной UML timeline, исходные y не используются для порядка. Предельное число попыток 4 означает первоначальную и до трёх повторных.",
  ],
  unresolved: [],
  diagnostics: validateUml(model),
});
process.stdout.write(
  JSON.stringify(
    { path, report, declarations: model.elements.length },
    null,
    2,
  ),
);
