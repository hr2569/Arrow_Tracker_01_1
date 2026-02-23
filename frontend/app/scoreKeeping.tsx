import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { loadSavedLanguage } from '../i18n';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { getSessions, Session } from '../utils/localStorage';

interface ImportedScore {
  id: string;
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

interface RankingEntry {
  name: string;
  bowType: string;
  totalScore: number;
  source: 'app' | 'imported';
  date: string;
}

export default function ScoreKeepingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [importedScores, setImportedScores] = useState<ImportedScore[]>([]);
  const [competitionSessions, setCompetitionSessions] = useState<Session[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  // Parse CSV content into competition data
  const parseCSV = async (content: string): Promise<ImportedScore | null> => {
    try {
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header and one data row');
      }

      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const data: ImportedScore = {
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        archerName: '',
        bowType: '',
        distance: '',
        rounds: [],
        totalScore: 0,
        date: new Date().toISOString(),
      };

      // Check for archer_name in header
      const archerNameIdx = header.indexOf('archer_name') !== -1 ? header.indexOf('archer_name') : header.indexOf('name');
      const bowTypeIdx = header.indexOf('bow_type') !== -1 ? header.indexOf('bow_type') : header.indexOf('bow');
      const distanceIdx = header.indexOf('distance');
      const roundIdx = header.indexOf('round');
      const scoreIdx = header.indexOf('score') !== -1 ? header.indexOf('score') : header.indexOf('total');

      // Simple format: name, bow_type, score
      if (archerNameIdx !== -1 && (scoreIdx !== -1 || header.length >= 3)) {
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 2) continue;
          
          const name = archerNameIdx !== -1 ? values[archerNameIdx] : values[0];
          const bowType = bowTypeIdx !== -1 ? values[bowTypeIdx] : (values[1] || '');
          const score = scoreIdx !== -1 ? parseInt(values[scoreIdx]) : parseInt(values[values.length - 1]) || 0;
          
          // Each row is a separate archer
          if (i === 1 || name !== data.archerName) {
            if (data.archerName && data.totalScore > 0) {
              // Save previous archer and start new one
              const newEntry: ImportedScore = {
                id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                archerName: name,
                bowType: bowType,
                distance: distanceIdx !== -1 ? values[distanceIdx] : '',
                rounds: [{ roundNumber: 1, scores: [score], total: score }],
                totalScore: score,
                date: new Date().toISOString(),
              };
              return newEntry;
            }
            data.archerName = name;
            data.bowType = bowType;
            data.distance = distanceIdx !== -1 ? values[distanceIdx] : '';
          }
          
          data.totalScore = score;
          data.rounds = [{ roundNumber: 1, scores: [score], total: score }];
        }
      }

      return data.archerName ? data : null;
    } catch (error) {
      console.error('CSV parsing error:', error);
      return null;
    }
  };

  // Parse PDF content - extract text and try to find score data
  const parsePDFContent = async (content: string): Promise<ImportedScore[]> => {
    try {
      // PDF files read as binary, so we'll look for patterns in raw content
      // This is a basic extraction - complex PDFs may need server-side processing
      
      // Try to extract text patterns like "Name: John, Score: 285" or tabular data
      const results: ImportedScore[] = [];
      
      // Common patterns in archery score sheets
      // Pattern 1: "Name,BowType,Score" or similar CSV-like content embedded in PDF
      const csvPattern = /([A-Za-z\s]+)[,\t]+(recurve|compound|barebow|longbow|traditional)?[,\t]*(\d{1,3})/gi;
      let match;
      while ((match = csvPattern.exec(content)) !== null) {
        const name = match[1].trim();
        const bowType = match[2] || '';
        const score = parseInt(match[3]);
        if (name.length > 1 && name.length < 50 && score > 0 && score <= 360) {
          results.push({
            id: `pdf-${Date.now()}-${results.length}-${Math.random().toString(36).substr(2, 5)}`,
            archerName: name,
            bowType: bowType,
            distance: '',
            rounds: [{ roundNumber: 1, scores: [score], total: score }],
            totalScore: score,
            date: new Date().toISOString(),
          });
        }
      }
      
      // Pattern 2: Look for "Archer: X Score: Y" patterns
      const namedPattern = /(?:archer|name|player)[\s:]+([A-Za-z\s]+?)[\s,]+(?:score|total|points)[\s:]+(\d{1,3})/gi;
      while ((match = namedPattern.exec(content)) !== null) {
        const name = match[1].trim();
        const score = parseInt(match[2]);
        if (name.length > 1 && !results.some(r => r.archerName === name)) {
          results.push({
            id: `pdf-${Date.now()}-${results.length}-${Math.random().toString(36).substr(2, 5)}`,
            archerName: name,
            bowType: '',
            distance: '',
            rounds: [{ roundNumber: 1, scores: [score], total: score }],
            totalScore: score,
            date: new Date().toISOString(),
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('PDF parsing error:', error);
      return [];
    }
  };

  // Parse multi-archer CSV
  const parseMultiArcherCSV = async (content: string): Promise<ImportedScore[]> => {
    try {
      const lines = content.trim().split('\n');
      if (lines.length < 2) return [];

      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const results: ImportedScore[] = [];

      const nameIdx = header.findIndex(h => h.includes('name') || h.includes('archer'));
      const bowIdx = header.findIndex(h => h.includes('bow'));
      const scoreIdx = header.findIndex(h => h.includes('score') || h.includes('total') || h.includes('points'));

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue;

        const name = nameIdx !== -1 ? values[nameIdx] : values[0];
        const bowType = bowIdx !== -1 ? values[bowIdx] : '';
        const score = scoreIdx !== -1 ? parseInt(values[scoreIdx]) : parseInt(values[values.length - 1]) || 0;

        if (name && !isNaN(score)) {
          results.push({
            id: `imported-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            archerName: name,
            bowType: bowType,
            distance: '',
            rounds: [{ roundNumber: 1, scores: [score], total: score }],
            totalScore: score,
            date: new Date().toISOString(),
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Multi-archer CSV parsing error:', error);
      return [];
    }
  };

  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'text/comma-separated-values', 'application/pdf', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setIsLoading(true);
      const file = result.assets[0];
      const fileName = file.name.toLowerCase();
      
      // Check supported formats
      const isPDF = fileName.endsWith('.pdf');
      const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.txt');
      
      if (!isPDF && !isCSV) {
        Alert.alert(
          t('scoreKeeping.unsupportedFormat'),
          t('scoreKeeping.supportedFormatsDetail')
        );
        setIsLoading(false);
        return;
      }

      let importedData: ImportedScore[] = [];
      
      if (isPDF) {
        // Read PDF and attempt to extract text patterns
        try {
          const content = await FileSystem.readAsStringAsync(file.uri);
          importedData = await parsePDFContent(content);
          
          if (importedData.length === 0) {
            // PDF couldn't be parsed automatically
            Alert.alert(
              t('scoreKeeping.pdfParsingLimited'),
              t('scoreKeeping.pdfParsingHelp')
            );
            setIsLoading(false);
            return;
          }
        } catch (pdfError) {
          console.error('PDF read error:', pdfError);
          Alert.alert(
            t('scoreKeeping.pdfParsingLimited'),
            t('scoreKeeping.pdfParsingHelp')
          );
          setIsLoading(false);
          return;
        }
      } else {
        // CSV/TXT processing
        const content = await FileSystem.readAsStringAsync(file.uri);
        importedData = await parseMultiArcherCSV(content);
      }
      
      if (importedData.length > 0) {
        setImportedScores(prev => [...prev, ...importedData]);
        Alert.alert(
          t('scoreKeeping.importSuccess'),
          t('scoreKeeping.importedArchers', { count: importedData.length })
        );
      } else {
        Alert.alert(
          t('scoreKeeping.importError'),
          t('scoreKeeping.invalidFormat')
        );
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Import error:', error);
      setIsLoading(false);
      Alert.alert(t('common.error'), t('scoreKeeping.importError'));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Build rankings from selected items
  const rankings = useMemo(() => {
    const entries: RankingEntry[] = [];

    // Add selected competition sessions
    competitionSessions.forEach(session => {
      if (selectedItems.has(session.id)) {
        entries.push({
          name: session.archer_name || session.name || 'Unknown',
          bowType: session.competition_bow_type || '',
          totalScore: session.total_score || 0,
          source: 'app',
          date: session.created_at,
        });
      }
    });

    // Add selected imported scores
    importedScores.forEach(score => {
      if (selectedItems.has(score.id)) {
        entries.push({
          name: score.archerName,
          bowType: score.bowType,
          totalScore: score.totalScore,
          source: 'imported',
          date: score.date,
        });
      }
    });

    // Group by bow type, then sort by score
    const grouped: { [key: string]: RankingEntry[] } = {};
    entries.forEach(entry => {
      const key = entry.bowType || 'Other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    // Sort each group by score (highest first)
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => b.totalScore - a.totalScore);
    });

    return grouped;
  }, [selectedItems, competitionSessions, importedScores]);

  const totalSelected = selectedItems.size;

  const generateRankingsPDF = async () => {
    const bowTypes = Object.keys(rankings).sort();
    
    let rankingsHtml = '';
    bowTypes.forEach(bowType => {
      const entries = rankings[bowType];
      rankingsHtml += `
        <div class="bow-section">
          <h2 class="bow-type">${bowType}</h2>
          <table>
            <thead>
              <tr>
                <th>${t('scoreKeeping.rank')}</th>
                <th>${t('scoreKeeping.archerName')}</th>
                <th>${t('scoreKeeping.score')}</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map((entry, idx) => `
                <tr class="${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}">
                  <td class="rank">${idx + 1}</td>
                  <td>${entry.name}</td>
                  <td class="score">${entry.totalScore}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #8B0000; margin-bottom: 30px; }
            .bow-section { margin-bottom: 30px; page-break-inside: avoid; }
            .bow-type { background: #333; color: #FFD700; padding: 10px 15px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #333; }
            td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
            .rank { font-weight: bold; width: 50px; }
            .score { font-weight: bold; color: #8B0000; }
            .gold td { background: rgba(255, 215, 0, 0.2); }
            .silver td { background: rgba(192, 192, 192, 0.2); }
            .bronze td { background: rgba(205, 127, 50, 0.2); }
            .footer { text-align: center; margin-top: 40px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${t('scoreKeeping.competitionRankings')}</h1>
          ${rankingsHtml}
          <div class="footer">
            <p>Generated by Arrow Tracker - ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: t('scoreKeeping.shareRankings'),
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert(t('common.error'), t('scoreKeeping.pdfError'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const removeImported = (id: string) => {
    setImportedScores(prev => prev.filter(s => s.id !== id));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="document-text" size={28} color="#4CAF50" />
          <Text style={styles.headerTitle}>{t('scoreKeeping.title')}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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

        {/* Imported Scores */}
        {importedScores.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('scoreKeeping.importedScores')} ({importedScores.length})</Text>
            <View style={styles.list}>
              {importedScores.map(score => {
                const isSelected = selectedItems.has(score.id);
                return (
                  <TouchableOpacity
                    key={score.id}
                    style={[styles.card, isSelected && styles.cardSelected]}
                    onPress={() => toggleSelection(score.id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Icon name="checkmark" size={16} color="#fff" />}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{score.archerName}</Text>
                      <Text style={styles.cardDetails}>
                        {score.bowType || t('scoreKeeping.noBowType')} • {t('scoreKeeping.imported')}
                      </Text>
                    </View>
                    <View style={styles.cardScore}>
                      <Text style={styles.cardScoreValue}>{score.totalScore}</Text>
                      <Text style={styles.cardScoreLabel}>{t('scoreKeeping.pts')}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeImported(score.id)}
                    >
                      <Icon name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Competition Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('scoreKeeping.competitionSessions')} ({competitionSessions.length})</Text>
          {competitionSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="trophy-outline" size={48} color="#444" />
              <Text style={styles.emptyStateText}>{t('scoreKeeping.noCompetitions')}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {competitionSessions.map(session => {
                const isSelected = selectedItems.has(session.id);
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.card, isSelected && styles.cardSelected]}
                    onPress={() => toggleSelection(session.id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Icon name="checkmark" size={16} color="#fff" />}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{session.archer_name || session.name}</Text>
                      <Text style={styles.cardDetails}>
                        {session.competition_bow_type || ''} • {session.distance} • {formatDate(session.created_at)}
                      </Text>
                    </View>
                    <View style={styles.cardScore}>
                      <Text style={styles.cardScoreValue}>{session.total_score}</Text>
                      <Text style={styles.cardScoreLabel}>{t('scoreKeeping.pts')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Generate Rankings Button */}
        {(competitionSessions.length > 0 || importedScores.length > 0) && (
          <TouchableOpacity
            style={[styles.generateButton, totalSelected < 1 && styles.generateButtonDisabled]}
            onPress={generateRankingsPDF}
            disabled={totalSelected < 1 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Icon name="document-text" size={24} color={totalSelected < 1 ? '#666' : '#000'} />
            )}
            <Text style={[styles.generateButtonText, totalSelected < 1 && styles.generateButtonTextDisabled]}>
              {t('scoreKeeping.generateRankingsPDF')} ({totalSelected})
            </Text>
          </TouchableOpacity>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information-circle" size={20} color="#4CAF50" />
          <Text style={styles.infoText}>{t('scoreKeeping.infoText')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: { padding: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  importButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  importButtonText: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 12 },
  importButtonSubtext: { fontSize: 13, color: '#666', marginTop: 4 },
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardSelected: { backgroundColor: 'rgba(76, 175, 80, 0.15)', borderColor: '#4CAF50' },
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
  checkboxSelected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cardDetails: { fontSize: 13, color: '#888', marginTop: 2 },
  cardScore: { alignItems: 'flex-end', marginRight: 8 },
  cardScoreValue: { fontSize: 20, fontWeight: 'bold', color: '#FFD700' },
  cardScoreLabel: { fontSize: 12, color: '#888' },
  deleteButton: { padding: 4 },
  emptyState: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 16 },
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
  generateButtonDisabled: { backgroundColor: '#222' },
  generateButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  generateButtonTextDisabled: { color: '#666' },
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
  infoText: { flex: 1, color: '#ccc', fontSize: 14, lineHeight: 20 },
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalContent: { flex: 1, padding: 16 },
  rankingSection: { marginBottom: 24 },
  bowTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  bowTypeTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFD700' },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  rankingGold: { backgroundColor: 'rgba(255, 215, 0, 0.15)' },
  rankingSilver: { backgroundColor: 'rgba(192, 192, 192, 0.1)' },
  rankingBronze: { backgroundColor: 'rgba(205, 127, 50, 0.1)' },
  rankNumber: { fontSize: 18, fontWeight: 'bold', color: '#888', width: 40 },
  rankName: { flex: 1, fontSize: 16, color: '#fff' },
  rankScore: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
});
