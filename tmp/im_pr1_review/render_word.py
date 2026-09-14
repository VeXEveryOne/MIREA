import importlib.util, os, subprocess, sys
from pathlib import Path
root=Path('C:/Users/ilalb/.codex/plugins/cache/openai-primary-runtime/documents/26.905.11957/skills/documents')
spec=importlib.util.spec_from_file_location('renderer',root/'render_docx.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
os.environ['PATH']='C:/Users/ilalb/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin;'+os.environ['PATH']
def word_pdf(doc_path,user_profile,convert_tmp_dir,stem,verbose=False):
 out=str(Path(convert_tmp_dir)/(stem+'.pdf'))
 script=Path(__file__).with_name('export_word.ps1').read_text(encoding='utf-8').split('\n',1)[1]
 script="$InputDocx='"+doc_path.replace("'","''")+"';$OutputPdf='"+out.replace("'","''")+"';\n"+script
 proc=subprocess.run(['powershell','-NoProfile','-Command',script],capture_output=True,text=True)
 if proc.returncode:raise RuntimeError(proc.stdout+proc.stderr)
 return out,'Microsoft Word COM export'
m.convert_to_pdf=word_pdf
m.main()
