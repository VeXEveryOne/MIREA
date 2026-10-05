"""Compatibility entry point for the shared Word PDF rasteriser."""
import sys
from config import REPO_ROOT

sys.path.insert(0,str(REPO_ROOT/'tools'))
from render_coursework import main

if __name__ == '__main__':
    args=sys.argv[1:]
    if len(args)==4:args=args[:3]+['--dpi',args[3]]
    elif len(args)==3:args+=['--dpi','130']
    main(args)
