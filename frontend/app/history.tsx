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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  bow_name?: string;
  bow_id?: string;
  distance?: string;
  target_type?: string;
}

// Helper function to get target type display name
const getTargetTypeName = (type?: string): string => {
  switch (type) {
    case 'vegas_3spot': return 'Vegas 3-Spot';
    case 'nfaa_indoor': return 'NFAA Indoor';
    case 'wa_standard': 
    default: return 'WA Standard';
  }
};

// Mini Target Face Component
const MiniTargetFace = ({ targetType, size = 44 }: { targetType?: string, size?: number }) => {
  const type = targetType || 'wa_standard';
  const miniSize = size * 0.35;
  
  if (type === 'vegas_3spot') {
    // Inverted triangle: 1 on top, 2 on bottom
    return (
      <View style={[miniTargetStyles.container, { width: size, height: size }]}>
        <View style={miniTargetStyles.vegasTriangle}>
          <View style={miniTargetStyles.vegasTopRow}>
            <View style={[miniTargetStyles.ring, { backgroundColor: '#00a2e8', width: miniSize, height: miniSize }]}>
              <View style={[miniTargetStyles.ring, { backgroundColor: '#ed1c24', width: miniSize * 0.65, height: miniSize * 0.65 }]}>
                <View style={[miniTargetStyles.ring, { backgroundColor: '#fff200', width: miniSize * 0.35, height: miniSize * 0.35 }]} />
              </View>
            </View>
          </View>
          <View style={miniTargetStyles.vegasBottomRow}>
            <View style={[miniTargetStyles.ring, { backgroundColor: '#00a2e8', width: miniSize, height: miniSize }]}>
              <View style={[miniTargetStyles.ring, { backgroundColor: '#ed1c24', width: miniSize * 0.65, height: miniSize * 0.65 }]}>
                <View style={[miniTargetStyles.ring, { backgroundColor: '#fff200', width: miniSize * 0.35, height: miniSize * 0.35 }]} />
              </View>
            </View>
            <View style={[miniTargetStyles.ring, { backgroundColor: '#00a2e8', width: miniSize, height: miniSize }]}>
              <View style={[miniTargetStyles.ring, { backgroundColor: '#ed1c24', width: miniSize * 0.65, height: miniSize * 0.65 }]}>
                <View style={[miniTargetStyles.ring, { backgroundColor: '#fff200', width: miniSize * 0.35, height: miniSize * 0.35 }]} />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  if (type === 'nfaa_indoor') {
    // Vertical stack: 3 targets
    const nfaaSize = miniSize * 0.85;
    return (
      <View style={[miniTargetStyles.container, { width: size, height: size }]}>
        <View style={miniTargetStyles.nfaaVertical}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[miniTargetStyles.ring, { backgroundColor: '#00a2e8', width: nfaaSize, height: nfaaSize }]}>
              <View style={[miniTargetStyles.ring, { backgroundColor: '#ed1c24', width: nfaaSize * 0.65, height: nfaaSize * 0.65 }]}>
                <View style={[miniTargetStyles.ring, { backgroundColor: '#fff200', width: nfaaSize * 0.35, height: nfaaSize * 0.35 }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  
  // WA Standard - single target with all rings
  const waSize = size * 0.9;
  return (
    <View style={[miniTargetStyles.container, { width: size, height: size }]}>
      <View style={[miniTargetStyles.ring, { backgroundColor: '#FFFFFF', width: waSize, height: waSize, borderWidth: 1, borderColor: '#ddd' }]}>
        <View style={[miniTargetStyles.ring, { backgroundColor: '#000000', width: waSize * 0.85, height: waSize * 0.85 }]}>
          <View style={[miniTargetStyles.ring, { backgroundColor: '#00a2e8', width: waSize * 0.7, height: waSize * 0.7 }]}>
            <View style={[miniTargetStyles.ring, { backgroundColor: '#ed1c24', width: waSize * 0.5, height: waSize * 0.5 }]}>
              <View style={[miniTargetStyles.ring, { backgroundColor: '#fff200', width: waSize * 0.3, height: waSize * 0.3 }]} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const miniTargetStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegasTriangle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegasTopRow: {
    marginBottom: 2,
  },
  vegasBottomRow: {
    flexDirection: 'row',
    gap: 3,
  },
  nfaaVertical: {
    flexDirection: 'column',
    gap: 2,
    alignItems: 'center',
  },
});

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
  const [bowFilter, setBowFilter] = useState<string | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<string | null>(null);
  const [targetTypeFilter, setTargetTypeFilter] = useState<string | null>(null);
  
  // Edit session state
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editDate, setEditDate] = useState(new Date());
  const [editName, setEditName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    // Include default 'wa_standard' for sessions without target_type
    const types = sessions.map(s => s.target_type || 'wa_standard');
    return [...new Set(types)];
  }, [sessions]);

  // Filter sessions by bow, distance, and target type
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (bowFilter && session.bow_name !== bowFilter) return false;
      if (distanceFilter && session.distance !== distanceFilter) return false;
      // Treat missing target_type as 'wa_standard'
      const sessionTargetType = session.target_type || 'wa_standard';
      if (targetTypeFilter && sessionTargetType !== targetTypeFilter) return false;
      return true;
    });
  }, [sessions, bowFilter, distanceFilter, targetTypeFilter]);

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

    filteredSessions.forEach((session) => {
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
  }, [filteredSessions, selectedPeriod]);

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

  // Edit session functions
  const openEditModal = (session: Session) => {
    setEditingSession(session);
    setEditDate(new Date(session.created_at));
    setEditName(session.name);
  };

  const closeEditModal = () => {
    setEditingSession(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      // Keep the time from the current editDate, just update the date
      const newDate = new Date(editDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setEditDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      // Keep the date, just update the time
      const newDate = new Date(editDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setEditDate(newDate);
    }
  };

  const saveSessionEdit = async () => {
    if (!editingSession) return;
    
    setIsSaving(true);
    try {
      const response = await axios.put(`${API_URL}/api/sessions/${editingSession.id}`, {
        name: editName,
        created_at: editDate.toISOString(),
      });
      
      // Update the session in the local state
      setSessions(sessions.map(s => 
        s.id === editingSession.id ? response.data : s
      ));
      
      closeEditModal();
    } catch (err) {
      console.error('Save error:', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to save changes');
      } else {
        Alert.alert('Error', 'Failed to save changes');
      }
    } finally {
      setIsSaving(false);
    }
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
    const targetType = session.target_type || 'wa_standard';
    
    if (shots.length === 0) {
      return null;
    }

    // Ring colors for WA Standard (10 rings)
    const waRingColors = [
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
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];

    const targetScale = 0.8;
    
    // Spot sizes matching scoring screen (radius * 2 = diameter)
    // Vegas: spotRadius = 0.19, NFAA: spotRadius = 0.14
    const vegasSpotSize = size * 0.19 * 2;  // 38% of container
    const nfaaSpotSize = size * 0.14 * 2;   // 28% of container
    const spotSize = targetType === 'vegas_3spot' ? vegasSpotSize : 
                     targetType === 'nfaa_indoor' ? nfaaSpotSize : size * targetScale;

    // Single spot component for multi-spot targets
    const SingleSpot = ({ centerX, centerY }: { centerX: number, centerY: number }) => {
      const spotRadius = spotSize / 2;
      return (
        <View
          style={{
            position: 'absolute',
            left: centerX - spotRadius,
            top: centerY - spotRadius,
            width: spotSize,
            height: spotSize,
          }}
        >
          {/* Blue ring (outer) */}
          <View style={[targetMapStyles.ring, {
            width: spotSize, height: spotSize, borderRadius: spotSize / 2,
            backgroundColor: '#00a2e8', borderColor: '#0077b3', borderWidth: 1,
          }]}>
            {/* Red ring */}
            <View style={[targetMapStyles.ring, {
              width: spotSize * 0.65, height: spotSize * 0.65, borderRadius: spotSize * 0.325,
              backgroundColor: '#ed1c24', borderColor: '#b31217', borderWidth: 1,
            }]}>
              {/* Gold ring (center) */}
              <View style={[targetMapStyles.ring, {
                width: spotSize * 0.35, height: spotSize * 0.35, borderRadius: spotSize * 0.175,
                backgroundColor: '#fff200', borderColor: '#ccaa00', borderWidth: 1,
              }]} />
            </View>
          </View>
        </View>
      );
    };

    // Get spot centers - MUST MATCH scoring.tsx exactly (normalized 0-1 coordinates)
    const getSpotCenters = () => {
      if (targetType === 'vegas_3spot') {
        // Vegas 3-Spot: 1 on top, 2 on bottom (inverted triangle) - matches scoring.tsx
        return [
          { x: 0.5 * size, y: 0.28 * size },   // Top center
          { x: 0.29 * size, y: 0.72 * size },  // Bottom left
          { x: 0.71 * size, y: 0.72 * size },  // Bottom right
        ];
      } else if (targetType === 'nfaa_indoor') {
        // NFAA Indoor: 3 vertical spots - matches scoring.tsx
        return [
          { x: 0.5 * size, y: 0.17 * size },   // Top
          { x: 0.5 * size, y: 0.5 * size },    // Middle
          { x: 0.5 * size, y: 0.83 * size },   // Bottom
        ];
      }
      return [{ x: size / 2, y: size / 2 }]; // WA Standard - single target
    };

    const spotCenters = getSpotCenters();

    // Render WA Standard target
    if (targetType === 'wa_standard') {
      return (
        <View style={[targetMapStyles.container, { width: size, height: size }]}>
          <View style={[targetMapStyles.targetBackground, { width: size * targetScale, height: size * targetScale, borderRadius: (size * targetScale) / 2 }]}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ringNum) => {
              const diameterPercent = (11 - ringNum) / 10;
              const ringSize = size * targetScale * diameterPercent;
              const bgColor = waRingColors[ringNum - 1];
              return (
                <View
                  key={`ring-${ringNum}`}
                  style={[
                    targetMapStyles.ring,
                    {
                      width: ringSize, height: ringSize, borderRadius: ringSize / 2,
                      backgroundColor: bgColor,
                      borderColor: ringNum <= 2 ? '#ccc' : ringNum <= 4 ? '#444' : ringNum <= 6 ? '#0077b3' : ringNum <= 8 ? '#b31217' : '#ccaa00',
                      borderWidth: 1,
                    },
                  ]}
                />
              );
            })}
            <View style={targetMapStyles.centerMark}>
              <View style={targetMapStyles.centerLine} />
              <View style={[targetMapStyles.centerLine, { transform: [{ rotate: '90deg' }] }]} />
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
                  { left, top, width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: roundColor },
                ]}
              >
                <Text style={targetMapStyles.shotLabel}>{shot.ring}</Text>
              </View>
            );
          })}
        </View>
      );
    }

    // Render Vegas 3-Spot or NFAA Indoor
    return (
      <View style={[targetMapStyles.container, { width: size, height: size }]}>
        {/* Draw the multi-spot target background */}
        <View style={[targetMapStyles.multiSpotBackground, { width: size, height: size, position: 'absolute', left: 0, top: 0 }]}>
          {spotCenters.map((spot, idx) => (
            <SingleSpot key={`spot-${idx}`} centerX={spot.x} centerY={spot.y} />
          ))}
        </View>

        {/* Plot shots - coordinates are already normalized to 0-1 from scoring screen */}
        {shots.map((shot, index) => {
          const dotSize = 10;
          const left = shot.x * size - dotSize / 2;
          const top = shot.y * size - dotSize / 2;
          const roundColor = roundColors[shot.roundIndex % roundColors.length];
          return (
            <View
              key={`shot-${index}`}
              style={[
                targetMapStyles.shotDot,
                { left, top, width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: roundColor },
              ]}
            >
              <Text style={[targetMapStyles.shotLabel, { fontSize: 6 }]}>{shot.ring}</Text>
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

        {/* Filter Buttons */}
        {(availableBows.length > 0 || availableDistances.length > 0 || availableTargetTypes.length > 0) && (
          <View style={styles.filterSection}>
            {/* Target Type Filter */}
            {availableTargetTypes.length > 0 && (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Target:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <TouchableOpacity
                    style={[styles.filterChip, !targetTypeFilter && styles.filterChipActive]}
                    onPress={() => setTargetTypeFilter(null)}
                  >
                    <Text style={[styles.filterChipText, !targetTypeFilter && styles.filterChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {availableTargetTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.filterChip, targetTypeFilter === type && styles.filterChipActive]}
                      onPress={() => setTargetTypeFilter(targetTypeFilter === type ? null : type)}
                    >
                      <Text style={[styles.filterChipText, targetTypeFilter === type && styles.filterChipTextActive]}>{getTargetTypeName(type)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Bow Filter */}
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
            
            {/* Distance Filter */}
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
        )}

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
                        {/* Target Face Visual */}
                        <View style={styles.targetFaceContainer}>
                          <MiniTargetFace targetType={session.target_type} size={48} />
                        </View>
                        
                        <View style={styles.sessionInfo}>
                          <Text style={styles.sessionName}>{session.name}</Text>
                          <TouchableOpacity
                            style={styles.dateEditRow}
                            onPress={(e) => {
                              e.stopPropagation();
                              openEditModal(session);
                            }}
                          >
                            <Text style={styles.sessionDate}>
                              {formatDate(session.created_at)}
                            </Text>
                            <Ionicons name="create-outline" size={14} color="#888888" style={styles.editIcon} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.sessionScore}>
                          <Text style={styles.scoreValue}>{session.total_score}</Text>
                          <Text style={styles.scoreLabel}>pts</Text>
                        </View>
                      </View>

                      {/* Bow & Distance Info */}
                      {(session.bow_name || session.distance) && (
                        <View style={styles.sessionEquipment}>
                          {session.bow_name && (
                            <View style={styles.equipmentItem}>
                              <Ionicons name="fitness-outline" size={14} color="#8B0000" />
                              <Text style={styles.equipmentText}>{session.bow_name}</Text>
                            </View>
                          )}
                          {session.distance && (
                            <View style={styles.equipmentItem}>
                              <Ionicons name="locate-outline" size={14} color="#8B0000" />
                              <Text style={styles.equipmentText}>{session.distance}</Text>
                            </View>
                          )}
                        </View>
                      )}

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

      {/* Edit Session Modal */}
      <Modal
        visible={editingSession !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeEditModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Session</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Ionicons name="close" size={24} color="#888888" />
              </TouchableOpacity>
            </View>

            {/* Session Name */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Session Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Session name"
                placeholderTextColor="#555555"
              />
            </View>

            {/* Date */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={editDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    newDate.setHours(editDate.getHours());
                    newDate.setMinutes(editDate.getMinutes());
                    setEditDate(newDate);
                  }}
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    width: '100%',
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#8B0000" />
                    <Text style={styles.dateButtonText}>
                      {editDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={editDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                    />
                  )}
                </>
              )}
            </View>

            {/* Time */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Time</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="time"
                  value={`${editDate.getHours().toString().padStart(2, '0')}:${editDate.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(editDate);
                    newDate.setHours(parseInt(hours));
                    newDate.setMinutes(parseInt(minutes));
                    setEditDate(newDate);
                  }}
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    width: '100%',
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color="#8B0000" />
                    <Text style={styles.dateButtonText}>
                      {editDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={editDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleTimeChange}
                    />
                  )}
                </>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={saveSessionEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    alignItems: 'center',
    paddingRight: 45,
  },
  targetFaceContainer: {
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 4,
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
  sessionEquipment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 12,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  equipmentText: {
    fontSize: 12,
    color: '#8B0000',
    fontWeight: '500',
  },
  targetTypeBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  targetTypeText: {
    color: '#FFD700',
  },
  deleteBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 8,
    zIndex: 100,
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
  dateEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  editIcon: {
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333333',
  },
  dateButton: {
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
  saveButton: {
    backgroundColor: '#8B0000',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  multiSpotBackground: {
    position: 'relative',
    backgroundColor: 'rgba(30, 30, 30, 0.3)',
    borderRadius: 8,
  },
  ring: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
