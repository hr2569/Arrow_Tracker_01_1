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

  const startTraining = () => {
    setSessionType('training');
    router.push('/sessionSetup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.subtitle}>Start a new training session</Text>

        {/* Training Mode */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={startTraining}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="fitness" size={48} color="#8B0000" />
          </View>
          <Text style={styles.optionTitle}>Training</Text>
          <Text style={styles.optionDescription}>
            Unlimited rounds • Unlimited arrows
          </Text>
          <View style={styles.optionBadge}>
            <Text style={styles.optionBadgeText}>Practice freely</Text>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#a0a0a0" />
          <Text style={styles.infoText}>
            Training mode allows unlimited practice with no restrictions.
            Score as many rounds as you like.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  optionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    backgroundColor: 'rgba(139, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  optionBadgeText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e1e1e',
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
