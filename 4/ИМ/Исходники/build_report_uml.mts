import { writeFile } from "node:fs/promises";
import path from "node:path";

import {MODEL_DIR, omniModule} from './runtime.mjs';
const {decodeUml, layoutUml, textModel} = await omniModule('src/notations/uml/document.ts');
const {relationEnds} = await omniModule('src/notations/uml/model.ts');
const {generateUnified} = await omniModule('src/language/unified.ts');
const {encodeProject} = await omniModule('src/persistence/project.ts');
const out = path.join(MODEL_DIR, 'ИМ_ПР8-10_UML.omni');
type RecipeElement = {kind: string; id: string; label: string; properties: Record<string, string>};
const model = {
  id: "im_report_uml",
  label: "Информационная система подготовки карточек ООО «Юкомс»",
  elements: [] as RecipeElement[],
};
const rects: Record<string, {x: number; y: number; width: number; height: number}> = {};

function add(kind: string, id: string, label: string, properties: Record<string, string> = {}) {
  const element = { kind, id, label, properties };
  model.elements.push(element);
  return element;
}
function view(sheet: string, element: string, rect: [number, number, number, number], parent?: string) {
  const id = `v_${sheet}_${element}`;
  add("view", id, "", { diagram: sheet, element, ...(parent ? { parent } : {}) });
  const [x, y, width, height] = rect;
  rects[id] = { x, y, width, height };
  return id;
}
function edgeView(sheet: string, element: string) {
  const relation = model.elements.find((item) => item.id === element)!;
  const [from, to] = relationEnds(model, relation);
  const fromView = model.elements.find(
    (item) => item.kind === "view" && item.properties.diagram === sheet && item.properties.element === from,
  )!;
  const toView = model.elements.find(
    (item) => item.kind === "view" && item.properties.diagram === sheet && item.properties.element === to,
  )!;
  add("view", `v_${sheet}_${element}`, "", {
    diagram: sheet,
    element,
    from: fromView.id,
    to: toView.id,
  });
}
function relation(kind: string, id: string, from: string, to: string, label = "") {
  add(kind, id, label, { from, to });
  return id;
}

// Практика 8: два небольших листа вместо одной перегруженной схемы.
add("diagram", "use_data", "Прецеденты подготовки данных и карточки", { type: "usecase" });
add("system", "system_data", "ИС подготовки карточек ООО «Юкомс»");
const dataSystem = view("use_data", "system_data", [310, 30, 900, 650]);
for (const [id, label, rect] of [
  ["manager", "Менеджер", [30, 150, 150, 125]],
  ["production", "Производство", [30, 430, 170, 125]],
  ["designer", "Дизайнер", [1320, 150, 150, 125]],
] as const) {
  add("actor", id, label);
  view("use_data", id, rect);
}
for (const [id, label, rect] of [
  ["uc01", "Загрузить исходные данные", [420, 130, 270, 110]],
  ["uc02", "Подготовить модельный ряд", [800, 130, 280, 110]],
  ["uc03", "Проверить совместимость", [420, 320, 270, 110]],
  ["uc04", "Рассчитать цену и массу", [800, 320, 280, 110]],
  ["uc05", "Подготовить изображения", [420, 510, 270, 110]],
  ["uc06", "Сформировать карточку", [800, 510, 280, 110]],
] as const) {
  add("usecase", id, label, {
    precondition: "Пользователь имеет право выполнить действие",
    postcondition: "Результат сохранён в версии карточки",
  });
  add("subject", `${id}_subject`, "", { owner: id, system: "system_data" });
  view("use_data", id, rect, dataSystem);
}
for (const [id, from, to] of [
  ["p_manager_uc01", "manager", "uc01"],
  ["p_manager_uc04", "manager", "uc04"],
  ["p_manager_uc06", "manager", "uc06"],
  ["p_production_uc02", "production", "uc02"],
  ["p_production_uc03", "production", "uc03"],
  ["p_designer_uc05", "designer", "uc05"],
] as const) edgeView("use_data", relation("participation", id, from, to));

add("diagram", "use_publish", "Прецеденты публикации, контроля и доступа", { type: "usecase" });
add("system", "system_publish", "ИС подготовки карточек ООО «Юкомс»");
const publishSystem = view("use_publish", "system_publish", [310, 30, 900, 650]);
for (const [id, label, rect] of [
  ["publisher", "Менеджер", [30, 150, 150, 125]],
  ["director", "Директор", [30, 430, 150, 125]],
  ["ozon", "Ozon", [1320, 150, 150, 125]],
  ["administrator", "Администратор", [1300, 430, 190, 125]],
] as const) {
  add("actor", id, label);
  view("use_publish", id, rect);
}
for (const [id, label, rect] of [
  ["uc07", "Опубликовать карточку", [420, 150, 270, 110]],
  ["uc08", "Уточнить статус", [800, 150, 270, 110]],
  ["uc09", "Получить отчёт", [420, 430, 270, 110]],
  ["uc10", "Управлять доступом", [800, 430, 270, 110]],
] as const) {
  add("usecase", id, label, {
    precondition: "Пользователь аутентифицирован",
    postcondition: "Результат операции зафиксирован",
  });
  add("subject", `${id}_subject`, "", { owner: id, system: "system_publish" });
  view("use_publish", id, rect, publishSystem);
}
for (const [id, from, to] of [
  ["p_publisher_uc07", "publisher", "uc07"],
  ["p_director_uc09", "director", "uc09"],
  ["p_ozon_uc08", "ozon", "uc08"],
  ["p_admin_uc10", "administrator", "uc10"],
] as const) edgeView("use_publish", relation("participation", id, from, to));

// Практика 9: единый сквозной сценарий публикации и последующего опроса.
add("interaction", "publication", "Публикация карточки и получение результата");
add("diagram", "sequence", "Взаимодействие при публикации карточки", {
  type: "sequence",
  interaction: "publication",
});
add("actor", "seq_manager", "Менеджер");
add("class", "seq_ui", "Интерфейс");
add("class", "seq_service", "Сервис публикации");
add("class", "seq_repository", "Репозиторий");
add("actor", "seq_ozon", "Ozon");
for (const [id, label, classifier, x, width] of [
  ["ll_manager", "менеджер", "seq_manager", 20, 180],
  ["ll_ui", "ui", "seq_ui", 260, 190],
  ["ll_service", "svc", "seq_service", 520, 220],
  ["ll_repository", "repo", "seq_repository", 820, 210],
  ["ll_ozon", "ozon", "seq_ozon", 1110, 180],
] as const) {
  add("lifeline", id, label, { owner: "publication", classifier });
  view("sequence", id, [x, 30, width, 760]);
}
let occurrenceOrder = 1;
function message(id: string, from: string, to: string, label: string, sequence: number, sort = "synchCall") {
  const send = `${id}_send`;
  const receive = `${id}_receive`;
  add("occurrence", send, "", {
    owner: "publication",
    lifeline: from,
    order: String(occurrenceOrder++),
  });
  add("occurrence", receive, "", {
    owner: "publication",
    lifeline: to,
    order: String(occurrenceOrder++),
  });
  add("message", id, label, {
    owner: "publication",
    send,
    receive,
    sequence: String(sequence),
    sort,
  });
  edgeView("sequence", id);
}
message("m01", "ll_manager", "ll_ui", "Отправить карточку", 1);
message("m02", "ll_ui", "ll_service", "Запустить публикацию", 2);
message("m03", "ll_service", "ll_repository", "Сохранить попытку", 3);
message("m04", "ll_repository", "ll_service", "Идентификатор попытки", 4, "reply");
message("m05", "ll_service", "ll_ozon", "Передать пакет", 5);
message("m06", "ll_ozon", "ll_service", "Идентификатор обработки", 6, "reply");
message("m07", "ll_service", "ll_repository", "Записать идентификатор", 7);
message("m08", "ll_service", "ll_ui", "Показать номер попытки", 8, "reply");
message("m09", "ll_service", "ll_ozon", "Запросить результат", 9);
message("m10", "ll_ozon", "ll_service", "Статус и замечания", 10, "reply");
message("m11", "ll_service", "ll_repository", "Сохранить результат", 11);
message("m12", "ll_service", "ll_ui", "Обновить статус карточки", 12, "reply");

// Практика 10: компоненты показаны напрямую; подпись каждой зависимости раскрывает передаваемый результат.
add("diagram", "components", "Компоненты системы и основные потоки", { type: "component" });
for (const [id, label, rect, description] of [
  ["web", "Веб-интерфейс", [20, 90, 300, 150], "Работа менеджера, производства, дизайнера и администратора"],
  ["services", "Прикладные сервисы", [470, 70, 360, 190], "Версии модельного ряда, расчёты, карточки и публикации"],
  ["importer", "Импорт исходных данных", [980, 90, 320, 150], "Предложения поставщиков и остатки"],
  ["access", "Контроль доступа и аудит", [20, 500, 300, 160], "Пользователи, роли и события аудита"],
  ["repository", "Репозиторий данных", [470, 490, 360, 180], "PostgreSQL и хранилище файлов"],
  ["ozon_adapter", "Адаптер Ozon", [980, 500, 320, 160], "Передача пакета и получение статуса"],
] as const) {
  add("component", id, label, { description });
  view("components", id, rect);
}
for (const [id, from, to, label] of [
  ["c_web_services", "web", "services", "Команды и запросы"],
  ["c_import_services", "importer", "services", "Нормализованные данные"],
  ["c_services_access", "services", "access", "Проверка прав"],
  ["c_services_repo", "services", "repository", "Чтение и запись"],
  ["c_services_ozon", "services", "ozon_adapter", "Пакеты публикации"],
  ["c_access_repo", "access", "repository", "Пользователи и аудит"],
] as const) edgeView("components", relation("dependency", id, from, to, label));

const source =
  "// Учебные UML-модели для единого отчёта по информационному менеджменту.\n" +
  generateUnified(textModel(model));
const layout = layoutUml(model);
Object.assign(layout.nodes, rects);
const document = decodeUml({
  formatVersion: 2,
  notation: "UML",
  profile: "NS-UML-2.5.1-2",
  model,
  source,
  draft: source,
  layout,
});
await writeFile(out, `${await encodeProject(document)}\n`, "utf8");
console.log(path.basename(out));
