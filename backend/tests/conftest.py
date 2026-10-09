import json
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client(tmp_path, monkeypatch):
    original = Path(__file__).parents[1] / 'data' / 'faqs.json'
    copy = tmp_path / 'faqs.json'
    copy.write_text(original.read_text())
    monkeypatch.setenv('FAQ_DATA_PATH', str(copy))
    monkeypatch.setenv('ASKORA_ADMIN_KEY', 'test-only-secret')
    # Reimport module so env and temporary data are used in each test.
    import importlib
    from app import main
    importlib.reload(main)
    with TestClient(main.app) as test_client:
        yield test_client
