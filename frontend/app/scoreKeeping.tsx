import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { loadSavedLanguage } from '../i18n';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getSessions, Session } from '../utils/localStorage';

interface ImportedScore {
  archerName: string;
  bowType: string;
  distance: string;
  rounds: Array<{
    roundNumber: number;
    scores: number[];
    total: number;
  }>;
  totalScore: number;
  date: string;
}

export default function ScoreKeepingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [importedFiles, setImportedFiles] = useState<ImportedScore[]>([]);
  const [competitionSessions, setCompetitionSessions] = useState<Session[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadSavedLanguage();
      loadCompetitionSessions();
    }, [])
  );

  const loadCompetitionSessions = async () => {
    try {
      const sessions = await getSessions();
      const competitions = sessions.filter(s => s.session_type === 'competition');
      setCompetitionSessions(competitions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setIsLoading(true);
      const file = result.assets[0];
      
      // For now, show a message that file was selected
      // In a full implementation, you would parse CSV/PDF here
      Alert.alert(
        t('scoreKeeping.fileSelected'),
        `${file.name}\n\n${t('scoreKeeping.parseNotImplemented')}`,
        [{ text: t('common.ok') }]
      );
      
      setIsLoading(false);
    } catch (error) {
      console.error('Import error:', error);
      setIsLoading(false);
      Alert.alert(t('common.error'), t('scoreKeeping.importError'));
    }
  };

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleGenerateCombinedReport = () => {
    if (selectedSessions.size < 2) {
      Alert.alert(
        t('scoreKeeping.selectMore'),
        t('scoreKeeping.selectMoreDesc')
      );
      return;
    }

    // Navigate to report with selected sessions
    const sessionIds = Array.from(selectedSessions).join(',');
    router.push(`/report?sessions=${sessionIds}&type=competition`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
        <View style={styles.headerContent}>
          <Icon name="document-text" size={28} color="#4CAF50" />
          <Text style={styles.headerTitle}>{t('scoreKeeping.title')}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('scoreKeeping.importFiles')}</Text>
          <TouchableOpacity
            style={styles.importButton}
            onPress={handleImportFile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#4CAF50" />
            ) : (
              <>
                <Icon name="cloud-upload" size={32} color="#4CAF50" />
                <Text style={styles.importButtonText}>{t('scoreKeeping.selectFile')}</Text>
                <Text style={styles.importButtonSubtext}>{t('scoreKeeping.supportedFormats')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Competition Sessions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('scoreKeeping.competitionSessions')}</Text>
            {selectedSessions.size > 0 && (
              <Text style={styles.selectedCount}>
                {selectedSessions.size} {t('scoreKeeping.selected')}
              </Text>
            )}
          </View>

          {competitionSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="trophy-outline" size={48} color="#444" />
              <Text style={styles.emptyStateText}>{t('scoreKeeping.noCompetitions')}</Text>
              <Text style={styles.emptyStateSubtext}>{t('scoreKeeping.noCompetitionsDesc')}</Text>
            </View>
          ) : (
            <View style={styles.sessionsList}>
              {competitionSessions.map((session) => {
                const isSelected = selectedSessions.has(session.id);
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}
                    onPress={() => toggleSessionSelection(session.id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Icon name="checkmark" size={16} color="#fff" />}
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName}>{session.archer_name || session.name}</Text>
                      <Text style={styles.sessionDetails}>
                        {session.competition_bow_type} • {session.distance} • {formatDate(session.created_at)}
                      </Text>
                    </View>
                    <View style={styles.sessionScore}>
                      <Text style={styles.sessionScoreValue}>{session.total_score}</Text>
                      <Text style={styles.sessionScoreLabel}>{t('scoreKeeping.pts')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Generate Combined Report Button */}
        {competitionSessions.length > 0 && (
          <TouchableOpacity
            style={[
              styles.generateButton,
              selectedSessions.size < 2 && styles.generateButtonDisabled
            ]}
            onPress={handleGenerateCombinedReport}
            disabled={selectedSessions.size < 2}
          >
            <Icon name="document-attach" size={24} color={selectedSessions.size < 2 ? '#666' : '#000'} />
            <Text style={[
              styles.generateButtonText,
              selectedSessions.size < 2 && styles.generateButtonTextDisabled
            ]}>
              {t('scoreKeeping.generateCombinedReport')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information-circle" size={20} color="#4CAF50" />
          <Text style={styles.infoText}>
            {t('scoreKeeping.infoText')}
          </Text>
        </View>
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
  section: {
    marginBottom: 24,
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
    marginBottom: 12,
  },
  selectedCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  importButtonSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#444',
    marginTop: 8,
    textAlign: 'center',
  },
  sessionsList: {
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  sessionCardSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: '#4CAF50',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sessionDetails: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  sessionScore: {
    alignItems: 'flex-end',
  },
  sessionScoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  sessionScoreLabel: {
    fontSize: 12,
    color: '#888',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
    gap: 10,
    marginBottom: 24,
  },
  generateButtonDisabled: {
    backgroundColor: '#222',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  generateButtonTextDisabled: {
    color: '#666',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  infoText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});
