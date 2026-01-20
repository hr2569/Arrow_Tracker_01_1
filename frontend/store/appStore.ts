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

interface SessionData {
  id: string;
  name: string;
  rounds: RoundData[];
  total_score: number;
}

interface AppState {
  // Current image being processed
  currentImage: string | null;
  setCurrentImage: (image: string | null) => void;

  // Target detection data
  targetData: TargetData | null;
  setTargetData: (data: TargetData | null) => void;

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
  currentImage: null,
  setCurrentImage: (image) => set({ currentImage: image }),

  targetData: null,
  setTargetData: (data) => set({ targetData: data }),

  currentRound: null,
  setCurrentRound: (round) => set({ currentRound: round }),
  clearCurrentRound: () => set({ currentRound: null }),

  currentSession: null,
  setCurrentSession: (session) => set({ currentSession: session }),

  clearAll: () =>
    set({
      currentImage: null,
      targetData: null,
      currentRound: null,
      currentSession: null,
    }),
}));
