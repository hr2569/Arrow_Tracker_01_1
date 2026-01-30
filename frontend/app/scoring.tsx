import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, TARGET_CONFIGS } from '../store/appStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_TARGET_SIZE = Math.min(SCREEN_WIDTH - 32, SCREEN_HEIGHT * 0.45);

interface Arrow {
  id: string;
  x: number;
  y: number;
  ring: number;
  targetIndex?: number; // For multi-target layouts
}

export default function ScoringScreen() {
  const router = useRouter();
  const { 
    setCurrentRound, 
    sessionType, 
    currentRoundNumber, 
    targetType,
  } = useAppStore();
  
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [selectedArrowIndex, setSelectedArrowIndex] = useState<number | null>(null);
  const [showScorePicker, setShowScorePicker] = useState(false);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState(0);

  // Get target configuration
  const targetConfig = TARGET_CONFIGS[targetType as keyof typeof TARGET_CONFIGS] || TARGET_CONFIGS.wa_standard;
  const isMultiTarget = targetConfig.layout === 'triple_vertical' || targetConfig.layout === 'triple_triangle';

  // Session info
  const isCompetition = sessionType === 'competition';

  // Calculate score from ring position based on target type
  const calculateScoreFromRing = (ringIndex: number): number => {
    const scores = targetConfig.scores;
    if (ringIndex < 0) return 0; // Miss
    if (ringIndex >= scores.length) return scores[scores.length - 1];
    return scores[ringIndex];
  };

  const calculateRingFromPosition = (x: number, y: number): number => {
    // Calculate distance from center (0.5, 0.5)
    const dx = x - 0.5;
    const dy = y - 0.5;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const rings = targetConfig.rings;
    
    // Map distance to ring index (0 = outermost visible ring)
    const normalizedDist = distance / 0.45;
    
    if (normalizedDist > 1.1) return -1; // Miss
    
    // Calculate which ring was hit (0 = outermost, rings-1 = innermost)
    const ringIndex = Math.floor((1 - normalizedDist) * rings);
    return Math.max(0, Math.min(rings - 1, ringIndex));
  };

  const handleTargetPress = (event: any, targetIndex: number = 0) => {
    const { locationX, locationY } = event.nativeEvent;
    const targetSize = isMultiTarget ? (SCREEN_WIDTH - 48) / 3 : BASE_TARGET_SIZE;
    
    // Normalize coordinates to 0-1 range
    const x = Math.max(0, Math.min(1, locationX / targetSize));
    const y = Math.max(0, Math.min(1, locationY / targetSize));
    
    const ringIndex = calculateRingFromPosition(x, y);
    const score = ringIndex >= 0 ? calculateScoreFromRing(ringIndex) : 0;
    
    const newArrow: Arrow = {
      id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      ring: score,
      targetIndex: isMultiTarget ? targetIndex : undefined,
    };

    setArrows(prev => [...prev, newArrow]);
  };

  const handleEditArrow = (index: number) => {
    setSelectedArrowIndex(index);
    setShowScorePicker(true);
  };

  const handleUpdateScore = (newScore: number) => {
    if (selectedArrowIndex !== null) {
      const updated = [...arrows];
      updated[selectedArrowIndex] = {
        ...updated[selectedArrowIndex],
        ring: newScore,
      };
      setArrows(updated);
    }
    setShowScorePicker(false);
    setSelectedArrowIndex(null);
  };

  const handleDeleteArrow = (index: number) => {
    setArrows(prev => prev.filter((_, i) => i !== index));
  };

  const getTotalScore = () => arrows.reduce((sum, a) => sum + a.ring, 0);

  const getScoreColor = (score: number) => {
    if (score >= 9) return '#FFD700';
    if (score >= 7) return '#ed1c24';
    if (score >= 5) return '#00a2e8';
    if (score >= 3) return '#2a2a2a';
    if (score >= 1) return '#f5f5f0';
    return '#888';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 9) return '#000';
    if (score >= 7) return '#fff';
    if (score >= 5) return '#fff';
    if (score >= 3) return '#fff';
    if (score >= 1) return '#000';
    return '#fff';
  };

  const handleFinishRound = () => {
    if (arrows.length === 0) {
      Alert.alert('No Arrows', 'Please mark at least one arrow before finishing.');
      return;
    }

    finishRound();
  };

  const finishRound = () => {
    setCurrentRound({
      shots: arrows.map(a => ({ x: a.x, y: a.y, ring: a.ring })),
      total: getTotalScore(),
    });
    router.push('/summary');
  };

  const handleBack = () => {
    router.back();
  };

  // Get available scores for the picker based on target type
  const getAvailableScores = (): number[] => {
    if (targetType === 'wa_standard') {
      return [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    } else {
      // Vegas and NFAA: 10, 9, 8, 7, 6, 0 (miss)
      return [10, 9, 8, 7, 6, 0];
    }
  };

  // Render a single target face
  const renderTargetFace = (targetIndex: number = 0, size: number = BASE_TARGET_SIZE) => {
    const rings = targetConfig.rings;
    const ringElements = [];
    
    // Draw rings from largest (outermost) to smallest (innermost)
    for (let i = 0; i < rings; i++) {
      const ringRatio = (rings - i) / rings;
      const ringSize = size * ringRatio;
      const color = targetConfig.colors[i];
      
      const fillColor = color?.bg || '#f5f5f0';
      const borderCol = color?.border || '#333';
      
      ringElements.push(
        <View
          key={`ring-${targetIndex}-${i}`}
          style={[
            styles.ring,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: borderCol,
              borderWidth: 1,
              backgroundColor: fillColor,
            },
          ]}
        />
      );
    }

    // Get arrows for this target
    const targetArrows = isMultiTarget 
      ? arrows.filter(a => a.targetIndex === targetIndex)
      : arrows;

    return (
      <Pressable
        key={`target-${targetIndex}`}
        style={[styles.targetContainer, { width: size, height: size }]}
        onPress={(e) => handleTargetPress(e, targetIndex)}
      >
        <View style={[styles.ringOverlay, { width: size, height: size }]} pointerEvents="none">
          {ringElements}
          {/* Center dot */}
          <View style={[styles.centerDot, { width: size * 0.05, height: size * 0.05, borderRadius: size * 0.025 }]} />
        </View>

        {/* Arrow Markers */}
        {targetArrows.map((arrow, index) => {
          const globalIndex = arrows.findIndex(a => a.id === arrow.id);
          return (
            <TouchableOpacity
              key={arrow.id}
              style={[
                styles.arrowMarker,
                {
                  left: arrow.x * size - 10,
                  top: arrow.y * size - 10,
                  backgroundColor: getScoreColor(arrow.ring),
                  width: 20,
                  height: 20,
                },
              ]}
              onPress={() => handleEditArrow(globalIndex)}
            >
              <Text style={[styles.arrowMarkerText, { color: getScoreTextColor(arrow.ring), fontSize: 10 }]}>
                {arrow.ring === 10 ? 'X' : arrow.ring}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{targetConfig.name}</Text>
          <View style={[styles.roundBadge, isCompetition ? styles.competitionBadge : styles.trainingBadge]}>
            <Ionicons name={isCompetition ? "trophy" : "fitness"} size={12} color={isCompetition ? "#FFD700" : "#ff4444"} />
            <Text style={styles.roundText}>Round {currentRoundNumber}</Text>
          </View>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Target Area */}
        <View style={styles.targetWrapper}>
          {isMultiTarget ? (
            // Render 3 targets for Vegas/NFAA
            <View style={styles.multiTargetContainer}>
              {[0, 1, 2].map((index) => (
                <View key={index} style={styles.smallTargetWrapper}>
                  {renderTargetFace(index, (SCREEN_WIDTH - 64) / 3)}
                  <Text style={styles.targetLabel}>Target {index + 1}</Text>
                </View>
              ))}
            </View>
          ) : (
            // Render single target for WA Standard
            renderTargetFace(0, BASE_TARGET_SIZE)
          )}
        </View>

        {/* Arrow List */}
        <View style={styles.arrowList}>
          <View style={styles.arrowListHeader}>
            <Text style={styles.arrowListTitle}>Arrows ({arrows.length})</Text>
            <Text style={styles.totalScore}>Total: {getTotalScore()}</Text>
          </View>
          
          {arrows.length > 0 ? (
            <View style={styles.arrowGrid}>
              {arrows.map((arrow, index) => (
                <TouchableOpacity
                  key={arrow.id}
                  style={[styles.arrowItem, { backgroundColor: getScoreColor(arrow.ring) }]}
                  onPress={() => handleEditArrow(index)}
                  onLongPress={() => handleDeleteArrow(index)}
                >
                  <Text style={[styles.arrowScore, { color: getScoreTextColor(arrow.ring) }]}>
                    {arrow.ring === 10 ? 'X' : arrow.ring}
                  </Text>
                  {isMultiTarget && arrow.targetIndex !== undefined && (
                    <Text style={[styles.arrowTarget, { color: getScoreTextColor(arrow.ring) }]}>
                      T{arrow.targetIndex + 1}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noArrowsText}>Tap on target to mark arrows</Text>
          )}
        </View>

        {/* Finish Round Button */}
        <TouchableOpacity style={styles.finishButton} onPress={handleFinishRound}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.finishButtonText}>Finish Round</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Score Picker Modal */}
      <Modal visible={showScorePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Score</Text>
            <View style={styles.scoreGrid}>
              {getAvailableScores().map((score) => (
                <TouchableOpacity
                  key={score}
                  style={[styles.scoreButton, { backgroundColor: getScoreColor(score) }]}
                  onPress={() => handleUpdateScore(score)}
                >
                  <Text style={[styles.scoreButtonText, { color: getScoreTextColor(score) }]}>
                    {score === 10 ? 'X' : score === 0 ? 'M' : score}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                if (selectedArrowIndex !== null) {
                  handleDeleteArrow(selectedArrowIndex);
                }
                setShowScorePicker(false);
                setSelectedArrowIndex(null);
              }}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Arrow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowScorePicker(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  roundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  competitionBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  trainingBadge: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  roundText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  targetWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  multiTargetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  smallTargetWrapper: {
    alignItems: 'center',
  },
  targetLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  targetContainer: {
    position: 'relative',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  ringOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  centerDot: {
    position: 'absolute',
    backgroundColor: '#FFD700',
  },
  arrowMarker: {
    position: 'absolute',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  arrowMarkerText: {
    fontWeight: 'bold',
  },
  arrowList: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  arrowListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrowListTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  totalScore: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  arrowItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  arrowScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  arrowTarget: {
    fontSize: 8,
    marginTop: -2,
  },
  noArrowsText: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  finishButton: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH - 48,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  scoreButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  scoreButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
  },
});
