import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { useTranslation } from 'react-i18next';
import { languages, saveLanguage } from '../i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  const handleLanguageChange = async (languageCode: string) => {
    await saveLanguage(languageCode);
    setCurrentLanguage(languageCode);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageName = () => {
    const lang = languages.find(l => l.code === currentLanguage);
    return lang ? lang.nativeName : 'English';
  };

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
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Option */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowLanguageModal(true)}
        >
          <View style={styles.settingIconContainer}>
            <Icon name="language" size={24} color="#8B0000" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{t('settings.language')}</Text>
            <Text style={styles.settingValue}>{getCurrentLanguageName()}</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Backup Option */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/backup')}
        >
          <View style={styles.settingIconContainer}>
            <Icon name="cloud-upload-outline" size={24} color="#8B0000" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{t('settings.backup')}</Text>
            <Text style={styles.settingDescription}>{t('settings.backupDescription')}</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('settings.version')}</Text>
            <Text style={styles.aboutValue}>2.1.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Icon name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    currentLanguage === lang.code && styles.languageItemActive
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageNativeName,
                      currentLanguage === lang.code && styles.languageTextActive
                    ]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={styles.languageEnglishName}>{lang.name}</Text>
                  </View>
                  {currentLanguage === lang.code && (
                    <Icon name="checkmark-circle" size={24} color="#8B0000" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingValue: {
    fontSize: 14,
    color: '#8B0000',
    marginTop: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  aboutSection: {
    marginTop: 24,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 16,
    color: '#fff',
  },
  aboutValue: {
    fontSize: 16,
    color: '#8B0000',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  languageList: {
    padding: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  languageItemActive: {
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
  },
  languageInfo: {
    flex: 1,
  },
  languageNativeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  languageTextActive: {
    color: '#8B0000',
  },
  languageEnglishName: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
});
