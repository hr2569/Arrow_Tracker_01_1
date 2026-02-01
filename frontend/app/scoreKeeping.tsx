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

export default function ScoreKeeping() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="clipboard" size={28} color="#4CAF50" />
          <Text style={styles.headerTitle}>Score Keeping</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        {/* Manual Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/manualScoring')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconContainer}>
            <Ionicons name="create" size={40} color="#4CAF50" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuButtonTitle}>Manual</Text>
            <Text style={styles.menuButtonSubtitle}>Manually enter scores for archers</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFD700" />
        </TouchableOpacity>

        {/* Import PDFs Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/importPdf')}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#1a2a3a' }]}>
            <Ionicons name="document-text" size={40} color="#2196F3" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuButtonTitle}>Import PDFs</Text>
            <Text style={styles.menuButtonSubtitle}>Import score sheets from PDF files</Text>
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
    color: '#4CAF50',
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
    backgroundColor: '#1a3a1a',
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
