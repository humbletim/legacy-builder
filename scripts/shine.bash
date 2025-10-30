#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting Shine Cycle ---"

# 1. Source the environment file to bring in the local toolchain
echo "Activating local toolchain..."
if [ -f "local/env" ]; then
    source "local/env"
else
    echo "Error: local/env not found. Please run wash.bash first."
    exit 1
fi

# 2. Check for the APK file
APK_PATH="dist/AwesomeProject-debug.apk"
if [ ! -f "$APK_PATH" ]; then
    echo "Error: APK not found at $APK_PATH"
    echo "Please run repeat.bash to build the application first."
    exit 1
fi

# 3. Set up the Android Virtual Device (AVD)
AVD_NAME="shine-avd"
echo "Checking for AVD '$AVD_NAME'..."
if [ ! -d "$ANDROID_AVD_HOME/$AVD_NAME.avd" ]; then
    echo "AVD not found. Creating..."
    timeout 60 echo "no" | avdmanager --verbose create avd --name "$AVD_NAME" --package "system-images;android-34;google_apis;x86_64" --device "pixel" --force || true
    if [ ! -d "$ANDROID_AVD_HOME/$AVD_NAME.avd" ]; then
        echo "Error: AVD creation failed or timed out."
        exit 1
    fi
else
    echo "AVD found."
fi

# 4. Launch the emulator
echo "Starting emulator..."
emulator -avd "$AVD_NAME" -no-window -no-snapshot-load -wipe-data &
EMULATOR_PID=$!

# 5. Wait for the emulator to be ready
echo "Waiting for emulator to boot..."
adb wait-for-device
while [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" != "1" ]; do
    sleep 1
done
echo "Emulator booted."

# 6. Push test file to device
echo "Pushing test file to device..."
adb push assets/test.html /sdcard/Download/test.html

# 7. Unlock the screen
adb shell input keyevent 82

# 8. Install the application
echo "Installing the application..."
adb install -r "$APK_PATH"

# 9. Launch the application
echo "Launching the application..."
adb shell am start -n com.awesomeproject/.MainActivity

# 10. Smoke test & Verification
echo "Running smoke test (waiting 10s for app to load)..."
sleep 10
echo "Taking screenshot for verification..."
adb shell screencap -p /sdcard/shine-screenshot.png
adb pull /sdcard/shine-screenshot.png dist/
adb shell rm /sdcard/shine-screenshot.png
echo "Screenshot saved to dist/shine-screenshot.png"

# 11. Shut down the emulator
echo "Shutting down emulator..."
adb emu kill

echo "--- Shine Cycle Complete ---"
echo "Success! The application was launched in the emulator."
