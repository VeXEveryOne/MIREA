"""Render an already Word-exported PDF using the installed document tools."""
import argparse
import importlib.util
import os
import shutil
import sys
from pathlib import Path

from config import REPO_ROOT


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('docx', type=Path)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('dpi', type=int, nargs='?', default=130)
    args = parser.parse_args()
    for path in (args.docx, args.pdf):
        if not path.is_file():
            parser.error(f'Missing input: {path}')
    if args.dpi <= 0:
        parser.error('DPI must be positive')

    runtime_spec = importlib.util.spec_from_file_location('repository_runtime', REPO_ROOT / 'tools/runtime.py')
    runtime = importlib.util.module_from_spec(runtime_spec)
    runtime_spec.loader.exec_module(runtime)
    os.environ['PATH'] = str(runtime.RUNTIME_ROOT / 'native/poppler/bin') + os.pathsep + os.environ.get('PATH', '')
    source = runtime.skill_directory('documents') / 'render_docx.py'
    spec = importlib.util.spec_from_file_location('packaged_render_docx', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    def convert(doc_path, user_profile, convert_tmp_dir, stem, verbose):
        destination = Path(convert_tmp_dir) / (stem + '.pdf')
        shutil.copy2(args.pdf.resolve(), destination)
        return str(destination), 'PDF exported by Microsoft Word; bundled Poppler rasterization'

    module.convert_to_pdf = convert
    previous_args = sys.argv
    try:
        sys.argv = [str(source), str(args.docx.resolve()), '--output_dir', str(args.output.resolve()), '--dpi', str(args.dpi)]
        module.main()
    finally:
        sys.argv = previous_args


if __name__ == '__main__':
    main()

