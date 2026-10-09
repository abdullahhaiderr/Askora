"""TF-IDF FAQ retrieval, with exact matching, word/character similarity and abstention."""
from dataclasses import dataclass
from difflib import SequenceMatcher
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from threading import RLock

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .models import FAQ
from .preprocessing import normalize

# Used only to detect off-topic matches; vectorization itself retains negations.
INTENT_STOP_WORDS = (ENGLISH_STOP_WORDS | {'can', 'could', 'would', 'should', 'which', 'how', 'what', 'when', 'where', 'why', 'does', 'do', 'did', 'there', 'please'}) - {'no', 'not', 'never', 'without', 'cannot'}

def has_topic_overlap(question: str, phrasing: str) -> bool:
    terms = [t for t in question.split() if len(t) > 2 and t not in INTENT_STOP_WORDS]
    reference = [t for t in phrasing.split() if len(t) > 2 and t not in INTENT_STOP_WORDS]
    # If all terms are generic, do not allow a broad similarity score to pass.
    if not terms or not reference:
        return False
    return any(a == b or (len(a) >= 5 and len(b) >= 5 and SequenceMatcher(None,a,b).ratio() >= .79)
               for a in terms for b in reference)

FALLBACK = "I'm not confident I have the right answer to that question yet. Try rephrasing it, or contact the support team for help."

@dataclass(frozen=True)
class Match:
    faq: FAQ | None
    relevance: float
    status: str

class FAQMatcher:
    def __init__(self, faqs: list[FAQ], threshold: float = 0.37):
        if not 0 < threshold <= 1:
            raise ValueError('MATCH_THRESHOLD must be greater than 0 and at most 1')
        self.threshold = threshold
        self.lock = RLock()
        self.rebuild(faqs)

    def rebuild(self, faqs: list[FAQ]) -> None:
        with self.lock:
            self.faqs = list(faqs)
            self.phrases = []
            self.owners = []
            self.exact = {}
            for idx, faq in enumerate(faqs):
                for phrase in [faq.question, *faq.alternatives]:
                    normalized = normalize(phrase)
                    if not normalized:
                        continue
                    if normalized in self.exact and self.exact[normalized] != idx:
                        raise ValueError(f'Duplicate FAQ intent: {phrase}')
                    self.exact[normalized] = idx
                    self.phrases.append(normalized)
                    self.owners.append(idx)
            self.word = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, strip_accents='unicode')
            self.char = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5), sublinear_tf=True)
            if self.phrases:
                word_vectors = self.word.fit_transform(self.phrases)
                char_vectors = self.char.fit_transform(self.phrases)
                self.matrix = hstack([word_vectors * np.sqrt(0.7), char_vectors * np.sqrt(0.3)], format='csr')
            else:
                self.matrix = None

    def match(self, question: str) -> Match:
        value = normalize(question)
        if not value:
            return Match(None, 0.0, 'no_match')
        with self.lock:
            if value in self.exact:
                return Match(self.faqs[self.exact[value]], 1.0, 'matched')
            if self.matrix is None:
                return Match(None, 0.0, 'no_match')
            w = self.word.transform([value]) * np.sqrt(0.7)
            c = self.char.transform([value]) * np.sqrt(0.3)
            scores = cosine_similarity(hstack([w, c], format='csr'), self.matrix)[0]
            by_faq = np.zeros(len(self.faqs), dtype=float)
            for index, score in zip(self.owners, scores):
                by_faq[index] = max(by_faq[index], float(score))
            best_idx = int(np.argmax(by_faq))
            best = float(by_faq[best_idx])
            # A second, comparatively close intent means we should ask for rephrasing.
            runner_up = float(np.partition(by_faq, -2)[-2]) if len(by_faq) > 1 else 0.0
            if (not any(has_topic_overlap(value, phrase) for phrase, owner in zip(self.phrases, self.owners) if owner == best_idx)
                or best < self.threshold or (best < 0.60 and runner_up > 0 and best - runner_up < 0.025)):
                return Match(None, round(best, 4), 'no_match')
            return Match(self.faqs[best_idx], round(best, 4), 'matched')
