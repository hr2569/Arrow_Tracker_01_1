import { create } from 'zustand';

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

// Competition-specific data
interface CompetitionData {
  archerName: string;
  bowType: string;
  maxRounds: number;
  arrowsPerRound: number;
}

// Session type: 'competition' or 'training'
type SessionType = 'competition' | 'training';

// Bow types for competition
export const COMPETITION_BOW_TYPES = [
  'recurve',
  'compound',
  'barebow',
  'traditional',
  'longbow',
] as const;

export type CompetitionBowType = typeof COMPETITION_BOW_TYPES[number];

// Target type definitions
type TargetType = 'wa_standard' | 'vegas_3spot' | 'nfaa_indoor';

// Target configuration for each type
export const TARGET_CONFIGS = {
  wa_standard: {
    name: 'WA Standard',
    description: '10-ring World Archery target',
    rings: 10,
    maxScore: 10,
    hasXRing: true,
    // Ring scores from outside to inside (ring 1 = outermost, ring 10 = innermost, X = inner 10)
    scores: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    // Ring colors from outside to inside (2 rings per color zone)
    // White: 1-2, Black: 3-4, Blue: 5-6, Red: 7-8, Gold: 9-10, X (inner gold)
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
      { bg: '#fff200', border: '#ccaa00' },  // Ring 10 - Gold
    ],
    xRingColor: { bg: '#fff200', border: '#b8860b' }, // X ring - Gold with darker border
    layout: 'single',
  },
  vegas_3spot: {
    name: 'Vegas 3-Spot',
    description: 'Indoor 3-spot triangle',
    rings: 5,
    maxScore: 10,
    hasXRing: true,
    // Scores: Blue=6, Red outer=7, Red inner=8, Gold outer=9, Gold center=10
    scores: [6, 7, 8, 9, 10],
    // Colors from outside to inside: Blue → Red → Gold
    colors: [
      { bg: '#00a2e8', border: '#0077b3' },  // Ring 6 - Blue
      { bg: '#ed1c24', border: '#b31217' },  // Ring 7 - Red
      { bg: '#ed1c24', border: '#b31217' },  // Ring 8 - Red
      { bg: '#fff200', border: '#ccaa00' },  // Ring 9 - Gold
      { bg: '#fff200', border: '#ccaa00' },  // Ring 10 - Gold center
    ],
    xRingColor: { bg: '#fff200', border: '#b8860b' }, // X ring
    layout: 'triple_vertical',
  },
  nfaa_indoor: {
    name: 'WA Indoor',
    description: '3-spot vertical strip',
    rings: 5,
    maxScore: 10,
    hasXRing: true,
    // Same scoring: Blue=6, Red=7-8, Gold=9-10
    scores: [6, 7, 8, 9, 10],
    // Colors from outside to inside: Blue → Red → Gold
    colors: [
      { bg: '#00a2e8', border: '#0077b3' },  // Ring 6 - Blue
      { bg: '#ed1c24', border: '#b31217' },  // Ring 7 - Red
      { bg: '#ed1c24', border: '#b31217' },  // Ring 8 - Red
      { bg: '#fff200', border: '#ccaa00' },  // Ring 9 - Gold
      { bg: '#fff200', border: '#ccaa00' },  // Ring 10 - Gold center
    ],
    xRingColor: { bg: '#fff200', border: '#b8860b' }, // X ring
    layout: 'triple_vertical',
  },
};

interface AppState {
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
      currentRound: null,
      currentSession: null,
    }),
}));
