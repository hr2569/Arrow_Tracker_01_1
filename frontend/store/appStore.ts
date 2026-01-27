import { create } from 'zustand';

interface TargetData {
  corners: any[];
  center: { x: number; y: number };
  radius: number;
  confidence: number;
}

interface RoundData {
  shots: Array<{ x: number; y: number; ring: number }>;
  total: number;
}

interface SessionRoundData {
  roundNumber: number;
  shots: Array<{ x: number; y: number; ring: number }>;
  total: number;
}

interface SessionData {
  id: string;
  name: string;
  rounds: RoundData[];
  total_score: number;
}

interface BowData {
  id: string;
  name: string;
  bow_type: string;
  draw_weight: number | null;
  draw_length: number | null;
}

// Session type: 'competition' (10 rounds max) or 'training' (unlimited)
type SessionType = 'competition' | 'training';

// Target type definitions
type TargetType = 'wa_standard' | 'vegas_3spot' | 'nfaa_indoor';

// Target configuration for each type
export const TARGET_CONFIGS = {
  wa_standard: {
    name: 'WA Standard',
    description: '10-ring World Archery target',
    rings: 10,
    maxScore: 10,
    // Ring scores from outside to inside
    scores: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    // Ring colors from outside to inside (2 rings per color zone)
    colors: [
      { bg: '#f5f5f0', border: '#333' },     // Ring 1 - White
      { bg: '#f5f5f0', border: '#333' },     // Ring 2 - White
      { bg: '#2a2a2a', border: '#555' },     // Ring 3 - Black
      { bg: '#2a2a2a', border: '#555' },     // Ring 4 - Black
      { bg: '#00a2e8', border: '#0077b3' },  // Ring 5 - Blue
      { bg: '#00a2e8', border: '#0077b3' },  // Ring 6 - Blue
      { bg: '#ed1c24', border: '#b31217' },  // Ring 7 - Red
      { bg: '#ed1c24', border: '#b31217' },  // Ring 8 - Red
      { bg: '#fff200', border: '#ccaa00' },  // Ring 9 - Gold
      { bg: '#fff200', border: '#ccaa00' },  // Ring 10 - Gold (X)
    ],
    layout: 'single', // single target face
  },
  vegas_3spot: {
    name: 'Vegas 3-Spot',
    description: 'Indoor 3-spot triangle',
    rings: 5,
    maxScore: 10,
    // X=10, 10, 9, 8, 7 (outer blue scores 6)
    scores: [6, 7, 8, 9, 10],
    // Colors from outside to inside: Blue → Red → Gold
    colors: [
      { bg: '#00a2e8', border: '#0077b3' },  // Ring 6 - Blue outer
      { bg: '#ed1c24', border: '#b31217' },  // Ring 7 - Red
      { bg: '#ed1c24', border: '#b31217' },  // Ring 8 - Red
      { bg: '#fff200', border: '#ccaa00' },  // Ring 9 - Gold
      { bg: '#fff200', border: '#ccaa00' },  // Ring 10/X - Gold center
    ],
    layout: 'triple_triangle', // 3 targets in triangle arrangement
    hasXRing: true,
  },
  nfaa_indoor: {
    name: 'NFAA Indoor',
    description: '3-spot vertical strip',
    rings: 5,
    maxScore: 10,
    // Same scoring as Vegas: Gold 10/9, Red 8/7, Blue 6
    scores: [6, 7, 8, 9, 10],
    // Colors from outside to inside: Blue → Red → Gold
    colors: [
      { bg: '#00a2e8', border: '#0077b3' },  // Ring 6 - Blue outer
      { bg: '#ed1c24', border: '#b31217' },  // Ring 7 - Red
      { bg: '#ed1c24', border: '#b31217' },  // Ring 8 - Red
      { bg: '#fff200', border: '#ccaa00' },  // Ring 9 - Gold
      { bg: '#fff200', border: '#ccaa00' },  // Ring 10/X - Gold center
    ],
    layout: 'triple_vertical', // 3 targets stacked vertically
    hasXRing: true,
  },
};

// Theme type
type ThemeType = 'dark' | 'light' | 'system';

interface AppState {
  // Theme setting
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;

  // Target type for current session
  targetType: TargetType;
  setTargetType: (type: TargetType) => void;

  // Session type for current session
  sessionType: SessionType;
  setSessionType: (type: SessionType) => void;

  // Selected bow for current session
  selectedBow: BowData | null;
  setSelectedBow: (bow: BowData | null) => void;

  // Distance for current session (in meters or yards)
  sessionDistance: string;
  setSessionDistance: (distance: string) => void;

  // Round tracking
  currentRoundNumber: number;
  setCurrentRoundNumber: (num: number) => void;
  incrementRoundNumber: () => void;

  // Session rounds - persists all completed rounds
  sessionRounds: SessionRoundData[];
  addSessionRound: (round: SessionRoundData) => void;
  clearSessionRounds: () => void;

  // Current image being processed
  currentImage: string | null;
  setCurrentImage: (image: string | null) => void;

  // Target detection data
  targetData: TargetData | null;
  setTargetData: (data: TargetData | null) => void;

  // Manual mode flag - skips AI detection
  manualMode: boolean;
  setManualMode: (mode: boolean) => void;

  // Current round data
  currentRound: RoundData | null;
  setCurrentRound: (round: RoundData | null) => void;
  clearCurrentRound: () => void;

  // Current session
  currentSession: SessionData | null;
  setCurrentSession: (session: SessionData | null) => void;

  // Clear all data
  clearAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  targetType: 'wa_standard',
  setTargetType: (type) => set({ targetType: type }),

  sessionType: 'training',
  setSessionType: (type) => set({ sessionType: type, currentRoundNumber: 1, sessionRounds: [] }),

  selectedBow: null,
  setSelectedBow: (bow) => set({ selectedBow: bow }),

  sessionDistance: '',
  setSessionDistance: (distance) => set({ sessionDistance: distance }),

  currentRoundNumber: 1,
  setCurrentRoundNumber: (num) => set({ currentRoundNumber: num }),
  incrementRoundNumber: () => set((state) => ({ currentRoundNumber: state.currentRoundNumber + 1 })),

  sessionRounds: [],
  addSessionRound: (round) => set((state) => ({ 
    sessionRounds: [...state.sessionRounds, round] 
  })),
  clearSessionRounds: () => set({ sessionRounds: [] }),

  currentImage: null,
  setCurrentImage: (image) => set({ currentImage: image }),

  targetData: null,
  setTargetData: (data) => set({ targetData: data }),

  manualMode: false,
  setManualMode: (mode) => set({ manualMode: mode }),

  currentRound: null,
  setCurrentRound: (round) => set({ currentRound: round }),
  clearCurrentRound: () => set({ currentRound: null }),

  currentSession: null,
  setCurrentSession: (session) => set({ currentSession: session }),

  clearAll: () =>
    set({
      targetType: 'wa_standard',
      sessionType: 'training',
      selectedBow: null,
      sessionDistance: '',
      currentRoundNumber: 1,
      sessionRounds: [],
      currentImage: null,
      targetData: null,
      manualMode: false,
      currentRound: null,
      currentSession: null,
    }),
}));
