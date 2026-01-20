import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TARGET_SIZE = SCREEN_WIDTH - 40;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

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

  useEffect(() => {
    if (currentImage) {
      detectArrows();
    }
  }, []);

  const detectArrows = async () => {
    if (!currentImage) return;

    setIsDetecting(true);
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
        // No arrows detected, user can add manually
        Alert.alert(
          'No Arrows Detected',
          'Tap on the target to mark arrow positions manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Arrow detection error:', err);
      Alert.alert(
        'Detection Failed',
        'Tap on the target to mark arrow positions manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const calculateRingFromPosition = (x: number, y: number): number => {
    // Calculate distance from center (0.5, 0.5)
    const centerX = targetData?.center?.x || 0.5;
    const centerY = targetData?.center?.y || 0.5;
    const radius = targetData?.radius || 0.4;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize distance to ring (0-1 mapped to rings 10-1)
    const normalizedDistance = distance / radius;
    
    if (normalizedDistance > 1) return 0; // Miss
    
    const ring = Math.max(1, Math.min(10, Math.ceil(10 - normalizedDistance * 10)));
    return ring;
  };

  const handleTargetPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const x = locationX / TARGET_SIZE;
    const y = locationY / TARGET_SIZE;

    const ring = calculateRingFromPosition(x, y);

    const newArrow: Arrow = {
      id: `arrow-${Date.now()}`,
      x,
      y,
      ring,
      confirmed: true,
    };

    setArrows([...arrows, newArrow]);
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
      // Add 0-score arrows for misses
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Target Area */}
        <View style={styles.targetContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleTargetPress}
            style={styles.targetTouchArea}
          >
            {/* Background Image */}
            {currentImage && (
              <Image
                source={{ uri: currentImage }}
                style={styles.targetImage}
                resizeMode="contain"
              />
            )}

            {/* Target Rings Overlay */}
            {showTargetOverlay && targetData && (
              <View 
                style={[
                  styles.targetOverlay,
                  {
                    left: (targetData.center?.x || 0.5) * TARGET_SIZE,
                    top: (targetData.center?.y || 0.5) * TARGET_SIZE,
                    transform: [
                      { translateX: -TARGET_SIZE * (targetData.radius || 0.4) },
                      { translateY: -TARGET_SIZE * (targetData.radius || 0.4) },
                    ],
                  },
                ]}
              >
                {[...Array(10)].map((_, i) => {
                  const ringRadius = TARGET_SIZE * (targetData.radius || 0.4) * 2;
                  const ringSize = ringRadius * ((10 - i) / 10);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.ring,
                        {
                          width: ringSize,
                          height: ringSize,
                          borderRadius: ringSize / 2,
                          borderColor: i < 2 ? '#ccc' : (i < 4 ? '#333' : (i < 6 ? '#4169E1' : (i < 8 ? '#DC143C' : '#FFD700'))),
                          borderWidth: 1,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}

            {/* Arrow Markers */}
            {arrows.map((arrow) => (
              <TouchableOpacity
                key={arrow.id}
                style={[
                  styles.arrowMarker,
                  {
                    left: arrow.x * TARGET_SIZE - 15,
                    top: arrow.y * TARGET_SIZE - 15,
                  },
                  selectedArrow === arrow.id && styles.selectedArrow,
                  !arrow.confirmed && styles.unconfirmedArrow,
                ]}
                onPress={() => handleArrowPress(arrow.id)}
              >
                <Text style={styles.arrowScore}>{arrow.ring}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>

          {/* Loading Overlay */}
          {isDetecting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#e94560" />
              <Text style={styles.loadingText}>Detecting arrows...</Text>
            </View>
          )}
        </View>

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
            <Text style={styles.listTitle}>Arrows</Text>
            {arrows.map((arrow, index) => (
              <View key={arrow.id} style={styles.arrowItem}>
                <View style={styles.arrowInfo}>
                  <Text style={styles.arrowNumber}>#{index + 1}</Text>
                  <View
                    style={[
                      styles.ringIndicator,
                      { backgroundColor: RING_COLORS[arrow.ring - 1] || '#666' },
                    ]}
                  />
                  <Text style={styles.arrowRing}>{arrow.ring} pts</Text>
                </View>
                <View style={styles.arrowActions}>
                  {!arrow.confirmed && (
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => confirmArrow(arrow.id)}
                    >
                      <Ionicons name="checkmark" size={18} color="#4CAF50" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeArrow(arrow.id)}
                  >
                    <Ionicons name="trash" size={18} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Selected Arrow Actions */}
        {selectedArrow && (
          <View style={styles.selectedActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                const arrow = arrows.find(a => a.id === selectedArrow);
                if (arrow) confirmArrow(arrow.id);
              }}
            >
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.actionText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => removeArrow(selectedArrow)}
            >
              <Ionicons name="trash" size={24} color="#ff6b6b" />
              <Text style={styles.actionText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Ionicons name="information-circle" size={20} color="#a0a0a0" />
          <Text style={styles.instructionText}>
            Tap on the target to add arrows. Tap an arrow to select/remove it.
          </Text>
        </View>

        {/* Toggle Overlay */}
        <TouchableOpacity
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
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#e94560" />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleFinishRound}
          >
            <Text style={styles.primaryButtonText}>Finish Round</Text>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </TouchableOpacity>
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
  },
  targetContainer: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
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
  targetOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  arrowMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectedArrow: {
    borderColor: '#FFD700',
    borderWidth: 3,
    transform: [{ scale: 1.2 }],
  },
  unconfirmedArrow: {
    opacity: 0.7,
    borderStyle: 'dashed',
  },
  arrowScore: {
    color: '#fff',
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
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
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
  listTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
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
  },
  ringIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  arrowRing: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  selectedActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionText: {
    color: '#a0a0a0',
    marginTop: 4,
    fontSize: 12,
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
