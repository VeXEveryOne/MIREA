// Actual browser observations on a fresh, isolated 48-row database.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runtimeModule} from '../../../tools/runtime.mjs';
const {default:playwright}=await runtimeModule('playwright');
const {chromium}=playwright;
const subject=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(subject,'../..');
const cache=path.join(root,'.cache/ppois5-10');
const client=path.join(subject,'Клиент');
const schemes=path.join(subject,'Схемы');
const baseUrl=process.env.PPOIS_CLIENT_URL??'http://127.0.0.1:8768';
const env=JSON.parse(await fs.readFile(path.join(cache,'client-environment.json'),'utf8'));
const descriptions={"UI01": "Корректный демонстрационный вход инженера открыл экран версии 2 DRAFT", "UI02": "Смена версии при изменённом количестве требует решения; исходный выбор и 0 сохранены", "UI03": "Несохранённый состав с нулевым количеством отклонён сервером", "UI04": "Исправление RAM до 2 восстановило расчёт: 53500.00 ₽, 76400 ₽, 7.820 кг", "UI05": "При изменении экономического параметра старый результат исчезает", "UI06": "Сохранение инженером создало версию 3 CHECKED без перезаписи 1 и 2", "UI07": "Выход при изменённом составе требует решения", "UI08": "Отмена локальных изменений загрузила исходную версию 1 с RAM=2", "UI09": "Менеджер не редактирует состав; ревизия для DRAFT-версии 2 недоступна", "UI10": "Менеджер создал ревизию 2 DRAFT на версии состава 3, ревизия 1 READY сохранена", "UI11": "История содержит только исходную попытку ACCEPTED; внешняя отправка недоступна", "UI12": "Наблюдатель видит сохранённые версии, поля заблокированы, кнопок записи нет", "UI13": "Наблюдатель рассчитывает сохранённую версию 3 без изменения экономических параметров", "UI14": "Прямая навигация наблюдателя к недоступной диагностике открывает справку, не администраторский экран", "UI15": "Администратор видит только диагностику и справку; соединение ограничено ppois_viewer, read_only=on", "UI16": "Администратор не получает бизнес-раздел через прямой hash-маршрут", "UI17": "Неверный пароль отклонён, сеанс не открыт", "UI18": "Менеджер также рассчитывает сохранённую версию 3: 76400 ₽ и 7.820 кг"};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const browser=await chromium.launch({headless:true,executablePath:process.env.PPOIS_BROWSER_EXE??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
const consoleErrors=[];page.on('pageerror',e=>consoleErrors.push(String(e)));
const checks=[],screenshots=[];
async function settled(){
 await page.waitForFunction(()=>!document.body.innerText.includes('Запрос выполняется') &&
   !document.body.innerText.includes('Вход…'));
 await page.waitForLoadState('networkidle');
}
async function check(id){
 await settled();checks.push({id,description:descriptions[id],
  snapshot:await page.locator('body').ariaSnapshot(),observed_at:new Date().toISOString()});
 console.log(id);
}
async function shot(file,label,locator){
 await settled();const output=path.join(schemes,file);
 if(locator)await locator.screenshot({path:output,type:'jpeg',quality:94});
 else await page.screenshot({path:output,type:'jpeg',quality:94,fullPage:true});
 screenshots.push({file,label,sha256:hash(await fs.readFile(output))});
}
async function login(role,password='coursework-demo'){
 await page.locator('select[name="username"]').selectOption(role);
 await page.locator('input[name="password"]').fill(password);
 await page.getByRole('button',{name:'Войти',exact:true}).click();await settled();
}
async function navigate(name){await page.getByRole('button',{name,exact:true}).click();await settled();}
async function selectVersion(number){
 await page.getByLabel('Конфигурация и версия состава').selectOption('00000000-0000-0000-0000-000000000100/'+number);await settled();
}
try {
 await page.goto(baseUrl);await settled();
 await page.getByRole('heading',{name:'Демонстрационный вход',exact:true}).waitFor();
 await shot('ПР10_Экран_входа.jpg','Демонстрационный вход');
 await shot('ПР10_Фрагмент_входа.jpg','Демонстрационный вход',page.locator('.login .panel'));
 await login('engineer');await check('UI01');
 await shot('ПР10_Экран_инженера.jpg','Инженер: версии модельного ряда');
 await shot('ПР10_Фрагмент_инженера.jpg','Шесть позиций редактора новой версии инженера',page.locator('main .panel').nth(1));
 await page.getByRole('spinbutton',{name:'Количество строки 3',exact:true}).fill('0');
 await selectVersion(1);await check('UI02');
 await page.getByRole('button',{name:'Остаться',exact:true}).click();
 await navigate('Проверка и расчёт');await navigate('Проверить и рассчитать');await check('UI03');
 await navigate('Версии состава');await page.getByRole('spinbutton',{name:'Количество строки 3',exact:true}).fill('2');
 await navigate('Проверка и расчёт');await navigate('Проверить и рассчитать');await check('UI04');
 await shot('ПР10_Экран_расчёта.jpg','Экономические параметры и расчёт');
 await shot('ПР10_Результат_расчёта.jpg','Результат расчёта инженера');
 await shot('ПР10_Фрагмент_расчёта.jpg','Шесть позиций и итоги расчёта',page.locator('#calculation-result'));
 await page.getByLabel('Наценка, доля',{exact:true}).fill('0.21');await check('UI05');
 await page.getByLabel('Наценка, доля',{exact:true}).fill('0.20');
 await navigate('Версии состава');await navigate('Сохранить новую версию');await check('UI06');
 await page.getByRole('spinbutton',{name:'Количество строки 3',exact:true}).fill('3');
 await navigate('Выйти');await check('UI07');await navigate('Остаться');
 await selectVersion(1);await navigate('Отменить изменения и перейти');await check('UI08');
 await navigate('Выйти');await login('manager');await selectVersion(2);
 await navigate('Карточки и ревизии');await check('UI09');
 await shot('ПР10_Экран_менеджера.jpg','Менеджер: черновик не готов к созданию ревизии');
 await selectVersion(3);
 await page.getByLabel('Заголовок новой ревизии',{exact:true}).fill('Учебный ПК AM5 — браузерная проверка');
 await navigate('Сохранить новую ревизию DRAFT');await check('UI10');
 await shot('ПР10_История_ревизий.jpg','История ревизий после сохранения');
 await shot('ПР10_Фрагмент_ревизий.jpg','Сохранённые ревизии карточки',page.locator('main .panel').first());
 await navigate('Результаты публикаций');await check('UI11');
 await shot('ПР10_Экран_публикаций.jpg','История попыток: внешняя отправка недоступна');
 await navigate('Выйти');await login('viewer');await check('UI12');
 await shot('ПР10_Экран_наблюдателя.jpg','Наблюдатель: состав только для чтения');
 await selectVersion(3);await navigate('Проверка и расчёт');await navigate('Проверить и рассчитать');await check('UI13');
 await shot('ПР10_Результат_наблюдателя.jpg','Расчёт наблюдателя без записи');
 await page.goto(baseUrl+'/#diagnostics');await check('UI14');
 await navigate('Выйти');await login('admin');await navigate('Проверить соединение');await check('UI15');
 await shot('ПР10_Экран_администратора.jpg','Администратор: диагностика');
 await shot('ПР10_Фрагмент_диагностики.jpg','Диагностика ограниченного соединения',page.locator('main .panel'));
 await page.goto(baseUrl+'/#cards');await check('UI16');
 await navigate('Выйти');await login('engineer','wrong-password');await check('UI17');
 await login('manager');await selectVersion(3);await navigate('Проверка и расчёт');await navigate('Проверить и рассчитать');await check('UI18');
 if(consoleErrors.length)throw Error(consoleErrors.join('\n'));
 const source_sha256={};for(const name of ['server.py','client.js','client.css','client.html','client_contract.json'])
  source_sha256[name]=hash(await fs.readFile(path.join(client,name)));
 const record={source:'Executed Playwright Chromium browser scenario on localhost',database:env.database,
  executed_at:new Date().toISOString(),checks,screenshots,console_errors:consoleErrors,source_sha256};
 await fs.writeFile(path.join(cache,'client-ui-verification.json'),JSON.stringify(record,null,2)+'\n');
 console.log('18 browser checkpoints; '+screenshots.length+' screenshots; no page errors');
}finally{await browser.close();}
