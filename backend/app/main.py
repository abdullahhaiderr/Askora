"""Askora API. Knowledge base is the source of truth; no generative model is used."""
import os
import secrets
from pathlib import Path
from threading import RLock
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from .models import ChatRequest, ChatResponse, FAQ, FAQCollection
from .matcher import FAQMatcher, FALLBACK
from .store import FAQStore

DATA_PATH = Path(os.getenv('FAQ_DATA_PATH', str(Path(__file__).resolve().parent.parent / 'data' / 'faqs.json')))
THRESHOLD = float(os.getenv('MATCH_THRESHOLD', '0.37'))
ADMIN_KEY = os.getenv('ASKORA_ADMIN_KEY', '')
store = FAQStore(DATA_PATH)
matcher = FAQMatcher(store.list(), threshold=THRESHOLD)
mutation_lock = RLock()

app = FastAPI(title='Askora API', version='1.0.0', description='Verified FAQ matching using TF-IDF and cosine similarity.')
origins = [s.strip() for s in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if s.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=['GET', 'POST', 'PUT', 'DELETE'], allow_headers=['Content-Type', 'X-Admin-Key'])


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    if not ADMIN_KEY or not x_admin_key or not secrets.compare_digest(x_admin_key, ADMIN_KEY):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin access is disabled or credentials are invalid')

@app.get('/api/health')
def health():
    return {'status': 'ok', 'faqs': len(store.list()), 'strategy': 'tfidf-cosine'}

@app.get('/api/faqs', response_model=FAQCollection)
def list_faqs(q: str = Query(default='', max_length=200), category: str = Query(default='', max_length=70)):
    items = store.list()
    if category:
        items = [f for f in items if f.category.casefold() == category.casefold()]
    if q:
        needle = q.casefold()
        items = [f for f in items if needle in (' '.join([f.question, f.answer, f.category, *f.alternatives])).casefold()]
    return FAQCollection(faqs=items, count=len(items))

@app.get('/api/faqs/{faq_id}', response_model=FAQ)
def get_faq(faq_id: str):
    item = store.get(faq_id)
    if item is None:
        raise HTTPException(status_code=404, detail='FAQ not found')
    return item

@app.post('/api/chat', response_model=ChatResponse)
def chat(payload: ChatRequest):
    result = matcher.match(payload.question)
    if result.faq is None:
        return ChatResponse(question=payload.question, answer=FALLBACK, faq_id=None, category=None,
                            relevance=result.relevance, status='no_match', fallback=True,
                            suggestions=[f.question for f in store.list()[:4]])
    return ChatResponse(question=payload.question, answer=result.faq.answer,
                        faq_id=result.faq.id, category=result.faq.category,
                        relevance=result.relevance, status='matched', fallback=False)

@app.post('/api/faqs', response_model=FAQ, status_code=201, dependencies=[Depends(require_admin)])
def create_faq(faq: FAQ):
    with mutation_lock:
        items = store.list()
        if any(f.id == faq.id for f in items):
            raise HTTPException(409, detail='FAQ ID already exists')
        try:
            matcher.rebuild([*items, faq])
            store.save([*items, faq])
        except ValueError as ex:
            matcher.rebuild(items)
            raise HTTPException(409, detail=str(ex)) from ex
        except Exception:
            matcher.rebuild(items)
            raise
        return faq

@app.put('/api/faqs/{faq_id}', response_model=FAQ, dependencies=[Depends(require_admin)])
def update_faq(faq_id: str, faq: FAQ):
    if faq_id != faq.id:
        raise HTTPException(422, detail='Body and URL IDs must match')
    with mutation_lock:
        old = store.list()
        if not any(f.id == faq_id for f in old):
            raise HTTPException(404, detail='FAQ not found')
        updated = [faq if f.id == faq_id else f for f in old]
        try:
            matcher.rebuild(updated)
            store.save(updated)
        except ValueError as ex:
            matcher.rebuild(old)
            raise HTTPException(409, detail=str(ex)) from ex
        except Exception:
            matcher.rebuild(old)
            raise
        return faq

@app.delete('/api/faqs/{faq_id}', status_code=204, dependencies=[Depends(require_admin)])
def delete_faq(faq_id: str):
    with mutation_lock:
        old = store.list()
        if not any(f.id == faq_id for f in old):
            raise HTTPException(404, detail='FAQ not found')
        updated = [f for f in old if f.id != faq_id]
        matcher.rebuild(updated)
        try:
            store.save(updated)
        except Exception:
            matcher.rebuild(old)
            raise
