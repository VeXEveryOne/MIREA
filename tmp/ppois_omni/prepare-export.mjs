import fs from 'node:fs/promises';
import {build} from 'file:///D:/OmniNotation/node_modules/esbuild/lib/main.js';
const base='D:/GitHub/MIREA/tmp/ppois_omni';
await build({entryPoints:[base+'/render.tsx'],outfile:base+'/bundle.js',bundle:true,platform:'browser',format:'iife',jsx:'automatic',alias:{react:'D:/OmniNotation/node_modules/react'},logLevel:'warning'});
const doc=await fs.readFile('D:/GitHub/MIREA/4/ППОИС/Схемы/ПР3_Модель_анализа.omni','utf8');
await fs.writeFile(base+'/render.html','<!doctype html><html lang="ru"><meta charset="utf-8"><link rel="stylesheet" href="bundle.css"><style>.react-flow__handle{opacity:0!important}.uml-shape{font-size:17px;color:#111}.uml-class-name small,.uml-compartment,.uml-operand,.uml-frame-title,.uml-end-label{font-size:16px}.uml-edge-label{font-size:19px;max-width:440px}body{font-family:Segoe UI,sans-serif;background:white}</style><body><div id="root"></div><script>window.modelDocument='+doc+'</script><script src="bundle.js"></script></body></html>');
