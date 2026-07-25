#!/usr/bin/env bash
# Builds the WetFuel Driver Android debug APK end to end:
#   ng build -> npx cap sync android -> gradlew assembleDebug
# Run from anywhere, e.g.: bash wetfuel.driverapp/build-apk.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Portable JDK 21 - Capacitor's Android library requires it even though the system JAVA_HOME
# may be on JDK 17 for everything else. Set as a User env var already, but exported here too
# so this script works even in a shell that hasn't picked that up yet.
export JAVA_HOME="C:/build-tools/jdk-21.0.11+10"

echo "==> Building Angular app..."
npx ng build

echo "==> Syncing web build + plugins into the Android project..."
npx cap sync android

echo "==> Building the debug APK..."
cd android
./gradlew.bat assembleDebug
cd "$SCRIPT_DIR"

APK="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  echo ""
  echo "==> APK ready: $SCRIPT_DIR/$APK"
  ls -la "$APK"

  APP_VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")"
  APK_SIZE="$(du -h "$APK" | cut -f1)"
  NOTES_FILE="$SCRIPT_DIR/BUILD_NOTES.md"
  ENTRY="## Build $(date '+%Y-%m-%d %H:%M:%S')
- APK: \`$APK\`
- Size: $APK_SIZE
- App version: $APP_VERSION
"
  # Insert the new entry right after the fixed header (title + description, lines 1-3) so
  # newest stays on top without disturbing the header itself.
  { head -n 3 "$NOTES_FILE"; echo ""; echo "$ENTRY"; tail -n +4 "$NOTES_FILE"; } > "$NOTES_FILE.tmp"
  mv "$NOTES_FILE.tmp" "$NOTES_FILE"
  echo "==> Logged to $NOTES_FILE"
else
  echo "Build finished but the APK wasn't found at the expected path: $APK"
  exit 1
fi
