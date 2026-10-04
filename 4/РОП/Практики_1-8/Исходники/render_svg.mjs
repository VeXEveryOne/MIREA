import fs from 'node:fs/promises';
import {ROOT,runtimeModule} from './runtime.mjs';
const {default:sharp}=await runtimeModule('sharp');
const p=ROOT+'/Черновики_схем';
for(const f of await fs.readdir(p))if(f.endsWith('.svg'))await sharp(await fs.readFile(p+'/'+f),{density:144}).png().toFile(p+'/'+f.replace('.svg','.png'));
console.log('Rendered all SVG');
