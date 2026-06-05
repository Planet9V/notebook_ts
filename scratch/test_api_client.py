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
    print("Fetching from /api/contacts?customer_id=customer:o9xp6yesfb84jwyxar67")
    res1 = get_url("http://localhost:5055/api/contacts?customer_id=customer:o9xp6yesfb84jwyxar67")
    if res1 is not None:
        print(f"Count: {len(res1)}")
        for c in res1:
            print(f"  {c.get('id')}: {c.get('full_name')} (customer_id={c.get('customer_id')})")
            
    print("\nFetching from /api/customers/customer:o9xp6yesfb84jwyxar67/contacts")
    res2 = get_url("http://localhost:5055/api/customers/customer:o9xp6yesfb84jwyxar67/contacts")
    if res2 is not None:
        print(f"Count: {len(res2)}")
        for c in res2:
            print(f"  {c.get('id')}: {c.get('full_name')} (customer_id={c.get('customer_id')})")

if __name__ == "__main__":
    main()
