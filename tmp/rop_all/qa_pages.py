from pathlib import Path
from PIL import Image,ImageDraw
root=Path('D:/GitHub/MIREA/tmp/rop_all')
out=root/'qa_final';out.mkdir(exist_ok=True)
files=sorted((root/'render_final').glob('page-*.png'),key=lambda p:int(p.stem.split('-')[-1]))
for start in range(0,len(files),4):
    group=files[start:start+4]
    images=[Image.open(p).convert('RGB') for p in group]
    w=max(i.width for i in images);h=max(i.height for i in images)+26
    canvas=Image.new('RGB',(w*2,h*2),'#b8b8b8');d=ImageDraw.Draw(canvas)
    for j,(p,im) in enumerate(zip(group,images)):
        x=(j%2)*w;y=(j//2)*h
        d.text((x+8,y+5),p.stem,fill='black')
        canvas.paste(im,(x,y+26))
    canvas.save(out/f'pages-{start+1:02d}-{start+len(group):02d}.png')
print(len(files),'pages in',len(list(out.glob('*.png'))),'full-resolution panels')
