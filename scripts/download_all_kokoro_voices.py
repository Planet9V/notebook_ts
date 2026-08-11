"""
Download all stock Kokoro-82M voice tensor files from Hugging Face hexgrad/Kokoro-82M using huggingface_hub.

Saves all voice files locally to notebook_data/kokoro_voices/ for offline production use.
"""

import os
from huggingface_hub import hf_hub_download
from loguru import logger

VOICE_LIST = [
    # US English (Female)
    "af_heart", "af_bella", "af_sarah", "af_nicole", "af_sky", "af_alloy", "af_aoede", "af_jessica", "af_kore", "af_river",
    # US English (Male)
    "am_adam", "am_michael", "am_george", "am_fenrir", "am_puck", "am_echo", "am_eric", "am_liam", "am_onyx",
    # British English (Female)
    "bf_emma", "bf_isabella", "bf_alice", "bf_lily",
    # British English (Male)
    "bm_george", "bm_lewis", "bm_daniel", "bm_fable",
    # Japanese
    "jf_alpha", "jf_gongitsune", "jf_nezumi", "jf_tebukuro", "jm_kumo",
    # Mandarin Chinese
    "zf_xiaobei", "zf_xiaoni", "zf_xiaoxiao", "zf_xiaoyi", "zm_yunjian", "zm_yunxi", "zm_yunxia", "zm_yunyang",
    # Spanish
    "ef_dora", "em_alex", "em_santa",
    # Hindi
    "hf_alpha", "hf_beta", "hm_omega", "hm_psi",
    # Italian
    "if_sara", "im_nicola",
    # Brazilian Portuguese
    "pf_dora", "pm_alex", "pm_santa",
    # French
    "ff_siwis"
]

REPO_ID = "hexgrad/Kokoro-82M"
TARGET_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "notebook_data", "kokoro_voices")


def download_voices():
    os.makedirs(TARGET_DIR, exist_ok=True)
    logger.info(f"Downloading {len(VOICE_LIST)} Kokoro voice files from Hugging Face repo '{REPO_ID}' to {TARGET_DIR}...")

    success_count = 0
    for voice in VOICE_LIST:
        filename = f"voices/{voice}.bin"
        dest_filename = f"{voice}.bin"
        dest_path = os.path.join(TARGET_DIR, dest_filename)

        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
            logger.info(f"✓ {voice} already cached locally ({os.path.getsize(dest_path)} bytes).")
            success_count += 1
            continue

        try:
            logger.info(f"Fetching {voice} via hf_hub_download...")
            downloaded_file = hf_hub_download(
                repo_id=REPO_ID,
                filename=filename,
                local_dir=TARGET_DIR,
                local_dir_use_symlinks=False
            )
            if os.path.exists(downloaded_file) and os.path.getsize(downloaded_file) > 1000:
                logger.info(f"✓ {voice} downloaded successfully ({os.path.getsize(downloaded_file)} bytes).")
                success_count += 1
            else:
                logger.warning(f"⚠ {voice} download resulted in small/empty file.")
        except Exception as e:
            logger.warning(f"Failed to fetch {voice}: {e}")

    logger.info(f"Completed download job: {success_count}/{len(VOICE_LIST)} voices cached in {TARGET_DIR}.")
    return success_count


if __name__ == "__main__":
    download_voices()
