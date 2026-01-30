import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Modal,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, TARGET_CONFIGS } from '../store/appStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_TARGET_SIZE = Math.min(SCREEN_WIDTH - 40, SCREEN_HEIGHT * 0.4);
const SMALL_TARGET_SIZE = Math.min((SCREEN_WIDTH - 60) / 3, 110);

interface Arrow {
  id: string;
  x: number;
  y: number;
  score: number;
  targetIndex?: number;
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
  const targetRefs = useRef<{ [key: number]: View | null }>({});

  const targetConfig = TARGET_CONFIGS[targetType as keyof typeof TARGET_CONFIGS] || TARGET_CONFIGS.wa_standard;
  const isVegas = targetType === 'vegas_3spot';
  const isNFAA = targetType === 'nfaa_indoor';
  const isMultiTarget = isVegas || isNFAA;
  const isCompetition = sessionType === 'competition';

  // Calculate score based on distance from center
  const calculateScore = (normalizedX: number, normalizedY: number): number => {
    const dx = normalizedX - 0.5;
    const dy = normalizedY - 0.5;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
    
    // The rings take up 95% of the target, so max ring radius is 0.475
    const normalizedDist = distFromCenter / 0.475;
    
    if (targetType === 'wa_standard') {
      if (normalizedDist > 1.0) return 0;
      if (normalizedDist > 0.9) return 1;
      if (normalizedDist > 0.8) return 2;
      if (normalizedDist > 0.7) return 3;
      if (normalizedDist > 0.6) return 4;
      if (normalizedDist > 0.5) return 5;
      if (normalizedDist > 0.4) return 6;
      if (normalizedDist > 0.3) return 7;
      if (normalizedDist > 0.2) return 8;
      if (normalizedDist > 0.1) return 9;
      return 10;
    } else {
      if (normalizedDist > 1.0) return 0;
      if (normalizedDist > 0.8) return 6;
      if (normalizedDist > 0.6) return 7;
      if (normalizedDist > 0.4) return 8;
      if (normalizedDist > 0.2) return 9;
      return 10;
    }
  };

  const handleTargetPress = (event: GestureResponderEvent, targetIndex: number, targetSize: number) => {
    const nativeEvent = event.nativeEvent as any;
    
    let x = targetSize / 2;
    let y = targetSize / 2;
    
    // React Native Web wraps the DOM event
    // The actual DOM coordinates are in different properties depending on the RN Web version
    if (Platform.OS === 'web') {
      // Web: try to get coordinates from the original DOM event
      const domEvent = nativeEvent;
      if (domEvent.nativeEvent) {
        // Sometimes it's nested
        const innerEvent = domEvent.nativeEvent;
        if (innerEvent.offsetX !== undefined) {
          x = innerEvent.offsetX;
          y = innerEvent.offsetY;
        }
      } else if (domEvent.offsetX !== undefined) {
        x = domEvent.offsetX;
        y = domEvent.offsetY;
      } else if (domEvent.layerX !== undefined) {
        x = domEvent.layerX;
        y = domEvent.layerY;
      }
    } else {
      // Native iOS/Android
      if (nativeEvent.locationX !== undefined) {
        x = nativeEvent.locationX;
        y = nativeEvent.locationY;
      }
    }
    
    // Normalize to 0-1 range
    const normalizedX = Math.max(0, Math.min(1, x / targetSize));
    const normalizedY = Math.max(0, Math.min(1, y / targetSize));
    
    const score = calculateScore(normalizedX, normalizedY);
    
    const newArrow: Arrow = {
      id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: normalizedX,
      y: normalizedY,
      score,
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
        score: newScore,
      };
      setArrows(updated);
    }
    setShowScorePicker(false);
    setSelectedArrowIndex(null);
  };

  const handleDeleteArrow = (index: number) => {
    setArrows(prev => prev.filter((_, i) => i !== index));
    setShowScorePicker(false);
    setSelectedArrowIndex(null);
  };

  const getTotalScore = () => arrows.reduce((sum, a) => sum + a.score, 0);

  const getScoreColor = (score: number) => {
    if (score >= 9) return '#FFD700';
    if (score >= 7) return '#ed1c24';
    if (score >= 5) return '#00a2e8';
    if (score >= 3) return '#2a2a2a';
    if (score >= 1) return '#f5f5f0';
    return '#666';
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

    setCurrentRound({
      shots: arrows.map(a => ({ x: a.x, y: a.y, ring: a.score })),
      total: getTotalScore(),
    });
    router.push('/summary');
  };

  const getAvailableScores = (): number[] => {
    if (targetType === 'wa_standard') {
      return [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    } else {
      return [10, 9, 8, 7, 6, 0];
    }
  };

  // Render a single target face
  const renderTargetFace = (targetIndex: number, size: number) => {
    const rings = targetConfig.rings;
    const colors = targetConfig.colors;
    const ringElements = [];
    
    for (let i = 0; i < rings; i++) {
      const ringRatio = (rings - i) / rings;
      const ringSize = size * ringRatio * 0.95;
      const color = colors[i];
      
      ringElements.push(
        <View
          key={`ring-${targetIndex}-${i}`}
          style={{
            position: 'absolute',
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            backgroundColor: color?.bg || '#f5f5f0',
            borderWidth: 1,
            borderColor: color?.border || '#333',
          }}
          pointerEvents="none"
        />
      );
    }

    const targetArrows = isMultiTarget 
      ? arrows.filter(a => a.targetIndex === targetIndex)
      : arrows;

    return (
      <TouchableOpacity
        key={`target-${targetIndex}`}
        activeOpacity={1}
        style={{
          width: size,
          height: size,
          backgroundColor: '#1a1a1a',
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        onPress={(e) => handleTargetPress(e, targetIndex, size)}
      >
        {ringElements}
        
        <View style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' }} pointerEvents="none" />

        {targetArrows.map((arrow) => {
          const globalIndex = arrows.findIndex(a => a.id === arrow.id);
          return (
            <TouchableOpacity
              key={arrow.id}
              style={[
                styles.arrowMarker,
                {
                  left: arrow.x * size - 12,
                  top: arrow.y * size - 12,
                  backgroundColor: getScoreColor(arrow.score),
                },
              ]}
              onPress={() => handleEditArrow(globalIndex)}
            >
              <Text style={[styles.arrowMarkerText, { color: getScoreTextColor(arrow.score) }]}>
                {arrow.score === 10 ? 'X' : arrow.score === 0 ? 'M' : arrow.score}
              </Text>
            </TouchableOpacity>
          );
        })}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{targetConfig.name}</Text>
          <View style={[styles.roundBadge, isCompetition ? styles.competitionBadge : styles.trainingBadge]}>
            <Ionicons name={isCompetition ? "trophy" : "fitness"} size={12} color={isCompetition ? "#FFD700" : "#ff4444"} />
            <Text style={styles.roundText}>Round {currentRoundNumber}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Target Area */}
        <View style={styles.targetWrapper}>
          {isVegas ? (
            <View style={styles.triangleContainer}>
              <View style={styles.triangleTop}>
                {renderTargetFace(0, SMALL_TARGET_SIZE)}
              </View>
              <View style={styles.triangleBottom}>
                {renderTargetFace(1, SMALL_TARGET_SIZE)}
                <View style={{ width: 20 }} />
                {renderTargetFace(2, SMALL_TARGET_SIZE)}
              </View>
            </View>
          ) : isNFAA ? (
            <View style={styles.verticalContainer}>
              {renderTargetFace(0, SMALL_TARGET_SIZE)}
              <View style={{ height: 12 }} />
              {renderTargetFace(1, SMALL_TARGET_SIZE)}
              <View style={{ height: 12 }} />
              {renderTargetFace(2, SMALL_TARGET_SIZE)}
            </View>
          ) : (
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
                  style={[styles.arrowItem, { backgroundColor: getScoreColor(arrow.score) }]}
                  onPress={() => handleEditArrow(index)}
                  onLongPress={() => handleDeleteArrow(index)}
                >
                  <Text style={[styles.arrowScore, { color: getScoreTextColor(arrow.score) }]}>
                    {arrow.score === 10 ? 'X' : arrow.score === 0 ? 'M' : arrow.score}
                  </Text>
                  {isMultiTarget && arrow.targetIndex !== undefined && (
                    <Text style={[styles.arrowTargetLabel, { color: getScoreTextColor(arrow.score) }]}>
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
            <TouchableOpacity style={styles.deleteButton} onPress={() => selectedArrowIndex !== null && handleDeleteArrow(selectedArrowIndex)}>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 32,
  },
  targetWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  triangleContainer: {
    alignItems: 'center',
  },
  triangleTop: {
    marginBottom: 16,
  },
  triangleBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  verticalContainer: {
    alignItems: 'center',
  },
  arrowMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  arrowMarkerText: {
    fontSize: 10,
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
    borderWidth: 2,
    borderColor: '#333',
  },
  arrowScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  arrowTargetLabel: {
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
    backgroundColor: 'rgba(0,0,0,0.85)',
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
    borderColor: '#444',
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
