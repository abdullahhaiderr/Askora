"""Small labeled sanity-check suite. For genuine claims, evaluate a held-out dataset."""
import json
from pathlib import Path
from .models import FAQ
from .matcher import FAQMatcher

def evaluate(threshold: float = 0.37) -> dict[str, float | int]:
    root = Path(__file__).resolve().parent.parent / 'data'
    faqs = [FAQ.model_validate(item) for item in json.loads((root / 'faqs.json').read_text(encoding='utf-8'))]
    checks = json.loads((root / 'evaluation.json').read_text(encoding='utf-8'))
    matcher = FAQMatcher(faqs, threshold=threshold)
    hits = false_positives = false_negatives = misses = 0
    for check in checks:
        result = matcher.match(check['question'])
        predicted = result.faq.id if result.faq else None
        expected = check['expected_id']
        if expected is not None and predicted == expected:
            hits += 1
        elif expected is None and predicted is not None:
            false_positives += 1
        elif expected is not None and predicted is None:
            false_negatives += 1
        elif expected is not None and predicted != expected:
            misses += 1
        print(('✓' if predicted == expected else '✗'), check['question'], '=>', predicted, '(expected:', expected, ')')
    positive = sum(1 for c in checks if c['expected_id'] is not None)
    negative = len(checks) - positive
    return {'questions':len(checks),'exact_intent_hits':hits,'in_domain_count':positive,'out_domain_count':negative,
            'in_domain_accuracy':round(hits/positive,3),'out_domain_rejection_rate':round((negative-false_positives)/negative,3),
            'incorrect_answers':false_positives+misses, 'abstained_in_domain':false_negatives}

if __name__ == '__main__':
    import pprint
    pprint.pp(evaluate())
