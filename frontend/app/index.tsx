import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            Capture, analyze, and score your archery targets with AI
          </Text>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/capture')}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={28} color="#fff" />
            <Text style={styles.primaryButtonText}>New Scoring Session</Text>
            <Text style={styles.buttonSubtext}>
              Capture or upload target photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/history')}
            activeOpacity={0.8}
          >
            <Ionicons name="time" size={24} color="#e94560" />
            <Text style={styles.secondaryButtonText}>View History</Text>
          </TouchableOpacity>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Capture Target</Text>
              <Text style={styles.stepDescription}>
                Take a photo or upload from gallery
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Align & Verify</Text>
              <Text style={styles.stepDescription}>
                AI detects target corners, you verify alignment
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Score Arrows</Text>
              <Text style={styles.stepDescription}>
                AI suggests arrow positions, confirm or edit
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Track Progress</Text>
              <Text style={styles.stepDescription}>
                Save scores and view your history
              </Text>
            </View>
          </View>
        </View>

        {/* Scoring Info */}
        <View style={styles.scoringInfo}>
          <Text style={styles.sectionTitle}>Scoring Rings</Text>
          <View style={styles.scoringRings}>
            <View style={[styles.ringBadge, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.ringBadgeText}>10-9</Text>
            </View>
            <View style={[styles.ringBadge, { backgroundColor: '#DC143C' }]}>
              <Text style={styles.ringBadgeTextWhite}>8-7</Text>
            </View>
            <View style={[styles.ringBadge, { backgroundColor: '#4169E1' }]}>
              <Text style={styles.ringBadgeTextWhite}>6-5</Text>
            </View>
            <View style={[styles.ringBadge, { backgroundColor: '#1a1a2e' }]}>
              <Text style={styles.ringBadgeTextWhite}>4-3</Text>
            </View>
            <View style={[styles.ringBadge, { backgroundColor: '#f0f0f0' }]}>
              <Text style={styles.ringBadgeText}>2-1</Text>
            </View>
          </View>
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
