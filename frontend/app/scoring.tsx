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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_TARGET_SIZE = Math.min(SCREEN_WIDTH - 40, SCREEN_HEIGHT * 0.5);

// Zoom levels
const ZOOM_LEVELS = [1, 1.5, 2, 2.5];

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
  const { currentImage, targetData, setCurrentRound, manualMode, sessionType, currentRoundNumber } = useAppStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [selectedArrow, setSelectedArrow] = useState<string | null>(null);
  const [showTargetOverlay, setShowTargetOverlay] = useState(!manualMode);
  const [error, setError] = useState<string | null>(null);
  const [targetLayout, setTargetLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0); // Index into ZOOM_LEVELS
  const targetRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Session info
  const isCompetition = sessionType === 'competition';
  const MAX_ROUNDS = 10;

  // Current zoom level and target size
  const zoomLevel = ZOOM_LEVELS[zoomIndex];
  const TARGET_SIZE = BASE_TARGET_SIZE * zoomLevel;

  // Get center and radius from targetData or use defaults
  const centerX = targetData?.center?.x ?? 0.5;
  const centerY = targetData?.center?.y ?? 0.5;
  const radius = targetData?.radius ?? 0.45;

  useEffect(() => {
    if (currentImage) {
      // Only auto-detect arrows if not in manual mode
      if (!manualMode) {
        detectArrows();
      }
    } else if (!manualMode) {
      // Only show error if not in manual mode (manual mode doesn't need an image)
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
    
    // If outside the target radius, it's a miss
    if (normalizedDistance > 1.1) return 0;
    
    // Calculate ring: 10 at center, 1 at edge
    // Each ring occupies 1/10 of the radius
    // Ring 10: 0 to 0.1, Ring 9: 0.1 to 0.2, ... Ring 1: 0.9 to 1.0
    const ringFromCenter = Math.ceil(normalizedDistance * 10);
    const ring = 11 - ringFromCenter;
    
    // Clamp to valid range (1-10), with 0 for complete misses
    if (ring > 10) return 10; // Dead center
    if (ring < 1) return 0;   // Miss
    return ring;
  };

  // Competition mode arrow limit
  const COMPETITION_ARROWS_PER_ROUND = 3;
  const maxArrowsReached = isCompetition && arrows.length >= COMPETITION_ARROWS_PER_ROUND;

  const handleTargetPress = (event: any) => {
    // Prevent default to ensure the event is captured
    event.persist?.();
    
    // In competition mode, prevent adding more than 3 arrows
    if (maxArrowsReached) {
      Alert.alert(
        'Arrow Limit Reached',
        'Competition rounds are limited to 3 arrows. Finish this round to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Get coordinates from the event - try multiple approaches
    let x: number | undefined;
    let y: number | undefined;
    
    const nativeEvent = event.nativeEvent;
    
    // Debug log to help diagnose issues
    console.log('Touch event received:', {
      locationX: nativeEvent.locationX,
      locationY: nativeEvent.locationY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      offsetX: nativeEvent.offsetX,
      offsetY: nativeEvent.offsetY,
      targetLayout,
      TARGET_SIZE,
    });
    
    // Method 1: Use locationX/locationY (most reliable on React Native)
    if (typeof nativeEvent.locationX === 'number' && typeof nativeEvent.locationY === 'number') {
      x = nativeEvent.locationX / TARGET_SIZE;
      y = nativeEvent.locationY / TARGET_SIZE;
      console.log('Using locationX/Y:', x, y);
    }
    // Method 2: Use offsetX/offsetY (works on web)
    else if (typeof nativeEvent.offsetX === 'number' && typeof nativeEvent.offsetY === 'number') {
      x = nativeEvent.offsetX / TARGET_SIZE;
      y = nativeEvent.offsetY / TARGET_SIZE;
      console.log('Using offsetX/Y:', x, y);
    }
    // Method 3: Fallback using pageX/pageY with measured layout
    else if (targetLayout && typeof nativeEvent.pageX === 'number' && typeof nativeEvent.pageY === 'number') {
      x = (nativeEvent.pageX - targetLayout.x) / targetLayout.width;
      y = (nativeEvent.pageY - targetLayout.y) / targetLayout.height;
      console.log('Using pageX/Y with layout:', x, y);
    }
    
    // Validate coordinates
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
      console.log('Could not determine valid click position');
      Alert.alert('Touch Error', 'Could not register the touch. Please try again.');
      return;
    }

    // Clamp values to valid range
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    console.log('Arrow placed at:', clampedX, clampedY);

    const ring = calculateRingFromPosition(clampedX, clampedY);

    const newArrow: Arrow = {
      id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: clampedX,
      y: clampedY,
      ring,
      confirmed: true,
    };

    setArrows(prev => [...prev, newArrow]);
  };

  const handleTargetLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    // Measure in window for absolute positioning - with a small delay to ensure layout is complete
    setTimeout(() => {
      if (targetRef.current) {
        targetRef.current.measureInWindow((wx, wy, wwidth, wheight) => {
          const layout = { 
            x: wx ?? 0, 
            y: wy ?? 0, 
            width: wwidth || width || TARGET_SIZE, 
            height: wheight || height || TARGET_SIZE 
          };
          console.log('Target layout measured:', layout);
          setTargetLayout(layout);
        });
      }
    }, 100);
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

  // Zoom controls
  const zoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setZoomIndex(zoomIndex + 1);
    }
  };

  const zoomOut = () => {
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1);
    }
  };

  const handleFinishRound = () => {
    // Competition mode requires exactly 3 arrows per round
    // Training mode has no restrictions
    if (isCompetition && arrows.length < COMPETITION_ARROWS_PER_ROUND) {
      Alert.alert(
        `${COMPETITION_ARROWS_PER_ROUND} Arrows Required`,
        `Competition rounds require ${COMPETITION_ARROWS_PER_ROUND} arrows. You have ${arrows.length} arrow(s) marked. Add more or confirm with ${COMPETITION_ARROWS_PER_ROUND - arrows.length} miss(es)?`,
        [
          { text: 'Add More', style: 'cancel' },
          {
            text: 'Confirm with Misses',
            onPress: () => finishRound(true),
          },
        ]
      );
    } else if (arrows.length === 0) {
      Alert.alert(
        'No Arrows',
        'Please mark at least one arrow before finishing the round.',
        [{ text: 'OK' }]
      );
    } else {
      finishRound(false);
    }
  };

  const finishRound = (addMisses: boolean) => {
    let finalArrows = [...arrows];
    
    // Only add misses for competition mode
    if (addMisses && isCompetition) {
      while (finalArrows.length < COMPETITION_ARROWS_PER_ROUND) {
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
      {/* Header with Round Info and Zoom Controls */}
      <View style={styles.zoomControlsContainer}>
        {/* Round Badge */}
        <View style={[styles.roundBadge, isCompetition ? styles.competitionRoundBadge : styles.trainingRoundBadge]}>
          <Ionicons 
            name={isCompetition ? "trophy" : "fitness"} 
            size={14} 
            color={isCompetition ? "#FFD700" : "#ff4444"} 
          />
          <Text style={[styles.roundBadgeText, isCompetition ? styles.competitionRoundText : styles.trainingRoundText]}>
            {isCompetition 
              ? `Round ${currentRoundNumber}/${MAX_ROUNDS}`
              : `Round ${currentRoundNumber}`
            }
          </Text>
        </View>
        
        <View style={styles.zoomControls}>
          <Pressable
            style={[styles.zoomButton, zoomIndex === 0 && styles.zoomButtonDisabled]}
            onPress={zoomOut}
            disabled={zoomIndex === 0}
          >
            <Ionicons name="remove" size={24} color={zoomIndex === 0 ? '#666' : '#fff'} />
          </Pressable>
          <Text style={styles.zoomText}>{Math.round(zoomLevel * 100)}%</Text>
          <Pressable
            style={[styles.zoomButton, zoomIndex === ZOOM_LEVELS.length - 1 && styles.zoomButtonDisabled]}
            onPress={zoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          >
            <Ionicons name="add" size={24} color={zoomIndex === ZOOM_LEVELS.length - 1 ? '#666' : '#fff'} />
          </Pressable>
        </View>
        <Text style={styles.zoomHint}>Use +/- to zoom for precise placement</Text>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Target wrapper - centers the target */}
        <View style={styles.targetWrapper}>
          {/* Two-directional scroll container for zoomed target */}
          <ScrollView 
            horizontal={true}
            contentContainerStyle={[
              styles.targetScrollContent,
              { minHeight: zoomLevel > 1 ? TARGET_SIZE : undefined }
            ]}
            showsHorizontalScrollIndicator={zoomLevel > 1}
            nestedScrollEnabled={true}
            scrollEnabled={zoomLevel > 1}
          >
            <ScrollView
              contentContainerStyle={styles.targetVerticalScroll}
              showsVerticalScrollIndicator={zoomLevel > 1}
              nestedScrollEnabled={true}
              scrollEnabled={zoomLevel > 1}
            >
            {/* Target Area */}
            <View 
              ref={targetRef}
              style={[styles.targetContainer, { width: TARGET_SIZE, height: TARGET_SIZE }]}
              onLayout={handleTargetLayout}
            >
              <Pressable
                onPress={handleTargetPress}
                style={[styles.targetTouchArea, { width: TARGET_SIZE, height: TARGET_SIZE }]}
              >
              {/* Background Image - Only show if NOT manual mode */}
              {!manualMode && currentImage ? (
                <Image
                  source={{ uri: currentImage }}
                  style={[styles.targetImage, { width: TARGET_SIZE, height: TARGET_SIZE }]}
                  resizeMode="cover"
                  pointerEvents="none"
                />
              ) : null}

              {/* Built-in Target Rings - Always show in manual mode, optional overlay otherwise */}
              {(manualMode || showTargetOverlay) && (
                <View 
                  pointerEvents="none"
                  style={[
                    styles.targetOverlay,
                    {
                      width: TARGET_SIZE,
                      height: TARGET_SIZE,
                      left: 0,
                      top: 0,
                    },
                  ]}
                >
                  {/* White/Cream background for the target */}
                  {manualMode && (
                    <View style={[styles.targetBackground, { width: TARGET_SIZE, height: TARGET_SIZE, borderRadius: TARGET_SIZE / 2 }]} />
                  )}
                  
                  {/* Ring 1-2: White */}
                  {[0, 1].map((i) => {
                    const ringSize = TARGET_SIZE * 0.95 * ((10 - i) / 10);
                    return (
                      <View
                        key={`ring-${i}`}
                        style={[
                          styles.ring,
                          {
                            width: ringSize,
                            height: ringSize,
                            borderRadius: ringSize / 2,
                            backgroundColor: manualMode ? '#f5f5f0' : 'transparent',
                            borderColor: manualMode ? '#333' : 'rgba(200,200,200,0.6)',
                            borderWidth: manualMode ? 1 : 2,
                          },
                        ]}
                      />
                    );
                  })}
                  
                  {/* Ring 3-4: Black */}
                  {[2, 3].map((i) => {
                    const ringSize = TARGET_SIZE * 0.95 * ((10 - i) / 10);
                    return (
                      <View
                        key={`ring-${i}`}
                        style={[
                          styles.ring,
                          {
                            width: ringSize,
                            height: ringSize,
                            borderRadius: ringSize / 2,
                            backgroundColor: manualMode ? '#2a2a2a' : 'transparent',
                            borderColor: manualMode ? '#555' : 'rgba(40,40,40,0.6)',
                            borderWidth: manualMode ? 1 : 2,
                          },
                        ]}
                      />
                    );
                  })}
                  
                  {/* Ring 5-6: Blue */}
                  {[4, 5].map((i) => {
                    const ringSize = TARGET_SIZE * 0.95 * ((10 - i) / 10);
                    return (
                      <View
                        key={`ring-${i}`}
                        style={[
                          styles.ring,
                          {
                            width: ringSize,
                            height: ringSize,
                            borderRadius: ringSize / 2,
                            backgroundColor: manualMode ? '#00a2e8' : 'transparent',
                            borderColor: manualMode ? '#0077b3' : 'rgba(65,105,225,0.6)',
                            borderWidth: manualMode ? 1 : 2,
                          },
                        ]}
                      />
                    );
                  })}
                  
                  {/* Ring 7-8: Red */}
                  {[6, 7].map((i) => {
                    const ringSize = TARGET_SIZE * 0.95 * ((10 - i) / 10);
                    return (
                      <View
                        key={`ring-${i}`}
                        style={[
                          styles.ring,
                          {
                            width: ringSize,
                            height: ringSize,
                            borderRadius: ringSize / 2,
                            backgroundColor: manualMode ? '#ed1c24' : 'transparent',
                            borderColor: manualMode ? '#b31217' : 'rgba(220,20,60,0.6)',
                            borderWidth: manualMode ? 1 : 2,
                          },
                        ]}
                      />
                    );
                  })}
                  
                  {/* Ring 9-10: Gold/Yellow */}
                  {[8, 9].map((i) => {
                    const ringSize = TARGET_SIZE * 0.95 * ((10 - i) / 10);
                    return (
                      <View
                        key={`ring-${i}`}
                        style={[
                          styles.ring,
                          {
                            width: ringSize,
                            height: ringSize,
                            borderRadius: ringSize / 2,
                            backgroundColor: manualMode ? '#fff200' : 'transparent',
                            borderColor: manualMode ? '#ccaa00' : 'rgba(255,215,0,0.6)',
                            borderWidth: manualMode ? 1 : 2,
                          },
                        ]}
                      />
                    );
                  })}
                  
                  {/* Center X mark */}
                  <View style={styles.centerMark}>
                    <View style={styles.centerLine} />
                    <View style={[styles.centerLine, styles.centerLineVertical]} />
                  </View>
                </View>
              )}
          </Pressable>

          {/* Arrow Markers - Outside Pressable so they don't block clicks */}
          {arrows.map((arrow) => (
            <Pressable
              key={arrow.id}
              style={[
                styles.arrowMarker,
                {
                  left: arrow.x * TARGET_SIZE - 15,
                  top: arrow.y * TARGET_SIZE - 15,
                  backgroundColor: RING_COLORS[Math.max(0, arrow.ring - 1)] || '#8B0000',
                },
                selectedArrow === arrow.id && styles.selectedArrow,
                !arrow.confirmed && styles.unconfirmedArrow,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleArrowPress(arrow.id);
              }}
            >
              <Text style={[
                styles.arrowScore,
                { color: arrow.ring >= 3 && arrow.ring <= 4 ? '#fff' : '#000' }
              ]}>
                {arrow.ring}
              </Text>
            </Pressable>
          ))}

          {/* Loading Overlay */}
          {isDetecting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8B0000" />
              <Text style={styles.loadingText}>Detecting arrows...</Text>
            </View>
          )}
        </View>
            </ScrollView>
          </ScrollView>
        </View>
        
        {/* Content below target - outside horizontal scroll */}
        <View style={styles.contentBelowTarget}>

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
            {isCompetition && (
              arrows.length < COMPETITION_ARROWS_PER_ROUND 
                ? ` (${COMPETITION_ARROWS_PER_ROUND - arrows.length} more needed)`
                : ' ✓ Ready to finish'
            )}
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
          <Ionicons name="information-circle" size={20} color="#888888" />
          <Text style={styles.instructionText}>
            {manualMode 
              ? 'Tap on the target to place your arrows. Tap an arrow to select and edit.'
              : 'Tap on the target to add arrows. Tap an arrow to select it.'}
          </Text>
        </View>

        {/* Toggle Overlay - Only show if NOT manual mode (manual mode always shows rings) */}
        {!manualMode && (
          <Pressable
            style={styles.toggleOverlay}
            onPress={() => setShowTargetOverlay(!showTargetOverlay)}
          >
            <Ionicons
              name={showTargetOverlay ? 'eye' : 'eye-off'}
              size={20}
              color="#8B0000"
            />
            <Text style={styles.toggleText}>
              {showTargetOverlay ? 'Hide' : 'Show'} Ring Overlay
            </Text>
          </Pressable>
        )}

        {/* Re-detect Button - Only show if not in manual mode */}
        {!manualMode && (
          <Pressable
            style={styles.redetectButton}
            onPress={detectArrows}
            disabled={isDetecting}
          >
            <Ionicons name="scan" size={20} color="#8B0000" />
            <Text style={styles.redetectText}>Re-detect Arrows</Text>
          </Pressable>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.primaryButton}
            onPress={handleFinishRound}
          >
            <Text style={styles.primaryButtonText}>Finish Round</Text>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  zoomControlsContainer: {
    backgroundColor: '#111111',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  roundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    gap: 6,
  },
  competitionRoundBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  trainingRoundBadge: {
    backgroundColor: 'rgba(139, 0, 0, 0.3)',
  },
  roundBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  competitionRoundText: {
    color: '#FFD700',
  },
  trainingRoundText: {
    color: '#ff4444',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonDisabled: {
    backgroundColor: '#333333',
  },
  zoomText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
  },
  zoomHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 6,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  targetWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  targetScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetVerticalScroll: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBelowTarget: {
    paddingHorizontal: 0,
    paddingTop: 16,
  },
  targetContainer: {
    backgroundColor: '#111111',
    borderRadius: 16,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  targetTouchArea: {
  },
  targetImage: {
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
  targetBackground: {
    position: 'absolute',
    backgroundColor: '#f5f5f0',
  },
  ring: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  centerMark: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLine: {
    position: 'absolute',
    width: 16,
    height: 2,
    backgroundColor: '#333',
  },
  centerLineVertical: {
    transform: [{ rotate: '90deg' }],
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
    backgroundColor: '#111111',
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
    color: '#888888',
    fontSize: 16,
  },
  scoreValue: {
    color: '#8B0000',
    fontSize: 36,
    fontWeight: 'bold',
  },
  arrowCount: {
    color: '#888888',
    fontSize: 14,
    marginTop: 8,
  },
  arrowList: {
    backgroundColor: '#111111',
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
    borderBottomColor: '#333333',
  },
  arrowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowNumber: {
    color: '#888888',
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
    color: '#888888',
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
    backgroundColor: '#111111',
    borderRadius: 8,
  },
  instructionText: {
    color: '#888888',
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
    color: '#8B0000',
    marginLeft: 8,
    fontSize: 14,
  },
  redetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  redetectText: {
    color: '#8B0000',
    marginLeft: 8,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#8B0000',
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
});
