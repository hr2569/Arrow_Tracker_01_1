import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SCREEN_WIDTH = Dimensions.get('window').width;

type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

interface Shot {
  x: number;
  y: number;
  ring: number;
}

interface Round {
  id?: string;
  round_number?: number;
  total_score?: number;
  shots?: Shot[];
}

interface Session {
  id: string;
  name: string;
  total_score: number;
  rounds: Round[];
  created_at: string;
}

export default function StatsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // Filter sessions by selected time period
  const filteredSessions = useMemo(() => {
    const now = new Date();
    
    return sessions.filter((session) => {
      const sessionDate = new Date(session.created_at);
      
      switch (selectedPeriod) {
        case 'day':
          return sessionDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return sessionDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return sessionDate >= monthAgo;
        case 'year':
          const yearAgo = new Date(now);
          yearAgo.setFullYear(now.getFullYear() - 1);
          return sessionDate >= yearAgo;
        case 'all':
        default:
          return true;
      }
    });
  }, [sessions, selectedPeriod]);

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const allShots: { x: number; y: number; ring: number }[] = [];
    let totalSessions = filteredSessions.length;
    let totalRounds = 0;
    let totalPoints = 0;
    let totalArrows = 0;
    const ringCounts: { [key: number]: number } = {};
    
    // Initialize ring counts
    for (let i = 0; i <= 10; i++) {
      ringCounts[i] = 0;
    }
    
    filteredSessions.forEach((session) => {
      totalPoints += session.total_score || 0;
      
      session.rounds?.forEach((round, roundIndex) => {
        totalRounds++;
        
        round.shots?.forEach((shot, shotIndex) => {
          totalArrows++;
          const ring = shot.ring || 0;
          ringCounts[ring] = (ringCounts[ring] || 0) + 1;
          
          // Calculate visual position based on ring value
          const rawX = shot.x ?? 0.5;
          const rawY = shot.y ?? 0.5;
          
          // Calculate angle from original coordinates (to preserve direction)
          const offsetX = rawX - 0.5;
          const offsetY = rawY - 0.5;
          let angle = Math.atan2(offsetY, offsetX);
          
          // If shot is at center, give it a pseudo-random angle
          if (Math.abs(offsetX) < 0.01 && Math.abs(offsetY) < 0.01) {
            angle = ((totalArrows * 137.5) * Math.PI / 180);
          }
          
          // Calculate distance based on ring value
          const ringBandCenter = (10.5 - ring) / 10;
          const targetRadius = 0.4;
          const distance = ringBandCenter * targetRadius;
          
          // Convert polar to cartesian
          const visualX = 0.5 + Math.cos(angle) * distance;
          const visualY = 0.5 + Math.sin(angle) * distance;
          
          allShots.push({
            x: Math.max(0.05, Math.min(0.95, visualX)),
            y: Math.max(0.05, Math.min(0.95, visualY)),
            ring: ring,
          });
        });
      });
    });
    
    const avgPerArrow = totalArrows > 0 ? (totalPoints / totalArrows).toFixed(1) : '0';
    const avgPerRound = totalRounds > 0 ? Math.round(totalPoints / totalRounds) : 0;
    
    return {
      totalSessions,
      totalRounds,
      totalPoints,
      totalArrows,
      avgPerArrow,
      avgPerRound,
      ringCounts,
      allShots,
    };
  }, [filteredSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions();
  }, []);

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return "Today's";
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'All Time';
    }
  };

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

  // Aggregated Target Hit Map Component
  const AggregatedTargetMap = ({ size = 280 }: { size?: number }) => {
    const shots = stats.allShots;
    
    if (shots.length === 0) {
      return (
        <View style={[targetMapStyles.emptyContainer, { width: size, height: size }]}>
          <Ionicons name="locate-outline" size={48} color="#888888" />
          <Text style={targetMapStyles.emptyText}>No shots in this period</Text>
        </View>
      );
    }

    const targetScale = 0.8;

    return (
      <View style={[targetMapStyles.container, { width: size, height: size }]}>
        {/* Target Background */}
        <View style={[targetMapStyles.targetBackground, { width: size * targetScale, height: size * targetScale, borderRadius: (size * targetScale) / 2 }]}>
          {/* Draw rings from outside to inside */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ringNum) => {
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
          
          {/* Ring labels */}
          <View style={targetMapStyles.ringLabelsContainer}>
            {[1, 3, 5, 7, 9].map((ringNum) => {
              const labelDistance = ((10.5 - ringNum) / 10) * targetScale * 0.5;
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

        {/* Plot all shots */}
        {shots.map((shot, index) => {
          const dotSize = 16;
          const left = shot.x * size - dotSize / 2;
          const top = shot.y * size - dotSize / 2;
          
          // Color based on score - higher scores are more vibrant
          const scoreColor = shot.ring >= 9 ? '#FFD700' : 
                            shot.ring >= 7 ? '#FF6B6B' : 
                            shot.ring >= 5 ? '#4ECDC4' : 
                            shot.ring >= 3 ? '#45B7D1' : '#888888';
          
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
                  backgroundColor: scoreColor,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Ring Distribution Bar Chart
  const RingDistribution = () => {
    const maxCount = Math.max(...Object.values(stats.ringCounts), 1);
    
    return (
      <View style={styles.ringDistribution}>
        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((ring) => {
          const count = stats.ringCounts[ring] || 0;
          const percentage = stats.totalArrows > 0 ? ((count / stats.totalArrows) * 100).toFixed(1) : '0';
          const barWidth = (count / maxCount) * 100;
          
          return (
            <View key={ring} style={styles.ringRow}>
              <Text style={styles.ringNumber}>{ring === 0 ? 'M' : ring}</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      width: `${barWidth}%`,
                      backgroundColor: ring >= 9 ? '#FFD700' : 
                                      ring >= 7 ? '#ed1c24' : 
                                      ring >= 5 ? '#00a2e8' : 
                                      ring >= 3 ? '#2a2a2a' : '#888888',
                    }
                  ]} 
                />
              </View>
              <Text style={styles.ringCount}>{count}</Text>
              <Text style={styles.ringPercent}>{percentage}%</Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={styles.loadingText}>Loading stats...</Text>
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
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>{getPeriodLabel()} Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalRounds}</Text>
              <Text style={styles.statLabel}>Rounds</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalArrows}</Text>
              <Text style={styles.statLabel}>Arrows</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalPoints}</Text>
              <Text style={styles.statLabel}>Total Pts</Text>
            </View>
          </View>

          <View style={styles.avgSection}>
            <View style={styles.avgItem}>
              <Ionicons name="analytics" size={20} color="#8B0000" />
              <Text style={styles.avgText}>Avg per Arrow: <Text style={styles.avgValue}>{stats.avgPerArrow}</Text></Text>
            </View>
            <View style={styles.avgItem}>
              <Ionicons name="layers" size={20} color="#8B0000" />
              <Text style={styles.avgText}>Avg per Round: <Text style={styles.avgValue}>{stats.avgPerRound}</Text></Text>
            </View>
          </View>
        </View>

        {/* Shot Distribution Map */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="locate" size={18} color="#8B0000" /> Shot Distribution
          </Text>
          <Text style={styles.sectionSubtitle}>All {stats.totalArrows} arrows from {stats.totalSessions} sessions</Text>
          <View style={styles.targetWrapper}>
            <AggregatedTargetMap size={SCREEN_WIDTH - 80} />
          </View>
          
          {/* Color Legend */}
          <View style={styles.colorLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
              <Text style={styles.legendText}>9-10</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.legendText}>7-8</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
              <Text style={styles.legendText}>5-6</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#45B7D1' }]} />
              <Text style={styles.legendText}>3-4</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#888888' }]} />
              <Text style={styles.legendText}>0-2</Text>
            </View>
          </View>
        </View>

        {/* Ring Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="bar-chart" size={18} color="#8B0000" /> Score Breakdown
          </Text>
          <RingDistribution />
        </View>

        {/* Empty State */}
        {stats.totalArrows === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color="#888888" />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              Complete some scoring sessions to see your statistics!
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/sessionType')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  statsCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  statLabel: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
  avgSection: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 16,
    gap: 12,
  },
  avgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avgText: {
    color: '#888888',
    fontSize: 14,
  },
  avgValue: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 16,
  },
  targetWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  colorLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  ringDistribution: {
    gap: 8,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ringNumber: {
    width: 24,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#222222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  ringCount: {
    width: 32,
    fontSize: 12,
    color: '#fff',
    textAlign: 'right',
  },
  ringPercent: {
    width: 48,
    fontSize: 12,
    color: '#888888',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
});

// Styles for the Target Hit Map component
const targetMapStyles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    borderRadius: 16,
  },
  emptyText: {
    color: '#888888',
    marginTop: 12,
    fontSize: 14,
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
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 4,
  },
});
