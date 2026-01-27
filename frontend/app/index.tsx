import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Settings Button - Top Right */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push('/settings')}
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={24} color="#888" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.targetIcon}>
            <View style={styles.targetRing4} />
            <View style={styles.targetRing3} />
            <View style={styles.targetRing2} />
            <View style={styles.targetRing1} />
            <View style={styles.targetCenter} />
          </View>
          <Text style={styles.title}>Archery Scorer</Text>
          <Text style={styles.subtitle}>
            Score your targets with precision
          </Text>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/sessionType')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="add-circle" size={48} color="#fff" />
            </View>
            <Text style={styles.primaryButtonText}>New Session</Text>
            <Text style={styles.buttonSubtext}>
              Start scoring a new target
            </Text>
          </TouchableOpacity>

          {/* History and Bows side by side */}
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.secondaryButtonHalf}
              onPress={() => router.push('/history')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainerSmall}>
                <Ionicons name="time" size={36} color="#8B0000" />
              </View>
              <Text style={styles.secondaryButtonTextSmall}>History</Text>
              <Text style={styles.buttonSubtextSecondarySmall}>
                Sessions & Stats
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButtonHalf}
              onPress={() => router.push('/bows')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainerSmall}>
                <Image 
                  source={require('../assets/images/bow-icon.png')} 
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.secondaryButtonTextSmall}>Bows</Text>
              <Text style={styles.buttonSubtextSecondarySmall}>
                Equipment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#111',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  targetIcon: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  targetRing4: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#333',
  },
  targetRing3: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  targetRing2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B0000',
    borderWidth: 2,
    borderColor: '#a00000',
  },
  targetRing1: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFC000',
  },
  targetCenter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    marginTop: 8,
  },
  actionsContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#8B0000',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  buttonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#8B0000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtextSecondary: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  secondaryButtonHalf: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  buttonIconContainerSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryButtonTextSmall: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSubtextSecondarySmall: {
    color: '#888888',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});
