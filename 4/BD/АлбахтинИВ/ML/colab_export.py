# Run as the sixth code cell after a complete Run All in a new Colab runtime.
from datetime import datetime,timezone
from pathlib import Path
import hashlib,json,platform,sys,zipfile
from google.colab import files

assert get_ipython().execution_count==6,'Use a new runtime and run the five calculation cells first'
history=get_ipython().history_manager.input_hist_raw[1:6]
assert len(history)==5 and len(predictions)==9246
assert hashlib.sha256(data_path.read_bytes()).hexdigest()=='fe0a3b189eb61dbe0b1f48356a9444755ada29ba00aef3b43cae3dbf5c4de7f7'
assert summary['environment']['google_colab']
cpu_line=next(line for line in Path('/proc/cpuinfo').read_text().splitlines() if line.startswith('model name'))
record={'status':'passed','completed_utc':datetime.now(timezone.utc).isoformat(),
    'google_colab':True,'fresh_runtime':True,'calculation_cells':5,'export_cell':6,
    'calculation_execution_counts':[1,2,3,4,5],
    'source_cell_sha256':[hashlib.sha256(code.strip().encode()).hexdigest() for code in history],
    'source_csv_sha256':hashlib.sha256(data_path.read_bytes()).hexdigest(),
    'python':platform.python_version(),'sklearn':sklearn.__version__,'numpy':np.__version__,
    'pandas':pd.__version__,'matplotlib':plt.matplotlib.__version__,
    'cpu_model':cpu_line.split(':',1)[1].strip(),'cpus':os.cpu_count(),
    'memory_total_kib':int(Path('/proc/meminfo').read_text().splitlines()[0].split()[1]),
    'platform':platform.platform(),'test_rows':len(predictions),'roundtrip_equal':True}
(OUT/'cloud_execution.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
archive=Path.cwd()/'pr7_colab_results.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as zipped:
    for result in sorted(OUT.iterdir()):
        if result.is_file() and result.suffix in ['.json','.csv','.png']:zipped.write(result,result.name)
print(json.dumps(record,ensure_ascii=False,indent=2))
files.download(str(archive))
