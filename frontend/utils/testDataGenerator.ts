/**
 * Test Data Generator for Arrow Tracker
 * Creates sample sessions for testing heatmap visualization
 */

import { Session, Shot, Round, Bow } from './localStorage';

// Generate a random shot position on a target
const generateRandomShot = (centerBias: number = 0.3): { x: number; y: number } => {
  // Use gaussian-like distribution to bias shots toward center
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.pow(Math.random(), centerBias); // Lower bias = more centered shots
  
  // Convert polar to cartesian, centered at (0.5, 0.5) with max radius 0.5
  const x = 0.5 + radius * 0.45 * Math.cos(angle);
  const y = 0.5 + radius * 0.45 * Math.sin(angle);
  
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
};

// Calculate ring based on distance from center
const calculateRing = (x: number, y: number, targetType: string): number => {
  const centerX = 0.5;
  const centerY = 0.5;
  const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
  
  // Normalize distance to 0-1 range (max radius is ~0.5)
  const normalizedDist = distance / 0.5;
  
  if (targetType === 'vegas_3spot' || targetType === 'nfaa_indoor') {
    // 5-ring target (X, 10, 9, 8, 7, M)
    if (normalizedDist < 0.08) return 11; // X
    if (normalizedDist < 0.2) return 10;
    if (normalizedDist < 0.4) return 9;
    if (normalizedDist < 0.6) return 8;
    if (normalizedDist < 0.8) return 7;
    if (normalizedDist < 1.0) return 6;
    return 0; // Miss
  } else {
    // WA Standard 10-ring target
    if (normalizedDist < 0.05) return 11; // X
    if (normalizedDist < 0.1) return 10;
    if (normalizedDist < 0.2) return 9;
    if (normalizedDist < 0.3) return 8;
    if (normalizedDist < 0.4) return 7;
    if (normalizedDist < 0.5) return 6;
    if (normalizedDist < 0.6) return 5;
    if (normalizedDist < 0.7) return 4;
    if (normalizedDist < 0.8) return 3;
    if (normalizedDist < 0.9) return 2;
    if (normalizedDist < 1.0) return 1;
    return 0; // Miss
  }
};

// Generate a single round with random shots
const generateRound = (
  roundNumber: number,
  arrowsPerRound: number,
  targetType: string,
  skillLevel: number = 0.3 // 0 = beginner (scattered), 1 = expert (centered)
): Round => {
  const shots: Shot[] = [];
  const centerBias = 1 - (skillLevel * 0.7); // Convert skill to center bias
  
  for (let i = 0; i < arrowsPerRound; i++) {
    const { x, y } = generateRandomShot(centerBias);
    const ring = calculateRing(x, y, targetType);
    
    shots.push({
      id: `shot-${roundNumber}-${i}`,
      x,
      y,
      ring,
      timestamp: Date.now(),
    });
  }
  
  return {
    id: `round-${roundNumber}`,
    number: roundNumber,
    shots,
    total: shots.reduce((sum, s) => sum + (s.ring > 10 ? 10 : s.ring), 0),
    completed: true,
  };
};

// Generate a complete session
export const generateTestSession = (options: {
  targetType: 'wa_standard' | 'vegas_3spot' | 'nfaa_indoor';
  distance: string;
  bowId: string;
  bowName: string;
  numRounds: number;
  arrowsPerRound: number;
  skillLevel?: number;
  sessionType?: 'training' | 'competition';
  daysAgo?: number;
}): Session => {
  const {
    targetType,
    distance,
    bowId,
    bowName,
    numRounds,
    arrowsPerRound,
    skillLevel = 0.5,
    sessionType = 'training',
    daysAgo = 0,
  } = options;
  
  const rounds: Round[] = [];
  for (let i = 0; i < numRounds; i++) {
    rounds.push(generateRound(i + 1, arrowsPerRound, targetType, skillLevel));
  }
  
  const totalScore = rounds.reduce((sum, r) => sum + r.total, 0);
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  
  return {
    id: `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Test ${targetType.replace('_', ' ')} Session`,
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
    rounds,
    total_score: totalScore,
    bow_id: bowId,
    bow_name: bowName,
    distance,
    target_type: targetType,
    session_type: sessionType,
    completed: true,
  };
};

// Generate a set of test sessions for different target types
export const generateTestDataSet = async (): Promise<Session[]> => {
  const testBow: Bow = {
    id: 'test-bow-1',
    name: 'Test Recurve',
    bow_type: 'recurve',
    draw_weight: 30,
    draw_length: 28,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  const sessions: Session[] = [
    // WA Standard sessions
    generateTestSession({
      targetType: 'wa_standard',
      distance: '18m',
      bowId: testBow.id,
      bowName: testBow.name,
      numRounds: 6,
      arrowsPerRound: 3,
      skillLevel: 0.6,
      sessionType: 'training',
      daysAgo: 0,
    }),
    generateTestSession({
      targetType: 'wa_standard',
      distance: '30m',
      bowId: testBow.id,
      bowName: testBow.name,
      numRounds: 6,
      arrowsPerRound: 3,
      skillLevel: 0.4,
      sessionType: 'training',
      daysAgo: 1,
    }),
    
    // Vegas 3-spot sessions
    generateTestSession({
      targetType: 'vegas_3spot',
      distance: '18m',
      bowId: testBow.id,
      bowName: testBow.name,
      numRounds: 10,
      arrowsPerRound: 3,
      skillLevel: 0.7,
      sessionType: 'competition',
      daysAgo: 2,
    }),
    
    // WA Indoor (NFAA) sessions
    generateTestSession({
      targetType: 'nfaa_indoor',
      distance: '18m',
      bowId: testBow.id,
      bowName: testBow.name,
      numRounds: 10,
      arrowsPerRound: 3,
      skillLevel: 0.5,
      sessionType: 'competition',
      daysAgo: 3,
    }),
  ];
  
  return sessions;
};

// Export for use in development
export default {
  generateTestSession,
  generateTestDataSet,
  generateRandomShot,
  calculateRing,
};
