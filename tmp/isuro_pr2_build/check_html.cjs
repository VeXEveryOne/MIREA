const {chromium}=require('C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {pathToFileURL}=require('url');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'msedge'});
 const p=await b.newPage({viewport:{width:1440,height:1100}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL('D:/GitHub/MIREA/4/ИСУРО/Практика_2_Наглядная_методичка.html').href);
 await p.screenshot({path:'D:/GitHub/MIREA/tmp/isuro_pr2_build/html_top.png'});
 const links=await p.locator('nav a').count();await p.locator('nav a').filter({hasText:'Пункт 2.1'}).click();
 await p.locator('img[alt^="Практикум, рисунок 19"]').scrollIntoViewIfNeeded();
 await p.screenshot({path:'D:/GitHub/MIREA/tmp/isuro_pr2_build/html_rko.png'});
 await p.locator('img[alt^="Практикум, рисунок 19"]').click();
 const dialog=await p.locator('dialog').evaluate(e=>e.open);await p.locator('dialog button').click();
 const broken=await p.locator('figure img').evaluateAll(es=>es.filter(e=>e.complete&&e.naturalWidth===0).length);
 await p.setViewportSize({width:768,height:1000});await p.evaluate(()=>window.scrollTo(0,0));
 await p.screenshot({path:'D:/GitHub/MIREA/tmp/isuro_pr2_build/html_narrow.png'});
 console.log(JSON.stringify({links,images:await p.locator('figure img').count(),dialog,broken,errors}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
