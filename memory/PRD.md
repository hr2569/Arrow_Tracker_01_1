# Archery Scoring App - PRD

## Original Problem Statement
React Native Expo archery scoring application with target visualization, arrow placement, and round/session management.

## Core Features
- Target visualization (WA Standard, Vegas 3-spot, NFAA Indoor)
- Touch-to-place arrow scoring with magnifier zoom
- Round and session tracking
- Competition and training modes
- Internationalization (i18n) support
- Cloud backup via Firebase

## Current Version
- App Version: 2.0.3
- Version Code: 13

---

## Changelog

### Session - December 2025

#### Completed
- [x] Fixed i18n translations on report.tsx screen
- [x] Implemented SVG icon system (replaced emoji/unicode icons with consistent SVGs in `Icon.tsx`)
- [x] Fixed version display across app (index.tsx, settings.tsx)
- [x] Fixed rogue modal issue in summary.tsx (added blur listener)
- [x] Updated app.json to version 2.0.3, versionCode 13
- [x] **Jump bug fix attempt**: 
  - Added `scrollEnabled` state to disable ScrollView during arrow placement
  - Enhanced ZoomableTarget pan gesture with `isPanning` tracking
  - Increased minDistance threshold to 30px
- [x] **Magnifier arrows 50% bigger**: Changed from ~5.6px to 21px

---

## Roadmap

### P0 (Critical) - In Progress
- [ ] Verify jump bug fix on physical device (user testing required)

### P1 (High Priority)
- [ ] Enable and finalize "Competition" menu for version 2.1.0

### P2 (Medium Priority)
- [ ] EAS Build: User must "Save to GitHub" to sync app.json changes before next build
- [ ] Final icon consistency review across app

---

## Technical Architecture

```
/app
└── frontend/
    ├── app/
    │   ├── (tabs)/
    │   │   └── index.tsx        # Home screen
    │   ├── backup.tsx           # Cloud backup
    │   ├── scoring.tsx          # MAIN SCORING SCREEN
    │   ├── settings.tsx         # Settings
    │   └── summary.tsx          # Round summary
    ├── components/
    │   └── Icon.tsx             # SVG icon system
    └── app.json                 # App configuration
```

## Key Technical Notes
- **Gesture Handling**: Uses react-native-gesture-handler (PanGestureHandler) + React Native Responder system
- **Known conflict**: The two gesture systems can conflict, causing the "jump" issue
- **Testing**: Gesture issues must be tested on physical devices
