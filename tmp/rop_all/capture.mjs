import {chromium} from 'file:///C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const base='D:/GitHub/MIREA/4/РОП/Практики_1-8/Модели_OmniNotation';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
for(const [file,kind] of [['ПР2_IDEF0_TO_BE.nsidef0','IDEF0'],['ПР2_BPMN_TO_BE.nsbpmn','BPMN']]){
 const doc=JSON.parse(await fs.readFile(base+'/'+file,'utf8'));
 const page=await browser.newPage({viewport:{width:2400,height:1700},deviceScaleFactor:2});
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 await page.addInitScript(({doc,file})=>{const ok=value=>({ok:true,value});window.desktop={recent:async()=>ok([]),workspace:async()=>ok(null),restoreWorkspace:async()=>ok({activeSessionId:'rop-all',tabs:[{sessionId:'rop-all',document:doc,savedDocument:doc,path:file}],warnings:[]}),checkpoint:async()=>ok(null),onCommand:()=>()=>{},refreshWorkspace:async()=>ok(null)};},{doc,file:base+'/'+file});
 await page.goto('http://127.0.0.1:4182/',{waitUntil:'networkidle'});
 if(kind==='IDEF0'){
 await page.addStyleTag({content:'.idef0-frame-port,.idef0-sheet-resize,.react-flow__handle,.react-flow__controls,.react-flow__minimap,.react-flow__attribution,.idef0-stamp-placeholder{visibility:hidden!important}.idef0-boundary-label{font-size:0!important;background:transparent!important;width:34px!important;padding:0!important;white-space:nowrap!important}.idef0-boundary-label .idef0-icom{font-size:14px!important;color:#111!important}.idef0-sheet-page,.idef0-sheet-frame,.idef0-sheet-header,.idef0-sheet-footer{background:white!important}.idef0-sheet-footer{font:inherit!important;color:#151515!important;padding:0!important;align-items:stretch!important;gap:0!important;height:64px!important;min-height:64px!important;position:static!important}.idef0-sheet-footer .idef0-stamp-cell{font:inherit!important}.idef0-sheet-footer .idef0-stamp-title{flex-direction:row!important}.idef0-sheet-footer .idef0-stamp-title .idef0-stamp-value{width:0!important;text-align:left!important}.idef0-edge-label{max-width:180px!important}'});
 for(const name of ['A-0','A0']){
  await page.getByText('Открыть '+name,{exact:true}).first().click();await page.getByRole('button',{name:'Вписать',exact:true}).click();await page.waitForTimeout(400);
  const b=await page.locator('.idef0-sheet-page').boundingBox();await page.screenshot({path:base+'/ПР2_IDEF0_'+name+'.png',clip:{x:b.x-3,y:b.y-3,width:b.width+6,height:b.height+6}});
 }
 }else{
 await page.getByLabel('Вид BPMN').waitFor();
 await page.addStyleTag({content:'.bpmn-elements,.bpmn-properties,.bpmn-code,.bpmn-diagnostics,.native-bpmn-palette,.react-flow__controls,.react-flow__minimap,.react-flow__attribution,.react-flow__handle,.react-flow__background{display:none!important}.bpmn-body{grid-template-columns:1fr!important}.bpmn-editors{grid-template-rows:44px minmax(100px,1fr)!important}.native-bpmn-label{font-size:20px!important;line-height:1.18!important;color:#111!important;inset:12px 7px}.native-bpmn-label.pool-label{font-size:18px!important;inset:8px auto 8px 3px}.native-bpmn-edge-label{font-size:19px!important;line-height:1.15!important;color:#111!important;max-width:250px!important}.native-bpmn-shape{color:#111!important}.react-flow__edge path[d*="l8-5 8 5-8 5Z"]{display:none!important}'});
 for(const [view,name] of [['Main','Процесс'],['Preparation','Подготовка'],['Publication','Публикация']]){
 await page.getByLabel('Вид BPMN').selectOption('Plane_'+view);await page.getByRole('button',{name:'Вписать в окно ↗',exact:true}).click();await page.waitForTimeout(500);
 const b=await page.locator('.native-bpmn-shape,.native-bpmn-edge-label').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
 const x=Math.max(0,Math.min(...b.map(r=>r.x))-40),y=Math.max(0,Math.min(...b.map(r=>r.y))-40),r=Math.min(2400,Math.max(...b.map(r=>r.x+r.w))+40),bot=Math.min(1700,Math.max(...b.map(r=>r.y+r.h))+90);
 await page.screenshot({path:base+'/ПР2_BPMN_'+name+'.png',clip:{x,y,width:r-x,height:bot-y}});
 }
 }
 await page.close();console.log('Rendered',file);
}
await browser.close();
