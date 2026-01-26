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

interface AppState {
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
