import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPETITIONS_KEY = 'archery_competitions';
const ACTIVE_COMPETITION_KEY = 'active_competition';

// Generate UUID
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface CompetitionShot {
  x: number;
  y: number;
  ring: number;
}

export interface CompetitionRound {
  roundNumber: number;
  shots: CompetitionShot[];
  totalScore: number;
  committed: boolean;
  committedAt?: string;
}

export interface Participant {
  id: string;
  name: string;
  bowId?: string;
  bowName?: string;
  deviceId?: string; // For multi-device mode
  rounds: CompetitionRound[];
  totalScore: number;
}

export interface Competition {
  id: string;
  name: string;
  targetType: string;
  distance: string;
  participants: Participant[];
  currentParticipantIndex: number;
  currentRound: number;
  status: 'setup' | 'in_progress' | 'completed';
  mode: 'local';
  hostDeviceId?: string;
  maxRounds: number;
  arrowsPerRound: number;
  createdAt: string;
  completedAt?: string;
}

// ============== Competition CRUD ==============

export const getCompetitions = async (): Promise<Competition[]> => {
  try {
    const data = await AsyncStorage.getItem(COMPETITIONS_KEY);
    if (data) {
      const competitions = JSON.parse(data);
      return competitions.sort((a: Competition, b: Competition) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return [];
  } catch (error) {
    console.error('Error getting competitions:', error);
    return [];
  }
};

export const getCompetition = async (competitionId: string): Promise<Competition | null> => {
  try {
    const competitions = await getCompetitions();
    return competitions.find(c => c.id === competitionId) || null;
  } catch (error) {
    console.error('Error getting competition:', error);
    return null;
  }
};

export const createCompetition = async (data: {
  name: string;
  targetType: string;
  distance: string;
  mode: 'pass_and_play' | 'multi_device';
  participants: { name: string; bowId?: string; bowName?: string }[];
}): Promise<Competition> => {
  const competitionId = generateId();
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const participants: Participant[] = data.participants.map(p => ({
    id: generateId(),
    name: p.name,
    bowId: p.bowId,
    bowName: p.bowName,
    rounds: [],
    totalScore: 0,
  }));

  const competition: Competition = {
    id: competitionId,
    name: data.name,
    targetType: data.targetType,
    distance: data.distance,
    participants,
    currentParticipantIndex: 0,
    currentRound: 1,
    status: 'setup',
    mode: data.mode,
    joinCode: data.mode === 'multi_device' ? joinCode : undefined,
    maxRounds: 10,
    arrowsPerRound: 3,
    createdAt: new Date().toISOString(),
  };

  const competitions = await getCompetitions();
  competitions.push(competition);
  await AsyncStorage.setItem(COMPETITIONS_KEY, JSON.stringify(competitions));
  
  return competition;
};

export const updateCompetition = async (competitionId: string, updates: Partial<Competition>): Promise<Competition | null> => {
  try {
    const competitions = await getCompetitions();
    const index = competitions.findIndex(c => c.id === competitionId);
    if (index === -1) return null;
    
    competitions[index] = {
      ...competitions[index],
      ...updates,
    };
    
    await AsyncStorage.setItem(COMPETITIONS_KEY, JSON.stringify(competitions));
    return competitions[index];
  } catch (error) {
    console.error('Error updating competition:', error);
    return null;
  }
};

export const deleteCompetition = async (competitionId: string): Promise<boolean> => {
  try {
    const competitions = await getCompetitions();
    const filtered = competitions.filter(c => c.id !== competitionId);
    await AsyncStorage.setItem(COMPETITIONS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting competition:', error);
    return false;
  }
};

// ============== Active Competition ==============

export const setActiveCompetition = async (competitionId: string | null): Promise<void> => {
  if (competitionId) {
    await AsyncStorage.setItem(ACTIVE_COMPETITION_KEY, competitionId);
  } else {
    await AsyncStorage.removeItem(ACTIVE_COMPETITION_KEY);
  }
};

export const getActiveCompetition = async (): Promise<Competition | null> => {
  try {
    const activeId = await AsyncStorage.getItem(ACTIVE_COMPETITION_KEY);
    if (activeId) {
      return await getCompetition(activeId);
    }
    return null;
  } catch (error) {
    console.error('Error getting active competition:', error);
    return null;
  }
};

// ============== Scoring Operations ==============

export const commitRound = async (
  competitionId: string,
  participantId: string,
  roundNumber: number,
  shots: CompetitionShot[]
): Promise<Competition | null> => {
  try {
    const competition = await getCompetition(competitionId);
    if (!competition) return null;

    const participantIndex = competition.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) return null;

    const roundTotal = shots.reduce((sum, s) => sum + s.ring, 0);
    
    const newRound: CompetitionRound = {
      roundNumber,
      shots,
      totalScore: roundTotal,
      committed: true,
      committedAt: new Date().toISOString(),
    };

    // Add or update the round
    const existingRoundIndex = competition.participants[participantIndex].rounds.findIndex(
      r => r.roundNumber === roundNumber
    );
    
    if (existingRoundIndex >= 0) {
      // Round already exists and committed - don't allow changes
      if (competition.participants[participantIndex].rounds[existingRoundIndex].committed) {
        console.error('Cannot modify committed round');
        return null;
      }
      competition.participants[participantIndex].rounds[existingRoundIndex] = newRound;
    } else {
      competition.participants[participantIndex].rounds.push(newRound);
    }

    // Update participant total
    competition.participants[participantIndex].totalScore = 
      competition.participants[participantIndex].rounds.reduce((sum, r) => sum + r.totalScore, 0);

    // Move to next participant or next round
    const nextParticipantIndex = (competition.currentParticipantIndex + 1) % competition.participants.length;
    
    if (nextParticipantIndex === 0) {
      // All participants have shot this round, move to next round
      competition.currentRound = Math.min(competition.currentRound + 1, competition.maxRounds + 1);
    }
    competition.currentParticipantIndex = nextParticipantIndex;

    // Check if competition is complete
    const allComplete = competition.participants.every(
      p => p.rounds.filter(r => r.committed).length >= competition.maxRounds
    );
    
    if (allComplete) {
      competition.status = 'completed';
      competition.completedAt = new Date().toISOString();
    }

    return await updateCompetition(competitionId, competition);
  } catch (error) {
    console.error('Error committing round:', error);
    return null;
  }
};

export const startCompetition = async (competitionId: string): Promise<Competition | null> => {
  return await updateCompetition(competitionId, { status: 'in_progress' });
};

// ============== Rankings ==============

export const getRankings = (competition: Competition): Participant[] => {
  return [...competition.participants].sort((a, b) => b.totalScore - a.totalScore);
};

// ============== Multi-device Sync Helpers ==============

export const generateSyncPayload = (competition: Competition): string => {
  return JSON.stringify({
    id: competition.id,
    joinCode: competition.joinCode,
    participants: competition.participants,
    currentParticipantIndex: competition.currentParticipantIndex,
    currentRound: competition.currentRound,
    status: competition.status,
    timestamp: new Date().toISOString(),
  });
};

export const applySyncPayload = async (
  competitionId: string,
  payload: string
): Promise<Competition | null> => {
  try {
    const data = JSON.parse(payload);
    const competition = await getCompetition(competitionId);
    if (!competition) return null;

    // Merge participant scores (take the most recent committed rounds)
    for (const incomingParticipant of data.participants) {
      const localParticipant = competition.participants.find(p => p.id === incomingParticipant.id);
      if (localParticipant) {
        for (const incomingRound of incomingParticipant.rounds) {
          if (incomingRound.committed) {
            const existingRound = localParticipant.rounds.find(
              r => r.roundNumber === incomingRound.roundNumber
            );
            if (!existingRound) {
              localParticipant.rounds.push(incomingRound);
            }
          }
        }
        localParticipant.totalScore = localParticipant.rounds.reduce((sum, r) => sum + r.totalScore, 0);
      }
    }

    competition.currentParticipantIndex = data.currentParticipantIndex;
    competition.currentRound = data.currentRound;
    competition.status = data.status;

    return await updateCompetition(competitionId, competition);
  } catch (error) {
    console.error('Error applying sync payload:', error);
    return null;
  }
};
