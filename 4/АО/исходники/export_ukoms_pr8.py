"""Export the labelled PR8 view through Archi's native renderer.

Usage: python export_ukoms_pr8.py --archi /path/to/Archi.exe
Temporary HTML/CSV output stays in .cache; the subject keeps one current PDF
and the native diagram image under illustrations.
"""
from pathlib import Path
import argparse
import shutil
import subprocess
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE = Path(__file__).resolve().parents[1]
REPO = BASE.parents[1]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--archi',type=Path,default=REPO/'.cache/ao_labels/archi/Archi/Archi.exe')
    args=parser.parse_args()
    if not args.archi.is_file():raise FileNotFoundError('Pass the installed Archi executable with --archi')
    cache=REPO/'.cache/ao_labels';cache.mkdir(parents=True,exist_ok=True)
    model=BASE/'Юкомс_ПР8_АлбахтинИВ.archimate'
    cmd=[str(args.archi),'-application','com.archimatetool.commandline.app','-consoleLog','-nosplash',
         '-data',str(cache/'workspace'),'--loadModel',str(model),'--html.createReport',str(cache/'html'),
         '--csv.export',str(cache/'csv')]
    r=subprocess.run(cmd,capture_output=True,text=True,timeout=120,
                     creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    (cache/'export.log').write_text(r.stdout+'\n'+r.stderr,encoding='utf8')
    if r.returncode:raise RuntimeError(r.stderr)
    sources=list((cache/'html').glob('id-*/images/*.png'))
    if len(sources)!=1:raise RuntimeError(f'Expected one native view image, got {len(sources)}')
    image=BASE/'иллюстрации/ПР8/Архитектура_Юкомс.png'
    image.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(sources[0],image)
    size=Image.open(image).size
    scale=.75;margin=18;title=38
    width,height=size[0]*scale+margin*2,size[1]*scale+margin*2+title
    pdf=BASE/'Персональный_вариант_ПР8.pdf'
    pdfmetrics.registerFont(TTFont('AO-TNR','C:/Windows/Fonts/times.ttf'))
    c=canvas.Canvas(str(pdf),pagesize=(width,height))
    c.setTitle('Архитектура ООО Юкомс — ПР8 — все 42 связи подписаны')
    c.setAuthor('Албахтин И.В.')
    c.setFont('AO-TNR',18)
    c.drawString(margin,height-margin-18,'Архитектура ООО «Юкомс» — ПР8–9 — 28 элементов и 42 подписанные связи')
    c.drawImage(str(image),margin,margin,width=size[0]*scale,height=size[1]*scale)
    c.showPage();c.save()
    print(image);print(pdf)

if __name__=='__main__':main()
