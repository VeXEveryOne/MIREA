"""Shared, checkout-relative paths for the ROP build scripts."""
from pathlib import Path
import os

SOURCE_ROOT = Path(__file__).resolve().parent.parent
ROOT = Path(os.environ.get('ROP_ROOT', str(SOURCE_ROOT))).resolve()
REPO_ROOT = SOURCE_ROOT.parents[2]
MODEL_DIR = ROOT / 'Модели'
EXPORT_DIR = ROOT / 'Экспорт' / 'PNG'
BUILD_DIR = REPO_ROOT / '.cache' / 'rop'
REPORT_NAME = 'РОП_Практики_1-8_АлбахтинИВ'
TITLE_TEMPLATE = REPO_ROOT / '4' / 'ИСУРО' / 'ИСУРО_1_АлбахтинИВ.docx'
