"""
Platform & GPU Detection API — System information and hardware capabilities.

Provides platform info including OS, CPU, memory, GPU availability (CUDA/ROCm/MPS),
and Docker status. Used by the frontend to auto-configure voice AI services
(e.g., selecting float16 for GPU, int8 for CPU-only).
"""

import os
import platform
import subprocess
from typing import List, Optional

from fastapi import APIRouter
from loguru import logger
from pydantic import BaseModel, Field

router = APIRouter()


# ── Response Models ──────────────────────────────────────────────────


class GpuDevice(BaseModel):
    """Individual GPU device information."""

    name: str = Field(..., description="GPU model name")
    memory_mb: int = Field(default=0, description="GPU memory in MB")
    compute_capability: Optional[str] = Field(
        default=None, description="CUDA compute capability"
    )


class GpuInfo(BaseModel):
    """GPU detection results."""

    available: bool = Field(default=False, description="Whether any GPU is available")
    type: str = Field(
        default="none", description="GPU type: cuda, rocm, mps, none"
    )
    devices: List[GpuDevice] = Field(default_factory=list, description="List of GPU devices")
    driver_version: Optional[str] = Field(
        default=None, description="GPU driver version"
    )
    recommended_compute_type: str = Field(
        default="int8", description="Recommended Whisper compute type"
    )


class DockerInfo(BaseModel):
    """Docker installation detection."""

    available: bool = Field(default=False)
    version: Optional[str] = Field(default=None)
    compose_version: Optional[str] = Field(default=None)


class PlatformInfo(BaseModel):
    """Complete platform information response."""

    os: str = Field(..., description="Operating system")
    arch: str = Field(..., description="CPU architecture")
    python_version: str = Field(..., description="Python version")
    hostname: str = Field(..., description="Hostname")
    cpu_count: int = Field(..., description="Number of CPU cores")
    memory_total_mb: int = Field(..., description="Total system RAM in MB")
    memory_available_mb: int = Field(..., description="Available RAM in MB")
    gpu: GpuInfo = Field(default_factory=GpuInfo)
    docker: DockerInfo = Field(default_factory=DockerInfo)


# ── Detection Helpers ────────────────────────────────────────────────


def _detect_cuda() -> Optional[GpuInfo]:
    """Detect NVIDIA CUDA GPUs via nvidia-smi."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,driver_version,compute_cap",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            return None

        devices = []
        driver_version = None

        for line in result.stdout.strip().split("\n"):
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 4:
                name = parts[0]
                memory_mb = int(float(parts[1])) if parts[1] else 0
                driver_version = parts[2] or None
                compute_cap = parts[3] or None
                devices.append(
                    GpuDevice(
                        name=name,
                        memory_mb=memory_mb,
                        compute_capability=compute_cap,
                    )
                )

        if devices:
            return GpuInfo(
                available=True,
                type="cuda",
                devices=devices,
                driver_version=driver_version,
                recommended_compute_type="float16",
            )
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
        logger.debug(f"CUDA detection failed: {e}")
    return None


def _detect_rocm() -> Optional[GpuInfo]:
    """Detect AMD ROCm GPUs via rocm-smi."""
    try:
        result = subprocess.run(
            ["rocm-smi", "--showproductname"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            return None

        # Parse rocm-smi output for device names
        devices = []
        for line in result.stdout.strip().split("\n"):
            # rocm-smi output varies; look for GPU lines
            if "GPU" in line and ":" in line:
                name = line.split(":")[-1].strip()
                if name:
                    devices.append(GpuDevice(name=name, memory_mb=0))

        if devices:
            return GpuInfo(
                available=True,
                type="rocm",
                devices=devices,
                recommended_compute_type="float16",
            )
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
        logger.debug(f"ROCm detection failed: {e}")
    return None


def _detect_mps() -> Optional[GpuInfo]:
    """Detect Apple Silicon MPS (Metal Performance Shaders).

    Tries PyTorch's MPS check first (most accurate), then falls back
    to platform detection for environments without PyTorch.
    """
    try:
        if platform.system() != "Darwin":
            return None

        # Try PyTorch MPS detection first (most accurate)
        mps_available = False
        try:
            import torch
            mps_available = (
                hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
            )
        except ImportError:
            # No PyTorch installed — fall back to architecture check
            if platform.machine() == "arm64":
                mps_available = True
            else:
                return None

        if not mps_available:
            return None

        # Get chip name via sysctl
        result = subprocess.run(
            ["sysctl", "-n", "machdep.cpu.brand_string"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        chip_name = result.stdout.strip() if result.returncode == 0 else "Apple Silicon"

        return GpuInfo(
            available=True,
            type="mps",
            devices=[
                GpuDevice(
                    name=chip_name,
                    memory_mb=0,  # Shared memory — not easily queryable
                )
            ],
            recommended_compute_type="float32",
        )
    except Exception as e:
        logger.debug(f"MPS detection failed: {e}")
    return None


def _detect_gpu() -> GpuInfo:
    """Detect GPU in priority order: CUDA → ROCm → MPS → None."""
    for detector in [_detect_cuda, _detect_rocm, _detect_mps]:
        result = detector()
        if result:
            logger.info(f"Detected GPU: {result.type} with {len(result.devices)} device(s)")
            return result

    return GpuInfo(
        available=False,
        type="none",
        recommended_compute_type="int8",
    )


def _detect_docker() -> DockerInfo:
    """Detect Docker and Docker Compose availability."""
    docker_version = None
    compose_version = None
    available = False

    try:
        result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            available = True
            # "Docker version 24.0.7, build afdd53b"
            docker_version = result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    try:
        result = subprocess.run(
            ["docker", "compose", "version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            compose_version = result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return DockerInfo(
        available=available,
        version=docker_version,
        compose_version=compose_version,
    )


def _get_memory_info() -> tuple[int, int]:
    """Get total and available memory in MB."""
    try:
        import psutil

        mem = psutil.virtual_memory()
        return int(mem.total / 1024 / 1024), int(mem.available / 1024 / 1024)
    except ImportError:
        pass

    # Fallback for macOS/Linux without psutil
    try:
        if platform.system() == "Darwin":
            result = subprocess.run(
                ["sysctl", "-n", "hw.memsize"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                total_bytes = int(result.stdout.strip())
                return int(total_bytes / 1024 / 1024), 0
        elif platform.system() == "Linux":
            with open("/proc/meminfo") as f:
                lines = f.readlines()
                total = avail = 0
                for line in lines:
                    if line.startswith("MemTotal:"):
                        total = int(line.split()[1]) // 1024
                    elif line.startswith("MemAvailable:"):
                        avail = int(line.split()[1]) // 1024
                return total, avail
    except Exception as e:
        logger.debug(f"Memory detection fallback failed: {e}")

    return 0, 0


# ── Endpoint ─────────────────────────────────────────────────────────


@router.get("/platform/info", response_model=PlatformInfo)
async def get_platform_info():
    """
    Detect and return comprehensive platform information.

    Includes OS, CPU, memory, GPU availability (CUDA/ROCm/MPS),
    and Docker installation status. Used by the frontend to
    auto-configure voice AI services.
    """
    total_mb, avail_mb = _get_memory_info()
    gpu = _detect_gpu()
    docker = _detect_docker()

    return PlatformInfo(
        os=platform.system(),
        arch=platform.machine(),
        python_version=platform.python_version(),
        hostname=platform.node(),
        cpu_count=os.cpu_count() or 1,
        memory_total_mb=total_mb,
        memory_available_mb=avail_mb,
        gpu=gpu,
        docker=docker,
    )
