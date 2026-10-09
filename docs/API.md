# Askora API reference

Interactive reference: `GET /docs`, OpenAPI schema: `GET /openapi.json`.

## Chat

```bash
curl -X POST http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"I forgot my password"}'
```

Response example:

```json
{
  "question": "I forgot my password",
  "answer": "Select **Forgot password** on the sign-in screen, enter your registered email, and follow the reset link. Check spam if the email is missing.",
  "faq_id": "account-01",
  "category": "Account",
  "relevance": 1.0,
  "status": "matched",
  "fallback": false,
  "suggestions": []
}
```

For an unrelated query, `faq_id` and `category` are null, `fallback` is true, `status` is `no_match`, and `suggestions` contains follow-up questions. Relevance is a TF-IDF retrieval score, **not** factual accuracy confidence.

## Read FAQs

- `GET /api/health` → health information and FAQ count
- `GET /api/faqs` → `{ faqs: FAQ[], count: number }`
- `GET /api/faqs?q=refund&category=Payments` → filtered collection
- `GET /api/faqs/account-01` → one FAQ, 404 if not found

## Protected mutations

Set a strong `ASKORA_ADMIN_KEY` in the backend environment. It must not be published in frontend environment variables or committed to Git.

```bash
curl -X POST http://localhost:8000/api/faqs \
  -H 'Content-Type: application/json' -H 'X-Admin-Key: YOUR_SECRET' \
  -d '{"id":"demo-new","question":"Where is your showroom?","answer":"We do not offer an in-person showroom.","alternatives":["Can I visit a store?"],"category":"Support"}'

curl -X PUT http://localhost:8000/api/faqs/demo-new \
  -H 'Content-Type: application/json' -H 'X-Admin-Key: YOUR_SECRET' \
  -d '{"id":"demo-new","question":"Where is your showroom?","answer":"The showroom is online only.","alternatives":[],"category":"Support"}'

curl -X DELETE http://localhost:8000/api/faqs/demo-new -H 'X-Admin-Key: YOUR_SECRET'
```

- `POST /api/faqs` → 201 created, 403 if unauthorized, 409 if duplicate
- `PUT /api/faqs/{id}` → 200 updated; IDs must match
- `DELETE /api/faqs/{id}` → 204 deleted
- `POST /api/chat` requires JSON question (1–500 non-whitespace characters); malformed input → 422

No internal tracebacks or server configuration are deliberately returned by normal API handlers. Production deployments should add structured logs, request quotas, authentication and an SQL store.
