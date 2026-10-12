// Editable state views. Every transition has its event/guard on the arrow.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeModule} from '../../../tools/runtime.mjs';
const {default:sharp}=await runtimeModule('sharp');
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../Схемы');
const output=process.env.PPOIS_MODEL_OUTPUT??directory;
await fs.mkdir(output,{recursive:true});
// Detailed conditions remain the source of the report table. The concise
// labels below express the same events without forcing a table lookup.
export const transitions=JSON.parse(await fs.readFile(path.join(directory,'ПР4_Переходы.json'),'utf8'));
const labels={
 T01:'Запросить проверку',T02:'[нет ошибок; данные полны]',T03:'[есть конфликты или неполные данные]',
 T04:'Исправить данные / создать черновик',T05:'Подтвердить отправку / записать попытку',
 T06:'Получен ID задачи [итог ещё не готов]',T07:'Ответ потерян [исход неизвестен]',
 T08:'Временный отказ [операция не принята]',T09:'Окончательный отказ [данные или права]',
 T10:'Получен итог [успех]',T11:'Получен итог [отказ]',T12:'Тайм-аут сверки [исход неизвестен]',
 T13:'Сверить результат [успех]',T14:'Сверить результат [задача обрабатывается]',
 T15:'Сверить результат [операция не принята]',
 T16:'Повторить [ревизия актуальна; срок наступил; лимит не исчерпан] / записать новую попытку',
 T17:'Исправить отказ / создать новую ревизию',T18:'Изменились исходные данные',
 T19:'Создать ревизию / сохранить историю',T20:'Данные изменились до отправки / отменить готовность',
 'T10/T13':'Подтверждена публикация',
};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const metrics=new Map();
async function measure(s,size){
 const key=size+':'+s;if(!metrics.has(key)) {
  const xml=`<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="80"><text x="2" y="60" font-family="Arial" font-size="${size}">${esc(s)}</text></svg>`;
  const {info}=await sharp(Buffer.from(xml)).trim().png().toBuffer({resolveWithObject:true});metrics.set(key,info.width);
 }return metrics.get(key);
}
async function wrap(s,width,size=28){
 const lines=[];let current='';for(const word of s.split(/\s+/)) {
  const next=current?current+' '+word:word;
  if(current&&await measure(next,size)>width){lines.push(current);current=word;}else current=next;
 }if(current)lines.push(current);return lines;
}
const text=(x,y,lines,size=28)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial" font-size="${size}">${lines.map((s,i)=>`<tspan x="${x}" dy="${i?size+5:0}">${esc(s)}</tspan>`).join('')}</text>`;
const covered=new Set();
async function save(name,width,height,nodes,edges,notes=[],starts=[]){
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" viewBox="0 0 12 10" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto"><path d="M1 0 L11 5 L1 10" fill="none" stroke="#111" stroke-width="1.4"/></marker></defs><rect width="100%" height="100%" fill="white"/>`;
 const captions=[];
 for(const [route,id,x,y,w] of edges) {
  const lines=await wrap(id+' · '+labels[id],w);
  svg+=`<path d="${route}" stroke="white" stroke-width="8" fill="none"/><path d="${route}" stroke="#111" stroke-width="2.4" fill="none" marker-end="url(#arrow)"/>`;
  if(id==='T10/T13'){covered.add('T10');covered.add('T13');}else covered.add(id);
  const actual=Math.max(...await Promise.all(lines.map(s=>measure(s,28))));
  captions.push(`<rect x="${x-actual/2-8}" y="${y-28}" width="${actual+16}" height="${lines.length*33+5}" fill="white"/>`+text(x,y,lines));
 }
 for(const [x,y,route] of starts)
  svg+=`<circle cx="${x}" cy="${y}" r="10" fill="#111"/><path d="${route}" stroke="#111" stroke-width="2.4" fill="none" marker-end="url(#arrow)"/>`;
 svg+=captions.join('');
 for(const [x,y,w,h,label] of nodes) {
  const lines=await wrap(label,w-24,31);
  svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="15" fill="white" stroke="#111" stroke-width="2.4"/>`;
  if(label.startsWith('Обмен с Ozon')) svg+=text(x+w/2,y+39,['Обмен с Ozon'],31)+
    `<path d="M${x} ${y+57} H${x+w}" stroke="#111" stroke-width="1.5"/>`+
    text(x+w/2,y+94,['Вход: «Отправляется»','Раскрыт на рисунках 8–9'],26);
  else svg+=text(x+w/2,y+h/2-(lines.length-1)*18+10,lines,31);
 }
 for(const [x,y,lines] of notes)svg+=text(x,y,lines,26);
 svg+='</svg>';
 await fs.writeFile(path.join(output,name+'.svg'),svg+'\n');
 await sharp(Buffer.from(svg)).resize({width:3600}).png().toFile(path.join(output,name+'.png'));
}
await save('ПР4_07_Состояния_Карточка',1800,1250,[
 [180,170,360,120,'Черновик'],[720,170,360,120,'На проверке'],[1260,170,360,120,'Готова к публикации'],
 [720,620,360,120,'Ошибка проверки'],[1260,620,360,150,'Обмен с Ozon (рисунки 8–9)'],
 [180,1030,360,120,'Требует актуализации'],[1260,1030,360,120,'Опубликована'],
],[
 ['M540 230 H720','T01',630,180,170],['M1080 230 H1260','T02',1170,125,170],
 ['M900 290 V620','T03',1110,438,340],['M720 680 H360 V290','T04',535,642,290],
 ['M1440 290 V620','T05',1590,440,275],['M1440 770 V1030','T10/T13',1530,900,300],
 ['M1260 1090 H540','T18',900,1045,500],['M180 1090 H60 V230 H180','T19',215,865,290],
 ['M1440 170 V55 H360 V170','T20',900,47,720],
 ['M1260 740 H1160 V890 H120 V270 H180','T17',785,853,540],
],[[900,1220,['Метка перехода: событие [условие] / действие.']]],[[450,125,'M450 135 V170']]);
await save('ПР4_08_Состояния_Обмен',1800,1150,[
 [70,490,380,150,'Отправляется'],[1320,90,400,140,'Ожидает результата'],
 [1320,360,400,140,'Результат неизвестен'],[1320,630,400,140,'Временная ошибка'],
 [1320,900,400,140,'Отказ'],
],[
 ['M450 515 H650 V160 H1320','T06',990,125,490],
 ['M450 545 H750 V430 H1320','T07',1030,390,450],
 ['M450 585 H750 V700 H1320','T08',1030,655,450],
 ['M450 620 H650 V970 H1320','T09',990,925,490],
],[[900,1100,['Продолжение ожидания и сверки — на рисунке 9.']]]);
await save('ПР4_09_Состояния_Сверка',2100,1500,[
 [50,150,420,130,'Ожидает результата'],[50,850,420,130,'Результат неизвестен'],
 [1610,150,420,130,'Опубликована'],[1610,650,420,130,'Отказ'],
 [1610,1100,420,130,'Временная ошибка'],[930,1280,420,130,'Отправляется'],
],[
 ['M470 215 H1610','T10',1040,177,640],
 ['M470 250 H720 V715 H1610','T11',1110,673,530],
 ['M250 280 V850','T12',380,550,330],
 ['M470 885 H1450 V250 H1610','T13',1550,500,300],
 ['M50 885 H20 V180 H50','T14',195,735,330],
 ['M470 930 H900 V1165 H1610','T15',1260,1120,565],
 ['M1610 1190 H1450 V1345 H1350','T16',1730,1325,550],
],[[1050,1460,['При неизвестном исходе отправка запрещена до сверки.']]]);
if(transitions.some(([id])=>!covered.has(id)))throw Error('A transition was omitted');
await fs.writeFile(path.join(output,'ПР4_Переходы.json'),JSON.stringify(transitions,null,2)+'\n');
console.log(JSON.stringify({output,transitions:transitions.length,views:3}));
