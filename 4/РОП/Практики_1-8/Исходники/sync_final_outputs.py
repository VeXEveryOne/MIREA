"""Refresh the figure registry and checksums without creating duplicate files."""
from hashlib import sha256
from datetime import date
from pathlib import Path
import json
from PIL import Image

from config import ROOT, EXPORT_DIR, MODEL_DIR


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def update_registry() -> None:
    registry_path = MODEL_DIR / 'Реестр_38_рисунков.json'
    registry = json.loads(registry_path.read_text('utf-8'))
    report_path = EXPORT_DIR / 'Отчёт_экспорта.json'
    report = json.loads(report_path.read_text('utf-8'))
    exported = {item['order']: item for item in report['items']}
    all_files = []
    sequence_audit = MODEL_DIR / 'ПРОВЕРКА_последовательностей_печать.json'
    sequence_parts = {sheet['sheet']: [ROOT / part['file'] for part in sheet['parts']]
                      for sheet in json.loads(sequence_audit.read_text('utf-8'))} if sequence_audit.exists() else {}
    for figure in registry['figures']:
        item = exported[figure['figure']]
        matches = [p for p in EXPORT_DIR.glob(f"{figure['figure']:02}_*.png") if '_часть' not in p.stem]
        if len(matches) != 1:
            raise RuntimeError(f"Expected one PNG for figure {figure['figure']}")
        png = matches[0]
        relative_png = png.relative_to(ROOT).as_posix()
        item['files'] = [relative_png]
        figure['title'] = item['title']
        figure['export'] = {'png': {'file': relative_png, 'sha256': file_hash(png)}, 'warnings': []}
        parts=sequence_parts.get(figure['diagramId'], sorted(EXPORT_DIR.glob(png.stem+'_часть*.png')))
        if parts:
            figure['export']['png']['parts']=[{'file':p.relative_to(ROOT).as_posix(),'sha256':file_hash(p)} for p in parts]
            item['files'] += [p.relative_to(ROOT).as_posix() for p in parts]
        for path in [png, *parts]:
            with Image.open(path) as image:
                width, height = image.size
            all_files.append({'path': path.relative_to(ROOT).as_posix(), 'sha256': file_hash(path),
                              'width': width, 'height': height})
        model = ROOT / figure['file']
        if not model.is_file():
            raise FileNotFoundError(model)
        figure['file'] = model.relative_to(ROOT).as_posix()
        figure['sha256'] = file_hash(model)
        figure['modelSha256'] = figure['sha256']
        figure.pop('source', None)
        figure.pop('report', None)  # obsolete migration receipts are archived, not current inputs
    registry['count'] = len(registry['figures'])
    report['files'] = all_files
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    registry['exportReports'] = {'png': {'file': report_path.relative_to(ROOT).as_posix(),
                                       'sha256': file_hash(report_path)}}
    registry.pop('pdfHashes', None)
    registry['reviewedAt'] = date.today().isoformat()
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
