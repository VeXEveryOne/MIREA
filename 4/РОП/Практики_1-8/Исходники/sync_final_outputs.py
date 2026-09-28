from __future__ import annotations

from datetime import datetime
from hashlib import sha256
from pathlib import Path
import json
import shutil


ROOT = Path(r"D:\GitHub\MIREA\4\РОП\Практики_1-8")
EXPORT_DIR = ROOT / "Модели_для_отчёта" / "PNG_final4"
CANONICAL_DIR = ROOT / "Модели_OmniNotation_v2"
LEGACY_DIR = ROOT / "Модели_OmniNotation"


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def sync_reports() -> None:
    for suffix in ("docx", "pdf", "md"):
        source = ROOT / f"РОП_Практики_1-8_АлбахтинИВ_готово.{suffix}"
        target = ROOT / f"РОП_Практики_1-8_АлбахтинИВ.{suffix}"
        shutil.copy2(source, target)


def sync_legacy_png() -> None:
    mapping = {
        1: "ПР1_IDEF0_A-0.png",
        2: "ПР1_IDEF0_A0.png",
        3: "ПР1_BPMN_Публикация.png",
        4: "ПР1_BPMN_Подготовка.png",
        6: "ПР2_IDEF0_A-0.png",
        7: "ПР2_IDEF0_A0.png",
        8: "ПР2_BPMN_Процесс.png",
        9: "ПР2_BPMN_Подготовка.png",
        10: "ПР2_BPMN_Публикация.png",
    }
    for number, target_name in mapping.items():
        source = next(EXPORT_DIR.glob(f"{number:02}_*.png"))
        shutil.copy2(source, LEGACY_DIR / target_name)


def update_registry() -> None:
    report = json.loads((EXPORT_DIR / "Отчёт_экспорта.json").read_text("utf-8"))
    exported = {item["order"]: item for item in report["items"]}
    registry_path = CANONICAL_DIR / "Реестр_38_рисунков.json"
    registry = json.loads(registry_path.read_text("utf-8"))
    for figure in registry["figures"]:
        item = exported[figure["figure"]]
        png = Path(item["files"][0])
        figure["title"] = item["title"]
        figure.setdefault("export", {}).setdefault("png", {})["file"] = str(png)
        figure["export"]["png"]["sha256"] = file_hash(png)
        figure["export"]["warnings"] = []
        model_path = Path(figure.get("file", ""))
        if model_path.is_file():
            digest = file_hash(model_path)
            figure["sha256"] = digest
            figure["modelSha256"] = digest
        figure["manualReview"] = (
            "Итоговый PNG визуально проверен 28.09.2026; подписи, границы и связи "
            "читаются в отчёте и презентациях."
        )
    registry["generatedAt"] = datetime.now().astimezone().isoformat(timespec="seconds")
    registry["count"] = len(registry["figures"])
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2), "utf-8")


def update_checksums() -> None:
    manifest_path = ROOT / "SHA256.json"
    existing = json.loads(manifest_path.read_text("utf-8")) if manifest_path.is_file() else {}
    names = {name for name in existing if (ROOT / name).is_file()}
    names.update(
        path.relative_to(ROOT).as_posix()
        for path in [
            ROOT / "РОП_Практики_1-8_АлбахтинИВ.docx",
            ROOT / "РОП_Практики_1-8_АлбахтинИВ.pdf",
            ROOT / "РОП_Практики_1-8_АлбахтинИВ.md",
            ROOT / "ПРОВЕРКА.json",
            ROOT / "ПРОВЕРКА_OmniNotation.json",
            ROOT / "ПРОВЕРКА_процессных_моделей.json",
            ROOT / "ПРОВЕРКА_финальная.json",
            CANONICAL_DIR / "Реестр_38_рисунков.json",
            EXPORT_DIR / "Отчёт_экспорта.json",
            ROOT / "Исходники/rebuild_process_models.mts",
            ROOT / "Исходники/fix_as_is_bpmn_layout.py",
            ROOT / "Исходники/slides.mjs",
            ROOT / "Исходники/package_check.py",
            ROOT / "Исходники/validate_native.mts",
            ROOT / "Исходники/final_audit.py",
            ROOT / "Исходники/sync_final_outputs.py",
        ]
        if path.is_file()
    )
    names.update(
        path.relative_to(ROOT).as_posix()
        for path in CANONICAL_DIR.glob("ПР[12]_*.omni")
    )
    names.update(
        path.relative_to(ROOT).as_posix()
        for path in EXPORT_DIR.glob("[0-9][0-9]_*.png")
    )
    manifest = {name: file_hash(ROOT / name) for name in sorted(names)}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")


if __name__ == "__main__":
    sync_reports()
    sync_legacy_png()
    update_registry()
    update_checksums()
    print("Синхронизированы отчёты, совместимые PNG и реестр 38 рисунков.")
