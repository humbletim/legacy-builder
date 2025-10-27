# React Native: Wash, Rinse, Repeat, Shine!

This project provides a turn-key command-line experience for experimenting with React Native for Android. It's designed to be a self-contained, zen-like environment where you can focus on creating without getting bogged down in complex setup.

## The Experience

The core of this project is a series of simple shell scripts:

*   **`wash.bash`**: Prepares your local, in-tree development environment. It downloads a private copy of Node.js, the Java Development Kit (JDK), and the Android SDK. This might take a few minutes on the first run, but subsequent runs will be much faster.
*   **`rinse.bash`**: Verifies that your environment is ready to go and installs all the necessary Node.js dependencies.
*   **`repeat.bash`**: This is your main creative loop. After you make changes to your components in the `src/` folder, run this script to build a new Android APK.
*   **`shine.bash`**: Once you have a successful build, use this script to install the app on a connected Android device or emulator.

## How to Get Started

1.  Clone this repository.
2.  Run the scripts in order:
    ```bash
    bash scripts/wash.bash
    bash scripts/rinse.bash
    bash scripts/repeat.bash
    bash scripts/shine.bash
    ```

## Your Creative Space

All your application code lives in the `src/` directory. You can add new components (e.g., `MyComponent.jsx`) to this folder and then import them into `src/App.js`. The build process will automatically handle the rest.

---

## Advanced Experiments (For the Curious)

Want to tinker a bit more? Here are a few "no-frills" ways to personalize your app.

### Changing the App Name

1.  Open the following file: `workspace/AwesomeProject/android/app/src/main/res/values/strings.xml`
2.  Find the line that looks like this: `<string name="app_name">AwesomeProject</string>`
3.  Change `AwesomeProject` to your desired app name.
4.  Run `bash scripts/repeat.bash` to rebuild the app with the new name.

### Changing the App Icon

1.  Prepare your new app icon in various sizes (e.g., 48x48, 72x72, 96x96, etc.).
2.  Replace the existing `ic_launcher.png` and `ic_launcher_round.png` files in the following directories with your new icon files:
    *   `workspace/AwesomeProject/android/app/src/main/res/mipmap-mdpi/`
    *   `workspace/AwesomeProject/android/app/src/main/res/mipmap-hdpi/`
    *   `workspace/AwesomeProject/android/app/src/main/res/mipmap-xhdpi/`
    *   `workspace/AwesomeProject/android/app/src/main/res/mipmap-xxhdpi/`
    *   `workspace/AwesomeProject/android/app/src/main/res/mipmap-xxxhdpi/`
3.  Run `bash scripts/repeat.bash` to rebuild the app with the new icon.
