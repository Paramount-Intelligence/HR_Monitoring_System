import os
from pathlib import Path

# Add the apps/api folder to the Python path so Celery can discover the `app` module.
import sys
api_dir = str(Path(__file__).resolve().parent.parent.parent / "apps" / "api")
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from apps.worker.celery_app import celery_app
