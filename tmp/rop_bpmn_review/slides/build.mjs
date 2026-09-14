import fs from 'node:fs/promises';
import path from 'node:path';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
import {finalizePresentation,applyPresentationChartFont} from 'file:///C:/Users/ilalb/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations/container_tools/artifact_tool_utils.mjs';
const root='D:/GitHub/MIREA',tmp=root+'/tmp/rop_bpmn_review/slides',base=root+'/4/РОП';
const skill='C:/Users/ilalb/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations';
const p=Presentation.create({slideSize:{width:1280,height:720}}),family='Arial';
const tables=JSON.parse(await fs.readFile(root+'/tmp/rop_bpmn_review/tables.json','utf8'));
function text(s,value,x,y,w,h,size=26,bold=false,color='#172B4D'){
 const t=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 t.text=value;t.text.style={typeface:family,fontSize:size,bold,color,autoFit:'none'};return t;
}
function slide(title,note=''){
 const s=p.slides.add();s.background.fill='#FFFFFF';
 text(s,title,54,28,1172,70,42,true);text(s,String(p.slides.items.length).padStart(2,'0'),1180,682,50,25,16,false,'#68788B');
 s.speakerNotes.textFrame.setText(note||'Источник: РОП_Единый_отчет_АлбахтинИВ.docx, практическое занятие № 1. Модель AS IS является академической.');return s;
}
function table(s,values,widths,top=140,height=460,size=24){
 const t=s.tables.add({rows:values.length,columns:values[0].length,left:54,top,width:1172,height,columnWidths:widths,values});
 t.borders.assign({fill:'#CED7E2',width:0.7,style:'solid'});
 for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){
  const a=t.getCell(r,c);a.fill=r===0?'#E6EDF5':r%2?'#FFFFFF':'#F5F7FA';a.text.style={typeface:family,fontSize:size,color:'#172B4D',bold:r===0,autoFit:'none'};
 }
 return t;
}
async function diagram(title,file,note){const s=slide(title,note);s.images.add({blob:new Uint8Array(await fs.readFile(file)),contentType:'image/png',alt:title,fit:'contain',position:{left:30,top:103,width:1220,height:553}});return s;}
const cover=slide('Практическое занятие № 1');
text(cover,'Разработка обеспечивающих подсистем',58,125,1120,60,28,false,'#4E627B');
text(cover,'Формирование и актуализация\nкарточек компьютерных систем',54,237,1172,175,52,true);
text(cover,'Модель AS IS и требования к информационной системе\nна примере ООО «Юкомс»',58,422,1120,100,30);
text(cover,'Албахтин И.В.  •  ИНБО-12-23\nРТУ МИРЭА  •  Москва, 2026',58,600,1100,65,23,false,'#4E627B');
let s=slide('Цель и границы процесса');
text(s,'Цель',58,135,300,50,30,true);text(s,'Выявить проблемы текущего процесса и сформировать\nфункциональные и нефункциональные требования к ИС.',58,190,1150,95,30);
text(s,'Начало и результат',58,320,700,50,30,true);text(s,'Запрос на новую или изменённую карточку → публикация\nили обновление в Ozon либо фиксация ошибки публикации.',58,375,1150,100,30);
text(s,'Основа модели',58,520,700,45,30,true);text(s,'BOM — состав компьютерной системы. В академической модели\nданные и действия распределены между разрозненными инструментами.',58,572,1150,85,26);
await diagram('IDEF0  •  Контекст A-0',base+'/IDEF0/A-0.png','Источник: редактируемая модель РОП_Практика_1_AS_IS.nsidef0; единый отчёт, раздел 3.1. Входы: запрос, данные компонентов и поставщиков. Выходы: BOM, расчёты, изображения, результат публикации. Управляющие воздействия — рабочие правила академической модели.');
await diagram('IDEF0  •  Декомпозиция A0',base+'/IDEF0/A0.png','Источник: РОП_Практика_1_AS_IS.nsidef0, раздел 3.2 отчёта. A1 — регистрация запроса; A2 — BOM; A3 — совместимость; A4 — расчёты и изображения; A5 — публикация. Замечания A3 возвращаются в A2.');
await diagram('BPMN 2.0  •  Публикация и участники',base+'/BPMN/BPMN_1_Публикация.png','Источник: модель РОП_Практика_1_AS_IS.nsbpmn, вид «Публикация и внешние участники», NotationStudio. OMG BPMN 2.0.2: https://www.omg.org/spec/BPMN/2.0.2/PDF, §9.3, §10.4. Внешние организации показаны закрытыми пулами; пунктир обозначает сообщения. После отклонения фиксируются замечания, текущая попытка завершается ошибкой. Исправление инициирует новый запрос.');
await diagram('BPMN 2.0  •  Подготовка данных',base+'/BPMN/BPMN_2_Подготовка.png','Источник: та же модель NSBPMN, вид «Подготовить данные карточки». Это встроенный подпроцесс основной схемы. Сбор сведений включает оба источника PC4Games и ITPartner. После изменения конфигурации повторно проверяются совместимость и доступность. Текущий процесс не автоматизирован единым движком; задачи не объявлены UserTask или ServiceTask без оснований.');
s=slide('Проблемы текущего процесса');
table(s,[['Код','Проблема','Последствие'],...tables[4].slice(1).map(r=>[r[0],r[1],r[3]])],[110,460,602],130,500,24);
s=slide('Данные и расчёты  •  FR-01–10');
table(s,[['Коды','Требуемое поведение системы'],['FR-01–03','Регистрировать запросы, создавать BOM по корпусу и задавать состав характеристиками или точной моделью.'],['FR-04–05','Проверять совместимость после каждого изменения и показывать правило, вызвавшее конфликт.'],['FR-06–08','Сопоставлять товары поставщиков, загружать цены и наличие, выбирать применимое предложение.'],['FR-09–10','Рассчитывать себестоимость, цену карточки и массу товара с упаковкой.']],[210,962],130,490,26);
s=slide('Изменения и публикация  •  FR-11–22');
table(s,[['Коды','Требуемое поведение системы'],['FR-11–13','Находить затронутые BOM, показывать последствия массовой замены и повторно проверять изменённые данные.'],['FR-14–16','Формировать изображения и контент карточки; проверять обязательные атрибуты Ozon до публикации.'],['FR-17–19','Публиковать через API Ozon, сохранять ответ и статус, повторять неуспешные внешние операции.'],['FR-20–22','Хранить версии и историю действий, уведомлять об ошибках, предоставлять поиск и фильтры.']],[210,962],130,490,25);
s=slide('NFR  •  Скорость и надёжность');
table(s,[['Код','Критерий приёмки'],['NFR-01','95% запросов основных форм — не более 2 с при 50 одновременных пользователях.'],['NFR-02','Массовая замена и проверка 1000 BOM — не более 5 мин.'],['NFR-03','Доступность ≥ 99,5% в месяц без согласованной профилактики.'],['NFR-04','Ежедневная резервная копия; RPO ≤ 24 ч, RTO ≤ 4 ч.'],['NFR-09','Две последние стабильные версии Chrome, Edge и Firefox; экран от 1280 px.'],['NFR-10','До трёх повторов внешней операции без создания дубликатов.']],[160,1012],130,500,24);
s=slide('NFR  •  Защита и целостность');
table(s,[['Код','Критерий приёмки'],['NFR-05','Пользовательские и интеграционные соединения — TLS 1.2 или новее.'],['NFR-06','Хранение паролей — Argon2id с уникальной солью.'],['NFR-07','Ролевое разграничение доступа с проверкой на сервере.'],['NFR-08','Журнал изменений — не менее года; пользователь, время и изменённые значения.'],['NFR-11','Запрет готовности к публикации при несовместимости или неполных данных.'],['NFR-12','Изменение правил и сопоставлений через справочники без правки кода.']],[160,1012],130,500,24);
s=slide('Сравнение программных аналогов');
const matrix=tables[7].map(r=>r.map(v=>v==='Проектируемая ИС'?'Целевая ИС':v==='Akeneo PIM'?'Akeneo':v));
table(s,matrix,[352,164,164,164,164,164],125,474,20);
text(s,'Шкала 0–5. Авторская экспертная оценка применимости к предметной задаче.\n5,0 для целевой ИС отражает требования проекта, а не результат внедрения.',58,615,1150,62,22,false,'#4E627B');
s.speakerNotes.textFrame.setText('Источник: единый отчёт, таблица 6 и раздел 8. Оценки автора, не внешний рейтинг и не результаты измерений продуктов. Документация: https://docs.ozon.ru/api/seller/ ; https://v8.1c.ru/erp/purchasing/ ; https://docs.pimcore.com/platform/2025.4/ ; https://help.akeneo.com/using-the-product-page .');
s=slide('Средняя оценка применимости');
const vals=tables[7][10].slice(1).map(Number),cats=['Ozon Seller','1С:ERP','Pimcore','Akeneo','Целевая ИС'];
const chart=s.charts.add('bar',{position:{left:65,top:130,width:1140,height:455},categories:cats,series:[{name:'Средний балл',values:vals,fill:'#356AA0'}],barOptions:{direction:'column',grouping:'clustered',gapWidth:80},hasLegend:false,dataLabels:{showValue:true,position:'outEnd',numberFormatCode:'0.0',textStyle:{fontSize:26,bold:true,fill:'#172B4D'}},yAxis:{min:0,max:5,majorUnit:1,numberFormatCode:'0.0',textStyle:{fontSize:21}},xAxis:{textStyle:{fontSize:23}},chartFill:'#FFFFFF',plotAreaFill:'#FFFFFF'});
applyPresentationChartFont(chart,{fontFamily:family});
text(s,'Среднее по девяти критериям с равными весами.\nГотовые продукты требуют настройки и предметного расширения.',58,608,1130,67,25);
s.speakerNotes.textFrame.setText('Источник: таблица 6 единого отчёта. Суммы по девяти критериям: 19, 33, 33, 28, 45; средние после округления до десятых: 2,1; 3,7; 3,7; 3,1; 5,0. Значение целевой ИС — проектная оценка.');
s=slide('Выводы');
text(s,'Причина основных потерь',58,135,1100,48,31,true);
text(s,'BOM, поставщицкие позиции, расчёты и карточка Ozon\nсвязаны логически, но обновляются раздельно.',58,190,1140,110,32);
text(s,'Требование к целевой системе',58,340,1100,48,31,true);
text(s,'Хранить зависимости и повторно проверять все\nзатронутые данные при изменении компонента.',58,395,1140,110,32);
text(s,'Результат практики: модели IDEF0 и BPMN 2.0,\n22 функциональных и 12 нефункциональных требований.',58,567,1140,90,29);
s=slide('Источники');
const sources=['Практическое занятие № 1 по РОП. РТУ МИРЭА, 2026.','Албахтин И.В. Курсовая работа по реинжинирингу процесса\nсопровождения заказов компьютерных систем, 2026.','OMG. BPMN 2.0.2 — omg.org/spec/BPMN/2.0.2/PDF','Ozon Seller API — docs.ozon.ru/api/seller/','1С:ERP — v8.1c.ru/erp/purchasing/','Pimcore — docs.pimcore.com/platform/2025.4/','Akeneo — help.akeneo.com/using-the-product-page','ООО «Юкомс» — ucoms.ru'];
let y=125;for(const q of sources){const h=q.includes('\n')?70:47;text(s,q,58,y,1160,h,24);y+=h+10;}
s.speakerNotes.textFrame.setText('Полные библиографические описания и даты обращения приведены в едином отчёте. Материалы о продуктах взяты из раздела 8 отчёта; в презентации не заявляется новая независимая проверка возможностей текущих версий.');
await fs.mkdir(tmp+'/render',{recursive:true});await fs.mkdir(tmp+'/final',{recursive:true});
await (await PresentationFile.exportPptx(p)).save(tmp+'/candidate.pptx');
for(let i=0;i<p.slides.items.length;i++){const s=p.slides.items[i];const png=await p.export({slide:s,format:'png',scale:1.4});await fs.writeFile(tmp+'/render/slide-'+(i+1)+'.png',new Uint8Array(await png.arrayBuffer()));}
const result=await finalizePresentation({workspaceDir:root,candidatePath:tmp+'/candidate.pptx',finalPath:tmp+'/final/РОП_Практическая_1_АлбахтинИВ.pptx',pythonExecutable:'C:/Users/ilalb/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit',...[7,8,9,10,11,12].flatMap(n=>['--require-native-table-slide',String(n)])],requiredNativeTableOwnerSlides:[7,8,9,10,11,12],requiredNativeChartOwnerSlides:[13],materializeLiteralChartWorkbooks:true,fontPolicy:{basis:'design',families:[family]},verifyArtifactToolImport:true,receiptPath:tmp+'/validation.json'});
console.log(JSON.stringify(result));

