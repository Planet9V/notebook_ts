import asyncio
import httpx
import sys

# Define base URL of open_notebook API
API_URL = "http://localhost:5055/api"

async def poll_job(job_id: str, profile_name: str):
    print(f"[{profile_name}] Polling status for job: {job_id}")
    while True:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{API_URL}/podcasts/jobs/{job_id}", timeout=10.0)
                if resp.status_code == 200:
                    status_data = resp.json()
                    status = status_data.get("status")
                    print(f"[{profile_name}] Status: {status}")
                    if status in ("completed", "failed", "error"):
                        if status == "completed":
                            print(f"[{profile_name}] ✅ SUCCESS! Podcast generated successfully.")
                        else:
                            print(f"[{profile_name}] ❌ FAILED! Error: {status_data.get('error_message')}")
                        return status_data
                else:
                    print(f"[{profile_name}] Error polling job: HTTP {resp.status_code}")
        except Exception as e:
            print(f"[{profile_name}] Connection error while polling: {e}")
        
        await asyncio.sleep(10.0)

async def test_profile(profile_name: str, speaker_profile: str, voice_mapping: dict):
    print(f"\n--- Testing Podcast Generation for Profile: {profile_name} ---")
    payload = {
        "episode_profile": profile_name,
        "speaker_profile": speaker_profile,
        "episode_name": f"Kokoro Test - {profile_name}",
        "content": f"This is test content for generating a podcast using the {profile_name} profile.",
        "tts_engine": "kokoro",
        "voice_mapping": voice_mapping
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{API_URL}/podcasts/generate", json=payload, timeout=20.0)
            if resp.status_code == 200:
                job_id = resp.json().get("job_id")
                print(f"[{profile_name}] Job submitted successfully. Job ID: {job_id}")
                return job_id
            else:
                print(f"[{profile_name}] ❌ Failed to submit job: HTTP {resp.status_code} - {resp.text}")
                return None
    except Exception as e:
        print(f"[{profile_name}] ❌ Connection error while submitting: {e}")
        return None

async def main():
    # Define profiles to test sequentially with Kokoro overrides
    tests = [
        {
            "profile_name": "tech_discussion",
            "speaker_profile": "tech_experts",
            "voice_mapping": {
                "Dr. Alex Chen": "am_michael",
                "Jamie Rodriguez": "af_bella"
            }
        },
        {
            "profile_name": "business_analysis",
            "speaker_profile": "business_panel",
            "voice_mapping": {
                "Jim Mckenney": "am_adam",
                "Elena Vasquez": "af_nicole",
                "Johny Bing": "bm_george"
            }
        },
        {
            "profile_name": "Tes Speaking",
            "speaker_profile": "Tes",
            "voice_mapping": {
                "tes": "af_sarah"
            }
        }
    ]
    
    results = []
    for test in tests:
        job_id = await test_profile(test["profile_name"], test["speaker_profile"], test["voice_mapping"])
        if job_id:
            res = await poll_job(job_id, test["profile_name"])
            results.append(res)
            # Give the TTS server 5 seconds to cool down/garbage collect
            await asyncio.sleep(5.0)
            
    print("\n--- All tests completed ---")
    failed = [res for res in results if res.get("status") != "completed"]
    if failed:
        print(f"❌ Some jobs failed: {len(failed)} failed out of {len(results)}")
        sys.exit(1)
    else:
        print("✅ All jobs completed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
