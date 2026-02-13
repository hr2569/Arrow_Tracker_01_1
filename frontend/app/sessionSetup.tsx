import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { loadSavedLanguage } from '../i18n';
import { useAppStore, TARGET_CONFIGS } from '../store/appStore';
import { getBowIcon } from '../utils/bowIcons';
import { getBows, Bow } from '../utils/localStorage';

type TargetType = 'wa_standard' | 'vegas_3spot' | 'nfaa_indoor';

export default function SessionSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { sessionType, setSelectedBow, setSessionDistance, targetType, setTargetType } = useAppStore();
  
  const [bows, setBows] = useState<Bow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBowId, setSelectedBowId] = useState<string | null>(null);
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'yd'>('m');
  const [selectedTargetType, setSelectedTargetType] = useState<TargetType>(targetType as TargetType);

  const fetchBows = async () => {
    try {
      setLoading(true);
      const data = await getBows();
      setBows(data);
      // Auto-select if only one bow exists
      if (data.length === 1) {
        setSelectedBowId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching bows:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBows();
    }, [])
  );

  const handleStartSession = () => {
    // Validate bow selection
    if (!selectedBowId) {
      Alert.alert('Select a Bow', 'Please select a bow before starting the session.');
      return;
    }

    // Validate distance
    if (!distance.trim()) {
      Alert.alert('Enter Distance', 'Please enter the shooting distance.');
      return;
    }

    const distanceNum = parseFloat(distance);
    if (isNaN(distanceNum) || distanceNum <= 0) {
      Alert.alert('Invalid Distance', 'Please enter a valid distance.');
      return;
    }

    // Save selections to store
    const selectedBow = bows.find(b => b.id === selectedBowId);
    if (selectedBow) {
      setSelectedBow({
        id: selectedBow.id,
        name: selectedBow.name,
        bow_type: selectedBow.bow_type,
        draw_weight: selectedBow.draw_weight,
        draw_length: selectedBow.draw_length,
      });
    }
    setSessionDistance(`${distance}${distanceUnit}`);
    setTargetType(selectedTargetType);
    
    // Navigate to manual scoring screen
    router.push('/scoring');
  };

  const navigateToAddBow = () => {
    router.push('/bows');
  };

  const renderBowIcon = (bowType: string, isSelected: boolean) => {
    const icon = getBowIcon(bowType);
    return (
      <Image 
        source={icon.value} 
        style={[
          styles.bowIconImage,
          isSelected && styles.bowIconImageSelected
        ]} 
        resizeMode="contain"
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={styles.loadingText}>{t('sessionSetup.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show prompt to add a bow if none exist
  if (bows.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('sessionSetup.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="alert-circle-outline" size={64} color="#8B0000" />
          </View>
          <Text style={styles.emptyTitle}>{t('sessionSetup.noBowsFound')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('sessionSetup.noBowsMessage')}
          </Text>
          <TouchableOpacity
            style={styles.addBowButton}
            onPress={navigateToAddBow}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addBowButtonText}>{t('sessionSetup.addFirstBow')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior="height"
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('sessionSetup.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Target Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sessionSetup.targetFace')}</Text>
            <View style={styles.targetTypesGrid}>
              {/* WA Standard */}
              <TouchableOpacity
                style={[
                  styles.targetTypeCard,
                  selectedTargetType === 'wa_standard' && styles.targetTypeCardSelected,
                ]}
                onPress={() => setSelectedTargetType('wa_standard')}
                activeOpacity={0.8}
              >
                <View style={styles.targetPreview}>
                  <View style={[styles.targetRing, { backgroundColor: '#f5f5f0', width: 50, height: 50 }]}>
                    <View style={[styles.targetRing, { backgroundColor: '#2a2a2a', width: 40, height: 40 }]}>
                      <View style={[styles.targetRing, { backgroundColor: '#00a2e8', width: 30, height: 30 }]}>
                        <View style={[styles.targetRing, { backgroundColor: '#ed1c24', width: 20, height: 20 }]}>
                          <View style={[styles.targetRing, { backgroundColor: '#fff200', width: 10, height: 10 }]} />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
                <Text style={[styles.targetTypeName, selectedTargetType === 'wa_standard' && styles.targetTypeNameSelected]}>
                  {t('sessionSetup.waStandard')}
                </Text>
                <Text style={styles.targetTypeDesc}>{t('sessionSetup.waStandardDesc')}</Text>
                {selectedTargetType === 'wa_standard' && (
                  <View style={styles.targetCheckmark}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Vegas 3-Spot */}
              <TouchableOpacity
                style={[
                  styles.targetTypeCard,
                  selectedTargetType === 'vegas_3spot' && styles.targetTypeCardSelected,
                ]}
                onPress={() => setSelectedTargetType('vegas_3spot')}
                activeOpacity={0.8}
              >
                <View style={styles.targetPreview}>
                  <View style={styles.vegasTrianglePreview}>
                    <View style={styles.vegasTopRow}>
                      <View style={[styles.miniTargetVegas]}>
                        <View style={[styles.miniRing, { backgroundColor: '#00a2e8', width: 16, height: 16 }]}>
                          <View style={[styles.miniRing, { backgroundColor: '#ed1c24', width: 10, height: 10 }]}>
                            <View style={[styles.miniRing, { backgroundColor: '#fff200', width: 5, height: 5 }]} />
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={styles.vegasBottomRow}>
                      <View style={[styles.miniTargetVegas]}>
                        <View style={[styles.miniRing, { backgroundColor: '#00a2e8', width: 16, height: 16 }]}>
                          <View style={[styles.miniRing, { backgroundColor: '#ed1c24', width: 10, height: 10 }]}>
                            <View style={[styles.miniRing, { backgroundColor: '#fff200', width: 5, height: 5 }]} />
                          </View>
                        </View>
                      </View>
                      <View style={[styles.miniTargetVegas]}>
                        <View style={[styles.miniRing, { backgroundColor: '#00a2e8', width: 16, height: 16 }]}>
                          <View style={[styles.miniRing, { backgroundColor: '#ed1c24', width: 10, height: 10 }]}>
                            <View style={[styles.miniRing, { backgroundColor: '#fff200', width: 5, height: 5 }]} />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
                <Text style={[styles.targetTypeName, selectedTargetType === 'vegas_3spot' && styles.targetTypeNameSelected]}>
                  {t('sessionSetup.vegas3Spot')}
                </Text>
                <Text style={styles.targetTypeDesc}>{t('sessionSetup.vegas3SpotDesc')}</Text>
                {selectedTargetType === 'vegas_3spot' && (
                  <View style={styles.targetCheckmark}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* NFAA Indoor */}
              <TouchableOpacity
                style={[
                  styles.targetTypeCard,
                  selectedTargetType === 'nfaa_indoor' && styles.targetTypeCardSelected,
                ]}
                onPress={() => setSelectedTargetType('nfaa_indoor')}
                activeOpacity={0.8}
              >
                <View style={styles.targetPreview}>
                  <View style={styles.nfaaVerticalPreview}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[styles.miniRing, { backgroundColor: '#00a2e8', width: 14, height: 14 }]}>
                        <View style={[styles.miniRing, { backgroundColor: '#ed1c24', width: 9, height: 9 }]}>
                          <View style={[styles.miniRing, { backgroundColor: '#fff200', width: 4, height: 4 }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={[styles.targetTypeName, selectedTargetType === 'nfaa_indoor' && styles.targetTypeNameSelected]}>
                  {t('sessionSetup.waIndoor')}
                </Text>
                <Text style={styles.targetTypeDesc}>{t('sessionSetup.waIndoorDesc')}</Text>
                {selectedTargetType === 'nfaa_indoor' && (
                  <View style={styles.targetCheckmark}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Bow Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('sessionSetup.selectBow')}</Text>
              <TouchableOpacity onPress={navigateToAddBow}>
                <Text style={styles.manageLink}>{t('sessionSetup.manageBows')}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.bowsGrid}>
              {bows.map((bow) => (
                <TouchableOpacity
                  key={bow.id}
                  style={[
                    styles.bowCard,
                    selectedBowId === bow.id && styles.bowCardSelected,
                  ]}
                  onPress={() => setSelectedBowId(bow.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.bowCardContent}>
                    <View style={[
                      styles.bowIconContainer,
                      selectedBowId === bow.id && styles.bowIconContainerSelected,
                    ]}>
                      {renderBowIcon(bow.bow_type, selectedBowId === bow.id)}
                    </View>
                    <Text style={[
                      styles.bowName,
                      selectedBowId === bow.id && styles.bowNameSelected,
                    ]}>
                      {bow.name}
                    </Text>
                    <Text style={styles.bowType}>{bow.bow_type}</Text>
                    {bow.draw_weight && (
                      <Text style={styles.bowSpec}>{bow.draw_weight} lbs</Text>
                    )}
                  </View>
                  {selectedBowId === bow.id && (
                    <View style={styles.checkmarkBadge}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distance Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sessionSetup.shootingDistance')}</Text>
            
            <View style={styles.distanceInputContainer}>
              <TextInput
                style={styles.distanceInput}
                value={distance}
                onChangeText={setDistance}
                placeholder={t('sessionSetup.distancePlaceholder')}
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
              
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    distanceUnit === 'm' && styles.unitButtonActive,
                  ]}
                  onPress={() => setDistanceUnit('m')}
                >
                  <Text style={[
                    styles.unitButtonText,
                    distanceUnit === 'm' && styles.unitButtonTextActive,
                  ]}>
                    m
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    distanceUnit === 'yd' && styles.unitButtonActive,
                  ]}
                  onPress={() => setDistanceUnit('yd')}
                >
                  <Text style={[
                    styles.unitButtonText,
                    distanceUnit === 'yd' && styles.unitButtonTextActive,
                  ]}>
                    yd
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick distance buttons */}
            <View style={styles.quickDistances}>
              {['10', '18', '30', '50', '70'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.quickDistanceButton,
                    distance === d && styles.quickDistanceButtonActive,
                  ]}
                  onPress={() => setDistance(d)}
                >
                  <Text style={[
                    styles.quickDistanceText,
                    distance === d && styles.quickDistanceTextActive,
                  ]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Start Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.startButton,
              (!selectedBowId || !distance) && styles.startButtonDisabled,
            ]}
            onPress={handleStartSession}
            disabled={!selectedBowId || !distance}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.startButtonText}>{t('sessionSetup.startSession')}</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  addBowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addBowButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  manageLink: {
    fontSize: 14,
    color: '#8B0000',
    fontWeight: '600',
  },
  bowsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bowCard: {
    width: '47%',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#222',
    position: 'relative',
  },
  bowCardSelected: {
    borderColor: '#8B0000',
    backgroundColor: '#1a0505',
  },
  bowCardContent: {
    alignItems: 'center',
  },
  bowIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bowIconContainerSelected: {
    backgroundColor: '#8B0000',
  },
  bowIconImage: {
    width: 36,
    height: 36,
  },
  bowIconImageSelected: {
    tintColor: '#fff',
  },
  bowName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  bowNameSelected: {
    color: '#fff',
  },
  bowType: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  bowSpec: {
    fontSize: 12,
    color: '#666',
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  unitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  unitButtonActive: {
    backgroundColor: '#8B0000',
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  quickDistances: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickDistanceButton: {
    flex: 1,
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  quickDistanceButtonActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  quickDistanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  quickDistanceTextActive: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Target Type Selector Styles
  targetTypesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  targetTypeCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222',
    position: 'relative',
  },
  targetTypeCardSelected: {
    borderColor: '#8B0000',
    backgroundColor: '#1a0505',
  },
  targetPreview: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetRing: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  miniRing: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    borderWidth: 0.5,
    borderColor: '#333',
  },
  vegasTrianglePreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegasTopRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 3,
  },
  vegasBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniTargetVegas: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfaaVerticalPreview: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
  },
  targetTypeName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 2,
  },
  targetTypeNameSelected: {
    color: '#fff',
  },
  targetTypeDesc: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
  },
  targetCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
