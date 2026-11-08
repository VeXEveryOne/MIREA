import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const [html,pdf,modulePath,browserPath]=process.argv.slice(2);
if(!browserPath) throw new Error('Expected HTML, PDF, Playwright module, and browser executable');
const {chromium}=createRequire(import.meta.url)(modulePath);
const browser=await chromium.launch({executablePath:browserPath,headless:true});
try {
  const page=await browser.newPage({viewport:{width:1100,height:900}});
  await page.route('**/*',route=>{
    const url=route.request().url();
    return url.startsWith('file:')||url.startsWith('data:')?route.continue():route.abort();
  });
  await page.goto(pathToFileURL(html).href,{waitUntil:'networkidle'});
  await page.emulateMedia({media:'print'});
  await page.evaluate(()=>document.fonts.ready);
  await page.pdf({path:pdf,format:'A4',printBackground:false,
    margin:{top:'20mm',bottom:'20mm',left:'30mm',right:'15mm'},
    displayHeaderFooter:false});
  console.log(JSON.stringify({browser:await browser.version(),pdf}));
} finally {await browser.close();}
