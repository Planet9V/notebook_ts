import asyncio
import os
import sys
import traceback

async def main():
    from open_notebook.ai.models import Model, ModelManager
    from open_notebook.domain.credential import Credential

    print("--- Loaded Credentials ---")
    creds = await Credential.get_all()
    for c in creds:
        print(f"ID: {c.id}, Name: {c.name}, Provider: {c.provider}")
        config = c.to_esperanto_config()
        masked_config = {k: ("*"*len(str(v)) if k == "api_key" else v) for k, v in config.items()}
        print(f"  Config: {masked_config}")

    print("\n--- Loaded Models ---")
    models = await Model.get_all()
    for m in models:
        print(f"ID: {m.id}, Name: {m.name}, Provider: {m.provider}, Type: {m.type}, Credential: {m.credential}")

    # Let's test the qwen3.5:9b model specifically
    target_model_id = "model:r8fjut8jhq6iuy9he42a"
    print(f"\n--- Testing Chat Model {target_model_id} ---")
    try:
        model = await Model.get(target_model_id)
        print(f"Loaded model record: {model.name} ({model.provider})")
        manager = ModelManager()
        esp_model = await manager.get_model(model.id)
        print("Created Esperanto model instance successfully!")
        print("Sending achat_complete...")
        response = await esp_model.achat_complete(
            messages=[{"role": "user", "content": "Hi!"}]
        )
        print("Response received successfully!")
        print(f"Content: {response.content}")
    except Exception as e:
        print("Exception raised during chat completion:")
        print(f"Type: {type(e)}")
        print(f"String: {str(e)}")
        print(f"Repr: {repr(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
