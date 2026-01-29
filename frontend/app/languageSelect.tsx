import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { Language, languageNames, languageFlags } from '../i18n/translations';

const languages: Language[] = ['en', 'es', 'pt', 'fi', 'sv', 'de', 'fr', 'uk'];

export default function LanguageSelectScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const handleSelectLanguage = async (lang: Language) => {
    await setLanguage(lang);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('selectLanguage')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[
              styles.languageItem,
              language === lang && styles.languageItemSelected,
            ]}
            onPress={() => handleSelectLanguage(lang)}
            activeOpacity={0.7}
          >
            <Text style={styles.languageFlag}>{languageFlags[lang]}</Text>
            <Text style={[
              styles.languageName,
              language === lang && styles.languageNameSelected,
            ]}>
              {languageNames[lang]}
            </Text>
            {language === lang && (
              <Ionicons name="checkmark-circle" size={24} color="#8B0000" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  languageItemSelected: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 16,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  languageNameSelected: {
    color: '#8B0000',
    fontWeight: '600',
  },
});
