import sys
from pathlib import Path


# Ensure `import app.*` works when running tests from the backend/ folder.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
