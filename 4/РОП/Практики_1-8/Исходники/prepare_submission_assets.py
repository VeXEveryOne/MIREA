from __future__ import annotations

import json
import re
import shutil
from pathlib import Path


ROOT = Path(r"D:\GitHub\MIREA\4\РОП\Практики_1-8")
SOURCE = ROOT / "Модели_OmniNotation_v2"
TARGET = ROOT / "Модели_для_отчёта"


PHRASES = [
    ("Схема кодирования BOM", "Схема кодирования модельного ряда"),
    ("Формат кода BOM", "Формат кода модельного ряда"),
    ("Редактор версии BOM", "Редактор версии модельного ряда"),
    ("Редактор BOM", "Редактор модельного ряда"),
    ("Версионируемая BOM", "Версионируемый модельный ряд"),
    ("версионируемая BOM", "версионируемый модельный ряд"),
    ("проверенная BOM", "проверенный модельный ряд"),
    ("Проверенная BOM", "Проверенный модельный ряд"),
    ("BOM проверена", "Модельный ряд проверен"),
    ("исходную BOM", "исходный модельный ряд"),
    ("Исходную BOM", "Исходный модельный ряд"),
    ("следующая BOM", "следующий модельный ряд"),
    ("Следующая BOM", "Следующий модельный ряд"),
    ("каждой BOM", "каждого модельного ряда"),
    ("этой BOM", "этого модельного ряда"),
    ("Пустая BOM", "Пустой модельный ряд"),
    ("пустая BOM", "пустой модельный ряд"),
    ("версией BOM", "версией модельного ряда"),
    ("версии BOM", "версии модельного ряда"),
    ("версию BOM", "версию модельного ряда"),
    ("версия BOM", "версия модельного ряда"),
    ("Версия BOM", "Версия модельного ряда"),
    ("слоты BOM", "слоты модельного ряда"),
    ("слот BOM", "слот модельного ряда"),
    ("Слот BOM", "Слот модельного ряда"),
    ("списка BOM", "списка модельных рядов"),
    ("список BOM", "список модельных рядов"),
    ("активные BOM", "активные модельные ряды"),
    ("затронутых BOM", "затронутых модельных рядов"),
    ("результаты по BOM", "результаты по модельным рядам"),
    ("для BOM", "для модельного ряда"),
    ("из BOM", "из модельного ряда"),
    ("в BOM", "в модельном ряду"),
    ("по BOM", "по модельному ряду"),
    ("BOM и правила", "Модельный ряд и правила"),
    ("BOM и версия", "Модельный ряд и версия"),
    ("BOM, выбранные", "Модельный ряд, выбранные"),
    ("BOM;", "Модельный ряд;"),
    ("BOM-", "MR-"),
    ("BOM", "модельный ряд"),
    ("БОМ", "модельный ряд"),
]


def replace_technical(value: str) -> str:
    value = value.replace("bom_version_id", "model_line_version_id")
    value = value.replace("bom_slot", "model_line_slot")
    value = value.replace("bom_version", "model_line_version")
    value = value.replace("bom_id", "model_line_id")
    value = value.replace("ix_bom_case", "ix_model_line_case")
    value = re.sub(r"\bbom\b", "model_line", value)
    value = re.sub(r"\bBOM\b", "ModelLine", value)
    return value


def replace_visible(value: str) -> str:
    value = value.replace("bom_", "model_line_")
    value = value.replace("bom_version_id", "model_line_version_id")
    value = value.replace("bom_slot", "model_line_slot")
    value = value.replace("bom_version", "model_line_version")
    value = value.replace("bom_id", "model_line_id")
    value = value.replace("ix_bom_case", "ix_model_line_case")
    value = re.sub(r"\bbom\b", "model_line", value)
    for old, new in PHRASES:
        value = value.replace(old, new)
    return value


def replace_source(value: str) -> str:
    # Text inside DSL quotes is visible; identifiers outside quotes must remain
    # valid and match the corresponding model IDs.
    parts = re.split(r'("(?:\\.|[^"\\])*")', value)
    for index, part in enumerate(parts):
        if not part:
            continue
        if part.startswith('"'):
            parts[index] = '"' + replace_visible(part[1:-1]) + '"'
        else:
            parts[index] = replace_technical(part)
    return ''.join(parts)


IDENTIFIER_KEYS = {
    "id", "ref", "from", "to", "owner", "attribute", "element",
    "container", "diagramId", "source", "draft",
}


def transform(value, key: str | None = None):
    if isinstance(value, dict):
        return {replace_technical(k): transform(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [transform(v, key) for v in value]
    if isinstance(value, str):
        if key in {"source", "draft"}:
            return replace_source(value)
        if key in IDENTIFIER_KEYS:
            return replace_technical(value)
        if key == "literal" and value == "BOM":
            return "MR"
        return replace_visible(value)
    return value


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    (TARGET / "PNG").mkdir(exist_ok=True)
    manifest = json.loads((SOURCE / "Экспорт_PNG.json").read_text(encoding="utf-8"))
    manifest["output"] = "PNG"
    manifest["options"]["scale"] = 1.5

    copied: set[str] = set()
    for job in manifest["jobs"]:
        name = job["file"]
        if name not in copied:
            data = json.loads((SOURCE / name).read_text(encoding="utf-8"))
            data = transform(data)
            (TARGET / name).write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            copied.add(name)
        job["title"] = replace_visible(job["title"])

    (TARGET / "Экспорт_PNG.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Prepared {len(copied)} models and {len(manifest['jobs'])} export jobs in {TARGET}")


if __name__ == "__main__":
    main()
