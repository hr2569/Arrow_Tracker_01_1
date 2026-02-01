import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getActiveCompetition, 
  setActiveCompetition,
  Competition,
} from '../utils/competitionStorage';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { TARGET_CONFIGS } from '../store/appStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CompetitionSummaryScreen() {
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadCompetition = async () => {
    try {
      setLoading(true);
      const comp = await getActiveCompetition();
      if (comp) {
        setCompetition(comp);
      }
    } catch (error) {
      console.error('Error loading competition:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCompetition();
    }, [])
  );

  const handleFinish = async () => {
    await setActiveCompetition(null);
    router.replace('/');
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 9) return '#FFD700';
    if (score >= 7) return '#ed1c24';
    if (score >= 5) return '#00a2e8';
    if (score >= 3) return '#2a2a2a';
    if (score >= 1) return '#f5f5f0';
    return '#333';
  };

  const getScoreTextColorHex = (score: number): string => {
    if (score >= 9) return '#000';
    if (score >= 7) return '#fff';
    if (score >= 5) return '#fff';
    if (score >= 3) return '#fff';
    if (score >= 1) return '#000';
    return '#fff';
  };

  const generateHeatmapSvg = (shots: { x: number; y: number; ring: number }[], size: number, targetType: string): string => {
    const targetConfig = TARGET_CONFIGS[targetType as keyof typeof TARGET_CONFIGS];
    const rings = targetConfig?.rings || 10;
    const colors = targetConfig?.colors || [];
    
    let ringsSvg = '';
    for (let i = 0; i < rings; i++) {
      const ringRatio = (rings - i) / rings;
      const ringSize = size * ringRatio * 0.95;
      const color = colors[i];
      ringsSvg += `
        <circle 
          cx="${size/2}" 
          cy="${size/2}" 
          r="${ringSize/2}" 
          fill="${color?.bg || '#f5f5f0'}" 
          stroke="${color?.border || '#333'}" 
          stroke-width="1"
        />
      `;
    }
    
    let shotsSvg = '';
    shots.forEach(shot => {
      const cx = shot.x * size;
      const cy = shot.y * size;
      shotsSvg += `
        <circle cx="${cx}" cy="${cy}" r="5" fill="rgba(255,0,0,0.8)" stroke="#000" stroke-width="1"/>
      `;
    });
    
    // Calculate mean point of impact
    if (shots.length > 0) {
      const meanX = shots.reduce((sum, s) => sum + s.x, 0) / shots.length * size;
      const meanY = shots.reduce((sum, s) => sum + s.y, 0) / shots.length * size;
      shotsSvg += `
        <circle cx="${meanX}" cy="${meanY}" r="8" fill="none" stroke="#00ff00" stroke-width="2"/>
        <line x1="${meanX - 10}" y1="${meanY}" x2="${meanX + 10}" y2="${meanY}" stroke="#00ff00" stroke-width="2"/>
        <line x1="${meanX}" y1="${meanY - 10}" x2="${meanX}" y2="${meanY + 10}" stroke="#00ff00" stroke-width="2"/>
      `;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${ringsSvg}
        ${shotsSvg}
      </svg>
    `;
  };

  const generateScatterPlotSvg = (shots: { x: number; y: number; ring: number }[], size: number): string => {
    const padding = 30;
    const plotSize = size - padding * 2;
    
    // Grid lines
    let gridSvg = '';
    for (let i = 0; i <= 4; i++) {
      const pos = padding + (plotSize / 4) * i;
      gridSvg += `
        <line x1="${padding}" y1="${pos}" x2="${size - padding}" y2="${pos}" stroke="#333" stroke-width="1"/>
        <line x1="${pos}" y1="${padding}" x2="${pos}" y2="${size - padding}" stroke="#333" stroke-width="1"/>
      `;
    }
    
    // Axes
    const axisSvg = `
      <line x1="${padding}" y1="${size - padding}" x2="${size - padding}" y2="${size - padding}" stroke="#666" stroke-width="2"/>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${size - padding}" stroke="#666" stroke-width="2"/>
      <text x="${size/2}" y="${size - 5}" text-anchor="middle" fill="#888" font-size="10">Horizontal</text>
      <text x="10" y="${size/2}" text-anchor="middle" fill="#888" font-size="10" transform="rotate(-90, 10, ${size/2})">Vertical</text>
    `;
    
    // Plot shots
    let shotsSvg = '';
    shots.forEach(shot => {
      const cx = padding + shot.x * plotSize;
      const cy = padding + shot.y * plotSize;
      shotsSvg += `
        <circle cx="${cx}" cy="${cy}" r="4" fill="#ed1c24" stroke="#000" stroke-width="1"/>
      `;
    });
    
    // Mean POI
    if (shots.length > 0) {
      const meanX = padding + (shots.reduce((sum, s) => sum + s.x, 0) / shots.length) * plotSize;
      const meanY = padding + (shots.reduce((sum, s) => sum + s.y, 0) / shots.length) * plotSize;
      shotsSvg += `
        <circle cx="${meanX}" cy="${meanY}" r="6" fill="none" stroke="#00ff00" stroke-width="2"/>
        <line x1="${meanX - 8}" y1="${meanY}" x2="${meanX + 8}" y2="${meanY}" stroke="#00ff00" stroke-width="2"/>
        <line x1="${meanX}" y1="${meanY - 8}" x2="${meanX}" y2="${meanY + 8}" stroke="#00ff00" stroke-width="2"/>
      `;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect x="${padding}" y="${padding}" width="${plotSize}" height="${plotSize}" fill="#111" stroke="#333"/>
        ${gridSvg}
        ${axisSvg}
        ${shotsSvg}
        <text x="${size/2}" y="${padding - 10}" text-anchor="middle" fill="#FFD700" font-size="12" font-weight="bold">Shot Distribution</text>
      </svg>
    `;
  };

  const generateCompetitionReport = async () => {
    if (!competition) return;

    setGenerating(true);
    try {
      const archer = competition.participants[0];
      const targetConfig = TARGET_CONFIGS[competition.targetType as keyof typeof TARGET_CONFIGS];
      const allShots = archer.rounds.flatMap(r => r.shots);
      const maxPossibleScore = competition.maxRounds * competition.arrowsPerRound * 10;
      
      const heatmapSvg = generateHeatmapSvg(allShots, 250, competition.targetType);
      const scatterSvg = generateScatterPlotSvg(allShots, 250);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Competition Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              padding: 30px;
              color: #333;
              max-width: 800px;
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
              margin: 0 0 5px 0;
              font-size: 28px;
            }
            .header .archer-name {
              font-size: 24px;
              color: #333;
              font-weight: bold;
              margin: 10px 0;
            }
            .header .meta {
              color: #666;
              font-size: 14px;
            }
            .total-score {
              text-align: center;
              background: linear-gradient(135deg, #1a1a1a, #333);
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 30px;
            }
            .total-score .score {
              font-size: 64px;
              font-weight: bold;
              color: #FFD700;
            }
            .total-score .max {
              font-size: 18px;
              color: #888;
            }
            .rounds-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .rounds-table th {
              background: #8B0000;
              color: #fff;
              padding: 12px 8px;
              text-align: center;
              font-size: 14px;
            }
            .rounds-table td {
              padding: 10px 8px;
              text-align: center;
              border-bottom: 1px solid #ddd;
              font-size: 14px;
            }
            .rounds-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .rounds-table .round-total {
              font-weight: bold;
              background: #f0f0f0;
            }
            .charts-container {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-top: 30px;
            }
            .chart-box {
              text-align: center;
            }
            .chart-box h3 {
              margin: 0 0 10px 0;
              color: #333;
              font-size: 14px;
            }
            .chart-box svg {
              background: #1a1a1a;
              border-radius: 12px;
              padding: 10px;
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
            <h1>${competition.name || 'Competition'}</h1>
            <div class="archer-name">${archer.name}</div>
            <div class="meta">
              ${new Date(competition.completedAt || competition.createdAt).toLocaleDateString()} • 
              ${targetConfig?.name || competition.targetType} • 
              ${competition.distance} • 
              ${competition.maxRounds} rounds
            </div>
          </div>

          <div class="total-score">
            <div class="score">${archer.totalScore}</div>
            <div class="max">out of ${maxPossibleScore} points</div>
          </div>

          <table class="rounds-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Arrow 1</th>
                <th>Arrow 2</th>
                <th>Arrow 3</th>
                <th>Round Total</th>
              </tr>
            </thead>
            <tbody>
              ${archer.rounds.map((round, ri) => `
                <tr>
                  <td><strong>${ri + 1}</strong></td>
                  ${round.shots.map(shot => `
                    <td style="background: ${getScoreBgColor(shot.ring)}; color: ${getScoreTextColorHex(shot.ring)}; font-weight: bold;">
                      ${shot.ring === 10 ? 'X' : shot.ring === 0 ? 'M' : shot.ring}
                    </td>
                  `).join('')}
                  <td class="round-total">${round.totalScore}</td>
                </tr>
              `).join('')}
              <tr style="background: #8B0000; color: #fff;">
                <td><strong>TOTAL</strong></td>
                <td colspan="3"></td>
                <td><strong>${archer.totalScore}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="charts-container">
            <div class="chart-box">
              <h3>Heat Map</h3>
              ${heatmapSvg}
            </div>
            <div class="chart-box">
              <h3>Shot Distribution</h3>
              ${scatterSvg}
            </div>
          </div>

          <div class="footer">
            Generated by Arrow Tracker • ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      // Generate filename with date and archer name
      const dateStr = new Date().toISOString().split('T')[0];
      const archerNameClean = archer.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Competition_${archerNameClean}_${dateStr}.pdf`;
      
      // Save to documents directory
      const documentsDir = FileSystem.documentDirectory;
      const destinationUri = `${documentsDir}${filename}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri,
      });
      
      Alert.alert(
        'Report Saved',
        `Competition report saved as:\n${filename}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !competition) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const archer = competition.participants[0];
  const maxPossibleScore = competition.maxRounds * competition.arrowsPerRound * 10;
  const percentage = Math.round((archer.totalScore / maxPossibleScore) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.trophyContainer}>
            <Ionicons name="trophy" size={56} color="#FFD700" />
          </View>
          <Text style={styles.completedLabel}>Competition Complete!</Text>
          <Text style={styles.archerName}>{archer.name}</Text>
          <Text style={styles.competitionName}>{competition.name || 'Competition'}</Text>
        </View>

        {/* Score Display */}
        <View style={styles.scoreCard}>
          <Text style={styles.totalScore}>{archer.totalScore}</Text>
          <Text style={styles.maxScore}>out of {maxPossibleScore}</Text>
          <View style={styles.percentageBar}>
            <View style={[styles.percentageFill, { width: `${percentage}%` }]} />
          </View>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>

        {/* Competition Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#888" />
            <Text style={styles.infoText}>
              {new Date(competition.completedAt || competition.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="locate-outline" size={16} color="#888" />
            <Text style={styles.infoText}>{competition.distance}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="apps-outline" size={16} color="#888" />
            <Text style={styles.infoText}>{competition.maxRounds} rounds</Text>
          </View>
        </View>

        {/* Rounds Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Round Breakdown</Text>
          <View style={styles.roundsContainer}>
            <View style={styles.roundsHeader}>
              <Text style={styles.roundsHeaderText}>Round</Text>
              <Text style={styles.roundsHeaderText}>Arrows</Text>
              <Text style={styles.roundsHeaderText}>Total</Text>
            </View>
            {archer.rounds.map((round, ri) => (
              <View key={ri} style={styles.roundRow}>
                <Text style={styles.roundNumber}>{ri + 1}</Text>
                <View style={styles.roundArrows}>
                  {round.shots.map((shot, si) => (
                    <View
                      key={si}
                      style={[styles.arrowBadge, { backgroundColor: getScoreBgColor(shot.ring) }]}
                    >
                      <Text style={[styles.arrowText, { color: getScoreTextColorHex(shot.ring) }]}>
                        {shot.ring === 10 ? 'X' : shot.ring === 0 ? 'M' : shot.ring}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.roundTotal}>{round.totalScore}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={generateCompetitionReport}
          disabled={generating}
        >
          {generating ? (
            <Text style={styles.reportButtonText}>Saving...</Text>
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#000" />
              <Text style={styles.reportButtonText}>Save Report</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
          <Ionicons name="home" size={20} color="#fff" />
          <Text style={styles.finishButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  trophyContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  completedLabel: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  archerName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  competitionName: {
    color: '#888',
    fontSize: 16,
    marginTop: 4,
  },
  scoreCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  totalScore: {
    color: '#FFD700',
    fontSize: 64,
    fontWeight: 'bold',
  },
  maxScore: {
    color: '#666',
    fontSize: 16,
    marginBottom: 16,
  },
  percentageBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  percentageText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#888',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  roundsContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  roundsHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  roundsHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  roundNumber: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  roundArrows: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  arrowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roundTotal: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  reportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reportButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  finishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
