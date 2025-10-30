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
    
    # Define compatible AGP/Gradle versions that work with SDK 31
    PINNED_AGP_VERSION="7.4.2"
    PINNED_GRADLE_VERSION="7.6.3" # This is a known-good Gradle version for AGP 7.4.x

    # Define the project file paths
    PROJECT_BUILD_GRADLE="workspace/AwesomeProject/android/build.gradle"
    WRAPPER_PROPERTIES="workspace/AwesomeProject/android/gradle/wrapper/gradle-wrapper.properties"

    # 1. Pin SDK versions (Targets the 'ext' block)
    echo "Pinning SDK versions to $PINNED_SDK_VERSION..."
    sed -i -E "s/compileSdkVersion = [0-9]+/compileSdkVersion = $PINNED_SDK_VERSION/" "$PROJECT_BUILD_GRADLE"
    sed -i -E "s/targetSdkVersion = [0-9]+/targetSdkVersion = $PINNED_SDK_VERSION/" "$PROJECT_BUILD_GRADLE"
    sed -i -E "s/buildToolsVersion = \"[0-9.]+\"/buildToolsVersion = \"$PINNED_BUILD_TOOLS_VERSION\"/" "$PROJECT_BUILD_GRADLE"

    # 2. (CORRECTED) Pin AGP version (Targets the 'agpVersion' var in the 'ext' block)
    echo "Pinning AGP to $PINNED_AGP_VERSION..."
    sed -i -E "s/agpVersion = \"[0-9.]+\"/agpVersion = \"$PINNED_AGP_VERSION\"/" "$PROJECT_BUILD_GRADLE"

    # 3. (CORRECTED) Pin Gradle Wrapper version (Matches any version/suffix like -bin.zip)
    echo "Pinning Gradle Wrapper to $PINNED_GRADLE_VERSION..."
    sed -i -E "s/gradle-[0-9.]+(.*).zip/gradle-$PINNED_GRADLE_VERSION-all.zip/" "$WRAPPER_PROPERTIES"

    echo "Versions pinned."

    echo "Enforcing version consistency across all sub-projects..."
    # 4. Your subproject enforcer (Appends to the end of the file)
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

    # --- Your existing setup continues below ---

# ... after the "--- END PINNING ---" EOL block ...
    echo "Sub-project enforcement added."
    # --- END NEW PINNING SCRIPT ---

    # --- START NEW JAVA FIX (Corrected) ---
    echo "Fixing Java toolchain vs. compatibility conflict..."
    
    # The 'npx init' template adds BOTH toolchain and compileOptions
    # to the ROOT build.gradle, causing a conflict.
    # We will remove the old 'compileOptions' block from the
    # ROOT build.gradle file.
    #
    # The $PROJECT_BUILD_GRADLE variable was already defined in the
    # pinning script as:
    # "workspace/AwesomeProject/android/build.gradle"
    
    if [ -f "$PROJECT_BUILD_GRADLE" ]; then
        # This sed command finds 'compileOptions {' and deletes
        # it and the 3 lines that follow it.
        sed -i -E "/compileOptions \{/,+3d" "$PROJECT_BUILD_GRADLE"
        echo "Removed conflicting compileOptions block from $PROJECT_BUILD_GRADLE."
    else
        echo "Warning: $PROJECT_BUILD_GRADLE not found, skipping Java fix."
    fi
    # --- END NEW JAVA FIX ---

        
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
