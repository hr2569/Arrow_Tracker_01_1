import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 72; // Account for padding

type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

interface Session {
  id: string;
  name: string;
  total_score: number;
  rounds: any[];
  created_at: string;
}

interface GroupedSessions {
  label: string;
  sessions: Session[];
  totalScore: number;
  totalRounds: number;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sessions`);
      setSessions(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Group sessions by selected time period
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const groups: { [key: string]: Session[] } = {};

    sessions.forEach((session) => {
      const sessionDate = new Date(session.created_at);
      let groupKey: string;

      switch (selectedPeriod) {
        case 'day':
          groupKey = sessionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          break;
        case 'week':
          // Get the start of the week (Sunday)
          const weekStart = new Date(sessionDate);
          weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          groupKey = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          break;
        case 'month':
          groupKey = sessionDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          });
          break;
        case 'year':
          groupKey = sessionDate.getFullYear().toString();
          break;
        case 'all':
        default:
          groupKey = 'All Sessions';
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(session);
    });

    // Convert to array and sort by most recent first
    const result: GroupedSessions[] = Object.entries(groups).map(([label, sessionList]) => ({
      label,
      sessions: sessionList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      totalScore: sessionList.reduce((sum, s) => sum + (s.total_score || 0), 0),
      totalRounds: sessionList.reduce((sum, s) => sum + (s.rounds?.length || 0), 0),
    }));

    // Sort groups by most recent session in each group
    return result.sort((a, b) => {
      const aDate = new Date(a.sessions[0]?.created_at || 0).getTime();
      const bDate = new Date(b.sessions[0]?.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [sessions, selectedPeriod]);

  // Calculate stats for selected period
  const periodStats = useMemo(() => {
    const allSessionsInPeriod = groupedSessions.flatMap(g => g.sessions);
    return {
      totalSessions: allSessionsInPeriod.length,
      totalRounds: allSessionsInPeriod.reduce((sum, s) => sum + (s.rounds?.length || 0), 0),
      totalPoints: allSessionsInPeriod.reduce((sum, s) => sum + (s.total_score || 0), 0),
    };
  }, [groupedSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions();
  }, []);

  const handleDeleteSession = (sessionId: string) => {
    const performDelete = async () => {
      try {
        await axios.delete(`${API_URL}/api/sessions/${sessionId}`);
        setSessions(sessions.filter(s => s.id !== sessionId));
      } catch (err) {
        if (Platform.OS === 'web') {
          window.alert('Failed to delete session');
        } else {
          Alert.alert('Error', 'Failed to delete session');
        }
      }
    };

    if (Platform.OS === 'web') {
      // Use browser confirm for web
      if (window.confirm('Are you sure you want to delete this session?')) {
        performDelete();
      }
    } else {
      // Use native Alert for mobile
      Alert.alert(
        'Delete Session',
        'Are you sure you want to delete this session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAverageScore = (session: Session) => {
    if (!session.rounds || session.rounds.length === 0) return 0;
    return Math.round(session.total_score / session.rounds.length);
  };

  const toggleExpand = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  // Chart configuration for line chart
  const chartConfig = {
    backgroundColor: '#111111',
    backgroundGradientFrom: '#111111',
    backgroundGradientTo: '#111111',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(136, 136, 136, ${opacity})`,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#8B0000',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#333333',
      strokeWidth: 1,
    },
  };

  // Get round-by-round data for line chart
  const getRoundChartData = (session: Session) => {
    if (!session.rounds || session.rounds.length === 0) {
      return null;
    }
    
    const labels = session.rounds.map((_, i) => `R${i + 1}`);
    const data = session.rounds.map(r => r.total_score || 0);
    
    return {
      labels,
      datasets: [{ data, strokeWidth: 2 }],
    };
  };

  // Get all shots from a session for target visualization
  // Position shots based on their RING VALUE (the actual score) while preserving angle from coordinates
  const getAllShots = (session: Session) => {
    if (!session.rounds || session.rounds.length === 0) {
      return [];
    }
    
    const shots: { x: number; y: number; ring: number; roundIndex: number }[] = [];
    
    session.rounds.forEach((round, roundIndex) => {
      round.shots?.forEach((shot: any, shotIndex: number) => {
        const rawX = shot.x ?? 0.5;
        const rawY = shot.y ?? 0.5;
        const ring = shot.ring || 0;
        
        // Calculate angle from original coordinates (to preserve direction)
        const offsetX = rawX - 0.5;
        const offsetY = rawY - 0.5;
        let angle = Math.atan2(offsetY, offsetX);
        
        // If shot is at center, give it a pseudo-random angle based on index
        if (Math.abs(offsetX) < 0.01 && Math.abs(offsetY) < 0.01) {
          angle = (shotIndex * 137.5 * Math.PI / 180); // Golden angle for spread
        }
        
        // Calculate distance based on ring value
        // Ring 10 = center (0-10% of radius), Ring 1 = edge (90-100% of radius)
        // Place shot in the middle of its ring band
        const ringBandCenter = (10.5 - ring) / 10; // Ring 10 -> 0.05, Ring 1 -> 0.95
        const targetRadius = 0.4; // Matches scoring effectiveRadius
        const distance = ringBandCenter * targetRadius;
        
        // Convert polar to cartesian
        const visualX = 0.5 + Math.cos(angle) * distance;
        const visualY = 0.5 + Math.sin(angle) * distance;
        
        shots.push({
          x: Math.max(0.05, Math.min(0.95, visualX)),
          y: Math.max(0.05, Math.min(0.95, visualY)),
          ring: ring,
          roundIndex,
        });
      });
    });
    
    return shots;
  };

  // Target Hit Map Component
  const TargetHitMap = ({ session, size = 200 }: { session: Session; size?: number }) => {
    const shots = getAllShots(session);
    
    if (shots.length === 0) {
      return null;
    }

    // Ring colors matching the scoring screen
    const ringColors = [
      '#f5f5f0', // 1-2: White
      '#f5f5f0',
      '#2a2a2a', // 3-4: Black
      '#2a2a2a',
      '#00a2e8', // 5-6: Blue
      '#00a2e8',
      '#ed1c24', // 7-8: Red
      '#ed1c24',
      '#fff200', // 9-10: Gold
      '#fff200',
    ];

    // Round colors for differentiating rounds
    const roundColors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Gold
      '#BB8FCE', // Purple
      '#85C1E9', // Light Blue
    ];

    // The target fills 80% of the visualization (matching scoring's effectiveRadius = 0.4)
    const targetScale = 0.8; // Target fills 80% of the view

    return (
      <View style={[targetMapStyles.container, { width: size, height: size }]}>
        {/* Target Background - scaled to 80% of container */}
        <View style={[targetMapStyles.targetBackground, { width: size * targetScale, height: size * targetScale, borderRadius: (size * targetScale) / 2 }]}>
          {/* Draw rings from outside to inside */}
          {/* Scoring: Ring 1 at 90-100% normalized distance, Ring 10 at 0-10% */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ringNum) => {
            // Each ring spans 10% of the target radius
            // Ring 1: 90-100%, Ring 10: 0-10%
            const diameterPercent = (11 - ringNum) / 10;
            const ringSize = size * targetScale * diameterPercent;
            const bgColor = ringColors[ringNum - 1];
            return (
              <View
                key={`ring-${ringNum}`}
                style={[
                  targetMapStyles.ring,
                  {
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    backgroundColor: bgColor,
                    borderColor: ringNum <= 2 ? '#ccc' : ringNum <= 4 ? '#444' : ringNum <= 6 ? '#0077b3' : ringNum <= 8 ? '#b31217' : '#ccaa00',
                    borderWidth: 1,
                  },
                ]}
              />
            );
          })}
          
          {/* Center X mark */}
          <View style={targetMapStyles.centerMark}>
            <View style={targetMapStyles.centerLine} />
            <View style={[targetMapStyles.centerLine, { transform: [{ rotate: '90deg' }] }]} />
          </View>
          
          {/* Ring labels - show point values on the side */}
          <View style={targetMapStyles.ringLabelsContainer}>
            {[1, 3, 5, 7, 9].map((ringNum) => {
              const labelDistance = ((10.5 - ringNum) / 10) * targetScale * 0.5; // radius position
              return (
                <View
                  key={`label-${ringNum}`}
                  style={[
                    targetMapStyles.ringLabel,
                    { right: -25, top: `${50 - labelDistance * 100}%` }
                  ]}
                >
                  <Text style={targetMapStyles.ringLabelText}>{ringNum}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Plot shots */}
        {shots.map((shot, index) => {
          const dotSize = 12;
          const left = shot.x * size - dotSize / 2;
          const top = shot.y * size - dotSize / 2;
          const roundColor = roundColors[shot.roundIndex % roundColors.length];
          
          return (
            <View
              key={`shot-${index}`}
              style={[
                targetMapStyles.shotDot,
                {
                  left,
                  top,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: roundColor,
                },
              ]}
            >
              <Text style={targetMapStyles.shotLabel}>{shot.ring}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // Legend for round colors
  const RoundLegend = ({ session }: { session: Session }) => {
    if (!session.rounds || session.rounds.length <= 1) {
      return null;
    }

    const roundColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];

    return (
      <View style={targetMapStyles.legendContainer}>
        {session.rounds.map((round, index) => (
          <View key={index} style={targetMapStyles.legendItem}>
            <View style={[targetMapStyles.legendDot, { backgroundColor: roundColors[index % roundColors.length] }]} />
            <Text style={targetMapStyles.legendText}>R{index + 1}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B0000"
          />
        }
      >
        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {(['day', 'week', 'month', 'year', 'all'] as TimePeriod[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Overview */}
        {sessions.length > 0 && (
          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>
              {selectedPeriod === 'all' ? 'All Time Stats' : `Stats by ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`}
            </Text>
            <View style={styles.overviewStats}>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>{periodStats.totalSessions}</Text>
                <Text style={styles.overviewLabel}>Sessions</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>{periodStats.totalRounds}</Text>
                <Text style={styles.overviewLabel}>Rounds</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>{periodStats.totalPoints}</Text>
                <Text style={styles.overviewLabel}>Total Pts</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#888888" />
            <Text style={styles.emptyTitle}>No Sessions Yet</Text>
            <Text style={styles.emptyText}>
              Start a new scoring session to track your progress!
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/capture')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {groupedSessions.map((group) => (
              <View key={group.label} style={styles.groupContainer}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <View style={styles.groupTitleRow}>
                    <Ionicons 
                      name={selectedPeriod === 'day' ? 'today' : selectedPeriod === 'week' ? 'calendar' : selectedPeriod === 'month' ? 'calendar-outline' : 'time'} 
                      size={18} 
                      color="#8B0000" 
                    />
                    <Text style={styles.groupTitle}>{group.label}</Text>
                  </View>
                  <View style={styles.groupStats}>
                    <Text style={styles.groupStatText}>
                      {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''} • {group.totalScore} pts
                    </Text>
                  </View>
                </View>

                {/* Sessions in Group */}
                {group.sessions.map((session) => (
                  <View key={session.id} style={styles.sessionCard}>
                    <Pressable
                      onPress={() => toggleExpand(session.id)}
                      style={styles.sessionCardPressable}
                    >
                      <View style={styles.sessionHeader}>
                        <View style={styles.sessionInfo}>
                          <Text style={styles.sessionName}>{session.name}</Text>
                          <Text style={styles.sessionDate}>
                            {formatDate(session.created_at)}
                          </Text>
                        </View>
                        <View style={styles.sessionScore}>
                          <Text style={styles.scoreValue}>{session.total_score}</Text>
                          <Text style={styles.scoreLabel}>pts</Text>
                        </View>
                      </View>

                      <View style={styles.sessionMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="layers" size={16} color="#888888" />
                          <Text style={styles.metaText}>
                            {session.rounds?.length || 0} rounds
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="analytics" size={16} color="#888888" />
                          <Text style={styles.metaText}>
                            Avg: {getAverageScore(session)}/round
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    
                    {/* Delete button outside the main pressable area */}
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash" size={18} color="#ff6b6b" />
                    </Pressable>

                    {/* Expanded Details */}
                    {expandedSession === session.id && session.rounds && (
                      <View style={styles.expandedContent}>
                        <View style={styles.expandedDivider} />
                        
                        {/* Target Hit Map - Visual distribution of all hits */}
                        <View style={styles.chartSection}>
                          <Text style={styles.chartTitle}>
                            <Ionicons name="locate" size={16} color="#8B0000" /> Shot Distribution
                          </Text>
                          <View style={styles.targetMapWrapper}>
                            <TargetHitMap session={session} size={240} />
                          </View>
                          <RoundLegend session={session} />
                        </View>

                        {/* Score by Round Chart */}
                        {getRoundChartData(session) && session.rounds.length > 1 && (
                          <View style={styles.chartSection}>
                            <Text style={styles.chartTitle}>
                              <Ionicons name="trending-up" size={16} color="#8B0000" /> Score by Round
                            </Text>
                            <LineChart
                              data={getRoundChartData(session)!}
                              width={CHART_WIDTH}
                              height={160}
                              chartConfig={chartConfig}
                              bezier
                              style={styles.chart}
                              withInnerLines={true}
                              withOuterLines={false}
                              withVerticalLabels={true}
                              withHorizontalLabels={true}
                              fromZero={true}
                            />
                          </View>
                        )}

                        <Text style={styles.roundsTitle}>Round Details</Text>
                        {session.rounds.map((round, index) => (
                          <View key={round.id || index} style={styles.roundItem}>
                            <Text style={styles.roundNumber}>
                              Round {round.round_number || index + 1}
                            </Text>
                            <View style={styles.roundShots}>
                              {round.shots?.map((shot: any, shotIndex: number) => (
                                <View key={shotIndex} style={styles.shotBadge}>
                                  <Text style={styles.shotBadgeText}>
                                    {shot.ring || 0}
                                  </Text>
                                </View>
                              ))}
                            </View>
                            <Text style={styles.roundTotal}>
                              {round.total_score || 0}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.expandIndicator}>
                      <Ionicons
                        name={expandedSession === session.id ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#888888"
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/capture')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#8B0000',
  },
  periodButtonText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  overviewCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  overviewDivider: {
    width: 1,
    backgroundColor: '#333333',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sessionsList: {
    marginTop: 8,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupStats: {
    marginTop: 4,
  },
  groupStatText: {
    fontSize: 12,
    color: '#888888',
  },
  sessionCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  sessionCardPressable: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  sessionDate: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  sessionScore: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#888888',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 4,
  },
  deleteBtn: {
    marginLeft: 'auto',
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 8,
  },
  expandedContent: {
    marginTop: 12,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginBottom: 12,
  },
  chartSection: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
  targetMapWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  roundsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  roundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  roundNumber: {
    fontSize: 12,
    color: '#888888',
    width: 60,
  },
  roundShots: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  shotBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roundTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    width: 40,
    textAlign: 'right',
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B0000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});

// Styles for the Target Hit Map component
const targetMapStyles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBackground: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f0',
  },
  ring: {
    position: 'absolute',
  },
  centerMark: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLine: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: '#333',
  },
  ringLabelsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  ringLabel: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  ringLabelText: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shotDot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    opacity: 0.6,
  },
  shotLabel: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legendText: {
    color: '#888888',
    fontSize: 12,
  },
});
