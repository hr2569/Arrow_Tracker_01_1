import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Max rounds for competition mode
const MAX_COMPETITION_ROUNDS = 10;

// Ring colors for FITA target
const RING_COLORS = [
  '#f0f0f0', // 1 - White outer
  '#f0f0f0', // 2 - White inner
  '#1a1a2e', // 3 - Black outer
  '#1a1a2e', // 4 - Black inner
  '#4169E1', // 5 - Blue outer
  '#4169E1', // 6 - Blue inner
  '#DC143C', // 7 - Red outer
  '#DC143C', // 8 - Red inner
  '#FFD700', // 9 - Gold outer
  '#FFD700', // 10 - Gold inner/center
];

export default function SummaryScreen() {
  const router = useRouter();
  const { 
    currentRound, 
    currentSession, 
    setCurrentSession, 
    clearCurrentRound, 
    clearAll,
    sessionType,
    currentRoundNumber,
    incrementRoundNumber,
  } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const [sessionRounds, setSessionRounds] = useState<any[]>([]);

  const isCompetition = sessionType === 'competition';
  const isLastCompetitionRound = isCompetition && currentRoundNumber >= MAX_COMPETITION_ROUNDS;

  useEffect(() => {
    // Add current round to session rounds if it exists
    if (currentRound) {
      setSessionRounds([...sessionRounds, {
        roundNumber: currentRoundNumber,
        ...currentRound,
      }]);
    }
  }, []);

  const getTotalSessionScore = () => {
    return sessionRounds.reduce((sum, round) => sum + (round.total || 0), 0);
  };

  const handleSaveSession = async () => {
    setIsSaving(true);
    try {
      // Create session
      const sessionResponse = await axios.post(`${API_URL}/api/sessions`, {
        name: `Session ${new Date().toLocaleDateString()}`,
      });

      const sessionId = sessionResponse.data.id;

      // Add all rounds to session
      for (const round of sessionRounds) {
        await axios.post(`${API_URL}/api/sessions/${sessionId}/rounds`, {
          round_number: round.roundNumber,
          shots: round.shots,
        });
      }

      Alert.alert(
        'Session Saved!',
        `Total score: ${getTotalSessionScore()} points`,
        [
          {
            text: 'View History',
            onPress: () => {
              clearAll();
              router.replace('/history');
            },
          },
          {
            text: 'New Session',
            onPress: () => {
              clearAll();
              router.replace('/');
            },
          },
        ]
      );
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRound = () => {
    clearCurrentRound();
    incrementRoundNumber();
    router.push('/capture');
  };

  const handleFinishSession = () => {
    Alert.alert(
      'Finish Session?',
      'Do you want to save this session?',
      [
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            clearAll();
            router.replace('/');
          },
        },
        {
          text: 'Save',
          onPress: handleSaveSession,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Round Summary</Text>
          
          {currentRound && (
            <>
              <View style={styles.scoreDisplay}>
                <Text style={styles.roundLabel}>
                  Round {sessionRounds.length}
                </Text>
                <Text style={styles.roundScore}>{currentRound.total}</Text>
                <Text style={styles.pointsLabel}>points</Text>
              </View>

              {/* Shot Breakdown */}
              <View style={styles.shotsBreakdown}>
                <Text style={styles.breakdownTitle}>Shots</Text>
                <View style={styles.shotsList}>
                  {currentRound.shots.map((shot: any, index: number) => (
                    <View key={index} style={styles.shotItem}>
                      <View
                        style={[
                          styles.shotRingColor,
                          { backgroundColor: shot.ring > 0 ? RING_COLORS[shot.ring - 1] : '#666' },
                        ]}
                      />
                      <Text style={styles.shotNumber}>#{index + 1}</Text>
                      <Text style={styles.shotScore}>
                        {shot.ring > 0 ? shot.ring : 'Miss'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Session Total */}
        {sessionRounds.length > 0 && (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>Session Total</Text>
            <View style={styles.sessionStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{sessionRounds.length}</Text>
                <Text style={styles.statLabel}>Rounds</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{getTotalSessionScore()}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {sessionRounds.length > 0
                    ? Math.round(getTotalSessionScore() / sessionRounds.length)
                    : 0}
                </Text>
                <Text style={styles.statLabel}>Avg/Round</Text>
              </View>
            </View>

            {/* Previous Rounds */}
            {sessionRounds.length > 1 && (
              <View style={styles.previousRounds}>
                <Text style={styles.previousTitle}>All Rounds</Text>
                {sessionRounds.map((round, index) => (
                  <View key={index} style={styles.previousRoundItem}>
                    <Text style={styles.previousRoundNumber}>
                      Round {round.roundNumber}
                    </Text>
                    <Text style={styles.previousRoundScore}>
                      {round.total} pts
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Session Type Badge */}
        <View style={[styles.sessionTypeBadge, isCompetition ? styles.competitionBadge : styles.trainingBadge]}>
          <Ionicons 
            name={isCompetition ? "trophy" : "fitness"} 
            size={16} 
            color={isCompetition ? "#FFD700" : "#4CAF50"} 
          />
          <Text style={[styles.sessionTypeText, isCompetition ? styles.competitionText : styles.trainingText]}>
            {isCompetition ? 'Competition' : 'Training'}
          </Text>
          {isCompetition && (
            <Text style={styles.roundProgress}>
              Round {currentRoundNumber}/{MAX_COMPETITION_ROUNDS}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Show Add Round button only if not last competition round */}
          {!isLastCompetitionRound && (
            <TouchableOpacity
              style={styles.addRoundButton}
              onPress={handleAddRound}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.addRoundText}>
                {isCompetition 
                  ? `Add Round ${currentRoundNumber + 1} of ${MAX_COMPETITION_ROUNDS}`
                  : 'Add Another Round'
                }
              </Text>
            </TouchableOpacity>
          )}

          {/* Show completion message for competition */}
          {isLastCompetitionRound && (
            <View style={styles.completionMessage}>
              <Ionicons name="trophy" size={32} color="#FFD700" />
              <Text style={styles.completionTitle}>Competition Complete!</Text>
              <Text style={styles.completionSubtitle}>
                All {MAX_COMPETITION_ROUNDS} rounds finished
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishSession}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#e94560" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={24} color="#e94560" />
                <Text style={styles.finishText}>Finish & Save Session</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        {currentRound && currentRound.shots.length > 0 && (
          <View style={styles.quickStats}>
            <Text style={styles.quickStatsTitle}>Round Statistics</Text>
            <View style={styles.quickStatsGrid}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {Math.max(...currentRound.shots.map((s: any) => s.ring))}
                </Text>
                <Text style={styles.quickStatLabel}>Best Shot</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {Math.min(...currentRound.shots.filter((s: any) => s.ring > 0).map((s: any) => s.ring)) || '-'}
                </Text>
                <Text style={styles.quickStatLabel}>Worst Shot</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {currentRound.shots.filter((s: any) => s.ring >= 9).length}
                </Text>
                <Text style={styles.quickStatLabel}>Gold Hits</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {currentRound.shots.filter((s: any) => s.ring === 0).length}
                </Text>
                <Text style={styles.quickStatLabel}>Misses</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  scrollContent: {
    padding: 20,
  },
  sessionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  competitionBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  trainingBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  sessionTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  competitionText: {
    color: '#FFD700',
  },
  trainingText: {
    color: '#4CAF50',
  },
  roundProgress: {
    color: '#a0a0a0',
    fontSize: 14,
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  roundLabel: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  roundScore: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#e94560',
  },
  pointsLabel: {
    fontSize: 18,
    color: '#a0a0a0',
  },
  shotsBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
    paddingTop: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  shotsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shotItem: {
    alignItems: 'center',
  },
  shotRingColor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  shotNumber: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  shotScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  sessionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
  },
  statLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2a2a4e',
  },
  previousRounds: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
    paddingTop: 16,
  },
  previousTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0a0a0',
    marginBottom: 12,
  },
  previousRoundItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  previousRoundNumber: {
    color: '#fff',
    fontSize: 14,
  },
  previousRoundScore: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    marginBottom: 16,
  },
  addRoundButton: {
    flexDirection: 'row',
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addRoundText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  finishButton: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  finishText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickStats: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickStatItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
});
