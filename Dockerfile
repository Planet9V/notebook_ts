# ==========================================
# Stage 1: Frontend Builder
# ==========================================
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Copy dependency files first to maximize layer cache
COPY frontend/package.json frontend/package-lock.json ./
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry ${NPM_REGISTRY} && npm ci

# Copy the rest of the frontend source and build Next.js in production standalone mode
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Backend Builder
# ==========================================
FROM python:3.12-slim-bookworm AS backend-builder

# Install uv using the official image bin mount
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install system dependencies required for building certain Python packages
RUN echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99custom && \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set build optimization environment variables
ENV MAKEFLAGS="-j$(nproc)"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_HTTP_TIMEOUT=120

WORKDIR /app

# Copy dependency files and minimal package structure first for better layer caching
COPY pyproject.toml uv.lock ./
COPY open_notebook/__init__.py ./open_notebook/__init__.py

# Install dependencies with optimizations (this layer will be cached unless dependencies change)
RUN uv sync --frozen --no-dev

# Pre-download tiktoken encoding so the app works offline (issue #264).
ENV TIKTOKEN_CACHE_DIR=/app/tiktoken-cache
RUN mkdir -p /app/tiktoken-cache && \
    .venv/bin/python -c "import tiktoken; tiktoken.get_encoding('o200k_base')"

# ==========================================
# Stage 3: Runtime Stage
# ==========================================
FROM python:3.12-slim-bookworm AS runtime

# Install only runtime system dependencies (no compiler/build tools to minimize attack surface)
# ffmpeg: media/audio processing
# supervisor: service management/orchestration
# curl: health checks
# Node.js 20: running Next.js standalone frontend
# docker-ce-cli: container observatory (talk to host Docker via mounted socket)
RUN echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99custom && \
    apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    supervisor \
    curl \
    ca-certificates \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli gosu libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Install uv using the official method
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set the working directory in the container to /app
WORKDIR /app

# Copy the virtual environment from builder stage
COPY --from=backend-builder /app/.venv /app/.venv

# Copy pre-downloaded tiktoken encoding from builder (outside /data/ — volume-mount safe)
COPY --from=backend-builder /app/tiktoken-cache /app/tiktoken-cache

# Copy the application source code (done last so simple source edits rebuild instantly)
COPY . /app

# Ensure uv uses the existing venv without attempting network operations
ENV UV_NO_SYNC=1
ENV VIRTUAL_ENV=/app/.venv
ENV TIKTOKEN_CACHE_DIR=/app/tiktoken-cache

# Bind Next.js to all interfaces (required for Docker networking and reverse proxies)
ENV HOSTNAME=0.0.0.0

# Copy built frontend standalone output from builder stage
COPY --from=frontend-builder /app/frontend/.next/standalone /app/frontend/
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/start-server.js /app/frontend/start-server.js

# Expose ports for Frontend (8502) and API (5055)
EXPOSE 8502 5055

# Create non-root user for security; add supplementary docker group for socket access
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid 1001 --create-home --shell /bin/bash appuser
RUN (groupadd --gid 999 docker 2>/dev/null || groupadd docker 2>/dev/null || true) && \
    usermod -aG docker appuser

RUN mkdir -p /app/data /var/log/supervisor

# Ensure scripts are executable
RUN chmod +x /app/scripts/wait-for-api.sh /app/scripts/docker-entrypoint.sh

# Copy supervisord configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set ownership of writable directories to non-root user
RUN chown -R appuser:appuser /app/data /var/log/supervisor /app/tiktoken-cache

# Runtime API URL Configuration
# The API_URL environment variable can be set at container runtime to configure
# where the frontend should connect to the API. This allows the same Docker image
# to work in different deployment scenarios without rebuilding.
# Example: docker run -e API_URL=https://your-domain.com/api ...

# Entrypoint fixes docker socket GID at runtime, then execs CMD as appuser
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
