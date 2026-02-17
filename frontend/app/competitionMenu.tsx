import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { loadSavedLanguage } from '../i18n';

export default function CompetitionMenuScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      loadSavedLanguage();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="trophy" size={28} color="#FFD700" />
          <Text style={styles.headerTitle}>{t('competitionMenu.title')}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* New Competition */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/competitionSetup')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconContainer}>
            <Icon name="flag" size={40} color="#FFD700" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>{t('competitionMenu.newCompetition')}</Text>
            <Text style={styles.menuSubtitle}>{t('competitionMenu.newCompetitionDesc')}</Text>
          </View>
          <Icon name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        {/* Score Keeping - Import */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/scoreKeeping')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIconContainer}>
            <Icon name="document-text" size={40} color="#4CAF50" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>{t('competitionMenu.scoreKeeping')}</Text>
            <Text style={styles.menuSubtitle}>{t('competitionMenu.scoreKeepingDesc')}</Text>
          </View>
          <Icon name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information-circle" size={20} color="#FFD700" />
          <Text style={styles.infoText}>
            {t('competitionMenu.infoText')}
          </Text>
        </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  menuIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  infoText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});
