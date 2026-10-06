#!/usr/bin/env bash
set -euo pipefail
test "$(hostname)" = tiabd-albakhtin-iv
test "$(whoami)" = albakhtin
cd /home/albakhtin/tiabd
if ! test -f jupyter.env; then
  .venv/bin/python - <<'PY'
from pathlib import Path
import secrets
p = Path('jupyter.env')
p.write_text('TIABD_JUPYTER_TOKEN=' + secrets.token_urlsafe(32) + '\n')
p.chmod(0o600)
PY
fi
sudo install -m 644 tiabd-jupyter.service /etc/systemd/system/tiabd-jupyter.service
sudo systemctl daemon-reload
sudo systemctl enable --now tiabd-jupyter.service
sudo systemctl is-active tiabd-jupyter.service

