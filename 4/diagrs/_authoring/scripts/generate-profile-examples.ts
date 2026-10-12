/** Authored, editable examples for manual exploration; this is not a test runner. */
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { encodeProject } from "../src/persistence/project";
import {
  inspectUml,
  decodeUml,
  layoutUml,
} from "../src/notations/uml/document";
import {
  relationEnds,
  umlType,
  type UmlDocument,
} from "../src/notations/uml/model";
import { generateUnified } from "../src/language/unified";
import { textModel } from "../src/notations/uml/document";
import { flowchartEngine } from "../src/notations/flowchart/document";
import { chartEngine } from "../src/notations/chart/document";
import { functionTreeEngine } from "../src/notations/function-tree/document";
import { schemeEngine } from "../src/notations/scheme/document";
import { wireframeEngine } from "../src/notations/wireframe/document";
import { arrangeBasic } from "../src/notations/structured/layout";

const updateMap = () =>
  execFileSync(process.execPath, ["scripts/generate-project-map.mjs"], {
    stdio: "inherit",
  });
async function save(name: string, doc: Parameters<typeof encodeProject>[0]) {
  await writeFile(`examples/${name}.omni`, await encodeProject(doc));
  updateMap();
  console.log(`Создан examples/${name}.omni`);
}
function uml(
  source: string,
  positions: Record<string, [number, number, number, number]>,
  parents: Record<string, string> = {},
) {
  const checked = inspectUml(source);
  if (!checked.model) throw new Error(JSON.stringify(checked.diagnostics));
  const model = checked.model,
    sheet = model.elements.find((e) => e.kind === "diagram")!;
  for (const id of Object.keys(positions))
    model.elements.push({
      id: `v_${id}`,
      kind: "view",
      label: "",
      properties: {
        diagram: sheet.id,
        element: id,
        ...(parents[id] ? { parent: `v_${parents[id]}` } : {}),
      },
    });
  for (const e of [...model.elements].filter(
    (e) => umlType(e.kind)?.render === "edge",
  )) {
    const [from, to] = relationEnds(model, e);
    if (positions[from] && positions[to])
      model.elements.push({
        id: `v_${e.id}`,
        kind: "view",
        label: "",
        properties: {
          diagram: sheet.id,
          element: e.id,
          from: `v_${from}`,
          to: `v_${to}`,
        },
      });
  }
  const layout = layoutUml(model);
  for (const [id, [x, y, width, height]] of Object.entries(positions))
    layout.nodes[`v_${id}`] = { x, y, width, height };
  const text = generateUnified(textModel(model));
  return decodeUml({
    notation: "UML",
    formatVersion: 2,
    profile: "NS-UML-2.5.1-2",
    model,
    source: text,
    draft: text,
    layout,
  }) satisfies UmlDocument;
}

await save(
  "component-ports",
  uml(
    `uml ports "Простые порты и части"
diagram main "Assembly и delegation" type=component
component system "Система карточек"
component web "Интерфейс"
component service "Сервис BOM"
interface api "API карточек"
part client "web" owner=system classifier=web lower=1 upper=1
part server "bom" owner=system classifier=service lower=1 upper=1
port required "API required" owner=web classifier=api conjugated=true
port provided "API provided" owner=service classifier=api conjugated=false
port external "Внешний API" owner=system classifier=api conjugated=false
interfaceUse need "" owner=required interface=api direction=required
interfaceUse provide "" owner=provided interface=api direction=provided
componentConnector assembly "assembly" owner=system kind=assembly
componentEnd a1 "" owner=assembly part=client port=required order=0
componentEnd a2 "" owner=assembly part=server port=provided order=1
componentConnector delegation "delegation" owner=system kind=delegation
componentEnd d1 "" owner=delegation port=external order=0
componentEnd d2 "" owner=delegation part=server port=provided order=1`,
    {
      system: [70, 60, 830, 420],
      client: [130, 160, 250, 130],
      server: [560, 160, 260, 130],
      required: [362, 205, 28, 28],
      provided: [547, 205, 28, 28],
      external: [545, 45, 28, 28],
    },
    {
      client: "system",
      server: "system",
      required: "client",
      provided: "server",
      external: "system",
    },
  ),
);

await save(
  "activity-parallel-pins",
  uml(
    `uml parallel "Параллельная подготовка"
activity work "Подготовить карточку"
diagram main "Потоки управления и данных" type=activity activity=work
class payload "Версия карточки"
initial start "" owner=work
fork split "" owner=work
action compose "Подготовить BOM" owner=work kind=opaque
action fetch "Получить предложения" owner=work kind=opaque
join sync "" owner=work joinSpec=and
decision check "Готово?" owner=work
action accept "Принять" owner=work kind=opaque
action reject "Вернуть на доработку" owner=work kind=opaque
merge merge "" owner=work
activityFinal done "" owner=work
flowFinal drop "" owner=work
outputPin dataOut "Версия" owner=compose classifier=payload lower=1 upper=1
inputPin dataIn "Версия" owner=fetch classifier=payload lower=1 upper=1
outputPin unused "Остаток" owner=fetch classifier=payload lower=0 upper=1
controlFlow c1 "" owner=work from=start to=split
controlFlow c2 "" owner=work from=split to=compose
controlFlow c3 "" owner=work from=split to=fetch
controlFlow c4 "" owner=work from=compose to=sync
controlFlow c5 "" owner=work from=fetch to=sync
controlFlow c6 "" owner=work from=sync to=check
controlFlow c7 Да owner=work from=check to=accept guard=ready
controlFlow c8 Нет owner=work from=check to=reject guard=else
controlFlow c9 "" owner=work from=accept to=merge
controlFlow c10 "" owner=work from=reject to=merge
controlFlow c11 "" owner=work from=merge to=done
objectFlow data "Версия" owner=work from=dataOut to=dataIn
objectFlow discard "Отбросить" owner=work from=unused to=drop`,
    {
      start: [440, 40, 32, 32],
      split: [355, 115, 200, 18],
      compose: [100, 215, 240, 75],
      fetch: [580, 215, 250, 75],
      dataOut: [328, 242, 24, 24],
      dataIn: [568, 242, 24, 24],
      unused: [818, 242, 24, 24],
      drop: [920, 238, 32, 32],
      sync: [355, 365, 200, 18],
      check: [395, 430, 120, 80],
      accept: [110, 570, 220, 75],
      reject: [580, 570, 260, 75],
      merge: [400, 710, 110, 65],
      done: [435, 860, 40, 40],
    },
    { dataOut: "compose", dataIn: "fetch", unused: "fetch" },
  ),
);

let deployment = uml(
  `uml placements "Повторное размещение"
diagram main "Один артефакт на двух узлах" type=deployment
device first "Сервер A"
device second "Сервер B"
executionEnvironment envA "Среда A" owner=first
executionEnvironment envB "Среда B" owner=second
artifact archive "cards.jar" fileName=cards.jar
component service "Сервис карточек"
deployment one "deploy" location=envA artifact=archive
deployment two "deploy" location=envB artifact=archive
manifestation implementation "manifest" from=archive to=service
communicationPath path "HTTPS / 443" from=first to=second protocol=HTTPS port=443`,
  {
    first: [70, 60, 400, 370],
    second: [650, 60, 400, 370],
    envA: [110, 145, 310, 200],
    envB: [690, 145, 310, 200],
    archive: [155, 220, 220, 70],
    service: [420, 570, 280, 90],
  },
  { envA: "first", envB: "second", archive: "envA" },
);
const secondView = {
  id: "v_archiveB",
  kind: "view",
  label: "",
  properties: { diagram: "main", element: "archive", parent: "v_envB" },
};
deployment.model.elements.push(secondView);
deployment.model.elements.find((e) => e.id === "v_two")!.properties.to =
  secondView.id;
deployment.layout.nodes[secondView.id] = {
  x: 735,
  y: 220,
  width: 220,
  height: 70,
};
deployment.source = deployment.draft = generateUnified(
  textModel(deployment.model),
);
await save("deployment-repeated-artifact", decodeUml(deployment));

const sources = [
  [
    "flowchart-continuation",
    flowchartEngine,
    `flowchart continuation "Два листа и подпрограмма"
algorithm main "Проверка"
algorithm helper "Подготовка"
diagram first "Проверить" type=algorithm algorithm=main
diagram second "Завершить" type=algorithm algorithm=main
diagram sub "Подпрограмма" type=algorithm algorithm=helper
start begin "Начало" owner=main
subroutine call "Подготовить" owner=main target=helper
decision check "Готово?" owner=main mode=binary expression=ready
operation retry "Повторить" owner=main
offpage leave "A" owner=main code=A
offpage enter "A" owner=main code=A
end finish "Конец" owner=main
start subStart "Начало" owner=helper
operation prepare "Подготовить данные" owner=helper
end subEnd "Возврат" owner=helper
flow f1 "" from=begin to=call
flow f2 "" from=call to=check
flow f3 Да from=check to=leave guard=ready
flow f4 Иначе from=check to=retry otherwise=true
flow f5 "" from=retry to=check
continuation transfer "" from=leave to=enter
flow f6 "" from=enter to=finish
flow s1 "" from=subStart to=prepare
flow s2 "" from=prepare to=subEnd
view v_begin "" diagram=first element=begin
view v_call "" diagram=first element=call
view v_check "" diagram=first element=check
view v_retry "" diagram=first element=retry
view v_leave "" diagram=first element=leave
view v_enter "" diagram=second element=enter
view v_finish "" diagram=second element=finish
view v_subStart "" diagram=sub element=subStart
view v_prepare "" diagram=sub element=prepare
view v_subEnd "" diagram=sub element=subEnd
view v_f1 "" diagram=first element=f1 from=v_begin to=v_call
view v_f2 "" diagram=first element=f2 from=v_call to=v_check
view v_f3 "" diagram=first element=f3 from=v_check to=v_leave
view v_f4 "" diagram=first element=f4 from=v_check to=v_retry
view v_f5 "" diagram=first element=f5 from=v_retry to=v_check
view v_f6 "" diagram=second element=f6 from=v_enter to=v_finish
view v_s1 "" diagram=sub element=s1 from=v_subStart to=v_prepare
view v_s2 "" diagram=sub element=s2 from=v_prepare to=v_subEnd`,
  ],
  [
    "chart-zero-missing",
    chartEngine,
    `chart values "Значения и отсутствие данных"
plot plot "Учебные наблюдения" kind=column decimals=2 unit=балл sourceNote="Демонстрационные значения"
diagram main "Наблюдения" type=chart plot=plot
category negative Минус owner=plot order=0
category zero Ноль owner=plot order=1
category missing Пропуск owner=plot order=2
category fraction Дробь owner=plot order=3
series first "Серия A" owner=plot order=0
series second "Серия B" owner=plot order=1
value a1 "" owner=first category=negative number=-2.5
value a2 "" owner=first category=zero number=0
value a3 "" owner=first category=missing missing=true
value a4 "" owner=first category=fraction number=3.25
value b1 "" owner=second category=negative number=-1
value b2 "" owner=second category=zero number=1
value b3 "" owner=second category=missing number=2
value b4 "" owner=second category=fraction number=1.75
view plotView "" diagram=main element=plot`,
  ],
  [
    "function-tree-subtree",
    functionTreeEngine,
    `functree tree "Иерархия функций"
function root "Обслуживать карточки" order=0 code=F0
function prepare "Подготовить" parent=root order=0
function publish "Опубликовать" parent=root order=1
function compose "Составить BOM" parent=prepare order=0
function check "Проверить BOM" parent=prepare order=1
diagram main "Полное дерево" type=tree root=root
diagram detail "Подготовка" type=tree root=prepare
view v_root "" diagram=main element=root
view v_prepare "" diagram=main element=prepare
view v_publish "" diagram=main element=publish
view v_compose "" diagram=main element=compose
view v_check "" diagram=main element=check
view d_prepare "" diagram=detail element=prepare
view d_compose "" diagram=detail element=compose
view d_check "" diagram=detail element=check`,
  ],
  [
    "scheme-code-segments",
    schemeEngine,
    `scheme code "Код BOM"
diagram main "Редактируемые сегменты" type=coding
codePattern pattern "Номер версии"
segment prefix "Префикс" owner=pattern kind=literal literal=BOM order=0
segment separator "Разделитель" owner=pattern kind=literal literal="-" order=1
segment counter "Номер" owner=pattern kind=counter width=5 alphabet=digits example=00127 meaning="Условный порядковый номер" order=2
view patternView "" diagram=main element=pattern`,
  ],
  [
    "wireframe-table-modal",
    wireframeEngine,
    `wireframe demo "Таблица и локальное окно"
screen home "Карточки" initial=true role=Редактор
diagram main "Экран" type=screen screen=home
widget table "Карточки" owner=home type=table order=0
tableColumn code "Код" owner=table key=code dataType=text order=0
tableColumn name "Название" owner=table key=name dataType=text order=1
tableRow row "" owner=table order=0
tableCell codeCell "" owner=row column=code value=DEMO-01
tableCell nameCell "" owner=row column=name value="Учебная карточка"
widget open "Проверить" owner=home type=button order=1
widget modal "Результат проверки" owner=home type=modal state=hidden order=2
widget result "Демонстрация" owner=modal type=text text="Проверка не вызывает сервер" order=0
widget close "Закрыть" owner=modal type=button order=1
uiAction show "Открыть окно" owner=open event=click kind=openModal target=modal
uiAction hide "Закрыть окно" owner=close event=click kind=closeModal target=modal
view homeView "" diagram=main element=home
view tableView "" diagram=main element=table parent=homeView
view openView "" diagram=main element=open parent=homeView
view modalView "" diagram=main element=modal parent=homeView
view resultView "" diagram=main element=result parent=modalView
view closeView "" diagram=main element=close parent=modalView`,
  ],
] as const;
for (const [name, engine, source] of sources) {
  const parsed = engine.inspect(source);
  if (!parsed.model)
    throw new Error(`${name}: ${JSON.stringify(parsed.diagnostics)}`);
  let doc = engine.create(parsed.model);
  for (const sheet of doc.model.elements.filter((e) => e.kind === "diagram"))
    doc = arrangeBasic(doc, sheet.id) as typeof doc;
  await save(name, doc);
}
