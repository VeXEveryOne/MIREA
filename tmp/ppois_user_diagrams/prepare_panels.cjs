const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source = 'D:/GitHub/MIREA/4/ППОИС/Схемы';
const out = __dirname;

(async () => {
  for (const [id, name, split] of [
    ['bom_seq', 'ПР3_03_Последовательность_UC02', 860],
    ['pub_seq', 'ПР3_04_Последовательность_UC05', 1040],
  ]) {
    const original = fs.readFileSync(path.join(source, name + '.svg'), 'utf8');
    const [x, y, width, height] = original.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const content = original.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const headerHeight = 100 - y;
    for (const part of [1, 2]) {
      const panelHeight = part === 1 ? split - y : headerHeight + (y + height - split);
      const chunks = part === 1
        ? [{ top: 0, height: panelHeight, sourceY: y }]
        : [{ top: 0, height: headerHeight, sourceY: y }, { top: headerHeight, height: panelHeight - headerHeight, sourceY: split }];
      const clips = chunks.map((c, i) => `<clipPath id="panel-clip-${i}"><rect x="0" y="${c.top}" width="${width}" height="${c.height}"/></clipPath>`).join('');
      const segments = chunks.map((c, i) => `<g clip-path="url(#panel-clip-${i})"><g transform="translate(${-x} ${c.top - c.sourceY})"><use href="#source-diagram"/></g></g>`).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${panelHeight}" viewBox="0 0 ${width} ${panelHeight}"><defs><g id="source-diagram">${content}</g>${clips}</defs><rect width="${width}" height="${panelHeight}" fill="white"/>${segments}</svg>`;
      fs.writeFileSync(path.join(out, `${id}_${part}.svg`), svg);
      await sharp(Buffer.from(svg), { density: 144 }).png().toFile(path.join(out, `${id}_${part}.png`));
      console.log(`${id}_${part}: ${width} x ${panelHeight}; unchanged source geometry, repeated participant header on continuation`);
    }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
