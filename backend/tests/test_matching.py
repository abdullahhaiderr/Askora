import pytest
from pathlib import Path
from app.models import FAQ
from app.preprocessing import normalize, tokenize
from app.matcher import FAQMatcher
from app.store import FAQStore

@pytest.fixture
def matcher():
    store = FAQStore(Path(__file__).parents[1] / 'data' / 'faqs.json')
    return FAQMatcher(store.list(), threshold=0.37)

@pytest.mark.parametrize('q,faq', [
    ('How can I reset my password?', 'account-01'),
    ('HOW CAN I RESET MY PASSWORD!!!', 'account-01'),
    ('I forgot my password', 'account-01'),
    ('Where is my package?', 'orders-01'),
    ('What is your return policy?', 'returns-01'),
    ('Is guest checkout allowed?', 'orders-08'),
    ('WhAt ArE YoUr WoRkInG hOuRs?', 'support-02'),
    ('Can I pay with PayPal?', 'payments-01'),
])
def test_verified_matches(matcher, q, faq):
    assert matcher.match(q).faq.id == faq

def test_unrelated_abstention(matcher):
    for question in ['Explain quantum entanglement and black holes', 'What is the capital of Peru?', '']:
        assert matcher.match(question).faq is None

def test_normalization():
    assert normalize('  HOW    do I RESET??  ') == 'how do i reset'
    assert tokenize('Can I NOT cancel?') == ['can', 'i', 'not', 'cancel']
    assert normalize('ＡＢＣ') == 'abc'

def test_threshold_controls_results(matcher):
    assert matcher.match('Can I pay with PayPal?').faq is not None
    strict = FAQMatcher(matcher.faqs, threshold=0.99)
    assert strict.match('How can I pay for items using a credit card') .faq is None

def test_duplicate_phrase_rejected(matcher):
    original = matcher.faqs[0]
    duplicate = FAQ(id='another-id', question=original.question, answer='Different answer', category='Support')
    with pytest.raises(ValueError):
        FAQStore._validate([original, duplicate])
