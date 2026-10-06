"""Prepare reproducible, local-only sources for practical works 3 and 4.

Use the supplied ecommerce.sqlite when available. Otherwise --olist-csv builds
an explicitly labelled reconstruction, without modifying the source CSV files.
No customer addresses, company names or vehicle registrations are exported
from the KOMUS archive.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sqlite3
import zipfile
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path('.'))
parser.add_argument('--database', type=Path)
parser.add_argument('--olist-csv', type=Path)
parser.add_argument('--komus', type=Path, required=True)
args = parser.parse_args()
root = args.root.resolve()
data = root / 'data'
data.mkdir(parents=True, exist_ok=True)
db = data / 'ecommerce.sqlite'
manifest = {'source_mode': 'supplied_sqlite' if args.database else 'reconstructed_from_practice2_olist_csv', 'tables': {}}
if args.database:
    import shutil
    if args.database.resolve() != db:
        shutil.copy2(args.database, db)
else:
    if not args.olist_csv:
        parser.error('Provide --database or --olist-csv')
    # The two additions were made in practical work 2, not in the original
    # 71-row translation reference. Remove only those exact added keys.
    added_keys = {'pc_gamer', 'portateis_cozinha_e_preparadores_de_alimentos'}
    with sqlite3.connect(db) as conn:
        for source in sorted(args.olist_csv.glob('*.csv')):
            first = True
            for chunk in pd.read_csv(source, dtype=str, chunksize=50000):
                if source.stem == 'product_category_name_translation':
                    chunk = chunk[~chunk.product_category_name.isin(added_keys)]
                chunk.to_sql(source.stem, conn, if_exists='replace' if first else 'append', index=False)
                first = False
staging = data / 'spark_input'
staging.mkdir(exist_ok=True)
with sqlite3.connect(db) as conn:
    tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
    for name in tables:
        n = 0
        for i, chunk in enumerate(pd.read_sql_query(f'SELECT * FROM "{name}"', conn, chunksize=100000)):
            chunk.to_csv(staging / f'{name}.csv', index=False, encoding='utf-8', mode='w' if i == 0 else 'a', header=i == 0)
            n += len(chunk)
        manifest['tables'][name] = n
        print(name, n, flush=True)
own = data / 'komus'
own.mkdir(exist_ok=True)
with zipfile.ZipFile(args.komus) as archive:
    # Some supplied ZIP files have legacy filename encodings without the UTF-8
    # flag. Identify tables by their actual UTF-8 column header, not by a
    # platform-dependent decoded filename.
    members = {}
    for info in archive.infolist():
        if info.is_dir():
            continue
        with archive.open(info) as stream:
            header = stream.readline().decode('utf-8-sig').strip()
        if header.startswith('Себестоимость\tДата покупки\t'):
            members['sales'] = info
        elif header.startswith('Product_Key\tНазвание товара\t'):
            members['products'] = info
    assert set(members) == {'sales', 'products'}, 'Source headers do not match KOMUS tables'
    sale_map = {'Себестоимость': 'cost', 'Дата покупки': 'purchase_date', 'Номер чека': 'receipt_id', 'Product_key': 'product_key', 'Филиал': 'branch', 'Количество': 'quantity', 'Сумма покупки': 'amount', 'Сумма скидки': 'discount'}
    total = 0
    with archive.open(members['sales']) as stream:
        for i, chunk in enumerate(pd.read_csv(stream, sep='\t', encoding='utf-8-sig', dtype=str, usecols=list(sale_map), chunksize=50000)):
            chunk.rename(columns=sale_map)[list(sale_map.values())].to_csv(own / 'sales.csv', index=False, mode='w' if i == 0 else 'a', header=i == 0)
            total += len(chunk)
    product_map = {'Product_Key': 'product_key', 'Название товара': 'product_name', 'Название бренда': 'brand', 'Группа товара': 'product_group'}
    with archive.open(members['products']) as stream:
        products = pd.read_csv(stream, sep='\t', encoding='utf-8-sig', dtype=str).rename(columns=product_map)
        products.to_csv(own / 'products.csv', index=False)
    manifest['komus'] = {'sales': total, 'products': len(products), 'retained_sale_fields': list(sale_map.values()), 'excluded': ['Client_ID', 'Машина доставки', 'Адрес', 'Клиенты.csv', 'Суммы чеков.csv'], 'source': args.komus.name, 'archive_sha256': hashlib.file_digest(args.komus.open('rb'), 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else hashlib.sha256(args.komus.read_bytes()).hexdigest()}
manifest['database_sha256'] = hashlib.sha256(db.read_bytes()).hexdigest()
(root / 'source_manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(manifest, ensure_ascii=False, indent=2))
