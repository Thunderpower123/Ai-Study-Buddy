import base64
import json
import urllib.request

PDF_PATH = r"C:\Users\HP\Desktop\8051 Microcontroller book Mazidi.pdf"

print("Reading and encoding PDF...")
with open(PDF_PATH, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

print(f"Encoded. Size: {len(b64)} chars. Sending to /ingest...")

payload = json.dumps({
    'file_b64': b64,
    'filename': '8051 Microcontroller book Mazidi.pdf',
    'mimetype': 'application/pdf',
    'sessionId': 'test-session-003',
    'documentId': 'test-doc-003'
}).encode()

req = urllib.request.Request(
    'http://localhost:8001/ingest',
    data=payload,
    headers={
        'Content-Type': 'application/json',
        'x-service-key': 'studdybuddy_internal_2026'
    }
)

print("Waiting for response (this may take 1-2 minutes)...")
with urllib.request.urlopen(req, timeout=300) as res:
    print("RESPONSE:", res.read().decode())
