#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE_DIR="${BRAVE_DEV_PROFILE:-$ROOT_DIR/.brave-dev-profile}"

windows_temp_dir() {
  local windows_temp
  windows_temp="$(cmd.exe /C "echo %TEMP%" 2>/dev/null | tr -d '\r' | tail -n 1 || true)"

  if [[ -n "$windows_temp" ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -u "$windows_temp"
    return
  fi

  printf '%s\n' "/mnt/c/Users/$USER/AppData/Local/Temp"
}

sync_extension_for_windows_brave() {
  local temp_root="$1"
  local extension_copy="$temp_root/wtyczka-native-pip-extension"

  rm -rf "$extension_copy"
  mkdir -p "$extension_copy"
  cp -R \
    "$ROOT_DIR/manifest.json" \
    "$ROOT_DIR/background.js" \
    "$ROOT_DIR/src" \
    "$extension_copy/"

  printf '%s\n' "$extension_copy"
}

launch_brave() {
  local executable="$1"
  local extension_path="$ROOT_DIR"
  local profile_path="$PROFILE_DIR"
  shift

  if [[ "$executable" == *.exe ]] && command -v wslpath >/dev/null 2>&1; then
    local windows_temp
    local extension_copy
    windows_temp="$(windows_temp_dir)"
    profile_path="${BRAVE_DEV_PROFILE:-$windows_temp/wtyczka-brave-dev-profile}"
    extension_copy="$(sync_extension_for_windows_brave "$windows_temp")"
    extension_path="$extension_copy"
    mkdir -p "$profile_path"

    extension_path="$(wslpath -w "$extension_copy")"
    profile_path="$(wslpath -w "$profile_path")"
  else
    mkdir -p "$profile_path"
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
