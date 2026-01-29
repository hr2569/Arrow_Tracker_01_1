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
import { useLanguage } from '../i18n/LanguageContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_TARGET_SIZE = Math.min(SCREEN_WIDTH - 32, SCREEN_HEIGHT * 0.45);

// Competition mode constants
const COMPETITION_ARROWS_PER_ROUND = 3;

interface Arrow {
  id: string;
  x: number;
  y: number;
  ring: number;
}

export default function ScoringScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { 
    setCurrentRound, 
    sessionType, 
    currentRoundNumber, 
    targetType,
  } = useAppStore();
  
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [selectedArrowIndex, setSelectedArrowIndex] = useState<number | null>(null);
  const [showScorePicker, setShowScorePicker] = useState(false);
  const [targetLayout, setTargetLayout] = useState<{ width: number; height: number } | null>(null);

  // Get target configuration
  const targetConfig = TARGET_CONFIGS[targetType as keyof typeof TARGET_CONFIGS] || TARGET_CONFIGS.wa_standard;

  // Session info
  const isCompetition = sessionType === 'competition';

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
      Alert.alert(t('noArrows'), t('pleaseMarkArrow'));
      return;
    }

    if (isCompetition && arrows.length < COMPETITION_ARROWS_PER_ROUND) {
      Alert.alert(
        t('addMoreArrows'),
        t('competitionArrowsMsg').replace('{count}', String(COMPETITION_ARROWS_PER_ROUND)).replace('{current}', String(arrows.length)),
        [
          { text: t('addMore'), style: 'cancel' },
          { text: t('continue'), onPress: finishRound },
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

  const handleBack = () => {
    router.back();
  };

  // The ring size for the target
  const RING_SIZE = BASE_TARGET_SIZE;

  // Render ring overlay - creates a visual target
  const renderRingOverlay = () => {
    const rings = targetConfig.rings;
    const ringElements = [];
    
    // Draw rings from largest (outermost) to smallest (innermost)
    for (let i = 0; i < rings; i++) {
      const ringRatio = (rings - i) / rings;
      const size = RING_SIZE * ringRatio;
      const color = targetConfig.colors[i];
      
      const fillColor = color?.bg || '#f5f5f0';
      const borderCol = color?.border || '#333';
      
      ringElements.push(
        <View
          key={`ring-${i}`}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: borderCol,
              borderWidth: 1.5,
              backgroundColor: fillColor,
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('scoreArrows')}</Text>
          <View style={[styles.roundBadge, isCompetition ? styles.competitionBadge : styles.trainingBadge]}>
            <Ionicons name={isCompetition ? "trophy" : "fitness"} size={12} color={isCompetition ? "#FFD700" : "#ff4444"} />
            <Text style={styles.roundText}>{t('round')} {currentRoundNumber}</Text>
          </View>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Target Area */}
        <View style={styles.targetWrapper}>
          <Pressable
            style={[styles.targetContainer, { width: BASE_TARGET_SIZE, height: BASE_TARGET_SIZE }]}
            onLayout={(e) => setTargetLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
            onPress={handleTargetPress}
          >
            {/* Ring Overlay */}
            <View 
              style={[
                styles.ringOverlay, 
                { 
                  width: BASE_TARGET_SIZE, 
                  height: BASE_TARGET_SIZE,
                }
              ]} 
              pointerEvents="none"
            >
              {renderRingOverlay()}
              {/* Center crosshair */}
              <View style={styles.crosshair}>
                <View style={styles.crosshairH} />
                <View style={styles.crosshairV} />
              </View>
            </View>

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
          </Pressable>
          
          <Text style={styles.tapHint}>{t('tapToAddArrows')}</Text>
        </View>

        {/* Score Summary */}
        <View style={styles.scoreSummary}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{getTotalScore()}</Text>
            <Text style={styles.scoreLabel}>{t('total')}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{arrows.length}</Text>
            <Text style={styles.scoreLabel}>{t('arrows')}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>
              {arrows.length > 0 ? (getTotalScore() / arrows.length).toFixed(1) : '0'}
            </Text>
            <Text style={styles.scoreLabel}>{t('avg')}</Text>
          </View>
        </View>

        {/* Arrow List */}
        {arrows.length > 0 && (
          <View style={styles.arrowList}>
            <Text style={styles.sectionTitle}>{t('arrows')}</Text>
            {arrows.map((arrow, index) => (
              <View key={arrow.id} style={styles.arrowRow}>
                <TouchableOpacity style={styles.arrowInfo} onPress={() => handleEditArrow(index)}>
                  <View style={styles.arrowNumber}>
                    <Text style={styles.arrowNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.arrowDetails}>
                    <Text style={styles.arrowRingText}>{t('ring')} {arrow.ring}</Text>
                    <Text style={styles.arrowConfText}>{t('manual')}</Text>
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
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#8B0000" />
          <Text style={styles.secondaryButtonText}>{t('back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.primaryButton, arrows.length === 0 && styles.buttonDisabled]} 
          onPress={handleFinishRound}
          disabled={arrows.length === 0}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>{t('finishRound')}</Text>
        </TouchableOpacity>
      </View>

      {/* Score Picker Modal */}
      <Modal visible={showScorePicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowScorePicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectScore')}</Text>
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
    width: 40,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    width: 40,
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
    fontSize: 24,
    fontWeight: 'bold',
  },
});
