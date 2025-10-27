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

# 3. Check for a connected device
echo "Checking for connected devices..."
if ! adb devices | grep -q "device$"; then
    echo "Error: No device found."
    echo "Please connect an Android device or start an emulator and ensure it's recognized by adb."
    exit 1
fi

# 4. Install the application
echo "Installing the application..."
adb install -r "$APK_PATH"

echo "--- Shine Cycle Complete ---"
echo "Success! The application has been installed on your device."
