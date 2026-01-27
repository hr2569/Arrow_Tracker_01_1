import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';

type ThemeType = 'dark' | 'light' | 'system';

const themeOptions: { value: ThemeType; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useAppStore();
  const colors = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const getThemeLabel = () => {
    const option = themeOptions.find(o => o.value === theme);
    return option ? option.label : 'Dark';
  };

  const settingsItems = [
    { 
      icon: 'language-outline', 
      title: 'Language', 
      subtitle: 'English',
      onPress: () => {} // TODO: Language selection
    },
    { 
      icon: 'moon-outline', 
      title: 'Theme', 
      subtitle: getThemeLabel(),
      onPress: () => setShowThemeModal(true)
    },
    { 
      icon: 'cloud-outline', 
      title: 'Backup & Sync', 
      subtitle: 'Data management',
      onPress: () => {} // TODO: Backup screen
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.settingsItem, { backgroundColor: colors.card }]} 
            activeOpacity={0.7}
            onPress={item.onPress}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: colors.cardAlt }]}>
              <Ionicons name={item.icon as any} size={24} color={colors.accent} />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>Archery Scorer v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowThemeModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Theme</Text>
            
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  { backgroundColor: colors.cardAlt },
                  theme === option.value && [styles.themeOptionSelected, { backgroundColor: colors.accentLight }]
                ]}
                onPress={() => {
                  setTheme(option.value);
                  setShowThemeModal(false);
                }}
              >
                <View style={styles.themeOptionLeft}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={24} 
                    color={theme === option.value ? colors.accent : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.themeOptionText,
                    { color: colors.textSecondary },
                    theme === option.value && [styles.themeOptionTextSelected, { color: colors.text }]
                  ]}>
                    {option.label}
                  </Text>
                </View>
                {theme === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.cardAlt }]}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
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
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  versionText: {
    fontSize: 13,
    color: '#666',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  themeOptionSelected: {
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeOptionText: {
    fontSize: 16,
    color: '#888',
  },
  themeOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
});
