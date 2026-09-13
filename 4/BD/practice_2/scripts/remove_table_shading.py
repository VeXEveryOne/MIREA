"""Remove direct cell shading from DOCX tables while preserving borders and text."""

from __future__ import annotations

import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn


def remove_table_shading(path: Path) -> int:
    document = Document(path)
    removed = 0
    seen = set()
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                table_cell = cell._tc
                if table_cell in seen:
                    continue
                seen.add(table_cell)
                properties = table_cell.get_or_add_tcPr()
                for shading in list(properties.findall(qn("w:shd"))):
                    properties.remove(shading)
                    removed += 1
    document.save(path)
    return removed


if __name__ == "__main__":
    for argument in sys.argv[1:]:
        target = Path(argument).resolve()
        print(f"{target}: removed {remove_table_shading(target)} shading nodes")
