# Arrow Tracker - Product Requirements Document

## Overview
Arrow Tracker is a React Native (Expo) archery scoring application designed to help archers track their shots, analyze performance, and improve their aim.

## Version
Current: **v2.0.0**

## Core Features

### 1. Scoring System
- Real-time arrow placement on target faces
- Support for multiple target types (WA Standard, Vegas 3-Spot, WA Indoor)
- Round-based scoring with customizable arrows per round

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
- **All screens now use translations:** Home, Settings, History, Bows, Scoring, Session Setup

### 6. Backup & Restore
- Google account integration for cloud backup
- Manual backup and restore functionality

## Technical Stack
- **Frontend:** React Native (Expo)
- **Internationalization:** i18next, react-i18next
- **Storage:** AsyncStorage (native), localStorage (web)
- **Navigation:** expo-router

## File Structure
```
/app/frontend/
├── app/
│   ├── _layout.tsx       # Root layout with i18n initialization
│   ├── index.tsx         # Home screen (translated)
│   ├── settings.tsx      # Settings with language selector (translated)
│   ├── history.tsx       # Session history (translated)
│   ├── bows.tsx          # Bow management (translated)
│   ├── scoring.tsx       # Scoring interface (translated)
│   ├── sessionSetup.tsx  # Session configuration (translated)
│   └── ...
├── locales/
│   ├── en.json           # English translations
│   ├── pt.json           # Portuguese translations
│   ├── es.json           # Spanish translations
│   ├── fr.json           # French translations
│   ├── it.json           # Italian translations
│   ├── fi.json           # Finnish translations
│   ├── sv.json           # Swedish translations
│   ├── ru.json           # Russian translations
│   └── uk.json           # Ukrainian translations
└── i18n.ts               # i18n configuration with hybrid storage
```

## Completed Work

### Icon Display Fix (December 2025)
- **Issue:** Icons (Ionicons) not displaying on web preview - showing empty boxes/rectangles
- **Root Cause:** `@expo/vector-icons` v14 has broken web compatibility in Expo SDK 54
- **Solution:**
  1. Created custom `Icon` component (`/app/frontend/components/Icon.tsx`) with platform-specific rendering
  2. On web: Uses Unicode/emoji fallback characters that render correctly
  3. On native: Uses Ionicons normally
  4. Updated all 18 screen files to use the new Icon component
- **Result:** All icons now display correctly across the entire application on web

### Language Persistence Fix
- **Issue:** Language changes did not persist when navigating between pages on web preview
- **Root Cause:** AsyncStorage on web is async, causing default language to render before saved language loaded
- **Solution:**
  1. Added synchronous `getInitialLanguage()` that reads from localStorage on web before i18n initializes
  2. Created hybrid storage system (localStorage for web, AsyncStorage for native)
  3. Root layout waits for language to load before rendering children

### Bows Screen Translation
- **Issue:** Bows screen was showing English text even after language change
- **Solution:** Updated `bows.tsx` to use `t()` translation function for all UI text
- **Verified:** Bows screen now displays correctly in Portuguese, Spanish, and all other languages

### All Translations Verified
- All 9 language files contain complete translations
- Language switching works across all pages (Settings, History, Home, Bows, etc.)
- Language preference persists correctly in localStorage

## Upcoming Tasks

### P0: Competition Menu
- Implement new "Competition" mode (currently shows "Coming Soon")
- Requirements to be gathered from user

## Known Issues
- Backend issue: Firebase credentials file missing (`firebase-credentials.json`) - needed for backup/restore feature

## Future Enhancements (Backlog)
- Export session data (PDF, CSV)
- Social sharing of scores
- Advanced analytics and trend charts
- Multi-device sync
- Offline-first improvements
