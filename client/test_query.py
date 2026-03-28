import json
import urllib.request

def ask(question):
    payload = json.dumps({
        "question": question,
        "session_id": "test-session-002"  # electrical machinery book session
    }).encode()

    req = urllib.request.Request(
        'http://localhost:8001/query',
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'x-service-key': 'studdybuddy_internal_2026'
        }
    )

    with urllib.request.urlopen(req, timeout=60) as res:
        data = json.loads(res.read().decode())
        print("\n--- ANSWER ---")
        print(data["answer"])
        print("\n--- SOURCES ---")
        for s in data["sources"]:
            print(f"  {s['filename']} | {s['section']}")
        print(f"\n--- CONFIDENCE: {data['confidence']} | MODE: {data['mode']} ---\n")

# "explain further" forces extended mode + correct session
ask("Are you an idiot")
