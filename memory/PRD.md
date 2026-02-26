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
- App Version: 2.1.2
- Version Code: 21

---

## Implemented Features (v2.1.x)

### Competition Mode
- [x] Competition menu with "New Competition" and "Score Keeping" sub-menus
- [x] Competition setup screen with archer name and bow type selection
- [x] 10 rounds of 3 arrows each (competition rules enforced)
- [x] Auto-mark unscored arrows as 'M' (Miss) when round is saved
- [x] Session type badge (Competition vs Training)

### Score Keeping
- [x] CSV/TXT/PDF file import for external competition scores
- [x] **PDF Import**: Reads embedded import codes from Competition PDFs for batch import
- [x] Parse multiple archers from a single file
- [x] Display imported scores and competition sessions
- [x] Rankings grouped by bow type, sorted by score
- [x] **Generate Rankings PDF** - Direct PDF generation with medal highlighting (Gold/Silver/Bronze)
- [x] Remove imported scores functionality
- [x] **(v2.1.2)** Removed "Import Code" manual entry button (streamlined UI)

### Report & Export
- [x] Time period filtering: Day, Week, Month, Year, All
- [x] Filter by bow, distance, and target type
- [x] Session selection mode for individual exports
- [x] **Export CSV** - Export selected sessions to CSV format (v2.1.2)
- [x] Combined PDF report for multiple sessions
- [x] Shot distribution scatter map
- [x] Impact heatmap visualization

### History & Filtering
- [x] Time period filtering: Day, Week, Month, Year, All
- [x] Filter by bow, distance, and target type
- [x] Statistics overview for selected period
- [x] Shot distribution scatter map
- [x] Impact heatmap visualization
- [x] Score chart by round

### Target Visualization
- [x] Condensed single-target view for multi-spot layouts (Vegas 3-spot, WA Indoor)
- [x] **SessionTargetFace** component with correct indoor target rendering (Blue-Red-Gold 5-ring)
- [x] Proper shot position mapping from normalized coordinates
- [x] ScatterMap and HeatMap components for history with indoor target support

### PDF Reports
- [x] **Session PDF** (training): Clean export without raw CSV data
- [x] **Competition PDF**: Embedded import code for Score Keeping batch import
- [x] Session sorting by date (newest first)
- [x] Individual session reports from history
- [x] Combined PDF report for multiple sessions

### Navigation
- [x] router.replace() used in key navigation paths to prevent back-button issues
- [x] BackHandler support for Android hardware back button

### Internationalization (i18n)
- [x] 9 languages: English, Spanish, Finnish, French, Italian, Portuguese, Russian, Swedish, Ukrainian
- [x] Full translation coverage for Competition and Score Keeping features
- [x] Export CSV translations added to all locales (v2.1.2)

### Developer Tools (v2.1.1)
- [x] Test data generator for all target types (WA Standard, Vegas 3-spot, WA Indoor)
- [x] Clear all data option
- [x] Settings screen with developer section

---

## Bug Fixes (v2.1.x)

### v2.1.2 (Dec 2025)
- [x] Removed orphan "Import Code" button and related state/styles from scoreKeeping.tsx
- [x] Removed Export CSV button from Report screen (user requested removal)
- [x] Added Export PDF and Export CSV buttons to Competition Summary screen
- [x] Added Quick Stats widget to home screen showing: Sessions, Avg Score, Best Score, Arrows Shot, and week-over-week trend indicator
- [x] Quick Stats widget translations added to all 9 locale files
- [x] **P0 PDF Import Fix**: Improved PDF parsing logic with base64 extraction to find embedded import codes
- [x] **P1 Back Navigation Fix**: Changed router.push to router.replace in key navigation flows:
  - competitionHistory.tsx (viewing competition results)
  - importPdf.tsx (after importing PDF)
  - Verified existing fixes in summary.tsx, competitionSummary.tsx

### v2.1.22 (Feb 2026)
- [x] Fixed 'X' scoring bug (arrows marked as X were incorrectly scored as 11 instead of 10)
- [x] Added Competition Menu toggle feature flag in index.tsx
- [x] Added German (Deutsch) translation - all 428 keys
- [x] Completed all missing translations for 8 other languages (154+ keys each)
- [x] Updated app version to 2.1.22
- [x] Removed Developer Tools section from Settings
- [x] Quick Stats widget now always shows (even with no data)
- [x] **Server-Side PDF Import**: Added `/api/extract-pdf` endpoint using PyMuPDF for reliable text extraction
  - Sends PDF to backend server for text extraction
  - Server uses PyMuPDF (fitz) library for accurate text parsing
  - Falls back to local extraction if server unavailable
  - Extracts ARROW_TRACKER_DATA markers from PDF text
- [x] **CSV Import Enhancement**: Better error handling, base64 fallback, detailed error messages
- [x] **PDF Report Update**: Added ARROW_TRACKER_JSON marker for additional data redundancy

### v2.1.23 (Feb 2026)
- [x] **QR Code Generation in PDF Reports**: Each session now includes a QR code in the exported PDF
  - QR code contains: Name, Total Score, Bow Type, Distance, Date
  - Added new "QR Codes for Import" page in PDF reports
  - Each archer entry displays with their QR code and key stats
- [x] **QR Code Import from PDF**: New "Import from PDF (QR Code)" feature in Score Keeping
  - Upload multiple PDF files with Arrow Tracker QR codes
  - Backend extracts QR codes from PDF pages using PyMuPDF + pyzbar
  - Automatically parses QR code data and imports archers
  - Imported entries marked with QR code badge
- [x] **Backend QR Extraction Endpoint**: `/api/extract-qr` for multi-PDF QR extraction
  - Converts PDF pages to images using PyMuPDF
  - Detects and decodes QR codes using pyzbar + OpenCV
  - Returns parsed archer data from Arrow Tracker QR format

### v2.1.1
- [x] Fixed heatmap showing wrong target face for multi-spot indoor sessions
- [x] Fixed `normalizedDensity` undefined variable in report.tsx
- [x] Fixed BowData interface compatibility with Bow type
- [x] Fixed cursor style typing issues in competitionScoring.tsx and scoring.tsx
- [x] Added `bowType` field to Participant interface
- [x] Made Firebase initialization optional (prevents crash when credentials missing)

---

## Technical Architecture

```
/app
└── frontend/
    ├── app/
    │   ├── (tabs)/
    │   │   └── index.tsx          # Home screen
    │   ├── competitionMenu.tsx    # Competition sub-menu
    │   ├── competitionSetup.tsx   # Competition session setup
    │   ├── competitionScoring.tsx # Competition scoring screen
    │   ├── competitionSummary.tsx # Competition summary
    │   ├── history.tsx            # History with date filtering
    │   ├── report.tsx             # PDF/CSV report generation
    │   ├── scoring.tsx            # Main scoring screen
    │   ├── scoreKeeping.tsx       # CSV import and rankings
    │   ├── settings.tsx           # Settings with Developer Tools
    │   └── summary.tsx            # Session summary with target face
    ├── components/
    │   └── Icon.tsx               # SVG icon system
    ├── locales/
    │   ├── en.json, es.json, fi.json, fr.json
    │   ├── it.json, pt.json, ru.json, sv.json, uk.json
    ├── store/
    │   └── appStore.ts            # Zustand state (TARGET_CONFIGS)
    ├── utils/
    │   ├── localStorage.ts        # Session, Bow, Round, Shot interfaces
    │   └── testDataGenerator.ts   # Test data generation utility
    └── app.json                   # App configuration
```

## Key Technical Notes
- **Navigation**: expo-router with router.replace() for clean navigation stacks
- **State Management**: Zustand for global app state
- **File Import**: expo-document-picker for CSV selection
- **PDF Generation**: expo-print for HTML-to-PDF conversion
- **CSV Export**: expo-file-system + expo-sharing for CSV generation and sharing
- **Target Configs**: TARGET_CONFIGS in appStore.ts defines ring colors and layouts

---

## Pending Issues

### P0 (Critical)
- [x] ~~PDF import not extracting text from PDFs correctly~~ - FIXED: Multiple extraction methods implemented
- [x] ~~CSV import not parsing correctly~~ - FIXED: Enhanced parsing with line ending normalization, BOM handling, proper quoted value support

### P1 (High Priority)  
- [x] ~~Back navigation bugs~~ - FIXED: Changed router.push to router.replace in key flows
- [ ] Comprehensive back navigation testing on physical devices (code review verified, needs device testing)
- [ ] PDF export share intent (currently uses standard OS share sheet - acceptable behavior)

### P2 (Backlog)
- [ ] Multi-session merge for combined competition reports
- [ ] Final icon consistency review across app

### P3 (Future)
- [ ] Offline mode improvements
- [ ] Social sharing features
- [ ] Advanced analytics and trends
- [ ] Real-time sync (Room Code System) for multi-participant competitions
