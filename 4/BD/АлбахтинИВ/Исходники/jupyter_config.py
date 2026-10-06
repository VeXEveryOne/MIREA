"""JupyterLab configuration for the dedicated personal guest."""
import os

c = get_config()
c.ServerApp.ip = '0.0.0.0'
c.ServerApp.port = 8888
c.ServerApp.open_browser = False
c.ServerApp.root_dir = '/home/albakhtin/tiabd'
c.IdentityProvider.token = os.environ['TIABD_JUPYTER_TOKEN']

