import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Icon } from '../components/Icon';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as FileSystem from '../utils/fileSystemLegacy';
import { getCompetitions, Competition, deleteCompetition as deleteCompeteCompetition } from '../utils/competitionStorage';
import { TARGET_CONFIGS } from '../store/appStore';

const BOW_TYPES: { [key: string]: string } = {
  recurve: 'Recurve',
  compound: 'Compound',
  barebow: 'Barebow',
  longbow: 'Longbow',
  traditional: 'Traditional',
};

interface ManualArcher {
  id: string;
  name: string;
  bowType: string;
  rounds: number[][];
  totalScore: number;
  xCount: number;
}

interface ManualCompetition {
  id: string;
  name: string;
  date: string;
  archers: ManualArcher[];
  type: string;
}

// Unified competition type for display
interface DisplayCompetition {
  id: string;
  name: string;
  date: string;
  source: 'compete' | 'manual';
  archerCount: number;
  archerName?: string;
  bowName?: string;
  totalScore?: number;
  targetType?: string;
  distance?: string;
  // For manual competitions
  archers?: ManualArcher[];
  // For compete competitions
  originalData?: Competition;
}

const ROUNDS_COUNT = 10;
const ARROWS_PER_ROUND = 3;

export default function CompetitionHistory() {
  const router = useRouter();
  const { t } = useTranslation();
  const [competitions, setCompetitions] = useState<DisplayCompetition[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCompetitions = async () => {
    try {
      const allCompetitions: DisplayCompetition[] = [];

      // Load "Compete" competitions (single archer, from competitionStorage)
      const competeData = await getCompetitions();
      const completedCompete = competeData.filter(c => c.status === 'completed');
      completedCompete.forEach(comp => {
        const archer = comp.participants[0];
        allCompetitions.push({
          id: comp.id,
          name: comp.name,
          date: comp.completedAt || comp.createdAt,
          source: 'compete',
          archerCount: 1,
          archerName: archer?.name,
          bowName: archer?.bowName,
          totalScore: archer?.totalScore,
          targetType: comp.targetType,
          distance: comp.distance,
          originalData: comp,
        });
      });

      // Load "Manual" competitions (multiple archers)
      const manualData = await AsyncStorage.getItem('manualCompetitions');
      if (manualData) {
        const manualComps: ManualCompetition[] = JSON.parse(manualData);
        manualComps.forEach(comp => {
          allCompetitions.push({
            id: comp.id,
            name: comp.name,
            date: comp.date,
            source: 'manual',
            archerCount: comp.archers.length,
            archers: comp.archers,
          });
        });
      }

      // Sort by date (newest first)
      allCompetitions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setCompetitions(allCompetitions);
    } catch (error) {
      console.error('Error loading competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCompetitions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompetitions();
    setRefreshing(false);
  };

  const handleDeleteCompetition = (competition: DisplayCompetition) => {
    Alert.alert(
      t('competition.deleteCompetition'),
      t('competition.deleteCompetitionConfirm', { name: competition.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (competition.source === 'compete') {
                // Delete from competitionStorage
                await deleteCompeteCompetition(competition.id);
              } else {
                // Delete from manualCompetitions
                const data = await AsyncStorage.getItem('manualCompetitions');
                if (data) {
                  const manualComps = JSON.parse(data);
                  const updated = manualComps.filter((c: ManualCompetition) => c.id !== competition.id);
                  await AsyncStorage.setItem('manualCompetitions', JSON.stringify(updated));
                }
              }
              // Reload
              await loadCompetitions();
            } catch (error) {
              console.error('Error deleting competition:', error);
              Alert.alert(t('common.error'), t('competition.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const getPointValue = (score: number) => score === 11 ? 10 : score;

  const getRoundTotal = (round: number[]) => {
    return round.reduce((total, score) => total + (score !== null ? getPointValue(score) : 0), 0);
  };

  const getMedalEmoji = (place: number) => {
    if (place === 0) return '🥇';
    if (place === 1) return '🥈';
    if (place === 2) return '🥉';
    return '';
  };

  // Navigate to the competition summary for "compete" type
  const viewCompeteCompetition = (competition: DisplayCompetition) => {
    router.push(`/competitionSummary?id=${competition.id}`);
  };

  const regenerateManualPdf = async (competition: DisplayCompetition) => {
    if (!competition.archers) return;
    
    try {
      // Group archers by bow type
      const archersByBowType: { [key: string]: ManualArcher[] } = {};
      competition.archers.forEach(archer => {
        if (!archersByBowType[archer.bowType]) {
          archersByBowType[archer.bowType] = [];
        }
        archersByBowType[archer.bowType].push(archer);
      });

      // Sort each category by total score
      Object.keys(archersByBowType).forEach(bowType => {
        archersByBowType[bowType].sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return b.xCount - a.xCount;
        });
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${competition.name} - Results</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 30px;
              color: #333;
              max-width: 900px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #8B0000;
            }
            .header h1 {
              color: #8B0000;
              margin: 0 0 10px 0;
              font-size: 32px;
            }
            .header .date {
              color: #666;
              font-size: 16px;
            }
            .category {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            .category-header {
              background: #8B0000;
              color: #fff;
              padding: 12px 20px;
              font-size: 20px;
              font-weight: bold;
              border-radius: 8px 8px 0 0;
            }
            .results-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .results-table th {
              background: #333;
              color: #fff;
              padding: 10px 8px;
              text-align: center;
              font-size: 12px;
            }
            .results-table td {
              padding: 8px;
              text-align: center;
              border-bottom: 1px solid #ddd;
              font-size: 12px;
            }
            .results-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .place-cell {
              font-weight: bold;
              font-size: 16px;
            }
            .name-cell {
              text-align: left !important;
              font-weight: bold;
            }
            .total-cell {
              font-weight: bold;
              font-size: 16px;
            }
            .gold-row { background: rgba(255, 215, 0, 0.2) !important; }
            .silver-row { background: rgba(192, 192, 192, 0.3) !important; }
            .bronze-row { background: rgba(205, 127, 50, 0.2) !important; }
            .footer {
              text-align: center;
              color: #888;
              font-size: 12px;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏆 ${competition.name}</h1>
            <div class="date">${new Date(competition.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="date">${competition.archers.length} Archers • ${ROUNDS_COUNT} Rounds • ${ARROWS_PER_ROUND} Arrows/Round</div>
          </div>

          ${Object.entries(archersByBowType).map(([bowType, categoryArchers]) => `
            <div class="category">
              <div class="category-header">${BOW_TYPES[bowType] || bowType} Division (${categoryArchers.length} archers)</div>
              <table class="results-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">Place</th>
                    <th style="text-align: left;">Archer</th>
                    ${Array.from({ length: ROUNDS_COUNT }, (_, i) => `<th>R${i + 1}</th>`).join('')}
                    <th style="width: 60px;">Total</th>
                    <th style="width: 40px;">X's</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryArchers.map((archer, index) => {
                    const rowClass = index === 0 ? 'gold-row' : index === 1 ? 'silver-row' : index === 2 ? 'bronze-row' : '';
                    return `
                      <tr class="${rowClass}">
                        <td class="place-cell">${getMedalEmoji(index)} ${index + 1}</td>
                        <td class="name-cell">${archer.name}</td>
                        ${archer.rounds.map(round => `<td>${getRoundTotal(round)}</td>`).join('')}
                        <td class="total-cell">${archer.totalScore}</td>
                        <td>${archer.xCount}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}

          <div class="footer">
            Generated by Arrow Tracker • ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const fileName = `${competition.name.replace(/[^a-z0-9]/gi, '_')}_Results.pdf`;
        const destinationUri = (FileSystem.documentDirectory || '') + fileName;
        
        await FileSystem.moveAsync({
          from: uri,
          to: destinationUri,
        });

        Alert.alert('Report Saved', `Saved as ${fileName}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Icon name="time" size={24} color="#FFD700" />
          <Text style={styles.headerTitle}>Competition History</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : competitions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="trophy-outline" size={64} color="#333" />
            <Text style={styles.emptyTitle}>No Competitions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete a manual scoring competition to see it here
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/manualScoring')}
            >
              <Icon name="add" size={20} color="#000" />
              <Text style={styles.emptyButtonText}>Start Manual Scoring</Text>
            </TouchableOpacity>
          </View>
        ) : (
          competitions.map((competition) => {
            if (competition.source === 'compete') {
              // Single archer competition from "Compete" flow
              return (
                <View key={competition.id} style={styles.competitionCard}>
                  <View style={styles.sourceTag}>
                    <Icon name="locate" size={12} color="#FFD700" />
                    <Text style={styles.sourceTagText}>Compete</Text>
                  </View>
                  <View style={styles.competitionHeader}>
                    <View style={styles.competitionInfo}>
                      <Text style={styles.competitionName}>{competition.name}</Text>
                      <Text style={styles.competitionDate}>
                        {new Date(competition.date).toLocaleDateString()}
                      </Text>
                      <Text style={styles.competitionMeta}>
                        {competition.archerName} • {competition.bowName || 'No bow'}
                      </Text>
                      {competition.targetType && competition.distance && (
                        <Text style={styles.competitionMeta}>
                          {TARGET_CONFIGS[competition.targetType as keyof typeof TARGET_CONFIGS]?.name || competition.targetType} • {competition.distance}
                        </Text>
                      )}
                    </View>
                    <View style={styles.scoreContainer}>
                      <Text style={styles.totalScoreLabel}>Score</Text>
                      <Text style={styles.totalScoreValue}>{competition.totalScore}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCompetition(competition)}
                    >
                      <Icon name="trash-outline" size={20} color="#ed1c24" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.pdfButton}
                    onPress={() => viewCompeteCompetition(competition)}
                  >
                    <Icon name="eye" size={18} color="#000" />
                    <Text style={styles.pdfButtonText}>View Results & PDF</Text>
                  </TouchableOpacity>
                </View>
              );
            } else {
              // Manual scoring competition (multiple archers)
              const bowTypes = competition.archers ? [...new Set(competition.archers.map(a => a.bowType))] : [];
              
              return (
                <View key={competition.id} style={styles.competitionCard}>
                  <View style={[styles.sourceTag, { backgroundColor: '#1a3a1a' }]}>
                    <Icon name="clipboard" size={12} color="#4CAF50" />
                    <Text style={[styles.sourceTagText, { color: '#4CAF50' }]}>Score Keeping</Text>
                  </View>
                  <View style={styles.competitionHeader}>
                    <View style={styles.competitionInfo}>
                      <Text style={styles.competitionName}>{competition.name}</Text>
                      <Text style={styles.competitionDate}>
                        {new Date(competition.date).toLocaleDateString()}
                      </Text>
                      <Text style={styles.competitionMeta}>
                        {competition.archerCount} archers • {bowTypes.length} categories
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCompetition(competition)}
                    >
                      <Icon name="trash-outline" size={20} color="#ed1c24" />
                    </TouchableOpacity>
                  </View>

                  {/* Bow Type Categories Preview */}
                  {competition.archers && bowTypes.length > 0 && (
                    <View style={styles.categoriesPreview}>
                      {bowTypes.map((bowType) => {
                        const categoryArchers = competition.archers!
                          .filter(a => a.bowType === bowType)
                          .sort((a, b) => b.totalScore - a.totalScore);
                        const winner = categoryArchers[0];
                        
                        return (
                          <View key={bowType} style={styles.categoryPreview}>
                            <Text style={styles.categoryName}>{BOW_TYPES[bowType] || bowType}</Text>
                            <Text style={styles.categoryWinner}>
                              🥇 {winner?.name} ({winner?.totalScore})
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.pdfButton}
                    onPress={() => regenerateManualPdf(competition)}
                  >
                    <Icon name="document-text" size={18} color="#000" />
                    <Text style={styles.pdfButtonText}>View/Download PDF</Text>
                  </TouchableOpacity>
                </View>
              );
            }
          })
        )}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: { padding: 8 },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFD700' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  loadingText: { color: '#888', textAlign: 'center', paddingVertical: 40 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  competitionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  competitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  competitionInfo: { flex: 1 },
  competitionName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  competitionDate: { fontSize: 14, color: '#FFD700', marginTop: 4 },
  competitionMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  deleteButton: { padding: 8 },
  categoriesPreview: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginBottom: 12,
  },
  categoryPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  categoryName: { fontSize: 14, color: '#888' },
  categoryWinner: { fontSize: 14, color: '#FFD700' },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  pdfButtonText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a1a',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 4,
  },
  sourceTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  scoreContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  totalScoreLabel: {
    fontSize: 10,
    color: '#888',
  },
  totalScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
