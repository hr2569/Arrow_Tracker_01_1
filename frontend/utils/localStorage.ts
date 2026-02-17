import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSIONS_KEY = 'archery_sessions';
const BOWS_KEY = 'archery_bows';
const LAST_BACKUP_KEY = 'last_backup_date';

export interface Shot {
  id: string;
  x: number;
  y: number;
  ring: number;
  confirmed: boolean;
}

export interface Round {
  id: string;
  round_number: number;
  shots: Shot[];
  total_score: number;
  created_at: string;
}

export interface Session {
  id: string;
  name: string;
  bow_id?: string;
  bow_name?: string;
  distance?: string;
  target_type: string;
  rounds: Round[];
  total_score: number;
  created_at: string;
  updated_at: string;
  // Competition-specific fields
  session_type?: 'training' | 'competition';
  archer_name?: string;
  competition_bow_type?: string;
}

export interface Bow {
  id: string;
  name: string;
  bow_type: string;
  draw_weight?: number;
  draw_length?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Generate UUID
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ============== Sessions ==============

export const getSessions = async (): Promise<Session[]> => {
  try {
    const data = await AsyncStorage.getItem(SESSIONS_KEY);
    if (data) {
      const sessions = JSON.parse(data);
      return sessions.sort((a: Session, b: Session) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return [];
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
};

export const getSession = async (sessionId: string): Promise<Session | null> => {
  try {
    const sessions = await getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

export const createSession = async (data: {
  name?: string;
  bow_id?: string;
  bow_name?: string;
  distance?: string;
  target_type?: string;
  session_type?: 'training' | 'competition';
  archer_name?: string;
  competition_bow_type?: string;
}): Promise<Session> => {
  const now = new Date().toISOString();
  const session: Session = {
    id: generateId(),
    name: data.name || `Session ${new Date().toLocaleString()}`,
    bow_id: data.bow_id,
    bow_name: data.bow_name,
    distance: data.distance,
    target_type: data.target_type || 'wa_standard',
    rounds: [],
    total_score: 0,
    created_at: now,
    updated_at: now,
    // Competition-specific fields
    session_type: data.session_type,
    archer_name: data.archer_name,
    competition_bow_type: data.competition_bow_type,
  };
  
  const sessions = await getSessions();
  sessions.push(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return session;
};

export const updateSession = async (sessionId: string, updates: Partial<Session>): Promise<Session | null> => {
  try {
    const sessions = await getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index === -1) return null;
    
    sessions[index] = {
      ...sessions[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return sessions[index];
  } catch (error) {
    console.error('Error updating session:', error);
    return null;
  }
};

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  try {
    const sessions = await getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
};

export const addRoundToSession = async (sessionId: string, roundData: {
  round_number: number;
  shots: { x: number; y: number; ring: number }[];
}): Promise<Session | null> => {
  try {
    const sessions = await getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index === -1) return null;
    
    const shots: Shot[] = roundData.shots.map(s => ({
      id: generateId(),
      x: s.x,
      y: s.y,
      ring: s.ring,
      confirmed: true,
    }));
    
    // Ensure minimum 3 shots
    while (shots.length < 3) {
      shots.push({ id: generateId(), x: 0, y: 0, ring: 0, confirmed: true });
    }
    
    const roundTotal = shots.reduce((sum, s) => sum + s.ring, 0);
    
    const newRound: Round = {
      id: generateId(),
      round_number: roundData.round_number,
      shots,
      total_score: roundTotal,
      created_at: new Date().toISOString(),
    };
    
    sessions[index].rounds.push(newRound);
    sessions[index].total_score = sessions[index].rounds.reduce((sum, r) => sum + r.total_score, 0);
    sessions[index].updated_at = new Date().toISOString();
    
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return sessions[index];
  } catch (error) {
    console.error('Error adding round:', error);
    return null;
  }
};

export const updateRound = async (sessionId: string, roundId: string, shots: { x: number; y: number; ring: number }[]): Promise<Session | null> => {
  try {
    const sessions = await getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return null;
    
    const roundIndex = sessions[sessionIndex].rounds.findIndex(r => r.id === roundId);
    if (roundIndex === -1) return null;
    
    const newShots: Shot[] = shots.map(s => ({
      id: generateId(),
      x: s.x,
      y: s.y,
      ring: s.ring,
      confirmed: true,
    }));
    
    while (newShots.length < 3) {
      newShots.push({ id: generateId(), x: 0, y: 0, ring: 0, confirmed: true });
    }
    
    sessions[sessionIndex].rounds[roundIndex].shots = newShots;
    sessions[sessionIndex].rounds[roundIndex].total_score = newShots.reduce((sum, s) => sum + s.ring, 0);
    sessions[sessionIndex].total_score = sessions[sessionIndex].rounds.reduce((sum, r) => sum + r.total_score, 0);
    sessions[sessionIndex].updated_at = new Date().toISOString();
    
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return sessions[sessionIndex];
  } catch (error) {
    console.error('Error updating round:', error);
    return null;
  }
};

export const deleteRound = async (sessionId: string, roundId: string): Promise<Session | null> => {
  try {
    const sessions = await getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return null;
    
    const roundIndex = sessions[sessionIndex].rounds.findIndex(r => r.id === roundId);
    if (roundIndex === -1) return null;
    
    // Remove the round
    sessions[sessionIndex].rounds.splice(roundIndex, 1);
    
    // Renumber remaining rounds
    sessions[sessionIndex].rounds.forEach((round, idx) => {
      round.round_number = idx + 1;
    });
    
    // Recalculate total score
    sessions[sessionIndex].total_score = sessions[sessionIndex].rounds.reduce((sum, r) => sum + r.total_score, 0);
    sessions[sessionIndex].updated_at = new Date().toISOString();
    
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return sessions[sessionIndex];
  } catch (error) {
    console.error('Error deleting round:', error);
    return null;
  }
};

// ============== Bows ==============

export const getBows = async (): Promise<Bow[]> => {
  try {
    const data = await AsyncStorage.getItem(BOWS_KEY);
    if (data) {
      const bows = JSON.parse(data);
      return bows.sort((a: Bow, b: Bow) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return [];
  } catch (error) {
    console.error('Error getting bows:', error);
    return [];
  }
};

export const getBow = async (bowId: string): Promise<Bow | null> => {
  try {
    const bows = await getBows();
    return bows.find(b => b.id === bowId) || null;
  } catch (error) {
    console.error('Error getting bow:', error);
    return null;
  }
};

export const createBow = async (data: {
  name: string;
  bow_type: string;
  draw_weight?: number;
  draw_length?: number;
  notes?: string;
}): Promise<Bow> => {
  const now = new Date().toISOString();
  const bow: Bow = {
    id: generateId(),
    name: data.name,
    bow_type: data.bow_type,
    draw_weight: data.draw_weight,
    draw_length: data.draw_length,
    notes: data.notes || '',
    created_at: now,
    updated_at: now,
  };
  
  const bows = await getBows();
  bows.push(bow);
  await AsyncStorage.setItem(BOWS_KEY, JSON.stringify(bows));
  return bow;
};

export const updateBow = async (bowId: string, updates: Partial<Bow>): Promise<Bow | null> => {
  try {
    const bows = await getBows();
    const index = bows.findIndex(b => b.id === bowId);
    if (index === -1) return null;
    
    bows[index] = {
      ...bows[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(BOWS_KEY, JSON.stringify(bows));
    return bows[index];
  } catch (error) {
    console.error('Error updating bow:', error);
    return null;
  }
};

export const deleteBow = async (bowId: string): Promise<boolean> => {
  try {
    const bows = await getBows();
    const filtered = bows.filter(b => b.id !== bowId);
    await AsyncStorage.setItem(BOWS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting bow:', error);
    return false;
  }
};

// ============== Backup & Restore ==============

export const getAllData = async () => {
  const sessions = await getSessions();
  const bows = await getBows();
  return {
    sessions,
    bows,
    exportDate: new Date().toISOString(),
    version: '1.0',
  };
};

export const restoreAllData = async (data: { sessions: Session[]; bows: Bow[] }): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions || []));
    await AsyncStorage.setItem(BOWS_KEY, JSON.stringify(data.bows || []));
    return true;
  } catch (error) {
    console.error('Error restoring data:', error);
    return false;
  }
};

export const setLastBackupDate = async () => {
  await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
};

export const getLastBackupDate = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(LAST_BACKUP_KEY);
};
