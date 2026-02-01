import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CompetitionMenu() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="trophy" size={28} color="#FFD700" />
          <Text style={styles.headerTitle}>Competition</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        {/* Shoot Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/competitionSetup')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconContainer}>
            <Ionicons name="locate" size={40} color="#000" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuButtonTitle}>Shoot</Text>
            <Text style={styles.menuButtonSubtitle}>Start a new competition round</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFD700" />
        </TouchableOpacity>

        {/* Score Keeping Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/scoreKeeping')}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#1a3a1a' }]}>
            <Ionicons name="clipboard" size={40} color="#4CAF50" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuButtonTitle}>Score Keeping</Text>
            <Text style={styles.menuButtonSubtitle}>Record scores for other archers</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFD700" />
        </TouchableOpacity>

        {/* Competition History Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/competitionHistory')}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#2a2a3a' }]}>
            <Ionicons name="time" size={40} color="#9C27B0" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuButtonTitle}>Competition History</Text>
            <Text style={styles.menuButtonSubtitle}>View past competition results</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFD700" />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  placeholder: {
    width: 40,
  },
  menuContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  menuIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#3a3a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  menuButtonSubtitle: {
    fontSize: 14,
    color: '#888',
  },
});
