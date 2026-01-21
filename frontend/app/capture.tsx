import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAppStore } from '../store/appStore';

// Static target image URL for manual scoring mode
const STATIC_TARGET_URL = 'https://customer-assets.emergentagent.com/job_fcfa55b4-6097-4211-a8aa-34e3ff4ecd9c/artifacts/a1wjppkr_Untitled-1.jpg';

export default function CaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraMode, setCameraMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { setCurrentImage, setTargetData, setManualMode } = useAppStore();

  const pickImage = async () => {
    try {
      setManualMode(false); // Not manual mode when using gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const base64 = result.assets[0].base64;
        
        if (base64) {
          setCurrentImage(`data:image/jpeg;base64,${base64}`);
          router.push('/alignment');
        } else {
          Alert.alert('Error', 'Could not process image');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    setIsLoading(true);
    setManualMode(false); // Not manual mode when using camera
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo && photo.base64) {
        setCurrentImage(`data:image/jpeg;base64,${photo.base64}`);
        setCameraMode(false);
        router.push('/alignment');
      } else {
        Alert.alert('Error', 'Could not capture image');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setIsLoading(false);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permission Required',
          'Camera permission is needed to take photos'
        );
        return;
      }
    }
    setCameraMode(true);
  };

  const startManualScoring = async () => {
    setIsLoading(true);
    try {
      // Set manual mode and use the static target image
      setManualMode(true);
      // Set default target data for the clean target (centered, full size)
      // Radius matches the 0.95 factor used in ring rendering (0.95/2 = 0.475)
      setTargetData({
        corners: [],
        center: { x: 0.5, y: 0.5 },
        radius: 0.475,
        confidence: 1.0,
      });
      setCurrentImage(null); // No image needed for manual mode
      router.push('/scoring');
    } catch (error) {
      console.error('Manual scoring error:', error);
      Alert.alert('Error', 'Failed to start manual scoring');
    } finally {
      setIsLoading(false);
    }
  };

  if (cameraMode) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          {/* Camera overlay with target guide */}
          <View style={styles.cameraOverlay}>
            <View style={styles.targetGuide}>
              <View style={styles.guideCornerTL} />
              <View style={styles.guideCornerTR} />
              <View style={styles.guideCornerBL} />
              <View style={styles.guideCornerBR} />
            </View>
            <Text style={styles.guideText}>
              Align target within the frame
            </Text>
          </View>

          {/* Camera Controls */}
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => setCameraMode(false)}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureBtn}
              onPress={takePicture}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <View style={styles.captureBtnInner} />
              )}
            </TouchableOpacity>

            <View style={styles.cameraPlaceholder} />
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>New Session</Text>
        <Text style={styles.subtitle}>
          Choose how you want to score your target
        </Text>

        <View style={styles.optionsContainer}>
          {/* Manual Scoring - Primary Option */}
          <TouchableOpacity
            style={styles.primaryOptionCard}
            onPress={startManualScoring}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <View style={styles.primaryOptionIconContainer}>
                  <Ionicons name="hand-left" size={48} color="#fff" />
                </View>
                <Text style={styles.primaryOptionTitle}>Manual Scoring</Text>
                <Text style={styles.primaryOptionDescription}>
                  Use a clean target and tap to add arrows
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use your own photo</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.secondaryOptionsRow}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={openCamera}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="camera" size={36} color="#e94560" />
              </View>
              <Text style={styles.optionTitle}>Camera</Text>
              <Text style={styles.optionDescription}>
                Take a photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="images" size={36} color="#e94560" />
              </View>
              <Text style={styles.optionTitle}>Gallery</Text>
              <Text style={styles.optionDescription}>
                Select a photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info about camera/gallery options */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#a0a0a0" />
          <Text style={styles.infoText}>
            Camera & Gallery options will use AI to detect your target and arrows
          </Text>
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
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  primaryOptionCard: {
    backgroundColor: '#e94560',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryOptionIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryOptionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  primaryOptionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a4e',
  },
  dividerText: {
    color: '#a0a0a0',
    fontSize: 12,
    marginHorizontal: 12,
  },
  secondaryOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    color: '#a0a0a0',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetGuide: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  guideCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#e94560',
  },
  guideCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#e94560',
  },
  guideCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#e94560',
  },
  guideCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#e94560',
  },
  guideText: {
    position: 'absolute',
    bottom: -40,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cameraCloseBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  cameraPlaceholder: {
    width: 50,
    height: 50,
  },
});
