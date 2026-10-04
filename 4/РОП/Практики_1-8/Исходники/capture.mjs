import fs from 'node:fs/promises';
import path from 'node:path';

import { MODEL_DIR as models, EXPORT_DIR as output, runtimeModule } from './runtime.mjs';
const {chromium} = await runtimeModule('playwright');
const jobs = [
  {
    file: 'ПР1_IDEF0_AS_IS.omni',
    diagrams: [
      ['A-0', '01_Рисунок 01 — IDEF0 AS IS_ контекст ручной подготовки карточки.png'],
      ['A0', '02_Рисунок 02 — IDEF0 AS IS_ ручная подготовка и повторный ввод.png'],
    ],
  },
  {
    file: 'ПР2_IDEF0_TO_BE.omni',
    diagrams: [
      ['A-0', '06_Рисунок 06 — IDEF0 TO BE_ контекст управляемого процесса.png'],
      ['A0', '07_Рисунок 07 — IDEF0 TO BE_ версионированная подготовка и публикация.png'],
    ],
  },
];

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

for (const job of jobs) {
  const filePath = path.join(models, job.file);
  const document = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const page = await browser.newPage({
    viewport: { width: 2600, height: 1900 },
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (error) => console.log('PAGEERROR', error.message));
  await page.addInitScript(
    ({ document, filePath }) => {
      const ok = (value) => ({ ok: true, value });
      window.desktop = {
        recent: async () => ok([]),
        workspace: async () => ok(null),
        restoreWorkspace: async () => ok({
          activeSessionId: 'rop-idef0',
          tabs: [{
            sessionId: 'rop-idef0',
            document,
            savedDocument: document,
            path: filePath,
          }],
          warnings: [],
        }),
        checkpoint: async () => ok(null),
        onCommand: () => () => {},
        onOpenDocument: () => () => {},
        rendererReady: () => {},
        refreshWorkspace: async () => ok(null),
      };
    },
    { document, filePath },
  );
  await page.goto('http://127.0.0.1:4182/', { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: `
      .idef0-frame-port,.idef0-sheet-resize,.react-flow__handle,
      .react-flow__controls,.react-flow__minimap,.react-flow__attribution,
      .idef0-stamp-placeholder{visibility:hidden!important}
      .idef0-boundary-label{font-size:0!important;background:transparent!important;
        width:34px!important;padding:0!important;white-space:nowrap!important}
      .idef0-boundary-label .idef0-icom{font-size:14px!important;color:#111!important}
      .idef0-sheet-page,.idef0-sheet-frame,.idef0-sheet-header,
      .idef0-sheet-footer{background:white!important}
      .idef0-sheet-footer{font:inherit!important;color:#151515!important;padding:0!important;
        align-items:stretch!important;gap:0!important;height:64px!important;min-height:64px!important;
        position:static!important}
      .idef0-sheet-footer .idef0-stamp-cell{font:inherit!important}
      .idef0-sheet-footer .idef0-stamp-title{flex-direction:row!important}
      .idef0-sheet-footer .idef0-stamp-title .idef0-stamp-value{width:0!important;text-align:left!important}
      .idef0-edge-label{max-width:185px!important;line-height:1.15!important;padding:2px 4px!important}
    `,
  });
  for (const [node, outputName] of job.diagrams) {
    await page.getByText(`Открыть ${node}`, { exact: true }).first().click();
    await page.getByRole('button', { name: 'Вписать', exact: true }).click();
    await page.waitForTimeout(500);
    const box = await page.locator('.idef0-sheet-page').boundingBox();
    if (!box) throw new Error(`Не найден лист ${node} в ${job.file}`);
    await page.screenshot({
      path: path.join(output, outputName),
      clip: { x: box.x - 3, y: box.y - 3, width: box.width + 6, height: box.height + 6 },
    });
    console.log('Rendered', job.file, node, outputName);
  }
  await page.close();
}

await browser.close();
