import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, TARGET_CONFIGS } from '../store/appStore';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withDecay, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_TARGET_SIZE = Math.min(SCREEN_WIDTH - 40, SCREEN_HEIGHT * 0.4);
const SMALL_TARGET_SIZE = Math.min((SCREEN_WIDTH - 60) / 3, 110);
const CONTAINER_HEIGHT = 350;
const ZOOM_SCALE = 2.5; // How much to zoom when placing arrow
const MAGNIFIER_SIZE = 150; // Size of the magnifier circle

interface Arrow {
  id: string;
  x: number;
  y: number;
  score: number;
  targetIndex?: number;
}

// Zoomable Target Component with gesture-based panning in all directions
interface ZoomableTargetProps {
  zoomLevel: number;
  baseTargetSize: number;
  children: React.ReactNode;
}

const ZoomableTarget: React.FC<ZoomableTargetProps> = ({ zoomLevel, baseTargetSize, children }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const prevTranslateX = useSharedValue(0);
  const prevTranslateY = useSharedValue(0);
  
  const isZoomed = zoomLevel > 1;
  const scaledSize = (baseTargetSize + 40) * zoomLevel;
  const maxPan = (scaledSize - CONTAINER_HEIGHT) / 2;
  
  // Reset position when zoom level changes
  React.useEffect(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    prevTranslateX.value = 0;
    prevTranslateY.value = 0;
  }, [zoomLevel]);
  
  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onStart(() => {
      prevTranslateX.value = translateX.value;
      prevTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Calculate new position with bounds
      const newX = prevTranslateX.value + event.translationX;
      const newY = prevTranslateY.value + event.translationY;
      
      // Clamp to bounds with some elasticity
      translateX.value = Math.max(-maxPan, Math.min(maxPan, newX));
      translateY.value = Math.max(-maxPan, Math.min(maxPan, newY));
    })
    .onEnd((event) => {
      // Add momentum/decay for smooth scrolling feel
      translateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [-maxPan, maxPan],
      });
      translateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [-maxPan, maxPan],
      });
    });
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: zoomLevel },
    ],
  }));
  
  if (!isZoomed) {
    return (
      <View style={styles.zoomContainer}>
        {children}
      </View>
    );
  }
  
  return (
    <View style={[styles.zoomContainer, { height: CONTAINER_HEIGHT, overflow: 'hidden' }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[
          {
            width: baseTargetSize + 40,
            height: baseTargetSize + 40,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle
        ]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

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
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Magnifier state for zoom-on-touch placement
  const [isTouching, setIsTouching] = useState(false);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  const [activeTargetIndex, setActiveTargetIndex] = useState(0);
  const [previewScore, setPreviewScore] = useState(0);

  const targetConfig = TARGET_CONFIGS[targetType as keyof typeof TARGET_CONFIGS] || TARGET_CONFIGS.wa_standard;
  const isVegas = targetType === 'vegas_3spot';
  const isNFAA = targetType === 'nfaa_indoor';
  const isMultiTarget = isVegas || isNFAA;
  const isCompetition = sessionType === 'competition';

  const calculateScore = useCallback((normalizedX: number, normalizedY: number): number => {
    const dx = normalizedX - 0.5;
    const dy = normalizedY - 0.5;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
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
      if (normalizedDist > 0.05) return 10; // Regular 10
      return 11; // X ring (innermost, counts as 10 points but tracked separately)
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
  }, [targetType]);

  const targetRefs = useRef<{ [key: number]: View | null }>({});

  // Place arrow at current position
  const placeArrow = useCallback((normalizedX: number, normalizedY: number, targetIndex: number) => {
    const score = calculateScore(normalizedX, normalizedY);
    
    // Haptic feedback when placing arrow
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const newArrow: Arrow = {
      id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: normalizedX,
      y: normalizedY,
      score,
      targetIndex: isMultiTarget ? targetIndex : undefined,
    };

    setArrows(prev => [...prev, newArrow]);
  }, [isMultiTarget, calculateScore]);

  // Handle touch start - show magnifier
  const handleTouchStart = useCallback((x: number, y: number, targetSize: number, targetIndex: number) => {
    const normalizedX = Math.max(0, Math.min(1, x / targetSize));
    const normalizedY = Math.max(0, Math.min(1, y / targetSize));
    const score = calculateScore(normalizedX, normalizedY);
    
    // Light haptic on touch start
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setIsTouching(true);
    setTouchPosition({ x, y });
    setActiveTargetIndex(targetIndex);
    setPreviewScore(score);
  }, [calculateScore]);

  // Handle touch move - update magnifier position
  const handleTouchMove = useCallback((x: number, y: number, targetSize: number) => {
    const clampedX = Math.max(0, Math.min(targetSize, x));
    const clampedY = Math.max(0, Math.min(targetSize, y));
    const normalizedX = clampedX / targetSize;
    const normalizedY = clampedY / targetSize;
    const score = calculateScore(normalizedX, normalizedY);
    
    setTouchPosition({ x: clampedX, y: clampedY });
    setPreviewScore(score);
  }, [calculateScore]);

  // Handle touch end - place arrow and hide magnifier
  const handleTouchEnd = useCallback((targetSize: number) => {
    if (isTouching) {
      const normalizedX = Math.max(0, Math.min(1, touchPosition.x / targetSize));
      const normalizedY = Math.max(0, Math.min(1, touchPosition.y / targetSize));
      placeArrow(normalizedX, normalizedY, activeTargetIndex);
    }
    setIsTouching(false);
  }, [isTouching, touchPosition, activeTargetIndex, placeArrow]);

  // Legacy click handler for web
  const handleTargetClick = useCallback((event: any, targetIndex: number, targetSize: number) => {
    // On web, just place directly on click (no magnifier)
    if (Platform.OS === 'web') {
      let x: number;
      let y: number;

      const nativeEvent = event.nativeEvent || event;
      if (typeof nativeEvent.offsetX === 'number' && typeof nativeEvent.offsetY === 'number') {
        x = nativeEvent.offsetX;
        y = nativeEvent.offsetY;
      } else if (typeof nativeEvent.clientX === 'number' && typeof nativeEvent.clientY === 'number') {
        const rect = event.target?.getBoundingClientRect?.();
        if (rect) {
          x = nativeEvent.clientX - rect.left;
          y = nativeEvent.clientY - rect.top;
        } else {
          x = targetSize / 2;
          y = targetSize / 2;
        }
      } else {
        x = targetSize / 2;
        y = targetSize / 2;
      }
      
      const normalizedX = Math.max(0, Math.min(1, x / targetSize));
      const normalizedY = Math.max(0, Math.min(1, y / targetSize));
      placeArrow(normalizedX, normalizedY, targetIndex);
    }
  }, [placeArrow]);

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
      return [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]; // 11 = X ring
    } else {
      return [11, 10, 9, 8, 7, 6, 0]; // 11 = X ring
    }
  };

  const renderTargetFace = (targetIndex: number, size: number) => {
    const rings = targetConfig.rings;
    const colors = targetConfig.colors;
    const ringElements = [];
    
    // Scale marker size inversely to zoom so they appear proportional
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
    
    // Add X ring (innermost ring within gold)
    const xRingSize = size * 0.05 * 0.95; // X ring is about 5% of target size
    const xRingColor = (targetConfig as any).xRingColor || { bg: '#fff200', border: '#b8860b' };
    ringElements.push(
      <View
        key={`xring-${targetIndex}`}
        style={{
          position: 'absolute',
          width: xRingSize,
          height: xRingSize,
          borderRadius: xRingSize / 2,
          backgroundColor: xRingColor.bg,
          borderWidth: 2,
          borderColor: xRingColor.border,
        }}
        pointerEvents="none"
      />
    );

    const targetArrows = isMultiTarget 
      ? arrows.filter(a => a.targetIndex === targetIndex)
      : arrows;

    // For native, we use touch responder events for the magnifier zoom feature
    const nativeTouchProps = Platform.OS !== 'web' ? {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: (e: any) => {
        const { locationX, locationY } = e.nativeEvent;
        handleTouchStart(locationX, locationY, size, targetIndex);
      },
      onResponderMove: (e: any) => {
        const { locationX, locationY } = e.nativeEvent;
        handleTouchMove(locationX, locationY, size);
      },
      onResponderRelease: () => {
        handleTouchEnd(size);
      },
      onResponderTerminate: () => {
        setIsTouching(false);
      },
    } : {};

    // Web mouse events for magnifier
    const handleWebMouseDown = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      console.log('Mouse down on target:', x, y, 'size:', size, 'targetIndex:', targetIndex);
      handleTouchStart(x, y, size, targetIndex);
    };

    const handleWebMouseMove = (e: any) => {
      if (!isTouching) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      handleTouchMove(x, y, size);
    };

    const handleWebMouseUp = () => {
      if (isTouching) {
        handleTouchEnd(size);
      }
    };

    const webProps = Platform.OS === 'web' ? {
      onMouseDown: handleWebMouseDown,
      onMouseMove: handleWebMouseMove,
      onMouseUp: handleWebMouseUp,
      onMouseLeave: handleWebMouseUp,
      style: {
        width: size,
        height: size,
        backgroundColor: '#1a1a1a',
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'crosshair',
        position: 'relative' as const,
        userSelect: 'none' as const,
      }
    } : {};

    const nativeStyle = Platform.OS !== 'web' ? {
      width: size,
      height: size,
      backgroundColor: '#1a1a1a',
      borderRadius: size / 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
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
        // @ts-ignore - web-specific event handlers
        onMouseDown={Platform.OS === 'web' ? handleWebMouseDown : undefined}
        onMouseMove={Platform.OS === 'web' ? handleWebMouseMove : undefined}
        onMouseUp={Platform.OS === 'web' ? handleWebMouseUp : undefined}
        onMouseLeave={Platform.OS === 'web' ? handleWebMouseUp : undefined}
      >
        {Platform.OS === 'web' ? (
          <View
            style={{
              width: size,
              height: size,
              backgroundColor: '#1a1a1a',
              borderRadius: size / 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              position: 'relative' as const,
              userSelect: 'none' as const,
            }}
          >
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
                  style={[
                    {
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
                    },
                  ]}
                  onPress={() => handleEditArrow(globalIndex)}
                >
                  <Text style={{ fontSize: markerFontSize, fontWeight: 'bold', color: getScoreTextColor(arrow.score) }}>
                    {getScoreDisplay(arrow.score)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            
            {/* Show preview marker while touching on web */}
            {isTouching && activeTargetIndex === targetIndex && (
              <View
                style={{
                  position: 'absolute',
                  width: markerSize * 1.5,
                  height: markerSize * 1.5,
                  borderRadius: markerSize * 0.75,
                  borderWidth: 3,
                  borderColor: '#fff',
                  borderStyle: 'dashed',
                  left: touchPosition.x - markerSize * 0.75,
                  top: touchPosition.y - markerSize * 0.75,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                }}
                pointerEvents="none"
              />
            )}
          </div>
        ) : (
          <View style={nativeStyle} {...nativeTouchProps}>
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
                  style={[
                    {
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
                    },
                  ]}
                  onPress={() => handleEditArrow(globalIndex)}
                >
                  <Text style={{ fontSize: markerFontSize, fontWeight: 'bold', color: getScoreTextColor(arrow.score) }}>
                    {getScoreDisplay(arrow.score)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            
            {/* Show preview marker while touching */}
            {isTouching && activeTargetIndex === targetIndex && (
              <View
                style={{
                  position: 'absolute',
                  width: markerSize * 1.5,
                  height: markerSize * 1.5,
                  borderRadius: markerSize * 0.75,
                  borderWidth: 3,
                  borderColor: '#fff',
                  borderStyle: 'dashed',
                  left: touchPosition.x - markerSize * 0.75,
                  top: touchPosition.y - markerSize * 0.75,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                }}
                pointerEvents="none"
              />
            )}
          </View>
        )}
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
            <View style={{ width: 20 }} />
            {renderTargetFace(2, SMALL_TARGET_SIZE)}
          </View>
        </View>
      );
    } else if (isNFAA) {
      return (
        <View style={styles.verticalContainer}>
          {renderTargetFace(0, SMALL_TARGET_SIZE)}
          <View style={{ height: 12 }} />
          {renderTargetFace(1, SMALL_TARGET_SIZE)}
          <View style={{ height: 12 }} />
          {renderTargetFace(2, SMALL_TARGET_SIZE)}
        </View>
      );
    } else {
      return renderTargetFace(0, BASE_TARGET_SIZE);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <TouchableOpacity 
              style={styles.zoomButton} 
              onPress={() => setZoomLevel(1)}
            >
              <Ionicons name="contract-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <ZoomableTarget 
          zoomLevel={zoomLevel}
          baseTargetSize={BASE_TARGET_SIZE}
        >
          {renderTargetContent()}
        </ZoomableTarget>

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
                    {getScoreDisplay(arrow.score)}
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

        <TouchableOpacity style={styles.finishButton} onPress={handleFinishRound}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.finishButtonText}>Finish Round</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Magnifier overlay for precise arrow placement */}
      {isTouching && (
        <View style={styles.magnifierOverlay}>
          <View style={styles.magnifierBox}>
            <View style={styles.magnifierContent}>
              {/* Zoomed view of touch area */}
              <View style={[styles.magnifierClip, { overflow: 'hidden' }]}>
                <View style={{
                  transform: [
                    { translateX: -(touchPosition.x * ZOOM_SCALE) + MAGNIFIER_SIZE / 2 },
                    { translateY: -(touchPosition.y * ZOOM_SCALE) + MAGNIFIER_SIZE / 2 },
                    { scale: ZOOM_SCALE }
                  ],
                }}>
                  {renderTargetFace(activeTargetIndex, isMultiTarget ? SMALL_TARGET_SIZE : BASE_TARGET_SIZE)}
                </View>
              </View>
              {/* Crosshair overlay */}
              <View style={styles.magnifierCrosshairOverlay}>
                <View style={styles.crosshairLineH} />
                <View style={styles.crosshairLineV} />
                <View style={[styles.crosshairDot, { backgroundColor: getScoreColor(previewScore) }]} />
              </View>
            </View>
            {/* Score indicator */}
            <View style={[styles.magnifierScoreBadge, { backgroundColor: getScoreColor(previewScore) }]}>
              <Text style={[styles.magnifierScoreText, { color: getScoreTextColor(previewScore) }]}>
                {getScoreDisplay(previewScore)}
              </Text>
            </View>
          </View>
          <Text style={styles.magnifierHintText}>Drag to adjust • Release to place</Text>
        </View>
      )}

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
                    {getScoreDisplay(score)}
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
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  roundBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4, gap: 4 },
  competitionBadge: { backgroundColor: 'rgba(255, 215, 0, 0.2)' },
  trainingBadge: { backgroundColor: 'rgba(255, 68, 68, 0.2)' },
  roundText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  zoomControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 12 },
  zoomButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  zoomText: { color: '#fff', fontSize: 14, fontWeight: '600', minWidth: 50, textAlign: 'center' },
  zoomContainer: { overflow: 'hidden', marginBottom: 20, borderRadius: 12, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  targetWrapper: { alignItems: 'center', padding: 20 },
  triangleContainer: { alignItems: 'center' },
  triangleTop: { marginBottom: 16 },
  triangleBottom: { flexDirection: 'row', justifyContent: 'center' },
  verticalContainer: { alignItems: 'center' },
  centerMark: { position: 'absolute', width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  centerHorizontal: { position: 'absolute', width: 12, height: 2, backgroundColor: '#000' },
  centerVertical: { position: 'absolute', width: 2, height: 12, backgroundColor: '#000' },
  arrowMarker: { position: 'absolute', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  arrowMarkerText: { fontSize: 10, fontWeight: 'bold' },
  arrowList: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 16 },
  arrowListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  arrowListTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  totalScore: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  arrowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  arrowItem: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#333' },
  arrowScore: { fontSize: 14, fontWeight: 'bold' },
  arrowTargetLabel: { fontSize: 8, marginTop: -2 },
  noArrowsText: { color: '#666', textAlign: 'center', paddingVertical: 20 },
  finishButton: { flexDirection: 'row', backgroundColor: '#8B0000', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  finishButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24, width: SCREEN_WIDTH - 48 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  scoreButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#444' },
  scoreButtonText: { fontSize: 18, fontWeight: 'bold' },
  deleteButton: { flexDirection: 'row', backgroundColor: '#8B0000', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#888', fontSize: 16 },
  // Magnifier styles
  magnifierOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  magnifierBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  magnifierContent: {
    width: MAGNIFIER_SIZE,
    height: MAGNIFIER_SIZE,
    borderRadius: MAGNIFIER_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
  },
  magnifierClip: {
    width: MAGNIFIER_SIZE,
    height: MAGNIFIER_SIZE,
    borderRadius: MAGNIFIER_SIZE / 2,
    backgroundColor: '#1a1a1a',
  },
  magnifierCrosshairOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairLineH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  crosshairLineV: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  crosshairDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  magnifierScoreBadge: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  magnifierScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  magnifierHintText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});
