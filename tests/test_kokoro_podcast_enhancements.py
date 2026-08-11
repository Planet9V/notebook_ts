import os
import pytest
import torch
import numpy as np

from open_notebook.podcasts.voice_blender import blend_voice_tensors, extract_voice_tensor_from_wav
from open_notebook.podcasts.audio_processor import process_podcast_audio, calculate_ebu_r128_loudness

def test_blend_voice_tensors(tmp_path):
    """Test blending two 512-dim PyTorch voice tensors with specified weights."""
    t1 = torch.randn(1, 256)
    t2 = torch.randn(1, 256)
    
    path_a = tmp_path / "voice_a.pt"
    path_b = tmp_path / "voice_b.pt"
    out_path = tmp_path / "blended.pt"
    
    torch.save(t1, path_a)
    torch.save(t2, path_b)
    
    result_tensor = blend_voice_tensors(str(path_a), str(path_b), str(out_path), weight_a=0.7)
    
    assert os.path.exists(out_path)
    assert result_tensor.shape == (1, 256) or result_tensor.shape == (510, 1, 256)
    
    # Expected weighted linear interpolation
    expected = 0.7 * t1 + 0.3 * t2
    assert torch.allclose(result_tensor, expected, atol=1e-4)

def test_extract_voice_tensor_from_wav(tmp_path):
    """Test generating a PyTorch .pt voice tensor from an input WAV file."""
    wav_path = tmp_path / "sample_speech.wav"
    out_tensor_path = tmp_path / "extracted_voice.pt"
    
    # Create dummy mono WAV file
    sample_rate = 24000
    duration = 2.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    audio_data = (0.5 * np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
    
    import wave
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data.tobytes())
        
    tensor = extract_voice_tensor_from_wav(str(wav_path), str(out_tensor_path))
    assert os.path.exists(out_tensor_path)
    assert isinstance(tensor, torch.Tensor)

def test_audio_post_processor_loudness_and_ducking(tmp_path):
    """Test background music ducking and EBU R128 loudness normalization."""
    speech_wav = tmp_path / "speech.wav"
    music_wav = tmp_path / "bg_music.wav"
    final_output = tmp_path / "final_episode.mp3"
    
    sample_rate = 24000
    duration = 3.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Speech signal
    speech_data = (0.6 * np.sin(2 * np.pi * 300 * t) * 32767).astype(np.int16)
    # Music signal
    music_data = (0.3 * np.sin(2 * np.pi * 100 * t) * 32767).astype(np.int16)
    
    import wave
    with wave.open(str(speech_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(speech_data.tobytes())
        
    with wave.open(str(music_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(music_data.tobytes())
        
    res_path = process_podcast_audio(
        speech_path=str(speech_wav),
        music_path=str(music_wav),
        output_path=str(final_output),
        target_lufs=-16.0,
        ducking_db=-12.0
    )
    
    assert os.path.exists(res_path)
    lufs = calculate_ebu_r128_loudness(str(res_path))
    # EBU R128 tolerance within 2.0 LUFS
    assert abs(lufs - (-16.0)) < 2.0
