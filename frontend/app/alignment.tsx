import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  PanResponder,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Corner {
  x: number;
  y: number;
  position: string;
}

export default function AlignmentScreen() {
  const router = useRouter();
  const { currentImage, setCurrentImage, setTargetData } = useAppStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corners, setCorners] = useState<Corner[]>([
    { x: 0.15, y: 0.15, position: 'top-left' },
    { x: 0.85, y: 0.15, position: 'top-right' },
    { x: 0.85, y: 0.85, position: 'bottom-right' },
    { x: 0.15, y: 0.85, position: 'bottom-left' },
  ]);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  
  // Use refs to track corner positions during drag
  const cornersRef = useRef(corners);
  const startPosRef = useRef({ x: 0, y: 0 });
  
  // Keep ref in sync with state
  useEffect(() => {
    cornersRef.current = corners;
  }, [corners]);

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

      if (response.data.success && response.data.corners?.length === 4) {
        setCorners(response.data.corners);
        setAnalysisComplete(true);
      } else {
        // Use default corners for manual adjustment
        setIsManualMode(true);
        setAnalysisComplete(true);
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setIsManualMode(true);
      setAnalysisComplete(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCornerDrag = (index: number, gestureState: any) => {
    const currentCorners = [...cornersRef.current];
    let newX = startPosRef.current.x + gestureState.dx / IMAGE_SIZE;
    let newY = startPosRef.current.y + gestureState.dy / IMAGE_SIZE;
    
    // Clamp values between 0 and 1
    newX = Math.max(0.05, Math.min(0.95, newX));
    newY = Math.max(0.05, Math.min(0.95, newY));
    
    currentCorners[index] = { ...currentCorners[index], x: newX, y: newY };
    setCorners(currentCorners);
  };

  const panResponders = useRef(
    [0, 1, 2, 3].map((index) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setActiveCorner(index);
          // Store the starting position
          startPosRef.current = {
            x: cornersRef.current[index].x,
            y: cornersRef.current[index].y,
          };
        },
        onPanResponderMove: (_, gestureState) => {
          handleCornerDrag(index, gestureState);
        },
        onPanResponderRelease: () => {
          setActiveCorner(null);
        },
      })
    )
  ).current;

  const calculateCenter = () => {
    const avgX = corners.reduce((sum, c) => sum + c.x, 0) / 4;
    const avgY = corners.reduce((sum, c) => sum + c.y, 0) / 4;
    return { x: avgX, y: avgY };
  };

  const calculateRadius = () => {
    // Calculate the width and height of the bounding box from corners
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // The radius is half of the smaller dimension (to fit a circle)
    // Multiply by 0.95 to account for margin on the target paper
    return Math.min(width, height) / 2 * 0.95;
  };

  const [isCropping, setIsCropping] = useState(false);

  const handleConfirm = async () => {
    if (!currentImage) return;
    
    setIsCropping(true);
    
    try {
      // Call perspective crop API
      const response = await axios.post(`${API_URL}/api/perspective-crop`, {
        image_base64: currentImage,
        corners: corners.map(c => ({ x: c.x, y: c.y })),
        output_size: 800,
      });
      
      if (response.data.success && response.data.cropped_image) {
        // Update the current image with the cropped version
        setCurrentImage(response.data.cropped_image);
        
        // Set target data - after crop, center is at 0.5, 0.5 and radius is 0.45
        setTargetData({
          corners: [
            { x: 0, y: 0, position: 'top-left' },
            { x: 1, y: 0, position: 'top-right' },
            { x: 1, y: 1, position: 'bottom-right' },
            { x: 0, y: 1, position: 'bottom-left' },
          ],
          center: { x: 0.5, y: 0.5 },
          radius: 0.45,
          confidence: 0.9,
        });
        
        router.push('/scoring');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to crop image');
      }
    } catch (err: any) {
      console.error('Crop error:', err);
      Alert.alert('Error', 'Failed to crop image. Proceeding with original.');
      
      // Fallback - use original image with calculated center/radius
      const center = calculateCenter();
      const radius = calculateRadius();
      
      setTargetData({
        corners: corners,
        center: center,
        radius: radius,
        confidence: isManualMode ? 0.7 : 0.9,
      });
      
      router.push('/scoring');
    } finally {
      setIsCropping(false);
    }
  };

  const handleRetake = () => {
    router.back();
  };

  const resetCorners = () => {
    setCorners([
      { x: 0.15, y: 0.15, position: 'top-left' },
      { x: 0.85, y: 0.15, position: 'top-right' },
      { x: 0.85, y: 0.85, position: 'bottom-right' },
      { x: 0.15, y: 0.85, position: 'bottom-left' },
    ]);
  };

  const renderCornerHandle = (corner: Corner, index: number) => {
    const isActive = activeCorner === index;
    return (
      <View
        key={index}
        {...panResponders[index].panHandlers}
        style={[
          styles.cornerHandle,
          {
            left: corner.x * IMAGE_SIZE - 20,
            top: corner.y * IMAGE_SIZE - 20,
          },
          isActive && styles.activeCorner,
        ]}
      >
        <View style={styles.cornerInner}>
          <Text style={styles.cornerLabel}>{index + 1}</Text>
        </View>
      </View>
    );
  };

  const renderPerspectiveLines = () => {
    // Draw lines connecting corners
    return (
      <View style={styles.linesContainer} pointerEvents="none">
        {/* SVG-like lines using absolute positioned views */}
        <View
          style={[
            styles.line,
            {
              left: corners[0].x * IMAGE_SIZE,
              top: corners[0].y * IMAGE_SIZE,
              width: Math.sqrt(
                Math.pow((corners[1].x - corners[0].x) * IMAGE_SIZE, 2) +
                Math.pow((corners[1].y - corners[0].y) * IMAGE_SIZE, 2)
              ),
              transform: [
                {
                  rotate: `${Math.atan2(
                    (corners[1].y - corners[0].y) * IMAGE_SIZE,
                    (corners[1].x - corners[0].x) * IMAGE_SIZE
                  )}rad`,
                },
              ],
              transformOrigin: 'left center',
            },
          ]}
        />
        <View
          style={[
            styles.line,
            {
              left: corners[1].x * IMAGE_SIZE,
              top: corners[1].y * IMAGE_SIZE,
              width: Math.sqrt(
                Math.pow((corners[2].x - corners[1].x) * IMAGE_SIZE, 2) +
                Math.pow((corners[2].y - corners[1].y) * IMAGE_SIZE, 2)
              ),
              transform: [
                {
                  rotate: `${Math.atan2(
                    (corners[2].y - corners[1].y) * IMAGE_SIZE,
                    (corners[2].x - corners[1].x) * IMAGE_SIZE
                  )}rad`,
                },
              ],
              transformOrigin: 'left center',
            },
          ]}
        />
        <View
          style={[
            styles.line,
            {
              left: corners[2].x * IMAGE_SIZE,
              top: corners[2].y * IMAGE_SIZE,
              width: Math.sqrt(
                Math.pow((corners[3].x - corners[2].x) * IMAGE_SIZE, 2) +
                Math.pow((corners[3].y - corners[2].y) * IMAGE_SIZE, 2)
              ),
              transform: [
                {
                  rotate: `${Math.atan2(
                    (corners[3].y - corners[2].y) * IMAGE_SIZE,
                    (corners[3].x - corners[2].x) * IMAGE_SIZE
                  )}rad`,
                },
              ],
              transformOrigin: 'left center',
            },
          ]}
        />
        <View
          style={[
            styles.line,
            {
              left: corners[3].x * IMAGE_SIZE,
              top: corners[3].y * IMAGE_SIZE,
              width: Math.sqrt(
                Math.pow((corners[0].x - corners[3].x) * IMAGE_SIZE, 2) +
                Math.pow((corners[0].y - corners[3].y) * IMAGE_SIZE, 2)
              ),
              transform: [
                {
                  rotate: `${Math.atan2(
                    (corners[0].y - corners[3].y) * IMAGE_SIZE,
                    (corners[0].x - corners[3].x) * IMAGE_SIZE
                  )}rad`,
                },
              ],
              transformOrigin: 'left center',
            },
          ]}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.title}>Perspective Alignment</Text>
          <Text style={styles.subtitle}>
            Drag the corners to align with the target edges
          </Text>

          {/* Image with Corner Handles */}
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

            {/* Loading Overlay */}
            {isAnalyzing && (
              <View style={styles.analysisOverlay}>
                <ActivityIndicator size="large" color="#e94560" />
                <Text style={styles.analysisText}>Detecting target corners...</Text>
              </View>
            )}

            {/* Perspective Lines */}
            {analysisComplete && renderPerspectiveLines()}

            {/* Corner Handles */}
            {analysisComplete && corners.map((corner, index) => 
              renderCornerHandle(corner, index)
            )}

            {/* Center Marker */}
            {analysisComplete && (
              <View
                style={[
                  styles.centerMarker,
                  {
                    left: calculateCenter().x * IMAGE_SIZE - 12,
                    top: calculateCenter().y * IMAGE_SIZE - 12,
                  },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <View style={styles.instructionRow}>
              <Ionicons name="finger-print" size={20} color="#e94560" />
              <Text style={styles.instructionText}>
                Drag each numbered corner to match the target's edges
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="locate" size={20} color="#4CAF50" />
              <Text style={styles.instructionText}>
                The green center will be used for scoring calculations
              </Text>
            </View>
          </View>

          {/* Status */}
          {isManualMode && (
            <View style={styles.manualModeCard}>
              <Ionicons name="hand-left" size={20} color="#FFD700" />
              <Text style={styles.manualModeText}>
                Manual mode - adjust corners to fit your target
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleRetake}
            >
              <Ionicons name="camera" size={24} color="#e94560" />
              <Text style={styles.iconButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={resetCorners}
            >
              <Ionicons name="refresh" size={24} color="#e94560" />
              <Text style={styles.iconButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={analyzeTarget}
              disabled={isAnalyzing}
            >
              <Ionicons name="scan" size={24} color="#e94560" />
              <Text style={styles.iconButtonText}>Re-scan</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!analysisComplete || isAnalyzing || isCropping) && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={!analysisComplete || isAnalyzing || isCropping}
          >
            {isCropping ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.confirmButtonText}>Cropping...</Text>
              </>
            ) : (
              <>
                <Text style={styles.confirmButtonText}>Crop & Continue</Text>
                <Ionicons name="crop" size={24} color="#fff" />
              </>
            )}
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
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'visible',
    alignSelf: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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
    borderRadius: 16,
  },
  analysisText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  cornerHandle: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cornerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e94560',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCorner: {
    transform: [{ scale: 1.3 }],
  },
  cornerLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  linesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  line: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#e94560',
  },
  centerMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    zIndex: 5,
  },
  instructions: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    gap: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionText: {
    color: '#a0a0a0',
    fontSize: 14,
    flex: 1,
  },
  manualModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  manualModeText: {
    color: '#FFD700',
    fontSize: 14,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  iconButton: {
    alignItems: 'center',
    padding: 12,
  },
  iconButtonText: {
    color: '#e94560',
    fontSize: 12,
    marginTop: 4,
  },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
