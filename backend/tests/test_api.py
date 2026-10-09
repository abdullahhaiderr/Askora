from pathlib import Path

def test_health(client):
    res = client.get('/api/health')
    assert res.status_code == 200 and res.json()['faqs'] >= 25

def test_list_and_lookup(client):
    res = client.get('/api/faqs', params={'category': 'Payments'})
    assert res.status_code == 200 and res.json()['count'] >= 5
    assert client.get('/api/faqs/account-01').json()['id'] == 'account-01'
    assert client.get('/api/faqs/not-found').status_code == 404

def test_chat_exact_and_fallback(client):
    answer = client.post('/api/chat', json={'question': 'I forgot my password'}).json()
    assert answer['faq_id'] == 'account-01' and not answer['fallback']
    fallback = client.post('/api/chat', json={'question': 'Explain quantum entanglement and black holes'}).json()
    assert fallback['fallback'] and fallback['faq_id'] is None and len(fallback['suggestions']) > 0

def test_input_validation(client):
    for question in ['', '     ', 'x' * 501]:
        assert client.post('/api/chat', json={'question': question}).status_code == 422

def test_admin_auth_and_crud(client):
    new = {'id':'test-faq', 'question':'How do I request a demo?', 'answer':'Email the demo support desk.', 'alternatives':['Book a product demo'], 'category':'Support'}
    assert client.post('/api/faqs', json=new).status_code == 403
    headers = {'X-Admin-Key':'test-only-secret'}
    r = client.post('/api/faqs', json=new, headers=headers)
    assert r.status_code == 201, r.text
    assert client.post('/api/chat', json={'question':new['question']}).json()['faq_id'] == 'test-faq'
    assert client.post('/api/faqs', json=new, headers=headers).status_code == 409
    edited = {**new,'answer':'Contact the support team for a demo.'}
    assert client.put('/api/faqs/test-faq', json=edited,headers=headers).status_code == 200
    assert client.get('/api/faqs/test-faq').json()['answer'] == edited['answer']
    assert client.delete('/api/faqs/test-faq', headers=headers).status_code == 204
    assert client.get('/api/faqs/test-faq').status_code == 404
