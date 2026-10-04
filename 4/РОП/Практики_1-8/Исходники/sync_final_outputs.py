"""Refresh the figure registry and checksums without creating duplicate files."""
from hashlib import sha256
from pathlib import Path
import json

from config import ROOT, EXPORT_DIR, MODEL_DIR


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def update_registry() -> None:
    registry_path = MODEL_DIR / 'Реестр_38_рисунков.json'
    registry = json.loads(registry_path.read_text('utf-8'))
    report_path = EXPORT_DIR / 'Отчёт_экспорта.json'
    report = json.loads(report_path.read_text('utf-8'))
    exported = {item['order']: item for item in report['items']}
    png_paths = {}
    for figure in registry['figures']:
        item = exported[figure['figure']]
        matches = list(EXPORT_DIR.glob(f"{figure['figure']:02}_*.png"))
        if len(matches) != 1:
            raise RuntimeError(f"Expected one PNG for figure {figure['figure']}")
        png = matches[0]
        relative_png = png.relative_to(ROOT).as_posix()
        png_paths[png.name] = relative_png
        item['files'] = [relative_png]
        figure['title'] = item['title']
        figure['export'] = {'png': {'file': relative_png, 'sha256': file_hash(png)}, 'warnings': []}
        model = ROOT / figure['file']
        if not model.is_file():
            raise FileNotFoundError(model)
        figure['file'] = model.relative_to(ROOT).as_posix()
        figure['sha256'] = file_hash(model)
        figure['modelSha256'] = figure['sha256']
        figure.pop('source', None)
        figure.pop('report', None)  # obsolete migration receipts are archived, not current inputs
    registry['count'] = len(registry['figures'])
    for item in report['files']:
        item['path'] = png_paths[Path(item['path']).name]
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    registry['exportReports'] = {'png': {'file': report_path.relative_to(ROOT).as_posix(),
                                       'sha256': file_hash(report_path)}}
    registry.pop('pdfHashes', None)
    registry['reviewedAt'] = '2026-10-04'
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', 'utf-8')


def update_checksums() -> None:
    # Audit receipts are deliberately excluded: an audit cannot hash its own output.
    files = sorted(path for path in ROOT.rglob('*') if path.is_file()
                   and path.name != 'SHA256.json'
                   and not path.name.startswith(('ПРОВЕРКА', '~$'))
                   and '__pycache__' not in path.parts
                   and path.suffix != '.pyc')
    manifest = {path.relative_to(ROOT).as_posix(): file_hash(path) for path in files}
    (ROOT / 'SHA256.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')


if __name__ == '__main__':
    update_registry()
    update_checksums()
    print('Обновлены реестр 38 рисунков и контрольные суммы единого комплекта.')
