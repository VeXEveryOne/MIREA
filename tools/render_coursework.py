"""Rasterise a Word-exported PDF with the installed document skill renderer.

The DOCX and PDF must be the same field-updated build. This adapter avoids a
second conversion (or an unavailable LibreOffice installation on Windows).
"""
import argparse
import importlib.util
from pathlib import Path
import sys
from runtime import skill_directory

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('docx',type=Path);p.add_argument('pdf',type=Path)
    p.add_argument('output',type=Path);p.add_argument('--dpi',type=int,default=110)
    args=p.parse_args(argv)
    if args.dpi<=0:p.error('DPI must be positive')
    for f in [args.docx,args.pdf]:
        if not f.is_file():raise FileNotFoundError(f)
    package=skill_directory('documents')
    spec=importlib.util.spec_from_file_location('coursework_renderer',package/'render_docx.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    def reuse_pdf(*_,**__):return str(args.pdf.resolve()),'Reused the field-updated Word PDF.'
    module.convert_to_pdf=reuse_pdf
    previous=sys.argv
    try:
        sys.argv=['render_docx.py',str(args.docx.resolve()),'--output_dir',str(args.output.resolve()),'--dpi',str(args.dpi)]
        module.main()
    finally:sys.argv=previous

if __name__=='__main__':main()
