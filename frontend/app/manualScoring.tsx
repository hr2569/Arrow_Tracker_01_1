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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ScoreKeeping() {
  const router = useRouter();
  const [archerName, setArcherName] = useState('');
  const [scores, setScores] = useState<number[]>([]);
  const [currentArrow, setCurrentArrow] = useState<number | null>(null);

  const availableScores = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]; // 11 = X

  const getScoreDisplay = (score: number) => {
    if (score === 11) return 'X';
    if (score === 0) return 'M';
    return score.toString();
  };

  const getScoreColor = (score: number) => {
    if (score === 11 || score >= 9) return '#FFD700';
    if (score >= 7) return '#ed1c24';
    if (score >= 5) return '#00a2e8';
    if (score >= 3) return '#2a2a2a';
    if (score >= 1) return '#f5f5f0';
    return '#666';
  };

  const getScoreTextColor = (score: number) => {
    if (score === 11 || score >= 9) return '#000';
    if (score >= 7) return '#fff';
    if (score >= 5) return '#fff';
    if (score >= 3) return '#fff';
    if (score >= 1) return '#000';
    return '#fff';
  };

  const getPointValue = (score: number) => score === 11 ? 10 : score;

  const addScore = (score: number) => {
    setScores([...scores, score]);
    setCurrentArrow(null);
  };

  const removeLastScore = () => {
    if (scores.length > 0) {
      setScores(scores.slice(0, -1));
    }
  };

  const clearAll = () => {
    Alert.alert(
      'Clear All Scores',
      'Are you sure you want to clear all recorded scores?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setScores([]) },
      ]
    );
  };

  const getTotalScore = () => scores.reduce((sum, s) => sum + getPointValue(s), 0);
  const getXCount = () => scores.filter(s => s === 11).length;

  // Group scores by rounds of 3
  const getRounds = () => {
    const rounds: number[][] = [];
    for (let i = 0; i < scores.length; i += 3) {
      rounds.push(scores.slice(i, i + 3));
    }
    return rounds;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Score Keeping</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
          <Ionicons name="trash-outline" size={24} color="#ed1c24" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Archer Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Archer's Name</Text>
          <TextInput
            style={styles.textInput}
            value={archerName}
            onChangeText={setArcherName}
            placeholder="Enter archer's name"
            placeholderTextColor="#666"
          />
        </View>

        {/* Score Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{getTotalScore()}</Text>
              <Text style={styles.summaryLabel}>Total Score</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{scores.length}</Text>
              <Text style={styles.summaryLabel}>Arrows</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FFD700' }]}>{getXCount()}</Text>
              <Text style={styles.summaryLabel}>X Count</Text>
            </View>
          </View>
        </View>

        {/* Recorded Scores by Round */}
        <View style={styles.scoresSection}>
          <Text style={styles.sectionTitle}>Recorded Scores</Text>
          {getRounds().length === 0 ? (
            <Text style={styles.noScoresText}>No scores recorded yet</Text>
          ) : (
            getRounds().map((round, roundIndex) => (
              <View key={roundIndex} style={styles.roundRow}>
                <Text style={styles.roundNumber}>R{roundIndex + 1}</Text>
                <View style={styles.roundScores}>
                  {round.map((score, idx) => (
                    <View
                      key={idx}
                      style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) }]}
                    >
                      <Text style={[styles.scoreBadgeText, { color: getScoreTextColor(score) }]}>
                        {getScoreDisplay(score)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.roundTotal}>
                  {round.reduce((sum, s) => sum + getPointValue(s), 0)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Current Arrow Indicator */}
        {scores.length > 0 && (
          <View style={styles.currentArrowSection}>
            <Text style={styles.currentArrowText}>
              Arrow {scores.length + 1} • Round {Math.floor(scores.length / 3) + 1}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Score Input Buttons */}
      <View style={styles.scoreInputSection}>
        <View style={styles.scoreButtonsGrid}>
          {availableScores.map((score) => (
            <TouchableOpacity
              key={score}
              style={[styles.scoreButton, { backgroundColor: getScoreColor(score) }]}
              onPress={() => addScore(score)}
            >
              <Text style={[styles.scoreButtonText, { color: getScoreTextColor(score) }]}>
                {getScoreDisplay(score)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.undoButton} onPress={removeLastScore}>
          <Ionicons name="arrow-undo" size={20} color="#FFD700" />
          <Text style={styles.undoButtonText}>Undo Last</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  scoresSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  noScoresText: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  roundNumber: {
    width: 32,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
  },
  roundScores: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  scoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  roundTotal: {
    width: 40,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'right',
  },
  currentArrowSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  currentArrowText: {
    fontSize: 14,
    color: '#888',
  },
  scoreInputSection: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 16,
  },
  scoreButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  scoreButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  scoreButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  undoButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
});
