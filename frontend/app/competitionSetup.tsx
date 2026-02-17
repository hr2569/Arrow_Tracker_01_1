import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { loadSavedLanguage } from '../i18n';
import { useAppStore, TARGET_CONFIGS, COMPETITION_BOW_TYPES } from '../store/appStore';

type TargetType = 'wa_standard' | 'vegas_3spot' | 'nfaa_indoor';

const BOW_TYPE_ICONS: { [key: string]: string } = {
  recurve: 'bow-arrow',
  compound: 'crosshairs',
  barebow: 'circle-outline',
  traditional: 'leaf-outline',
  longbow: 'remove-outline',
};

export default function CompetitionSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { 
    setSessionType, 
    setSessionDistance, 
    setTargetType, 
    competitionData, 
    setCompetitionData,
    clearSessionRounds,
    setCurrentRoundNumber,
  } = useAppStore();
  
  const [archerName, setArcherName] = useState(competitionData.archerName);
  const [selectedBowType, setSelectedBowType] = useState(competitionData.bowType);
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'yd'>('m');
  const [selectedTargetType, setSelectedTargetType] = useState<TargetType>('wa_standard');

  useFocusEffect(
    useCallback(() => {
      loadSavedLanguage();
    }, [])
  );

  const handleStartCompetition = () => {
    // Validate archer name
    if (!archerName.trim()) {
      Alert.alert(
        t('competitionSetup.archerNameRequired'),
        t('competitionSetup.enterArcherName')
      );
      return;
    }

    // Validate distance
    if (!distance.trim()) {
      Alert.alert(
        t('competitionSetup.distanceRequired'),
        t('competitionSetup.enterDistance')
      );
      return;
    }

    const distanceNum = parseFloat(distance);
    if (isNaN(distanceNum) || distanceNum <= 0) {
      Alert.alert(
        t('competitionSetup.invalidDistance'),
        t('competitionSetup.enterValidDistance')
      );
      return;
    }

    // Set session type to competition
    setSessionType('competition');
    
    // Clear any previous session data
    clearSessionRounds();
    setCurrentRoundNumber(1);
    
    // Save competition data
    setCompetitionData({
      archerName: archerName.trim(),
      bowType: selectedBowType,
      maxRounds: 10,
      arrowsPerRound: 3,
    });

    // Set session settings
    setSessionDistance(`${distance}${distanceUnit}`);
    setTargetType(selectedTargetType);
    
    // Navigate to scoring screen
    router.replace('/scoring');
  };

  const getBowTypeLabel = (type: string) => {
    return t(`competitionSetup.bowTypes.${type}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
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
            <Text style={styles.headerTitle}>{t('competitionSetup.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Competition Info */}
          <View style={styles.infoCard}>
            <Icon name="information-circle" size={20} color="#FFD700" />
            <Text style={styles.infoText}>
              {t('competitionSetup.infoText')}
            </Text>
          </View>

          {/* Archer Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('competitionSetup.archerName')}</Text>
            <TextInput
              style={styles.textInput}
              value={archerName}
              onChangeText={setArcherName}
              placeholder={t('competitionSetup.archerNamePlaceholder')}
              placeholderTextColor="#666"
              autoCapitalize="words"
            />
          </View>

          {/* Bow Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('competitionSetup.bowType')}</Text>
            <View style={styles.bowTypeGrid}>
              {COMPETITION_BOW_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.bowTypeButton,
                    selectedBowType === type && styles.bowTypeButtonSelected,
                  ]}
                  onPress={() => setSelectedBowType(type)}
                >
                  <Text style={[
                    styles.bowTypeText,
                    selectedBowType === type && styles.bowTypeTextSelected,
                  ]}>
                    {getBowTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('competitionSetup.distance')}</Text>
            <View style={styles.distanceRow}>
              <TextInput
                style={styles.distanceInput}
                value={distance}
                onChangeText={setDistance}
                placeholder="18"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[styles.unitButton, distanceUnit === 'm' && styles.unitButtonActive]}
                  onPress={() => setDistanceUnit('m')}
                >
                  <Text style={[styles.unitText, distanceUnit === 'm' && styles.unitTextActive]}>m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, distanceUnit === 'yd' && styles.unitButtonActive]}
                  onPress={() => setDistanceUnit('yd')}
                >
                  <Text style={[styles.unitText, distanceUnit === 'yd' && styles.unitTextActive]}>yd</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Target Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('competitionSetup.targetFace')}</Text>
            <View style={styles.targetGrid}>
              {Object.entries(TARGET_CONFIGS).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.targetButton,
                    selectedTargetType === key && styles.targetButtonSelected,
                  ]}
                  onPress={() => setSelectedTargetType(key as TargetType)}
                >
                  <Text style={[
                    styles.targetName,
                    selectedTargetType === key && styles.targetNameSelected,
                  ]}>
                    {config.name}
                  </Text>
                  <Text style={[
                    styles.targetDesc,
                    selectedTargetType === key && styles.targetDescSelected,
                  ]}>
                    {config.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Session Structure Info */}
          <View style={styles.structureCard}>
            <Text style={styles.structureTitle}>{t('competitionSetup.sessionStructure')}</Text>
            <View style={styles.structureRow}>
              <View style={styles.structureItem}>
                <Text style={styles.structureValue}>10</Text>
                <Text style={styles.structureLabel}>{t('competitionSetup.rounds')}</Text>
              </View>
              <View style={styles.structureDivider} />
              <View style={styles.structureItem}>
                <Text style={styles.structureValue}>3</Text>
                <Text style={styles.structureLabel}>{t('competitionSetup.arrowsPerRound')}</Text>
              </View>
              <View style={styles.structureDivider} />
              <View style={styles.structureItem}>
                <Text style={styles.structureValue}>30</Text>
                <Text style={styles.structureLabel}>{t('competitionSetup.totalArrows')}</Text>
              </View>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartCompetition}
          >
            <Icon name="flag" size={24} color="#000" />
            <Text style={styles.startButtonText}>{t('competitionSetup.startCompetition')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  infoText: {
    flex: 1,
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  bowTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bowTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
  },
  bowTypeButtonSelected: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  bowTypeText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  bowTypeTextSelected: {
    color: '#fff',
  },
  distanceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  distanceInput: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitButtonActive: {
    backgroundColor: '#8B0000',
  },
  unitText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  unitTextActive: {
    color: '#fff',
  },
  targetGrid: {
    gap: 10,
  },
  targetButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  targetButtonSelected: {
    backgroundColor: 'rgba(139, 0, 0, 0.3)',
    borderColor: '#8B0000',
  },
  targetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  targetNameSelected: {
    color: '#fff',
  },
  targetDesc: {
    fontSize: 13,
    color: '#666',
  },
  targetDescSelected: {
    color: '#aaa',
  },
  structureCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  structureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  structureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  structureItem: {
    flex: 1,
    alignItems: 'center',
  },
  structureValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  structureLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  structureDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});
