import { writeFile } from "node:fs/promises";
import path from "node:path";

import {MODEL_DIR as out, omniModule} from './runtime.mjs';
const {idef0DocumentFromSource} = await omniModule('src/notations/idef0/document.ts');
const {encodeProject} = await omniModule('src/persistence/project.ts');

const asIsSource = `idef0 im_pr4_idef0_as_is "Ручная подготовка и актуализация карточки — AS-IS"
diagram context "Ручная подготовка и актуализация карточки — AS-IS" node=A-0 purpose="Зафиксировать разрозненный ручной процесс и точки позднего обнаружения ошибок" viewpoint="Менеджер маркетплейсов" author="Албахтин И.В." date="04.10.2026" project="ИМ, практическая работа 4 — ООО «Юкомс»" status=publication context=TOP pageNumber=1
function root "Подготавливать и актуализировать карточку вручную" in=context number=0
boundary ctx_task "Задание на карточку или изменение" in=context side=left direction=in order=1
boundary ctx_bom "Модельный ряд и сведения производства" in=context side=left direction=in order=2
boundary ctx_market "Прайсы, остатки и изображения" in=context side=left direction=in order=3
boundary ctx_ozon "Замечания Ozon" in=context side=left direction=in order=4
boundary ctx_category "Требования категории Ozon" in=context side=top direction=in order=1
boundary ctx_manual "Устные согласования и локальные инструкции" in=context side=top direction=in order=2
boundary ctx_price "Наценка и приоритеты работ" in=context side=top direction=in order=3
boundary ctx_card "Вручную заполненная карточка" in=context side=right direction=out order=1
boundary ctx_result "Статус публикации или возврат" in=context side=right direction=out order=2
boundary ctx_files "Разрозненные журналы и файлы" in=context side=right direction=out order=3
boundary ctx_people "Менеджер, производство и дизайнер" in=context side=bottom direction=in order=1
boundary ctx_spreadsheets "Электронные таблицы и общие папки" in=context side=bottom direction=in order=2
boundary ctx_channels "Почта, мессенджеры и кабинет Ozon" in=context side=bottom direction=in order=3
diagram decomposition "Подготавливать и актуализировать карточку вручную" in=root node=A0 purpose="Показать ручные передачи, повторный ввод и возврат после публикации" viewpoint="Менеджер маркетплейсов" author="Албахтин И.В." date="04.10.2026" project="ИМ, практическая работа 4 — ООО «Юкомс»" status=publication context=A-0 pageNumber=2
function A1 "Собрать сведения из писем и таблиц" in=decomposition number=1
function A2 "Собрать и согласовать модельный ряд вручную" in=decomposition number=2
function A3 "Рассчитать цену и перенести характеристики" in=decomposition number=3
function A4 "Подготовить описание и сверить изображения" in=decomposition number=4
function A5 "Опубликовать и записать результат вручную" in=decomposition number=5
boundary dec_task "Задание на карточку или изменение" in=decomposition side=left direction=in order=1 parentArrow=c_task parentEnd=to
boundary dec_bom "Модельный ряд и сведения производства" in=decomposition side=left direction=in order=2 parentArrow=c_bom parentEnd=to
boundary dec_market "Прайсы, остатки и изображения" in=decomposition side=left direction=in order=3 parentArrow=c_market parentEnd=to
boundary dec_ozon "Замечания Ozon" in=decomposition side=left direction=in order=4 parentArrow=c_ozon parentEnd=to
boundary dec_category "Требования категории Ozon" in=decomposition side=top direction=in order=1 parentArrow=c_category parentEnd=to
boundary dec_manual "Устные согласования и локальные инструкции" in=decomposition side=top direction=in order=2 parentArrow=c_manual parentEnd=to
boundary dec_price "Наценка и приоритеты работ" in=decomposition side=top direction=in order=3 parentArrow=c_price parentEnd=to
boundary dec_card "Вручную заполненная карточка" in=decomposition side=right direction=out order=1 parentArrow=c_card parentEnd=from
boundary dec_result "Статус публикации или возврат" in=decomposition side=right direction=out order=2 parentArrow=c_result parentEnd=from
boundary dec_files "Разрозненные журналы и файлы" in=decomposition side=right direction=out order=3 parentArrow=c_files parentEnd=from
boundary dec_people "Менеджер, производство и дизайнер" in=decomposition side=bottom direction=in order=1 parentArrow=c_people parentEnd=to
boundary dec_spreadsheets "Электронные таблицы и общие папки" in=decomposition side=bottom direction=in order=2 parentArrow=c_spreadsheets parentEnd=to
boundary dec_channels "Почта, мессенджеры и кабинет Ozon" in=decomposition side=bottom direction=in order=3 parentArrow=c_channels parentEnd=to
arrow c_task "Задание на карточку или изменение" from=ctx_task to=root role=input toOrder=1
arrow c_bom "Модельный ряд и сведения производства" from=ctx_bom to=root role=input toOrder=2
arrow c_market "Прайсы, остатки и изображения" from=ctx_market to=root role=input toOrder=3
arrow c_ozon "Замечания Ozon" from=ctx_ozon to=root role=input toOrder=4
arrow c_category "Требования категории Ozon" from=ctx_category to=root role=control toOrder=1
arrow c_manual "Устные согласования и локальные инструкции" from=ctx_manual to=root role=control toOrder=2
arrow c_price "Наценка и приоритеты работ" from=ctx_price to=root role=control toOrder=3
arrow c_card "Вручную заполненная карточка" from=root to=ctx_card role=output fromOrder=1
arrow c_result "Статус публикации или возврат" from=root to=ctx_result role=output fromOrder=2
arrow c_files "Разрозненные журналы и файлы" from=root to=ctx_files role=output fromOrder=3
arrow c_people "Менеджер, производство и дизайнер" from=ctx_people to=root role=mechanism toOrder=1
arrow c_spreadsheets "Электронные таблицы и общие папки" from=ctx_spreadsheets to=root role=mechanism toOrder=2
arrow c_channels "Почта, мессенджеры и кабинет Ozon" from=ctx_channels to=root role=mechanism toOrder=3
arrow d_task "Задание на карточку или изменение" from=dec_task to=A1 role=input toOrder=1
arrow d_bom "Модельный ряд и сведения производства" from=dec_bom to=A2 role=input toOrder=1
arrow d_market "Прайсы, остатки и изображения" from=dec_market to=A1 role=input toOrder=2
arrow d_images "Изображения" from=dec_market to=A4 role=input toOrder=1 branchOf=d_market
arrow d_ozon "Замечания Ozon" from=dec_ozon to=A2 role=input toOrder=2
arrow d_category "Требования категории Ozon" from=dec_category to=A4 role=control toOrder=1
arrow d_category_a5 -h "Требования категории Ozon" from=dec_category to=A5 role=control toOrder=1 branchOf=d_category
arrow d_manual "Устные согласования и локальные инструкции" from=dec_manual to=A2 role=control toOrder=1
arrow d_price "Наценка и приоритеты работ" from=dec_price to=A3 role=control toOrder=1
arrow d_price_a1 -h "Наценка и приоритеты работ" from=dec_price to=A1 role=control toOrder=1 branchOf=d_price
arrow d_card "Вручную заполненная карточка" from=A5 to=dec_card role=output fromOrder=1
arrow d_result "Статус публикации или возврат" from=A5 to=dec_result role=output fromOrder=2
arrow d_files "Разрозненные журналы и файлы" from=A5 to=dec_files role=output fromOrder=3
arrow d_people "Менеджер, производство и дизайнер" from=dec_people to=A2 role=mechanism toOrder=1
arrow d_people_a4 -h "Менеджер, производство и дизайнер" from=dec_people to=A4 role=mechanism toOrder=1 branchOf=d_people
arrow d_spreadsheets "Электронные таблицы и общие папки" from=dec_spreadsheets to=A1 role=mechanism toOrder=1
arrow d_spreadsheets_a3 -h "Электронные таблицы и общие папки" from=dec_spreadsheets to=A3 role=mechanism toOrder=1 branchOf=d_spreadsheets
arrow d_channels "Почта, мессенджеры и кабинет Ozon" from=dec_channels to=A5 role=mechanism toOrder=1
arrow step12 "D1 Несогласованный комплект исходных данных" from=A1 to=A2 role=input
arrow step23 "D2 Согласованный вручную модельный ряд" from=A2 to=A3 role=input
arrow step34 "D3 Расчёты и перенесённые характеристики" from=A3 to=A4 role=input
arrow step45 "D4 Черновик карточки и файлы" from=A4 to=A5 role=input
arrow correction "D5 Общий возврат без точной локализации причины" from=A5 to=A2 role=control
`;

const toBeSource = `idef0 im_pr5_idef0_to_be "Управляемая подготовка и публикация карточки — TO-BE"
diagram context "Управляемая подготовка и публикация карточки — TO-BE" node=A-0 purpose="Показать целевой процесс с версиями, автоматическими проверками и контролируемой публикацией" viewpoint="Владелец процесса и менеджер маркетплейсов" author="Албахтин И.В." date="04.10.2026" project="ИМ, практическая работа 5 — ООО «Юкомс»" status=publication context=TOP pageNumber=1
function root "Управлять подготовкой и публикацией версии карточки" in=context number=0
boundary ctx_change "Заявка или событие изменения данных" in=context side=left direction=in order=1
boundary ctx_sources "Данные поставщиков, склада и производства" in=context side=left direction=in order=2
boundary ctx_media "Версионированные изображения" in=context side=left direction=in order=3
boundary ctx_response "Ответ API Ozon" in=context side=left direction=in order=4
boundary ctx_rules "Формализованные правила совместимости" in=context side=top direction=in order=1
boundary ctx_category "Матрица обязательных полей Ozon" in=context side=top direction=in order=2
boundary ctx_sla "Роли, SLA и правила утверждения" in=context side=top direction=in order=3
boundary ctx_version "Утверждённая версия карточки" in=context side=right direction=out order=1
boundary ctx_publish "Подтверждённая публикация или адресная задача" in=context side=right direction=out order=2
boundary ctx_protocol "Протокол проверок и журнал версий" in=context side=right direction=out order=3
boundary ctx_metrics "Показатели актуальности и сроков" in=context side=right direction=out order=4
boundary ctx_roles "Менеджер, производство, дизайнер и ИТ" in=context side=bottom direction=in order=1
boundary ctx_system "ИС, единая БД и механизм правил" in=context side=bottom direction=in order=2
boundary ctx_adapter "Очередь публикаций и адаптер API Ozon" in=context side=bottom direction=in order=3
diagram decomposition "Управлять подготовкой и публикацией версии карточки" in=root node=A0 purpose="Показать ранний контроль, управляемые версии и адресную обработку исключений" viewpoint="Владелец процесса и менеджер маркетплейсов" author="Албахтин И.В." date="04.10.2026" project="ИМ, практическая работа 5 — ООО «Юкомс»" status=publication context=A-0 pageNumber=2
function A1 "Зарегистрировать изменение и загрузить данные" in=decomposition number=1
function A2 "Создать версию модельного ряда и определить зависимости" in=decomposition number=2
function A3 "Проверить совместимость и выполнить расчёты" in=decomposition number=3
function A4 "Сформировать и согласовать пакет карточки" in=decomposition number=4
function A5 "Поставить версию в очередь и опубликовать" in=decomposition number=5
function A6 "Обработать ответ и обновить показатели" in=decomposition number=6
boundary dec_change "Заявка или событие изменения данных" in=decomposition side=left direction=in order=1 parentArrow=c_change parentEnd=to
boundary dec_sources "Данные поставщиков, склада и производства" in=decomposition side=left direction=in order=2 parentArrow=c_sources parentEnd=to
boundary dec_media "Версионированные изображения" in=decomposition side=left direction=in order=3 parentArrow=c_media parentEnd=to
boundary dec_response "Ответ API Ozon" in=decomposition side=left direction=in order=4 parentArrow=c_response parentEnd=to
boundary dec_rules "Формализованные правила совместимости" in=decomposition side=top direction=in order=1 parentArrow=c_rules parentEnd=to
boundary dec_category "Матрица обязательных полей Ozon" in=decomposition side=top direction=in order=2 parentArrow=c_category parentEnd=to
boundary dec_sla "Роли, SLA и правила утверждения" in=decomposition side=top direction=in order=3 parentArrow=c_sla parentEnd=to
boundary dec_version "Утверждённая версия карточки" in=decomposition side=right direction=out order=1 parentArrow=c_version parentEnd=from
boundary dec_publish "Подтверждённая публикация или адресная задача" in=decomposition side=right direction=out order=2 parentArrow=c_publish parentEnd=from
boundary dec_protocol "Протокол проверок и журнал версий" in=decomposition side=right direction=out order=3 parentArrow=c_protocol parentEnd=from
boundary dec_metrics "Показатели актуальности и сроков" in=decomposition side=right direction=out order=4 parentArrow=c_metrics parentEnd=from
boundary dec_roles "Менеджер, производство, дизайнер и ИТ" in=decomposition side=bottom direction=in order=1 parentArrow=c_roles parentEnd=to
boundary dec_system "ИС, единая БД и механизм правил" in=decomposition side=bottom direction=in order=2 parentArrow=c_system parentEnd=to
boundary dec_adapter "Очередь публикаций и адаптер API Ozon" in=decomposition side=bottom direction=in order=3 parentArrow=c_adapter parentEnd=to
arrow c_change "Заявка или событие изменения данных" from=ctx_change to=root role=input toOrder=1
arrow c_sources "Данные поставщиков, склада и производства" from=ctx_sources to=root role=input toOrder=2
arrow c_media "Версионированные изображения" from=ctx_media to=root role=input toOrder=3
arrow c_response "Ответ API Ozon" from=ctx_response to=root role=input toOrder=4
arrow c_rules "Формализованные правила совместимости" from=ctx_rules to=root role=control toOrder=1
arrow c_category "Матрица обязательных полей Ozon" from=ctx_category to=root role=control toOrder=2
arrow c_sla "Роли, SLA и правила утверждения" from=ctx_sla to=root role=control toOrder=3
arrow c_version "Утверждённая версия карточки" from=root to=ctx_version role=output fromOrder=1
arrow c_publish "Подтверждённая публикация или адресная задача" from=root to=ctx_publish role=output fromOrder=2
arrow c_protocol "Протокол проверок и журнал версий" from=root to=ctx_protocol role=output fromOrder=3
arrow c_metrics "Показатели актуальности и сроков" from=root to=ctx_metrics role=output fromOrder=4
arrow c_roles "Менеджер, производство, дизайнер и ИТ" from=ctx_roles to=root role=mechanism toOrder=1
arrow c_system "ИС, единая БД и механизм правил" from=ctx_system to=root role=mechanism toOrder=2
arrow c_adapter "Очередь публикаций и адаптер API Ozon" from=ctx_adapter to=root role=mechanism toOrder=3
arrow d_change "Заявка или событие изменения данных" from=dec_change to=A1 role=input toOrder=1
arrow d_sources "Данные поставщиков, склада и производства" from=dec_sources to=A1 role=input toOrder=2
arrow d_media "Версионированные изображения" from=dec_media to=A4 role=input toOrder=1
arrow d_response "Ответ API Ozon" from=dec_response to=A6 role=input toOrder=1
arrow d_rules "Формализованные правила совместимости" from=dec_rules to=A3 role=control toOrder=1
arrow d_category "Матрица обязательных полей Ozon" from=dec_category to=A4 role=control toOrder=1
arrow d_category_a5 -h "Матрица обязательных полей Ozon" from=dec_category to=A5 role=control toOrder=1 branchOf=d_category
arrow d_sla "Роли, SLA и правила утверждения" from=dec_sla to=A4 role=control toOrder=2
arrow d_sla_a1 -h "Роли, SLA и правила утверждения" from=dec_sla to=A1 role=control toOrder=1 branchOf=d_sla
arrow d_sla_a2 -h "Роли, SLA и правила утверждения" from=dec_sla to=A2 role=control toOrder=1 branchOf=d_sla
arrow d_sla_a6 -h "Роли, SLA и правила утверждения" from=dec_sla to=A6 role=control toOrder=1 branchOf=d_sla
arrow d_version "Утверждённая версия карточки" from=A5 to=dec_version role=output fromOrder=1
arrow d_publish "Подтверждённая публикация или адресная задача" from=A6 to=dec_publish role=output fromOrder=1
arrow d_protocol "Протокол проверок и журнал версий" from=A6 to=dec_protocol role=output fromOrder=2
arrow d_metrics "Показатели актуальности и сроков" from=A6 to=dec_metrics role=output fromOrder=3
arrow d_roles "Менеджер, производство, дизайнер и ИТ" from=dec_roles to=A4 role=mechanism toOrder=1
arrow d_roles_a6 -h "Менеджер, производство, дизайнер и ИТ" from=dec_roles to=A6 role=mechanism toOrder=1 branchOf=d_roles
arrow d_system "ИС, единая БД и механизм правил" from=dec_system to=A1 role=mechanism toOrder=1
arrow d_system_a2 -h "ИС, единая БД и механизм правил" from=dec_system to=A2 role=mechanism toOrder=1 branchOf=d_system
arrow d_system_a3 -h "ИС, единая БД и механизм правил" from=dec_system to=A3 role=mechanism toOrder=1 branchOf=d_system
arrow d_system_a4 -h "ИС, единая БД и механизм правил" from=dec_system to=A4 role=mechanism toOrder=2 branchOf=d_system
arrow d_adapter "Очередь публикаций и адаптер API Ozon" from=dec_adapter to=A5 role=mechanism toOrder=1
arrow d_adapter_a6 -h "Очередь публикаций и адаптер API Ozon" from=dec_adapter to=A6 role=mechanism toOrder=2 branchOf=d_adapter
arrow step12 "D1 Нормализованный снимок исходных данных" from=A1 to=A2 role=input
arrow step23 "D2 Версия модельного ряда и перечень затронутых карточек" from=A2 to=A3 role=input
arrow step34 "D3 Проверенный модельный ряд и расчётная ведомость" from=A3 to=A4 role=input
arrow step45 "D4 Утверждённый неизменяемый пакет" from=A4 to=A5 role=input
arrow step56 "D5 Идентификатор попытки и отправленный пакет" from=A5 to=A6 role=input
arrow correction "D6 Адресная задача на исправление" from=A6 to=A2 role=control
`;

function place(doc: any, kind: "as-is" | "to-be") {
  const asIs = kind === "as-is";
  const context = doc.model.nodes.find((n: any) => n.id === "context");
  const decomposition = doc.model.nodes.find((n: any) => n.id === "decomposition");
  doc.layout.frames[context.id] = { x: 0, y: 0, width: 2200, height: 1180 };
  doc.layout.frames[decomposition.id] = {
    x: 0,
    y: 0,
    width: asIs ? 2700 : 3150,
    height: asIs ? 1450 : 1580,
  };
  doc.layout.positions.root = { x: 720, y: 390 };
  doc.layout.sizes = {
    root: { width: 760, height: 280 },
  };
  const ctxLeft = asIs
    ? ["ctx_task", "ctx_bom", "ctx_market", "ctx_ozon"]
    : ["ctx_change", "ctx_sources", "ctx_media", "ctx_response"];
  const ctxTop = asIs
    ? ["ctx_category", "ctx_manual", "ctx_price"]
    : ["ctx_rules", "ctx_category", "ctx_sla"];
  const ctxRight = asIs
    ? ["ctx_card", "ctx_result", "ctx_files"]
    : ["ctx_version", "ctx_publish", "ctx_protocol", "ctx_metrics"];
  const ctxBottom = asIs
    ? ["ctx_people", "ctx_spreadsheets", "ctx_channels"]
    : ["ctx_roles", "ctx_system", "ctx_adapter"];
  const inputOffsets = [0.22, 0.40, 0.58, 0.76];
  const controlOffsets = [0.25, 0.50, 0.75];
  const outputOffsets = asIs ? [0.28, 0.50, 0.72] : [0.20, 0.40, 0.60, 0.80];
  const mechanismOffsets = [0.25, 0.50, 0.75];
  const contextEdges = asIs
    ? {
        inputs: ["c_task", "c_bom", "c_market", "c_ozon"],
        controls: ["c_category", "c_manual", "c_price"],
        outputs: ["c_card", "c_result", "c_files"],
        mechanisms: ["c_people", "c_spreadsheets", "c_channels"],
      }
    : {
        inputs: ["c_change", "c_sources", "c_media", "c_response"],
        controls: ["c_rules", "c_category", "c_sla"],
        outputs: ["c_version", "c_publish", "c_protocol", "c_metrics"],
        mechanisms: ["c_roles", "c_system", "c_adapter"],
      };
  ctxLeft.forEach((id, i) => {
    doc.layout.positions[id] = { x: 0, y: 390 + 300 * inputOffsets[i] };
    doc.layout.arrows[contextEdges.inputs[i]] = { toOffset: inputOffsets[i] };
  });
  ctxTop.forEach((id, i) => {
    doc.layout.positions[id] = { x: 720 + 760 * controlOffsets[i], y: 0 };
    doc.layout.arrows[contextEdges.controls[i]] = { toOffset: controlOffsets[i] };
  });
  ctxRight.forEach((id, i) => {
    doc.layout.positions[id] = { x: 2200, y: 390 + 300 * outputOffsets[i] };
    doc.layout.arrows[contextEdges.outputs[i]] = { fromOffset: outputOffsets[i] };
  });
  ctxBottom.forEach((id, i) => {
    doc.layout.positions[id] = { x: 720 + 760 * mechanismOffsets[i], y: 1180 };
    doc.layout.arrows[contextEdges.mechanisms[i]] = { toOffset: mechanismOffsets[i] };
  });
  contextEdges.mechanisms.forEach((edgeId, i) => {
    doc.layout.arrows[edgeId].label = {
      x: 720 + 760 * mechanismOffsets[i],
      y: 900 + i * 62,
    };
  });

  const count = asIs ? 5 : 6;
  for (let i = 1; i <= count; i += 1) {
    doc.layout.positions[`A${i}`] = {
      x: 250 + (i - 1) * (asIs ? 470 : 475),
      y: 210 + (i - 1) * 155,
    };
    doc.layout.sizes[`A${i}`] = { width: asIs ? 300 : 320, height: 150 };
  }
  const decLeft = asIs
    ? ["dec_task", "dec_bom", "dec_market", "dec_ozon"]
    : ["dec_change", "dec_sources", "dec_media", "dec_response"];
  const decTop = asIs
    ? ["dec_category", "dec_manual", "dec_price"]
    : ["dec_rules", "dec_category", "dec_sla"];
  const decRight = asIs
    ? ["dec_card", "dec_result", "dec_files"]
    : ["dec_version", "dec_publish", "dec_protocol", "dec_metrics"];
  const decBottom = asIs
    ? ["dec_people", "dec_spreadsheets", "dec_channels"]
    : ["dec_roles", "dec_system", "dec_adapter"];
  const dw = doc.layout.frames.decomposition.width;
  const dh = doc.layout.frames.decomposition.height;
  decLeft.forEach((id, i) => (doc.layout.positions[id] = { x: 0, y: 265 + i * 210 }));
  decTop.forEach((id, i) => (doc.layout.positions[id] = { x: 500 + i * 740, y: 0 }));
  decRight.forEach((id, i) => (doc.layout.positions[id] = { x: dw, y: 300 + i * 210 }));
  decBottom.forEach((id, i) => (doc.layout.positions[id] = { x: 650 + i * 760, y: dh }));

  doc.layout.textStyles = Object.fromEntries([
    ...doc.model.nodes
      .filter((n: any) => n.kind === "function")
      .map((n: any) => [n.id, { fontSize: n.id === "root" ? 22 : 18, wrap: true }]),
    ...doc.model.edges.map((e: any) => [e.id, { fontSize: 13, wrap: true, width: 250 }]),
  ]);
  return doc;
}

async function main() {
  for (const [file, source, kind] of [
    ["ИМ_ПР4_IDEF0_AS-IS.omni", asIsSource, "as-is"],
    ["ИМ_ПР5_IDEF0_TO-BE.omni", toBeSource, "to-be"],
  ] as const) {
    const doc = place(idef0DocumentFromSource(source), kind);
    await writeFile(path.join(out, file), `${await encodeProject(doc)}\n`, "utf8");
    console.log(file);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
