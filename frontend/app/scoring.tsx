import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Competition mode constants
const COMPETITION_ARROWS_PER_ROUND = 3;

interface Arrow {
  id: string;
  x: number;
  y: number;
  ring: number;
  confidence?: number;
}

export default function ScoringScreen() {
  const router = useRouter();
  const { 
    currentImage, 
    capturedImage,
    setCurrentRound, 
    manualMode, 
    sessionType, 
    currentRoundNumber, 
    targetType,
    detectedArrows,
    setDetectedArrows,
  } = useAppStore();
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [selectedArrowIndex, setSelectedArrowIndex] = useState<number | null>(null);
  const [showScorePicker, setShowScorePicker] = useState(false);
  const [targetLayout, setTargetLayout] = useState<{ width: number; height: number } | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  // Get the image to display (prefer currentImage, fallback to capturedImage)
  const displayImage = currentImage || capturedImage;

  // Get target configuration
  const targetConfig = TARGET_CONFIGS[targetType as keyof typeof TARGET_CONFIGS] || TARGET_CONFIGS.wa_standard;

  // Session info
  const isCompetition = sessionType === 'competition';
  const MAX_ROUNDS = 10;

  // Initialize with detected arrows from AI if available
  useEffect(() => {
    if (detectedArrows && detectedArrows.length > 0 && arrows.length === 0) {
      const initialArrows = detectedArrows.map((arrow, index) => ({
        id: `arrow-${index}-${Date.now()}`,
        x: arrow.x,
        y: arrow.y,
        ring: arrow.ring,
        confidence: arrow.confidence,
      }));
      setArrows(initialArrows);
    }
  }, [detectedArrows]);

  // Auto-detect arrows if in photo mode and no arrows yet
  useEffect(() => {
    if (!manualMode && displayImage && arrows.length === 0 && detectedArrows.length === 0) {
      detectArrows();
    }
  }, [displayImage, manualMode]);

  const detectArrows = async () => {
    if (!displayImage) return;

    setIsDetecting(true);
    try {
      const response = await fetch(`${API_URL}/api/detect-arrows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: displayImage }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.arrows && data.arrows.length > 0) {
          const detectedList = data.arrows.map((arrow: any, index: number) => ({
            id: `arrow-${index}-${Date.now()}`,
            x: arrow.x,
            y: arrow.y,
            ring: arrow.ring,
            confidence: arrow.confidence,
          }));
          setArrows(detectedList);
          setDetectedArrows(data.arrows);
        }
      }
    } catch (err) {
      console.error('Arrow detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const calculateRingFromPosition = (x: number, y: number): number => {
    // Calculate distance from center (0.5, 0.5)
    const dx = x - 0.5;
    const dy = y - 0.5;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Map distance to ring (0.5 is edge of target)
    const normalizedDist = distance / 0.45;
    
    if (normalizedDist > 1.1) return 0; // Miss
    if (normalizedDist > 1.0) return 1;
    if (normalizedDist > 0.9) return 2;
    if (normalizedDist > 0.8) return 3;
    if (normalizedDist > 0.7) return 4;
    if (normalizedDist > 0.6) return 5;
    if (normalizedDist > 0.5) return 6;
    if (normalizedDist > 0.4) return 7;
    if (normalizedDist > 0.3) return 8;
    if (normalizedDist > 0.15) return 9;
    return 10;
  };

  const handleTargetPress = (event: any) => {
    if (!targetLayout) return;

    const { locationX, locationY } = event.nativeEvent;
    
    // Normalize coordinates to 0-1 range
    const x = Math.max(0, Math.min(1, locationX / targetLayout.width));
    const y = Math.max(0, Math.min(1, locationY / targetLayout.height));
    
    const ring = calculateRingFromPosition(x, y);
    
    const newArrow: Arrow = {
      id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      ring,
      confidence: 1.0,
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
        confidence: 1.0,
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
    return '#f5f5f0';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 9) return '#000';
    if (score >= 3 && score < 5) return '#fff';
    if (score < 3) return '#000';
    return '#fff';
  };

  const handleFinishRound = () => {
    if (arrows.length === 0) {
      Alert.alert('No Arrows', 'Please mark at least one arrow before finishing.');
      return;
    }

    if (isCompetition && arrows.length < COMPETITION_ARROWS_PER_ROUND) {
      Alert.alert(
        'Add More Arrows?',
        `Competition rounds typically have ${COMPETITION_ARROWS_PER_ROUND} arrows. Continue with ${arrows.length}?`,
        [
          { text: 'Add More', style: 'cancel' },
          { text: 'Continue', onPress: finishRound },
        ]
      );
    } else {
      finishRound();
    }
  };

  const finishRound = () => {
    setCurrentRound({
      shots: arrows.map(a => ({ x: a.x, y: a.y, ring: a.ring })),
      total: getTotalScore(),
    });
    router.push('/summary');
  };

  const handleRetake = () => {
    router.back();
  };

  // Render ring overlay
  const renderRingOverlay = () => {
    const rings = targetConfig.rings;
    const ringElements = [];
    
    for (let i = 0; i < rings; i++) {
      const size = BASE_TARGET_SIZE * (1 - (i * 0.09));
      const color = targetConfig.colors[i];
      ringElements.push(
        <View
          key={`ring-${i}`}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color?.border || '#333',
              backgroundColor: showOverlay && !displayImage ? color?.bg : 'transparent',
            },
          ]}
        />
      );
    }
    return ringElements;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleRetake}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Score Arrows</Text>
          <View style={[styles.roundBadge, isCompetition ? styles.competitionBadge : styles.trainingBadge]}>
            <Ionicons name={isCompetition ? "trophy" : "fitness"} size={12} color={isCompetition ? "#FFD700" : "#ff4444"} />
            <Text style={styles.roundText}>Round {currentRoundNumber}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.overlayToggle} 
          onPress={() => setShowOverlay(!showOverlay)}
        >
          <Ionicons name={showOverlay ? "eye" : "eye-off"} size={24} color="#8B0000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Target Area */}
        <View style={styles.targetWrapper}>
          <Pressable
            style={[styles.targetContainer, { width: BASE_TARGET_SIZE, height: BASE_TARGET_SIZE }]}
            onLayout={(e) => setTargetLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
            onPress={handleTargetPress}
          >
            {/* Background Image */}
            {displayImage && (
              <Image
                source={{ uri: displayImage }}
                style={[styles.targetImage, { width: BASE_TARGET_SIZE, height: BASE_TARGET_SIZE }]}
                resizeMode="cover"
                pointerEvents="none"
              />
            )}

            {/* Ring Overlay */}
            {showOverlay && (
              <View style={[styles.ringOverlay, { width: BASE_TARGET_SIZE, height: BASE_TARGET_SIZE }]} pointerEvents="none">
                {renderRingOverlay()}
                {/* Center crosshair */}
                <View style={styles.crosshair}>
                  <View style={styles.crosshairH} />
                  <View style={styles.crosshairV} />
                </View>
              </View>
            )}

            {/* Arrow Markers */}
            {arrows.map((arrow, index) => (
              <TouchableOpacity
                key={arrow.id}
                style={[
                  styles.arrowMarker,
                  {
                    left: arrow.x * BASE_TARGET_SIZE - 12,
                    top: arrow.y * BASE_TARGET_SIZE - 12,
                    backgroundColor: getScoreColor(arrow.ring),
                  },
                ]}
                onPress={() => handleEditArrow(index)}
              >
                <Text style={[styles.arrowMarkerText, { color: getScoreTextColor(arrow.ring) }]}>
                  {arrow.ring === 10 ? 'X' : arrow.ring}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Detection overlay */}
            {isDetecting && (
              <View style={styles.detectingOverlay}>
                <ActivityIndicator size="large" color="#8B0000" />
                <Text style={styles.detectingText}>Detecting arrows...</Text>
              </View>
            )}
          </Pressable>
          
          <Text style={styles.tapHint}>Tap target to add arrows</Text>
        </View>

        {/* Score Summary */}
        <View style={styles.scoreSummary}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{getTotalScore()}</Text>
            <Text style={styles.scoreLabel}>Total</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{arrows.length}</Text>
            <Text style={styles.scoreLabel}>Arrows</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>
              {arrows.length > 0 ? (getTotalScore() / arrows.length).toFixed(1) : '0'}
            </Text>
            <Text style={styles.scoreLabel}>Avg</Text>
          </View>
        </View>

        {/* Arrow List */}
        {arrows.length > 0 && (
          <View style={styles.arrowList}>
            <Text style={styles.sectionTitle}>Arrows</Text>
            {arrows.map((arrow, index) => (
              <View key={arrow.id} style={styles.arrowRow}>
                <TouchableOpacity style={styles.arrowInfo} onPress={() => handleEditArrow(index)}>
                  <View style={styles.arrowNumber}>
                    <Text style={styles.arrowNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.arrowDetails}>
                    <Text style={styles.arrowRingText}>Ring {arrow.ring}</Text>
                    <Text style={styles.arrowConfText}>
                      {arrow.confidence === 1.0 ? 'Manual' : `${Math.round((arrow.confidence || 0) * 100)}% AI`}
                    </Text>
                  </View>
                  <View style={[styles.arrowScoreBadge, { backgroundColor: getScoreColor(arrow.ring) }]}>
                    <Text style={[styles.arrowScoreText, { color: getScoreTextColor(arrow.ring) }]}>
                      {arrow.ring === 10 ? 'X' : arrow.ring}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteArrow(index)}>
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Re-detect button for photo mode */}
        {displayImage && (
          <TouchableOpacity style={styles.redetectButton} onPress={detectArrows} disabled={isDetecting}>
            <Ionicons name="refresh" size={20} color="#8B0000" />
            <Text style={styles.redetectText}>Re-detect with AI</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleRetake}>
          <Ionicons name="arrow-back" size={20} color="#8B0000" />
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.primaryButton, arrows.length === 0 && styles.buttonDisabled]} 
          onPress={handleFinishRound}
          disabled={arrows.length === 0}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Finish Round</Text>
        </TouchableOpacity>
      </View>

      {/* Score Picker Modal */}
      <Modal visible={showScorePicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowScorePicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Score</Text>
              <TouchableOpacity onPress={() => setShowScorePicker(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.scoreGrid}>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((score) => (
                <TouchableOpacity
                  key={score}
                  style={[styles.scoreOption, { backgroundColor: getScoreColor(score) }]}
                  onPress={() => handleUpdateScore(score)}
                >
                  <Text style={[styles.scoreOptionText, { color: getScoreTextColor(score) }]}>
                    {score === 10 ? 'X' : score}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
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
    paddingVertical: 2,
    borderRadius: 10,
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
    fontSize: 11,
    color: '#888',
  },
  overlayToggle: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  targetWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  targetContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  targetImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ringOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    opacity: 0.7,
  },
  crosshair: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairH: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#8B0000',
  },
  crosshairV: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#8B0000',
  },
  arrowMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  arrowMarkerText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  detectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  detectingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  tapHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  scoreSummary: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 12,
  },
  arrowList: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  arrowInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 10,
  },
  arrowNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  arrowDetails: {
    flex: 1,
    marginLeft: 10,
  },
  arrowRingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  arrowConfText: {
    fontSize: 11,
    color: '#888',
  },
  arrowScoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowScoreText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
    borderStyle: 'dashed',
  },
  redetectText: {
    fontSize: 14,
    color: '#8B0000',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B0000',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  scoreOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scoreOptionText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
