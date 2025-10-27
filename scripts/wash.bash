#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Platform Detection ---
OS="`uname`"
ARCH="`uname -m`"
case ${OS} in
  'Linux')
    PLATFORM='linux'
    ;;
  'MINGW64_NT-10.0'|'MSYS_NT-10.0')
    PLATFORM='windows'
    ;;
  *)
    echo "Unsupported OS: ${OS}"
    exit 1
    ;;
esac

# --- Configuration ---
NODE_VERSION="20.19.5"
JDK_VERSION="17.0.10"
ANDROID_TOOLS_VERSION="10406996"

if [ "$PLATFORM" == "windows" ]; then
    NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip"
    JDK_URL="https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip"
    ANDROID_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-win-${ANDROID_TOOLS_VERSION}_latest.zip"
    SDK_MANAGER="sdkmanager.bat"
else # linux
    NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
    JDK_URL="https://aka.ms/download-jdk/microsoft-jdk-17-linux-x64.tar.gz"
    ANDROID_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_TOOLS_VERSION}_latest.zip"
    SDK_MANAGER="sdkmanager"
fi

# --- Helper Functions ---
download_and_extract() {
    local url="$1"
    local dest_dir="$2"
    local archive_name=$(basename "$url")

    if [ -d "$dest_dir" ]; then
        echo "Found '$dest_dir', skipping download."
        return
    fi

    echo "Downloading '$archive_name'..."
    curl -L -o "$archive_name" "$url"

    echo "Extracting '$archive_name'..."
    if [[ "$archive_name" == *.zip ]]; then
        unzip -q "$archive_name" -d .
        local extracted_folder=$(unzip -l "$archive_name" | awk 'NR==4{print $4}' | cut -d'/' -f1)
    elif [[ "$archive_name" == *.tar.gz ]]; then
        tar -xzf "$archive_name"
        local extracted_folder=$(tar -tzf "$archive_name" | head -1 | cut -d'/' -f1)
    elif [[ "$archive_name" == *.tar.xz ]]; then
        tar -xJf "$archive_name"
        local extracted_folder=$(tar -tJf "$archive_name" | head -1 | cut -d'/' -f1)
    fi

    mv "$extracted_folder" "$dest_dir"
    rm "$archive_name"
    echo "Done."
}


# --- Main Script ---
echo "--- Starting Wash Cycle (Platform: $PLATFORM) ---"

# Ensure the local directory exists before changing into it.
mkdir -p local
cd local

echo "STEP 1: Preparing Node.js..."
# 1. Download and set up Node.js
download_and_extract "$NODE_URL" "node"
echo "STEP 1 COMPLETE."

echo "STEP 2: Preparing OpenJDK..."
# 2. Download and set up OpenJDK
download_and_extract "$JDK_URL" "jdk"
echo "STEP 2 COMPLETE."

echo "STEP 3: Preparing Android SDK..."
# 3. Download and set up Android SDK
mkdir -p android-sdk/cmdline-tools
download_and_extract "$ANDROID_TOOLS_URL" "android-sdk/cmdline-tools/latest"
echo "STEP 3 COMPLETE."

echo "STEP 4: Installing Android SDK components..."
# 4. Install Android SDK components
ANDROID_CMD_TOOLS_PATH="android-sdk/cmdline-tools/latest/bin"
echo "Accepting licenses..."
yes | ./"$ANDROID_CMD_TOOLS_PATH/$SDK_MANAGER" --licenses > /dev/null
echo "Installing SDK packages..."
./"$ANDROID_CMD_TOOLS_PATH/$SDK_MANAGER" "platform-tools" "platforms;android-31" "build-tools;31.0.0" > /dev/null
echo "SDK packages installed."

# 5. Create the environment file
echo "Generating environment file..."
(
    echo "export JAVA_HOME=$(pwd)/jdk"
    echo "export ANDROID_SDK_ROOT=$(pwd)/android-sdk"
    echo "export PATH=$(pwd)/node/bin:$(pwd)/jdk/bin:$(pwd)/android-sdk/platform-tools:$(pwd)/android-sdk/cmdline-tools/bin:\$PATH"
) > env

echo "--- Wash Cycle Complete ---"
echo "Ready for rinse.bash"
