import re
import subprocess
from pathlib import Path

import fitz
from pypdf import PdfReader


ROOT = Path(r"D:\Ilya\MIREA\3\ТКБП\Материалы")
OUT = ROOT / "OCR"
TESSERACT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
TESSDATA = Path(r"C:\Users\vexev\.codex\ocr_tkbp\tessdata")
WORK = Path(r"C:\Users\vexev\.codex\ocr_tkbp\work")


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception:
            pass
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def usable_text(text: str) -> bool:
    cyr = sum("а" <= ch.lower() <= "я" or ch.lower() == "ё" for ch in text)
    words = re.findall(r"[а-яА-ЯёЁA-Za-z0-9]{3,}", text)
    return cyr > 250 and len(words) > 80


def ocr_pdf(pdf_path: Path, dpi: int = 220) -> str:
    WORK.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    parts: list[str] = []
    for index, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        image_path = WORK / f"page_{index:04d}.png"
        txt_base = WORK / f"page_{index:04d}"
        txt_path = txt_base.with_suffix(".txt")
        pix.save(image_path)
        cmd = [
            str(TESSERACT),
            str(image_path),
            str(txt_base),
            "-l",
            "rus+eng",
            "--tessdata-dir",
            str(TESSDATA),
            "--psm",
            "6",
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        text = txt_path.read_text(encoding="utf-8", errors="replace")
        parts.append(f"\n\n--- PAGE {index} ---\n{text.strip()}")
    return "\n".join(parts).strip() + "\n"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for pdf_path in sorted(ROOT.glob("*.pdf"), key=lambda p: p.name):
        out_path = OUT / f"{pdf_path.stem}.txt"
        try:
            text = extract_pdf_text(pdf_path)
            method = "embedded"
            if not usable_text(text):
                text = ocr_pdf(pdf_path)
                method = "ocr"
            out_path.write_text(text, encoding="utf-8")
            print(f"{method:8} {pdf_path.name} -> {out_path.name}")
        except Exception as exc:
            print(f"ERROR    {pdf_path.name}: {exc}")


if __name__ == "__main__":
    main()
