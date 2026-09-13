"""Build, execute and export one combined notebook for practical work 1."""

import asyncio
import json
from pathlib import Path
import subprocess
import sys

import jupytext
import nbformat
from nbclient import NotebookClient
from nbconvert import HTMLExporter

ROOT = Path(__file__).resolve().parents[1]


def main():
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    subprocess.run([sys.executable, str(ROOT / "scripts/download_data.py")], check=True)
    report_dir = ROOT / "reports"
    report_dir.mkdir(exist_ok=True)
    notebook = nbformat.v4.new_notebook()
    notebook.cells = []
    for stem in ("01_FiresRu", "02_BikeSharing"):
        source = jupytext.read(ROOT / "scripts" / f"{stem}.py")
        notebook.cells.extend(source.cells)

    questions = (ROOT / "Контрольные_вопросы.md").read_text(encoding="utf-8")
    notebook.cells.append(nbformat.v4.new_markdown_cell(questions))
    notebook.metadata["kernelspec"] = {
        "display_name": "Python (BD - VS Code)",
        "language": "python",
        "name": "bd-vscode",
    }
    notebook.metadata["language_info"] = {"name": "python"}

    print("Executing combined notebook...", flush=True)
    client = NotebookClient(
        notebook,
        kernel_name="bd-vscode",
        timeout=300,
        resources={"metadata": {"path": str(ROOT)}},
        allow_errors=False,
    )
    client.execute()
    cells = [cell for cell in notebook.cells if cell.cell_type == "code"]
    assert all(cell.execution_count is not None for cell in cells)
    assert not any(out.output_type == "error" for cell in cells for out in cell.outputs)
    image_count = sum("image/png" in out.get("data", {}) for cell in cells for out in cell.outputs)
    assert image_count >= 8, "Missing plots in combined notebook"

    notebook_path = ROOT / "Практика_1.ipynb"
    nbformat.write(notebook, notebook_path)
    exporter = HTMLExporter(template_name="lab")
    exporter.exclude_input_prompt = True
    exporter.exclude_output_prompt = True
    html, _ = exporter.from_notebook_node(notebook)
    (report_dir / "Практика_1.html").write_text(html, encoding="utf-8")
    checks = [{
        "notebook": "Практика_1",
        "source_sections": ["FiresRu", "Bike Sharing", "Контрольные вопросы"],
        "code_cells": len(cells),
        "plots": image_count,
        "errors": 0,
    }]
    (report_dir / "verification.json").write_text(json.dumps(checks, indent=2), encoding="utf-8")
    print(json.dumps(checks, indent=2), flush=True)


if __name__ == "__main__":
    main()
