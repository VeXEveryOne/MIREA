const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const base='D:/GitHub/MIREA/tmp/ppois_omni';
app.setPath('userData',base+'/export-profile');
app.commandLine.appendSwitch('force-device-scale-factor','2');
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 try{
  for(const [sheet,part] of [['use',0],['classes',0],['bom_seq',0],['pub_seq',0],['comm',0],['bom_seq',1],['bom_seq',2],['pub_seq',1],['pub_seq',2]]){
   const w=new BrowserWindow({width:2400,height:2400,show:false,webPreferences:{offscreen:true,contextIsolation:true}});
   await w.loadFile(base+'/render.html',{query:{sheet,part:String(part)}});
   await new Promise(r=>setTimeout(r,1800));
   const size=await w.webContents.executeJavaScript('window.exportSize');
   w.setContentSize(size.width,size.height);
   await new Promise(r=>setTimeout(r,300));
   const out=await w.webContents.capturePage();
   fs.writeFileSync(base+'/'+sheet+(part?'_'+part:'')+'.png',out.toPNG());
   fs.appendFileSync(base+'/export.log',sheet+' '+JSON.stringify(size)+'\n');
   w.destroy();
  }
  app.quit();
 }catch(e){fs.appendFileSync(base+'/export.log',String(e.stack));app.exit(1)}
});
