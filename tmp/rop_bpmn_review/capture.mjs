import {chromium} from 'file:///C:/Users/ilalb/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const base='D:/GitHub/MIREA/4/РОП/BPMN',file=base+'/РОП_Практика_1_AS_IS.nsbpmn';
const doc=JSON.parse(await fs.readFile(file,'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:2100,height:1600},deviceScaleFactor:2});
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.addInitScript(({doc,file})=>{const ok=value=>({ok:true,value});window.desktop={recent:async()=>ok([]),workspace:async()=>ok(null),restoreWorkspace:async()=>ok({activeSessionId:'rop-bpmn',tabs:[{sessionId:'rop-bpmn',document:doc,savedDocument:doc,path:file}],warnings:[]}),checkpoint:async()=>ok(null),onCommand:()=>()=>{},refreshWorkspace:async()=>ok(null)};},{doc,file});
await page.goto('http://127.0.0.1:4175/',{waitUntil:'networkidle'});
await page.getByLabel('Вид BPMN').waitFor();
await page.screenshot({path:'D:/GitHub/MIREA/tmp/rop_bpmn_review/editor.png'});
await page.addStyleTag({content:`
.bpmn-elements,.bpmn-properties,.bpmn-code,.bpmn-diagnostics,.native-bpmn-palette,.react-flow__controls,.react-flow__minimap,.react-flow__attribution,.react-flow__handle,.react-flow__background {display:none!important}
.bpmn-body{grid-template-columns:1fr!important}.bpmn-editors{grid-template-rows:44px minmax(100px,1fr)!important}
.native-bpmn-label{font-size:20px!important;line-height:1.18!important;color:#111!important;inset:12px 7px}
.native-bpmn-label.pool-label{font-size:18px!important;inset:8px auto 8px 3px}
.native-bpmn-edge-label{font-size:19px!important;line-height:1.15!important;color:#111!important;max-width:250px!important}
.native-bpmn-shape{color:#111!important}
`});
for(const [view,name] of [['Plane_Main','BPMN_1_Публикация'],['Plane_Preparation','BPMN_2_Подготовка']]){
 await page.getByLabel('Вид BPMN').selectOption(view);
 await page.getByRole('button',{name:'Вписать в окно ↗',exact:true}).click();
 await page.waitForTimeout(500);
 const boxes=await page.locator('.native-bpmn-shape').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};}));
 const x=Math.min(...boxes.map(b=>b.x))-5,y=Math.min(...boxes.map(b=>b.y))-5;
 const right=Math.max(...boxes.map(b=>b.x+b.w))+5,bottom=Math.max(...boxes.map(b=>b.y+b.h))+5;
 await page.screenshot({path:base+'/'+name+'.png',clip:{x,y,width:right-x,height:bottom-y}});
 console.log(name,{x,y,right,bottom});
}
console.log((await page.locator('body').innerText()).slice(-1000));await browser.close();
