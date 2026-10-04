"""Run the packaged rasterizer with Microsoft Word as its Windows PDF backend."""
import importlib.util, subprocess, shutil, os
from pathlib import Path
SKILL=Path(r'C:\Users\VeX\.codex\plugins\cache\openai-primary-runtime\documents\26.905.11957\skills\documents')
spec=importlib.util.spec_from_file_location('render_docx',SKILL/'render_docx.py')
render=importlib.util.module_from_spec(spec);spec.loader.exec_module(render)
def word_pdf(doc_path,user_profile,convert_tmp_dir,stem,verbose=False):
    pdf=Path(convert_tmp_dir)/(stem+'.pdf')
    # Work only on a private render copy; the source package remains unmodified.
    copied=Path(convert_tmp_dir)/(stem+'.docx');shutil.copy2(doc_path,copied)
    script=Path(__file__).with_name('export_word.ps1').read_text(encoding='utf-8').split('\n',1)[1]
    script='$DocumentPath=$env:BD_FORMAT_DOCX; $PdfPath=$env:BD_FORMAT_PDF;\n'+script
    result=subprocess.run(['powershell','-NoProfile','-Command',script],env={**os.environ,'BD_FORMAT_DOCX':str(copied),'BD_FORMAT_PDF':str(pdf)},capture_output=True,text=True)
    if result.returncode:raise RuntimeError(result.stdout+result.stderr)
    print(result.stdout.strip())
    # Keep the field-updated Word document alongside its source for final checks.
    shutil.copy2(copied,Path(doc_path).with_name(Path(doc_path).stem+'_fields.docx'))
    return str(pdf),result.stdout
render.convert_to_pdf=word_pdf
render.main()
