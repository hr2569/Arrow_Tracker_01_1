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
    router.push('/sessionSetup');
  };

  const selectTraining = () => {
    setSessionType('training');
    router.push('/sessionSetup');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose your session type</Text>

        {/* Session Type Options */}
        <View style={styles.optionsContainer}>
          {/* Competition Mode */}
          <TouchableOpacity
            style={[styles.optionCard, { backgroundColor: colors.card }]}
            onPress={selectCompetition}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIconContainer, { backgroundColor: colors.cardAlt }]}>
              <Ionicons name="trophy" size={48} color="#FFD700" />
            </View>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Competition</Text>
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              10 rounds • 3 arrows each
            </Text>
            <View style={styles.optionBadge}>
              <Text style={styles.optionBadgeText}>30 arrows total</Text>
            </View>
          </TouchableOpacity>

          {/* Training Mode */}
          <TouchableOpacity
            style={[styles.optionCard, styles.trainingCard, { backgroundColor: colors.card }]}
            onPress={selectTraining}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIconContainer, styles.trainingIconContainer, { backgroundColor: colors.cardAlt }]}>
              <Ionicons name="fitness" size={48} color="#ff4444" />
            </View>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Training</Text>
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              Unlimited rounds • Unlimited arrows
            </Text>
            <View style={[styles.optionBadge, styles.trainingBadge]}>
              <Text style={[styles.optionBadgeText, styles.trainingBadgeText]}>Practice freely</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Competition mode follows standard archery scoring with 10 ends of 3 arrows.
            Training mode allows unlimited practice with no restrictions.
          </Text>
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
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  trainingCard: {
    borderColor: '#8B0000',
  },
  optionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  trainingIconContainer: {
    backgroundColor: 'rgba(139, 0, 0, 0.2)',
  },
  optionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 12,
  },
  optionBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trainingBadge: {
    backgroundColor: 'rgba(139, 0, 0, 0.3)',
  },
  optionBadgeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  trainingBadgeText: {
    color: '#ff4444',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoText: {
    color: '#888888',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});
