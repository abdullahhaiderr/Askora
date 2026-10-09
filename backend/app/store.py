from __future__ import annotations
"""Validated JSON storage, atomic writes and a single-process locking strategy."""
import json
import os
from pathlib import Path
from threading import RLock
from .models import FAQ
from .preprocessing import normalize

class FAQStore:
    def __init__(self, path: Path):
        self.path = path
        self.lock = RLock()
        self._faqs: list[FAQ] = []
        self.load()

    def load(self) -> list[FAQ]:
        with self.lock:
            raw = json.loads(self.path.read_text(encoding='utf-8'))
            items = [FAQ.model_validate(item) for item in raw]
            self._validate(items)
            self._faqs = items
            return list(items)

    @staticmethod
    def _validate(items: list[FAQ]) -> None:
        ids: set[str] = set()
        phrases: set[str] = set()
        for item in items:
            if item.id in ids:
                raise ValueError('Duplicate FAQ ID: ' + item.id)
            ids.add(item.id)
            for phrase in [item.question, *item.alternatives]:
                norm = normalize(phrase)
                if norm in phrases:
                    raise ValueError('Duplicate FAQ phrase: ' + phrase)
                phrases.add(norm)

    def list(self) -> list[FAQ]:
        with self.lock:
            return list(self._faqs)

    def get(self, faq_id: str) -> FAQ | None:
        with self.lock:
            return next((f for f in self._faqs if f.id == faq_id), None)

    def save(self, items: list[FAQ]) -> None:
        with self.lock:
            self._validate(items)
            # Does not persist on cloud hosts with ephemeral disks: use a persistent disk or database.
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix('.tmp')
            tmp.write_text(json.dumps([f.model_dump() for f in items], indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
            os.replace(tmp, self.path)
            self._faqs = list(items)
