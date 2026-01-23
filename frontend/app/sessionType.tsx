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
import { useAppStore } from '../store/appStore';

export default function SessionTypeScreen() {
  const router = useRouter();
  const { setSessionType } = useAppStore();

  const selectCompetition = () => {
    setSessionType('competition');
    router.push('/capture');
  };

  const selectTraining = () => {
    setSessionType('training');
    router.push('/capture');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>New Session</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.subtitle}>Choose your session type</Text>

        {/* Session Type Options */}
        <View style={styles.optionsContainer}>
          {/* Competition Mode */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={selectCompetition}
            activeOpacity={0.8}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="trophy" size={48} color="#FFD700" />
            </View>
            <Text style={styles.optionTitle}>Competition</Text>
            <Text style={styles.optionDescription}>
              10 rounds • 3 arrows each
            </Text>
            <View style={styles.optionBadge}>
              <Text style={styles.optionBadgeText}>30 arrows total</Text>
            </View>
          </TouchableOpacity>

          {/* Training Mode */}
          <TouchableOpacity
            style={[styles.optionCard, styles.trainingCard]}
            onPress={selectTraining}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIconContainer, styles.trainingIconContainer]}>
              <Ionicons name="fitness" size={48} color="#4CAF50" />
            </View>
            <Text style={styles.optionTitle}>Training</Text>
            <Text style={styles.optionDescription}>
              Unlimited rounds • Unlimited arrows
            </Text>
            <View style={[styles.optionBadge, styles.trainingBadge]}>
              <Text style={[styles.optionBadgeText, styles.trainingBadgeText]}>Practice freely</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#a0a0a0" />
          <Text style={styles.infoText}>
            Competition mode follows standard archery scoring with 10 ends.
            Training mode allows unlimited practice.
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  trainingCard: {
    borderColor: '#4CAF50',
  },
  optionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  trainingIconContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  optionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 12,
  },
  optionBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trainingBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  optionBadgeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  trainingBadgeText: {
    color: '#4CAF50',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoText: {
    color: '#a0a0a0',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});
