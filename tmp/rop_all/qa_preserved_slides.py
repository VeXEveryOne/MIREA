from pathlib import Path
from PIL import Image
root=Path('D:/GitHub/MIREA/tmp')
files=sorted((root/'rop_bpmn_review/slides/powerpoint-render').glob('*.PNG'),key=lambda p:int(p.stem.replace('Слайд','')))
out=root/'rop_all/qa_slides'
for start in range(0,len(files),3):
    images=[Image.open(p).convert('RGB') for p in files[start:start+3]]
    canvas=Image.new('RGB',(max(i.width for i in images),sum(i.height+10 for i in images)),'#aaa')
    y=0
    for im in images:canvas.paste(im,(0,y));y+=im.height+10
    canvas.save(out/f'pr1-{start+1}-{start+len(images)}.png')
print(len(files),'preserved slides')
