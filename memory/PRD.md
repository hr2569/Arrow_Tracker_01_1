# Arrow Tracker - Product Requirements Document

## Overview
Arrow Tracker is a React Native (Expo) archery scoring application for Android and iOS. It allows archers to track their shots, record scores, and analyze their performance.

## Core Features

### Session Management
- Create training and competition sessions
- Record rounds with multiple arrow shots
- Support for different target types:
  - WA Standard (10-ring target)
  - Vegas 3-Spot
  - WA Indoor (NFAA Indoor)

### Scoring
- Touch-to-place arrows on target faces
- **Zoom-on-touch feature (v1.1.0)**: On native platforms, touching the target zooms in for easier arrow placement (similar to MyTargets app)
- Score calculation based on ring position
- X-ring tracking (inner 10)

### Equipment Tracking
- Manage multiple bows with specifications
- Associate bows with sessions

### History & Analytics
- View session history with filtering
- Shot distribution visualization (scatter plot)
- Score trends over time

## Technical Stack
- **Frontend**: React Native with Expo
- **Storage**: AsyncStorage (client-side)
- **Navigation**: Expo Router

## Version History

### v1.1.0 (Current)
- Added zoom-on-touch feature for native arrow placement
- Fixed double-click bug in gesture handling (stale closure issue with useRef solution)
- Updated app icon with transparent background

### v1.0.6
- App icon updates
- Version code updates for Play Store

## App Configuration
- Package name: `com.arrowtracker.app`
- Owner: `hraimundo`
- Project ID: `deab2ec5-dd6f-49aa-9dbc-ea4663997ba5`

## Key Files
- `frontend/app/scoring.tsx` - Main scoring screen with zoom-on-touch feature
- `frontend/app/history.tsx` - Session history and statistics
- `frontend/app.json` - Expo configuration

## Known Technical Notes
- Zoom-on-touch is native-only; web uses simple click-to-place
- Uses refs alongside state to avoid stale closure issues in responder callbacks
