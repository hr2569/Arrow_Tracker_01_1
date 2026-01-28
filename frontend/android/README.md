# Archery Scorer - Native Android App

## Overview

This is a fully **native Android app** built with **Kotlin** and **Jetpack Compose**. It does NOT require React Native, Node.js, or Expo to build and run.

## Prerequisites

1. **Android Studio** (Hedgehog 2023.1.1 or newer)
2. **JDK 17** (bundled with Android Studio)
3. **Android SDK** with:
   - Android SDK Platform 34 (Android 14)
   - Android SDK Build-Tools 34.0.0

## Quick Start

### 1. Download the Project
Download the `frontend/android` folder from Emergent.

### 2. Open in Android Studio
1. Open Android Studio
2. Select **File → Open**
3. Navigate to the `android` folder
4. Click **OK**

### 3. Configure Backend URL
Before building, update the backend API URL in `app/build.gradle`:

```gradle
buildConfigField "String", "BACKEND_URL", '"https://your-backend-url.com"'
```

### 4. Build & Run
1. Wait for Gradle sync to complete
2. Connect an Android device or start an emulator
3. Click **Run** (green play button) or press `Shift+F10`

## Building APK

### Debug APK (for testing)
```bash
cd android
./gradlew assembleDebug
```
APK location: `app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for distribution)
1. Go to **Build → Generate Signed Bundle / APK**
2. Select **APK** → **Next**
3. Create or select a keystore
4. Select **release** variant
5. Click **Finish**

APK location: `app/build/outputs/apk/release/app-release.apk`

## Project Structure

```
android/
├── app/
│   ├── build.gradle                    # App-level build config
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/archeryscorer/app/
│       │   ├── MainActivity.kt         # Entry point
│       │   ├── MainViewModel.kt        # App state management
│       │   ├── ArcheryScorerApp.kt     # Application class
│       │   ├── data/
│       │   │   ├── model/Models.kt     # Data classes
│       │   │   ├── api/                # Retrofit API
│       │   │   └── repository/         # Data repository
│       │   ├── navigation/
│       │   │   └── AppNavigation.kt    # Navigation setup
│       │   └── ui/
│       │       ├── theme/              # Colors & theming
│       │       ├── components/         # Reusable UI components
│       │       └── screens/            # App screens
│       └── res/
│           └── values/                 # Resources
├── build.gradle                        # Root build config
├── settings.gradle                     # Project settings
└── gradle.properties                   # Gradle configuration
```

## Features

- **Manual Scoring**: Tap on target to record arrow positions
- **Multiple Target Types**: WA Standard, Vegas 3-Spot, NFAA Indoor
- **Session Management**: Track rounds, scores, and history
- **Bow Management**: Store and select different bows
- **Dark Theme**: Optimized for outdoor visibility

## Screens

| Screen | Description |
|--------|-------------|
| Home | Main menu with navigation options |
| Session Setup | Select target type, distance, and bow |
| Scoring | Interactive target face for recording shots |
| Summary | Session results and round details |
| History | View all past sessions |
| Bows | Manage your equipment |
| Settings | App preferences |

## Tech Stack

- **Language**: Kotlin
- **UI**: Jetpack Compose + Material 3
- **Navigation**: Navigation Compose
- **Networking**: Retrofit + OkHttp
- **State Management**: StateFlow + ViewModel
- **Architecture**: MVVM

## API Endpoints

The app connects to a FastAPI backend with these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create new session |
| DELETE | `/api/sessions/{id}` | Delete session |
| POST | `/api/sessions/{id}/rounds` | Add round to session |
| GET | `/api/bows` | List all bows |
| POST | `/api/bows` | Create new bow |
| DELETE | `/api/bows/{id}` | Delete bow |

## Troubleshooting

### Gradle sync failed
- Ensure internet connection is stable
- Try **File → Invalidate Caches / Restart**

### Build errors
- Verify JDK 17 is set: **File → Settings → Build → Gradle → Gradle JDK**
- Ensure Android SDK 34 is installed

### App crashes
- Check logcat for error messages
- Verify backend URL is correct and server is running

## License

MIT License
