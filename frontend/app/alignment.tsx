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
    setManualMode 
  } = useAppStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectedArrow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (capturedImage) {
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
          image: capturedImage,
          target_type: targetType,
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
    if (detectionResult) {
      setManualMode(false);
      router.push('/scoring');
    }
  };

  const handleManualScoring = () => {
    setManualMode(true);
    router.push('/scoring');
  };

  const handleRetake = () => {
    router.back();
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
        <View style={styles.headerSpacer} />
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
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.resultTitle}>
                {detectionResult.length} Arrow{detectionResult.length !== 1 ? 's' : ''} Detected
              </Text>
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

            {/* Individual Arrows */}
            <View style={styles.arrowsList}>
              {detectionResult.map((arrow, index) => (
                <View key={index} style={styles.arrowItem}>
                  <View style={styles.arrowNumber}>
                    <Text style={styles.arrowNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.arrowInfo}>
                    <Text style={styles.arrowRing}>Ring {arrow.ring}</Text>
                    <Text style={styles.arrowConfidence}>
                      {Math.round(arrow.confidence * 100)}% confidence
                    </Text>
                  </View>
                  <View style={[
                    styles.arrowScore,
                    arrow.ring >= 9 && styles.arrowScoreGold,
                    arrow.ring >= 7 && arrow.ring < 9 && styles.arrowScoreRed,
                  ]}>
                    <Text style={styles.arrowScoreText}>{arrow.ring}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Error State */}
        {!isProcessing && error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorTitle}>Detection Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {detectionResult ? (
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
  headerSpacer: {
    width: 40,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
  arrowItem: {
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
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowScoreGold: {
    backgroundColor: '#FFD700',
  },
  arrowScoreRed: {
    backgroundColor: '#8B0000',
  },
  arrowScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
});
