import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface DetectedArrow {
  x: number;
  y: number;
  ring: number;
  confidence: number;
}

export default function AlignmentScreen() {
  const router = useRouter();
  const { 
    capturedImage, 
    targetType, 
    setDetectedArrows, 
    setManualMode,
    setCurrentImage 
  } = useAppStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectedArrow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingArrowIndex, setEditingArrowIndex] = useState<number | null>(null);
  const [showScorePicker, setShowScorePicker] = useState(false);

  useEffect(() => {
    if (capturedImage) {
      // Also set currentImage so scoring screen can access it
      setCurrentImage(capturedImage);
      processImage();
    }
  }, [capturedImage]);

  const processImage = async () => {
    if (!capturedImage) return;

    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/detect-arrows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: capturedImage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const data = await response.json();
      
      if (data.arrows && data.arrows.length > 0) {
        setDetectionResult(data.arrows);
        setDetectedArrows(data.arrows);
      } else {
        setError('No arrows detected. Try retaking the photo or switch to manual scoring.');
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process image. Please try again or use manual scoring.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseResults = () => {
    if (detectionResult && capturedImage) {
      // Make sure currentImage is set for the scoring screen
      setCurrentImage(capturedImage);
      setDetectedArrows(detectionResult);
      setManualMode(false);
      // Go directly to the combined scoring screen
      router.replace('/scoring');
    }
  };

  const handleManualScoring = () => {
    // Also set currentImage for manual scoring from photo
    if (capturedImage) {
      setCurrentImage(capturedImage);
    }
    setManualMode(true);
    // Go directly to the combined scoring screen
    router.replace('/scoring');
  };

  const handleRetake = () => {
    router.back();
  };

  const handleEditArrow = (index: number) => {
    setEditingArrowIndex(index);
    setShowScorePicker(true);
  };

  const handleUpdateScore = (newScore: number) => {
    if (editingArrowIndex !== null && detectionResult) {
      const updatedResults = [...detectionResult];
      updatedResults[editingArrowIndex] = {
        ...updatedResults[editingArrowIndex],
        ring: newScore,
        confidence: 1.0, // User-confirmed
      };
      setDetectionResult(updatedResults);
      setDetectedArrows(updatedResults);
    }
    setShowScorePicker(false);
    setEditingArrowIndex(null);
  };

  const handleDeleteArrow = (index: number) => {
    Alert.alert(
      'Delete Arrow',
      'Remove this arrow from the results?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (detectionResult) {
              const updatedResults = detectionResult.filter((_, i) => i !== index);
              setDetectionResult(updatedResults);
              setDetectedArrows(updatedResults);
            }
          },
        },
      ]
    );
  };

  const handleAddArrow = () => {
    const newArrow: DetectedArrow = {
      x: 0.5,
      y: 0.5,
      ring: 10,
      confidence: 1.0,
    };
    
    if (detectionResult) {
      const updatedResults = [...detectionResult, newArrow];
      setDetectionResult(updatedResults);
      setDetectedArrows(updatedResults);
      // Open score picker for the new arrow
      setEditingArrowIndex(updatedResults.length - 1);
      setShowScorePicker(true);
    } else {
      setDetectionResult([newArrow]);
      setDetectedArrows([newArrow]);
      setEditingArrowIndex(0);
      setShowScorePicker(true);
    }
  };

  const getTotalScore = () => {
    if (!detectionResult) return 0;
    return detectionResult.reduce((sum, arrow) => sum + arrow.ring, 0);
  };

  const getAverageConfidence = () => {
    if (!detectionResult || detectionResult.length === 0) return 0;
    const avg = detectionResult.reduce((sum, arrow) => sum + arrow.confidence, 0) / detectionResult.length;
    return Math.round(avg * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return '#FFD700'; // Gold
    if (score >= 7) return '#ed1c24'; // Red
    if (score >= 5) return '#00a2e8'; // Blue
    if (score >= 3) return '#2a2a2a'; // Black
    return '#f5f5f0'; // White
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 9) return '#000'; // Dark text on gold
    if (score >= 3 && score < 5) return '#fff'; // White on black
    if (score < 3) return '#000'; // Dark on white
    return '#fff'; // White on colored rings
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arrow Detection</Text>
        <TouchableOpacity onPress={processImage} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#8B0000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {capturedImage ? (
            <Image 
              source={{ uri: capturedImage }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={64} color="#666" />
              <Text style={styles.noImageText}>No image captured</Text>
            </View>
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#8B0000" />
              <Text style={styles.processingText}>Detecting arrows...</Text>
              <Text style={styles.processingSubtext}>
                AI is analyzing your target
              </Text>
            </View>
          )}
        </View>

        {/* Results */}
        {!isProcessing && detectionResult && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleRow}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.resultTitle}>
                  {detectionResult.length} Arrow{detectionResult.length !== 1 ? 's' : ''} Detected
                </Text>
              </View>
              <Text style={styles.editHint}>Tap to edit scores</Text>
            </View>

            {/* Score Summary */}
            <View style={styles.scoreSummary}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreValue}>{getTotalScore()}</Text>
                <Text style={styles.scoreLabel}>Total Score</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreItem}>
                <Text style={styles.scoreValue}>{getAverageConfidence()}%</Text>
                <Text style={styles.scoreLabel}>Confidence</Text>
              </View>
            </View>

            {/* Individual Arrows - Editable */}
            <View style={styles.arrowsList}>
              {detectionResult.map((arrow, index) => (
                <View key={index} style={styles.arrowItemContainer}>
                  <TouchableOpacity 
                    style={styles.arrowItem}
                    onPress={() => handleEditArrow(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.arrowNumber}>
                      <Text style={styles.arrowNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.arrowInfo}>
                      <Text style={styles.arrowRing}>Ring {arrow.ring}</Text>
                      <Text style={styles.arrowConfidence}>
                        {arrow.confidence === 1.0 ? 'User confirmed' : `${Math.round(arrow.confidence * 100)}% confidence`}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={[
                        styles.arrowScore,
                        { backgroundColor: getScoreColor(arrow.ring) }
                      ]}
                      onPress={() => handleEditArrow(index)}
                    >
                      <Text style={[styles.arrowScoreText, { color: getScoreTextColor(arrow.ring) }]}>
                        {arrow.ring}
                      </Text>
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={20} color="#666" style={styles.editIcon} />
                  </TouchableOpacity>
                  
                  {/* Delete button */}
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteArrow(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Add Arrow Button */}
              <TouchableOpacity 
                style={styles.addArrowButton}
                onPress={handleAddArrow}
              >
                <Ionicons name="add-circle-outline" size={24} color="#8B0000" />
                <Text style={styles.addArrowText}>Add Missing Arrow</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error State */}
        {!isProcessing && error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorTitle}>Detection Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
            
            {/* Add arrow manually even on error */}
            <TouchableOpacity 
              style={styles.addArrowButtonError}
              onPress={handleAddArrow}
            >
              <Ionicons name="add-circle-outline" size={24} color="#8B0000" />
              <Text style={styles.addArrowText}>Add Arrows Manually</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {detectionResult && detectionResult.length > 0 ? (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleRetake}
            >
              <Ionicons name="camera" size={20} color="#8B0000" />
              <Text style={styles.secondaryButtonText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleUseResults}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Use Results</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleRetake}
            >
              <Ionicons name="camera" size={20} color="#8B0000" />
              <Text style={styles.secondaryButtonText}>Retake Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleManualScoring}
            >
              <Ionicons name="hand-left" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Manual Score</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Score Picker Modal */}
      <Modal
        visible={showScorePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScorePicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowScorePicker(false)}
        >
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
                  style={[
                    styles.scoreOption,
                    { backgroundColor: getScoreColor(score) },
                    editingArrowIndex !== null && 
                    detectionResult && 
                    detectionResult[editingArrowIndex]?.ring === score && 
                    styles.scoreOptionSelected
                  ]}
                  onPress={() => handleUpdateScore(score)}
                >
                  <Text style={[
                    styles.scoreOptionText,
                    { color: getScoreTextColor(score) }
                  ]}>
                    {score === 10 ? 'X' : score}
                  </Text>
                  <Text style={[
                    styles.scoreOptionLabel,
                    { color: getScoreTextColor(score), opacity: 0.7 }
                  ]}>
                    {score >= 9 ? 'Gold' : score >= 7 ? 'Red' : score >= 5 ? 'Blue' : score >= 3 ? 'Black' : 'White'}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  processingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#888',
  },
  resultsContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  resultHeader: {
    marginBottom: 16,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  editHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginLeft: 32,
  },
  scoreSummary: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  arrowsList: {
    gap: 8,
  },
  arrowItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
  },
  arrowNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  arrowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  arrowRing: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  arrowConfidence: {
    fontSize: 12,
    color: '#888',
  },
  arrowScore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  editIcon: {
    marginLeft: 8,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addArrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
    borderStyle: 'dashed',
  },
  addArrowButtonError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  addArrowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B0000',
  },
  errorContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  primaryButton: {
    flex: 1,
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
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  // Modal styles
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
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scoreOptionSelected: {
    borderColor: '#fff',
  },
  scoreOptionText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  scoreOptionLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
