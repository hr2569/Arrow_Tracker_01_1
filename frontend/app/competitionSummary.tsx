import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getActiveCompetition, 
  setActiveCompetition,
  Competition, 
  getRankings,
  Participant,
} from '../utils/competitionStorage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { TARGET_CONFIGS } from '../store/appStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CompetitionSummaryScreen() {
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

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
    Alert.alert(
      'End Competition',
      'Are you sure you want to end this competition? You can still view it in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Competition',
          onPress: async () => {
            await setActiveCompetition(null);
            router.replace('/');
          },
        },
      ]
    );
  };

  const generateCompetitionReport = async () => {
    if (!competition) return;

    setGenerating(true);
    try {
      const rankings = getRankings(competition);
      const targetConfig = TARGET_CONFIGS[competition.targetType as keyof typeof TARGET_CONFIGS];
      
      // Generate heatmap SVGs for each participant
      const participantReports = rankings.map((participant, index) => {
        const allShots = participant.rounds.flatMap(r => r.shots);
        const heatmapSvg = generateHeatmapSvg(allShots, 200, competition.targetType);
        
        return `
          <div class="participant-report" style="page-break-inside: avoid; margin-bottom: 30px;">
            <div class="participant-header" style="display: flex; align-items: center; margin-bottom: 15px;">
              <div class="rank-badge rank-${index + 1}" style="
                width: 40px; 
                height: 40px; 
                border-radius: 20px; 
                background: ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666'};
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-size: 18px;
                font-weight: bold;
                color: ${index < 3 ? '#000' : '#fff'};
                margin-right: 15px;
              ">${index + 1}</div>
              <div>
                <h3 style="margin: 0; color: #333;">${participant.name}</h3>
                <p style="margin: 0; color: #666; font-size: 12px;">${participant.bowName || 'No bow'}</p>
              </div>
              <div style="margin-left: auto; text-align: right;">
                <div style="font-size: 28px; font-weight: bold; color: #8B0000;">${participant.totalScore}</div>
                <div style="font-size: 12px; color: #666;">points</div>
              </div>
            </div>
            
            <div style="display: flex; gap: 20px;">
              <div style="flex: 1;">
                <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">Round Breakdown</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Round</th>
                    <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Arrow 1</th>
                    <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Arrow 2</th>
                    <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Arrow 3</th>
                    <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Total</th>
                  </tr>
                  ${participant.rounds.map((round, ri) => `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #ddd;">${ri + 1}</td>
                      ${round.shots.map(shot => `
                        <td style="padding: 6px; text-align: center; border: 1px solid #ddd; background: ${getScoreBgColor(shot.ring)}; color: ${getScoreTextColorHex(shot.ring)};">
                          ${shot.ring === 10 ? 'X' : shot.ring === 0 ? 'M' : shot.ring}
                        </td>
                      `).join('')}
                      <td style="padding: 6px; text-align: center; border: 1px solid #ddd; font-weight: bold;">${round.totalScore}</td>
                    </tr>
                  `).join('')}
                  <tr style="background: #f5f5f5; font-weight: bold;">
                    <td style="padding: 6px; border: 1px solid #ddd;">Total</td>
                    <td colspan="3" style="padding: 6px; border: 1px solid #ddd;"></td>
                    <td style="padding: 6px; text-align: center; border: 1px solid #ddd; color: #8B0000;">${participant.totalScore}</td>
                  </tr>
                </table>
              </div>
              
              <div style="width: 220px;">
                <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">Shot Distribution</h4>
                <div style="background: #1a1a1a; border-radius: 10px; padding: 10px; display: flex; justify-content: center;">
                  ${heatmapSvg}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('<hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Competition Report - ${competition.name}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #8B0000;
            }
            .header h1 {
              color: #8B0000;
              margin: 0 0 5px 0;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
            }
            .header .trophy {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .meta-info {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-top: 15px;
              font-size: 14px;
            }
            .meta-info div {
              text-align: center;
            }
            .meta-info .label {
              color: #888;
              font-size: 11px;
            }
            .meta-info .value {
              font-weight: bold;
            }
            .leaderboard {
              background: linear-gradient(135deg, #1a1a1a, #333);
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .leaderboard h2 {
              color: #FFD700;
              margin: 0 0 15px 0;
              text-align: center;
            }
            .leaderboard-item {
              display: flex;
              align-items: center;
              background: rgba(255,255,255,0.1);
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 8px;
            }
            .leaderboard-item.first {
              background: linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,215,0,0.1));
              border: 1px solid rgba(255,215,0,0.5);
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="trophy">🏆</div>
            <h1>${competition.name || 'Competition'}</h1>
            <div class="subtitle">Competition Results</div>
            <div class="meta-info">
              <div>
                <div class="label">Date</div>
                <div class="value">${new Date(competition.completedAt || competition.createdAt).toLocaleDateString()}</div>
              </div>
              <div>
                <div class="label">Target</div>
                <div class="value">${targetConfig?.name || competition.targetType}</div>
              </div>
              <div>
                <div class="label">Distance</div>
                <div class="value">${competition.distance}</div>
              </div>
              <div>
                <div class="label">Participants</div>
                <div class="value">${competition.participants.length}</div>
              </div>
              <div>
                <div class="label">Rounds</div>
                <div class="value">${competition.maxRounds}</div>
              </div>
            </div>
          </div>

          <div class="leaderboard">
            <h2>🏅 Final Standings</h2>
            ${rankings.slice(0, 3).map((p, i) => `
              <div class="leaderboard-item ${i === 0 ? 'first' : ''}">
                <div style="
                  width: 36px; 
                  height: 36px; 
                  border-radius: 18px; 
                  background: ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'};
                  display: flex; 
                  align-items: center; 
                  justify-content: center;
                  font-weight: bold;
                  color: #000;
                  margin-right: 15px;
                ">${i + 1}</div>
                <div style="flex: 1; color: #fff;">
                  <div style="font-weight: bold;">${p.name}</div>
                </div>
                <div style="color: #FFD700; font-size: 24px; font-weight: bold;">${p.totalScore}</div>
              </div>
            `).join('')}
          </div>

          <h2 style="color: #8B0000; border-bottom: 2px solid #8B0000; padding-bottom: 10px;">
            Detailed Results
          </h2>
          
          ${participantReports}

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
            Generated by Arrow Tracker • ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Competition Report',
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
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
    
    // Generate target rings
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
    
    // Generate shot markers
    let shotsSvg = '';
    shots.forEach(shot => {
      const cx = shot.x * size;
      const cy = shot.y * size;
      shotsSvg += `
        <circle cx="${cx}" cy="${cy}" r="4" fill="rgba(255,0,0,0.7)" stroke="#000" stroke-width="1"/>
      `;
    });
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${ringsSvg}
        ${shotsSvg}
      </svg>
    `;
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

  const rankings = getRankings(competition);
  const winner = rankings[0];
  const maxPossibleScore = competition.maxRounds * competition.arrowsPerRound * 10;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Winner Section */}
        <View style={styles.winnerSection}>
          <View style={styles.trophyContainer}>
            <Ionicons name="trophy" size={64} color="#FFD700" />
          </View>
          <Text style={styles.winnerLabel}>🎉 Winner 🎉</Text>
          <Text style={styles.winnerName}>{winner.name}</Text>
          <Text style={styles.winnerScore}>{winner.totalScore}</Text>
          <Text style={styles.winnerMaxScore}>out of {maxPossibleScore}</Text>
        </View>

        {/* Competition Info */}
        <View style={styles.infoCard}>
          <Text style={styles.competitionName}>{competition.name || 'Competition'}</Text>
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
              <Ionicons name="people-outline" size={16} color="#888" />
              <Text style={styles.infoText}>{competition.participants.length} archers</Text>
            </View>
          </View>
        </View>

        {/* Final Standings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Standings</Text>
          {rankings.map((participant, index) => (
            <TouchableOpacity
              key={participant.id}
              style={styles.standingCard}
              onPress={() => setExpandedParticipant(
                expandedParticipant === participant.id ? null : participant.id
              )}
            >
              <View style={styles.standingMain}>
                <View style={[
                  styles.rankBadge,
                  index === 0 && styles.rankBadgeGold,
                  index === 1 && styles.rankBadgeSilver,
                  index === 2 && styles.rankBadgeBronze,
                ]}>
                  <Text style={[
                    styles.rankText,
                    index < 3 && styles.rankTextDark,
                  ]}>{index + 1}</Text>
                </View>
                <View style={styles.standingInfo}>
                  <Text style={styles.standingName}>{participant.name}</Text>
                  {participant.bowName && (
                    <Text style={styles.standingBow}>{participant.bowName}</Text>
                  )}
                </View>
                <View style={styles.standingScoreContainer}>
                  <Text style={styles.standingScore}>{participant.totalScore}</Text>
                  <Ionicons 
                    name={expandedParticipant === participant.id ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </View>
              </View>

              {expandedParticipant === participant.id && (
                <View style={styles.roundsBreakdown}>
                  <View style={styles.roundsHeader}>
                    <Text style={styles.roundsHeaderText}>Round</Text>
                    <Text style={styles.roundsHeaderText}>Arrows</Text>
                    <Text style={styles.roundsHeaderText}>Total</Text>
                  </View>
                  {participant.rounds.map((round, ri) => (
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
              )}
            </TouchableOpacity>
          ))}
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
            <Text style={styles.reportButtonText}>Generating...</Text>
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="#000" />
              <Text style={styles.reportButtonText}>Share Report</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.finishButtonText}>Finish</Text>
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
  winnerSection: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
  },
  trophyContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  winnerLabel: {
    color: '#888',
    fontSize: 16,
    marginBottom: 4,
  },
  winnerName: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  winnerScore: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  winnerMaxScore: {
    color: '#666',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  competitionName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  standingCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  standingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankBadgeGold: { backgroundColor: '#FFD700' },
  rankBadgeSilver: { backgroundColor: '#C0C0C0' },
  rankBadgeBronze: { backgroundColor: '#CD7F32' },
  rankText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  rankTextDark: { color: '#000' },
  standingInfo: { flex: 1 },
  standingName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  standingBow: { color: '#666', fontSize: 12 },
  standingScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  standingScore: { color: '#FFD700', fontSize: 24, fontWeight: 'bold' },
  roundsBreakdown: {
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  roundsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  roundsHeaderText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  roundNumber: {
    color: '#888',
    fontSize: 14,
    width: 40,
    textAlign: 'center',
  },
  roundArrows: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  arrowBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roundTotal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    width: 40,
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
    backgroundColor: '#8B0000',
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
