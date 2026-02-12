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
- **Magnifier Zoom Feature (v1.1.01+)**: On native platforms, when touching and dragging on the target, a magnifier box appears on the right side of the screen showing:
  - A colored preview based on the ring position
  - A crosshair indicator
  - The current score preview badge
  - "Drag to adjust" hint text
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

### v1.1.01 (Current - December 2025)
- **NEW**: Implemented "Magnifying Glass" zoom feature for precise arrow placement
  - Magnifier box appears on the right side when touching the target
  - Shows color-coded ring preview with crosshair
  - Displays current score while dragging
  - Main target remains zoomed out for context
- Added version number display on home screen (bottom, gray text)
- Removed old full-target zoom implementation (user feedback: blocked finger view)

### v1.1.0
- Added zoom-on-touch feature for native arrow placement (REPLACED in v1.1.01)
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
- `frontend/app/index.tsx` - Home screen with version display
- `frontend/app/scoring.tsx` - Main scoring screen with magnifier zoom feature
- `frontend/app/history.tsx` - Session history and statistics
- `frontend/app.json` - Expo configuration

## Known Technical Notes
- Magnifier zoom is native-only; web uses simple click-to-place
- Uses refs alongside state to avoid stale closure issues in responder callbacks
- Metro bundler may need restart (`sudo supervisorctl restart frontend`) for changes to reflect

## Upcoming Tasks / Backlog
- Competition mode (currently disabled/"Coming Soon")
- PDF import functionality
- Advanced statistics and reporting
