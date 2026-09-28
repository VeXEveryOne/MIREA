from pathlib import Path
from zipfile import ZipFile
from shutil import copy2
from copy import deepcopy
from lxml import etree
from PIL import Image
import json, hashlib

base = Path('D:/GitHub/MIREA')
out = Path(__file__).parent
report = base / '4/ППОИС/ППОИС_3_АлбахтинИВ.docx'
source = base / '4/ППОИС/Схемы'
for src in (report, report.with_suffix('.pdf')):
    backup = out / ('before' + src.suffix)
    if not backup.exists():
        copy2(src, backup)
with ZipFile(out / 'before.docx') as z:
    entries = [(info, z.read(info.filename)) for info in z.infolist()]
parts = {info.filename: data for info, data in entries}
ns = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
root = etree.fromstring(parts['word/document.xml'])
before = deepcopy(root)
rels = etree.fromstring(parts['word/_rels/document.xml.rels'])
targets = {r.get('Id'): 'word/' + r.get('Target') for r in rels}
panels = [
    (source / 'ПР3_01_Варианты_использования.png', 14.3),
    (source / 'ПР3_02_Классы_анализа.png', 14.3),
    (out / 'bom_seq_1.png', 12.3),
    (out / 'bom_seq_2.png', 14.3),
    (out / 'pub_seq_1.png', 12.3),
    (out / 'pub_seq_2.png', 14.3),
    (source / 'ПР3_05_Кооперация_UC05.png', 12.9),
]
captions = [p for p in root.xpath('//w:body/w:p', namespaces=ns)
            if ''.join(p.xpath('.//w:t/text()', namespaces=ns)).startswith('Рисунок ')]
assert len(captions) == len(panels)
changes = {}
manifest = []
for caption, (image, max_height) in zip(captions, panels):
    drawing = caption.getprevious().find('.//w:drawing', ns)
    assert drawing is not None
    rid = drawing.find('.//a:blip', ns).get('{' + ns['r'] + '}embed')
    media = targets[rid]
    with Image.open(image) as im:
        width_px, height_px = im.size
    width = min(24.4, max_height * width_px / height_px)
    height = width * height_px / width_px
    for ext in drawing.xpath('.//wp:extent | .//a:xfrm/a:ext', namespaces=ns):
        ext.set('cx', str(round(width * 360000)))
        ext.set('cy', str(round(height * 360000)))
    changes[media] = image.read_bytes()
    manifest.append({'caption': ''.join(caption.xpath('.//w:t/text()', namespaces=ns)),
                     'source': str(image), 'width_cm': width, 'height_cm': height,
                     'sha256': hashlib.sha256(changes[media]).hexdigest()})
# Only drawing dimensions and seven image parts may change.
for tree in (root, before):
    clone = deepcopy(tree)
    for ext in clone.xpath('//w:drawing//wp:extent | //w:drawing//a:xfrm/a:ext', namespaces=ns):
        ext.set('cx', '0'); ext.set('cy', '0')
    if tree is root:
        normalized = etree.tostring(clone)
    else:
        assert normalized == etree.tostring(clone)
assert all(s.get('{' + ns['w'] + '}val') == 'nil' for s in root.xpath('//w:tbl//w:shd', namespaces=ns))
changes['word/document.xml'] = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
with ZipFile(report, 'w') as z:
    for info, data in entries:
        z.writestr(info, changes.get(info.filename, data))
with ZipFile(report) as z:
    assert all(z.read(info.filename) == data for info, data in entries if info.filename not in changes)
(out / 'inserted_images.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
print('Replaced seven image panels from five updated diagrams; report text, captions, tables and styles preserved.')
