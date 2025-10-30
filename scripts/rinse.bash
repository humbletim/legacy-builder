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
# [SOURCE 8]
# 3. Initialize React Native project if it doesn't exist
if [ ! -d "workspace/AwesomeProject/android" ];
then
    echo "React Native project not found. Initializing..."
    # Clean the workspace directory before initializing
    rm -rf workspace/*
    mkdir workspace
    (cd workspace && npx @react-native-community/cli init AwesomeProject)

# --- START NEW PINNING SCRIPT (Corrected) ---
    echo "Pinning Gradle project to match wash.bash settings (SDK 31)..."

    # Define the pinned versions from wash.bash
    PINNED_SDK_VERSION=31
    PINNED_BUILD_TOOLS_VERSION="31.0.0"
    
    # Define compatible AGP/Gradle/Kotlin versions that work with SDK 31
    PINNED_AGP_VERSION="7.4.2"
    PINNED_GRADLE_VERSION="7.6.3"
    PINNED_KOTLIN_VERSION="1.8.20"

    # Define the project file paths
    PROJECT_BUILD_GRADLE="workspace/AwesomeProject/android/build.gradle"
    WRAPPER_PROPERTIES="workspace/AwesomeProject/android/gradle/wrapper/gradle-wrapper.properties"

    # 1. Pin SDK versions (This part was already working)
    echo "Pinning SDK versions to $PINNED_SDK_VERSION..."
    sed -i -E "s/compileSdkVersion = [0-9]+/compileSdkVersion = $PINNED_SDK_VERSION/" "$PROJECT_BUILD_GRADLE"
    sed -i -E "s/targetSdkVersion = [0-9]+/targetSdkVersion = $PINNED_SDK_VERSION/" "$PROJECT_BUILD_GRADLE"
    sed -i -E "s/buildToolsVersion = \"[0-9.]+\"/buildToolsVersion = \"$PINNED_BUILD_TOOLS_VERSION\"/" "$PROJECT_BUILD_GRADLE"

    # 2. (THE REAL FIX) Pin AGP version by editing the 'classpath' line
    echo "Pinning AGP to $PINNED_AGP_VERSION..."
    sed -i "s/classpath(\"com.android.tools.build:gradle\")/classpath(\"com.android.tools.build:gradle:$PINNED_AGP_VERSION\")/" "$PROJECT_BUILD_GRADLE"

    # 3. (THE REAL FIX) Pin Kotlin plugin version by editing the 'classpath' line
    echo "Pinning Kotlin plugin to $PINNED_KOTLIN_VERSION..."
    sed -i "s/classpath(\"org.jetbrains.kotlin:kotlin-gradle-plugin\")/classpath(\"org.jetbrains.kotlin:kotlin-gradle-plugin:$PINNED_KOTLIN_VERSION\")/" "$PROJECT_BUILD_GRADLE"

    # 4. (THE REAL FIX) Pin Kotlin *language* version in the 'ext' block
    echo "Pinning Kotlin language version to $PINNED_KOTLIN_VERSION..."
    sed -i -E "s/kotlinVersion = \"[0-9.]+\"/kotlinVersion = \"$PINNED_KOTLIN_VERSION\"/" "$PROJECT_BUILD_GRADLE"

    # 5. Pin Gradle Wrapper (This part was also working)
    echo "Pinning Gradle Wrapper to $PINNED_GRADLE_VERSION..."
    sed -i -E "s/gradle-[0-9.]+(.*).zip/gradle-$PINNED_GRADLE_VERSION-all.zip/" "$WRAPPER_PROPERTIES"

    echo "Versions pinned."

    # 6. Your subproject enforcer (This was always correct)
    echo "Enforcing version consistency across all sub-projects..."
    cat >> "$PROJECT_BUILD_GRADLE" << EOL

// --- START PINNING (Added by rinse.bash) ---
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

    # 7. (Just in case) Remove the 'compileOptions' block that my
    #    previous failed theories tried to remove.
    echo "Fixing Java toolchain vs. compatibility conflict..."
    if [ -f "$PROJECT_BUILD_GRADLE" ]; then
        sed -i '/compileOptions {/,/}/d' "$PROJECT_BUILD_GRADLE"
        echo "Removed any conflicting compileOptions block from $PROJECT_BUILD_GRADLE."
    fi
    # --- END NEW PINNING SCRIPT ---


        
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
else
    echo "React Native project found. Skipping initialization."
fi
# [SOURCE 15]

# 4. Install Node.js dependencies
echo "Installing Node.js dependencies..."
(cd workspace/AwesomeProject && npm install)
echo "Dependencies installed."


echo "--- Rinse Cycle Complete ---"
echo "Ready for repeat.bash"
