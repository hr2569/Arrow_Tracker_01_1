import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      {/* Settings Button - Top Right */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push('/settings')}
        activeOpacity={0.7}
      >
        <Icon name="settings-outline" size={22} color="#888" />
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Logo */}
        <View style={styles.hero}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('app.name')}</Text>
          <Text style={styles.subtitle}>
            {t('app.subtitle')}
          </Text>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          {/* Two Primary Buttons Row */}
          <View style={styles.primaryRow}>
            <TouchableOpacity
              style={styles.primaryButtonHalf}
              onPress={() => router.push('/sessionSetup')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainerPrimary}>
                <Icon name="add-circle" size={36} color="#fff" />
              </View>
              <Text style={styles.primaryButtonTextSmall}>{t('home.newSession')}</Text>
              <Text style={styles.buttonSubtextSmall}>{t('home.practiceTraining')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.competitionButtonDisabled}
              activeOpacity={1}
              disabled={true}
            >
              <View style={styles.buttonIconContainerCompetitionDisabled}>
                <Icon name="trophy" size={36} color="#666" />
              </View>
              <Text style={styles.competitionButtonTextDisabled}>{t('home.competition')}</Text>
              <Text style={styles.competitionSubtextDisabled}>{t('home.comingSoon')}</Text>
            </TouchableOpacity>
          </View>

          {/* History and Bows side by side */}
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.secondaryButtonHalf}
              onPress={() => router.push('/history')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainerSmall}>
                <Icon name="time" size={36} color="#8B0000" />
              </View>
              <Text style={styles.secondaryButtonTextSmall}>{t('home.history')}</Text>
              <Text style={styles.buttonSubtextSecondarySmall}>
                {t('home.sessionsStats')}
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
              <Text style={styles.secondaryButtonTextSmall}>{t('home.bows')}</Text>
              <Text style={styles.buttonSubtextSecondarySmall}>
                {t('home.equipment')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Version Number - Fixed at bottom */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>v2.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  backupButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
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
  primaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButtonHalf: {
    flex: 1,
    backgroundColor: '#8B0000',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIconContainerPrimary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryButtonTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  buttonSubtextSmall: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  competitionButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  competitionButtonDisabled: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  buttonIconContainerCompetitionDisabled: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(100,100,100,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  competitionButtonTextDisabled: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  competitionSubtextDisabled: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
    fontStyle: 'italic',
  },
  buttonIconContainerCompetition: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  competitionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  competitionSubtext: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
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
    backgroundColor: '#1e1e1e',
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
    backgroundColor: '#1e1e1e',
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
    backgroundColor: '#2a2a2a',
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
  versionContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  versionText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});
