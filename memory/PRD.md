# Arrow Tracker - Product Requirements Document

## Overview
Arrow Tracker is a React Native (Expo) archery scoring application designed to help archers track their shots, analyze performance, and improve their aim.

## Version
Current: **v2.0.2**

## Core Features

### 1. Scoring System
- Real-time arrow placement on target faces
- Support for multiple target types (WA Standard, Vegas 3-Spot, WA Indoor)
- Round-based scoring with customizable arrows per round
- Zoom and pan functionality for precise arrow placement

### 2. Session Management
- Create and configure scoring sessions
- Select bow, distance, and target type
- Save and review completed sessions

### 3. History & Statistics
- View all past sessions
- Filter by day, week, month, year, or all time
- Detailed statistics including averages, shot distribution, and heatmaps

### 4. Equipment Management (Bows)
- Add, edit, and delete bows
- Track bow type, draw weight, draw length, and notes
- Associate bows with scoring sessions
- **FULLY TRANSLATED** in all 9 languages

### 5. Internationalization (i18n) - COMPLETED
- **9 Supported Languages:**
  - English (en)
  - Portuguese - European (pt)
  - Spanish (es)
  - French (fr)
  - Italian (it)
  - Finnish (fi)
  - Swedish (sv)
  - Russian (ru)
  - Ukrainian (uk)
- Language preference persists across sessions
- All menus, buttons, labels, and messages translated
- **All screens now use dynamic translations including navigation headers**

### 6. Backup & Restore
- Google account integration for cloud backup
- Manual backup and restore functionality

## Technical Stack
- **Frontend:** React Native (Expo)
- **Internationalization:** i18next, react-i18next
- **Storage:** AsyncStorage (native), localStorage (web)
- **Navigation:** expo-router
- **Gestures:** react-native-gesture-handler

## Recent Fixes (December 2025)

### i18n Report Screen & Configuration Updates (v2.0.2)
- **Issue:** Report screen and some filter text remained in English after language change
- **Solution:** 
  1. Fully translated `report.tsx` to use `t()` function throughout
  2. Added comprehensive translation keys to `pt.json` and `en.json` for all report elements
  3. Changed "Volta" to "Turno" in Portuguese translations per user request
  4. Fixed `getFilterSummary()` to use `t('report.allBows')` instead of hardcoded "All Equipment"
- **Configuration Updates:**
  - Updated `app.json` owner to `hraimundo1`
  - Updated projectId to `7789ca40-95f6-47d2-99d0-6dec6de9edfe`
  - Version set to `2.0.2` (versionCode: 12)
- **Verified:** All report screen elements translate correctly to Portuguese

### i18n Navigation Header Fix (v2.0.1)
- **Issue:** Navigation headers ("Round Summary", "Arrow Tracker") stayed in English after language change
- **Root Cause:** Hardcoded titles in `_layout.tsx` Stack.Screen options
- **Solution:**
  1. Removed hardcoded `title` property from `_layout.tsx` for dynamic screens
  2. Updated `summary.tsx` to use `navigation.setOptions({ title: t('summary.title') })` with `t` dependency
  3. Updated `index.tsx` (Home) to dynamically set title via `navigation.setOptions()`
  4. Fixed "Round X" text in `scoring.tsx` to use `t('scoring.round')`
- **Verified:** All screen headers now translate correctly when language changes

### Zoom Pan Gesture Fix (v2.0.1)
- **Issue:** View "jumped" when placing arrow near existing ones when zoomed in
- **Root Cause:** Pan gesture activated too easily, conflicting with touch for arrow placement
- **Solution:** Added `minDistance: 15` to pan gesture in `scoring.tsx` ZoomableTarget component
- **Result:** Users must move finger 15px before pan activates, allowing precise arrow placement

## File Structure
```
/app/frontend/
├── app/
│   ├── _layout.tsx       # Root layout (no hardcoded titles)
│   ├── index.tsx         # Home screen (dynamic title via navigation.setOptions)
│   ├── settings.tsx      # Settings with language selector
│   ├── history.tsx       # Session history
│   ├── bows.tsx          # Bow management
│   ├── scoring.tsx       # Scoring interface (zoom fix + i18n)
│   ├── sessionSetup.tsx  # Session configuration
│   ├── summary.tsx       # Round summary (dynamic title via navigation.setOptions)
│   └── ...
├── components/
│   └── Icon.tsx          # Custom icon component with web fallback
├── locales/
│   ├── en.json           # English translations
│   ├── pt.json           # Portuguese translations
│   └── ... (7 more language files)
└── i18n.ts               # i18n configuration with hybrid storage
```

## Upcoming Tasks

### P0: Enable Competition Menu (v2.1.0)
- Enable the "Competition" button on home screen (currently disabled)
- Review and test existing competition flow
- User requirements to be gathered

### P1: Icon Consistency Review
- Replace any remaining text/emoji icons with proper SVGs
- Ensure consistent icon styling across all screens

## Known Issues
- Backend: Firebase credentials file missing (`firebase-credentials.json`) - needed for backup/restore feature
- Note: Web icons use Unicode/emoji fallbacks due to Expo SDK 54 vector-icons bug
