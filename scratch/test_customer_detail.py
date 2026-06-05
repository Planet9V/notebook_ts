import urllib.request
import json

def get_url(url):
    try:
        with urllib.request.urlopen(url) as response:
            html = response.read().decode('utf-8')
            return json.loads(html)
    except Exception as e:
        print(f"Error calling {url}: {e}")
        return None

def main():
    print("Fetching from /api/customers/customer:o9xp6yesfb84jwyxar67")
    cust = get_url("http://localhost:5055/api/customers/customer:o9xp6yesfb84jwyxar67")
    if cust:
        print(f"ID: {cust.get('id')} (type={type(cust.get('id'))})")
        print(f"Name: {cust.get('name')}")
        print(f"Contacts: {cust.get('contacts')}")

if __name__ == "__main__":
    main()
