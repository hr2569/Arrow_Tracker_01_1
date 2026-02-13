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
│   ├── index.tsx         # Home screen
│   ├── settings.tsx      # Settings with language selector
│   ├── history.tsx       # Session history
│   ├── scoring.tsx       # Scoring interface
│   ├── sessionSetup.tsx  # Session configuration
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
└── i18n.ts               # i18n configuration
```

## Completed in Current Session

### Language Persistence Fix
- **Issue:** Language changes did not persist when navigating between pages on web preview
- **Root Cause:** AsyncStorage on web is async, causing default language to render before saved language loaded
- **Solution:**
  1. Added synchronous `getInitialLanguage()` that reads from localStorage on web before i18n initializes
  2. Created hybrid storage system (localStorage for web, AsyncStorage for native)
  3. Root layout waits for language to load before rendering children

### Translations Verified
- All 9 language files contain complete translations
- Language switching works across all pages (Settings, History, Home, etc.)
- Language preference persists correctly in localStorage

## Upcoming Tasks

### P0: Competition Menu
- Implement new "Competition" mode (currently shows "Coming Soon")
- Requirements to be gathered from user

## Future Enhancements (Backlog)
- Export session data (PDF, CSV)
- Social sharing of scores
- Advanced analytics and trend charts
- Multi-device sync
- Offline-first improvements
