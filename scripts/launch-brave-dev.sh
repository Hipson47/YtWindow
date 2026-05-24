#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE_DIR="${BRAVE_DEV_PROFILE:-$ROOT_DIR/.brave-dev-profile}"

mkdir -p "$PROFILE_DIR"

launch_brave() {
  local executable="$1"
  local extension_path="$ROOT_DIR"
  local profile_path="$PROFILE_DIR"
  shift

  if [[ "$executable" == *.exe ]] && command -v wslpath >/dev/null 2>&1; then
    extension_path="$(wslpath -w "$ROOT_DIR")"
    profile_path="$(wslpath -w "$PROFILE_DIR")"
  fi

  exec "$executable" \
    --user-data-dir="$profile_path" \
    --load-extension="$extension_path" \
    --no-first-run \
    "$@"
}

for candidate in brave-browser brave; do
  if command -v "$candidate" >/dev/null 2>&1; then
    launch_brave "$candidate" "$@"
  fi
done

WINDOWS_BRAVE="/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"
if [[ -x "$WINDOWS_BRAVE" ]]; then
  launch_brave "$WINDOWS_BRAVE" "$@"
fi

cat >&2 <<EOF
Could not find Brave.

Tried:
- brave-browser
- brave
- $WINDOWS_BRAVE

Install Brave in WSL/Linux, or run Brave manually with:
  brave-browser --user-data-dir="$PROFILE_DIR" --load-extension="$ROOT_DIR" --no-first-run
EOF

exit 1
