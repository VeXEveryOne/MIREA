import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const output = process.argv[2];
if (!output) throw new Error("Укажите каталог для изображений.");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath:
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1500 },
  deviceScaleFactor: 2,
});

await page.goto("http://127.0.0.1:4173/?sample=rop-idef0", {
  waitUntil: "networkidle",
});
const idef0 = page.locator(".idef0-editor-canvas");
await idef0.waitFor({ state: "visible" });
await idef0.screenshot({ path: path.join(output, "idef0_context.png") });

await page.goto("http://127.0.0.1:4173/?sample=rop-idef0-decomposition", {
  waitUntil: "networkidle",
});
await idef0.waitFor({ state: "visible" });
await idef0.screenshot({ path: path.join(output, "idef0_decomposition.png") });

await page.goto("http://127.0.0.1:4173/?sample=rop-bpmn", {
  waitUntil: "networkidle",
});
await page.setViewportSize({ width: 2400, height: 1600 });
await page.addStyleTag({
  content: ".djs-palette, .bjs-powered-by { display: none !important; }",
});
const bpmn = page.locator(".bpmn-canvas");
await bpmn.waitFor({ state: "visible" });
await page.getByRole("button", { name: /Вписать в окно/ }).click();
await page.waitForTimeout(300);
await bpmn.screenshot({ path: path.join(output, "bpmn_as_is.png") });

await browser.close();
console.log(output);
