import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type ReportPeriod = 'week' | 'month' | 'year' | 'custom' | 'all';

interface Session {
  id: string;
  name: string;
  total_score: number;
  rounds: any[];
  created_at: string;
  bow_name?: string;
  distance?: string;
}

export default function ReportScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month');
  const [showReport, setShowReport] = useState(false);
  
  // Custom date range
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sessions`);
      setSessions(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update date range when period changes
  useEffect(() => {
    const now = new Date();
    let newStartDate = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        newStartDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        newStartDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        newStartDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        newStartDate = new Date(2020, 0, 1); // Far back date
        break;
      case 'custom':
        // Don't change dates for custom
        return;
    }
    
    setStartDate(newStartDate);
    setEndDate(now);
  }, [selectedPeriod]);

  // Filter sessions by date range
  const filteredSessions = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return sessions.filter((session) => {
      const sessionDate = new Date(session.created_at);
      return sessionDate >= start && sessionDate <= end;
    });
  }, [sessions, startDate, endDate]);

  // Calculate report statistics
  const reportStats = useMemo(() => {
    let totalPoints = 0;
    let totalArrows = 0;
    let totalRounds = 0;
    let bestSession = { score: 0, name: '', date: '' };
    let worstSession = { score: Infinity, name: '', date: '' };
    const bowStats: { [key: string]: { sessions: number, points: number, arrows: number } } = {};
    const distanceStats: { [key: string]: { sessions: number, points: number, arrows: number } } = {};

    filteredSessions.forEach((session) => {
      totalPoints += session.total_score || 0;
      
      if (session.total_score > bestSession.score) {
        bestSession = { 
          score: session.total_score, 
          name: session.name,
          date: new Date(session.created_at).toLocaleDateString()
        };
      }
      if (session.total_score < worstSession.score) {
        worstSession = { 
          score: session.total_score, 
          name: session.name,
          date: new Date(session.created_at).toLocaleDateString()
        };
      }

      if (session.bow_name) {
        if (!bowStats[session.bow_name]) {
          bowStats[session.bow_name] = { sessions: 0, points: 0, arrows: 0 };
        }
        bowStats[session.bow_name].sessions++;
        bowStats[session.bow_name].points += session.total_score || 0;
      }

      if (session.distance) {
        if (!distanceStats[session.distance]) {
          distanceStats[session.distance] = { sessions: 0, points: 0, arrows: 0 };
        }
        distanceStats[session.distance].sessions++;
        distanceStats[session.distance].points += session.total_score || 0;
      }

      session.rounds?.forEach((round) => {
        totalRounds++;
        const arrowCount = round.shots?.length || 0;
        totalArrows += arrowCount;
        
        if (session.bow_name) {
          bowStats[session.bow_name].arrows += arrowCount;
        }
        if (session.distance) {
          distanceStats[session.distance].arrows += arrowCount;
        }
      });
    });

    if (worstSession.score === Infinity) {
      worstSession = { score: 0, name: '-', date: '-' };
    }

    return {
      totalSessions: filteredSessions.length,
      totalRounds,
      totalPoints,
      totalArrows,
      avgPerArrow: totalArrows > 0 ? (totalPoints / totalArrows).toFixed(1) : '0',
      avgPerRound: totalRounds > 0 ? Math.round(totalPoints / totalRounds) : 0,
      avgPerSession: filteredSessions.length > 0 ? Math.round(totalPoints / filteredSessions.length) : 0,
      bestSession,
      worstSession,
      bowStats,
      distanceStats,
    };
  }, [filteredSessions]);

  const formatDateRange = () => {
    const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  // Generate shareable report text
  const generateReportText = () => {
    let report = `🎯 ARCHERY REPORT\n`;
    report += `Period: ${formatDateRange()}\n`;
    report += `Generated: ${new Date().toLocaleDateString()}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    report += `📊 OVERVIEW\n`;
    report += `• Sessions: ${reportStats.totalSessions}\n`;
    report += `• Rounds: ${reportStats.totalRounds}\n`;
    report += `• Arrows Shot: ${reportStats.totalArrows}\n`;
    report += `• Total Points: ${reportStats.totalPoints}\n\n`;
    
    report += `📈 AVERAGES\n`;
    report += `• Per Arrow: ${reportStats.avgPerArrow}\n`;
    report += `• Per Round: ${reportStats.avgPerRound}\n`;
    report += `• Per Session: ${reportStats.avgPerSession}\n\n`;
    
    if (reportStats.totalSessions > 0) {
      report += `🏆 HIGHLIGHTS\n`;
      report += `• Best Session: ${reportStats.bestSession.score} pts (${reportStats.bestSession.date})\n`;
      report += `• Lowest Session: ${reportStats.worstSession.score} pts (${reportStats.worstSession.date})\n\n`;
    }

    const bowEntries = Object.entries(reportStats.bowStats);
    if (bowEntries.length > 0) {
      report += `🏹 BY BOW\n`;
      bowEntries.forEach(([bow, stats]) => {
        const avg = stats.arrows > 0 ? (stats.points / stats.arrows).toFixed(1) : '0';
        report += `• ${bow}: ${stats.sessions} sessions, ${avg} avg/arrow\n`;
      });
      report += `\n`;
    }

    const distanceEntries = Object.entries(reportStats.distanceStats);
    if (distanceEntries.length > 0) {
      report += `📏 BY DISTANCE\n`;
      distanceEntries.forEach(([distance, stats]) => {
        const avg = stats.arrows > 0 ? (stats.points / stats.arrows).toFixed(1) : '0';
        report += `• ${distance}: ${stats.sessions} sessions, ${avg} avg/arrow\n`;
      });
    }

    return report;
  };

  const handleShare = async () => {
    const reportText = generateReportText();
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(reportText);
        alert('Report copied to clipboard!');
      } else {
        await Share.share({
          message: reportText,
          title: 'Archery Report',
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      setSelectedPeriod('custom');
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      setSelectedPeriod('custom');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Date Selection Screen
  if (!showReport) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generate Report</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Icon and Title */}
          <View style={styles.selectionHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text" size={48} color="#8B0000" />
            </View>
            <Text style={styles.selectionTitle}>Select Time Range</Text>
            <Text style={styles.selectionSubtitle}>
              Choose the period for your performance report
            </Text>
          </View>

          {/* Quick Select Buttons */}
          <View style={styles.quickSelectContainer}>
            <Text style={styles.sectionLabel}>Quick Select</Text>
            <View style={styles.quickSelectGrid}>
              {[
                { key: 'week', label: 'Last Week', icon: 'calendar-outline' },
                { key: 'month', label: 'Last Month', icon: 'calendar' },
                { key: 'year', label: 'Last Year', icon: 'albums-outline' },
                { key: 'all', label: 'All Time', icon: 'infinite' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.quickSelectButton,
                    selectedPeriod === item.key && styles.quickSelectButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(item.key as ReportPeriod)}
                >
                  <Ionicons 
                    name={item.icon as any} 
                    size={24} 
                    color={selectedPeriod === item.key ? '#fff' : '#8B0000'} 
                  />
                  <Text style={[
                    styles.quickSelectText,
                    selectedPeriod === item.key && styles.quickSelectTextActive,
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Date Range */}
          <View style={styles.customRangeContainer}>
            <Text style={styles.sectionLabel}>Custom Range</Text>
            
            {/* Start Date */}
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>From</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    setStartDate(new Date(e.target.value));
                    setSelectedPeriod('custom');
                  }}
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    flex: 1,
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#8B0000" />
                  <Text style={styles.dateButtonText}>
                    {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* End Date */}
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>To</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={endDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    setEndDate(new Date(e.target.value));
                    setSelectedPeriod('custom');
                  }}
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    flex: 1,
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#8B0000" />
                  <Text style={styles.dateButtonText}>
                    {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {showStartPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
                maximumDate={endDate}
              />
            )}

            {showEndPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={handleEndDateChange}
                minimumDate={startDate}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Summary Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Report Preview</Text>
            <View style={styles.previewRow}>
              <Ionicons name="calendar" size={18} color="#888" />
              <Text style={styles.previewText}>{formatDateRange()}</Text>
            </View>
            <View style={styles.previewRow}>
              <Ionicons name="layers" size={18} color="#888" />
              <Text style={styles.previewText}>
                {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => setShowReport(true)}
          >
            <Ionicons name="document-text" size={24} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Report</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Report Display Screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setShowReport(false)}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#8B0000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Report Header */}
        <View style={styles.reportHeader}>
          <Ionicons name="document-text" size={32} color="#8B0000" />
          <Text style={styles.reportTitle}>Performance Report</Text>
          <Text style={styles.reportDate}>{formatDateRange()}</Text>
        </View>

        {/* Overview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="stats-chart" size={18} color="#8B0000" /> Overview
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reportStats.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reportStats.totalRounds}</Text>
              <Text style={styles.statLabel}>Rounds</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reportStats.totalArrows}</Text>
              <Text style={styles.statLabel}>Arrows</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reportStats.totalPoints}</Text>
              <Text style={styles.statLabel}>Total Points</Text>
            </View>
          </View>
        </View>

        {/* Averages Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="analytics" size={18} color="#8B0000" /> Averages
          </Text>
          <View style={styles.avgList}>
            <View style={styles.avgRow}>
              <Text style={styles.avgLabel}>Per Arrow</Text>
              <Text style={styles.avgValue}>{reportStats.avgPerArrow}</Text>
            </View>
            <View style={styles.avgRow}>
              <Text style={styles.avgLabel}>Per Round</Text>
              <Text style={styles.avgValue}>{reportStats.avgPerRound}</Text>
            </View>
            <View style={styles.avgRow}>
              <Text style={styles.avgLabel}>Per Session</Text>
              <Text style={styles.avgValue}>{reportStats.avgPerSession}</Text>
            </View>
          </View>
        </View>

        {/* Highlights Card */}
        {reportStats.totalSessions > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="trophy" size={18} color="#8B0000" /> Highlights
            </Text>
            <View style={styles.highlightRow}>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>Best Session</Text>
                <Text style={styles.highlightValue}>{reportStats.bestSession.score} pts</Text>
                <Text style={styles.highlightDate}>{reportStats.bestSession.date}</Text>
              </View>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>Lowest Session</Text>
                <Text style={styles.highlightValueLow}>{reportStats.worstSession.score} pts</Text>
                <Text style={styles.highlightDate}>{reportStats.worstSession.date}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bow Breakdown Card */}
        {Object.keys(reportStats.bowStats).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="arrow-forward-outline" size={18} color="#8B0000" /> By Bow
            </Text>
            {Object.entries(reportStats.bowStats).map(([bow, stats]) => (
              <View key={bow} style={styles.breakdownRow}>
                <View style={styles.breakdownInfo}>
                  <Text style={styles.breakdownName}>{bow}</Text>
                  <Text style={styles.breakdownSub}>{stats.sessions} sessions • {stats.arrows} arrows</Text>
                </View>
                <View style={styles.breakdownStats}>
                  <Text style={styles.breakdownValue}>
                    {stats.arrows > 0 ? (stats.points / stats.arrows).toFixed(1) : '0'}
                  </Text>
                  <Text style={styles.breakdownLabel}>avg/arrow</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Distance Breakdown Card */}
        {Object.keys(reportStats.distanceStats).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="locate" size={18} color="#8B0000" /> By Distance
            </Text>
            {Object.entries(reportStats.distanceStats).map(([distance, stats]) => (
              <View key={distance} style={styles.breakdownRow}>
                <View style={styles.breakdownInfo}>
                  <Text style={styles.breakdownName}>{distance}</Text>
                  <Text style={styles.breakdownSub}>{stats.sessions} sessions • {stats.arrows} arrows</Text>
                </View>
                <View style={styles.breakdownStats}>
                  <Text style={styles.breakdownValue}>
                    {stats.arrows > 0 ? (stats.points / stats.arrows).toFixed(1) : '0'}
                  </Text>
                  <Text style={styles.breakdownLabel}>avg/arrow</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {reportStats.totalSessions === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#888888" />
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptyText}>
              No sessions found for this period. Try selecting a different date range.
            </Text>
          </View>
        )}

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButtonLarge} onPress={handleShare}>
          <Ionicons name="share-social" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>Share Report</Text>
        </TouchableOpacity>

        {/* Edit Range Button */}
        <TouchableOpacity 
          style={styles.editRangeButton} 
          onPress={() => setShowReport(false)}
        >
          <Ionicons name="calendar-outline" size={20} color="#8B0000" />
          <Text style={styles.editRangeButtonText}>Change Date Range</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  shareButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888888',
    marginTop: 12,
  },
  // Selection Screen Styles
  selectionHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectionSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickSelectContainer: {
    marginBottom: 24,
  },
  quickSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickSelectButton: {
    width: '47%',
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  quickSelectButtonActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  quickSelectText: {
    color: '#8B0000',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  quickSelectTextActive: {
    color: '#fff',
  },
  customRangeContainer: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    width: 50,
    fontSize: 14,
    color: '#888888',
    fontWeight: '600',
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  previewCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#fff',
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Report Display Styles
  reportHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  reportDate: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  avgList: {
    gap: 12,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avgLabel: {
    fontSize: 14,
    color: '#888888',
  },
  avgValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  highlightItem: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
  },
  highlightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  highlightValueLow: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  highlightDate: {
    fontSize: 11,
    color: '#666666',
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  breakdownSub: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  breakdownStats: {
    alignItems: 'flex-end',
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  breakdownLabel: {
    fontSize: 10,
    color: '#888888',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  shareButtonLarge: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editRangeButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  editRangeButtonText: {
    color: '#8B0000',
    fontSize: 14,
    fontWeight: '600',
  },
});
