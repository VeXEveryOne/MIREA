import {chromium} from 'file:///C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const file='D:/GitHub/MIREA/4/РОП/IDEF0/РОП_Практика_1_AS_IS.nsidef0';
const doc=JSON.parse(await fs.readFile(file,'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:2200,height:1500},deviceScaleFactor:2});
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.addInitScript(({doc,file})=>{
 const ok=value=>({ok:true,value});
 window.desktop={recent:async()=>ok([]),workspace:async()=>ok(null),restoreWorkspace:async()=>ok({activeSessionId:'rop',tabs:[{sessionId:'rop',document:doc,savedDocument:doc,path:file}],warnings:[]}),checkpoint:async()=>ok(null),onCommand:()=>()=>{},refreshWorkspace:async()=>ok(null)};
},{doc,file});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.addStyleTag({content:`
.idef0-frame-port,.idef0-sheet-resize,.react-flow__handle,.react-flow__controls,.react-flow__minimap,.react-flow__attribution,.idef0-stamp-placeholder {visibility:hidden!important}
.idef0-boundary-label{font-size:0!important;background:transparent!important;width:34px!important;padding:0!important;white-space:nowrap!important}
.idef0-boundary-label .idef0-icom{font-size:14px!important;color:#111!important}
.idef0-sheet-page,.idef0-sheet-frame,.idef0-sheet-header,.idef0-sheet-footer {background:white!important}
.idef0-sheet-footer{font:inherit!important;color:#151515!important;padding:0!important;align-items:stretch!important;gap:0!important;height:64px!important;min-height:64px!important;position:static!important}
.idef0-sheet-footer .idef0-stamp-cell{font:inherit!important}
.idef0-sheet-footer .idef0-stamp-title{flex-direction:row!important}
.idef0-sheet-footer .idef0-stamp-title .idef0-stamp-value{width:0!important;text-align:left!important}
.idef0-edge-label{max-width:180px!important}
`});
for(const [name,node] of [['A-0','context'],['A0','decomposition']]){
 await page.getByText('Открыть '+name,{exact:true}).first().click();
 await page.getByRole('button',{name:'Вписать',exact:true}).click();
 await page.waitForTimeout(400);
 const box=await page.locator('.idef0-sheet-page').boundingBox();
 console.log(name,box);
 await page.screenshot({path:`D:/GitHub/MIREA/4/РОП/IDEF0/${name}.png`,clip:{x:box.x-3,y:box.y-3,width:box.width+6,height:box.height+6}});
}
await browser.close();

