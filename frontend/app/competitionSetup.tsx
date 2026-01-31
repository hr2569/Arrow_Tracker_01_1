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
  Platform,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { TARGET_CONFIGS } from '../store/appStore';
import { getBowIcon } from '../utils/bowIcons';
import { getBows, Bow } from '../utils/localStorage';
import { 
  createCompetition, 
  setActiveCompetition, 
  startCompetition 
} from '../utils/competitionStorage';
type TargetType = 'wa_standard' | 'vegas_3spot' | 'nfaa_indoor';

interface ParticipantEntry {
  id: string;
  name: string;
  bowId?: string;
  bowName?: string;
}

export default function CompetitionSetupScreen() {
  const router = useRouter();
  
  const [bows, setBows] = useState<Bow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTargetType, setSelectedTargetType] = useState<TargetType>('wa_standard');
  const [distance, setDistance] = useState('18');
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'yd'>('m');
  const [competitionName, setCompetitionName] = useState('');
  const [participants, setParticipants] = useState<ParticipantEntry[]>([]);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantBowId, setNewParticipantBowId] = useState<string | null>(null);

  const fetchBows = async () => {
    try {
      setLoading(true);
      const data = await getBows();
      setBows(data);
      
      // Check network status for multi-device mode
      const status = await checkNetworkStatus();
      setNetworkStatus(status);
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

  const addParticipant = () => {
    if (!newParticipantName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the participant.');
      return;
    }

    const bow = bows.find(b => b.id === newParticipantBowId);
    
    const newParticipant: ParticipantEntry = {
      id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newParticipantName.trim(),
      bowId: newParticipantBowId || undefined,
      bowName: bow?.name,
    };

    setParticipants([...participants, newParticipant]);
    setNewParticipantName('');
    setNewParticipantBowId(null);
    setShowAddParticipant(false);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleStartCompetition = async () => {
    if (participants.length === 0) {
      Alert.alert('No Participants', 'Please add at least one participant.');
      return;
    }

    if (!distance.trim()) {
      Alert.alert('Enter Distance', 'Please enter the shooting distance.');
      return;
    }

    if (mode === 'multi_device' && (!networkStatus?.isWifi || !networkStatus?.ipAddress)) {
      Alert.alert(
        'WiFi Required',
        'Multi-device mode requires all devices to be on the same WiFi network. Please connect to WiFi or use Pass & Play mode.',
        [
          { text: 'Use Pass & Play', onPress: () => setMode('pass_and_play') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    try {
      const competition = await createCompetition({
        name: competitionName || `Competition ${new Date().toLocaleDateString()}`,
        targetType: selectedTargetType,
        distance: `${distance}${distanceUnit}`,
        mode,
        participants: participants.map(p => ({
          name: p.name,
          bowId: p.bowId,
          bowName: p.bowName,
        })),
      });

      await setActiveCompetition(competition.id);
      await startCompetition(competition.id);

      router.push('/competitionScoring');
    } catch (error) {
      console.error('Error creating competition:', error);
      Alert.alert('Error', 'Failed to create competition. Please try again.');
    }
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
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Competition</Text>
            <View style={styles.headerBadge}>
              <Ionicons name="trophy" size={14} color="#FFD700" />
              <Text style={styles.headerBadgeText}>10 Rounds × 3 Arrows</Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Competition Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Competition Name (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={competitionName}
              onChangeText={setCompetitionName}
              placeholder="e.g., Club Championship 2025"
              placeholderTextColor="#666"
            />
          </View>

          {/* Mode Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Competition Mode</Text>
            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[styles.modeCard, mode === 'pass_and_play' && styles.modeCardSelected]}
                onPress={() => setMode('pass_and_play')}
              >
                <Ionicons 
                  name="people" 
                  size={32} 
                  color={mode === 'pass_and_play' ? '#FFD700' : '#666'} 
                />
                <Text style={[styles.modeTitle, mode === 'pass_and_play' && styles.modeTitleSelected]}>
                  Pass & Play
                </Text>
                <Text style={styles.modeDesc}>Single device, take turns</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeCard, mode === 'multi_device' && styles.modeCardSelected]}
                onPress={() => setMode('multi_device')}
              >
                <Ionicons 
                  name="wifi" 
                  size={32} 
                  color={mode === 'multi_device' ? '#FFD700' : '#666'} 
                />
                <Text style={[styles.modeTitle, mode === 'multi_device' && styles.modeTitleSelected]}>
                  Multi-Device
                </Text>
                <Text style={styles.modeDesc}>WiFi/Bluetooth sync</Text>
                {networkStatus?.isWifi && (
                  <View style={styles.wifiIndicator}>
                    <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                    <Text style={styles.wifiText}>WiFi Connected</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Target Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Target Face</Text>
            <View style={styles.targetTypesGrid}>
              {/* WA Standard */}
              <TouchableOpacity
                style={[
                  styles.targetTypeCard,
                  selectedTargetType === 'wa_standard' && styles.targetTypeCardSelected,
                ]}
                onPress={() => setSelectedTargetType('wa_standard')}
              >
                <View style={styles.targetPreview}>
                  <View style={[styles.targetRing, { backgroundColor: '#f5f5f0', width: 40, height: 40 }]}>
                    <View style={[styles.targetRing, { backgroundColor: '#2a2a2a', width: 32, height: 32 }]}>
                      <View style={[styles.targetRing, { backgroundColor: '#00a2e8', width: 24, height: 24 }]}>
                        <View style={[styles.targetRing, { backgroundColor: '#ed1c24', width: 16, height: 16 }]}>
                          <View style={[styles.targetRing, { backgroundColor: '#fff200', width: 8, height: 8 }]} />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
                <Text style={[styles.targetTypeName, selectedTargetType === 'wa_standard' && styles.targetTypeNameSelected]}>
                  WA Standard
                </Text>
                {selectedTargetType === 'wa_standard' && (
                  <View style={styles.targetCheckmark}>
                    <Ionicons name="checkmark" size={12} color="#000" />
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
              >
                <View style={styles.targetPreview}>
                  <View style={styles.vegasPreviewContainer}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[styles.miniRing, { backgroundColor: '#00a2e8', width: 12, height: 12 }]}>
                        <View style={[styles.miniRing, { backgroundColor: '#ed1c24', width: 8, height: 8 }]}>
                          <View style={[styles.miniRing, { backgroundColor: '#fff200', width: 4, height: 4 }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={[styles.targetTypeName, selectedTargetType === 'vegas_3spot' && styles.targetTypeNameSelected]}>
                  Vegas 3-Spot
                </Text>
                {selectedTargetType === 'vegas_3spot' && (
                  <View style={styles.targetCheckmark}>
                    <Ionicons name="checkmark" size={12} color="#000" />
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
              >
                <View style={styles.targetPreview}>
                  <View style={styles.nfaaPreviewContainer}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[styles.miniRing, { backgroundColor: '#00a2e8', width: 12, height: 12 }]}>
                        <View style={[styles.miniRing, { backgroundColor: '#ed1c24', width: 8, height: 8 }]}>
                          <View style={[styles.miniRing, { backgroundColor: '#fff200', width: 4, height: 4 }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={[styles.targetTypeName, selectedTargetType === 'nfaa_indoor' && styles.targetTypeNameSelected]}>
                  NFAA Indoor
                </Text>
                {selectedTargetType === 'nfaa_indoor' && (
                  <View style={styles.targetCheckmark}>
                    <Ionicons name="checkmark" size={12} color="#000" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Distance Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shooting Distance</Text>
            
            <View style={styles.distanceInputContainer}>
              <TextInput
                style={styles.distanceInput}
                value={distance}
                onChangeText={setDistance}
                placeholder="Enter distance"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
              
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[styles.unitButton, distanceUnit === 'm' && styles.unitButtonActive]}
                  onPress={() => setDistanceUnit('m')}
                >
                  <Text style={[styles.unitButtonText, distanceUnit === 'm' && styles.unitButtonTextActive]}>
                    m
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, distanceUnit === 'yd' && styles.unitButtonActive]}
                  onPress={() => setDistanceUnit('yd')}
                >
                  <Text style={[styles.unitButtonText, distanceUnit === 'yd' && styles.unitButtonTextActive]}>
                    yd
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Participants Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowAddParticipant(true)}
              >
                <Ionicons name="add" size={20} color="#FFD700" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {participants.length === 0 ? (
              <View style={styles.emptyParticipants}>
                <Ionicons name="people-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>No participants added yet</Text>
                <Text style={styles.emptySubtext}>Tap "Add" to add participants</Text>
              </View>
            ) : (
              <View style={styles.participantsList}>
                {participants.map((participant, index) => (
                  <View key={participant.id} style={styles.participantCard}>
                    <View style={styles.participantRank}>
                      <Text style={styles.participantRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{participant.name}</Text>
                      {participant.bowName && (
                        <Text style={styles.participantBow}>
                          <Ionicons name="arrow-forward-outline" size={12} color="#666" /> {participant.bowName}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeParticipant(participant.id)}
                    >
                      <Ionicons name="close" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Start Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.startButton,
              participants.length === 0 && styles.startButtonDisabled,
            ]}
            onPress={handleStartCompetition}
            disabled={participants.length === 0}
          >
            <Ionicons name="trophy" size={24} color="#000" />
            <Text style={styles.startButtonText}>Start Competition</Text>
          </TouchableOpacity>
        </View>

        {/* Add Participant Modal */}
        <Modal visible={showAddParticipant} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Participant</Text>
                <TouchableOpacity onPress={() => setShowAddParticipant(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newParticipantName}
                  onChangeText={setNewParticipantName}
                  placeholder="Enter participant name"
                  placeholderTextColor="#666"
                  autoFocus
                />

                <Text style={styles.inputLabel}>Select Bow (Optional)</Text>
                {bows.length === 0 ? (
                  <View style={styles.noBowsMessage}>
                    <Text style={styles.noBowsText}>No bows available</Text>
                    <TouchableOpacity onPress={() => {
                      setShowAddParticipant(false);
                      router.push('/bows');
                    }}>
                      <Text style={styles.addBowLink}>Add bows first</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bowsScroll}>
                    <View style={styles.bowsRow}>
                      <TouchableOpacity
                        style={[styles.bowOption, !newParticipantBowId && styles.bowOptionSelected]}
                        onPress={() => setNewParticipantBowId(null)}
                      >
                        <Ionicons name="close-circle-outline" size={24} color={!newParticipantBowId ? '#FFD700' : '#666'} />
                        <Text style={[styles.bowOptionText, !newParticipantBowId && styles.bowOptionTextSelected]}>
                          None
                        </Text>
                      </TouchableOpacity>
                      {bows.map((bow) => (
                        <TouchableOpacity
                          key={bow.id}
                          style={[styles.bowOption, newParticipantBowId === bow.id && styles.bowOptionSelected]}
                          onPress={() => setNewParticipantBowId(bow.id)}
                        >
                          {renderBowIcon(bow.bow_type, newParticipantBowId === bow.id)}
                          <Text style={[styles.bowOptionText, newParticipantBowId === bow.id && styles.bowOptionTextSelected]}>
                            {bow.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                style={[styles.modalButton, !newParticipantName.trim() && styles.modalButtonDisabled]}
                onPress={addParticipant}
                disabled={!newParticipantName.trim()}
              >
                <Ionicons name="person-add" size={20} color="#000" />
                <Text style={styles.modalButtonText}>Add Participant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  headerBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
    fontSize: 16,
    fontWeight: 'bold',
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
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222',
  },
  modeCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#1a1500',
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 8,
  },
  modeTitleSelected: {
    color: '#FFD700',
  },
  modeDesc: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
  wifiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  wifiText: {
    fontSize: 10,
    color: '#4CAF50',
  },
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
    borderColor: '#FFD700',
    backgroundColor: '#1a1500',
  },
  targetPreview: {
    width: 48,
    height: 48,
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
  vegasPreviewContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  nfaaPreviewContainer: {
    flexDirection: 'column',
    gap: 3,
  },
  targetTypeName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    textAlign: 'center',
  },
  targetTypeNameSelected: {
    color: '#FFD700',
  },
  targetCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#FFD700',
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  unitButtonTextActive: {
    color: '#000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 4,
  },
  addButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyParticipants: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    marginTop: 4,
  },
  participantsList: {
    gap: 8,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  participantRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantRankText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  participantBow: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
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
    backgroundColor: '#FFD700',
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
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  noBowsMessage: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  noBowsText: {
    color: '#666',
    fontSize: 14,
  },
  addBowLink: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  bowsScroll: {
    maxHeight: 100,
  },
  bowsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  bowOption: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
    borderWidth: 2,
    borderColor: '#222',
  },
  bowOptionSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#1a1500',
  },
  bowOptionText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  bowOptionTextSelected: {
    color: '#FFD700',
  },
  bowIconImage: {
    width: 24,
    height: 24,
  },
  bowIconImageSelected: {
    tintColor: '#FFD700',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
