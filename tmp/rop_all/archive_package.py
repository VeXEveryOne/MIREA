from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from urllib.parse import unquote
import json,re,hashlib
root=Path('D:/GitHub/MIREA/4/РОП/Практики_1-8')
for md in root.rglob('*.md'):
    for url in re.findall(r'\]\(([^)]+)\)',md.read_text('utf-8')):
        if '://' in url or url.startswith('#'): continue
        assert (md.parent/unquote(url)).exists(),(md,url)
for n in range(2,9):
    receipt=json.loads((root/'Исходники'/f'ПР{n}_проверка_PPTX.json').read_text('utf-8'))
    ppt=root/'Презентации'/f'РОП_Практическая_{n}_АлбахтинИВ.pptx'
    assert hashlib.sha256(ppt.read_bytes()).hexdigest()==receipt['finalSha256']
files=sorted(p for p in root.rglob('*') if p.is_file())
assert all('node_modules' not in p.parts and not p.name.startswith('~$') for p in files)
manifest={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(root/'SHA256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
archive=root.parent/'РОП_Практики_1-8_АлбахтинИВ_комплект.zip'
with ZipFile(archive,'w',ZIP_DEFLATED,compresslevel=8) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file(): z.write(p,p.relative_to(root.parent).as_posix())
with ZipFile(archive) as z:
    assert z.testzip() is None
    count=len(z.namelist())
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files':count,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()},ensure_ascii=False))
