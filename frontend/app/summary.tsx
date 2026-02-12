import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { createSession, addRoundToSession } from '../utils/localStorage';

// Ring colors for FITA target - with better visibility
const getRingColor = (ring: number): string => {
  if (ring >= 11) return '#FFD700'; // X - Gold (inner 10)
  if (ring === 10) return '#FFD700'; // 10 - Gold
  if (ring === 9) return '#FFD700'; // 9 - Gold
  if (ring === 8) return '#DC143C'; // 8 - Red
  if (ring === 7) return '#DC143C'; // 7 - Red
  if (ring === 6) return '#4169E1'; // 6 - Blue
  if (ring === 5) return '#4169E1'; // 5 - Blue
  if (ring === 4) return '#222222'; // 4 - Black
  if (ring === 3) return '#222222'; // 3 - Black
  if (ring === 2) return '#f0f0f0'; // 2 - White
  if (ring === 1) return '#f0f0f0'; // 1 - White
  return '#666666'; // Miss
};

// Get display value for shot (X for inner 10, M for miss)
const getDisplayScore = (ring: number): string => {
  if (ring >= 11) return 'X';
  if (ring === 0) return 'M';
  return ring.toString();
};

// Get actual point value (X = 10, not 11)
const getPointValue = (ring: number): number => {
  if (ring >= 11) return 10; // X is worth 10 points
  return ring;
};

// Check if ring needs a border (for black rings on dark background)
const needsBorder = (ring: number): boolean => {
  return ring === 3 || ring === 4;
};

export default function SummaryScreen() {
  const router = useRouter();
  const { 
    currentRound, 
    clearCurrentRound, 
    clearAll,
    sessionType,
    currentRoundNumber,
    incrementRoundNumber,
    sessionRounds,
    addSessionRound,
    selectedBow,
    sessionDistance,
    targetType,
  } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const [roundAdded, setRoundAdded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isCompetition = sessionType === 'competition';

  useEffect(() => {
    // Add current round to session rounds if it exists and hasn't been added yet
    if (currentRound && !roundAdded) {
      addSessionRound({
        roundNumber: currentRoundNumber,
        shots: currentRound.shots,
        total: currentRound.total,
      });
      setRoundAdded(true);
    }
  }, [currentRound, roundAdded]);

  const getTotalSessionScore = () => {
    return sessionRounds.reduce((sum, round) => sum + (round.total || 0), 0);
  };

  const handleSaveSession = async () => {
    setIsSaving(true);
    try {
      // Create session with bow, distance, and target type using local storage
      const session = await createSession({
        name: `Session ${new Date().toLocaleDateString()}`,
        bow_id: selectedBow?.id || undefined,
        bow_name: selectedBow?.name || undefined,
        distance: sessionDistance || undefined,
        target_type: targetType || 'wa_standard',
      });

      // Add all rounds to session
      for (const round of sessionRounds) {
        await addRoundToSession(session.id, {
          round_number: round.roundNumber,
          shots: round.shots,
        });
      }

      // Clear all data and go to main screen
      clearAll();
      router.replace('/');
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
    router.push('/scoring');
  };

  const handleFinishSession = () => {
    setShowConfirmModal(true);
  };

  const handleDiscard = () => {
    setShowConfirmModal(false);
    clearAll();
    router.replace('/');
  };

  const handleSaveAndClose = async () => {
    setShowConfirmModal(false);
    await handleSaveSession();
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
                  {currentRound.shots.map((shot: any, index: number) => {
                    const ringColor = getRingColor(shot.ring);
                    const displayScore = getDisplayScore(shot.ring);
                    const hasBorder = needsBorder(shot.ring);
                    return (
                      <View key={index} style={styles.shotItem}>
                        <View
                          style={[
                            styles.shotRingColor,
                            { 
                              backgroundColor: ringColor,
                              borderWidth: hasBorder ? 2 : 0,
                              borderColor: hasBorder ? '#666666' : 'transparent',
                            },
                          ]}
                        />
                        <Text style={styles.shotNumber}>#{index + 1}</Text>
                        <Text style={styles.shotScore}>
                          {displayScore}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Score Table */}
        <View style={styles.scoreTableCard}>
          <Text style={styles.scoreTableTitle}>Score Table</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.roundColumn]}>Round</Text>
            <Text style={[styles.tableHeaderCell, styles.arrowsColumn]}>Arrows</Text>
            <Text style={[styles.tableHeaderCell, styles.scoreColumn]}>Score</Text>
            <Text style={[styles.tableHeaderCell, styles.totalColumn]}>Total</Text>
          </View>
          
          {/* Table Rows - Show all completed rounds */}
          {sessionRounds.map((round, index) => {
            const runningTotal = sessionRounds
              .slice(0, index + 1)
              .reduce((sum, r) => sum + (r.total || 0), 0);
            
            return (
              <View 
                key={index} 
                style={[
                  styles.tableRow,
                  styles.tableRowCompleted,
                  index === sessionRounds.length - 1 && styles.tableRowCurrent
                ]}
              >
                <Text style={[styles.tableCell, styles.roundColumn]}>
                  {round.roundNumber}
                </Text>
                <Text style={[styles.tableCell, styles.arrowsColumn]}>
                  {round.shots.length}
                </Text>
                <Text style={[styles.tableCell, styles.scoreColumn]}>
                  {round.total}
                </Text>
                <Text style={[styles.tableCell, styles.totalColumn]}>
                  {runningTotal}
                </Text>
              </View>
            );
          })}
          
          {/* Table Footer - Grand Total */}
          <View style={styles.tableFooter}>
            <Text style={[styles.tableFooterCell, styles.roundColumn]}>Total</Text>
            <Text style={[styles.tableFooterCell, styles.arrowsColumn]}>
              {sessionRounds.reduce((sum, r) => sum + r.shots.length, 0)}
            </Text>
            <Text style={[styles.tableFooterCell, styles.scoreColumn]}></Text>
            <Text style={[styles.tableFooterCell, styles.totalColumn, styles.grandTotal]}>
              {getTotalSessionScore()}
            </Text>
          </View>
        </View>

        {/* Session Type Badge */}
        <View style={[styles.sessionTypeBadge, isCompetition ? styles.competitionBadge : styles.trainingBadge]}>
          <Ionicons 
            name={isCompetition ? "trophy" : "fitness"} 
            size={16} 
            color={isCompetition ? "#FFD700" : "#ff4444"} 
          />
          <Text style={[styles.sessionTypeText, isCompetition ? styles.competitionText : styles.trainingText]}>
            {isCompetition ? 'Competition' : 'Training'}
          </Text>
          <Text style={styles.roundProgress}>
            Round {currentRoundNumber}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Add Round button - always available */}
          <TouchableOpacity
            style={styles.addRoundButton}
            onPress={handleAddRound}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addRoundText}>Add Another Round</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishSession}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#8B0000" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={24} color="#8B0000" />
                <Text style={styles.finishText}>Finish & Save</Text>
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
                  {getDisplayScore(Math.max(...currentRound.shots.map((s: any) => s.ring)))}
                </Text>
                <Text style={styles.quickStatLabel}>Best Shot</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {currentRound.shots.filter((s: any) => s.ring > 0).length > 0 
                    ? getDisplayScore(Math.min(...currentRound.shots.filter((s: any) => s.ring > 0).map((s: any) => s.ring))) 
                    : '-'}
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

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="help-circle" size={48} color="#8B0000" />
            <Text style={styles.modalTitle}>Finish Session?</Text>
            <Text style={styles.modalMessage}>Do you want to save this session?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalDiscardButton}
                onPress={handleDiscard}
              >
                <Text style={styles.modalDiscardText}>Discard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveAndClose}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    backgroundColor: 'rgba(139, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 0, 0, 0.5)',
  },
  sessionTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  competitionText: {
    color: '#FFD700',
  },
  trainingText: {
    color: '#ff4444',
  },
  roundProgress: {
    color: '#888888',
    fontSize: 14,
    marginLeft: 8,
  },
  scoreTableCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  scoreTableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  tableHeaderCell: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  tableRowCompleted: {
    backgroundColor: 'transparent',
  },
  tableRowPending: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  tableRowCurrent: {
    backgroundColor: 'rgba(139, 0, 0, 0.2)',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  tableCell: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  tableCellPending: {
    color: '#444444',
  },
  roundColumn: {
    flex: 1,
  },
  arrowsColumn: {
    flex: 1,
  },
  scoreColumn: {
    flex: 1,
  },
  totalColumn: {
    flex: 1,
    fontWeight: 'bold',
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  tableFooterCell: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  grandTotal: {
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: '#111111',
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
    color: '#888888',
    marginBottom: 8,
  },
  roundScore: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  pointsLabel: {
    fontSize: 18,
    color: '#888888',
  },
  shotsBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
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
    color: '#888888',
  },
  shotScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionsContainer: {
    marginBottom: 16,
  },
  addRoundButton: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
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
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  finishText: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  completionMessage: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 12,
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  quickStats: {
    backgroundColor: '#111111',
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
    color: '#888888',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalDiscardButton: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalDiscardText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#8B0000',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
