# Archery Scorer - Android Studio Build Instructions

## Prerequisites

1. **Android Studio** (Latest version recommended - Hedgehog or newer)
2. **JDK 17** (bundled with Android Studio)
3. **Android SDK** with:
   - Android SDK Platform 34 (Android 14)
   - Android SDK Build-Tools 34.0.0
   - Android SDK Command-line Tools

## Setup Steps

### 1. Download the Project
Download the entire `frontend` folder from Emergent.

### 2. Open in Android Studio
1. Open Android Studio
2. Select **"Open"** (not "New Project")
3. Navigate to the `frontend/android` folder
4. Click **"OK"** to open

### 3. Wait for Gradle Sync
Android Studio will automatically start syncing Gradle. This may take a few minutes on the first run as it downloads dependencies.

### 4. Configure Backend URL (Important!)
Before building, you need to set your backend API URL:

1. Open `frontend/.env` file
2. Update `EXPO_PUBLIC_BACKEND_URL` to your production backend URL:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
   ```

   **Note:** If you're testing locally, you can use your computer's local IP (not `localhost`) like:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8001
   ```

### 5. Build the APK

#### Debug APK (for testing):
1. In Android Studio, go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for the build to complete
3. Click **"locate"** in the notification to find the APK
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Release APK (for distribution):
1. Go to **Build → Generate Signed Bundle / APK**
2. Select **APK** and click **Next**
3. Create a new keystore or use an existing one:
   - Click **Create new...** for a new keystore
   - Fill in the keystore details (remember your passwords!)
4. Select **release** build variant
5. Click **Finish**
6. APK location: `android/app/build/outputs/apk/release/app-release.apk`

## Alternative: Command Line Build

If you prefer building from the command line:

```bash
cd frontend/android

# Debug build
./gradlew assembleDebug

# Release build (requires signing configuration)
./gradlew assembleRelease
```

## App Configuration

The app is configured with:
- **Package Name:** `com.archeryscorer.app`
- **App Name:** Archery Scorer
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)

## Troubleshooting

### Gradle sync failed
- Ensure you have a stable internet connection
- Try **File → Invalidate Caches / Restart**
- Update Android Studio to the latest version

### Build failed with SDK errors
- Open **SDK Manager** (Tools → SDK Manager)
- Install Android SDK Platform 34
- Install Android SDK Build-Tools 34.0.0

### App crashes on launch
- Check that `EXPO_PUBLIC_BACKEND_URL` is correctly set
- Ensure the backend server is running and accessible
- Check logcat in Android Studio for error details

## Testing the APK

1. Transfer the APK to your Android device
2. On your device, enable **"Install from unknown sources"** in settings
3. Open the APK file to install
4. Launch **Archery Scorer** from your app drawer

## Project Structure

```
frontend/
├── android/           # Native Android project (open this in Android Studio)
│   ├── app/          # Main Android app module
│   ├── build.gradle  # Root build configuration
│   └── settings.gradle
├── app/              # React Native/Expo screens
├── assets/           # Images and icons
├── .env              # Environment variables (configure backend URL here)
└── package.json      # Node.js dependencies
```

## Notes

- This is an **Android-only** build. iOS support has been removed.
- The app uses a dark theme optimized for outdoor use.
- All scoring is manual (tap-to-score on target face).
