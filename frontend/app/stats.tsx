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
import Svg, { Defs, RadialGradient, Stop, Circle, Rect, G } from 'react-native-svg';

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
  bow_name?: string;
  bow_id?: string;
  distance?: string;
}

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

  // Filter sessions by selected time period, bow, and distance
  const filteredSessions = useMemo(() => {
    const now = new Date();
    
    return sessions.filter((session) => {
      // Filter by bow
      if (bowFilter && session.bow_name !== bowFilter) return false;
      
      // Filter by distance
      if (distanceFilter && session.distance !== distanceFilter) return false;
      
      // Filter by time period
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
  }, [sessions, selectedPeriod, bowFilter, distanceFilter]);

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

  // Helper function to get week number
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Helper function to get start of week
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Calculate stats for a group of sessions
  const calculateGroupStats = (groupSessions: Session[]) => {
    let totalPoints = 0;
    let totalArrows = 0;
    let totalRounds = 0;
    
    groupSessions.forEach((session) => {
      totalPoints += session.total_score || 0;
      session.rounds?.forEach((round) => {
        totalRounds++;
        totalArrows += round.shots?.length || 0;
      });
    });
    
    return {
      sessionCount: groupSessions.length,
      totalPoints,
      totalArrows,
      totalRounds,
      avgPerArrow: totalArrows > 0 ? (totalPoints / totalArrows).toFixed(1) : '0',
      avgPerRound: totalRounds > 0 ? Math.round(totalPoints / totalRounds) : 0,
    };
  };

  // Dynamic time period breakdown based on selected period
  const timeBreakdown = useMemo(() => {
    type BreakdownItem = {
      key: string;
      label: string;
      sublabel?: string;
      date: Date;
      sessionCount: number;
      totalPoints: number;
      totalArrows: number;
      totalRounds: number;
      avgPerArrow: string;
      avgPerRound: number;
    };

    const groups: { [key: string]: { sessions: Session[], date: Date, label: string, sublabel?: string } } = {};
    
    filteredSessions.forEach((session) => {
      const sessionDate = new Date(session.created_at);
      let groupKey: string;
      let label: string;
      let sublabel: string | undefined;
      
      switch (selectedPeriod) {
        case 'day':
          // Group by hour for day view
          groupKey = `${sessionDate.toDateString()}-${sessionDate.getHours()}`;
          const hour = sessionDate.getHours();
          label = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
          sublabel = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
          
        case 'week':
          // Group by day for week view
          groupKey = sessionDate.toDateString();
          label = sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          break;
          
        case 'month':
          // Group by week for month view
          const weekStart = getWeekStart(sessionDate);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          groupKey = `week-${weekStart.toISOString()}`;
          label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          sublabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          break;
          
        case 'year':
          // Group by month for year view
          groupKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}`;
          label = sessionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          break;
          
        case 'all':
        default:
          // Group by year for all time view
          groupKey = `${sessionDate.getFullYear()}`;
          label = `${sessionDate.getFullYear()}`;
          break;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = { sessions: [], date: sessionDate, label, sublabel };
      }
      groups[groupKey].sessions.push(session);
    });
    
    // Convert to array with stats
    const result: BreakdownItem[] = Object.entries(groups)
      .map(([key, { sessions: groupSessions, date, label, sublabel }]) => ({
        key,
        label,
        sublabel,
        date,
        ...calculateGroupStats(groupSessions),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return result;
  }, [filteredSessions, selectedPeriod]);

  // Get breakdown title based on period
  const getBreakdownTitle = () => {
    switch (selectedPeriod) {
      case 'day': return 'Hourly Breakdown';
      case 'week': return 'Daily Breakdown';
      case 'month': return 'Weekly Breakdown';
      case 'year': return 'Monthly Breakdown';
      case 'all': return 'Yearly Breakdown';
      default: return 'Time Breakdown';
    }
  };

  // Get breakdown icon based on period
  const getBreakdownIcon = () => {
    switch (selectedPeriod) {
      case 'day': return 'time-outline';
      case 'week': return 'today-outline';
      case 'month': return 'calendar-outline';
      case 'year': return 'calendar';
      case 'all': return 'albums-outline';
      default: return 'calendar';
    }
  };

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

  // Heatmap Component - shows density of shots as a gradient overlay
  const HeatmapTargetMap = ({ size = 280 }: { size?: number }) => {
    const shots = stats.allShots;
    
    if (shots.length === 0) {
      return (
        <View style={[targetMapStyles.emptyContainer, { width: size, height: size }]}>
          <Ionicons name="flame-outline" size={48} color="#888888" />
          <Text style={targetMapStyles.emptyText}>No shots in this period</Text>
        </View>
      );
    }

    const targetScale = 0.8;
    const targetSize = size * targetScale;
    const centerOffset = (size - targetSize) / 2;
    
    // Create a grid for density calculation
    const gridSize = 20; // 20x20 grid
    const cellSize = size / gridSize;
    const densityGrid: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    
    // Calculate density for each grid cell
    shots.forEach((shot) => {
      const gridX = Math.floor(shot.x * gridSize);
      const gridY = Math.floor(shot.y * gridSize);
      
      // Apply Gaussian blur effect - each shot affects nearby cells
      const blurRadius = 2;
      for (let dx = -blurRadius; dx <= blurRadius; dx++) {
        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          const nx = gridX + dx;
          const ny = gridY + dy;
          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const weight = Math.exp(-distance * distance / 2);
            densityGrid[ny][nx] += weight;
          }
        }
      }
    });
    
    // Find max density for normalization
    let maxDensity = 0;
    densityGrid.forEach(row => {
      row.forEach(val => {
        if (val > maxDensity) maxDensity = val;
      });
    });
    
    // Generate heatmap colors (blue -> cyan -> green -> yellow -> red)
    const getHeatColor = (normalizedValue: number) => {
      if (normalizedValue === 0) return 'transparent';
      
      // Color stops: blue (0) -> cyan (0.25) -> green (0.5) -> yellow (0.75) -> red (1)
      const colors = [
        { pos: 0, r: 0, g: 0, b: 255 },      // Blue
        { pos: 0.25, r: 0, g: 255, b: 255 },  // Cyan
        { pos: 0.5, r: 0, g: 255, b: 0 },     // Green
        { pos: 0.75, r: 255, g: 255, b: 0 },  // Yellow
        { pos: 1, r: 255, g: 0, b: 0 },       // Red
      ];
      
      let lower = colors[0];
      let upper = colors[colors.length - 1];
      
      for (let i = 0; i < colors.length - 1; i++) {
        if (normalizedValue >= colors[i].pos && normalizedValue <= colors[i + 1].pos) {
          lower = colors[i];
          upper = colors[i + 1];
          break;
        }
      }
      
      const range = upper.pos - lower.pos;
      const t = range === 0 ? 0 : (normalizedValue - lower.pos) / range;
      
      const r = Math.round(lower.r + (upper.r - lower.r) * t);
      const g = Math.round(lower.g + (upper.g - lower.g) * t);
      const b = Math.round(lower.b + (upper.b - lower.b) * t);
      const alpha = 0.4 + normalizedValue * 0.5; // 0.4 to 0.9 opacity
      
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Create heatmap cells
    const heatmapCells: { x: number; y: number; color: string; opacity: number }[] = [];
    densityGrid.forEach((row, y) => {
      row.forEach((density, x) => {
        if (density > 0) {
          const normalizedDensity = maxDensity > 0 ? density / maxDensity : 0;
          heatmapCells.push({
            x: x * cellSize,
            y: y * cellSize,
            color: getHeatColor(normalizedDensity),
            opacity: normalizedDensity,
          });
        }
      });
    });

    return (
      <View style={[targetMapStyles.container, { width: size, height: size }]}>
        {/* Target Background */}
        <View style={[targetMapStyles.targetBackground, { width: targetSize, height: targetSize, borderRadius: targetSize / 2 }]}>
          {/* Draw rings from outside to inside */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ringNum) => {
            const diameterPercent = (11 - ringNum) / 10;
            const ringSize = targetSize * diameterPercent;
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
        </View>

        {/* Heatmap Overlay using SVG */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}>
          <Svg width={size} height={size}>
            <Defs>
              {heatmapCells.map((cell, index) => (
                <RadialGradient
                  key={`grad-${index}`}
                  id={`heatGrad-${index}`}
                  cx="50%"
                  cy="50%"
                  rx="50%"
                  ry="50%"
                >
                  <Stop offset="0%" stopColor={cell.color} stopOpacity={cell.opacity} />
                  <Stop offset="100%" stopColor={cell.color} stopOpacity={0} />
                </RadialGradient>
              ))}
            </Defs>
            <G>
              {heatmapCells.map((cell, index) => (
                <Circle
                  key={`heat-${index}`}
                  cx={cell.x + cellSize / 2}
                  cy={cell.y + cellSize / 2}
                  r={cellSize * 1.5}
                  fill={`url(#heatGrad-${index})`}
                />
              ))}
            </G>
          </Svg>
        </View>
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

        {/* Filter Buttons */}
        {(availableBows.length > 0 || availableDistances.length > 0) && (
          <View style={styles.filterSection}>
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

        {/* Shot Distribution / Heatmap Section */}
        <View style={styles.sectionCard}>
          {/* View Mode Toggle */}
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                viewMode === 'distribution' && styles.viewModeButtonActive,
              ]}
              onPress={() => setViewMode('distribution')}
            >
              <Ionicons 
                name="locate" 
                size={16} 
                color={viewMode === 'distribution' ? '#fff' : '#888888'} 
              />
              <Text
                style={[
                  styles.viewModeButtonText,
                  viewMode === 'distribution' && styles.viewModeButtonTextActive,
                ]}
              >
                Distribution
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                viewMode === 'heatmap' && styles.viewModeButtonActive,
              ]}
              onPress={() => setViewMode('heatmap')}
            >
              <Ionicons 
                name="flame" 
                size={16} 
                color={viewMode === 'heatmap' ? '#fff' : '#888888'} 
              />
              <Text
                style={[
                  styles.viewModeButtonText,
                  viewMode === 'heatmap' && styles.viewModeButtonTextActive,
                ]}
              >
                Heatmap
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.sectionSubtitle}>
            {viewMode === 'distribution' 
              ? `All ${stats.totalArrows} arrows from ${stats.totalSessions} sessions`
              : `Shot density from ${stats.totalArrows} arrows`
            }
          </Text>
          
          <View style={styles.targetWrapper}>
            {viewMode === 'distribution' ? (
              <AggregatedTargetMap size={SCREEN_WIDTH - 80} />
            ) : (
              <HeatmapTargetMap size={SCREEN_WIDTH - 80} />
            )}
          </View>
          
          {/* Legend */}
          {viewMode === 'distribution' ? (
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
          ) : (
            <View style={styles.heatmapLegend}>
              <Text style={styles.heatmapLegendLabel}>Low</Text>
              <View style={styles.heatmapGradient}>
                <View style={[styles.heatmapGradientStop, { backgroundColor: 'rgba(0, 0, 255, 0.7)' }]} />
                <View style={[styles.heatmapGradientStop, { backgroundColor: 'rgba(0, 255, 255, 0.7)' }]} />
                <View style={[styles.heatmapGradientStop, { backgroundColor: 'rgba(0, 255, 0, 0.7)' }]} />
                <View style={[styles.heatmapGradientStop, { backgroundColor: 'rgba(255, 255, 0, 0.7)' }]} />
                <View style={[styles.heatmapGradientStop, { backgroundColor: 'rgba(255, 0, 0, 0.7)' }]} />
              </View>
              <Text style={styles.heatmapLegendLabel}>High</Text>
            </View>
          )}
        </View>

        {/* Ring Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="bar-chart" size={18} color="#8B0000" /> Score Breakdown
          </Text>
          <RingDistribution />
        </View>

        {/* Daily Breakdown */}
        {dailyStats.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="calendar" size={18} color="#8B0000" /> Daily Breakdown
            </Text>
            <Text style={styles.sectionSubtitle}>
              Performance by day ({dailyStats.length} day{dailyStats.length !== 1 ? 's' : ''})
            </Text>
            
            <View style={styles.dailyList}>
              {dailyStats.map((day, index) => (
                <View key={day.dayKey} style={styles.dailyItem}>
                  <View style={styles.dailyHeader}>
                    <View style={styles.dailyDateContainer}>
                      <Ionicons name="today-outline" size={16} color="#8B0000" />
                      <Text style={styles.dailyDate}>
                        {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.dailyBadge}>
                      <Text style={styles.dailyBadgeText}>
                        {day.sessionCount} session{day.sessionCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.dailyStatsRow}>
                    <View style={styles.dailyStat}>
                      <Text style={styles.dailyStatValue}>{day.totalPoints}</Text>
                      <Text style={styles.dailyStatLabel}>Points</Text>
                    </View>
                    <View style={styles.dailyStat}>
                      <Text style={styles.dailyStatValue}>{day.totalArrows}</Text>
                      <Text style={styles.dailyStatLabel}>Arrows</Text>
                    </View>
                    <View style={styles.dailyStat}>
                      <Text style={styles.dailyStatValue}>{day.avgPerArrow}</Text>
                      <Text style={styles.dailyStatLabel}>Avg/Arrow</Text>
                    </View>
                    <View style={styles.dailyStat}>
                      <Text style={styles.dailyStatValue}>{day.avgPerRound}</Text>
                      <Text style={styles.dailyStatLabel}>Avg/Round</Text>
                    </View>
                  </View>
                  
                  {/* Progress bar showing relative performance */}
                  <View style={styles.dailyProgressContainer}>
                    <View 
                      style={[
                        styles.dailyProgressBar, 
                        { 
                          width: `${Math.min(100, (parseFloat(day.avgPerArrow) / 10) * 100)}%`,
                          backgroundColor: parseFloat(day.avgPerArrow) >= 8 ? '#4CAF50' : 
                                          parseFloat(day.avgPerArrow) >= 6 ? '#FFC107' : '#8B0000'
                        }
                      ]} 
                    />
                  </View>
                </View>
              ))}
            </View>
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
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#222222',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#8B0000',
  },
  viewModeButtonText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  heatmapLegendLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  heatmapGradient: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  heatmapGradientStop: {
    width: 40,
    height: 16,
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
  dailyList: {
    gap: 12,
  },
  dailyItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#8B0000',
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dailyBadge: {
    backgroundColor: 'rgba(139, 0, 0, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  dailyBadgeText: {
    color: '#8B0000',
    fontSize: 11,
    fontWeight: '600',
  },
  dailyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dailyStat: {
    alignItems: 'center',
    flex: 1,
  },
  dailyStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dailyStatLabel: {
    color: '#888888',
    fontSize: 10,
    marginTop: 2,
  },
  dailyProgressContainer: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  dailyProgressBar: {
    height: '100%',
    borderRadius: 2,
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
    borderWidth: 1,
    borderColor: '#000000',
    opacity: 0.6,
  },
});
