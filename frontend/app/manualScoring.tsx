import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/build/legacy/FileSystem';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BOW_TYPES = [
  { id: 'recurve', name: 'Recurve' },
  { id: 'compound', name: 'Compound' },
  { id: 'barebow', name: 'Barebow' },
  { id: 'longbow', name: 'Longbow' },
  { id: 'traditional', name: 'Traditional' },
];

interface Archer {
  id: string;
  name: string;
  bowType: string;
  rounds: number[][]; // 10 rounds, 3 arrows each
}

const ROUNDS_COUNT = 10;
const ARROWS_PER_ROUND = 3;

export default function ManualScoring() {
  const router = useRouter();
  const [competitionName, setCompetitionName] = useState('');
  const [archers, setArchers] = useState<Archer[]>([]);
  const [showAddArcher, setShowAddArcher] = useState(false);
  const [newArcherName, setNewArcherName] = useState('');
  const [newArcherBowType, setNewArcherBowType] = useState('recurve');
  const [selectedArcherIndex, setSelectedArcherIndex] = useState<number | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [showScoreEntry, setShowScoreEntry] = useState(false);
  const [currentArrowScores, setCurrentArrowScores] = useState<(number | null)[]>([null, null, null]);
  const [generating, setGenerating] = useState(false);

  const availableScores = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]; // 11 = X

  const getScoreDisplay = (score: number | null) => {
    if (score === null) return '-';
    if (score === 11) return 'X';
    if (score === 0) return 'M';
    return score.toString();
  };

  const getPointValue = (score: number) => score === 11 ? 10 : score;

  const getScoreColor = (score: number | null) => {
    if (score === null) return '#333';
    if (score === 11 || score >= 9) return '#FFD700';
    if (score >= 7) return '#ed1c24';
    if (score >= 5) return '#00a2e8';
    if (score >= 3) return '#2a2a2a';
    if (score >= 1) return '#f5f5f0';
    return '#666';
  };

  const getScoreTextColor = (score: number | null) => {
    if (score === null) return '#666';
    if (score === 11 || score >= 9) return '#000';
    if (score >= 7) return '#fff';
    if (score >= 5) return '#fff';
    if (score >= 3) return '#fff';
    if (score >= 1) return '#000';
    return '#fff';
  };

  const addArcher = () => {
    if (!newArcherName.trim()) {
      Alert.alert('Error', 'Please enter archer name');
      return;
    }

    const newArcher: Archer = {
      id: Date.now().toString(),
      name: newArcherName.trim(),
      bowType: newArcherBowType,
      rounds: Array(ROUNDS_COUNT).fill(null).map(() => Array(ARROWS_PER_ROUND).fill(null)),
    };

    setArchers([...archers, newArcher]);
    setNewArcherName('');
    setNewArcherBowType('recurve');
    setShowAddArcher(false);
  };

  const removeArcher = (index: number) => {
    Alert.alert(
      'Remove Archer',
      `Are you sure you want to remove ${archers[index].name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = [...archers];
            updated.splice(index, 1);
            setArchers(updated);
          },
        },
      ]
    );
  };

  const openScoreEntry = (archerIndex: number, roundIndex: number) => {
    setSelectedArcherIndex(archerIndex);
    setSelectedRound(roundIndex);
    const currentScores = archers[archerIndex].rounds[roundIndex];
    setCurrentArrowScores([...currentScores]);
    setShowScoreEntry(true);
  };

  const setArrowScore = (arrowIndex: number, score: number) => {
    const updated = [...currentArrowScores];
    updated[arrowIndex] = score;
    setCurrentArrowScores(updated);
  };

  const saveRoundScores = () => {
    if (selectedArcherIndex === null || selectedRound === null) return;

    const updated = [...archers];
    updated[selectedArcherIndex].rounds[selectedRound] = [...currentArrowScores] as number[];
    setArchers(updated);
    setShowScoreEntry(false);
    setCurrentArrowScores([null, null, null]);
  };

  const getArcherTotal = (archer: Archer) => {
    return archer.rounds.reduce((total, round) => {
      return total + round.reduce((roundTotal, score) => {
        return roundTotal + (score !== null ? getPointValue(score) : 0);
      }, 0);
    }, 0);
  };

  const getArcherXCount = (archer: Archer) => {
    return archer.rounds.reduce((total, round) => {
      return total + round.filter(score => score === 11).length;
    }, 0);
  };

  const getRoundTotal = (round: number[]) => {
    return round.reduce((total, score) => total + (score !== null ? getPointValue(score) : 0), 0);
  };

  const isCompetitionComplete = () => {
    if (!competitionName.trim() || archers.length === 0) return false;
    return archers.every(archer =>
      archer.rounds.every(round =>
        round.every(score => score !== null)
      )
    );
  };

  const saveCompetition = async () => {
    if (!isCompetitionComplete()) {
      Alert.alert('Incomplete', 'Please complete all scores before saving.');
      return;
    }

    try {
      const competition = {
        id: Date.now().toString(),
        name: competitionName,
        date: new Date().toISOString(),
        archers: archers.map(a => ({
          ...a,
          totalScore: getArcherTotal(a),
          xCount: getArcherXCount(a),
        })),
        type: 'manual',
      };

      // Get existing competitions
      const existing = await AsyncStorage.getItem('manualCompetitions');
      const competitions = existing ? JSON.parse(existing) : [];
      competitions.unshift(competition);
      await AsyncStorage.setItem('manualCompetitions', JSON.stringify(competitions));

      Alert.alert('Saved', 'Competition saved successfully!');
      return competition;
    } catch (error) {
      console.error('Error saving competition:', error);
      Alert.alert('Error', 'Failed to save competition');
      return null;
    }
  };

  const generatePdfReport = async () => {
    if (!isCompetitionComplete()) {
      Alert.alert('Incomplete', 'Please complete all scores before generating report.');
      return;
    }

    setGenerating(true);

    try {
      // Group archers by bow type
      const archersByBowType: { [key: string]: Archer[] } = {};
      archers.forEach(archer => {
        if (!archersByBowType[archer.bowType]) {
          archersByBowType[archer.bowType] = [];
        }
        archersByBowType[archer.bowType].push(archer);
      });

      // Sort each category by total score
      Object.keys(archersByBowType).forEach(bowType => {
        archersByBowType[bowType].sort((a, b) => {
          const scoreA = getArcherTotal(a);
          const scoreB = getArcherTotal(b);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return getArcherXCount(b) - getArcherXCount(a);
        });
      });

      const maxScore = ROUNDS_COUNT * ARROWS_PER_ROUND * 10;

      const getMedalEmoji = (place: number) => {
        if (place === 0) return '🥇';
        if (place === 1) return '🥈';
        if (place === 2) return '🥉';
        return '';
      };

      const getMedalStyle = (place: number) => {
        if (place === 0) return 'background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;';
        if (place === 1) return 'background: linear-gradient(135deg, #C0C0C0, #A0A0A0); color: #000;';
        if (place === 2) return 'background: linear-gradient(135deg, #CD7F32, #8B4513); color: #fff;';
        return '';
      };

      const getBowTypeName = (id: string) => {
        const bowType = BOW_TYPES.find(b => b.id === id);
        return bowType ? bowType.name : id;
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${competitionName} - Results</title>
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
            .medal-row {
              font-weight: bold;
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
            <h1>🏆 ${competitionName}</h1>
            <div class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="date">${archers.length} Archers • ${ROUNDS_COUNT} Rounds • ${ARROWS_PER_ROUND} Arrows/Round</div>
          </div>

          ${Object.entries(archersByBowType).map(([bowType, categoryArchers]) => `
            <div class="category">
              <div class="category-header">${getBowTypeName(bowType)} Division (${categoryArchers.length} archers)</div>
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
                    const total = getArcherTotal(archer);
                    const xCount = getArcherXCount(archer);
                    const rowClass = index === 0 ? 'gold-row' : index === 1 ? 'silver-row' : index === 2 ? 'bronze-row' : '';
                    return `
                      <tr class="${rowClass}">
                        <td class="place-cell">${getMedalEmoji(index)} ${index + 1}</td>
                        <td class="name-cell">${archer.name}</td>
                        ${archer.rounds.map(round => `<td>${getRoundTotal(round)}</td>`).join('')}
                        <td class="total-cell">${total}</td>
                        <td>${xCount}</td>
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
        const baseFileName = `${competitionName.replace(/[^a-z0-9]/gi, '_')}_Results`;
        const pdfFileName = baseFileName + '.pdf';
        const jsonFileName = baseFileName + '.arrowtracker.json';
        const pdfDestination = FileSystem.documentDirectory + pdfFileName;
        const jsonDestination = FileSystem.documentDirectory + jsonFileName;
        
        await FileSystem.moveAsync({
          from: uri,
          to: pdfDestination,
        });

        // Save companion JSON file for easy import
        const exportData = {
          version: '1.0',
          type: 'arrowtracker_competition',
          name: competitionName,
          date: new Date().toISOString(),
          rounds: ROUNDS_COUNT,
          arrowsPerRound: ARROWS_PER_ROUND,
          archers: archers.map(a => ({
            id: a.id,
            name: a.name,
            bowType: a.bowType,
            rounds: a.rounds,
            totalScore: getArcherTotal(a),
            xCount: getArcherXCount(a),
          })),
        };
        
        await FileSystem.writeAsStringAsync(jsonDestination, JSON.stringify(exportData, null, 2));

        Alert.alert('Report Saved', `Saved as ${pdfFileName}\nData file: ${jsonFileName}`);
      }

      // Also save the competition
      await saveCompetition();

    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Scoring</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Competition Name */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Competition Name</Text>
          <TextInput
            style={styles.textInput}
            value={competitionName}
            onChangeText={setCompetitionName}
            placeholder="Enter competition name"
            placeholderTextColor="#666"
          />
        </View>

        {/* Archers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Archers ({archers.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddArcher(true)}
            >
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.addButtonText}>Add Archer</Text>
            </TouchableOpacity>
          </View>

          {archers.length === 0 ? (
            <Text style={styles.emptyText}>No archers added yet</Text>
          ) : (
            archers.map((archer, archerIndex) => (
              <View key={archer.id} style={styles.archerCard}>
                <View style={styles.archerHeader}>
                  <View style={styles.archerInfo}>
                    <Text style={styles.archerName}>{archer.name}</Text>
                    <Text style={styles.archerBowType}>
                      {BOW_TYPES.find(b => b.id === archer.bowType)?.name}
                    </Text>
                  </View>
                  <View style={styles.archerStats}>
                    <Text style={styles.archerTotal}>{getArcherTotal(archer)}</Text>
                    <Text style={styles.archerXCount}>X: {getArcherXCount(archer)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeArcher(archerIndex)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ed1c24" />
                  </TouchableOpacity>
                </View>

                {/* Rounds Grid */}
                <View style={styles.roundsGrid}>
                  {archer.rounds.map((round, roundIndex) => {
                    const isComplete = round.every(s => s !== null);
                    return (
                      <TouchableOpacity
                        key={roundIndex}
                        style={[
                          styles.roundCell,
                          isComplete && styles.roundCellComplete,
                        ]}
                        onPress={() => openScoreEntry(archerIndex, roundIndex)}
                      >
                        <Text style={styles.roundLabel}>R{roundIndex + 1}</Text>
                        <Text style={[styles.roundScore, isComplete && styles.roundScoreComplete]}>
                          {isComplete ? getRoundTotal(round) : '-'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      {archers.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateButton, !isCompetitionComplete() && styles.generateButtonDisabled]}
            onPress={generatePdfReport}
            disabled={generating || !isCompetitionComplete()}
          >
            {generating ? (
              <Text style={styles.generateButtonText}>Generating...</Text>
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#000" />
                <Text style={styles.generateButtonText}>
                  {isCompetitionComplete() ? 'Save & Generate PDF' : 'Complete All Scores'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Add Archer Modal */}
      <Modal visible={showAddArcher} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Archer</Text>

            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newArcherName}
              onChangeText={setNewArcherName}
              placeholder="Archer's name"
              placeholderTextColor="#666"
              autoFocus
            />

            <Text style={styles.modalLabel}>Bow Type</Text>
            <View style={styles.bowTypeGrid}>
              {BOW_TYPES.map((bow) => (
                <TouchableOpacity
                  key={bow.id}
                  style={[
                    styles.bowTypeButton,
                    newArcherBowType === bow.id && styles.bowTypeButtonSelected,
                  ]}
                  onPress={() => setNewArcherBowType(bow.id)}
                >
                  <Text
                    style={[
                      styles.bowTypeButtonText,
                      newArcherBowType === bow.id && styles.bowTypeButtonTextSelected,
                    ]}
                  >
                    {bow.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddArcher(false);
                  setNewArcherName('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={addArcher}>
                <Text style={styles.modalConfirmButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Score Entry Modal */}
      <Modal visible={showScoreEntry} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedArcherIndex !== null && selectedRound !== null && (
              <>
                <Text style={styles.modalTitle}>
                  {archers[selectedArcherIndex]?.name} - Round {selectedRound + 1}
                </Text>

                {/* Arrow Score Inputs */}
                {[0, 1, 2].map((arrowIndex) => (
                  <View key={arrowIndex} style={styles.arrowSection}>
                    <Text style={styles.arrowLabel}>Arrow {arrowIndex + 1}</Text>
                    <View style={styles.scoreGrid}>
                      {availableScores.map((score) => (
                        <TouchableOpacity
                          key={score}
                          style={[
                            styles.scoreCell,
                            { backgroundColor: getScoreColor(score) },
                            currentArrowScores[arrowIndex] === score && styles.scoreCellSelected,
                          ]}
                          onPress={() => setArrowScore(arrowIndex, score)}
                        >
                          <Text
                            style={[
                              styles.scoreCellText,
                              { color: getScoreTextColor(score) },
                            ]}
                          >
                            {getScoreDisplay(score)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                {/* Round Total Preview */}
                <View style={styles.roundPreview}>
                  <Text style={styles.roundPreviewLabel}>Round Total:</Text>
                  <Text style={styles.roundPreviewValue}>
                    {currentArrowScores.reduce((sum, s) => sum + (s !== null ? getPointValue(s) : 0), 0)}
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowScoreEntry(false);
                      setCurrentArrowScores([null, null, null]);
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalConfirmButton,
                      !currentArrowScores.every(s => s !== null) && styles.modalConfirmButtonDisabled,
                    ]}
                    onPress={saveRoundScores}
                    disabled={!currentArrowScores.every(s => s !== null)}
                  >
                    <Text style={styles.modalConfirmButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#888', marginBottom: 8 },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  emptyText: { color: '#666', textAlign: 'center', paddingVertical: 20 },
  archerCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  archerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  archerInfo: { flex: 1 },
  archerName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  archerBowType: { fontSize: 12, color: '#888', marginTop: 2 },
  archerStats: { alignItems: 'flex-end', marginRight: 12 },
  archerTotal: { fontSize: 20, fontWeight: 'bold', color: '#FFD700' },
  archerXCount: { fontSize: 12, color: '#888' },
  removeButton: { padding: 8 },
  roundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roundCell: {
    width: '18%',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  roundCellComplete: { backgroundColor: '#1a3a1a' },
  roundLabel: { fontSize: 10, color: '#888' },
  roundScore: { fontSize: 16, fontWeight: 'bold', color: '#666' },
  roundScoreComplete: { color: '#4CAF50' },
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
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  generateButtonDisabled: { backgroundColor: '#444' },
  generateButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: { fontSize: 14, color: '#888', marginBottom: 8 },
  modalInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  bowTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  bowTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  bowTypeButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  bowTypeButtonText: { color: '#888', fontSize: 14 },
  bowTypeButtonTextSelected: { color: '#000', fontWeight: 'bold' },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  modalCancelButtonText: { color: '#fff', fontSize: 16 },
  modalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: { backgroundColor: '#444' },
  modalConfirmButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  arrowSection: { marginBottom: 16 },
  arrowLabel: { fontSize: 14, color: '#888', marginBottom: 8 },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scoreCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scoreCellSelected: { borderColor: '#fff' },
  scoreCellText: { fontSize: 14, fontWeight: 'bold' },
  roundPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  roundPreviewLabel: { fontSize: 16, color: '#888', marginRight: 8 },
  roundPreviewValue: { fontSize: 24, fontWeight: 'bold', color: '#FFD700' },
});
