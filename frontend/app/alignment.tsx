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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function AlignmentScreen() {
  const router = useRouter();
  const { currentImage, setTargetData, targetData } = useAppStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentImage) {
      analyzeTarget();
    }
  }, []);

  const analyzeTarget = async () => {
    if (!currentImage) {
      setError('No image to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/analyze-target`, {
        image_base64: currentImage,
      });

      if (response.data.success) {
        setAnalysisResult(response.data);
        setTargetData({
          corners: response.data.corners,
          center: response.data.center,
          radius: response.data.radius,
          confidence: response.data.confidence,
        });
      } else {
        setError(response.data.message || 'Failed to detect target');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    router.back();
  };

  const handleConfirm = () => {
    if (!analysisResult) {
      Alert.alert('Error', 'Please wait for analysis to complete');
      return;
    }
    router.push('/scoring');
  };

  const handleManualAlign = () => {
    // For now, proceed with default center
    setTargetData({
      corners: [],
      center: { x: 0.5, y: 0.5 },
      radius: 0.4,
      confidence: 0.5,
    });
    router.push('/scoring');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Image Preview with Overlay */}
        <View style={styles.imageContainer}>
          {currentImage ? (
            <Image
              source={{ uri: currentImage }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={64} color="#a0a0a0" />
              <Text style={styles.placeholderText}>No image</Text>
            </View>
          )}

          {/* Analysis Overlay */}
          {isAnalyzing && (
            <View style={styles.analysisOverlay}>
              <ActivityIndicator size="large" color="#e94560" />
              <Text style={styles.analysisText}>Detecting target...</Text>
            </View>
          )}

          {/* Detection Result Overlay */}
          {analysisResult && !isAnalyzing && (
            <View style={styles.detectionOverlay}>
              {/* Draw detected corners */}
              {analysisResult.corners?.map((corner: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.cornerMarker,
                    {
                      left: corner.x * IMAGE_SIZE - 10,
                      top: corner.y * IMAGE_SIZE - 10,
                    },
                  ]}
                />
              ))}
              
              {/* Draw center marker */}
              {analysisResult.center && (
                <View
                  style={[
                    styles.centerMarker,
                    {
                      left: analysisResult.center.x * IMAGE_SIZE - 15,
                      top: analysisResult.center.y * IMAGE_SIZE - 15,
                    },
                  ]}
                >
                  <Ionicons name="add" size={30} color="#4CAF50" />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          {isAnalyzing ? (
            <View style={styles.statusCard}>
              <ActivityIndicator size="small" color="#e94560" />
              <Text style={styles.statusText}>Analyzing target...</Text>
            </View>
          ) : error ? (
            <View style={[styles.statusCard, styles.errorCard]}>
              <Ionicons name="warning" size={24} color="#ff6b6b" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : analysisResult ? (
            <View style={[styles.statusCard, styles.successCard]}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <View style={styles.statusContent}>
                <Text style={styles.successText}>Target Detected!</Text>
                <Text style={styles.confidenceText}>
                  Confidence: {Math.round((analysisResult.confidence || 0.8) * 100)}%
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Alignment Check</Text>
          <Text style={styles.instructionText}>
            {analysisResult
              ? 'Verify that the green crosshair is centered on the target. If not, you can retake the photo or proceed with manual scoring.'
              : 'AI is analyzing the image to detect the target. Please wait...'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRetake}
          >
            <Ionicons name="refresh" size={20} color="#e94560" />
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </TouchableOpacity>

          {error && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleManualAlign}
            >
              <Ionicons name="hand-left" size={20} color="#e94560" />
              <Text style={styles.secondaryButtonText}>Manual</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!analysisResult || isAnalyzing) && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={!analysisResult || isAnalyzing}
          >
            <Text style={styles.primaryButtonText}>Confirm</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#a0a0a0',
    marginTop: 8,
  },
  analysisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  detectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  cornerMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
  },
  centerMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSection: {
    marginTop: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  errorCard: {
    borderColor: '#ff6b6b',
    borderWidth: 1,
  },
  successCard: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  statusText: {
    color: '#fff',
    marginLeft: 12,
    fontSize: 16,
  },
  statusContent: {
    marginLeft: 12,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confidenceText: {
    color: '#a0a0a0',
    fontSize: 14,
    marginTop: 4,
  },
  errorText: {
    color: '#ff6b6b',
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  instructions: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionText: {
    color: '#a0a0a0',
    fontSize: 14,
    lineHeight: 20,
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
  disabledButton: {
    opacity: 0.5,
  },
});
