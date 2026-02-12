# Arrow Tracker - Product Requirements Document

## Original Problem Statement
Archery scoring application for tracking shots, viewing history, and generating reports. The app targets archers who want to record and analyze their practice sessions.

## Core Requirements
- Score archery rounds with accurate target visualization
- View round history with shot details
- Generate PDF reports
- Deploy to Google Play Store

## User Personas
- Recreational and competitive archers
- Users who want to track their progress over time

## Tech Stack
- **Frontend**: React Native with Expo
- **Routing**: Expo Router
- **State Management**: Zustand
- **Local Storage**: AsyncStorage
- **Build/Deployment**: Expo Application Services (EAS)

## Current Version: 1.1.0 (versionCode: 7)

### Completed Features
- Indoor target visualization (1 blue, 2 red, 3 gold rings)
- Shot centering on target visualizations
- Round Details view with sorted shots and color-coded badges
- Round Summary with "X" score handling
- Navigation fixes (back button, save/discard modal)
- PDF report generation
- Transparent app icon
- **NEW**: Zoom-on-touch magnifier for precise arrow placement (Android native)
  - 2.5x zoom magnifier overlay
  - Drag to adjust position
  - Real-time score preview
  - Haptic feedback

### Configuration
- Package name: `com.arrowtracker.app`
- Version: `1.1.0`
- versionCode: `7`
- Owner: `hraimundo`
- Project ID: `deab2ec5-dd6f-49aa-9dbc-ea4663997ba5`
- Signing: Local keystore (`arrow-tracker.jks`)

## Key Files
- `frontend/app.json` - Expo config with package name and version
- `frontend/eas.json` - EAS build profiles
- `frontend/credentials.json` - Keystore credentials for signing
- `frontend/arrow-tracker.jks` - Android signing keystore
- `frontend/app/scoring.tsx` - Scoring screen with magnifier feature

## Deployment Instructions
1. Trigger EAS build: `eas build --platform android --profile production`
2. Download AAB from Expo dashboard
3. Upload to Google Play Console

## P0/P1/P2 Features Remaining
- None - application is feature complete

## Platform-Specific Behavior
- **Android (native)**: Full zoom-on-touch magnifier experience
- **Web**: Simple click-to-place (magnifier requires native touch events)

## Last Updated
December 2025 - Version 1.1.0 with zoom-on-touch magnifier
