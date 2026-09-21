import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const sharp=require('sharp');
const p='D:/GitHub/MIREA/4/РОП/Практики_1-8/Черновики_схем';
for(const f of await fs.readdir(p))if(f.endsWith('.svg'))await sharp(await fs.readFile(p+'/'+f),{density:144}).png().toFile(p+'/'+f.replace('.svg','.png'));
console.log('Rendered all SVG');
