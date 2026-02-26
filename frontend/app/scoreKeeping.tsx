import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getSessions, Session } from '../utils/localStorage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import Constants from 'expo-constants';

interface ManualEntry {
  id: string;
  archerName: string;
  bowType: string;
  totalScore: number;
  date: string;
  distance?: string;
  source: 'manual' | 'imported';
}

interface RankingEntry {
  name: string;
  bowType: string;
  totalScore: number;
  source: 'app' | 'manual' | 'imported';
  date: string;
}

// Get API URL from environment
const getApiUrl = () => {
  return Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
         process.env.EXPO_PUBLIC_BACKEND_URL || 
         'https://7xrzp9wp-preview.emergentagent.com';
};

const BOW_TYPES = ['Recurve', 'Compound', 'Barebow', 'Traditional', 'Longbow'];

export default function ScoreKeepingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  // State
  const [competitionSessions, setCompetitionSessions] = useState<Session[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [selectedManualEntries, setSelectedManualEntries] = useState<Set<string>>(new Set());
  const [showRankings, setShowRankings] = useState(false);
  const [selectedBowFilter, setSelectedBowFilter] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Manual entry modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newArcherName, setNewArcherName] = useState('');
  const [newBowType, setNewBowType] = useState('Recurve');
  const [newScore, setNewScore] = useState('');

  // Load competition sessions
  useFocusEffect(
    useCallback(() => {
      const loadSessions = async () => {
        try {
          const sessions = await getSessions();
          const competitions = sessions.filter(s => s.session_type === 'competition');
          setCompetitionSessions(competitions);
        } catch (error) {
          console.error('Error loading sessions:', error);
        }
      };
      loadSessions();
    }, [])
  );

  // Toggle session selection
  const toggleSessionSelection = (sessionId: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  // Toggle manual entry selection
  const toggleManualEntrySelection = (entryId: string) => {
    const newSelected = new Set(selectedManualEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedManualEntries(newSelected);
  };

  // Add manual entry
  const handleAddManualEntry = () => {
    if (!newArcherName.trim()) {
      Alert.alert(t('common.error'), t('competitionSetup.archerNameRequired'));
      return;
    }
    
    const score = parseInt(newScore);
    if (isNaN(score) || score <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid score');
      return;
    }

    const newEntry: ManualEntry = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      archerName: newArcherName.trim(),
      bowType: newBowType,
      totalScore: score,
      date: new Date().toLocaleDateString(),
      source: 'manual',
    };

    setManualEntries(prev => [...prev, newEntry]);
    setNewArcherName('');
    setNewScore('');
    setShowAddModal(false);
  };

  // Import PDFs and extract QR codes
  const handleImportPDFs = async () => {
    try {
      // Pick multiple PDF files
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsImporting(true);
      
      // Read all PDFs and convert to base64
      const pdfsBase64: string[] = [];
      for (const asset of result.assets) {
        try {
          const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          pdfsBase64.push(fileContent);
        } catch (readError) {
          console.error('Error reading PDF:', readError);
        }
      }

      if (pdfsBase64.length === 0) {
        Alert.alert(t('common.error'), 'Could not read any PDF files');
        setIsImporting(false);
        return;
      }

      // Send to backend for QR extraction
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/api/extract-qr`, {
        pdfs_base64: pdfsBase64,
      }, {
        timeout: 60000, // 60 second timeout for processing
      });

      if (response.data.success && response.data.sessions.length > 0) {
        // Convert extracted sessions to manual entries
        const importedEntries: ManualEntry[] = response.data.sessions.map((session: any) => ({
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          archerName: session.name,
          bowType: session.bowType,
          totalScore: session.score,
          date: session.date,
          distance: session.distance,
          source: 'imported' as const,
        }));

        setManualEntries(prev => [...prev, ...importedEntries]);
        
        Alert.alert(
          t('scoreKeeping.importSuccess', { defaultValue: 'Import Successful' }),
          t('scoreKeeping.importedArchers', { 
            defaultValue: `Imported ${importedEntries.length} archer(s) from ${response.data.total_qr_found} QR code(s)`,
            count: importedEntries.length,
            qrCount: response.data.total_qr_found
          })
        );
      } else if (response.data.total_qr_found === 0) {
        Alert.alert(
          t('scoreKeeping.noQRCodes', { defaultValue: 'No QR Codes Found' }),
          t('scoreKeeping.noQRCodesDesc', { defaultValue: 'No Arrow Tracker QR codes were found in the uploaded PDFs.' })
        );
      } else {
        Alert.alert(
          t('common.error'),
          response.data.error || 'Failed to extract QR codes'
        );
      }
    } catch (error: any) {
      console.error('Import error:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to import PDFs'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Delete manual entry
  const handleDeleteManualEntry = (entryId: string) => {
    Alert.alert(
      t('common.delete'),
      'Delete this entry?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: () => {
            setManualEntries(prev => prev.filter(e => e.id !== entryId));
            const newSelected = new Set(selectedManualEntries);
            newSelected.delete(entryId);
            setSelectedManualEntries(newSelected);
          }
        },
      ]
    );
  };

  // Generate rankings
  const generateRankings = (): RankingEntry[] => {
    const rankings: RankingEntry[] = [];

    // Add selected competition sessions
    competitionSessions
      .filter(s => selectedSessions.has(s.id))
      .forEach(session => {
        rankings.push({
          name: session.name || session.id.slice(0, 8),
          bowType: session.bow_name || 'Unknown',
          totalScore: session.total_score || 0,
          source: 'app',
          date: new Date(session.created_at).toLocaleDateString(),
        });
      });

    // Add selected manual entries
    manualEntries
      .filter(e => selectedManualEntries.has(e.id))
      .forEach(entry => {
        rankings.push({
          name: entry.archerName,
          bowType: entry.bowType,
          totalScore: entry.totalScore,
          source: 'manual',
          date: entry.date,
        });
      });

    // Filter by bow type if selected
    let filtered = rankings;
    if (selectedBowFilter) {
      filtered = rankings.filter(r => r.bowType === selectedBowFilter);
    }

    // Sort by score descending
    return filtered.sort((a, b) => b.totalScore - a.totalScore);
  };

  const rankings = generateRankings();
  const totalSelected = selectedSessions.size + selectedManualEntries.size;

  // Get unique bow types from rankings for filter
  const availableBowTypes = [...new Set([
    ...competitionSessions.filter(s => selectedSessions.has(s.id)).map(s => s.bow_name || 'Unknown'),
    ...manualEntries.filter(e => selectedManualEntries.has(e.id)).map(e => e.bowType),
  ])];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('scoreKeeping.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Import PDF Section */}
        <View style={styles.importSection}>
          <TouchableOpacity 
            style={[styles.importButton, isImporting && styles.importButtonDisabled]}
            onPress={handleImportPDFs}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="document-attach" size={22} color="#fff" />
            )}
            <Text style={styles.importButtonText}>
              {isImporting ? t('scoreKeeping.importing', { defaultValue: 'Importing...' }) : t('scoreKeeping.importPDF', { defaultValue: 'Import from PDF (QR Code)' })}
            </Text>
          </TouchableOpacity>
          <Text style={styles.importHint}>
            {t('scoreKeeping.importHint', { defaultValue: 'Select PDFs with Arrow Tracker QR codes' })}
          </Text>
        </View>

        {/* Manual Entry Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('scoreKeeping.entries', { defaultValue: 'Entries' })} ({manualEntries.length})</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Icon name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>{t('scoreKeeping.addArcher', { defaultValue: 'Add Archer' })}</Text>
            </TouchableOpacity>
          </View>

          {manualEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="person-add" size={40} color="#666" />
              <Text style={styles.emptyStateText}>{t('scoreKeeping.noEntries', { defaultValue: 'No entries yet' })}</Text>
              <Text style={styles.emptyStateSubtext}>{t('scoreKeeping.noEntriesDesc', { defaultValue: 'Import from PDF or add archers manually' })}</Text>
            </View>
          ) : (
            manualEntries.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={[
                  styles.entryItem,
                  selectedManualEntries.has(entry.id) && styles.entryItemSelected,
                ]}
                onPress={() => toggleManualEntrySelection(entry.id)}
                onLongPress={() => handleDeleteManualEntry(entry.id)}
              >
                <View style={styles.entryCheckbox}>
                  {selectedManualEntries.has(entry.id) && (
                    <Icon name="checkmark" size={16} color="#8B0000" />
                  )}
                </View>
                <View style={styles.entryInfo}>
                  <View style={styles.entryNameRow}>
                    <Text style={styles.entryName}>{entry.archerName}</Text>
                    {entry.source === 'imported' && (
                      <View style={styles.importedBadge}>
                        <Icon name="qr-code" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.entryDetails}>
                    {entry.bowType} • {entry.date}
                    {entry.distance ? ` • ${entry.distance}` : ''}
                  </Text>
                </View>
                <Text style={styles.entryScore}>{entry.totalScore} pts</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Competition Sessions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('scoreKeeping.competitionSessions')} ({competitionSessions.length})
          </Text>

          {competitionSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="trophy" size={40} color="#666" />
              <Text style={styles.emptyStateText}>{t('scoreKeeping.noCompetitions')}</Text>
              <Text style={styles.emptyStateSubtext}>{t('scoreKeeping.noCompetitionsDesc')}</Text>
            </View>
          ) : (
            competitionSessions.map(session => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.entryItem,
                  selectedSessions.has(session.id) && styles.entryItemSelected,
                ]}
                onPress={() => toggleSessionSelection(session.id)}
              >
                <View style={styles.entryCheckbox}>
                  {selectedSessions.has(session.id) && (
                    <Icon name="checkmark" size={16} color="#8B0000" />
                  )}
                </View>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryName}>{session.name || session.id.slice(0, 8)}</Text>
                  <Text style={styles.entryDetails}>
                    {session.bow_name || 'Unknown'} • {new Date(session.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.entryScore}>{session.total_score || 0} pts</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Rankings Section */}
        {totalSelected > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('scoreKeeping.rankings')} ({totalSelected} selected)</Text>
            </View>

            {/* Bow Type Filter */}
            {availableBowTypes.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedBowFilter && styles.filterChipActive]}
                  onPress={() => setSelectedBowFilter(null)}
                >
                  <Text style={[styles.filterChipText, !selectedBowFilter && styles.filterChipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                {availableBowTypes.map(bowType => (
                  <TouchableOpacity
                    key={bowType}
                    style={[styles.filterChip, selectedBowFilter === bowType && styles.filterChipActive]}
                    onPress={() => setSelectedBowFilter(bowType)}
                  >
                    <Text style={[styles.filterChipText, selectedBowFilter === bowType && styles.filterChipTextActive]}>
                      {bowType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Rankings Table */}
            <View style={styles.rankingsTable}>
              <View style={styles.rankingsHeader}>
                <Text style={[styles.rankingsHeaderText, styles.rankCol]}>#</Text>
                <Text style={[styles.rankingsHeaderText, styles.nameCol]}>Archer</Text>
                <Text style={[styles.rankingsHeaderText, styles.bowCol]}>Bow</Text>
                <Text style={[styles.rankingsHeaderText, styles.scoreCol]}>Score</Text>
              </View>
              {rankings.map((entry, index) => (
                <View key={`${entry.name}-${index}`} style={styles.rankingsRow}>
                  <Text style={[styles.rankingsCell, styles.rankCol, index < 3 && styles.topRank]}>
                    {index + 1}
                  </Text>
                  <Text style={[styles.rankingsCell, styles.nameCol]} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={[styles.rankingsCell, styles.bowCol]} numberOfLines={1}>
                    {entry.bowType}
                  </Text>
                  <Text style={[styles.rankingsCell, styles.scoreCol, styles.scoreText]}>
                    {entry.totalScore}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Archer Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Archer</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Archer Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newArcherName}
                onChangeText={setNewArcherName}
                placeholder="Enter name"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Bow Type</Text>
              <View style={styles.bowTypeGrid}>
                {BOW_TYPES.map(bow => (
                  <TouchableOpacity
                    key={bow}
                    style={[styles.bowTypeButton, newBowType === bow && styles.bowTypeButtonActive]}
                    onPress={() => setNewBowType(bow)}
                  >
                    <Text style={[styles.bowTypeText, newBowType === bow && styles.bowTypeTextActive]}>
                      {bow}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Total Score *</Text>
              <TextInput
                style={styles.textInput}
                value={newScore}
                onChangeText={setNewScore}
                placeholder="Enter score"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleAddManualEntry}>
                <Text style={styles.saveButtonText}>Add Archer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  importSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a5f1a',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  importHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#111',
    borderRadius: 12,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  entryItemSelected: {
    borderColor: '#8B0000',
    backgroundColor: '#1a0a0a',
  },
  entryCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  entryDetails: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  entryScore: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#222',
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#8B0000',
  },
  filterChipText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  rankingsTable: {
    backgroundColor: '#111',
    borderRadius: 10,
    overflow: 'hidden',
  },
  rankingsHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rankingsHeaderText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rankingsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  rankingsCell: {
    color: '#fff',
    fontSize: 14,
  },
  rankCol: {
    width: 30,
  },
  nameCol: {
    flex: 1,
  },
  bowCol: {
    width: 80,
  },
  scoreCol: {
    width: 50,
    textAlign: 'right',
  },
  topRank: {
    color: '#FFD700',
    fontWeight: '700',
  },
  scoreText: {
    fontWeight: '600',
    color: '#8B0000',
  },
  bottomPadding: {
    height: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  bowTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bowTypeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  bowTypeButtonActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  bowTypeText: {
    color: '#888',
    fontSize: 14,
  },
  bowTypeTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#8B0000',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
