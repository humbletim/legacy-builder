#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting Rinse Cycle ---"

# 1. Source the environment file to bring in the local toolchain
echo "Activating local toolchain..."
if [ -f "local/env" ]; then
    source "local/env"
else
    echo "Error: local/env not found. Please run wash.bash first."
    exit 1
fi

# 2. Verify that all required tools are available
echo "Verifying toolchain..."
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js not found. Aborting."; exit 1; }
command -v java >/dev/null 2>&1 || { echo >&2 "Java not found. Aborting."; exit 1; }
command -v adb >/dev/null 2>&1 || { echo >&2 "Android Debug Bridge (adb) not found. Aborting."; exit 1; }
echo "Toolchain verified."

# 3. Initialize React Native project
echo "Initializing fresh React Native project..."
rm -rf workspace
mkdir -p workspace
(cd workspace && npx @react-native-community/cli init AwesomeProject)

# --- Patch AndroidManifest.xml to add READ_EXTERNAL_STORAGE permission ---
MANIFEST_PATH="workspace/AwesomeProject/android/app/src/main/AndroidManifest.xml"

echo "Verifying AndroidManifest.xml exists at: $MANIFEST_PATH"
if [ ! -f "$MANIFEST_PATH" ]; then
    echo "Error: AndroidManifest.xml not found at the expected location." >&2
    echo "The react-native init process may have changed." >&2
    exit 1
fi
echo "AndroidManifest.xml found."

echo "Patching AndroidManifest.xml to add read permission..."
# Use sed to insert the permission before the <application> tag.
# Note the use of a backup file (.bak) for macOS compatibility.
sed -i.bak '/<application/i \
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
' "$MANIFEST_PATH" && rm "${MANIFEST_PATH}.bak"

echo "Verifying patch..."
if ! grep -q "android.permission.READ_EXTERNAL_STORAGE" "$MANIFEST_PATH"; then
    echo "Error: Failed to patch AndroidManifest.xml." >&2
    echo "The permission was not added correctly." >&2
    exit 1
fi
echo "AndroidManifest.xml patched and verified successfully."

echo "Configuring project for src/ directory..."
    # Update metro.config.js
    # [SOURCE 10]
    cat > workspace/AwesomeProject/metro.config.js << EOL
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const config = {
  watchFolders: [path.resolve(__dirname, '../..')],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    disableHierarchicalLookup: true,
  },
  projectRoot: path.resolve(__dirname),
};
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
EOL

    # Update babel.config.js
    cat > workspace/AwesomeProject/babel.config.js << EOL
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['../../'],
      },
    ],
  ],
};
EOL

    # Update index.js
    # [SOURCE 13]
    cat > workspace/AwesomeProject/index.js << EOL
/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from '../../src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
EOL

    echo "Installing additional dependencies..."
    (cd workspace/AwesomeProject && npm install --save-dev babel-plugin-module-resolver)
    (cd workspace/AwesomeProject && npm install --save react-native-webview @react-native-documents/picker react-native-fs)
# [SOURCE 15]

# 4. Install Node.js dependencies
echo "Installing Node.js dependencies..."
(cd workspace/AwesomeProject && npm install)
echo "Dependencies installed."


echo "--- Rinse Cycle Complete ---"
echo "Ready for repeat.bash"
