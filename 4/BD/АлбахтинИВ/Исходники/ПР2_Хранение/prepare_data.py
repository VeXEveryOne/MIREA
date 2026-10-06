"""Stage the eleven provided Olist CSVs without changing their contents."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

TABLES = {
    'customers': 'olist_customers_dataset.csv',
    'geolocation': 'olist_geolocation_dataset.csv',
    'order_items': 'olist_order_items_dataset.csv',
    'order_payments': 'olist_order_payments_dataset.csv',
    'order_reviews': 'olist_order_reviews_dataset.csv',
    'orders': 'olist_orders_dataset.csv',
    'products': 'olist_products_dataset.csv',
    'sellers': 'olist_sellers_dataset.csv',
    'product_category_name_translation': 'product_category_name_translation.csv',
    'leads_closed': 'olist_closed_deals_dataset.csv',
    'leads_qualified': 'olist_marketing_qualified_leads_dataset.csv',
}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'data')
    args = parser.parse_args()
    selected = {}
    for table, filename in TABLES.items():
        candidates = [args.source / filename, args.source / (table + '.csv')]
        source = next((p for p in candidates if p.is_file()), None)
        if source is None: raise FileNotFoundError(f'{table}: expected {filename} or {table}.csv')
        selected[table] = source
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for table, source in selected.items():
        target = args.output / (table + '.csv')
        if source.resolve() != target.resolve(): shutil.copy2(source, target)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        assert hashlib.sha256(target.read_bytes()).hexdigest() == digest
        manifest[table] = {'file': target.name, 'sha256': digest}
    (args.output / 'source_manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print('11 CSV files staged and verified')
