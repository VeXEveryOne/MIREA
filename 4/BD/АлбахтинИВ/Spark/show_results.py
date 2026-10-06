"""Print measured result subsets in the real guest console for screenshots."""
from pathlib import Path
import json
import sys

r = json.loads((Path('results') / f'pr{sys.argv[1]}.json').read_text())
topic = sys.argv[2]
print(f'TIABD PRACTICE {sys.argv[1]} | {topic.upper()}')
if topic == 'environment':
    for k in ['python','java','spark','master','parallelism','shuffle_partitions','aqe']:
        print(f'{k:20}: {r["environment"][k]}')
    print('Source tables:',r.get('source_counts',r.get('inputs')))
elif topic == 'quality':
    for k,v in r['nulls'].items(): print(f'{k:34}: {v}')
    print('Delivery:',r['delivery'])
    print('Missing categories:',r['missing_categories'])
    print('JOIN:',r['join'])
elif topic == 'olist':
    print('category                     items     revenue')
    for row in r['category'][:10]:
        print(f'{row["category"]:28} {row["items"]:6} {row["revenue"]:12.2f}')
    print('Export checks:',r['export'])
elif topic == 'komus':
    k=r['komus']
    print('Rows:',k['rows'],'Dimension unique:',k['dim_unique'])
    print('Null counts:',k['nulls'])
    print('JOIN counts:',k['joins'])
    print('Output groups:',k['output_rows'])
    print('Roundtrip types:',k['roundtrip_types_equal'])
    print('Branches:')
    for b in k['branches']:
        print(b['branch'],b['lines'],f'{b["revenue"]:.2f}')
elif topic == 'partitions':
    print('variant          min       max      mean')
    for name,v in r['profiles'].items():
        print(f'{name:15} {v["min"]:9} {v["max"]:9} {v["mean"]:10.2f}')
    print('Lazy:',r['lazy'])
elif topic == 'benchmark':
    print('p      t1       t2       t3     median   speedup')
    for v in r['benchmark']:
        print(f'{v["p"]:2} '+''.join(f'{t:9.3f}' for t in v['times'])+f'{v["median"]:9.3f}{v["speedup"]:9.3f}')
    print('files    MiB     mean KiB')
    for v in r['small_files']:
        print(f'{v["files"]:4} {v["total_mib"]:9.3f} {v["mean_kib"]:10.3f}')
else:
    raise ValueError(topic)
