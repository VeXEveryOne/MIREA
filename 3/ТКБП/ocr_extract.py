import argparse
import subprocess
from pathlib import Path

import fitz


TESSERACT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
TESSDATA = Path(r"C:\Users\vexev\.codex\ocr_tkbp\tessdata")
WORK = Path(r"C:\Users\vexev\.codex\ocr_tkbp\work")


def run_ocr(pdf_path: Path, out_path: Path, dpi: int, pages_limit: int | None) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    page_count = len(doc) if pages_limit is None else min(len(doc), pages_limit)
    parts: list[str] = []

    for index in range(page_count):
        page = doc[index]
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        image_path = WORK / f"page_{index + 1:04d}.png"
        txt_base = WORK / f"page_{index + 1:04d}"
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
        text = fix_windows_tesseract_mojibake(text)
        parts.append(f"\n\n--- PAGE {index + 1} ---\n{text.strip()}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(parts).strip() + "\n", encoding="utf-8")


def fix_windows_tesseract_mojibake(text: str) -> str:
    # Some Windows builds write UTF-8 bytes through the active Cyrillic codepage,
    # producing strings like "РРЅ..." instead of "Ин...".
    if "Р" not in text and "С" not in text:
        return text
    try:
        repaired = text.encode("cp1251", errors="strict").decode("utf-8", errors="strict")
    except UnicodeError:
        return text
    return repaired if count_cyrillic(repaired) > count_cyrillic(text) else text


def count_cyrillic(text: str) -> int:
    return sum("а" <= ch.lower() <= "я" or ch.lower() == "ё" for ch in text)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf")
    parser.add_argument("out")
    parser.add_argument("--dpi", type=int, default=220)
    parser.add_argument("--pages", type=int, default=None)
    args = parser.parse_args()
    run_ocr(Path(args.pdf), Path(args.out), args.dpi, args.pages)


if __name__ == "__main__":
    main()
