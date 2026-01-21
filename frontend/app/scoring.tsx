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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TARGET_SIZE = SCREEN_WIDTH - 40;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Ring colors for FITA target (index 0 = ring 1, index 9 = ring 10)
const RING_COLORS = [
  '#e8e8e8', // 1 - White outer
  '#e8e8e8', // 2 - White inner
  '#2a2a2a', // 3 - Black outer
  '#2a2a2a', // 4 - Black inner
  '#4169E1', // 5 - Blue outer
  '#4169E1', // 6 - Blue inner
  '#DC143C', // 7 - Red outer
  '#DC143C', // 8 - Red inner
  '#FFD700', // 9 - Gold outer
  '#FFD700', // 10 - Gold inner/center
];

interface Arrow {
  id: string;
  x: number;
  y: number;
  ring: number;
  confirmed: boolean;
}

export default function ScoringScreen() {
  const router = useRouter();
  const { currentImage, targetData, setCurrentRound } = useAppStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [selectedArrow, setSelectedArrow] = useState<string | null>(null);
  const [showTargetOverlay, setShowTargetOverlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetLayout, setTargetLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const targetRef = useRef<View>(null);

  // Get center and radius from targetData or use defaults
  const centerX = targetData?.center?.x ?? 0.5;
  const centerY = targetData?.center?.y ?? 0.5;
  const radius = targetData?.radius ?? 0.4;

  useEffect(() => {
    if (currentImage) {
      detectArrows();
    } else {
      setError('No image available. Please go back and capture an image.');
    }
  }, []);

  const detectArrows = async () => {
    if (!currentImage) return;

    setIsDetecting(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/api/detect-arrows`, {
        image_base64: currentImage,
      });

      if (response.data.success && response.data.arrows?.length > 0) {
        const detectedArrows = response.data.arrows.map((arrow: any, index: number) => ({
          id: `arrow-${index}`,
          x: arrow.x,
          y: arrow.y,
          ring: arrow.ring || calculateRingFromPosition(arrow.x, arrow.y),
          confirmed: false,
        }));
        setArrows(detectedArrows);
      } else {
        Alert.alert(
          'No Arrows Detected',
          'Tap on the target to mark arrow positions manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      console.error('Arrow detection error:', err);
      setError('Failed to detect arrows. You can add them manually.');
    } finally {
      setIsDetecting(false);
    }
  };

  const calculateRingFromPosition = (x: number, y: number): number => {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Use the radius, but if it's 0 or very small, use a default
    const effectiveRadius = radius > 0.1 ? radius : 0.4;
    const normalizedDistance = distance / effectiveRadius;
    
    // If outside 1.2x the radius, it's a miss (allow some margin)
    if (normalizedDistance > 1.2) return 0;
    
    // Calculate ring: 10 at center, 1 at edge
    // Clamp normalizedDistance to max 1 for scoring
    const clampedDistance = Math.min(normalizedDistance, 1);
    const ring = Math.round(10 - clampedDistance * 9);
    
    return Math.max(1, Math.min(10, ring));
  };

  const handleTargetPress = (event: any) => {
    // Try multiple methods to get correct coordinates
    let x, y;
    
    // Method 1: Use offsetX/offsetY (works on web)
    if (event.nativeEvent.offsetX !== undefined && event.nativeEvent.offsetY !== undefined) {
      x = event.nativeEvent.offsetX / TARGET_SIZE;
      y = event.nativeEvent.offsetY / TARGET_SIZE;
    }
    // Method 2: Use locationX/locationY (works on native)
    else if (event.nativeEvent.locationX !== undefined && event.nativeEvent.locationY !== undefined) {
      x = event.nativeEvent.locationX / TARGET_SIZE;
      y = event.nativeEvent.locationY / TARGET_SIZE;
    }
    // Method 3: Fallback using pageX/pageY with layout
    else if (targetLayout && event.nativeEvent.pageX !== undefined) {
      x = (event.nativeEvent.pageX - targetLayout.x) / targetLayout.width;
      y = (event.nativeEvent.pageY - targetLayout.y) / targetLayout.height;
    }
    else {
      console.log('Could not determine click position');
      return;
    }

    // Clamp values
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    console.log('Arrow placed at:', clampedX, clampedY);

    const ring = calculateRingFromPosition(clampedX, clampedY);

    const newArrow: Arrow = {
      id: `arrow-${Date.now()}`,
      x: clampedX,
      y: clampedY,
      ring,
      confirmed: true,
    };

    setArrows(prev => [...prev, newArrow]);
  };

  const handleTargetLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    // Also measure in window for absolute positioning
    if (targetRef.current) {
      targetRef.current.measureInWindow((wx, wy, wwidth, wheight) => {
        setTargetLayout({ x: wx, y: wy, width: wwidth || TARGET_SIZE, height: wheight || TARGET_SIZE });
      });
    }
  };

  const handleArrowPress = (arrowId: string) => {
    setSelectedArrow(selectedArrow === arrowId ? null : arrowId);
  };

  const removeArrow = (arrowId: string) => {
    setArrows(arrows.filter(a => a.id !== arrowId));
    setSelectedArrow(null);
  };

  const confirmArrow = (arrowId: string) => {
    setArrows(arrows.map(a => 
      a.id === arrowId ? { ...a, confirmed: true } : a
    ));
    setSelectedArrow(null);
  };

  const confirmAllArrows = () => {
    setArrows(arrows.map(a => ({ ...a, confirmed: true })));
  };

  const getTotalScore = () => {
    return arrows.reduce((sum, arrow) => sum + arrow.ring, 0);
  };

  const handleFinishRound = () => {
    if (arrows.length < 3) {
      Alert.alert(
        'Minimum 3 Shots Required',
        `You have ${arrows.length} arrow(s) marked. Add more or confirm with ${3 - arrows.length} miss(es)?`,
        [
          { text: 'Add More', style: 'cancel' },
          {
            text: 'Confirm with Misses',
            onPress: () => finishRound(true),
          },
        ]
      );
    } else {
      finishRound(false);
    }
  };

  const finishRound = (addMisses: boolean) => {
    let finalArrows = [...arrows];
    
    if (addMisses) {
      while (finalArrows.length < 3) {
        finalArrows.push({
          id: `miss-${Date.now()}-${finalArrows.length}`,
          x: 0,
          y: 0,
          ring: 0,
          confirmed: true,
        });
      }
    }

    setCurrentRound({
      shots: finalArrows.map(a => ({
        x: a.x,
        y: a.y,
        ring: a.ring,
      })),
      total: finalArrows.reduce((sum, a) => sum + a.ring, 0),
    });

    router.push('/summary');
  };

  // Calculate overlay position and size
  const overlaySize = TARGET_SIZE * radius * 2;
  const overlayLeft = centerX * TARGET_SIZE - overlaySize / 2;
  const overlayTop = centerY * TARGET_SIZE - overlaySize / 2;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Target Area */}
        <View 
          ref={targetRef}
          style={styles.targetContainer}
          onLayout={handleTargetLayout}
        >
          <Pressable
            onPress={handleTargetPress}
            style={styles.targetTouchArea}
          >
            {/* Background Image */}
            {currentImage ? (
              <Image
                source={{ uri: currentImage }}
                style={styles.targetImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <Ionicons name="image-outline" size={48} color="#666" />
                <Text style={styles.noImageText}>No image loaded</Text>
              </View>
            )}

            {/* Target Rings Overlay */}
            {showTargetOverlay && (
              <View 
                style={[
                  styles.targetOverlay,
                  {
                    width: overlaySize,
                    height: overlaySize,
                    left: overlayLeft,
                    top: overlayTop,
                  },
                ]}
              >
                {[...Array(10)].map((_, i) => {
                  const ringSize = overlaySize * ((10 - i) / 10);
                  const ringColor = i < 2 ? 'rgba(200,200,200,0.6)' : 
                                    i < 4 ? 'rgba(40,40,40,0.6)' : 
                                    i < 6 ? 'rgba(65,105,225,0.6)' : 
                                    i < 8 ? 'rgba(220,20,60,0.6)' : 
                                    'rgba(255,215,0,0.6)';
                  return (
                    <View
                      key={i}
                      style={[
                        styles.ring,
                        {
                          width: ringSize,
                          height: ringSize,
                          borderRadius: ringSize / 2,
                          borderColor: ringColor,
                          borderWidth: 2,
                        },
                      ]}
                    />
                  );
                })}
                {/* Center dot */}
                <View style={styles.centerDot} />
              </View>
            )}

            {/* Arrow Markers */}
            {arrows.map((arrow) => (
              <Pressable
                key={arrow.id}
                style={[
                  styles.arrowMarker,
                  {
                    left: arrow.x * TARGET_SIZE - 15,
                    top: arrow.y * TARGET_SIZE - 15,
                    backgroundColor: RING_COLORS[Math.max(0, arrow.ring - 1)] || '#e94560',
                  },
                  selectedArrow === arrow.id && styles.selectedArrow,
                  !arrow.confirmed && styles.unconfirmedArrow,
                ]}
                onPress={() => handleArrowPress(arrow.id)}
              >
                <Text style={[
                  styles.arrowScore,
                  { color: arrow.ring >= 3 && arrow.ring <= 4 ? '#fff' : '#000' }
                ]}>
                  {arrow.ring}
                </Text>
              </Pressable>
            ))}
          </Pressable>

          {/* Loading Overlay */}
          {isDetecting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#e94560" />
              <Text style={styles.loadingText}>Detecting arrows...</Text>
            </View>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={20} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Score Summary */}
        <View style={styles.scoreSummary}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreLabel}>Current Score</Text>
            <Text style={styles.scoreValue}>{getTotalScore()}</Text>
          </View>
          <Text style={styles.arrowCount}>
            {arrows.length} arrow{arrows.length !== 1 ? 's' : ''} marked
            {arrows.length < 3 && ` (min 3 required)`}
          </Text>
        </View>

        {/* Arrow List */}
        {arrows.length > 0 && (
          <View style={styles.arrowList}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Arrows</Text>
              {arrows.some(a => !a.confirmed) && (
                <Pressable onPress={confirmAllArrows}>
                  <Text style={styles.confirmAllText}>Confirm All</Text>
                </Pressable>
              )}
            </View>
            {arrows.map((arrow, index) => (
              <View key={arrow.id} style={styles.arrowItem}>
                <View style={styles.arrowInfo}>
                  <Text style={styles.arrowNumber}>#{index + 1}</Text>
                  <View
                    style={[
                      styles.ringIndicator,
                      { backgroundColor: RING_COLORS[Math.max(0, arrow.ring - 1)] || '#666' },
                    ]}
                  />
                  <Text style={styles.arrowRing}>{arrow.ring} pts</Text>
                  {!arrow.confirmed && (
                    <Text style={styles.unconfirmedLabel}>(unconfirmed)</Text>
                  )}
                </View>
                <View style={styles.arrowActions}>
                  {!arrow.confirmed && (
                    <Pressable
                      style={styles.confirmBtn}
                      onPress={() => confirmArrow(arrow.id)}
                    >
                      <Ionicons name="checkmark" size={18} color="#4CAF50" />
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => removeArrow(arrow.id)}
                  >
                    <Ionicons name="trash" size={18} color="#ff6b6b" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Ionicons name="information-circle" size={20} color="#a0a0a0" />
          <Text style={styles.instructionText}>
            Tap on the target to add arrows. Tap an arrow to select it.
          </Text>
        </View>

        {/* Toggle Overlay */}
        <Pressable
          style={styles.toggleOverlay}
          onPress={() => setShowTargetOverlay(!showTargetOverlay)}
        >
          <Ionicons
            name={showTargetOverlay ? 'eye' : 'eye-off'}
            size={20}
            color="#e94560"
          />
          <Text style={styles.toggleText}>
            {showTargetOverlay ? 'Hide' : 'Show'} Ring Overlay
          </Text>
        </Pressable>

        {/* Re-detect Button */}
        <Pressable
          style={styles.redetectButton}
          onPress={detectArrows}
          disabled={isDetecting}
        >
          <Ionicons name="scan" size={20} color="#e94560" />
          <Text style={styles.redetectText}>Re-detect Arrows</Text>
        </Pressable>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#e94560" />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>

          <Pressable
            style={styles.primaryButton}
            onPress={handleFinishRound}
          >
            <Text style={styles.primaryButtonText}>Finish Round</Text>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </Pressable>
        </View>
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
    paddingBottom: 40,
  },
  targetContainer: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  targetTouchArea: {
    width: '100%',
    height: '100%',
  },
  targetImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  noImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: '#666',
    marginTop: 8,
  },
  targetOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    position: 'absolute',
  },
  arrowMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectedArrow: {
    borderColor: '#00ff00',
    borderWidth: 3,
    transform: [{ scale: 1.2 }],
  },
  unconfirmedArrow: {
    opacity: 0.7,
  },
  arrowScore: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    flex: 1,
  },
  scoreSummary: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#a0a0a0',
    fontSize: 16,
  },
  scoreValue: {
    color: '#e94560',
    fontSize: 36,
    fontWeight: 'bold',
  },
  arrowCount: {
    color: '#a0a0a0',
    fontSize: 14,
    marginTop: 8,
  },
  arrowList: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmAllText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  arrowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  arrowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowNumber: {
    color: '#a0a0a0',
    fontSize: 14,
    marginRight: 12,
    width: 30,
  },
  ringIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  arrowRing: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unconfirmedLabel: {
    color: '#a0a0a0',
    fontSize: 12,
    marginLeft: 8,
  },
  arrowActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    padding: 8,
  },
  removeBtn: {
    padding: 8,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
  },
  instructionText: {
    color: '#a0a0a0',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  toggleOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  toggleText: {
    color: '#e94560',
    marginLeft: 8,
    fontSize: 14,
  },
  redetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  redetectText: {
    color: '#e94560',
    marginLeft: 8,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
  },
});
