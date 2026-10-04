import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {ROOT as root, BUILD_DIR as workspaceDir, EXPORT_DIR as exportDir, runtimeModule, skillDirectory, PYTHON as python, NODE_MODULES} from './runtime.mjs';
const {Presentation,PresentationFile} = await runtimeModule('@oai/artifact-tool');
const skill = skillDirectory('presentations');
const {finalizePresentation} = await import(pathToFileURL(path.join(skill, 'container_tools', 'artifact_tool_utils.mjs')).href);
process.env.RUNTIME_NODE_MODULES=NODE_MODULES;
await fs.mkdir(root+'/Презентации',{recursive:true});
const sources='Методические материалы РОП, практические занятия 1–8, 2026–2027. Вариант: первая практика Албахтина И.В. Полные схемы и описание: единый отчёт в комплекте. Все параметры нагрузки и примеры расчётов — учебные проектные значения.';
let deck,num;
function text(slide,tx,x,y,w,h,size=28,bold=false,color='#161616'){
 const s=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});s.text=tx;s.text.style={typeface:'Arial',fontSize:size,bold,color,autoFit:'none'};return s;
}
function slide(title,notes=''){
 const s=deck.slides.add();s.background.fill='#FFFFFF';
 const heading=text(s,title,58,28,1160,78,36,true);
 heading.text.style={typeface:'Arial',fontSize:36,bold:true,color:'#161616',alignment:'left',verticalAlignment:'middle',autoFit:'none'};
 s.speakerNotes.textFrame.setText(sources+'\n'+notes);return s;
}
function cover(n,title,summary){let s=slide('Практическое занятие '+n);text(s,title,58,200,1120,175,50,true);text(s,summary,58,405,1100,125,30);text(s,'Албахтин И.В.   ИНБО-12-23\nРазработка обеспечивающих подсистем   2026',58,585,1100,80,24);return s;}
function bullets(title,lines,notes=''){let s=slide(title,notes);lines.forEach((l,i)=>text(s,l,70,160+i*112,1130,96,29));return s;}
function table(title,values,widths,notes='',fontSize=24,height=480,top=150){
 let s=slide(title,notes);const tb=s.tables.add({rows:values.length,columns:values[0].length,left:60,top,width:1160,height,values,columnWidths:widths});
 for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){
  let cell=tb.getCell(r,c);cell.fill=r===0?'#F1F1F1':'#FFFFFF';cell.text.style={typeface:'Arial',fontSize,bold:r===0,color:'#161616'};
 }
 tb.borders.assign({style:'solid',fill:'#888888',width:1});return s;
}
async function picture(title,file,notes=''){
 let s=slide(title,notes);s.images.add({blob:new Uint8Array(await fs.readFile(file)),contentType:'image/png',alt:title,fit:'contain',position:{left:60,top:135,width:1160,height:525}});return s;
}
function flow(title,items,description){
 let s=slide(title);let width=(1120-(items.length-1)*35)/items.length;
 items.forEach((label,i)=>{let sh=s.shapes.add({geometry:'roundRect',position:{left:75+i*(width+35),top:235,width,height:150},fill:'#FFFFFF',line:{fill:'#333333',width:2}});sh.text=label;sh.text.style={typeface:'Arial',fontSize:25,alignment:'center',verticalAlignment:'middle',color:'#111'};if(i<items.length-1)s.shapes.add({geometry:'rightArrow',position:{left:75+i*(width+35)+width+6,top:294,width:24,height:28},fill:'#444',line:{fill:'none',width:0}});});
 text(s,description,75,465,1110,135,29);return s;
}
function sequence(title,people,steps,note){
 let s=slide(title,note),xs=people.map((_,i)=>105+i*1070/(people.length-1));
 people.forEach((label,i)=>{let sh=s.shapes.add({geometry:'rect',position:{left:xs[i]-82,top:145,width:164,height:72},fill:'#FFFFFF',line:{fill:'#333333',width:1.4}});sh.text=label;sh.text.style={typeface:'Arial',fontSize:23,alignment:'center',verticalAlignment:'middle'};s.shapes.add({geometry:'line',position:{left:xs[i],top:217,width:0,height:380},line:{fill:'#888888',width:1}});});
 steps.forEach(([a,b,label],i)=>{let y=263+i*65;let x=Math.min(xs[a],xs[b]);s.shapes.add({geometry:a<b?'rightArrow':'leftArrow',position:{left:x,top:y,width:Math.abs(xs[b]-xs[a]),height:11},fill:'#333333',line:{fill:'none',width:0}});text(s,label,x+10,y-36,Math.abs(xs[b]-xs[a])-12,38,22);});
 text(s,note,62,638,1150,65,22);return s;
}
function twoColumns(title,leftTitle,leftLines,rightTitle,rightLines,notes=''){
 let s=slide(title,notes);text(s,leftTitle,70,145,520,55,28,true);text(s,rightTitle,690,145,520,55,28,true);
 leftLines.forEach((line,i)=>text(s,line,70,220+i*68,520,58,22));
 rightLines.forEach((line,i)=>text(s,line,690,220+i*68,520,58,22));
 return s;
}
const drafts=root+'/Черновики_схем/';
const exported=(await fs.readdir(exportDir)).filter(name=>/^\d{2}_.*\.png$/i.test(name)).sort();
function figure(number){const prefix=String(number).padStart(2,'0')+'_';const name=exported.find(value=>value.startsWith(prefix));if(!name)throw new Error('Не найден рисунок '+number);return exportDir+'/'+name;}
const firstNumber=Number(process.argv[2]||1),lastNumber=Number(process.argv[3]||8);
for(num=firstNumber;num<=lastNumber;num++){
 deck=Presentation.create({slideSize:{width:1280,height:720}});
 if(num===1){
 cover(1,'Анализ текущего процесса','AS IS показывает ручную работу, повторный ввод и позднее обнаружение ошибок.');
 twoColumns('Границы анализа AS IS','Начало и результат',['Запрос приходит в почту или мессенджер.','Результат: карточка Ozon либо отклонение.','Описание представляет учебную модель.'],'Участники и инструменты',['Менеджер, технический специалист, склад, дизайнер.','Excel, калькулятор, браузер, почта и общие папки.','Прайс-листы, сообщения, характеристики и изображения.']);
 await picture('IDEF0 AS IS: контекст ручной подготовки',figure(1));
 await picture('IDEF0 AS IS: шесть ручных функций',figure(2));
 await picture('BPMN AS IS: ручная публикация',figure(3));
 await picture('BPMN AS IS: циклы повторной работы',figure(4));
 table('Проблемы текущего процесса',[
  ['Код','Проблема','Последствие'],
  ['P-01','Повторный ввод между файлами и Ozon','Ошибки копирования'],
  ['P-02','Совместимость проверяет специалист','Зависимость от опыта'],
  ['P-03','Остатки запрашиваются после подбора','Повторный подбор'],
  ['P-04','Предложения быстро устаревают','Неверные цена и наличие'],
  ['P-05','Полнота проверяется поздно','Отклонение карточки'],
  ['P-06','Нет общей версии и аудита','Результат трудно воспроизвести'],
 ],[150,535,475],'',20,500,145);
 twoColumns('Функциональные требования FR-01–FR-10','Управление модельным рядом',['FR-01 Запрос на создание или изменение.','FR-02 Версии состава.','FR-03 Точные и групповые слоты.','FR-04 Автоматическая совместимость.','FR-05 Протокол конфликтов.'],'Предложения и расчёты',['FR-06 Сопоставление SKU.','FR-07 Импорт предложений.','FR-08 Выбор актуального предложения.','FR-09 Расчёт цены.','FR-10 Расчёт массы.']);
 twoColumns('Функциональные требования FR-11–FR-22','Изменения и публикация',['FR-11 Предпросмотр массовой замены.','FR-12 Новая версия при замене.','FR-13 Повторная проверка.','FR-14 Контент и изображения.','FR-15 Карточка из одной версии.','FR-16 Контроль готовности.'],'Результат и история',['FR-17 Очередь публикации.','FR-18 Статус и внешний ID.','FR-19 Ограниченные повторы.','FR-20 Аудит изменений.','FR-21 Уведомления.','FR-22 Поиск и фильтрация.']);
 twoColumns('Нефункциональные требования NFR-01–NFR-05','Производительность',['NFR-01 Основные формы: до 2 с для 95% запросов.','NFR-02 Пакетная операция: до 1000 модельных рядов.','NFR-03 Фоновая публикация не блокирует интерфейс.'],'Надёжность',['NFR-04 Контроль целостности версий.','NFR-05 Резервное копирование и проверка восстановления.','Пороговые значения проверяются после реализации.']);
 twoColumns('Нефункциональные требования NFR-06–NFR-12','Защита и доступ',['NFR-06 Индивидуальная аутентификация.','NFR-07 RBAC на сервере.','NFR-08 Аудит действий.','NFR-09 TLS и защита секретов.'],'Эксплуатация',['NFR-10 Обработка ошибок интеграций.','NFR-11 Наблюдаемость и уведомления.','NFR-12 Расширяемые адаптеры и правила.','Требования служат критериями будущей приёмки.']);
 table('Сравнение программных аналогов',[
  ['Критерий','Ozon','1С','Pimcore','Akeneo','ИС'],
  ['Модельный ряд','0','5','3','2','5'],
  ['Совместимость','0','2','3','1','5'],
  ['Поставщики','1','5','3','4','5'],
  ['Массовая замена','2','3','4','4','5'],
  ['Контент','5','2','5','5','5'],
  ['Публикация Ozon','5','2','2','2','5'],
  ['Средняя оценка','2,1','3,7','3,7','3,1','5,0'],
 ],[350,155,155,170,170,160],'Оценки 0–5 являются экспертными и не заменяют измерения продуктов.',20,490,150);
 await picture('Средняя экспертная оценка аналогов',figure(5),'Оценки 0–5 получены в рамках учебного сравнения.');
 bullets('Результаты практики 1',['Построены контекст и декомпозиция IDEF0 AS IS.','BPMN показывает четыре роли, переписку и повторное заполнение Ozon.','Выявлены шесть проблем текущего процесса.','Сформулированы FR-01–FR-22 и NFR-01–NFR-12.','Определена потребность в единой версионированной системе.']);
 bullets('Источники',['Методические материалы РОП, практическое занятие 1.','OMG Business Process Model and Notation 2.0.2.','Документация Ozon Seller API.','Единый отчёт по практическим занятиям 1–8.']);
 }else if(num===2){
 cover(2,'Целевой процесс и архитектура','TO BE связывает проверенную версию модельного ряда, расчёты, контент и публикацию.');
 table('Сравнение AS IS и TO BE',[
  ['Аспект','AS IS','TO BE'],
  ['Хранение','Файлы и переписка','Единая ИС и версии'],
  ['Ввод','Копирование и повторный ввод','Карточка из снимка'],
  ['Совместимость','Опыт и сайты','Механизм правил'],
  ['Предложения','Ручное сведение','Импорт и контроль времени'],
  ['Расчёты','Excel и калькулятор','Воспроизводимый расчёт'],
  ['Публикация','Ручное заполнение','Утверждение и очередь'],
  ['Аудит','Разрозненная история','Журнал и уведомления'],
  ['Ошибки','Неуправляемые циклы','Бизнес-возврат и повторы'],
 ],[260,430,470],'',20,505,145);
 await picture('IDEF0 TO BE: контекст управляемого процесса',figure(6));
 await picture('IDEF0 TO BE: шесть целевых функций',figure(7));
 await picture('BPMN TO BE: общий процесс',figure(8));
 await picture('BPMN TO BE: подготовка',figure(9));
 await picture('BPMN TO BE: очередь и результат',figure(10));
 await picture('Дерево функций системы',figure(11));
 await picture('Компоненты целевой системы',figure(12));
 bullets('Результаты практики 2',['Запрос сразу создаёт черновую версию модельного ряда.','Правила проверяют совместимость, актуальность и полноту до публикации.','Менеджер утверждает конкретную неизменяемую версию.','Worker сверяет неизвестный результат перед ограниченным повтором.','PostgreSQL, хранилище, адаптеры и аудит поддерживают целевой процесс.']);
 }else if(num===3){
 cover(3,'Логическая модель данных','29 сущностей обеспечивают BOM, предложения, версии карточек и историю.');
 flow('Основная цепочка данных',['BOM','Версия\nBOM','Версия\nкарточки','Публикация'],'Публикация относится к неизменяемому снимку. Новая BOM не перезаписывает историю.');
 table('Выбор содержимого слота',[['Объект','Что хранит','Ключевое условие'],['bom_slot','Точная модель либо группа','Выбран ровно один вариант'],['slot_selection','Компонент и offer_id','Разрешение до расчёта'],['supplier_offer','Цена, остаток и дата','Неизменяемый снимок'],['card_version','Контент и показатели','Одна версия BOM']],[330,450,380]);
 flow('Код конфигурации',['BOM','000153','Версия 3'],'Префикс и номер образуют BOM-000153. Номер версии хранится отдельно. UNIQUE защищает от повторов.');
 table('Статусы карточки',[['Код','Смысл'],['DRAFT / REVIEW','Черновик / проверка'],['READY','Готова к публикации'],['PUBLISHED','Подтверждена площадкой'],['STALE','Нужна актуализация'],['PUBLISH_ERROR','Ошибка внешней операции']],[360,800]);
 bullets('Ключи и отношения',['M:N для ролей пользователей и изображений карточки разрешены таблицами связей.','FK сохраняют принадлежность слотов, версий и предложений.','Групповые слоты обязательно превращаются в конкретные компоненты.','Все 185 атрибутов раскрыты в словаре и физической модели.']);
 }else if(num===4){
 cover(4,'Интерфейсы и сценарии','Шесть каркасных экранов покрывают путь от запроса до результата публикации.');
 await picture('Редактор версии BOM',drafts+'D05_wireframe_02.png');
 await picture('Предпросмотр массовой замены',drafts+'D05_wireframe_04.png');
 await picture('Карточка перед публикацией',drafts+'D05_wireframe_05.png');
 flow('Логика взаимодействия',['Выбрать\nверсию','Изменить\nсостав','Проверить\nи рассчитать','Утвердить\nи отправить'],'При конфликте пользователь возвращается к исправлению. Ошибка привязана к правилу и полю.');
 bullets('Проверка интерфейсов',['Группа, точная модель и закреплённый SKU различимы в редакторе.','Дата предложения и состояние проверки видны перед отправкой.','Список массовой замены фиксирует исходные версии.','Каркасы подготовлены для переноса в редактор; UX-тестирование ещё предстоит.']);
 }else if(num===5){
 cover(5,'Математическое обеспечение','Цена, масса и выбор предложений рассчитываются для конкретной версии BOM.');
 table('Учебный расчёт',[['Показатель','Значение'],['Комплектующие','77 500 ₽'],['Сборка и упаковка','1 200 + 300 ₽'],['Себестоимость','79 000 ₽'],['Наценка и шаг цены','25% и 100 ₽'],['Итоговая цена / масса','98 800 ₽ / 10,250 кг']],[620,540]);
 bullets('Формулы',['C = стоимость комплектующих + сборка + упаковка','P = ceil(C × (1 + m) / s) × s','W = масса корпуса + масса слотов + упаковка','Комиссия, налоги и доставка в учебный расчёт не включены.']);
 flow('Выбор предложения',['Разрешить\nгруппу','Проверить\nсовместимость','Отсеять\nустаревшие','Выбрать\nпо приоритету'],'Далее учитываются цена, дата и ID. Закреплённый SKU ограничивает множество кандидатов.');
 flow('Массовая замена',['Предпросмотр','Подтверждение','Проверка\nверсий','Новая BOM\nи пересчёт'],'Одна транзакция на BOM. Конфликт откатывает только её изменение. Успешные карточки становятся STALE.');
 bullets('Граничные случаи',['Пустой состав и неизвестная масса блокируют готовность.','При отсутствии наблюдений показатель выводится как «нет данных».','Возраст предложения не должен быть отрицательным или превышать TTL.','Производительность пакета 1000 BOM пока является целевым требованием.']);
 }else if(num===6){
 cover(6,'Инфраструктура и программный стек','Закрытый серверный сегмент хранит данные, изображения и очередь публикаций.');
 await picture('Инфраструктурная схема',drafts+'D10_infrastructure.png');
 table('Выбранный стек',[['Уровень','Средство'],['Клиент','TypeScript и React'],['Сервер','Java 21 и Spring Boot'],['Данные','PostgreSQL 18'],['Доступ и шлюз','Spring Security, Nginx'],['Сборка и IDE','Maven, IntelliJ IDEA']],[420,740]);
 table('Сравнение СУБД',[['Критерий','PostgreSQL','MySQL','SQLite'],['Размещение','Сервер','Сервер','Встроенный файл'],['Снимки правил','JSONB','JSON','Текст / JSON функции'],['Работа с записью','Несколько\nпользователей','Несколько\nпользователей','Один писатель'],['Выбор проекта','Основная БД','Допустимая альтернатива','Локальный прототип']],[330,280,280,270],'Источники: postgresql.org/docs/current/datatype.html; dev.mysql.com/doc/refman/8.4/en/json.html; sqlite.org/whentouse.html.');
 table('Среды разработки Java',[['Среда','Особенность','Вывод'],['IntelliJ IDEA','Интегрированная Java-навигация','Основной вариант'],['VS Code','Java через расширения','Допустимая альтернатива'],['Eclipse','Плагинная Java-экосистема','Допустимая альтернатива']],[320,520,320],'Официальные источники: jetbrains.com/idea; code.visualstudio.com/docs/languages/java; eclipseide.org.');
 bullets('Границы проектного решения',['Конфигурация 4 vCPU и 8 ГБ для приложения — начальная гипотеза.','99,5% доступности нельзя подтвердить одной инфраструктурной схемой.','Ежедневные копии БД и файлов должны проходить восстановление.','Выбор СУБД основан на функциях проекта, без заявления о лидерстве по скорости.']);
 }else if(num===7){
 cover(7,'Физическая модель и развёртывание','29 таблиц и 185 атрибутов детализируют логическую модель для PostgreSQL.');
 table('Основные типы данных',[['Данные','Тип','Ограничение'],['Идентификатор','bigint IDENTITY','PK'],['Цена','numeric(14,2)','Положительное значение'],['Масса','numeric(8,3)','Положительное значение'],['Время','timestamptz','Единая временная шкала'],['Правила и снимки','jsonb','Схема проверяется сервисом']],[380,360,420]);
 flow('Физические связи',['bom','bom_version','bom_slot','slot_selection'],'FOREIGN KEY сохраняют структуру. Принадлежность выбранного компонента и версии проверяется в транзакции.');
 table('Ограничения целостности',[['Правило','Средство'],['Уникальный код и версия','UNIQUE'],['Одна альтернатива слота','CHECK'],['Одно активное задание версии','Частичный уникальный индекс'],['Новая версия при изменении','Сервисный инвариант'],['Согласованные объекты публикации','Проверка FK и бизнес-инвариантов']],[600,560]);
 await picture('Размещение программных артефактов',drafts+'D21_deployment.png');
 bullets('Проверка перед реализацией',['Запустить миграции в отдельной PostgreSQL и проверить ограничения.','Разделить роли приложения, worker и миграций.','Проверить согласованное восстановление БД и файлов.','DDL-заготовка не считается развёрнутой и испытанной системой.']);
 }else{
 cover(8,'Интеграции и управление доступом','Два сценария интеграции связывают внешний обмен с устойчивым состоянием системы.');
 sequence('Обновление предложений',['Склад','Сервис','Адаптер','Поставщик'],[[0,1,'Обновить данные'],[1,2,'Запрос предложений'],[2,3,'HTTPS / формат'],[3,2,'Цена, остаток, дата'],[2,1,'Проверенные записи']],'При временном сбое сохраняется прежняя дата данных. Канал поставщика требует согласования.');
 sequence('Публикация карточки',['Менеджер','API / БД','Worker','Ozon'],[[0,1,'Утвердить версию'],[1,2,'Очередь и ключ'],[2,3,'HTTPS / JSON'],[3,2,'ID задачи'],[2,3,'Сверить результат']],'Потеря ответа требует сверки. Локальный ключ не гарантирует идемпотентность Ozon.');
 table('Разделение обязанностей',[['Роль','Основное право','Ограничение'],['Менеджер','Утверждать и публиковать','Без управления ролями'],['Инженер','BOM и массовая замена','Без автопубликации'],['Склад','Предложения и SKU','Без правил цены'],['Дизайнер','Контент и изображения','Без закупочных цен'],['Администратор','Доступ и аудит','Без бизнес-прав по умолчанию']],[300,470,390]);
 table('Ошибки внешней операции',[['Ситуация','Решение'],['Временный отказ','Ограниченный повтор, не больше трёх'],['Неизвестный результат','UNCERTAIN и сверка'],['Постоянная ошибка','FAILED и уведомление'],['Версия устарела','Новая проверка и утверждение']],[430,730]);
 bullets('Меры защиты',['Argon2id, индивидуальные учётные записи и MFA администратора.','Серверная RBAC-проверка каждой операции, по умолчанию запрет.','TLS, защищённое хранение секретов, валидация ответов.','Неизменяемый аудит и ежедневные резервные копии.'],'OWASP Password Storage, Authorization и Transport Layer Security Cheat Sheets.');
 }
 const staging=workspaceDir+'/slides_v2/pr'+num;await fs.mkdir(staging,{recursive:true});
 const candidate=staging+'/candidate.pptx';await(await PresentationFile.exportPptx(deck)).save(candidate);
 await fs.mkdir(staging+'/final',{recursive:true});const final=staging+'/final/final.pptx';await fs.rm(final,{force:true});
 await fs.rm(staging+'/validation.json',{force:true});
 const requiredNativeTableOwnerSlides=num===1?[7,12]:num===2?[2]:[];
 const result=await finalizePresentation({workspaceDir,candidatePath:candidate,finalPath:final,pythonExecutable:python,integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit',...requiredNativeTableOwnerSlides.flatMap(number=>['--require-native-table-slide',String(number)])],explicitTotalSlideCount:num===1?15:num===2?10:6,requiredNativeTableOwnerSlides,fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:staging+'/validation.json'});
 await fs.copyFile(final,root+'/Презентации/РОП_Практическая_'+num+'_АлбахтинИВ.pptx');
 for(let i=0;i<deck.slides.items.length;i++){
  const blob=await deck.export({slide:deck.slides.items[i],format:'png',scale:1});await fs.writeFile(staging+'/slide-'+(i+1)+'.png',new Uint8Array(await blob.arrayBuffer()));
 }
 console.log('Completed practice',num,deck.slides.items.length);
}
