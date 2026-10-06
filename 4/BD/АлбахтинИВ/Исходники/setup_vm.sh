#!/usr/bin/env bash
set -euo pipefail
# Run only inside the dedicated TIABD-Albakhtin-IV Ubuntu guest.
test "$(hostname)" = tiabd-albakhtin-iv
sudo -n sed -i 's|http://|https://|g' /etc/apt/sources.list
sudo -n sed -i -E 's|https://[a-z]{2}\.archive\.ubuntu\.com|https://archive.ubuntu.com|g' /etc/apt/sources.list
printf 'Acquire::ForceIPv4 "true";\nAcquire::http::Timeout "20";\nAcquire::https::Timeout "20";\nAcquire::Retries "1";\n' | sudo -n tee /etc/apt/apt.conf.d/99tiabd-network >/dev/null
sudo -n apt-get update
sudo -n DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg openjdk-17-jdk-headless python3-venv python3-pip postgresql-client jq
curl -fsSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/tiabd-google-chrome.deb
sudo -n DEBIAN_FRONTEND=noninteractive apt-get install -y /tmp/tiabd-google-chrome.deb
sudo -n install -m 0755 -d /etc/apt/keyrings
sudo -n curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo -n chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu jammy stable" | sudo -n tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo -n apt-get update
sudo -n DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo -n systemctl enable --now docker
sudo -n usermod -aG docker albakhtin
python3 -m venv /home/albakhtin/tiabd/.venv
/home/albakhtin/tiabd/.venv/bin/python -m pip install -r /home/albakhtin/tiabd/requirements-vm.txt
hostname
python3 --version
java -version
sudo -n docker --version
sudo -n docker compose version
echo 'PERSONAL VM ENVIRONMENT READY'
