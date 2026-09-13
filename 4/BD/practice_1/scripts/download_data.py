"""Download the original daily Bike Sharing table and its documentation."""

from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "bike_sharing"
URL = "https://archive.ics.uci.edu/static/public/275/bike+sharing+dataset.zip"


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    if all((DEST / name).exists() for name in ("day.csv", "Readme.txt", "source.json")):
        print("Using the local Bike Sharing snapshot.")
        return
    with urlopen(URL, timeout=60) as response:
        payload = response.read()
    with ZipFile(BytesIO(payload)) as archive:
        for name in ("day.csv", "Readme.txt"):
            (DEST / name).write_bytes(archive.read(name))
    provenance = {
        "title": "Bike Sharing (daily observations)",
        "citation": "Fanaee-T, H. (2013). Bike Sharing [Dataset]. UCI Machine Learning Repository.",
        "doi": "https://doi.org/10.24432/C5W894",
        "source": "https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset",
        "download_url": URL,
        "license": "CC BY 4.0",
        "license_url": "https://creativecommons.org/licenses/by/4.0/",
        "downloaded_utc": datetime.now(timezone.utc).isoformat(),
        "archive_sha256": sha256(payload).hexdigest(),
        "day_csv_sha256": sha256((DEST / "day.csv").read_bytes()).hexdigest(),
        "modifications": "Source files unchanged. Derived exports are stored separately in output/bike_sharing.",
    }
    (DEST / "source.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    print(f"Downloaded {DEST / 'day.csv'}")


if __name__ == "__main__":
    main()
