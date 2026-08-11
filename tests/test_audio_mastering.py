import pytest
from open_notebook.utils.audio_mastering import (
    apply_vocal_eq,
    apply_stereo_panning,
    generate_synthesized_sfx,
    master_podcast_episode
)

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False


def test_synthesized_sfx_generation():
    if not PYDUB_AVAILABLE:
        pytest.skip("pydub not installed")
    sfx = generate_synthesized_sfx("chime", duration_ms=300)
    assert sfx is not None
    assert len(sfx) == 300


def test_master_podcast_episode_basic():
    if not PYDUB_AVAILABLE:
        pytest.skip("pydub not installed")

    # Create dummy audio segment bytes
    from pydub.generators import Sine
    clip1 = Sine(440).to_audio_segment(duration=500)
    clip2 = Sine(880).to_audio_segment(duration=500)

    import io
    buf1 = io.BytesIO()
    clip1.export(buf1, format="wav")
    buf2 = io.BytesIO()
    clip2.export(buf2, format="wav")

    dialogue = [
        ("Speaker 1", buf1.getvalue()),
        ("Speaker 2", buf2.getvalue())
    ]

    mastered_bytes = master_podcast_episode(
        dialogue_segments=dialogue,
        enable_sfx=True,
        output_format="mp3"
    )

    assert len(mastered_bytes) > 0
