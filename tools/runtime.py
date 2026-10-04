"""Locate externally installed document tools without pinning a user or version."""
from pathlib import Path
import os
import re


RUNTIME_ROOT = Path(os.environ.get('CODEX_RUNTIME_ROOT',
    str(Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies')))
SKILLS_ROOT = Path(os.environ.get('CODEX_SKILLS_ROOT',
    str(Path.home() / '.codex/plugins/cache/openai-primary-runtime')))


def skill_directory(name: str) -> Path:
    base = SKILLS_ROOT / name
    versions = sorted((p for p in base.iterdir() if p.is_dir()),
                      key=lambda p: tuple(int(n) for n in re.findall(r'\d+', p.name)),
                      reverse=True)
    for version in versions:
        directory = version / 'skills' / name
        if directory.is_dir():
            return directory
    raise FileNotFoundError(f'No installed {name} tool package in {base}')
