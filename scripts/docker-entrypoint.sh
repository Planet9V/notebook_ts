#!/bin/bash
# Entrypoint wrapper: dynamically fix the docker group GID to match
# the mounted /var/run/docker.sock so appuser can talk to the daemon.
# Runs as root; supervisord manages per-process user via user=appuser.

set -e

SOCKET=/var/run/docker.sock

if [ -S "$SOCKET" ]; then
  SOCK_GID=$(stat -c '%g' "$SOCKET" 2>/dev/null)
  if [ -n "$SOCK_GID" ] && [ "$SOCK_GID" != "0" ]; then
    # Change the docker group's GID to match the socket owner
    groupmod -g "$SOCK_GID" docker 2>/dev/null || true
  fi
  # If the socket is owned by root (GID 0), make it group-readable
  if [ "$SOCK_GID" = "0" ]; then
    chmod 666 "$SOCKET" 2>/dev/null || true
  fi
fi

# Fix ownership of runtime directories
chown -R appuser:appuser /app/data /var/log/supervisor 2>/dev/null || true

# Exec CMD (supervisord runs as root, child processes run as appuser)
exec "$@"
