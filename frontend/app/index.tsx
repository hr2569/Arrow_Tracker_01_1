import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
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

          {/* History Button - Full Width */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/history')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainerSmall}>
              <Ionicons name="time" size={36} color="#8B0000" />
            </View>
            <Text style={styles.secondaryButtonText}>History & Stats</Text>
            <Text style={styles.buttonSubtextSecondary}>
              Sessions and performance
            </Text>
          </TouchableOpacity>

          {/* Bows Button */}
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={[styles.bottomButton, { flex: 1 }]}
              onPress={() => router.push('/bows')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward-outline" size={28} color="#8B0000" />
              <Text style={styles.bottomButtonText}>Bows</Text>
              <Text style={styles.bottomButtonSubtext}>Equipment</Text>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  targetIcon: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  targetRing4: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f0f0f0',
  },
  targetRing3: {
    position: 'absolute',
    width: 105,
    height: 105,
    borderRadius: 52.5,
    backgroundColor: '#1a1a1a',
  },
  targetRing2: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4169E1',
  },
  targetRing1: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#8B0000',
  },
  targetCenter: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFD700',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 16,
  },
  buttonIconContainer: {
    marginBottom: 12,
  },
  buttonIconContainerSmall: {
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#8B0000',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 6,
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
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  secondaryButtonTextSmall: {
    color: '#8B0000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtextSecondarySmall: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  bowsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  bowsButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomButton: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  bottomButtonText: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  bottomButtonSubtext: {
    color: '#888888',
    fontSize: 11,
    marginTop: 2,
  },
});
