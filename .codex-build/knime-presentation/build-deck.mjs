import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "D:\\GitHub\\MIREA";
const buildDir = path.join(workspaceDir, ".codex-build", "knime-presentation");
const assetDir = path.join(buildDir, "assets");
const outputDir = path.join(workspaceDir, "output");
const finalPath = path.join(outputDir, "KNIME_Big_Data_RU.pptx");
const scriptPath = path.join(outputDir, "KNIME_Big_Data_RU_script.md");
const stagingDir = path.join(buildDir, ".codex-finalizer");
const SKILL_DIR = "C:\\Users\\VeX\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.905.11957\\skills\\presentations";
const RUNTIME_PYTHON = "C:\\Users\\VeX\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const { finalizePresentation, applyPresentationChartFont } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href,
);

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(stagingDir, { recursive: true });

const W = 1280;
const H = 720;
const FONT = "Arial";
const C = {
  ink: "#171717",
  paper: "#F7F4EC",
  white: "#FFFFFF",
  yellow: "#FFD800",
  amber: "#F6B800",
  cyan: "#40C6D6",
  orange: "#F18D3A",
  blue: "#3F7CAC",
  green: "#77B255",
  gray: "#64676D",
  light: "#E9E6DE",
  paleYellow: "#FFF2A6",
};

const presentation = Presentation.create({ slideSize: { width: W, height: H } });
const slidesMeta = [];

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: opts.geometry ?? "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill ?? "none",
    line: opts.line ?? { fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: FONT,
    fontSize: opts.fontSize ?? 40,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.vAlign ?? "top",
    autoFit: "none",
    wrap: "square",
    lineSpacing: opts.lineSpacing ?? 1.0,
    insets: opts.insets ?? { top: 4, right: 6, bottom: 4, left: 6 },
  };
  return shape;
}

function addBox(slide, x, y, w, h, fill, radius = "roundRect", lineFill = "none", lineWidth = 0) {
  return slide.shapes.add({
    geometry: radius,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { fill: lineFill, width: lineWidth },
  });
}

function addTitle(slide, title, dark = false) {
  addBox(slide, 62, 42, 72, 10, C.yellow, "rect");
  addText(slide, title, 62, 64, 1150, 78, {
    fontSize: 52,
    bold: true,
    color: dark ? C.white : C.ink,
    vAlign: "middle",
  });
}

function addNode(slide, x, y, w, h, label, fill, opts = {}) {
  const n = addBox(slide, x, y, w, h, fill, "roundRect", opts.lineFill ?? C.ink, opts.lineWidth ?? 2);
  n.text = label;
  n.text.style = {
    typeface: FONT,
    fontSize: opts.fontSize ?? 40,
    bold: true,
    color: opts.color ?? C.ink,
    alignment: "center",
    verticalAlignment: "middle",
    autoFit: "none",
    wrap: "square",
    lineSpacing: 0.95,
    insets: { top: 4, right: 8, bottom: 4, left: 8 },
  };
  return n;
}

function connect(slide, a, b, opts = {}) {
  return slide.shapes.connect(a, b, {
    kind: opts.kind ?? "straight",
    fromSide: opts.fromSide ?? "right",
    toSide: opts.toSide ?? "left",
    line: { style: opts.style ?? "solid", fill: opts.color ?? C.gray, width: opts.width ?? 4 },
    head: { type: "none" },
    tail: opts.head === false ? { type: "none" } : { type: "arrow", width: "med", length: "med" },
  });
}

async function addImage(slide, filename, x, y, w, h, opts = {}) {
  const blob = await fs.readFile(path.join(assetDir, filename));
  return slide.images.add({
    blob,
    contentType: filename.endsWith(".jpg") ? "image/jpeg" : "image/png",
    alt: opts.alt ?? filename,
    fit: opts.fit ?? "contain",
    position: { left: x, top: y, width: w, height: h },
    geometry: opts.geometry ?? "rect",
    ...(opts.borderRadius ? { borderRadius: opts.borderRadius } : {}),
    ...(opts.crop ? { crop: opts.crop } : {}),
  });
}

function addCaption(slide, text, x, y, w, dark = false) {
  addText(slide, text, x, y, w, 52, { fontSize: 40, bold: true, color: dark ? C.white : C.ink, align: "center", vAlign: "middle" });
}

function register(slide, title, slideText, notes, sources = []) {
  const noteText = [
    `Текст доклада:\n${notes}`,
    sources.length ? `Источники:\n${sources.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  slide.speakerNotes.textFrame.setText(noteText);
  slidesMeta.push({ title, slideText, notes, sources });
}

// 1. Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = C.ink;
  await addImage(slide, "cover-workflow.png", 0, 0, W, H, { fit: "cover", alt: "Абстрактный визуальный конвейер обработки данных" });
  addBox(slide, 0, 0, 610, H, { type: "gradient", gradientKind: "linear", angleDeg: 0, stops: [
    { offset: 0, color: "#0B0B0B" }, { offset: 100000, color: "#0B0B0BDD" },
  ] }, "rect");
  addText(slide, "Технологии и\nинструментарий анализа\nбольших данных", 64, 92, 560, 270, { fontSize: 58, bold: true, color: C.white, lineSpacing: 0.9 });
  addText(slide, "KNIME Analytics Platform", 70, 400, 520, 74, { fontSize: 44, bold: true, color: C.yellow, vAlign: "middle" });
  addText(slide, "Визуальные рабочие процессы от данных до решения", 70, 494, 500, 122, { fontSize: 40, color: C.white, lineSpacing: 1.0 });
  register(slide, "Технологии и инструментарий анализа больших данных", "KNIME Analytics Platform", "Сегодня я разберу KNIME Analytics Platform как инструмент анализа данных. Сначала покажу, какую основную задачу решает платформа и как устроен визуальный рабочий процесс. Затем разберу прикладной пример прогнозирования оттока клиентов, включая подготовку данных, обучение модели, проверку качества и применение результата.");
}

// 2. Two questions
{
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "Два вопроса доклада");
  addBox(slide, 70, 178, 520, 450, C.ink, "roundRect");
  addText(slide, "01", 102, 210, 120, 74, { fontSize: 60, bold: true, color: C.yellow, vAlign: "middle" });
  addText(slide, "Основная задача\nKNIME", 102, 300, 430, 136, { fontSize: 50, bold: true, color: C.white, lineSpacing: 0.95 });
  addText(slide, "Визуальный workflow для повторяемого анализа", 102, 452, 420, 150, { fontSize: 40, color: C.white, lineSpacing: 1.0 });
  addBox(slide, 690, 178, 520, 450, C.yellow, "roundRect");
  addText(slide, "02", 722, 210, 120, 74, { fontSize: 60, bold: true, color: C.ink, vAlign: "middle" });
  addText(slide, "Прикладной\nпример", 722, 300, 430, 136, { fontSize: 50, bold: true, color: C.ink, lineSpacing: 0.95 });
  addText(slide, "Прогноз оттока на исторических данных", 722, 452, 420, 150, { fontSize: 40, color: C.ink, lineSpacing: 1.0 });
  register(slide, "Два вопроса доклада", "Основная задача KNIME. Прикладной пример.", "Доклад отвечает на два вопроса. Первый вопрос касается назначения инструмента. KNIME помогает собрать анализ в виде исполняемой схемы, где видны источники данных, преобразования и итог. Второй вопрос практический. Мы проследим, как такая схема решает задачу прогнозирования оттока клиентов.");
}

// 3. What is KNIME
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addTitle(slide, "KNIME Analytics Platform");
  addText(slide, "Свободная платформа с открытым исходным кодом для визуального анализа данных", 70, 152, 1140, 104, { fontSize: 44, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  const a = addNode(slide, 90, 350, 230, 150, "ДАННЫЕ", C.light);
  const b = addNode(slide, 400, 310, 250, 230, "СХЕМА", C.yellow, { fontSize: 46 });
  const c = addNode(slide, 740, 350, 190, 150, "МОДЕЛЬ", C.paleYellow);
  const d = addNode(slide, 1000, 350, 190, 150, "ОТЧЁТ", C.cyan);
  connect(slide, a, b);
  connect(slide, b, c);
  connect(slide, c, d);
  addText(slide, "300+ подключений к источникам и сервисам", 150, 586, 980, 64, { fontSize: 40, bold: true, color: C.gray, align: "center", vAlign: "middle" });
  register(slide, "KNIME Analytics Platform", "Открытая платформа. Визуальные workflow. 300+ подключений.", "KNIME Analytics Platform распространяется бесплатно и имеет открытый исходный код. Пользователь собирает анализ на рабочем поле из узлов. Платформа охватывает загрузку и объединение данных, преобразования, визуализацию и машинное обучение. На официальном сайте указано более трёхсот подключений к источникам данных и сервисам.", [
    "https://www.knime.com/knime-analytics-platform",
    "https://www.knime.com/get-started",
  ]);
}

// 4. Main task
{
  const slide = presentation.slides.add();
  slide.background.fill = C.ink;
  addTitle(slide, "Основная задача платформы", true);
  addText(slide, "Собрать повторяемый анализ как наглядную исполняемую схему", 72, 150, 1136, 100, { fontSize: 50, bold: true, color: C.white, align: "center", vAlign: "middle" });
  const n1 = addNode(slide, 60, 365, 190, 132, "ВВОД", C.light);
  const n2 = addNode(slide, 305, 365, 190, 132, "ЧИСТКА", C.paleYellow);
  const n3 = addNode(slide, 550, 365, 190, 132, "ML", C.yellow);
  const n4 = addNode(slide, 795, 365, 190, 132, "ТЕСТ", C.cyan);
  const n5 = addNode(slide, 1040, 365, 180, 132, "ВЫВОД", C.orange);
  connect(slide, n1, n2, { color: C.white });
  connect(slide, n2, n3, { color: C.white });
  connect(slide, n3, n4, { color: C.white });
  connect(slide, n4, n5, { color: C.white });
  addText(slide, "Workflow хранит порядок действий, настройки узлов и связи между ними", 120, 570, 1040, 86, { fontSize: 40, color: C.white, align: "center", vAlign: "middle" });
  register(slide, "Основная задача платформы", "Повторяемый анализ как исполняемая схема.", "Главная задача KNIME состоит в том, чтобы превратить разрозненные операции анализа в повторяемый рабочий процесс. Схема показывает, откуда пришли данные, какие преобразования выполнены, какая модель обучена и куда передан результат. Такой workflow можно запускать целиком, частями или по отдельным узлам, а затем повторять на новых данных.", [
    "https://www.knime.com/why-visual-workflows",
    "https://docs.knime.com/ap/latest/analytics_platform_user_guide/index.html",
  ]);
}

// 5. Nodes
{
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "Узлы и связи");
  const n1 = addNode(slide, 88, 235, 265, 210, "CSV\nREADER", C.orange, { fontSize: 42 });
  const n2 = addNode(slide, 505, 235, 265, 210, "ROW\nFILTER", C.yellow, { fontSize: 42 });
  const n3 = addNode(slide, 922, 235, 265, 210, "SCORER", C.cyan, { fontSize: 42 });
  connect(slide, n1, n2, { width: 6 });
  connect(slide, n2, n3, { width: 6 });
  addText(slide, "Каждый узел выполняет одну операцию. Порты передают таблицы, модели или параметры.", 100, 520, 1080, 110, { fontSize: 40, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  register(slide, "Узлы и связи", "Узел выполняет отдельную операцию. Связи передают данные и модели.", "Узел в KNIME представляет отдельную задачу. Это может быть чтение файла, фильтрация строк, обучение модели или построение визуализации. Входные и выходные порты передают не только таблицы, но также модели, подключения к базам и параметры. Состояние узла показывает, настроен ли он, выполнен ли успешно или требует исправления.", ["https://docs.knime.com/ap/latest/analytics_platform_user_guide/index.html"]);
}

// 6. Ecosystem
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addTitle(slide, "Единая среда анализа");
  const core = addBox(slide, 475, 215, 330, 290, C.ink, "ellipse");
  core.text = "KNIME\nСХЕМА";
  core.text.style = { typeface: FONT, fontSize: 48, bold: true, color: C.yellow, alignment: "center", verticalAlignment: "middle", autoFit: "none", wrap: "square", insets: { top: 8, right: 8, bottom: 8, left: 8 } };
  const p1 = addNode(slide, 72, 175, 285, 120, "ФАЙЛЫ И БД", C.light);
  const p2 = addNode(slide, 72, 440, 285, 120, "PYTHON И R", C.cyan);
  const p3 = addNode(slide, 923, 175, 285, 120, "ML И AI", C.yellow);
  const p4 = addNode(slide, 923, 440, 285, 120, "ОТЧЁТЫ", C.orange);
  connect(slide, p1, core, { head: false, color: C.gray });
  connect(slide, p2, core, { head: false, color: C.gray });
  connect(slide, core, p3, { head: false, color: C.gray });
  connect(slide, core, p4, { head: false, color: C.gray });
  addText(slide, "No-code и low-code дополняются кодом там, где он действительно нужен", 160, 605, 960, 70, { fontSize: 40, bold: true, color: C.gray, align: "center", vAlign: "middle" });
  register(slide, "Единая среда анализа", "Файлы и базы, Python и R, машинное обучение, отчёты.", "Платформа объединяет разные способы работы. Аналитик может использовать готовые узлы без программирования, а для специальных алгоритмов подключить Python или R. Компоненты позволяют упаковать часть схемы в повторно используемый блок. Такой подход удобен, когда в одной команде работают специалисты с разным уровнем подготовки.", [
    "https://www.knime.com/knime-analytics-platform",
    "https://docs.knime.com/ap/latest/python_installation_guide/index.html",
    "https://docs.knime.com/ap/latest/analytics_platform_components_guide/",
  ]);
}

// 7. Big data
{
  const slide = presentation.slides.add();
  slide.background.fill = C.ink;
  addTitle(slide, "Работа с большими данными", true);
  addText(slide, "Вычисления размещаются ближе к данным", 72, 142, 1136, 76, { fontSize: 46, bold: true, color: C.white, align: "center", vAlign: "middle" });
  const local = addNode(slide, 70, 295, 315, 170, "ЛОКАЛЬНО", C.light, { fontSize: 44 });
  const db = addNode(slide, 482, 295, 315, 170, "В БАЗЕ", C.yellow, { fontSize: 44 });
  const spark = addNode(slide, 894, 295, 315, 170, "SPARK", C.cyan, { fontSize: 44 });
  addText(slide, "файлы и память", 75, 485, 305, 64, { fontSize: 40, color: C.white, align: "center", vAlign: "middle" });
  addText(slide, "SQL и pushdown", 487, 485, 305, 64, { fontSize: 40, color: C.white, align: "center", vAlign: "middle" });
  addText(slide, "Hadoop и Databricks", 899, 485, 305, 64, { fontSize: 40, color: C.white, align: "center", vAlign: "middle" });
  addText(slide, "Parquet, ORC, HDFS, Hive, Impala", 195, 596, 890, 64, { fontSize: 40, bold: true, color: C.yellow, align: "center", vAlign: "middle" });
  register(slide, "Работа с большими данными", "Локальные вычисления, выполнение в базе, Spark и Hadoop.", "KNIME не означает, что весь объём обязательно загружается в память одного компьютера. Часть операций можно выполнять в базе данных, а Big Data Extensions интегрируют Spark и экосистему Hadoop. Документация указывает поддержку HDFS, Hive, Impala, форматов Parquet и ORC, а расширение Spark предоставляет более шестидесяти узлов для обработки и аналитики.", [
    "https://docs.knime.com/ap/latest/bigdata_extensions_user_guide/",
    "https://www.knime.com/knime-analytics-platform",
  ]);
}

// 8. Prototype to production
{
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "От прототипа к эксплуатации");
  const p1 = addNode(slide, 70, 245, 300, 210, "ДЕСКТОП", C.yellow, { fontSize: 46 });
  const p2 = addNode(slide, 490, 245, 300, 210, "KNIME\nHUB", C.ink, { fontSize: 46, color: C.white });
  const p3 = addNode(slide, 910, 245, 300, 210, "ДОСТУП", C.cyan, { fontSize: 46 });
  connect(slide, p1, p2, { width: 6 });
  connect(slide, p2, p3, { width: 6 });
  addText(slide, "создание и локальный запуск", 72, 480, 295, 105, { fontSize: 40, color: C.gray, align: "center", vAlign: "middle" });
  addText(slide, "версии, расписание, сервисы", 492, 480, 295, 105, { fontSize: 40, color: C.gray, align: "center", vAlign: "middle" });
  addText(slide, "data app, API, отчёт", 912, 480, 295, 105, { fontSize: 40, color: C.gray, align: "center", vAlign: "middle" });
  register(slide, "От прототипа к эксплуатации", "Analytics Platform для разработки. KNIME Hub для совместной работы и автоматизации.", "На рабочем компьютере KNIME Analytics Platform позволяет бесплатно создавать и запускать workflow. Для совместной работы, версий и промышленного исполнения используется KNIME Hub. В Business Hub доступны расписания, интерактивные приложения, сервисы и триггеры. Это важное разграничение, потому что локальная платформа и серверная эксплуатация относятся к разным уровням продукта.", [
    "https://www.knime.com/knime-hub-pricing",
    "https://docs.knime.com/hub/latest/business_hub_deployments_guide/",
  ]);
}

// 9. Examples
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addTitle(slide, "Прикладные задачи");
  const labels = [
    ["ОТТОК", C.yellow], ["СПРОС", C.cyan], ["АНОМАЛИИ", C.orange],
    ["ТЕКСТ", C.paleYellow], ["ОБСЛУЖИВАНИЕ", C.light], ["ОТЧЁТЫ", C.green],
  ];
  const positions = [[70,190],[475,190],[880,190],[70,435],[475,435],[880,435]];
  labels.forEach(([label, fill], i) => addNode(slide, positions[i][0], positions[i][1], 330, 165, label, fill, { fontSize: label.length > 9 ? 34 : 44 }));
  register(slide, "Прикладные задачи", "Отток, спрос, аномалии, анализ текста, обслуживание, отчёты.", "KNIME применяют не только для машинного обучения. В одной и той же среде можно автоматизировать регулярные отчёты, прогнозировать спрос, искать аномалии, анализировать тексты и строить модели обслуживания оборудования. Далее мы подробно рассмотрим один пример, потому что он хорошо показывает полный цикл работы платформы.", [
    "https://www.knime.com/blog/machine-learning-in-marketing-analytics",
    "https://www.knime.com/templates/churn-prediction",
  ]);
}

// 10. Case data
{
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "Кейс: прогноз оттока клиентов");
  addText(slide, "Цель: оценить вероятность ухода каждого абонента", 70, 145, 1140, 78, { fontSize: 44, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  const chart = slide.charts.add("doughnut", {
    position: { left: 72, top: 245, width: 500, height: 380 },
    categories: ["Остались", "Ушли"],
    series: [{ name: "Доля клиентов", values: [86, 14], points: [{ idx: 0, fill: C.blue }, { idx: 1, fill: C.orange }] }],
    hasLegend: false,
    doughnutOptions: { holeSize: 62, firstSliceAngle: 270 },
    chartFill: "none",
    chartLine: { fill: "none", width: 0 },
  });
  applyPresentationChartFont(chart, { fontFamily: FONT });
  addText(slide, "86%", 220, 330, 200, 72, { fontSize: 58, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  addText(slide, "остались", 160, 560, 220, 58, { fontSize: 40, bold: true, color: C.blue, align: "center", vAlign: "middle" });
  addText(slide, "14% ушли", 370, 560, 190, 58, { fontSize: 40, bold: true, color: C.orange, align: "center", vAlign: "middle" });
  const ds1 = addNode(slide, 690, 250, 220, 130, "ЗВОНКИ", C.orange);
  const ds2 = addNode(slide, 990, 250, 220, 130, "ДОГОВОР", C.yellow);
  const join = addNode(slide, 840, 470, 220, 130, "ПРОФИЛЬ", C.ink, { color: C.white });
  connect(slide, ds1, join, { fromSide: "bottom", toSide: "top", kind: "elbow", color: C.gray });
  connect(slide, ds2, join, { fromSide: "bottom", toSide: "top", kind: "elbow", color: C.gray });
  addText(slide, "3 333 клиента, 21 признак", 645, 618, 610, 60, { fontSize: 40, bold: true, color: C.gray, align: "center", vAlign: "middle" });
  register(slide, "Кейс: прогноз оттока клиентов", "3 333 клиента. 21 признак. 14% ушли.", "В официальном примере используется телеком-набор из трёх тысяч трёхсот тридцати трёх клиентов и двадцати одного признака. Данные о звонках и характеристики договора хранятся в разных файлах. Целевая переменная показывает, ушёл клиент или остался. Класс оттока составляет примерно четырнадцать процентов, поэтому данные несбалансированы.", [
    "https://www.knime.com/blog/predict-customer-churn-low-code-ml-example",
    "https://www.knime.com/blog/visual-scoring-techniques-for-classification-models",
  ]);
}

// 11. Training workflow screenshot
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addTitle(slide, "Учебный workflow целиком");
  await addImage(slide, "training-workflow.png", 45, 160, 1190, 475, { fit: "contain", alt: "Официальный workflow обучения модели оттока в KNIME" });
  addCaption(slide, "Данные     Подготовка     Обучение     Оценка", 90, 640, 1100);
  register(slide, "Учебный workflow целиком", "Данные, подготовка, обучение, оценка.", "На схеме виден полный учебный workflow KNIME. Слева загружаются два файла и объединяются записи клиентов. В центре выполняется исследование и подготовка данных. Затем запускается перекрёстная проверка модели случайного леса. Справа узлы Scorer и ROC оценивают качество. Визуальная структура позволяет обсуждать весь процесс на одном экране.", [
    "Изображение: https://www.knime.com/sites/default/files/public/1-predicting-customer-churn-marketing-analytics.png",
    "Описание: https://www.knime.com/blog/predict-customer-churn-low-code-ml-example",
  ]);
}

// 12. Preparation
{
  const slide = presentation.slides.add();
  slide.background.fill = C.ink;
  addTitle(slide, "Подготовка данных", true);
  const a = addNode(slide, 55, 255, 210, 150, "JOIN", C.orange);
  const b = addNode(slide, 315, 255, 210, 150, "ТИПЫ", C.paleYellow);
  const c = addNode(slide, 575, 255, 210, 150, "ОБЗОР", C.cyan);
  const d = addNode(slide, 835, 255, 210, 150, "SMOTE", C.yellow);
  const e = addNode(slide, 1095, 255, 135, 150, "ML", C.green);
  connect(slide, a, b, { color: C.white });
  connect(slide, b, c, { color: C.white });
  connect(slide, c, d, { color: C.white });
  connect(slide, d, e, { color: C.white });
  addText(slide, "SMOTE создаёт синтетические примеры редкого класса только внутри обучающей выборки", 100, 495, 1080, 118, { fontSize: 40, bold: true, color: C.white, align: "center", vAlign: "middle" });
  register(slide, "Подготовка данных", "Join, преобразование типов, исследование, SMOTE.", "Сначала записи из двух файлов объединяются по идентификатору клиента. Затем KNIME приводит целевую колонку к подходящему типу и помогает исследовать распределения. Из-за малого числа ушедших клиентов применяется SMOTE, который создаёт синтетические примеры меньшего класса. В реальном проекте такую балансировку выполняют только на обучающей части, чтобы не допустить утечку информации в проверку.", [
    "https://www.knime.com/blog/predict-customer-churn-low-code-ml-example",
    "https://www.knime.com/blog/four-basic-steps-in-data-preparation",
  ]);
}

// 13. Model training
{
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "Обучение и проверка модели");
  addText(slide, "5-кратная перекрёстная проверка", 70, 150, 1140, 76, { fontSize: 46, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  const foldColors = [C.yellow, C.paleYellow, C.cyan, C.light, C.orange];
  for (let i = 0; i < 5; i++) {
    addBox(slide, 104 + i * 215, 275, 176, 176, foldColors[i], "ellipse", C.ink, 2);
    addText(slide, String(i + 1), 104 + i * 215, 275, 176, 176, { fontSize: 60, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  }
  addText(slide, "В каждой итерации 80% данных обучают модель, 20% проверяют её", 100, 500, 1080, 110, { fontSize: 40, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  addText(slide, "Random Forest: 100 деревьев", 310, 624, 660, 54, { fontSize: 40, color: C.gray, align: "center", vAlign: "middle" });
  register(slide, "Обучение и проверка модели", "Пять итераций. 80% для обучения. 20% для проверки. Случайный лес из 100 деревьев.", "Модель случайного леса содержит сто деревьев. Для более надёжной оценки KNIME помещает блок обучения и прогнозирования в цикл из пяти итераций. Каждый раз четыре части данных используются для обучения, а одна часть для проверки. Узел X-Aggregator собирает прогнозы всех итераций, после чего Scorer и ROC рассчитывают метрики.", ["https://www.knime.com/blog/predict-customer-churn-low-code-ml-example"]);
}

// 14. Results
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addTitle(slide, "Результат официального примера");
  const m1 = addBox(slide, 95, 190, 470, 340, C.ink, "ellipse");
  addText(slide, "93,8%", 145, 255, 370, 105, { fontSize: 78, bold: true, color: C.yellow, align: "center", vAlign: "middle" });
  addText(slide, "accuracy", 145, 375, 370, 64, { fontSize: 42, color: C.white, align: "center", vAlign: "middle" });
  const m2 = addBox(slide, 715, 190, 470, 340, C.yellow, "ellipse");
  addText(slide, "0,89", 765, 255, 370, 105, { fontSize: 78, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  addText(slide, "AUC", 765, 375, 370, 64, { fontSize: 42, color: C.ink, align: "center", vAlign: "middle" });
  addText(slide, "Из-за дисбаланса классов accuracy оценивают вместе с ROC, precision и recall", 105, 570, 1070, 95, { fontSize: 40, bold: true, color: C.gray, align: "center", vAlign: "middle" });
  register(slide, "Результат официального примера", "Accuracy 93,8%. AUC 0,89.", "Авторы официального примера получили общую точность 93,8 процента и AUC 0,89. Эти значения показывают, что модель хорошо различает клиентов с разным риском. Однако одна accuracy может вводить в заблуждение при дисбалансе классов. Поэтому необходимо дополнительно смотреть ROC-кривую, precision, recall и цену ошибок для бизнеса.", [
    "https://www.knime.com/blog/predict-customer-churn-low-code-ml-example",
    "https://www.knime.com/blog/visual-scoring-techniques-for-classification-models",
  ]);
}

// 15. Deployment
{
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "Применение модели к новым клиентам");
  await addImage(slide, "deployment-workflow.png", 55, 165, 560, 420, { fit: "contain", alt: "Официальный workflow применения модели оттока" });
  await addImage(slide, "churn-dashboard.png", 655, 165, 570, 420, { fit: "cover", alt: "Интерактивная панель риска оттока" });
  addCaption(slide, "Workflow расчёта", 55, 600, 560);
  addCaption(slide, "Риск по каждому клиенту", 655, 600, 570);
  register(slide, "Применение модели к новым клиентам", "Workflow расчёта. Риск по каждому клиенту.", "После обучения модель сохраняется и используется в отдельном workflow. Новые клиентские данные поступают через CSV Reader, Random Forest Predictor рассчитывает вероятность оттока, а компонент визуализации показывает результат. В официальной демонстрации из пяти новых клиентов один получает высокий риск и выделяется на панели. Такой список можно передать службе удержания клиентов.", [
    "Изображения: https://www.knime.com/sites/default/files/public/2-predicting-customer-churn-marketing-analytics.png",
    "https://www.knime.com/sites/default/files/public/3-predicting-customer-churn-marketing-analytics.png",
    "Описание: https://www.knime.com/blog/predict-customer-churn-low-code-ml-example",
  ]);
}

// 16. Quality and risks
{
  const slide = presentation.slides.add();
  slide.background.fill = C.ink;
  addTitle(slide, "Что проверять перед внедрением", true);
  addBox(slide, 75, 170, 500, 455, C.yellow, "roundRect");
  addText(slide, "МОДЕЛЬ", 115, 205, 420, 70, { fontSize: 48, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  addText(slide, "качество редкого класса\n\nутечка данных\n\nизменение распределений", 120, 305, 410, 275, { fontSize: 40, color: C.ink, align: "center", vAlign: "middle", lineSpacing: 1.0 });
  addBox(slide, 705, 170, 500, 455, C.white, "roundRect");
  addText(slide, "БИЗНЕС", 745, 205, 420, 70, { fontSize: 48, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  addText(slide, "стоимость контакта\n\nцена пропущенного ухода\n\nпорог действия", 750, 305, 410, 275, { fontSize: 40, color: C.ink, align: "center", vAlign: "middle", lineSpacing: 1.0 });
  register(slide, "Что проверять перед внедрением", "Качество модели и экономика решения.", "Перед внедрением оценивают не только общую точность. Важно проверить recall для ушедших клиентов, исключить утечку данных и следить за изменением распределений после запуска. Бизнес-порог выбирают с учётом стоимости контакта и потерь от пропущенного ухода. KNIME помогает связать техническую оценку с последующим правилом действия в одном workflow.", ["https://www.knime.com/blog/visual-scoring-techniques-for-classification-models"]);
}

// 17. Strengths and limitations
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addTitle(slide, "Сильные стороны и ограничения");
  addText(slide, "ПОДХОДИТ", 82, 165, 470, 70, { fontSize: 48, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  addBox(slide, 82, 250, 470, 365, C.paleYellow, "roundRect");
  addText(slide, "наглядные процессы\n\nповторяемая аналитика\n\nкоманды разного профиля", 110, 292, 414, 280, { fontSize: 40, color: C.ink, align: "center", vAlign: "middle" });
  addText(slide, "УЧЕСТЬ", 728, 165, 470, 70, { fontSize: 48, bold: true, color: C.ink, align: "center", vAlign: "middle" });
  addBox(slide, 728, 250, 470, 365, C.light, "roundRect");
  addText(slide, "ресурсы рабочего ПК\n\nнастройку Spark и БД\n\nлицензию для Hub", 756, 292, 414, 280, { fontSize: 40, color: C.ink, align: "center", vAlign: "middle" });
  register(slide, "Сильные стороны и ограничения", "Подходит для наглядных и повторяемых процессов. Требует учитывать инфраструктуру.", "Сильная сторона KNIME заключается в прозрачности процесса и возможности повторного запуска. Платформа особенно полезна для смешанных команд, где часть участников работает с готовыми узлами, а часть добавляет код. Ограничения связаны с инфраструктурой. Большие объёмы требуют базы или распределённой среды, а совместная промышленная эксплуатация часто требует KNIME Hub.", [
    "https://www.knime.com/knime-analytics-platform",
    "https://docs.knime.com/ap/latest/bigdata_extensions_user_guide/",
    "https://www.knime.com/knime-hub-pricing",
  ]);
}

// 18. Summary and sources
{
  const slide = presentation.slides.add();
  slide.background.fill = C.ink;
  addTitle(slide, "Вывод", true);
  addText(slide, "KNIME превращает анализ данных в понятный и исполняемый workflow", 85, 155, 1110, 120, { fontSize: 50, bold: true, color: C.white, align: "center", vAlign: "middle" });
  const a = addNode(slide, 90, 345, 300, 170, "ДАННЫЕ", C.light, { fontSize: 46 });
  const b = addNode(slide, 490, 345, 300, 170, "РЕШЕНИЕ", C.yellow, { fontSize: 46 });
  const c = addNode(slide, 890, 345, 300, 170, "ДЕЙСТВИЕ", C.cyan, { fontSize: 44 });
  connect(slide, a, b, { color: C.white, width: 6 });
  connect(slide, b, c, { color: C.white, width: 6 });
  addText(slide, "Основные источники: knime.com и docs.knime.com", 160, 600, 960, 62, { fontSize: 40, color: C.yellow, align: "center", vAlign: "middle" });
  register(slide, "Вывод", "Данные, решение, действие.", "Итак, KNIME решает задачу построения прозрачного и повторяемого конвейера анализа. В примере с оттоком один workflow готовит данные и обучает модель, а другой применяет её к новым клиентам. Для больших объёмов платформа переносит работу в базу, Spark или Hadoop. Главное преимущество состоит в том, что логика анализа остаётся видимой и проверяемой.", [
    "https://www.knime.com/knime-analytics-platform",
    "https://docs.knime.com/ap/latest/analytics_platform_user_guide/index.html",
    "https://docs.knime.com/ap/latest/bigdata_extensions_user_guide/",
    "https://www.knime.com/blog/predict-customer-churn-low-code-ml-example",
  ]);
}

// Export and validate
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const result = await finalizePresentation({
  explicitTotalSlideCount: 18,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [10],
  materializeLiteralChartWorkbooks: true,
  nativeChartTargetApplication: "powerpoint",
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "KNIME_Big_Data_RU.pptx.validation.json"),
});

const md = [
  "# KNIME Analytics Platform: текст и структура доклада",
  "",
  "Формат: 18 слайдов. Текст на слайдах рассчитан на шрифт не меньше 30 pt. Полный текст доклада также встроен в заметки PowerPoint.",
  "",
  ...slidesMeta.flatMap((s, i) => [
    `## Слайд ${i + 1}. ${s.title}`,
    "",
    `**На слайде:** ${s.slideText}`,
    "",
    `**Текст доклада:** ${s.notes}`,
    "",
    ...(s.sources.length ? ["**Источники:**", "", ...s.sources.map(x => `- ${x}`), ""] : []),
  ]),
].join("\n");
await fs.writeFile(scriptPath, md, "utf8");

console.log(JSON.stringify({ finalPath, scriptPath, slideCount: slidesMeta.length, validation: result }, null, 2));
