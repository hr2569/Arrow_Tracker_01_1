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
- **Magnifier Zoom Feature**: On native platforms, when touching and dragging on the target, a magnifier appears showing:
  - Circular magnifier centered on touch point with slight offset
  - Shows zoomed view of actual target rings plus existing arrows
  - Red crosshair for precise aiming (matches app theme)
  - Score badge shows current ring value
  - Arrow markers don't intercept touches during placement (can place arrows next to each other)
- Score calculation based on ring position
- X-ring tracking (inner 10)

### Equipment Tracking
- Manage multiple bows with specifications
- Associate bows with sessions

### History & Analytics
- View session history with filtering
- Shot distribution visualization (scatter plot)
- Score trends over time
- **Dynamic Stats by Time Period**: Stats (Sessions, Ends, Arrows, Total Pts) filter based on selected period (Day/Week/Month/Year/All)

### Settings (v2.0.0+)
- **Multi-language Support**: 9 languages supported
  - English (default), Portuguese, Spanish, French, Italian, Finnish, Swedish, Russian, Ukrainian
- Language preference saved locally
- Settings screen with:
  - Language selector
  - Backup & Restore option

## Technical Stack
- **Frontend**: React Native with Expo
- **Storage**: AsyncStorage (client-side)
- **Navigation**: Expo Router
- **i18n**: i18next + react-i18next

## Version History

### v2.0.0 (Current - February 2025)
- **NEW**: Multi-language support with 9 languages
  - English (default), Portuguese, Spanish, French, Italian, Finnish, Swedish, Russian, Ukrainian
- **NEW**: Settings screen accessible from home screen gear icon
  - Language selector with native language names
  - Backup & Restore option (moved from home screen)
- **IMPROVED**: All UI text is now translatable
- **UPDATED**: Version displayed on home screen as v2.0.0

### v1.1.05 (February 2025)
- **IMPROVED**: Magnifier shows existing arrows when zoomed
- **FIXED**: Arrow markers don't intercept touches during placement - allows placing arrows next to each other

### v1.1.04 (February 2025)
- **IMPROVED**: Magnifier positioned directly on touch point
- **FIXED**: Red crosshair lines instead of diamond reticle

### v1.1.03 (December 2025)
- **NEW**: Added "Arrows Shot" statistic to History Stats section
- **IMPROVED**: History stats now filter by selected time period (Day/Week/Month/Year)
- **IMPROVED**: Session report button made more visible (solid dark red background with white icon)

### v1.1.02 (December 2025)
- **IMPROVED**: Magnifier now appears at touch position (like MyTargets app)
- **NEW**: Added report button to each session in History menu
- **NEW**: Added heat map visualization to each session
- **IMPROVED**: Report screen now sorts sessions with most recent first

### v1.1.01
- Implemented initial "Magnifying Glass" zoom feature (side panel approach)
- Added version number display on home screen (bottom, gray text)

### v1.1.0
- Added zoom-on-touch feature for native arrow placement
- Fixed double-click bug in gesture handling
- Updated app icon with transparent background

### v1.0.6
- App icon updates
- Version code updates for Play Store

## App Configuration
- Package name: `com.arrowtracker.app`
- Owner: `hraimundo`
- Project ID: `deab2ec5-dd6f-49aa-9dbc-ea4663997ba5`

## Key Files
- `frontend/app/index.tsx` - Home screen with version display and settings button
- `frontend/app/settings.tsx` - Settings screen with language and backup options
- `frontend/app/scoring.tsx` - Main scoring screen with magnifier zoom feature
- `frontend/app/history.tsx` - Session history and statistics
- `frontend/i18n.ts` - i18n configuration
- `frontend/locales/*.json` - Translation files for 9 languages
- `frontend/app.json` - Expo configuration

## Known Technical Notes
- Magnifier zoom is native-only; web uses simple click-to-place
- Uses refs alongside state to avoid stale closure issues in responder callbacks
- Metro bundler may need restart (`sudo supervisorctl restart expo`) for changes to reflect
- Language preference is persisted in AsyncStorage

## Upcoming Tasks / Backlog
- Competition mode (currently disabled/"Coming Soon")
- PDF import functionality
- Advanced statistics and reporting
