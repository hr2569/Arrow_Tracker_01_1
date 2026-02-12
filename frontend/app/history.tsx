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
import { LineChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getSessions, updateSession, deleteSession, deleteRound, updateRound, Session, Round, Shot } from '../utils/localStorage';
import Svg, { Circle, Defs, RadialGradient, Stop, G } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 72;

type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

// Helper function to get target type display name
const getTargetTypeName = (type?: string): string => {
  switch (type) {
    case 'vegas_3spot': return 'Vegas 3-Spot';
    case 'nfaa_indoor': return 'WA Indoor';
    case 'wa_standard': 
    default: return 'WA Standard';
  }
};

// Mini Target Face Component
const MiniTargetFace = ({ targetType, size = 44 }: { targetType?: string, size?: number }) => {
  const type = targetType || 'wa_standard';
  const miniSize = size * 0.35;
  
  if (type === 'vegas_3spot') {
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
  
  // WA Standard
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

// Scatter Map Component - shows all arrow positions on target face
const ScatterMap = ({ session, size = 140 }: { session: Session, size?: number }) => {
  const allShots = session.rounds.flatMap(r => r.shots || []);
  if (allShots.length === 0) return null;
  
  const targetType = session.target_type || 'wa_standard';
  const center = size / 2;
  const maxRingRadius = size * 0.48;
  
  // Shot coordinates are 0-1 where 0.5,0.5 is center
  // Need to map to SVG coordinates centered on target
  const getShotPosition = (shot: { x: number; y: number }) => {
    // Convert from 0-1 range to -1 to 1 range (centered)
    const normalizedX = (shot.x - 0.5) * 2;
    const normalizedY = (shot.y - 0.5) * 2;
    // Map to SVG coordinates
    const x = center + (normalizedX * maxRingRadius);
    const y = center + (normalizedY * maxRingRadius);
    return { x, y };
  };
  
  const isIndoor = targetType === 'vegas_3spot' || targetType === 'nfaa_indoor';
  
  // Indoor target rings (like reference image: black border, blue, red, yellow, white center)
  const indoorRings = [
    { r: 1.0, fill: '#000000', stroke: '#000000' },   // Black outer border
    { r: 0.95, fill: '#00BFFF', stroke: '#00BFFF' },  // Blue outer
    { r: 0.70, fill: '#00BFFF', stroke: '#FFFFFF', strokeWidth: 1 },  // Blue with white ring line
    { r: 0.50, fill: '#FF0000', stroke: '#FFFFFF', strokeWidth: 1 },  // Red
    { r: 0.30, fill: '#FFFF00', stroke: '#FFFFFF', strokeWidth: 1 },  // Yellow
    { r: 0.12, fill: '#FFFFFF', stroke: '#FFFFFF' },  // White X ring
  ];
  
  // WA Standard - 10 ring target
  const waRings = [
    { r: 1.0, fill: '#FFFFFF', stroke: '#cccccc' },
    { r: 0.9, fill: '#FFFFFF', stroke: '#cccccc' },
    { r: 0.8, fill: '#000000', stroke: '#444444' },
    { r: 0.7, fill: '#000000', stroke: '#444444' },
    { r: 0.6, fill: '#00BFFF', stroke: '#FFFFFF', strokeWidth: 1 },
    { r: 0.5, fill: '#00BFFF', stroke: '#FFFFFF', strokeWidth: 1 },
    { r: 0.4, fill: '#FF0000', stroke: '#FFFFFF', strokeWidth: 1 },
    { r: 0.3, fill: '#FF0000', stroke: '#FFFFFF', strokeWidth: 1 },
    { r: 0.2, fill: '#FFFF00', stroke: '#FFFFFF', strokeWidth: 1 },
    { r: 0.1, fill: '#FFFF00', stroke: '#FFFF00' },
  ];
  
  const rings = isIndoor ? indoorRings : waRings;
  
  // Crosshair for center (indoor targets)
  const renderCrosshair = () => {
    const crosshairSize = maxRingRadius * 0.08;
    return (
      <G>
        <Circle cx={center} cy={center} r={crosshairSize} fill="none" stroke="#B8860B" strokeWidth={1} />
        <Circle cx={center} cy={center} r={crosshairSize * 0.3} fill="none" stroke="#B8860B" strokeWidth={1} />
        {/* Horizontal line */}
        <Circle cx={center - crosshairSize} cy={center} r={0} fill="none" stroke="#B8860B" strokeWidth={1} />
        {/* Cross lines */}
        <G stroke="#B8860B" strokeWidth={1}>
          <Circle cx={center} cy={center - crosshairSize * 1.3} r={0} />
        </G>
      </G>
    );
  };
  
  return (
    <View style={scatterStyles.container}>
      <Text style={scatterStyles.title}>
        <Ionicons name="radio-button-on" size={14} color="#8B0000" /> Shot Distribution
      </Text>
      <Svg width={size} height={size} style={scatterStyles.svg}>
        {rings.map((ring, i) => (
          <Circle
            key={`ring-${i}`}
            cx={center}
            cy={center}
            r={maxRingRadius * ring.r}
            fill={ring.fill}
            stroke={ring.stroke}
            strokeWidth={ring.strokeWidth || 0.5}
          />
        ))}
        {isIndoor && renderCrosshair()}
        {allShots.map((shot, i) => {
          const pos = getShotPosition(shot);
          return (
            <Circle
              key={`shot-${i}`}
              cx={pos.x}
              cy={pos.y}
              r={4}
              fill="#8B0000"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              opacity={0.9}
            />
          );
        })}
      </Svg>
      <Text style={scatterStyles.arrowCount}>
        {allShots.length} arrow{allShots.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );
};

// Heatmap Component - shows density of arrow impacts
const HeatMap = ({ session, size = 140 }: { session: Session, size?: number }) => {
  const allShots = session.rounds.flatMap(r => r.shots || []);
  if (allShots.length === 0) return null;
  
  const center = size / 2;
  const gridSize = 7; // 7x7 grid
  const cellSize = size / gridSize;
  
  // Create grid and count shots in each cell
  const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  let maxCount = 0;
  
  allShots.forEach(shot => {
    // Shots are 0-1 from top-left, convert directly to grid indices
    const gridX = Math.floor(shot.x * gridSize);
    const gridY = Math.floor(shot.y * gridSize);
    const clampedX = Math.max(0, Math.min(gridSize - 1, gridX));
    const clampedY = Math.max(0, Math.min(gridSize - 1, gridY));
    grid[clampedY][clampedX]++;
    maxCount = Math.max(maxCount, grid[clampedY][clampedX]);
  });
  
  // Get color based on intensity - more transparent
  const getHeatColor = (count: number) => {
    if (count === 0) return 'transparent';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'rgba(139, 0, 0, 0.15)';
    if (intensity < 0.5) return 'rgba(139, 0, 0, 0.3)';
    if (intensity < 0.75) return 'rgba(139, 0, 0, 0.45)';
    return 'rgba(139, 0, 0, 0.65)';
  };
  
  return (
    <View style={scatterStyles.container}>
      <Text style={scatterStyles.title}>
        <Ionicons name="flame" size={14} color="#8B0000" /> Impact Heatmap
      </Text>
      <View style={[scatterStyles.heatmapGrid, { width: size, height: size }]}>
        {/* Target outline */}
        <View style={[scatterStyles.targetOutline, { width: size, height: size, borderRadius: size / 2 }]} />
        {/* Heat cells */}
        {grid.map((row, y) => (
          <View key={`row-${y}`} style={scatterStyles.heatmapRow}>
            {row.map((count, x) => (
              <View
                key={`cell-${x}-${y}`}
                style={[
                  scatterStyles.heatmapCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: getHeatColor(count),
                  }
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const scatterStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    flex: 1,
  },
  title: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  svg: {
    backgroundColor: '#1a1a1a',
    borderRadius: 70,
  },
  arrowCount: {
    color: '#8B0000',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  heatmapGrid: {
    backgroundColor: '#1a1a1a',
    borderRadius: 70,
    overflow: 'hidden',
    position: 'relative',
  },
  targetOutline: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#333',
    top: 0,
    left: 0,
  },
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  heatmapCell: {
    borderWidth: 0.5,
    borderColor: 'rgba(51, 51, 51, 0.3)',
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
  const [activeTab, setActiveTab] = useState<'history' | 'report'>('history');
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

  // Edit round state
  const [editingRound, setEditingRound] = useState<{ sessionId: string; round: Round } | null>(null);
  const [editedShots, setEditedShots] = useState<{ ring: number; x: number; y: number }[]>([]);

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
    return [...new Set(types)];
  }, [sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (bowFilter && session.bow_name !== bowFilter) return false;
      if (distanceFilter && session.distance !== distanceFilter) return false;
      const sessionTargetType = session.target_type || 'wa_standard';
      if (targetTypeFilter && sessionTargetType !== targetTypeFilter) return false;
      return true;
    });
  }, [sessions, bowFilter, distanceFilter, targetTypeFilter]);

  const fetchSessions = async () => {
    try {
      const sessionsData = await getSessions();
      setSessions(sessionsData);
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

    const result: GroupedSessions[] = Object.entries(groups).map(([label, sessionList]) => ({
      label,
      sessions: sessionList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      totalScore: sessionList.reduce((sum, s) => sum + (s.total_score || 0), 0),
      totalRounds: sessionList.reduce((sum, s) => sum + (s.rounds?.length || 0), 0),
    }));

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
        await deleteSession(sessionId);
        setSessions(sessions.filter(s => s.id !== sessionId));
      } catch (err) {
        Alert.alert('Error', 'Failed to delete session');
      }
    };

    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  };

  const handleDeleteRound = (sessionId: string, roundId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session?.rounds.length === 1) {
      Alert.alert('Cannot Delete', 'Sessions must have at least one round. Delete the session instead.');
      return;
    }
    
    const performDelete = async () => {
      try {
        const updatedSession = await deleteRound(sessionId, roundId);
        if (updatedSession) {
          setSessions(sessions.map(s => s.id === sessionId ? updatedSession : s));
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to delete round');
      }
    };

    Alert.alert(
      'Delete Round',
      'Are you sure you want to delete this round? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
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
      const updated = await updateSession(editingSession.id, {
        name: editName,
        created_at: editDate.toISOString(),
      });
      
      if (updated) {
        setSessions(sessions.map(s => 
          s.id === editingSession.id ? updated : s
        ));
      }
      
      closeEditModal();
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit round functions
  const openEditRoundModal = (sessionId: string, round: Round) => {
    setEditingRound({ sessionId, round });
    setEditedShots(round.shots.map(s => ({ ring: s.ring, x: s.x, y: s.y })));
  };

  const closeEditRoundModal = () => {
    setEditingRound(null);
    setEditedShots([]);
  };

  const updateShotScore = (shotIndex: number, newScore: number) => {
    const newShots = [...editedShots];
    newShots[shotIndex] = { ...newShots[shotIndex], ring: newScore };
    setEditedShots(newShots);
  };

  const addShot = () => {
    setEditedShots([...editedShots, { ring: 0, x: 0.5, y: 0.5 }]);
  };

  const removeShot = (index: number) => {
    if (editedShots.length <= 3) {
      Alert.alert('Cannot Remove', 'Rounds must have at least 3 shots.');
      return;
    }
    const newShots = editedShots.filter((_, i) => i !== index);
    setEditedShots(newShots);
  };

  const saveRoundEdit = async () => {
    if (!editingRound) return;
    
    setIsSaving(true);
    try {
      const updatedSession = await updateRound(
        editingRound.sessionId,
        editingRound.round.id,
        editedShots
      );
      
      if (updatedSession) {
        setSessions(sessions.map(s => 
          s.id === editingRound.sessionId ? updatedSession : s
        ));
      }
      
      closeEditRoundModal();
    } catch (err) {
      console.error('Save round error:', err);
      Alert.alert('Error', 'Failed to save round changes');
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

  // Chart configuration
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
      {/* Tab Selector - Row 1: Main Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="time-outline" size={18} color={activeTab === 'history' ? '#fff' : '#888'} />
          <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>Sessions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'report' && styles.tabButtonActive]}
          onPress={() => router.push('/report')}
        >
          <Ionicons name="document-text-outline" size={18} color={activeTab === 'report' ? '#fff' : '#888'} />
          <Text style={[styles.tabButtonText, activeTab === 'report' && styles.tabButtonTextActive]}>Report</Text>
        </TouchableOpacity>
      </View>

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
        )}

        {/* Stats Overview */}
        {sessions.length > 0 && (
          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>
              {selectedPeriod === 'all' ? 'All Time Stats' : `Stats - ${selectedPeriod}`}
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
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyText}>
              Complete scoring sessions to see your history here.
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/sessionSetup')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {groupedSessions.map((group) => (
              <View key={group.label} style={styles.groupContainer}>
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

                {group.sessions.map((session) => (
                  <View key={session.id} style={styles.sessionCard}>
                    <Pressable
                      onPress={() => toggleExpand(session.id)}
                      style={styles.sessionCardPressable}
                    >
                      <View style={styles.sessionHeader}>
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

                    {expandedSession === session.id && session.rounds && (
                      <View style={styles.expandedContent}>
                        <View style={styles.expandedDivider} />
                        
                        {/* Shot Distribution */}
                        <View style={styles.visualizationsRow}>
                          <ScatterMap session={session} size={160} />
                        </View>
                        
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
                            <View style={styles.roundHeader}>
                              <Text style={styles.roundNumber}>
                                Round {round.round_number || index + 1}
                              </Text>
                              <View style={styles.roundActions}>
                                <TouchableOpacity
                                  style={styles.roundEditBtn}
                                  onPress={() => openEditRoundModal(session.id, round)}
                                >
                                  <Ionicons name="create-outline" size={16} color="#8B0000" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.roundDeleteBtn}
                                  onPress={() => handleDeleteRound(session.id, round.id)}
                                >
                                  <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                                </TouchableOpacity>
                              </View>
                            </View>
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
        onPress={() => router.push('/sessionSetup')}
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

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Date</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.modalInput}
                  value={editDate.toISOString().split('T')[0]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#555555"
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
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Time</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.modalInput}
                  value={`${editDate.getHours().toString().padStart(2, '0')}:${editDate.getMinutes().toString().padStart(2, '0')}`}
                  placeholder="HH:MM"
                  placeholderTextColor="#555555"
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
                      display="default"
                      onChange={handleTimeChange}
                    />
                  )}
                </>
              )}
            </View>

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

      {/* Edit Round Modal */}
      <Modal
        visible={editingRound !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEditRoundModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeEditRoundModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit Round {editingRound?.round.round_number}
              </Text>
              <TouchableOpacity onPress={closeEditRoundModal}>
                <Ionicons name="close" size={24} color="#888888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.editRoundSubtitle}>
              Tap on a score to change it
            </Text>

            <ScrollView style={styles.editShotsContainer} showsVerticalScrollIndicator={false}>
              {editedShots.map((shot, index) => (
                <View key={index} style={styles.editShotRow}>
                  <Text style={styles.editShotLabel}>Shot {index + 1}</Text>
                  <View style={styles.scoreSelector}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <TouchableOpacity
                        key={score}
                        style={[
                          styles.scoreOption,
                          shot.ring === score && styles.scoreOptionSelected,
                        ]}
                        onPress={() => updateShotScore(index, score)}
                      >
                        <Text
                          style={[
                            styles.scoreOptionText,
                            shot.ring === score && styles.scoreOptionTextSelected,
                          ]}
                        >
                          {score === 0 ? 'M' : score}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {editedShots.length > 3 && (
                    <TouchableOpacity
                      style={styles.removeShotBtn}
                      onPress={() => removeShot(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.addShotButton} onPress={addShot}>
              <Ionicons name="add-circle-outline" size={20} color="#8B0000" />
              <Text style={styles.addShotButtonText}>Add Shot</Text>
            </TouchableOpacity>

            <View style={styles.editRoundTotal}>
              <Text style={styles.editRoundTotalLabel}>Round Total:</Text>
              <Text style={styles.editRoundTotalValue}>
                {editedShots.reduce((sum, s) => sum + s.ring, 0)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={saveRoundEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Save Round</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#8B0000',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888888',
  },
  tabButtonTextActive: {
    color: '#fff',
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
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
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
  roundsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  visualizationsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    gap: 16,
  },
  roundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  roundNumber: {
    fontSize: 12,
    color: '#888888',
    flex: 1,
  },
  roundActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roundEditBtn: {
    padding: 4,
  },
  roundDeleteBtn: {
    padding: 4,
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
  // Competition styles
  competitionsTabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  competitionsTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 8,
  },
  competitionsTabActive: {
    backgroundColor: '#FFD700',
  },
  competitionsTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  competitionsTabTextActive: {
    color: '#000',
  },
  mergeReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 6,
  },
  mergeReportButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
  },
  competitionCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  competitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  competitionTrophy: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  competitionInfo: {
    flex: 1,
  },
  competitionName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  competitionArcher: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  competitionDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  competitionScore: {
    alignItems: 'flex-end',
  },
  competitionScoreValue: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  competitionScoreMax: {
    color: '#666',
    fontSize: 12,
  },
  competitionPercentage: {
    color: '#888',
    fontSize: 12,
  },
  competitionMeta: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 16,
  },
  competitionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  competitionMetaText: {
    color: '#888',
    fontSize: 12,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  emptyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Edit Round Modal Styles
  editRoundSubtitle: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  editShotsContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  editShotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  editShotLabel: {
    color: '#888888',
    fontSize: 14,
    width: 60,
  },
  scoreSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: 6,
  },
  scoreOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  scoreOptionSelected: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  scoreOptionText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  scoreOptionTextSelected: {
    color: '#ffffff',
  },
  removeShotBtn: {
    marginLeft: 8,
    padding: 4,
  },
  addShotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addShotButtonText: {
    color: '#8B0000',
    fontSize: 14,
    fontWeight: '600',
  },
  editRoundTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  editRoundTotalLabel: {
    color: '#888888',
    fontSize: 16,
    marginRight: 8,
  },
  editRoundTotalValue: {
    color: '#8B0000',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
