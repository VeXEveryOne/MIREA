import sys,importlib.util,shutil,os
from pathlib import Path
runtime=Path('C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies')
os.environ['PATH']=str(runtime/'native/poppler/bin')+os.pathsep+os.environ['PATH']
source=Path('C:/Users/VeX/.codex/plugins/cache/openai-primary-runtime/documents/26.905.11957/skills/documents/render_docx.py')
spec=importlib.util.spec_from_file_location('packaged_render_docx',source);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
pdf=Path(sys.argv[2]).resolve();docx=Path(sys.argv[1]).resolve();out=Path(sys.argv[3]).resolve()
def convert(doc_path,user_profile,convert_tmp_dir,stem,verbose):
 dst=Path(convert_tmp_dir)/(stem+'.pdf');shutil.copy2(pdf,dst);return str(dst),'PDF exported by Microsoft Word; bundled Poppler rasterization'
module.convert_to_pdf=convert
dpi=sys.argv[4] if len(sys.argv)>4 else '130'
sys.argv=[str(source),str(docx),'--output_dir',str(out),'--dpi',dpi]
module.main()

