"""Download the two cited UCI sources and extract the supplied study archives."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import shutil
import urllib.request
import zipfile

ROOT=Path(__file__).resolve().parent
UCI={
    'online_shoppers_intention.csv':'https://archive.ics.uci.edu/static/public/468/online%2Bshoppers%2Bpurchasing%2Bintention%2Bdataset.zip',
    'SeoulBikeData.csv':'https://archive.ics.uci.edu/static/public/560/seoul%2Bbike%2Bsharing%2Bdemand.zip',
}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--downloads',type=Path,help='Directory 5 supplied by the user')
    args=parser.parse_args()
    data=ROOT/'data';data.mkdir(exist_ok=True)
    for name,url in UCI.items():
        if not (data/name).exists():
            with urllib.request.urlopen(url,timeout=60) as response:
                with zipfile.ZipFile(io.BytesIO(response.read())) as archive:
                    (data/name).write_bytes(archive.read(name))
    if args.downloads:
        for archive_name,name in [('Dry_Bean.csv.zip','Dry_Bean.csv'),
                                   ('Podcast Dataset.zip','podcast_dataset.csv')]:
            with zipfile.ZipFile(args.downloads/archive_name) as archive:
                (data/name).write_bytes(archive.read(name))
        shutil.copy2(args.downloads/'calories.csv',data/'calories.csv')
    manifest=json.loads((ROOT/'source_manifest.json').read_text(encoding='utf-8'))
    for name,entry in manifest.items():
        path=data/name
        assert path.exists(),f'Missing input: {path}; use --downloads or copy the supplied CSV'
        assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256'],name
        print(name,path.stat().st_size,'bytes SHA256 OK')


if __name__=='__main__':
    main()
