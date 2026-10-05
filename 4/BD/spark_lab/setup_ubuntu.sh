#!/usr/bin/env bash
set -euo pipefail
# Run inside the existing Ubuntu VirtualBox guest as student.
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk-headless python3-venv python3-pip
python3 -m venv "$HOME/spark-lab/.venv"
"$HOME/spark-lab/.venv/bin/python" -m pip install 'pyspark==3.5.7' 'pandas==2.2.3' 'pyarrow==19.0.1' 'jupyterlab==4.3.5' 'nbclient==0.10.2'
"$HOME/spark-lab/.venv/bin/python" --version
java -version
"$HOME/spark-lab/.venv/bin/python" -c 'import pyspark; print(pyspark.__version__)'
