import importlib.util, os, subprocess
from pathlib import Path

ROOT = Path('C:/Users/VeX/.codex/plugins/cache/openai-primary-runtime/documents/26.905.11957/skills/documents')
spec = importlib.util.spec_from_file_location('renderer', ROOT / 'render_docx.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)
os.environ['PATH'] = 'C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin;' + os.environ['PATH']

def word_pdf(doc_path, user_profile, convert_tmp_dir, stem, verbose=False):
    output = str(Path(convert_tmp_dir) / (stem + '.pdf'))
    quote = lambda s: "'" + str(s).replace("'", "''") + "'"
    command = "$ErrorActionPreference='Stop'; $taskWord=New-Object -ComObject Word.Application; $taskWord.Visible=$false; $taskWord.DisplayAlerts=0; try { $taskDoc=$taskWord.Documents.Open(" + quote(doc_path) + ", $false, $true); $taskDoc.Repaginate(); $taskDoc.ExportAsFixedFormat(" + quote(output) + ",17); $taskDoc.Close(0) } finally { $taskWord.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($taskWord) }"
    result = subprocess.run(['powershell', '-NoProfile', '-Command', command], capture_output=True, text=True, timeout=180)
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return output, 'Microsoft Word COM export; bundled render_docx.py and Poppler'

renderer.convert_to_pdf = word_pdf
renderer.main()
