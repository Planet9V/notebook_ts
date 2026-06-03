import requests

url = "http://localhost:5055/api/agents/draft/copilot"
payload = {
    "notebook_id": "notebook:ss04aff5wutskenidkhd",
    "text": "This section covers the industrial control system boundary protection rules.",
    "action": "expand"
}

try:
    print(f"Sending POST to {url}...")
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response Content:", response.text)
except Exception as e:
    print("Error:", e)
