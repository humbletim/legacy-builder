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

# 3. Initialize React Native project if it doesn't exist
if [ ! -d "workspace/AwesomeProject/android" ]; then
    echo "React Native project not found. Initializing..."
    # Clean the workspace directory before initializing
    rm -rf workspace/*
    mkdir workspace
    (cd workspace && npx @react-native-community/cli init AwesomeProject)


    # --- START NEW PINNING SCRIPT ---
    echo "Pinning Gradle project to match wash.bash settings (SDK 31)..."

    # Define the pinned versions from wash.bash
    PINNED_SDK_VERSION=31
    PINNED_BUILD_TOOLS_VERSION="31.0.0"

    # Define the project's build.gradle path
    PROJECT_BUILD_GRADLE="workspace/AwesomeProject/android/build.gradle"

    # Use sed to find/replace the default RN versions with YOUR pinned versions
    # This edits the ext { ... } block in android/build.gradle
    sed -i -E "s/compileSdkVersion = [0-9]+/compileSdkVersion = $PINNED_SDK_VERSION/" "$PROJECT_BUILD_GRADLE"
    sed -i -E "s/targetSdkVersion = [0-9]+/targetSdkVersion = $PINNED_SDK_VERSION/" "$PROJECT_BUILD_GRADLE"
    sed -i -E "s/buildToolsVersion = \"[0-9.]+\"/buildToolsVersion = \"$PINNED_BUILD_TOOLS_VERSION\"/" "$PROJECT_BUILD_GRADLE"

    echo "Versions pinned in $PROJECT_BUILD_GRADLE."

    echo "Enforcing version consistency across all sub-projects (react-native-fs)..."
    
    # This is the real pin. It bullies react-native-fs and all other
    # native modules into using YOUR SDK 31, not their own.
    # We append this to the end of android/build.gradle
    cat >> "$PROJECT_BUILD_GRADLE" << EOL

// --- START PINNING (Added by rinse.bash) ---
// Force all sub-projects (like react-native-fs) to use the
// root project's SDK versions, which we just pinned to SDK 31.
subprojects {
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            android {
                compileSdkVersion rootProject.ext.compileSdkVersion
                buildToolsVersion rootProject.ext.buildToolsVersion
            }
        }
    }
}
// --- END PINNING ---
EOL
    echo "Sub-project enforcement added."
    # --- END NEW PINNING SCRIPT ---




    echo "Configuring project for src/ directory..."
    # Update metro.config.js
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
else
    echo "React Native project found. Skipping initialization."
fi

# 4. Install Node.js dependencies
echo "Installing Node.js dependencies..."
(cd workspace/AwesomeProject && npm install)
echo "Dependencies installed."

echo "--- Rinse Cycle Complete ---"
echo "Ready for repeat.bash"
