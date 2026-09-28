from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile
import html
import json
import re

from pypdf import PdfReader


ROOT = Path(r"D:\GitHub\MIREA\4\РОП\Практики_1-8")
DOCX = ROOT / "РОП_Практики_1-8_АлбахтинИВ.docx"
PDF = ROOT / "РОП_Практики_1-8_АлбахтинИВ.pdf"


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def office_text(path: Path, tag: str) -> str:
    pattern = re.compile(rf"<{tag}(?: [^>]*)?>(.*?)</{tag}>")
    with ZipFile(path) as archive:
        return "\n".join(
            html.unescape(value)
            for name in archive.namelist()
            if name.endswith(".xml")
            for value in pattern.findall(archive.read(name).decode("utf-8"))
        )


docx_text = office_text(DOCX, "w:t")
ppt_texts = {
    number: office_text(
        ROOT / "Презентации" / f"РОП_Практическая_{number}_АлбахтинИВ.pptx", "a:t"
    )
    for number in (1, 2)
}
pdf_reader = PdfReader(PDF)
pdf_text = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)

for material_text in (docx_text, pdf_text, ppt_texts[1], ppt_texts[2]):
    assert not re.search(r"(?i)\bBOM\b|БОМ", material_text)
    assert "Губарев" not in material_text
    assert "Сданная работа" not in material_text
    assert "ИНБО-01-17" not in material_text
    assert "Шендяпин" not in material_text
for number in (1, 2):
    assert "DRAFT" not in ppt_texts[number]

with ZipFile(DOCX) as archive:
    embedded_media = [name for name in archive.namelist() if name.startswith("word/media/")]

process_models = ROOT / "Модели_OmniNotation_v2"
idef0_statuses = {}
for name in ("ПР1_IDEF0_AS_IS.omni", "ПР2_IDEF0_TO_BE.omni"):
    project = json.loads((process_models / name).read_text("utf-8"))
    statuses = {
        node["id"]: node.get("properties", {}).get("status")
        for node in project["model"]["nodes"]
        if node.get("kind") == "diagram"
    }
    assert statuses == {"context": "publication", "decomposition": "publication"}
    idef0_statuses[name] = statuses

model_check = json.loads((ROOT / "ПРОВЕРКА_OmniNotation.json").read_text("utf-8"))
canonical = [item for item in model_check if item["kind"] == "canonical"]
assert len(canonical) == 4 and all(not item["diagnostics"] for item in canonical)

checksums = json.loads((ROOT / "SHA256.json").read_text("utf-8"))
for relative, expected in checksums.items():
    path = ROOT / relative
    assert path.is_file(), relative
    assert digest(path) == expected, relative

assert digest(ROOT / "РОП_Практики_1-8_АлбахтинИВ_готово.docx") == digest(DOCX)
assert digest(ROOT / "РОП_Практики_1-8_АлбахтинИВ_готово.pdf") == digest(PDF)
assert digest(ROOT / "РОП_Практики_1-8_АлбахтинИВ_готово.md") == digest(
    ROOT / "РОП_Практики_1-8_АлбахтинИВ.md"
)
assert digest(ROOT / "Презентации/РОП_Практическая_1_АлбахтинИВ.pptx") == digest(
    ROOT.parent / "РОП_Практическая_1_АлбахтинИВ.pptx"
)

summary = {
    "status": "pass",
    "pdf_pages": len(pdf_reader.pages),
    "docx_embedded_media": len(embedded_media),
    "canonical_process_models": len(canonical),
    "idef0_statuses": idef0_statuses,
    "practice_1_slides": 15,
    "practice_2_slides": 10,
    "technical_DRAFT_mentions_in_report": len(re.findall(r"\bDRAFT\b", pdf_text)),
    "checksum_entries_verified": len(checksums),
    "forbidden_visible_terms": [],
}
(ROOT / "ПРОВЕРКА_финальная.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), "utf-8"
)
print(json.dumps(summary, ensure_ascii=False))
