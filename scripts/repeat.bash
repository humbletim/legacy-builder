#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting Repeat Cycle ---"

cleanup_function() {
  echo "Script is exiting. Performing cleanup..."
  taskkill -IM java.exe -f || true
  echo "Cleanup complete."
}

trap cleanup_function EXIT
# 1. Source the environment file to bring in the local toolchain
echo "Activating local toolchain..."
if [ -f "local/env" ]; then
    source "local/env"
else
    echo "Error: local/env not found. Please run wash.bash first."
    exit 1
fi

# 2. Bundle the React Native code and assets
echo "Bundling React Native code and assets..."
(cd workspace/AwesomeProject && mkdir -p android/app/src/main/assets && npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res)

# 3. Build the Android application
echo "Building the Android application (debug)..."
(cd workspace/AwesomeProject/android && ./gradlew assembleDebug)

# 4. Copy the APK to the dist folder
echo "Copying APK to dist folder..."
mkdir -p dist
APK_PATH="workspace/AwesomeProject/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    cp "$APK_PATH" "dist/AwesomeProject-debug.apk"
else
    echo "Error: Build failed, APK not found at $APK_PATH"
    exit 1
fi

echo "--- Repeat Cycle Complete ---"
echo "Success! Your application has been built."
echo "You can install it on a connected device with:"
echo "adb install -r dist/AwesomeProject-debug.apk"
