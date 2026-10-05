"""Collect read-only DOCX/PDF evidence for the ROP, IM and PPOIS review."""
from __future__ import annotations

from collections import Counter
import argparse
import hashlib
import json
from pathlib import Path
import re
from zipfile import ZipFile

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
REPORTS = {
    'ROP': [ROOT / '4/РОП/Практики_1-8/РОП_Практики_1-8_АлбахтинИВ.docx'],
    'IM': [ROOT / '4/ИМ/ИМ_АлбахтинИВ_Отчёт.docx'],
    'PPOIS': sorted((ROOT / '4/ППОИС').glob('ППОИС_*_АлбахтинИВ.docx')),
}
GUIDES = {
    'ROP': sorted((ROOT / '4/РОП').glob('Практическое занятие *.pdf')),
    'IM': [ROOT / '4/ИМ/Информационный_менеджмент_Методические_указания_к_практике.pdf'],
    'PPOIS': sorted((ROOT / '4/ППОИС').glob('Проектирование*.pdf')),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inherited(style, group: str, attribute: str):
    seen = set()
    while style is not None and style.style_id not in seen:
        seen.add(style.style_id)
        value = getattr(getattr(style, group), attribute)
        if value is not None:
            return value
        style = style.base_style
    return None


def points(value):
    return round(value.pt, 2) if value is not None else None


def paragraph_data(paragraph: Paragraph) -> dict:
    fields = ('alignment', 'first_line_indent', 'left_indent', 'right_indent',
              'space_before', 'space_after', 'line_spacing', 'keep_with_next',
              'keep_together', 'page_break_before')
    formatting = {}
    for field in fields:
        value = getattr(paragraph.paragraph_format, field)
        if value is None:
            value = inherited(paragraph.style, 'paragraph_format', field)
        formatting[field] = points(value) if hasattr(value, 'pt') else value
    runs = []
    for run in paragraph.runs:
        if not run.text.strip():
            continue
        font = run.font.name or inherited(run.style, 'font', 'name') or inherited(paragraph.style, 'font', 'name')
        size = run.font.size or inherited(run.style, 'font', 'size') or inherited(paragraph.style, 'font', 'size')
        runs.append({'text': run.text, 'font': font, 'size': points(size),
                     'bold': run.bold if run.bold is not None else inherited(paragraph.style, 'font', 'bold'),
                     'italic': run.italic if run.italic is not None else inherited(paragraph.style, 'font', 'italic')})
    return {'type': 'paragraph', 'text': paragraph.text, 'style': paragraph.style.name,
            'format': formatting, 'runs': runs,
            'drawings': len(paragraph._p.xpath('.//w:drawing'))}


def docx_evidence(path: Path) -> dict:
    document = Document(path)
    body = []
    for block in document.iter_inner_content():
        if isinstance(block, Paragraph):
            body.append(paragraph_data(block))
        elif isinstance(block, Table):
            rows = []
            for row in block.rows:
                cells, seen = [], set()
                for cell in row.cells:
                    if cell._tc in seen:
                        continue
                    seen.add(cell._tc)
                    cells.append([paragraph_data(p) for p in cell.paragraphs])
                rows.append(cells)
            body.append({'type': 'table', 'style': block.style.name, 'rows': rows,
                         'widths_cm': [round(column.width.cm, 3) if column.width else None for column in block.columns],
                         'repeating_headers': [bool(row._tr.xpath('./w:trPr/w:tblHeader')) for row in block.rows]})
    sections = []
    for section in document.sections:
        sections.append({name: round(getattr(section, name).cm, 3) for name in
                         ('page_width', 'page_height', 'left_margin', 'right_margin', 'top_margin', 'bottom_margin')}
                        | {'start_type': int(section.start_type), 'orientation': int(section.orientation),
                           'different_first_page': section.different_first_page_header_footer})
    with ZipFile(path) as archive:
        xml = document.element
        all_text = '\n'.join(''.join(p.xpath('.//w:t/text()')) for p in xml.xpath('//w:p'))
        shading = [s.get(qn('w:fill')) for s in xml.xpath('//w:tcPr/w:shd')
                   if s.get(qn('w:fill'), '').lower() not in ('', 'auto', 'ffffff', 'none')]
        changes = len(xml.xpath('//w:ins | //w:del'))
        media = {name: hashlib.sha256(archive.read(name)).hexdigest() for name in archive.namelist()
                 if name.startswith('word/media/')}
    headings = [b['text'] for b in body if b['type'] == 'paragraph' and
                (re.match(r'(Heading|Заголовок)', b['style']) or re.match(r'Практическ', b['text']))]
    paragraphs = [b for b in body if b['type'] == 'paragraph']
    fonts = Counter((run['font'], run['size']) for p in paragraphs for run in p['runs'])
    return {'file': path.relative_to(ROOT).as_posix(), 'sha256': sha256(path),
            'headings': headings, 'sections': sections, 'body': body, 'media': media,
            'summary': {'paragraphs': len(paragraphs), 'tables': sum(b['type'] == 'table' for b in body),
                        'media': len(media), 'colored_cell_shading': shading, 'tracked_changes': changes,
                        'fonts': [{'font': key[0], 'pt': key[1], 'runs': value} for key, value in fonts.most_common()],
                        'suspicious_text': re.findall(r'.{0,65}(?:Ошибка!|Error!|TODO|FIXME|TBD|ИНБО-01-17|Губарев|Губарёв|\bDRAFT\b).{0,100}', all_text)},
            'all_text': all_text}


def pdf_evidence(path: Path) -> dict:
    reader = PdfReader(path)
    pages = [{'number': number, 'width': float(page.mediabox.width), 'height': float(page.mediabox.height),
              'text': page.extract_text() or ''} for number, page in enumerate(reader.pages, 1)]
    return {'file': path.relative_to(ROOT).as_posix(), 'sha256': sha256(path), 'pages': pages,
            'page_count': len(pages), 'metadata': {str(k): str(v) for k, v in (reader.metadata or {}).items()}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.cache/coursework_audit')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    summary = {}
    for subject in REPORTS:
        target = args.output / subject
        target.mkdir(exist_ok=True)
        summary[subject] = {'reports': [], 'guides': []}
        for path in REPORTS[subject]:
            doc = docx_evidence(path)
            (target / (path.stem + '.docx.json')).write_text(json.dumps(doc, ensure_ascii=False, indent=2), 'utf-8')
            (target / (path.stem + '.docx.txt')).write_text(doc['all_text'], 'utf-8')
            pdf = pdf_evidence(path.with_suffix('.pdf'))
            (target / (path.stem + '.pdf.json')).write_text(json.dumps(pdf, ensure_ascii=False, indent=2), 'utf-8')
            (target / (path.stem + '.pdf.txt')).write_text('\n\n'.join(f"=== Page {p['number']} ===\n{p['text']}" for p in pdf['pages']), 'utf-8')
            summary[subject]['reports'].append({'file': doc['file'], 'pages': pdf['page_count'],
                                                'headings': doc['headings'], **doc['summary']})
        for number, path in enumerate(GUIDES[subject], 1):
            guide = pdf_evidence(path)
            (target / f'guide_{number:02}.txt').write_text('\n\n'.join(f"=== Page {p['number']} ===\n{p['text']}" for p in guide['pages']), 'utf-8')
            summary[subject]['guides'].append({'file': guide['file'], 'pages': guide['page_count'], 'sha256': guide['sha256']})
    (args.output / 'inventory.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
