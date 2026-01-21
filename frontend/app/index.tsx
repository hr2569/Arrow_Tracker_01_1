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

        {/* Main Actions - Simplified */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/capture')}
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

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/history')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="stats-chart" size={48} color="#e94560" />
            </View>
            <Text style={styles.secondaryButtonText}>View History & Stats</Text>
            <Text style={styles.buttonSubtextSecondary}>
              Track your progress over time
            </Text>
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
  scrollContent: {
    padding: 20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  targetIcon: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  targetRing4: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  targetRing3: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1a1a2e',
  },
  targetRing2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4169E1',
  },
  targetRing1: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#DC143C',
  },
  targetCenter: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FFD700',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionsContainer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#e94560',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  secondaryButtonText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  howItWorks: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  scoringInfo: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  scoringRings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ringBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  ringBadgeTextWhite: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});
