#!/usr/bin/env bash
# Launch recrd in Expo Go on a booted iOS Simulator.
#
# `npx expo start --ios` does not work with Xcode 27: it looks for
# Simulator.app under Contents/Developer/Applications, which Apple removed.
# simctl still works, so this boots the device and opens the exp:// URL itself.
set -euo pipefail

PORT="${PORT:-8081}"
DEVICE="${DEVICE:-}"
EXPO_GO_ID="host.exp.Exponent"

cd "$(dirname "$0")/.."

# ── pick a simulator ─────────────────────────────────────────────────────
if [ -z "$DEVICE" ]; then
  DEVICE=$(xcrun simctl list devices booted -j \
    | python3 -c 'import sys,json; d=json.load(sys.stdin)["devices"]; print(next((x["udid"] for v in d.values() for x in v), ""))')
fi

if [ -z "$DEVICE" ]; then
  echo "No booted simulator. Booting one..."
  DEVICE=$(xcrun simctl list devices available -j \
    | python3 -c 'import sys,json; d=json.load(sys.stdin)["devices"]; print(next((x["udid"] for k,v in sorted(d.items()) if "iOS" in k for x in v if "iPhone" in x["name"]), ""))')
  [ -n "$DEVICE" ] || { echo "No iPhone simulator available. Install one via Xcode > Settings > Components."; exit 1; }
  xcrun simctl boot "$DEVICE"
fi
echo "Simulator: $DEVICE"

# ── make sure the Expo Go matching this SDK is installed ─────────────────
SDK=$(python3 -c 'import json;print(json.load(open("package.json"))["dependencies"]["expo"].lstrip("^~").split(".")[0])')

INSTALLED=""
if xcrun simctl listapps "$DEVICE" | grep -q "$EXPO_GO_ID"; then
  INSTALLED=$(defaults read \
    "$(xcrun simctl get_app_container "$DEVICE" "$EXPO_GO_ID")/Info.plist" \
    CFBundleShortVersionString 2>/dev/null || true)
fi

# Expo Go is versioned per SDK, so a client left over from an older SDK cannot
# open this project. Reinstall whenever its major does not match ours.
if [ "${INSTALLED%%.*}" != "$SDK" ]; then
  if [ -n "$INSTALLED" ]; then
    echo "Expo Go $INSTALLED is for SDK ${INSTALLED%%.*}; fetching the SDK $SDK client..."
  else
    echo "Expo Go not installed; fetching the SDK $SDK client..."
  fi
  URL=$(curl -fsSL https://api.expo.dev/v2/versions/latest \
    | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['sdkVersions']['${SDK}.0.0']['iosClientUrl'])")
  TMP=$(mktemp -d)
  curl -fsSL -o "$TMP/expogo.tar.gz" "$URL"
  # The tarball holds the bundle's contents, not a wrapping .app directory.
  mkdir -p "$TMP/Expo Go.app"
  tar -xzf "$TMP/expogo.tar.gz" -C "$TMP/Expo Go.app"
  xcrun simctl install "$DEVICE" "$TMP/Expo Go.app"
  rm -rf "$TMP"
  echo "Expo Go for SDK $SDK installed."
fi

# ── start Metro if it is not already up ──────────────────────────────────
if ! curl -fsS -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
  echo "Starting Metro on :$PORT..."
  npx expo start --port "$PORT" &
  until curl -fsS -o /dev/null "http://localhost:$PORT" 2>/dev/null; do sleep 1; done
fi

xcrun simctl openurl "$DEVICE" "exp://127.0.0.1:$PORT"
open -a Simulator 2>/dev/null || true
echo "Opened recrd in Expo Go."
wait
