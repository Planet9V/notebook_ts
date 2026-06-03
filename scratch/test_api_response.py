import httpx


def main():
    try:
        r = httpx.get("http://localhost:8502/api/regulations/ACSC_ESSENTIAL_8/questions")
        print("Status code:", r.status_code)
        if r.status_code == 200:
            data = r.json()
            print("Number of questions returned:", len(data))
            if data:
                q = data[0]
                print("First question details:")
                print("Code:", q.get("standard_code"))
                print("Text:", q.get("question_text"))
                print("Description:")
                print(repr(q.get("description")))
    except Exception as e:
        print("Error fetching from API:", e)

if __name__ == "__main__":
    main()
