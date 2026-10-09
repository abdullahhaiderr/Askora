# Askora — Intelligent FAQ Chatbot

**Good questions deserve clear answers.**

Askora is a portfolio-ready FAQ assistant for a fictional US retailer, **Northstar Supply**. It uses transparent natural-language processing, TF-IDF vectorization and cosine similarity to retrieve a verified answer from its configurable FAQ data. It is **not** a generative AI chatbot: when it does not find a sufficiently relevant answer, it abstains instead of inventing information.

## Features

- Responsive, accessible React + TypeScript frontend with light/dark mode
- Chat history, suggested prompts, markdown answers, copy, clear conversation, typing and error states
- Semantic-ish lexical matching using both word and character n-grams, exact phrase lookup, conservative preprocessing, configurable threshold and ambiguity guard
- 36 editable FAQs with IDs, categories and alternative questions
- Searchable, filterable knowledge base, optional admin create/edit/delete UI protected by an API key
- FastAPI with OpenAPI (`/docs`), validation, CORS and automated tests
- Independent deployments: frontend on Vercel, backend on Render or another Python host

> **Demo content:** Northstar Supply is fictional. All policies, working hours, prices, and support emails are examples. `support@northstarsupply.example` is intentionally non-deliverable. Replace the FAQ JSON with your organization’s approved content before real use.

## Repository layout

```text
askora/
├── frontend/
│   ├── src/components/       # Header, chat, landing, FAQ management
│   ├── src/lib/api.ts        # Typed API client
│   ├── src/App.tsx
│   ├── src/styles.css
│   ├── package.json
│   ├── .env.example
│   └── vercel.json
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI endpoints
│   │   ├── models.py        # Pydantic validation
│   │   ├── matcher.py       # TF-IDF / cosine matching
│   │   ├── preprocessing.py
│   │   └── store.py         # JSON CRUD persistence
│   ├── data/faqs.json
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── requirements-dev.txt
├── docs/API.md
└── README.md
```

## Requirements

- Node.js **20+** and npm
- Python **3.10+** (3.11 or 3.12 recommended)

## Run locally

**Terminal 1 — API**

```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — interface**

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` for the UI and `http://localhost:8000/docs` for the interactive API reference. Vite forwards `/api` requests to local FastAPI, so no extra frontend config is needed during development.

## Configuration

Backend environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MATCH_THRESHOLD` | `0.37` | Minimum cosine score for answering (re-evaluate for new datasets) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins, comma separated |
| `ASKORA_ADMIN_KEY` | not set | Enables authorized FAQ writes; strong, random secret required |
| `FAQ_DATA_PATH` | `backend/data/faqs.json` | Path to writable JSON data |

Frontend build variable: `VITE_API_URL=https://your-backend-domain.example` (no ending slash). All `VITE_` variables are public, so **never** add secrets there.

**Writing FAQ data:** Without `ASKORA_ADMIN_KEY`, anyone can browse and chat but cannot create, edit or delete FAQs. Set a strong key only on the API service, then use **Knowledge Base → Manage FAQs** to supply it temporarily. The key is held only in React state and sent via `X-Admin-Key`. For multi-user production administration, replace this demo API key with user authentication, role-based authorization, rate limiting and an audited database. JSON file mutations are single-process only; use a persistent volume or database for deployed writes because ephemeral filesystems reset on restart.

To customize your FAQ data, edit `backend/data/faqs.json`: each entry has `id`, `question`, `answer`, `alternatives` (array), and `category`. Restart the API after external file edits, or use authorized CRUD endpoints to update the in-memory index immediately. The backend rejects duplicate IDs and normalized questions.

## How matching works

1. Normalize Unicode, case and punctuation; **retain stop words and negation**.
2. Index every canonical FAQ question plus its alternate phrasings.
3. Fit two TF-IDF models: word n-grams `(1,2)` and character-within-word n-grams `(3,5)`.
4. Join the feature matrices with weights `0.7` (word) and `0.3` (character) and calculate cosine similarity.
5. Consolidate scores by FAQ, select the strongest, and check a configurable threshold and close-match ambiguity rule.
6. Return the stored FAQ answer, ID and category, or abstain with a natural fallback and suggestions.

This is similarity-based FAQ retrieval, **not deep semantic understanding**. It will miss some paraphrases and may confuse highly similar intents. A score is a retrieval metric, not a probability of correctness. Extend alternatives, evaluate actual user questions and tune the threshold before relying on answers. Optional embeddings may improve paraphrase recall but require additional resources; this project intentionally keeps the default model transparent, lightweight and offline.

## Tests and calibration

```bash
cd backend
pytest -q
python -m app.evaluate
cd ../frontend
npm run build
```

`app.evaluate` uses hand-labeled in-domain/out-of-domain test questions from `backend/data/evaluation.json` and prints precision, coverage and negative rejection counts. Do not tune and report evaluation on the same examples as independent test results; create a held-out set for a production evaluation.

## Deploy

### Frontend — Vercel

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Choose **Vite** as the framework; build command `npm run build`, output directory `dist`.
4. Set `VITE_API_URL` to your deployed FastAPI URL, e.g. `https://your-api.onrender.com`.
5. Deploy. The frontend's SPA rewrite is provided in `frontend/vercel.json`.

### Backend — Render

1. Create a **Web Service** from the same repository.
2. Set **Root Directory** to `backend` and runtime **Python**.
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set `CORS_ORIGINS=https://your-frontend.vercel.app`, optionally `MATCH_THRESHOLD` and `ASKORA_ADMIN_KEY`.
6. Visit `https://your-api.onrender.com/api/health` and check `status: ok`.

Use managed PostgreSQL or a persistent disk for admin writes on hosted infrastructure; Render’s ephemeral default filesystem will not reliably retain updates. For reproducible demo data, edit the committed JSON locally and redeploy. Update CORS if your frontend domain changes.

## Safety and scope

- Answer text is retrieved from approved JSON only, not fabricated by an LLM.
- Inputs are validated (maximum 500 characters for questions); HTML is not rendered from answers.
- Secrets must stay server-side; API keys are demonstration-only authentication.
- The open read/chat endpoints should have deployment-level rate limits if made public.
- The chatbot does not have context-aware multi-turn memory: follow-up questions are independent requests.

## License

MIT — see `LICENSE`.
