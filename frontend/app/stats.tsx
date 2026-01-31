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
import Svg, { Defs, RadialGradient, Stop, Circle, G } from 'react-native-svg';
import { getSessions, Session } from '../utils/localStorage';

const SCREEN_WIDTH = Dimensions.get('window').width;

type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

// Helper function to get target type display name
const getTargetTypeName = (type?: string): string => {
  switch (type) {
    case 'vegas_3spot': return 'Vegas 3-Spot';
    case 'nfaa_indoor': return 'NFAA Indoor';
    case 'wa_standard': 
    default: return 'WA Standard';
  }
};

type ViewMode = 'distribution' | 'heatmap';

export default function StatsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('distribution');
  const [bowFilter, setBowFilter] = useState<string | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<string | null>(null);
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('wa_standard');

  // Get unique bows and distances for filters
  const availableBows = useMemo(() => {
    const bows = sessions
      .filter(s => s.bow_name)
      .map(s => s.bow_name as string);
    return [...new Set(bows)];
  }, [sessions]);

  const availableDistances = useMemo(() => {
    const distances = sessions
      .filter(s => s.distance)
      .map(s => s.distance as string);
    return [...new Set(distances)];
  }, [sessions]);

  const availableTargetTypes = useMemo(() => {
    const types = sessions.map(s => s.target_type || 'wa_standard');
    const uniqueTypes = [...new Set(types)];
    const sortedTypes = uniqueTypes.sort((a, b) => {
      if (a === 'wa_standard') return -1;
      if (b === 'wa_standard') return 1;
      return a.localeCompare(b);
    });
    return sortedTypes;
  }, [sessions]);

  useEffect(() => {
    if (availableTargetTypes.length > 0 && !availableTargetTypes.includes(targetTypeFilter)) {
      setTargetTypeFilter(availableTargetTypes[0]);
    }
  }, [availableTargetTypes]);

  const fetchSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
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

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const now = new Date();
    
    return sessions.filter((session) => {
      if (bowFilter && session.bow_name !== bowFilter) return false;
      if (distanceFilter && session.distance !== distanceFilter) return false;
      const sessionTargetType = session.target_type || 'wa_standard';
      if (sessionTargetType !== targetTypeFilter) return false;
      
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
  }, [sessions, selectedPeriod, bowFilter, distanceFilter, targetTypeFilter]);

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const allShots: { x: number; y: number; rawX: number; rawY: number; ring: number }[] = [];
    let totalSessions = filteredSessions.length;
    let totalRounds = 0;
    let totalPoints = 0;
    let totalArrows = 0;
    const ringCounts: { [key: number]: number } = {};
    
    for (let i = 0; i <= 10; i++) {
      ringCounts[i] = 0;
    }
    
    filteredSessions.forEach((session) => {
      totalPoints += session.total_score || 0;
      
      session.rounds?.forEach((round) => {
        totalRounds++;
        
        round.shots?.forEach((shot: any) => {
          totalArrows++;
          const ring = shot.ring || 0;
          ringCounts[ring] = (ringCounts[ring] || 0) + 1;
          
          const rawX = shot.x ?? 0.5;
          const rawY = shot.y ?? 0.5;
          
          const offsetX = rawX - 0.5;
          const offsetY = rawY - 0.5;
          let angle = Math.atan2(offsetY, offsetX);
          
          if (Math.abs(offsetX) < 0.01 && Math.abs(offsetY) < 0.01) {
            angle = ((totalArrows * 137.5) * Math.PI / 180);
          }
          
          const ringBandCenter = (10.5 - ring) / 10;
          const targetRadius = 0.4;
          const distance = ringBandCenter * targetRadius;
          
          const visualX = 0.5 + Math.cos(angle) * distance;
          const visualY = 0.5 + Math.sin(angle) * distance;
          
          allShots.push({
            x: Math.max(0.05, Math.min(0.95, visualX)),
            y: Math.max(0.05, Math.min(0.95, visualY)),
            rawX: rawX,
            rawY: rawY,
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

  // Calculate stats by target type (for all sessions, not filtered by target type)
  const statsByTargetType = useMemo(() => {
    const now = new Date();
    
    // Filter sessions by time period only (not by target type)
    const timeFilteredSessions = sessions.filter((session) => {
      if (bowFilter && session.bow_name !== bowFilter) return false;
      if (distanceFilter && session.distance !== distanceFilter) return false;
      
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

    const targetTypes = ['wa_standard', 'vegas_3spot', 'nfaa_indoor'];
    const result: { [key: string]: { sessions: number; arrows: number; points: number; avgPerArrow: string } } = {};

    targetTypes.forEach(targetType => {
      const sessionsForType = timeFilteredSessions.filter(s => (s.target_type || 'wa_standard') === targetType);
      let totalArrows = 0;
      let totalPoints = 0;

      sessionsForType.forEach(session => {
        totalPoints += session.total_score || 0;
        session.rounds?.forEach(round => {
          round.shots?.forEach(() => {
            totalArrows++;
          });
        });
      });

      result[targetType] = {
        sessions: sessionsForType.length,
        arrows: totalArrows,
        points: totalPoints,
        avgPerArrow: totalArrows > 0 ? (totalPoints / totalArrows).toFixed(1) : '0',
      };
    });

    return result;
  }, [sessions, selectedPeriod, bowFilter, distanceFilter]);

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

  const ringColors = [
    '#f5f5f0', '#f5f5f0',
    '#2a2a2a', '#2a2a2a',
    '#00a2e8', '#00a2e8',
    '#ed1c24', '#ed1c24',
    '#fff200', '#fff200',
  ];

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

        {/* Filter Buttons */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Target:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {availableTargetTypes.length > 0 ? (
                availableTargetTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, targetTypeFilter === type && styles.filterChipActive]}
                    onPress={() => setTargetTypeFilter(type)}
                  >
                    <Text style={[styles.filterChipText, targetTypeFilter === type && styles.filterChipTextActive]}>{getTargetTypeName(type)}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                ['wa_standard', 'vegas_3spot', 'nfaa_indoor'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, targetTypeFilter === type && styles.filterChipActive]}
                    onPress={() => setTargetTypeFilter(type)}
                  >
                    <Text style={[styles.filterChipText, targetTypeFilter === type && styles.filterChipTextActive]}>{getTargetTypeName(type)}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
          
          {availableBows.length > 0 && (
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Bow:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, !bowFilter && styles.filterChipActive]}
                  onPress={() => setBowFilter(null)}
                >
                  <Text style={[styles.filterChipText, !bowFilter && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {availableBows.map((bow) => (
                  <TouchableOpacity
                    key={bow}
                    style={[styles.filterChip, bowFilter === bow && styles.filterChipActive]}
                    onPress={() => setBowFilter(bowFilter === bow ? null : bow)}
                  >
                    <Text style={[styles.filterChipText, bowFilter === bow && styles.filterChipTextActive]}>{bow}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {availableDistances.length > 0 && (
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Distance:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, !distanceFilter && styles.filterChipActive]}
                  onPress={() => setDistanceFilter(null)}
                >
                  <Text style={[styles.filterChipText, !distanceFilter && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {availableDistances.map((distance) => (
                  <TouchableOpacity
                    key={distance}
                    style={[styles.filterChip, distanceFilter === distance && styles.filterChipActive]}
                    onPress={() => setDistanceFilter(distanceFilter === distance ? null : distance)}
                  >
                    <Text style={[styles.filterChipText, distanceFilter === distance && styles.filterChipTextActive]}>{distance}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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

        {/* Ring Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="bar-chart" size={18} color="#8B0000" /> Score Breakdown
          </Text>
          <RingDistribution />
        </View>

        {/* Stats by Target Type */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="apps" size={18} color="#8B0000" /> Stats by Target Type
          </Text>
          <View style={styles.targetTypeStats}>
            {['wa_standard', 'vegas_3spot', 'nfaa_indoor'].map((targetType) => {
              const typeStats = statsByTargetType[targetType];
              if (!typeStats || typeStats.sessions === 0) return null;
              return (
                <View key={targetType} style={styles.targetTypeRow}>
                  <View style={styles.targetTypeHeader}>
                    <Text style={styles.targetTypeName}>{getTargetTypeName(targetType)}</Text>
                    <Text style={styles.targetTypeAvg}>Avg: {typeStats.avgPerArrow}/arrow</Text>
                  </View>
                  <View style={styles.targetTypeDetails}>
                    <View style={styles.targetTypeStat}>
                      <Text style={styles.targetTypeValue}>{typeStats.sessions}</Text>
                      <Text style={styles.targetTypeLabel}>Sessions</Text>
                    </View>
                    <View style={styles.targetTypeStat}>
                      <Text style={styles.targetTypeValue}>{typeStats.arrows}</Text>
                      <Text style={styles.targetTypeLabel}>Arrows</Text>
                    </View>
                    <View style={styles.targetTypeStat}>
                      <Text style={styles.targetTypeValue}>{typeStats.points}</Text>
                      <Text style={styles.targetTypeLabel}>Points</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {Object.values(statsByTargetType).every(s => s.sessions === 0) && (
              <Text style={styles.noDataText}>No sessions recorded yet</Text>
            )}
          </View>
        </View>

        {/* Shot Heatmap */}
        {stats.totalArrows > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="locate" size={18} color="#8B0000" /> Shot Distribution ({getTargetTypeName(targetTypeFilter)})
            </Text>
            <View style={styles.heatmapContainer}>
              <Svg width={SCREEN_WIDTH - 80} height={SCREEN_WIDTH - 80} viewBox="0 0 200 200">
                {/* Target rings background */}
                <G>
                  {/* Outer rings - White */}
                  <Circle cx="100" cy="100" r="95" fill="#f5f5f0" stroke="#333" strokeWidth="0.5" />
                  <Circle cx="100" cy="100" r="85.5" fill="#f5f5f0" stroke="#333" strokeWidth="0.5" />
                  {/* Black rings */}
                  <Circle cx="100" cy="100" r="76" fill="#2a2a2a" stroke="#555" strokeWidth="0.5" />
                  <Circle cx="100" cy="100" r="66.5" fill="#2a2a2a" stroke="#555" strokeWidth="0.5" />
                  {/* Blue rings */}
                  <Circle cx="100" cy="100" r="57" fill="#00a2e8" stroke="#0077b3" strokeWidth="0.5" />
                  <Circle cx="100" cy="100" r="47.5" fill="#00a2e8" stroke="#0077b3" strokeWidth="0.5" />
                  {/* Red rings */}
                  <Circle cx="100" cy="100" r="38" fill="#ed1c24" stroke="#b31217" strokeWidth="0.5" />
                  <Circle cx="100" cy="100" r="28.5" fill="#ed1c24" stroke="#b31217" strokeWidth="0.5" />
                  {/* Gold rings */}
                  <Circle cx="100" cy="100" r="19" fill="#fff200" stroke="#ccaa00" strokeWidth="0.5" />
                  <Circle cx="100" cy="100" r="9.5" fill="#fff200" stroke="#ccaa00" strokeWidth="0.5" />
                </G>
                
                {/* Shot markers */}
                {stats.allShots.map((shot, index) => {
                  // Use raw x,y coordinates for heatmap display
                  const cx = shot.rawX * 200;
                  const cy = shot.rawY * 200;
                  const fillColor = shot.ring >= 9 ? 'rgba(255, 0, 0, 0.7)' : 
                                   shot.ring >= 7 ? 'rgba(255, 100, 100, 0.7)' : 
                                   shot.ring >= 5 ? 'rgba(255, 150, 150, 0.7)' : 
                                   'rgba(255, 200, 200, 0.6)';
                  return (
                    <Circle
                      key={`shot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={fillColor}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth={0.5}
                    />
                  );
                })}
              </Svg>
            </View>
            <Text style={styles.heatmapLabel}>
              {stats.totalArrows} arrows shown • Filtered by {getTargetTypeName(targetTypeFilter)}
            </Text>
          </View>
        )}

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
              onPress={() => router.push('/sessionSetup')}
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
  filterSection: {
    marginBottom: 16,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    width: 60,
  },
  filterScroll: {
    flex: 1,
  },
  filterChip: {
    backgroundColor: '#111111',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterChipActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  filterChipText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
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
    marginBottom: 16,
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
  heatmapContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 8,
  },
  heatmapLabel: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
