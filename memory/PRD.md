# Archery Target Scoring App - PRD

## Overview
An AI-powered mobile application for archery target scoring that uses computer vision to detect target corners, identify arrow hits, and automatically calculate scores.

## Features

### 1. Image Capture/Upload
- Camera capture with target alignment guide
- Gallery upload option
- Support for JPEG/PNG images
- Base64 encoding for image processing

### 2. Target Detection
- AI-powered corner detection using OpenAI GPT-4o Vision
- Automatic target center identification
- Target radius estimation
- Manual alignment fallback option

### 3. Arrow Detection & Scoring
- AI-powered arrow hit detection
- Automatic ring identification (1-10 points)
- Manual arrow placement/correction
- Interactive target overlay

### 4. Scoring System
- Standard FITA/World Archery target (10 rings)
  - Yellow center: 10-9 points
  - Red: 8-7 points  
  - Blue: 6-5 points
  - Black: 4-3 points
  - White: 2-1 points
- Minimum 3 shots per round (unmarked = 0)
- Automatic score calculation

### 5. Session Management
- Create/save scoring sessions
- Multiple rounds per session
- Session history with statistics
- Delete sessions

## Tech Stack

### Frontend (Expo/React Native)
- expo-router (file-based navigation)
- expo-camera (photo capture)
- expo-image-picker (gallery selection)
- zustand (state management)
- axios (API calls)

### Backend (FastAPI)
- MongoDB (data storage)
- emergentintegrations (AI/LLM integration)
- OpenAI GPT-4o Vision (image analysis)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/health | GET | Health check |
| /api/analyze-target | POST | Detect target corners |
| /api/detect-arrows | POST | Detect arrow positions |
| /api/sessions | GET | List all sessions |
| /api/sessions | POST | Create session |
| /api/sessions/{id} | GET | Get session |
| /api/sessions/{id} | DELETE | Delete session |
| /api/sessions/{id}/rounds | POST | Add round |

## App Screens

1. **Home** - Start new session or view history
2. **Capture** - Camera/gallery image selection
3. **Alignment** - Target corner verification
4. **Scoring** - Arrow marking and score calculation
5. **Summary** - Round results and session stats
6. **History** - Past sessions and scores

## Configuration

### Environment Variables
- `EMERGENT_LLM_KEY` - API key for AI analysis
- `MONGO_URL` - MongoDB connection string
- `EXPO_PUBLIC_BACKEND_URL` - Backend API URL

## Implemented Features (Latest Updates)

### Target Types
- WA Standard (10-ring target)
- Vegas 3-Spot
- WA Indoor (formerly NFAA Indoor)

### Session Management
- Create/save scoring sessions
- Multiple rounds per session
- Delete individual rounds
- Session history with statistics
- Individual session selection for reports

### PDF Report Generation
- Comprehensive scoring reports with page breaks
- Shot Distribution graphs
- Impact Heat Maps with transparency
- Scatter maps with target face background
- Build configurations for APK and AAB

### Recent Changes (Dec 2025)
- Renamed "NFAA Indoor" to "WA Indoor" throughout the app
- Implemented Edit Round functionality - users can now modify shot scores within rounds
- Fixed shot centering issues on visualizations
- Resolved Android crash with "Generate Report" button
- Configured EAS build profiles (preview/production/playstore)

## Future Enhancements
- User authentication
- Cloud sync across devices
- Score analytics and trends
- Competition mode with timers
