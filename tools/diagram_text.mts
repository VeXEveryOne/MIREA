import {runtimeModule} from './runtime.mjs';
const {default:sharp}=await runtimeModule('sharp');
export const font='Arial';
export const escape=(value:unknown)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const cache=new Map<string,number>();
export async function measure(value:string,size:number,bold=false){
 const key=`${size}:${bold}:${value}`;
 if(cache.has(key))return cache.get(key)!;
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="100"><text x="0" y="60" font-family="${font}" font-size="${size}" font-weight="${bold?'bold':'normal'}">${escape(value)}</text></svg>`);
 const {info}=await sharp(svg).trim().toBuffer({resolveWithObject:true});
 cache.set(key,info.width);return info.width;
}
export async function wrap(value:string,width:number,size:number,bold=false){
 const result:string[]=[];
 for(const paragraph of value.split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/).filter(Boolean)){
   if(await measure(word,size,bold)>width)throw Error(`Unbreakable label: ${word} / ${width}`);
   const next=line?line+' '+word:word;
   if(line&&await measure(next,size,bold)>width){result.push(line);line=word;}else line=next;
  }
  if(line)result.push(line);
 }
 return result;
}
export const intersects=(a:any,b:any,pad=8)=>a.x<b.x+b.width+pad&&a.x+a.width>b.x-pad&&a.y<b.y+b.height+pad&&a.y+a.height>b.y-pad;
