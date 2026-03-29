import json
import urllib.request

HEADERS = {
    'Content-Type': 'application/json',
    'x-service-key': 'studdybuddy_internal_2026'
}

def post(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers=HEADERS
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode())

print("=== TEST 1: Delete specific document vectors (/delete) ===")
res = post('http://localhost:8001/delete', {
    "sessionId": "test-session-001",
    "documentId": "test-doc-001"
})
print(f"success:       {res['success']}")
print(f"deleted_count: {res['deleted_count']}")
print(f"message:       {res['message']}")

print()
print("=== TEST 2: Query after delete (should find nothing) ===")
res2 = post('http://localhost:8001/query', {
    "question": "What is the 8051 microcontroller?",
    "session_id": "test-session-001"
})
print(f"answer:     {res2['answer']}")
print(f"sources:    {res2['sources']}")
print(f"confidence: {res2['confidence']}")
