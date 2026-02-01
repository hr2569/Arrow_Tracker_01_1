import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { TARGET_CONFIGS } from '../store/appStore';
import { 
  getActiveCompetition, 
  commitRound, 
  Competition, 
  CompetitionShot,
  getRankings,
} from '../utils/competitionStorage';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_TARGET_SIZE = Math.min(SCREEN_WIDTH - 40, SCREEN_HEIGHT * 0.35);
const SMALL_TARGET_SIZE = Math.min((SCREEN_WIDTH - 60) / 3, 100);
const CONTAINER_HEIGHT = 320;

interface Arrow {
  id: string;
  x: number;
  y: number;
  score: number;
  targetIndex?: number;
}

export default function CompetitionScoringScreen() {
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [selectedArrowIndex, setSelectedArrowIndex] = useState<number | null>(null);
  const [showScorePicker, setShowScorePicker] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [lastRoundResult, setLastRoundResult] = useState<{
    archerName: string;
    roundNumber: number;
    shots: number[];
    total: number;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadCompetition = async () => {
    try {
      setLoading(true);
      const comp = await getActiveCompetition();
      if (comp) {
        setCompetition(comp);
        if (comp.status === 'completed') {
          router.replace('/competitionSummary');
        }
      } else {
        Alert.alert('No Competition', 'No active competition found.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading competition:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCompetition();
      setArrows([]);
    }, [])
  );

  const currentParticipant = competition?.participants[competition.currentParticipantIndex];
  const targetConfig = TARGET_CONFIGS[(competition?.targetType || 'wa_standard') as keyof typeof TARGET_CONFIGS];
  const isVegas = competition?.targetType === 'vegas_3spot';
  const isNFAA = competition?.targetType === 'nfaa_indoor';
  const isMultiTarget = isVegas || isNFAA;

  const calculateScore = useCallback((normalizedX: number, normalizedY: number): number => {
    const dx = normalizedX - 0.5;
    const dy = normalizedY - 0.5;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
    const normalizedDist = distFromCenter / 0.475;
    
    if (competition?.targetType === 'wa_standard') {
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
      if (normalizedDist > 0.05) return 10; // Regular 10
      return 11; // X ring
    } else {
      // Vegas 3-spot and NFAA Indoor
      if (normalizedDist > 1.0) return 0;
      if (normalizedDist > 0.8) return 6;
      if (normalizedDist > 0.6) return 7;
      if (normalizedDist > 0.4) return 8;
      if (normalizedDist > 0.2) return 9;
      if (normalizedDist > 0.1) return 10; // Regular 10
      return 11; // X ring
    }
  }, [competition?.targetType]);

  const handleTargetClick = useCallback((event: any, targetIndex: number, targetSize: number) => {
    if (arrows.length >= 3) {
      Alert.alert('Round Complete', 'You have already placed 3 arrows. Commit this round to continue.');
      return;
    }

    let x: number;
    let y: number;

    if (Platform.OS === 'web') {
      const nativeEvent = event.nativeEvent || event;
      if (typeof nativeEvent.offsetX === 'number') {
        x = nativeEvent.offsetX;
        y = nativeEvent.offsetY;
      } else {
        const rect = event.target?.getBoundingClientRect?.();
        if (rect) {
          x = nativeEvent.clientX - rect.left;
          y = nativeEvent.clientY - rect.top;
        } else {
          x = targetSize / 2;
          y = targetSize / 2;
        }
      }
    } else {
      const { locationX, locationY } = event.nativeEvent || {};
      x = locationX ?? targetSize / 2;
      y = locationY ?? targetSize / 2;
    }
    
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
  }, [arrows.length, isMultiTarget, calculateScore]);

  const handleEditArrow = (index: number) => {
    setSelectedArrowIndex(index);
    setShowScorePicker(true);
  };

  const handleUpdateScore = (newScore: number) => {
    if (selectedArrowIndex !== null) {
      const updated = [...arrows];
      updated[selectedArrowIndex] = { ...updated[selectedArrowIndex], score: newScore };
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

  const handleCommitRound = async () => {
    if (!competition || !currentParticipant) return;

    // Fill missing arrows with M (miss = 0 points)
    const filledArrows = [...arrows];
    while (filledArrows.length < 3) {
      filledArrows.push({
        id: `miss-${Date.now()}-${filledArrows.length}`,
        x: 0.5, // Center
        y: 0.5,
        score: 0, // Miss
      });
    }

    const shots: CompetitionShot[] = filledArrows.map(a => ({
      x: a.x,
      y: a.y,
      ring: a.score,
    }));

    // Store the result to show
    const roundResult = {
      archerName: currentParticipant.name,
      roundNumber: competition.currentRound,
      shots: filledArrows.map(a => a.score),
      total: filledArrows.reduce((sum, a) => sum + a.score, 0),
    };

    const updatedCompetition = await commitRound(
      competition.id,
      currentParticipant.id,
      competition.currentRound,
      shots
    );

    if (updatedCompetition) {
      setCompetition(updatedCompetition);
      setArrows([]);
      setLastRoundResult(roundResult);

      if (updatedCompetition.status === 'completed') {
        router.replace('/competitionSummary');
      } else {
        // Show the round result modal
        setShowRoundResult(true);
      }
    }
  };

  // X ring (11) counts as 10 points
  const getPointValue = (score: number) => score === 11 ? 10 : score;
  
  const getTotalScore = () => arrows.reduce((sum, a) => sum + getPointValue(a.score), 0);

  const getScoreColor = (score: number) => {
    if (score === 11) return '#FFD700'; // X ring - gold
    if (score >= 9) return '#FFD700';
    if (score >= 7) return '#ed1c24';
    if (score >= 5) return '#00a2e8';
    if (score >= 3) return '#2a2a2a';
    if (score >= 1) return '#f5f5f0';
    return '#666';
  };

  const getScoreTextColor = (score: number) => {
    if (score === 11) return '#000'; // X ring
    if (score >= 9) return '#000';
    if (score >= 7) return '#fff';
    if (score >= 5) return '#fff';
    if (score >= 3) return '#fff';
    if (score >= 1) return '#000';
    return '#fff';
  };
  
  // Display helper: converts score to display string
  const getScoreDisplay = (score: number) => {
    if (score === 11) return 'X';
    if (score === 10) return '10';
    if (score === 0) return 'M';
    return score.toString();
  };

  const getAvailableScores = (): number[] => {
    if (competition?.targetType === 'wa_standard') {
      return [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]; // 11 = X ring
    } else {
      return [11, 10, 9, 8, 7, 6, 0]; // 11 = X ring
    }
  };

  const renderTargetFace = (targetIndex: number, size: number) => {
    const rings = targetConfig?.rings || 10;
    const colors = targetConfig?.colors || [];
    const ringElements = [];
    
    const markerSize = 24 / zoomLevel;
    const markerFontSize = 10 / zoomLevel;
    const markerBorderWidth = 2 / zoomLevel;
    
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

    const TargetContainer = Platform.OS === 'web' ? View : TouchableOpacity;
    
    const handleClick = (e: any) => {
      e.stopPropagation?.();
      handleTargetClick(e, targetIndex, size);
    };

    const webProps = Platform.OS === 'web' ? {
      onClick: handleClick,
      style: {
        width: size,
        height: size,
        backgroundColor: '#1a1a1a',
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'crosshair',
        position: 'relative' as const,
      }
    } : {};

    const nativeProps = Platform.OS !== 'web' ? {
      onPress: (e: any) => handleTargetClick(e, targetIndex, size),
      activeOpacity: 0.9,
      style: {
        width: size,
        height: size,
        backgroundColor: '#1a1a1a',
        borderRadius: size / 2,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      }
    } : {};

    return (
      <View
        key={`target-wrapper-${targetIndex}`}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
        }}
      >
        <TargetContainer {...webProps} {...nativeProps}>
          {ringElements}
          
          <View style={styles.centerMark} pointerEvents="none">
            <View style={styles.centerHorizontal} />
            <View style={styles.centerVertical} />
          </View>

          {targetArrows.map((arrow) => {
            const globalIndex = arrows.findIndex(a => a.id === arrow.id);
            return (
              <TouchableOpacity
                key={arrow.id}
                style={{
                  position: 'absolute',
                  width: markerSize,
                  height: markerSize,
                  borderRadius: markerSize / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: markerBorderWidth,
                  borderColor: '#000',
                  left: arrow.x * size - markerSize / 2,
                  top: arrow.y * size - markerSize / 2,
                  backgroundColor: getScoreColor(arrow.score),
                }}
                onPress={() => handleEditArrow(globalIndex)}
              >
                <Text style={{ fontSize: markerFontSize, fontWeight: 'bold', color: getScoreTextColor(arrow.score) }}>
                  {getScoreDisplay(arrow.score)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </TargetContainer>
      </View>
    );
  };

  const renderTargetContent = () => {
    if (isVegas) {
      return (
        <View style={styles.triangleContainer}>
          <View style={styles.triangleTop}>
            {renderTargetFace(0, SMALL_TARGET_SIZE)}
          </View>
          <View style={styles.triangleBottom}>
            {renderTargetFace(1, SMALL_TARGET_SIZE)}
            <View style={{ width: 16 }} />
            {renderTargetFace(2, SMALL_TARGET_SIZE)}
          </View>
        </View>
      );
    } else if (isNFAA) {
      return (
        <View style={styles.verticalContainer}>
          {renderTargetFace(0, SMALL_TARGET_SIZE)}
          <View style={{ height: 10 }} />
          {renderTargetFace(1, SMALL_TARGET_SIZE)}
          <View style={{ height: 10 }} />
          {renderTargetFace(2, SMALL_TARGET_SIZE)}
        </View>
      );
    } else {
      return renderTargetFace(0, BASE_TARGET_SIZE);
    }
  };

  // Zoomable Target Component
  const ZoomableTarget = ({ children }: { children: React.ReactNode }) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    
    const scaledSize = (BASE_TARGET_SIZE + 40) * zoomLevel;
    const maxPanX = Math.max(0, (scaledSize - SCREEN_WIDTH + 40) / 2);
    const maxPanY = Math.max(0, (scaledSize - CONTAINER_HEIGHT) / 2);
    
    useEffect(() => {
      if (zoomLevel === 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    }, [zoomLevel]);
    
    const panGesture = Gesture.Pan()
      .enabled(zoomLevel > 1)
      .onStart(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        const newX = savedTranslateX.value + event.translationX;
        const newY = savedTranslateY.value + event.translationY;
        translateX.value = Math.max(-maxPanX, Math.min(maxPanX, newX));
        translateY.value = Math.max(-maxPanY, Math.min(maxPanY, newY));
      })
      .onEnd((event) => {
        const velocityFactor = 0.1;
        const targetX = translateX.value + event.velocityX * velocityFactor;
        const targetY = translateY.value + event.velocityY * velocityFactor;
        translateX.value = withSpring(Math.max(-maxPanX, Math.min(maxPanX, targetX)));
        translateY.value = withSpring(Math.max(-maxPanY, Math.min(maxPanY, targetY)));
      });
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: zoomLevel },
      ],
    }));
    
    return (
      <View style={[styles.zoomContainer, { height: zoomLevel > 1 ? CONTAINER_HEIGHT : 'auto' }]}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.targetWrapper, animatedStyle]}>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    );
  };

  if (loading || !competition || !currentParticipant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const rankings = getRankings(competition);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowLeaderboard(true)}>
          <Ionicons name="podium" size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.currentParticipant}>{currentParticipant.name}</Text>
          <View style={styles.roundBadge}>
            <Ionicons name="trophy" size={12} color="#FFD700" />
            <Text style={styles.roundText}>Round {competition.currentRound} of {competition.maxRounds}</Text>
          </View>
        </View>
        <View style={styles.headerButton}>
          <Text style={styles.arrowCount}>{arrows.length}/3</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((competition.currentRound - 1) / competition.maxRounds) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(((competition.currentRound - 1) / competition.maxRounds) * 100)}% Complete
        </Text>
      </View>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity 
          style={styles.zoomButton} 
          onPress={() => setZoomLevel(prev => Math.min(prev + 0.5, 3))}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.zoomText}>{Math.round(zoomLevel * 100)}%</Text>
        <TouchableOpacity 
          style={styles.zoomButton} 
          onPress={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}
        >
          <Ionicons name="remove" size={20} color="#fff" />
        </TouchableOpacity>
        {zoomLevel > 1 && (
          <TouchableOpacity style={styles.zoomButton} onPress={() => setZoomLevel(1)}>
            <Ionicons name="contract-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Target */}
      <ZoomableTarget>
        {renderTargetContent()}
      </ZoomableTarget>

      {/* Arrows Display */}
      <View style={styles.arrowsSection}>
        <View style={styles.arrowsHeader}>
          <Text style={styles.arrowsTitle}>Arrows</Text>
          <Text style={styles.totalScore}>Total: {getTotalScore()}</Text>
        </View>
        <View style={styles.arrowsGrid}>
          {[0, 1, 2].map((index) => {
            const arrow = arrows[index];
            return (
              <View
                key={index}
                style={[
                  styles.arrowSlot,
                  arrow && { backgroundColor: getScoreColor(arrow.score) },
                ]}
              >
                {arrow ? (
                  <TouchableOpacity
                    style={styles.arrowSlotContent}
                    onPress={() => handleEditArrow(index)}
                    onLongPress={() => handleDeleteArrow(index)}
                  >
                    <Text style={[styles.arrowScore, { color: getScoreTextColor(arrow.score) }]}>
                      {getScoreDisplay(arrow.score)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.arrowPlaceholder}>-</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Commit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.commitButton}
          onPress={handleCommitRound}
        >
          <Ionicons name="lock-closed" size={24} color="#000" />
          <Text style={styles.commitButtonText}>
            Commit Round {arrows.length < 3 ? `(${3 - arrows.length} = M)` : ''}
          </Text>
        </TouchableOpacity>
        <Text style={styles.commitWarning}>
          {arrows.length < 3 
            ? `Missing arrows will be marked as M (miss)`
            : `⚠️ Committed rounds cannot be edited`
          }
        </Text>
      </View>

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
              onPress={() => selectedArrowIndex !== null && handleDeleteArrow(selectedArrowIndex)}
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

      {/* Leaderboard Modal */}
      <Modal visible={showLeaderboard} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.leaderboardModal}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.leaderboardTitle}>Leaderboard</Text>
              <TouchableOpacity onPress={() => setShowLeaderboard(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.leaderboardList}>
              {rankings.map((participant, index) => (
                <View 
                  key={participant.id} 
                  style={[
                    styles.leaderboardItem,
                    participant.id === currentParticipant.id && styles.leaderboardItemCurrent,
                  ]}
                >
                  <View style={[
                    styles.rankBadge,
                    index === 0 && styles.rankBadgeGold,
                    index === 1 && styles.rankBadgeSilver,
                    index === 2 && styles.rankBadgeBronze,
                  ]}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <Text style={styles.leaderboardName}>{participant.name}</Text>
                    <Text style={styles.leaderboardRounds}>
                      {participant.rounds.filter(r => r.committed).length} rounds
                    </Text>
                  </View>
                  <Text style={styles.leaderboardScore}>{participant.totalScore}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Round Result Modal */}
      <Modal visible={showRoundResult} transparent animationType="fade">
        <View style={styles.roundResultOverlay}>
          <View style={styles.roundResultContent}>
            <View style={styles.roundResultHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={styles.roundResultTitle}>Round Complete!</Text>
            </View>
            
            {lastRoundResult && (
              <>
                <Text style={styles.roundResultArcher}>{lastRoundResult.archerName}</Text>
                <Text style={styles.roundResultRound}>Round {lastRoundResult.roundNumber} of {competition?.maxRounds}</Text>
                
                <View style={styles.roundResultScores}>
                  {lastRoundResult.shots.map((shot, idx) => (
                    <View 
                      key={idx} 
                      style={[styles.roundResultScoreBadge, { backgroundColor: getScoreColor(shot) }]}
                    >
                      <Text style={[styles.roundResultScoreText, { color: getScoreTextColor(shot) }]}>
                        {shot === 10 ? 'X' : shot === 0 ? 'M' : shot}
                      </Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.roundResultTotal}>
                  <Text style={styles.roundResultTotalLabel}>Round Total</Text>
                  <Text style={styles.roundResultTotalValue}>{lastRoundResult.total}</Text>
                </View>
              </>
            )}

            {competition && competition.currentRound <= competition.maxRounds && (
              <View style={styles.roundResultNext}>
                <Text style={styles.roundResultNextLabel}>Next Round</Text>
                <Text style={styles.roundResultNextRound}>Round {competition.currentRound}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.roundResultButton}
              onPress={() => setShowRoundResult(false)}
            >
              <Text style={styles.roundResultButtonText}>
                {competition && competition.currentRound <= competition.maxRounds ? 'Continue' : 'View Results'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  currentParticipant: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  roundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  roundText: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  arrowCount: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  progressText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  zoomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { color: '#fff', fontSize: 14, fontWeight: '600', minWidth: 50, textAlign: 'center' },
  zoomContainer: {
    overflow: 'hidden',
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetWrapper: { alignItems: 'center', padding: 16 },
  triangleContainer: { alignItems: 'center' },
  triangleTop: { marginBottom: 12 },
  triangleBottom: { flexDirection: 'row', justifyContent: 'center' },
  verticalContainer: { alignItems: 'center' },
  centerMark: { position: 'absolute', width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  centerHorizontal: { position: 'absolute', width: 12, height: 2, backgroundColor: '#000' },
  centerVertical: { position: 'absolute', width: 2, height: 12, backgroundColor: '#000' },
  arrowsSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
  },
  arrowsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  arrowsTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  totalScore: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  arrowsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  arrowSlot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  arrowSlotContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowScore: { fontSize: 20, fontWeight: 'bold' },
  arrowPlaceholder: { color: '#444', fontSize: 24 },
  footer: {
    padding: 16,
    marginTop: 'auto',
  },
  commitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  commitButtonDisabled: {
    backgroundColor: '#333',
  },
  commitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  commitButtonTextDisabled: {
    color: '#666',
  },
  commitWarning: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
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
  scoreButtonText: { fontSize: 18, fontWeight: 'bold' },
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
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#888', fontSize: 16 },
  leaderboardModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '70%',
    marginTop: 'auto',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  leaderboardTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  leaderboardList: { gap: 8 },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
  },
  leaderboardItemCurrent: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankBadgeGold: { backgroundColor: '#FFD700' },
  rankBadgeSilver: { backgroundColor: '#C0C0C0' },
  rankBadgeBronze: { backgroundColor: '#CD7F32' },
  rankText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  leaderboardRounds: { color: '#666', fontSize: 12 },
  leaderboardScore: { color: '#FFD700', fontSize: 20, fontWeight: 'bold' },
  roundResultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundResultContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
  },
  roundResultHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  roundResultTitle: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  roundResultArcher: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  roundResultRound: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  roundResultScores: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roundResultScoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  roundResultScoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  roundResultTotal: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  roundResultTotalLabel: {
    color: '#888',
    fontSize: 12,
  },
  roundResultTotalValue: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: 'bold',
  },
  roundResultNext: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  roundResultNextLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  roundResultNextArcher: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  roundResultNextRound: {
    color: '#888',
    fontSize: 14,
  },
  roundResultButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  roundResultButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
