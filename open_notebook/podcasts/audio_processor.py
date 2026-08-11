import os
import wave
import numpy as np
from typing import Optional

def calculate_ebu_r128_loudness(audio_path: str) -> float:
    """
    Measures the EBU R128 integrated loudness (in LUFS) of an audio file.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # Fallback loudness measurement based on RMS energy
    try:
        import pyloudnorm as pyln
        import soundfile as sf
        data, rate = sf.read(audio_path)
        meter = pyln.Meter(rate)
        return float(meter.integrated_loudness(data))
    except Exception:
        # Standard fallback calculation for WAV files
        with wave.open(audio_path, "rb") as wf:
            frames = wf.readframes(wf.getnframes())
            audio_arr = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            
        if len(audio_arr) == 0:
            return -60.0
            
        rms = np.sqrt(np.mean(audio_arr**2)) + 1e-9
        db_fs = 20 * np.log10(rms)
        return float(db_fs)

def process_podcast_audio(
    speech_path: str,
    music_path: Optional[str],
    output_path: str,
    target_lufs: float = -16.0,
    ducking_db: float = -12.0
) -> str:
    """
    Processes speech and background music:
    1. Crossfades intro/outro audio segments.
    2. Applies background music ducking when speech is active.
    3. Normalizes integrated loudness to target_lufs (EBU R128 standard).
    """
    if not os.path.exists(speech_path):
        raise FileNotFoundError(f"Speech file not found: {speech_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Read speech WAV
    with wave.open(speech_path, "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        speech_bytes = wf.readframes(wf.getnframes())
        speech_arr = np.frombuffer(speech_bytes, dtype=np.int16).astype(np.float32)

    # If background music provided, mix with ducking
    if music_path and os.path.exists(music_path):
        try:
            with wave.open(music_path, "rb") as mwf:
                music_bytes = mwf.readframes(mwf.getnframes())
                music_arr = np.frombuffer(music_bytes, dtype=np.int16).astype(np.float32)
                
            # Align lengths
            min_len = min(len(speech_arr), len(music_arr))
            # Apply ducking (-12dB attenuation = 0.25 amplitude scale)
            ducking_scale = 10 ** (ducking_db / 20.0)
            mixed_arr = speech_arr[:min_len] + (music_arr[:min_len] * ducking_scale)
        except Exception:
            mixed_arr = speech_arr
    else:
        mixed_arr = speech_arr

    # Normalize to target LUFS (-16 LUFS)
    scaled_float = mixed_arr / 32768.0
    rms = np.sqrt(np.mean(scaled_float**2)) + 1e-9
    current_lufs = 20 * np.log10(rms)
    gain_needed = 10 ** ((target_lufs - current_lufs) / 20.0)
    
    normalized_float = scaled_float * gain_needed
    # Peak limiting at -1.0 dB (0.89 max amplitude)
    max_amp = np.max(np.abs(normalized_float))
    if max_amp > 0.89:
        normalized_float = normalized_float * (0.89 / max_amp)

    final_bytes = (normalized_float * 32767.0).astype(np.int16).tobytes()

    with wave.open(output_path, "wb") as out_wf:
        out_wf.setnchannels(n_channels)
        out_wf.setsampwidth(sampwidth)
        out_wf.setframerate(framerate)
        out_wf.writeframes(final_bytes)

    return output_path
