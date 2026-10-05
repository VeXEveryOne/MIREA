"""Record actual domain and executable-slice test results with source hashes."""
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import sys
import unittest

SUBJECT = Path(__file__).resolve().parents[1]
ROOT = SUBJECT.parents[1]
sys.path.insert(0, str(SUBJECT/'Прототип'))
suite = unittest.defaultTestLoader.discover(str(SUBJECT/'Прототип'), pattern='test_*.py')
result = unittest.TextTestRunner(verbosity=2).run(suite)
record = {
    'executed_at': datetime.now(timezone.utc).isoformat(),
    'tests_run': result.testsRun, 'errors': len(result.errors), 'failures': len(result.failures),
    'skipped': len(result.skipped), 'passed': result.wasSuccessful() and not result.skipped,
    'source_sha256': {p.name: sha256(p.read_bytes()).hexdigest()
                      for p in (SUBJECT/'Прототип').glob('*.py')},
    'scope': 'Actual pure-domain and read-only PostgreSQL slice checks; not HTTP, load or external API tests',
}
output = ROOT/'.cache/ppois5-10/prototype-verification.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
raise SystemExit(0 if record['passed'] else 1)
