# Archery Scoring App - PRD

## Original Problem Statement
React Native Expo archery scoring application with target visualization, arrow placement, and round/session management.

## Core Features
- Target visualization (WA Standard, Vegas 3-spot, WA Indoor)
- Touch-to-place arrow scoring with magnifier zoom
- Round and session tracking
- Competition and training modes
- Internationalization (i18n) support for 9 languages
- Cloud backup via Firebase
- Score Keeping for importing and ranking competition results

## Current Version
- App Version: 2.1.1
- Version Code: 20

---

## Implemented Features (v2.1.x)

### Competition Mode
- [x] Competition menu with "New Competition" and "Score Keeping" sub-menus
- [x] Competition setup screen with archer name and bow type selection
- [x] 10 rounds of 3 arrows each (competition rules enforced)
- [x] Auto-mark unscored arrows as 'M' (Miss) when round is saved
- [x] Session type badge (Competition vs Training)

### Score Keeping
- [x] CSV/TXT file import for external competition scores
- [x] Parse multiple archers from a single CSV
- [x] Display imported scores and competition sessions
- [x] Rankings modal grouped by bow type, sorted by score
- [x] PDF export of rankings with medal highlighting (Gold/Silver/Bronze)
- [x] Remove imported scores functionality

### History & Filtering
- [x] Time period filtering: Day, Week, Month, Year, All
- [x] Filter by bow, distance, and target type
- [x] Statistics overview for selected period
- [x] Shot distribution scatter map
- [x] Impact heatmap visualization
- [x] Score chart by round

### Target Visualization
- [x] Condensed single-target view for multi-spot layouts (Vegas 3-spot, WA Indoor)
- [x] SessionTargetFace component for summary screen
- [x] ScatterMap and HeatMap components for history

### PDF Reports
- [x] Embedded raw CSV data in generated PDFs
- [x] Session sorting by date (newest first)
- [x] Individual session reports from history

### Navigation
- [x] router.replace() used in key navigation paths to prevent back-button issues
- [x] BackHandler support for Android hardware back button

### Internationalization (i18n)
- [x] 9 languages: English, Spanish, Finnish, French, Italian, Portuguese, Russian, Swedish, Ukrainian
- [x] Full translation coverage for Competition and Score Keeping features

---

## Known Issues

### P1 - Testing Required
- [ ] Back navigation flow needs comprehensive testing on physical devices
- [ ] Multi-spot target visualization needs verification with actual session data

### P2 - Minor
- [ ] TypeScript type compatibility warnings (cursor styles, Bow interface)
- [ ] Some linting warnings in competitionScoring.tsx and competitionSetup.tsx

---

## Technical Architecture

```
/app
└── frontend/
    ├── app/
    │   ├── (tabs)/
    │   │   └── index.tsx          # Home screen (v2.1.1)
    │   ├── competitionMenu.tsx    # Competition sub-menu
    │   ├── competitionSetup.tsx   # Competition session setup
    │   ├── competitionScoring.tsx # Competition scoring screen
    │   ├── competitionSummary.tsx # Competition summary
    │   ├── history.tsx            # History with date filtering
    │   ├── report.tsx             # PDF report generation
    │   ├── scoring.tsx            # Main scoring screen
    │   ├── scoreKeeping.tsx       # CSV import and rankings
    │   └── summary.tsx            # Session summary with target face
    ├── components/
    │   └── Icon.tsx               # SVG icon system
    ├── locales/
    │   ├── en.json, es.json, fi.json, fr.json
    │   ├── it.json, pt.json, ru.json, sv.json, uk.json
    ├── store/
    │   └── appStore.ts            # Zustand state (TARGET_CONFIGS)
    ├── utils/
    │   └── localStorage.ts        # Session, Bow, Round, Shot interfaces
    └── app.json                   # App configuration
```

## Key Technical Notes
- **Navigation**: expo-router with router.replace() for clean navigation stacks
- **State Management**: Zustand for global app state
- **File Import**: expo-document-picker for CSV selection
- **PDF Generation**: expo-print for HTML-to-PDF conversion
- **Target Configs**: TARGET_CONFIGS in appStore.ts defines ring colors and layouts

---

## Future Roadmap

### P2 (Backlog)
- [ ] Merge multiple competition sessions into single PDF report
- [ ] Final icon consistency review across app
- [ ] EAS Build automation

### P3 (Future)
- [ ] Offline mode improvements
- [ ] Social sharing features
- [ ] Advanced analytics and trends
