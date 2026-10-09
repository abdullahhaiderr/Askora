"""Conservative Unicode-safe normalization: keep important negation and stop words."""
import re
import unicodedata

def normalize(value: str) -> str:
    value = unicodedata.normalize('NFKC', value).casefold()
    value = value.replace('’', "'")
    value = re.sub(r"[^\w\s']+", ' ', value, flags=re.UNICODE)
    return ' '.join(value.split())

def tokenize(value: str) -> list[str]:
    return normalize(value).split()
