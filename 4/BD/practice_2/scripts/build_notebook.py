"""Build and execute the practical work 2 notebook with detailed answers."""

from __future__ import annotations

import asyncio
from pathlib import Path

import jupytext
import nbformat
from nbclient import NotebookClient
from nbconvert import HTMLExporter


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    if __import__("sys").platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    notebook = jupytext.read(ROOT / "scripts" / "03_Visualization.py")
    questions = (ROOT / "Контрольные вопросы.md").read_text(encoding="utf-8")
    notebook.cells.append(nbformat.v4.new_markdown_cell(questions))
    notebook.metadata["kernelspec"] = {
        "display_name": "Python (BD - VS Code)",
        "language": "python",
        "name": "bd-vscode",
    }
    notebook.metadata["language_info"] = {"name": "python"}

    client = NotebookClient(
        notebook,
        kernel_name="bd-vscode",
        timeout=1200,
        resources={"metadata": {"path": str(ROOT)}},
        allow_errors=False,
    )
    client.execute()

    code_cells = [cell for cell in notebook.cells if cell.cell_type == "code"]
    assert all(cell.execution_count is not None for cell in code_cells)
    assert not any(
        output.output_type == "error"
        for cell in code_cells
        for output in cell.outputs
    )

    notebook_path = ROOT / "03_Visualization.ipynb"
    nbformat.write(notebook, notebook_path)

    report_dir = ROOT / "reports"
    report_dir.mkdir(exist_ok=True)
    exporter = HTMLExporter(template_name="lab")
    exporter.exclude_input_prompt = True
    exporter.exclude_output_prompt = True
    html, _ = exporter.from_notebook_node(notebook)
    (report_dir / "03_Visualization.html").write_text(html, encoding="utf-8")

    print(
        f"{notebook_path}: {len(code_cells)} code cells, "
        f"{len(notebook.cells)} total cells, 0 errors"
    )


if __name__ == "__main__":
    main()
