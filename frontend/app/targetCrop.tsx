import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import Svg, { Line, Circle } from 'react-native-svg';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 32; // Padding on both sides

interface Corner {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  position: string;
}

export default function TargetCropScreen() {
  const router = useRouter();
  const { capturedImage, targetType, setCapturedImage, setCurrentImage } = useAppStore();
  
  const [isDetecting, setIsDetecting] = useState(true);
  const [isCropping, setIsCropping] = useState(false);
  const [corners, setCorners] = useState<Corner[]>([
    { x: 0.15, y: 0.15, position: 'top_left' },
    { x: 0.85, y: 0.15, position: 'top_right' },
    { x: 0.85, y: 0.85, position: 'bottom_right' },
    { x: 0.15, y: 0.85, position: 'bottom_left' },
  ]);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [detectionAttempted, setDetectionAttempted] = useState(false);
  
  const imageLayoutRef = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 0, y: 0, width: IMAGE_SIZE, height: IMAGE_SIZE
  });

  useEffect(() => {
    if (capturedImage && !detectionAttempted) {
      detectCorners();
    }
  }, [capturedImage]);

  const detectCorners = async () => {
    if (!capturedImage) return;

    try {
      setIsDetecting(true);
      setError(null);
      setDetectionAttempted(true);

      const response = await fetch(`${API_BASE}/api/detect-paper-corners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: capturedImage,
          target_type: targetType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to detect corners');
      }

      const data = await response.json();
      
      if (data.success && data.corners && data.corners.length === 4) {
        // Map corners to correct order: TL, TR, BR, BL
        const orderedCorners = orderCorners(data.corners);
        setCorners(orderedCorners);
        setConfidence(data.confidence || 0.8);
      } else {
        setError('Could not auto-detect corners. Please adjust manually.');
      }
    } catch (err) {
      console.error('Error detecting corners:', err);
      setError('Auto-detection failed. Please adjust corners manually.');
    } finally {
      setIsDetecting(false);
    }
  };

  const orderCorners = (rawCorners: Corner[]): Corner[] => {
    // Sort corners by position if labels are provided
    const cornerMap: { [key: string]: Corner } = {};
    rawCorners.forEach(c => {
      cornerMap[c.position] = c;
    });

    // Return in order: TL, TR, BR, BL
    if (cornerMap['top_left'] && cornerMap['top_right'] && cornerMap['bottom_right'] && cornerMap['bottom_left']) {
      return [
        cornerMap['top_left'],
        cornerMap['top_right'],
        cornerMap['bottom_right'],
        cornerMap['bottom_left'],
      ];
    }

    // Fallback: sort by position geometrically
    const sorted = [...rawCorners].sort((a, b) => a.y - b.y);
    const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
    
    return [
      { ...top[0], position: 'top_left' },
      { ...top[1], position: 'top_right' },
      { ...bottom[1], position: 'bottom_right' },
      { ...bottom[0], position: 'bottom_left' },
    ];
  };

  const handleCornerDrag = (index: number, gestureX: number, gestureY: number) => {
    const layout = imageLayoutRef.current;
    
    // Calculate normalized position (0-1) from screen coordinates
    const relativeX = (gestureX - layout.x) / layout.width;
    const relativeY = (gestureY - layout.y) / layout.height;
    
    // Clamp values to 0-1 range
    const clampedX = Math.max(0, Math.min(1, relativeX));
    const clampedY = Math.max(0, Math.min(1, relativeY));

    setCorners(prev => {
      const newCorners = [...prev];
      newCorners[index] = {
        ...newCorners[index],
        x: clampedX,
        y: clampedY,
      };
      return newCorners;
    });
  };

  const handlePerspectiveCrop = async () => {
    if (!capturedImage) return;

    try {
      setIsCropping(true);

      // Ensure corners are in correct order for perspective transform
      const cropCorners = [
        { x: corners[0].x, y: corners[0].y }, // TL
        { x: corners[1].x, y: corners[1].y }, // TR
        { x: corners[2].x, y: corners[2].y }, // BR
        { x: corners[3].x, y: corners[3].y }, // BL
      ];

      const response = await fetch(`${API_BASE}/api/perspective-crop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: capturedImage,
          corners: cropCorners,
          output_size: 800,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to crop image');
      }

      const data = await response.json();
      
      if (data.success && data.cropped_image) {
        // Update both capturedImage and currentImage with the cropped version
        setCapturedImage(data.cropped_image);
        setCurrentImage(data.cropped_image);
        // Navigate directly to scoring screen (combined arrow detection + scoring)
        router.push('/scoring');
      } else {
        Alert.alert('Error', data.message || 'Failed to crop image');
      }
    } catch (err) {
      console.error('Error cropping image:', err);
      Alert.alert('Error', 'Failed to crop image. Please try again.');
    } finally {
      setIsCropping(false);
    }
  };

  const handleSkipCrop = () => {
    // Skip cropping - set currentImage from capturedImage and go to scoring
    if (capturedImage) {
      setCurrentImage(capturedImage);
    }
    router.push('/scoring');
  };

  const handleRetake = () => {
    router.back();
  };

  const handleRetryDetection = () => {
    setDetectionAttempted(false);
    detectCorners();
  };

  // Convert normalized coordinates to screen coordinates
  const toScreenCoords = (corner: Corner) => ({
    x: corner.x * IMAGE_SIZE,
    y: corner.y * IMAGE_SIZE,
  });

  const cornerLabels = ['TL', 'TR', 'BR', 'BL'];
  const cornerColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

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
        <Text style={styles.headerTitle}>Align Target</Text>
        <TouchableOpacity onPress={handleRetryDetection} style={styles.retryButton}>
          <Ionicons name="refresh" size={24} color="#8B0000" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionBar}>
        <Ionicons name="information-circle" size={20} color="#8B0000" />
        <Text style={styles.instructionText}>
          Drag corners to match the target paper edges
        </Text>
      </View>

      {/* Image with Corner Overlay */}
      <View 
        style={styles.imageContainer}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          imageLayoutRef.current = { x, y, width, height };
        }}
      >
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

        {/* SVG Overlay for corner lines */}
        {!isDetecting && (
          <View style={styles.svgOverlay}>
            <Svg width={IMAGE_SIZE} height={IMAGE_SIZE}>
              {/* Draw lines connecting corners */}
              {corners.map((corner, i) => {
                const nextCorner = corners[(i + 1) % 4];
                const start = toScreenCoords(corner);
                const end = toScreenCoords(nextCorner);
                return (
                  <Line
                    key={`line-${i}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="#8B0000"
                    strokeWidth={3}
                    strokeDasharray="10,5"
                  />
                );
              })}
            </Svg>
          </View>
        )}

        {/* Draggable Corner Points */}
        {!isDetecting && corners.map((corner, index) => {
          const screenPos = toScreenCoords(corner);
          return (
            <View
              key={`corner-${index}`}
              style={[
                styles.cornerHandle,
                {
                  left: screenPos.x - 16,
                  top: screenPos.y - 16,
                  backgroundColor: cornerColors[index],
                  borderColor: activeCorner === index ? '#fff' : 'transparent',
                },
              ]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={() => setActiveCorner(index)}
              onResponderMove={(evt) => {
                handleCornerDrag(index, evt.nativeEvent.pageX, evt.nativeEvent.pageY - 150);
              }}
              onResponderRelease={() => setActiveCorner(null)}
            >
              <Text style={styles.cornerLabel}>{cornerLabels[index]}</Text>
            </View>
          );
        })}

        {/* Processing Overlay */}
        {isDetecting && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#8B0000" />
            <Text style={styles.processingText}>Detecting target corners...</Text>
            <Text style={styles.processingSubtext}>
              AI is analyzing your photo
            </Text>
          </View>
        )}
      </View>

      {/* Confidence indicator */}
      {!isDetecting && confidence > 0 && (
        <View style={styles.confidenceBar}>
          <Text style={styles.confidenceLabel}>AI Confidence:</Text>
          <View style={styles.confidenceMeter}>
            <View 
              style={[
                styles.confidenceFill, 
                { width: `${confidence * 100}%` },
                confidence > 0.8 ? styles.confidenceHigh : 
                confidence > 0.5 ? styles.confidenceMed : styles.confidenceLow
              ]} 
            />
          </View>
          <Text style={styles.confidenceValue}>{Math.round(confidence * 100)}%</Text>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={20} color="#FFB74D" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleRetake}
        >
          <Ionicons name="camera" size={20} color="#8B0000" />
          <Text style={styles.secondaryButtonText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSkipCrop}
        >
          <Ionicons name="arrow-forward" size={20} color="#8B0000" />
          <Text style={styles.secondaryButtonText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.primaryButton, isCropping && styles.buttonDisabled]}
          onPress={handlePerspectiveCrop}
          disabled={isCropping || isDetecting}
        >
          {isCropping ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="crop" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Crop & Continue</Text>
            </>
          )}
        </TouchableOpacity>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayToggle: {
    padding: 8,
  },
  retryButton: {
    padding: 8,
  },
  scaleControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    gap: 10,
  },
  scaleLabel: {
    fontSize: 12,
    color: '#888',
  },
  scaleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    width: 40,
    textAlign: 'center',
  },
  instructionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    gap: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#888',
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'visible',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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
  ringOverlayContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
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
  svgOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  cornerHandle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  cornerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
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
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderRadius: 12,
    gap: 12,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#888',
  },
  confidenceMeter: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceHigh: {
    backgroundColor: '#4CAF50',
  },
  confidenceMed: {
    backgroundColor: '#FFB74D',
  },
  confidenceLow: {
    backgroundColor: '#FF5252',
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    width: 45,
    textAlign: 'right',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    borderRadius: 12,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FFB74D',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    marginTop: 'auto',
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
    opacity: 0.6,
  },
});
