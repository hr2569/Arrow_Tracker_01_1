import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getCompetitions, Competition } from '../utils/competitionStorage';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { TARGET_CONFIGS } from '../store/appStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to get target type name
const getTargetTypeName = (type?: string): string => {
  switch (type) {
    case 'vegas_3spot': return 'Vegas 3-Spot';
    case 'nfaa_indoor': return 'NFAA Indoor';
    case 'wa_standard': 
    default: return 'WA Standard';
  }
};

export default function MergeCompetitionsScreen() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const comps = await getCompetitions();
      setCompetitions(comps.filter(c => c.status === 'completed'));
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

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === competitions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(competitions.map(c => c.id)));
    }
  };

  const generateMergedReport = async () => {
    if (selectedIds.size < 2) {
      Alert.alert('Select More', 'Please select at least 2 competitions to merge.');
      return;
    }

    setGenerating(true);
    try {
      const selected = competitions.filter(c => selectedIds.has(c.id));
      
      // Extract all participants from selected competitions
      interface ParticipantData {
        name: string;
        bowType: string;
        bowName: string;
        score: number;
        maxScore: number;
        percentage: number;
        competitionName: string;
        date: string;
        targetType: string;
        distance: string;
      }
      
      const allParticipants: ParticipantData[] = [];
      
      selected.forEach(comp => {
        const archer = comp.participants[0];
        const maxScore = comp.maxRounds * comp.arrowsPerRound * 10;
        allParticipants.push({
          name: archer.name,
          bowType: archer.bowName ? getBowType(archer.bowName) : 'Unknown',
          bowName: archer.bowName || 'No bow',
          score: archer.totalScore,
          maxScore,
          percentage: Math.round((archer.totalScore / maxScore) * 100),
          competitionName: comp.name || 'Competition',
          date: new Date(comp.completedAt || comp.createdAt).toLocaleDateString(),
          targetType: comp.targetType,
          distance: comp.distance,
        });
      });

      // Sort by score (descending)
      const byScore = [...allParticipants].sort((a, b) => b.score - a.score);
      
      // Group by bow type
      const byBowType: { [key: string]: ParticipantData[] } = {};
      allParticipants.forEach(p => {
        if (!byBowType[p.bowType]) {
          byBowType[p.bowType] = [];
        }
        byBowType[p.bowType].push(p);
      });
      
      // Sort each bow type group by score
      Object.keys(byBowType).forEach(bowType => {
        byBowType[bowType].sort((a, b) => b.score - a.score);
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Merged Competition Report</title>
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
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #8B0000;
            }
            .header h1 {
              color: #8B0000;
              margin: 0;
              font-size: 28px;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
              margin-top: 8px;
            }
            .section {
              margin-bottom: 40px;
            }
            .section-title {
              font-size: 20px;
              font-weight: bold;
              color: #8B0000;
              margin-bottom: 16px;
              padding-bottom: 8px;
              border-bottom: 2px solid #8B0000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #8B0000;
              color: #fff;
              padding: 12px 8px;
              text-align: left;
              font-size: 13px;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #ddd;
              font-size: 13px;
            }
            tr:nth-child(even) {
              background: #f9f9f9;
            }
            .rank {
              font-weight: bold;
              color: #8B0000;
              width: 40px;
              text-align: center;
            }
            .rank-1 { color: #FFD700; }
            .rank-2 { color: #C0C0C0; }
            .rank-3 { color: #CD7F32; }
            .score {
              font-weight: bold;
              color: #8B0000;
              text-align: right;
            }
            .percentage {
              color: #666;
              font-size: 11px;
            }
            .bow-type-header {
              background: linear-gradient(135deg, #1a1a1a, #333);
              color: #FFD700;
              padding: 12px 16px;
              border-radius: 8px;
              margin-bottom: 12px;
              font-size: 16px;
              font-weight: bold;
            }
            .meta {
              color: #888;
              font-size: 11px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #888;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏆 Merged Competition Report</h1>
            <div class="subtitle">${selected.length} competitions • ${allParticipants.length} entries</div>
          </div>

          <div class="section">
            <div class="section-title">📊 Overall Rankings (by Score)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Archer</th>
                  <th>Bow</th>
                  <th>Competition</th>
                  <th>Target</th>
                  <th style="text-align: right;">Score</th>
                </tr>
              </thead>
              <tbody>
                ${byScore.map((p, i) => `
                  <tr>
                    <td class="rank ${i < 3 ? `rank-${i + 1}` : ''}">${i + 1}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.bowName}</td>
                    <td>
                      ${p.competitionName}
                      <div class="meta">${p.date}</div>
                    </td>
                    <td>
                      ${getTargetTypeName(p.targetType)}
                      <div class="meta">${p.distance}</div>
                    </td>
                    <td class="score">
                      ${p.score}/${p.maxScore}
                      <div class="percentage">${p.percentage}%</div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">🏹 Rankings by Bow Type</div>
            ${Object.entries(byBowType).map(([bowType, participants]) => `
              <div class="bow-type-header">${bowType} (${participants.length} entries)</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40px;">#</th>
                    <th>Archer</th>
                    <th>Bow</th>
                    <th>Competition</th>
                    <th style="text-align: right;">Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${participants.map((p, i) => `
                    <tr>
                      <td class="rank ${i < 3 ? `rank-${i + 1}` : ''}">${i + 1}</td>
                      <td><strong>${p.name}</strong></td>
                      <td>${p.bowName}</td>
                      <td>
                        ${p.competitionName}
                        <div class="meta">${p.date}</div>
                      </td>
                      <td class="score">
                        ${p.score}/${p.maxScore}
                        <div class="percentage">${p.percentage}%</div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `).join('')}
          </div>

          <div class="section">
            <div class="section-title">📋 Competitions Included</div>
            <table>
              <thead>
                <tr>
                  <th>Competition</th>
                  <th>Date</th>
                  <th>Target</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                ${selected.map(comp => `
                  <tr>
                    <td><strong>${comp.name || 'Competition'}</strong></td>
                    <td>${new Date(comp.completedAt || comp.createdAt).toLocaleDateString()}</td>
                    <td>${getTargetTypeName(comp.targetType)}</td>
                    <td>${comp.distance}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            Generated by Arrow Tracker • ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Merged Report',
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Helper to extract bow type from bow name
  const getBowType = (bowName: string): string => {
    const name = bowName.toLowerCase();
    if (name.includes('recurve') || name.includes('olympic')) return 'Recurve';
    if (name.includes('compound')) return 'Compound';
    if (name.includes('barebow')) return 'Barebow';
    if (name.includes('traditional') || name.includes('longbow')) return 'Traditional';
    if (name.includes('crossbow')) return 'Crossbow';
    return 'Other';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading competitions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Merge Reports</Text>
          <Text style={styles.headerSubtitle}>Select competitions to combine</Text>
        </View>
        <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
          <Text style={styles.selectAllText}>
            {selectedIds.size === competitions.length ? 'Clear' : 'All'}
          </Text>
        </TouchableOpacity>
      </View>

      {competitions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No Competitions</Text>
          <Text style={styles.emptySubtitle}>Complete some competitions first</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {competitions.map((comp) => {
              const archer = comp.participants[0];
              const maxScore = comp.maxRounds * comp.arrowsPerRound * 10;
              const isSelected = selectedIds.has(comp.id);
              
              return (
                <TouchableOpacity
                  key={comp.id}
                  style={[styles.competitionCard, isSelected && styles.competitionCardSelected]}
                  onPress={() => toggleSelection(comp.id)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
                  </View>
                  <View style={styles.competitionInfo}>
                    <Text style={styles.competitionName}>{comp.name || 'Competition'}</Text>
                    <Text style={styles.archerName}>{archer.name}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        {new Date(comp.completedAt || comp.createdAt).toLocaleDateString()}
                      </Text>
                      <Text style={styles.metaText}>•</Text>
                      <Text style={styles.metaText}>{getTargetTypeName(comp.targetType)}</Text>
                      <Text style={styles.metaText}>•</Text>
                      <Text style={styles.metaText}>{comp.distance}</Text>
                    </View>
                  </View>
                  <View style={styles.scoreContainer}>
                    <Text style={styles.score}>{archer.totalScore}</Text>
                    <Text style={styles.maxScore}>/{maxScore}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Generate Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.generateButton, selectedIds.size < 2 && styles.generateButtonDisabled]}
              onPress={generateMergedReport}
              disabled={selectedIds.size < 2 || generating}
            >
              {generating ? (
                <Text style={styles.generateButtonText}>Generating...</Text>
              ) : (
                <>
                  <Ionicons name="document-text" size={20} color={selectedIds.size >= 2 ? '#000' : '#666'} />
                  <Text style={[styles.generateButtonText, selectedIds.size < 2 && styles.generateButtonTextDisabled]}>
                    Generate Merged Report ({selectedIds.size} selected)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#888', fontSize: 12 },
  selectAllButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectAllText: { color: '#FFD700', fontSize: 14, fontWeight: '600' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { color: '#666', fontSize: 14, marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  competitionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#222',
  },
  competitionCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#1a1500',
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
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  competitionInfo: { flex: 1 },
  competitionName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  archerName: { color: '#FFD700', fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', marginTop: 4, gap: 6 },
  metaText: { color: '#666', fontSize: 11 },
  scoreContainer: { flexDirection: 'row', alignItems: 'baseline' },
  score: { color: '#FFD700', fontSize: 20, fontWeight: 'bold' },
  maxScore: { color: '#666', fontSize: 12 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#333',
  },
  generateButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  generateButtonTextDisabled: {
    color: '#666',
  },
});
