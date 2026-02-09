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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Defs, RadialGradient, Stop, Circle, G } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { getSessions, getBows, Session, Bow } from '../utils/localStorage';

type ReportPeriod = 'week' | 'month' | 'year' | 'custom' | 'all';

// Helper function to get target type display name
const getTargetTypeName = (type?: string): string => {
  switch (type) {
    case 'vegas_3spot': return 'Vegas 3-Spot';
    case 'nfaa_indoor': return 'NFAA Indoor';
    case 'wa_standard': 
    default: return 'WA Standard';
  }
};

export default function ReportScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bows, setBows] = useState<Bow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month');
  const [showReport, setShowReport] = useState(false);
  
  // Filters
  const [selectedBow, setSelectedBow] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<string | null>(null);
  const [selectedTargetType, setSelectedTargetType] = useState<string | null>(null);
  
  // Session selection mode
  const [selectionMode, setSelectionMode] = useState<'dateRange' | 'sessions'>('dateRange');
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  
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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessionsData, bowsData] = await Promise.all([
        getSessions(),
        getBows(),
      ]);
      setSessions(sessionsData);
      setBows(bowsData);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique distances from sessions
  const availableDistances = useMemo(() => {
    const distances = sessions
      .filter(s => s.distance)
      .map(s => s.distance as string);
    return [...new Set(distances)];
  }, [sessions]);

  // Get unique target types from sessions
  const availableTargetTypes = useMemo(() => {
    const types = sessions.map(s => s.target_type || 'wa_standard');
    return [...new Set(types)];
  }, [sessions]);

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
        newStartDate = new Date(2020, 0, 1);
        break;
      case 'custom':
        return;
    }
    
    setStartDate(newStartDate);
    setEndDate(now);
  }, [selectedPeriod]);

  // Filter sessions by date range OR selected sessions, plus bow, distance, and target type
  const filteredSessions = useMemo(() => {
    let filtered = sessions;
    
    // Apply selection mode filter
    if (selectionMode === 'sessions' && selectedSessionIds.size > 0) {
      // Filter by selected session IDs
      filtered = sessions.filter(session => selectedSessionIds.has(session.id));
    } else {
      // Filter by date range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filtered = sessions.filter((session) => {
        const sessionDate = new Date(session.created_at);
        return sessionDate >= start && sessionDate <= end;
      });
    }
    
    // Apply additional filters
    return filtered.filter((session) => {
      if (selectedBow && session.bow_id !== selectedBow) return false;
      if (selectedDistance && session.distance !== selectedDistance) return false;
      const sessionTargetType = session.target_type || 'wa_standard';
      if (selectedTargetType && sessionTargetType !== selectedTargetType) return false;
      return true;
    });
  }, [sessions, startDate, endDate, selectedBow, selectedDistance, selectedTargetType, selectionMode, selectedSessionIds]);

  // Toggle session selection
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // Select/deselect all sessions
  const toggleSelectAll = () => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(sessions.map(s => s.id)));
    }
  };

  // Get all shots for heatmap, grouped by target type
  const shotsByTargetType = useMemo(() => {
    const grouped: { [key: string]: { x: number; y: number; ring: number }[] } = {
      'wa_standard': [],
      'vegas_3spot': [],
      'nfaa_indoor': [],
    };
    
    filteredSessions.forEach((session) => {
      const targetType = session.target_type || 'wa_standard';
      session.rounds?.forEach((round) => {
        round.shots?.forEach((shot: any) => {
          if (shot.x !== undefined && shot.y !== undefined) {
            grouped[targetType]?.push({
              x: shot.x,
              y: shot.y,
              ring: shot.ring || 0,
            });
          }
        });
      });
    });
    
    return grouped;
  }, [filteredSessions]);

  // Legacy: all shots combined (for backward compatibility)
  const allShots = useMemo(() => {
    return Object.values(shotsByTargetType).flat();
  }, [shotsByTargetType]);

  // Calculate report statistics
  const reportStats = useMemo(() => {
    let totalPoints = 0;
    let totalArrows = 0;
    let totalRounds = 0;
    let bestSession = { score: 0, name: '', date: '' };
    let worstSession = { score: Infinity, name: '', date: '' };
    const ringDistribution: { [key: number]: number } = {};

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

      session.rounds?.forEach((round) => {
        totalRounds++;
        round.shots?.forEach((shot: any) => {
          totalArrows++;
          const ring = shot.ring || 0;
          ringDistribution[ring] = (ringDistribution[ring] || 0) + 1;
        });
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
      ringDistribution,
    };
  }, [filteredSessions]);

  // Stats by target type for report
  const statsByTargetType = useMemo(() => {
    const targetTypes = ['wa_standard', 'vegas_3spot', 'nfaa_indoor'];
    const result: { [key: string]: { sessions: number; arrows: number; points: number; avgPerArrow: string; rounds: number } } = {};

    targetTypes.forEach(targetType => {
      const sessionsForType = filteredSessions.filter(s => (s.target_type || 'wa_standard') === targetType);
      let totalArrows = 0;
      let totalPoints = 0;
      let totalRounds = 0;

      sessionsForType.forEach(session => {
        totalPoints += session.total_score || 0;
        session.rounds?.forEach(round => {
          totalRounds++;
          round.shots?.forEach(() => {
            totalArrows++;
          });
        });
      });

      result[targetType] = {
        sessions: sessionsForType.length,
        arrows: totalArrows,
        points: totalPoints,
        rounds: totalRounds,
        avgPerArrow: totalArrows > 0 ? (totalPoints / totalArrows).toFixed(1) : '0',
      };
    });

    return result;
  }, [filteredSessions]);

  const formatDateRange = () => {
    const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const getFilterSummary = () => {
    const parts = [];
    if (selectedBow) {
      const bow = bows.find(b => b.id === selectedBow);
      if (bow) parts.push(bow.name);
    }
    if (selectedDistance) parts.push(selectedDistance);
    if (selectedTargetType) parts.push(getTargetTypeName(selectedTargetType));
    return parts.length > 0 ? parts.join(' • ') : 'All Equipment';
  };

  // Generate shareable report text
  // Generate PDF HTML content
  const generatePdfHtml = () => {
    // Generate date for title
    const reportDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Score range based on target type
    const currentTargetType = selectedTargetType || 'wa_standard';
    const scoreRange = currentTargetType === 'wa_standard' 
      ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]  // WA: 10-1 + M
      : [10, 9, 8, 7, 6, 0];  // Vegas/NFAA: 10-6 + M
      
    // Score distribution with larger bars for full page
    const ringDistributionRows = scoreRange
      .map((ring) => {
        const count = reportStats.ringDistribution[ring] || 0;
        const percentage = reportStats.totalArrows > 0 ? (count / reportStats.totalArrows) * 100 : 0;
        return `
          <tr>
            <td style="font-weight: bold; font-size: 24px; width: 60px; padding: 12px 0;">${ring === 0 ? 'M' : ring}</td>
            <td style="padding: 12px 0;">
              <div style="background: #ddd; border-radius: 8px; height: 40px; width: 100%;">
                <div style="background: #8B0000; border-radius: 8px; height: 40px; width: ${percentage}%;"></div>
              </div>
            </td>
            <td style="width: 80px; text-align: right; font-size: 20px; font-weight: bold; padding: 12px 0;">${count}</td>
            <td style="width: 80px; text-align: right; font-size: 16px; color: #666; padding: 12px 0;">${percentage.toFixed(1)}%</td>
          </tr>
        `;
      })
      .join('');

    // Get unique bows, distances, and target types used in filtered sessions
    const usedBows = [...new Set(filteredSessions.filter(s => s.bow_name).map(s => s.bow_name))];
    const usedDistances = [...new Set(filteredSessions.filter(s => s.distance).map(s => s.distance))];
    const usedTargetTypes = [...new Set(filteredSessions.map(s => getTargetTypeName(s.target_type)))];

    // Generate heatmap SVG for PDF - full page with target type support
    const generateHeatmapSvg = (targetType: string, shots: { x: number; y: number; ring: number }[]) => {
      if (shots.length === 0) {
        return `
          <div style="width: 100%; height: 500px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 1px solid #ddd;">
            <span style="color: #666; font-size: 18px;">No shots in this period</span>
          </div>
        `;
      }

      const size = 600;
      const targetScale = 0.9;
      const targetSize = size * targetScale;
      
      // Spot centers for multi-spot targets (normalized 0-1)
      const getSpotCentersNormalized = () => {
        if (targetType === 'vegas_3spot') {
          return [
            { x: 0.5, y: 0.28 },   // Top center
            { x: 0.29, y: 0.72 },  // Bottom left
            { x: 0.71, y: 0.72 },  // Bottom right
          ];
        } else if (targetType === 'nfaa_indoor') {
          return [
            { x: 0.5, y: 0.17 },   // Top
            { x: 0.5, y: 0.5 },    // Middle
            { x: 0.5, y: 0.83 },   // Bottom
          ];
        }
        return [{ x: 0.5, y: 0.5 }];
      };

      const spotCenters = getSpotCentersNormalized();
      const vegasSpotRadius = 0.19;
      const nfaaSpotRadius = 0.14;
      const spotRadius = targetType === 'vegas_3spot' ? vegasSpotRadius : nfaaSpotRadius;
      const spotSizePx = spotRadius * 2 * size;
      
      // Grid for density calculation - HIGH RESOLUTION for smoothness
      const gridSize = 80;  // Increased for smoother appearance
      const cellSize = size / gridSize;
      const densityGrid: number[][] = [];
      for (let i = 0; i < gridSize; i++) {
        densityGrid[i] = [];
        for (let j = 0; j < gridSize; j++) {
          densityGrid[i][j] = 0;
        }
      }
      
      // Calculate density with larger blur
      shots.forEach((shot) => {
        const gridX = Math.floor(shot.x * gridSize);
        const gridY = Math.floor(shot.y * gridSize);
        
        const blurRadius = 10;  // Larger blur for smoother gradients
        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            const nx = gridX + dx;
            const ny = gridY + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              const weight = Math.exp(-distance * distance / 16);  // Smoother falloff
              densityGrid[ny][nx] += weight;
            }
          }
        }
      });
      
      let maxDensity = 0;
      densityGrid.forEach(row => {
        row.forEach(val => {
          if (val > maxDensity) maxDensity = val;
        });
      });
      
      // Color function
      const getHeatColor = (normalizedValue: number) => {
        if (normalizedValue === 0) return null;
        
        const colors = [
          { pos: 0, r: 0, g: 200, b: 0 },
          { pos: 0.33, r: 255, g: 255, b: 0 },
          { pos: 0.66, r: 255, g: 165, b: 0 },
          { pos: 1, r: 255, g: 0, b: 0 },
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
        const alpha = 0.4 + normalizedValue * 0.5;
        
        return { r, g, b, alpha };
      };

      // Generate heat circles with smoother rendering
      let heatCircles = '';
      densityGrid.forEach((row, y) => {
        row.forEach((density, x) => {
          if (density > 0.05) {  // Threshold to reduce noise
            const normalizedDensity = maxDensity > 0 ? density / maxDensity : 0;
            const color = getHeatColor(normalizedDensity);
            if (color) {
              const cx = x * cellSize + cellSize / 2;
              const cy = y * cellSize + cellSize / 2;
              const r = cellSize * 2.0;  // Larger circles for overlap/smoothness
              const alpha = color.alpha * Math.pow(normalizedDensity, 0.7);  // Smoother alpha curve
              heatCircles += `
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})" />
              `;
            }
          }
        });
      });

      // Generate single spot SVG for multi-spot targets
      const generateSpotSvg = (centerX: number, centerY: number, spotSize: number) => {
        const outerR = spotSize / 2;
        const middleR = outerR * 0.65;
        const innerR = outerR * 0.35;
        return `
          <circle cx="${centerX}" cy="${centerY}" r="${outerR}" fill="#00a2e8" stroke="#0077b3" stroke-width="2" />
          <circle cx="${centerX}" cy="${centerY}" r="${middleR}" fill="#ed1c24" stroke="#b31217" stroke-width="1" />
          <circle cx="${centerX}" cy="${centerY}" r="${innerR}" fill="#fff200" stroke="#ccaa00" stroke-width="1" />
        `;
      };

      // Render multi-spot target for Vegas and NFAA
      // For multi-spot targets, show a SINGLE large target face with the heatmap
      // This is cleaner than showing the full multi-spot layout
      if (targetType !== 'wa_standard') {
        const singleSpotSize = size * 0.85;
        const centerPos = size / 2;
        
        // Generate heatmap circles for the single spot - HIGH RESOLUTION for smoothness
        const spotGridSize = 60;  // Increased for smoother appearance
        const spotCellSize = singleSpotSize / spotGridSize;
        const spotDensityGrid: number[][] = [];
        
        for (let i = 0; i < spotGridSize; i++) {
          spotDensityGrid[i] = [];
          for (let j = 0; j < spotGridSize; j++) {
            spotDensityGrid[i][j] = 0;
          }
        }
        
        shots.forEach((shot) => {
          const gridX = Math.floor(shot.x * spotGridSize);
          const gridY = Math.floor(shot.y * spotGridSize);
          
          const blurRadius = 8;  // Larger blur for smoother gradients
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
              const nx = gridX + dx;
              const ny = gridY + dy;
              if (nx >= 0 && nx < spotGridSize && ny >= 0 && ny < spotGridSize) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                const weight = Math.exp(-distance * distance / 12);  // Smoother falloff
                spotDensityGrid[ny][nx] += weight;
              }
            }
          }
        });
        
        let spotMaxDensity = 0;
        spotDensityGrid.forEach(row => {
          row.forEach(val => {
            if (val > spotMaxDensity) spotMaxDensity = val;
          });
        });
        
        let singleSpotHeatCircles = '';
        const spotLeft = centerPos - singleSpotSize / 2;
        const spotTop = centerPos - singleSpotSize / 2;
        
        spotDensityGrid.forEach((row, y) => {
          row.forEach((density, x) => {
            if (density > 0.05) {  // Threshold to reduce noise
              const normalizedDensity = spotMaxDensity > 0 ? density / spotMaxDensity : 0;
              const color = getHeatColor(normalizedDensity);
              if (color) {
                const cx = spotLeft + x * spotCellSize + spotCellSize / 2;
                const cy = spotTop + y * spotCellSize + spotCellSize / 2;
                const r = spotCellSize * 2.2;  // Larger circles for overlap/smoothness
                const alpha = color.alpha * Math.pow(normalizedDensity, 0.7);  // Smoother alpha curve
                singleSpotHeatCircles += `
                  <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})" />
                `;
              }
            }
          });
        });
        
        // Generate single spot target with proper ring separators (like WA Standard)
        // NFAA/Vegas has 5 scoring rings: outer blue (6/7), blue (8), red (9), red (10), yellow (X)
        const outerR = singleSpotSize / 2;
        
        // Define 5 rings from outside to inside with proper colors
        // Ring percentages: 100%, 80%, 60%, 40%, 20% of outer radius
        // NFAA/Vegas 5-ring target: Blue(outer)-Red-Red-Gold-Gold(X center)
        // Matches TARGET_CONFIGS in appStore.ts
        const ringDefinitions = [
          { radiusPercent: 1.0, fill: '#00a2e8', strokeColor: '#005090' },    // Ring 1 - Blue (6)
          { radiusPercent: 0.8, fill: '#ed1c24', strokeColor: '#901015' },    // Ring 2 - Red (7)
          { radiusPercent: 0.6, fill: '#ed1c24', strokeColor: '#901015' },    // Ring 3 - Red (8)
          { radiusPercent: 0.4, fill: '#fff200', strokeColor: '#907000' },    // Ring 4 - Gold (9)
          { radiusPercent: 0.2, fill: '#fff200', strokeColor: '#907000' },    // Ring 5 - Gold (10/X)
        ];
        
        // Generate ring backgrounds (from outside to inside)
        let ringBackgrounds = '';
        ringDefinitions.forEach((ring) => {
          const r = outerR * ring.radiusPercent;
          ringBackgrounds += `
            <circle cx="${centerPos}" cy="${centerPos}" r="${r}" fill="${ring.fill}" />
          `;
        });
        
        // Generate ring separator lines (drawn on top of heatmap)
        let ringLines = '';
        ringDefinitions.forEach((ring) => {
          const r = outerR * ring.radiusPercent;
          ringLines += `
            <circle cx="${centerPos}" cy="${centerPos}" r="${r}" fill="none" stroke="${ring.strokeColor}" stroke-width="2" />
          `;
        });

        return `
          <svg width="600" height="600" viewBox="0 0 ${size} ${size}" style="display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="${size}" height="${size}" fill="#f5f5f5" />
            <!-- Target ring backgrounds (from outside to inside) -->
            ${ringBackgrounds}
            <!-- Heatmap overlay -->
            ${singleSpotHeatCircles}
            <!-- Ring separator lines (on top of heatmap) -->
            ${ringLines}
            <!-- Center cross -->
            <line x1="${centerPos - 12}" y1="${centerPos}" x2="${centerPos + 12}" y2="${centerPos}" stroke="#000" stroke-width="2" />
            <line x1="${centerPos}" y1="${centerPos - 12}" x2="${centerPos}" y2="${centerPos + 12}" stroke="#000" stroke-width="2" />
          </svg>
        `;
      }

      // WA Standard single target
      // Target rings colors based on target type
      const getTargetRingColors = () => {
        if (targetType === 'wa_standard') {
          // WA Standard - 10 rings: white, white, black, black, blue, blue, red, red, gold, gold
          return ['#f5f5f0', '#f5f5f0', '#2a2a2a', '#2a2a2a', '#00a2e8', '#00a2e8', '#ed1c24', '#ed1c24', '#fff200', '#fff200'];
        } else {
          // Vegas & NFAA - 5 rings (doubled for 10): blue, blue, blue, blue, red, red, red, red, gold, gold
          return ['#00a2e8', '#00a2e8', '#00a2e8', '#00a2e8', '#ed1c24', '#ed1c24', '#ed1c24', '#ed1c24', '#fff200', '#fff200'];
        }
      };
      const ringColorsPdf = getTargetRingColors();
      
      // Generate target ring backgrounds (filled circles)
      let targetRingBgs = '';
      const numRings = targetType === 'wa_standard' ? 10 : 5;
      for (let ringNum = 1; ringNum <= numRings; ringNum++) {
        const diameterPercent = (numRings + 1 - ringNum) / numRings;
        const ringSize = targetSize * diameterPercent;
        const colorIndex = targetType === 'wa_standard' ? ringNum - 1 : Math.floor((ringNum - 1) * 2);
        const bgColor = ringColorsPdf[colorIndex] || '#fff200';
        targetRingBgs += `
          <circle cx="${size/2}" cy="${size/2}" r="${ringSize/2}" fill="${bgColor}" />
        `;
      }
      
      // Generate target ring outlines (to draw on top of heatmap)
      let targetRingLines = '';
      for (let ringNum = 1; ringNum <= numRings; ringNum++) {
        const diameterPercent = (numRings + 1 - ringNum) / numRings;
        const ringSize = targetSize * diameterPercent;
        let borderColor;
        if (targetType === 'wa_standard') {
          borderColor = ringNum <= 2 ? '#888' : ringNum <= 4 ? '#444' : ringNum <= 6 ? '#005090' : ringNum <= 8 ? '#901015' : '#907000';
        } else {
          borderColor = ringNum <= 2 ? '#005090' : ringNum <= 4 ? '#901015' : '#907000';
        }
        targetRingLines += `
          <circle cx="${size/2}" cy="${size/2}" r="${ringSize/2}" fill="none" stroke="${borderColor}" stroke-width="2" />
        `;
      }

      return `
        <svg width="600" height="600" viewBox="0 0 ${size} ${size}" style="display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="targetClip">
              <circle cx="${size/2}" cy="${size/2}" r="${targetSize/2}" />
            </clipPath>
          </defs>
          <!-- Target ring backgrounds -->
          ${targetRingBgs}
          <!-- Heatmap overlay (clipped to target area) -->
          <g clip-path="url(#targetClip)">
            ${heatCircles}
          </g>
          <!-- Target ring lines (on top of heatmap) -->
          ${targetRingLines}
          <!-- Center cross -->
          <line x1="${size/2 - 12}" y1="${size/2}" x2="${size/2 + 12}" y2="${size/2}" stroke="#000" stroke-width="2" />
          <line x1="${size/2}" y1="${size/2 - 12}" x2="${size/2}" y2="${size/2 + 12}" stroke="#000" stroke-width="2" />
        </svg>
      `;
    };

    // Generate Cartesian scatter plot SVG showing shot positions
    const generateScatterPlotSvg = (targetType: string, shots: { x: number; y: number; ring: number }[]) => {
      const size = 500;
      const padding = 60;
      const plotSize = size - padding * 2;
      const center = size / 2;
      
      if (shots.length === 0) {
        return `
          <div style="width: 100%; height: ${size}px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #666; font-size: 16px;">No shot data available</span>
          </div>
        `;
      }
      
      // Grid lines
      let gridLines = '';
      const gridCount = 10;
      const gridStep = plotSize / gridCount;
      
      for (let i = 0; i <= gridCount; i++) {
        const pos = padding + i * gridStep;
        const opacity = i === gridCount / 2 ? 0.8 : 0.2;
        const strokeWidth = i === gridCount / 2 ? 2 : 1;
        // Vertical lines
        gridLines += `<line x1="${pos}" y1="${padding}" x2="${pos}" y2="${size - padding}" stroke="#888" stroke-width="${strokeWidth}" opacity="${opacity}" />`;
        // Horizontal lines
        gridLines += `<line x1="${padding}" y1="${pos}" x2="${size - padding}" y2="${pos}" stroke="#888" stroke-width="${strokeWidth}" opacity="${opacity}" />`;
      }
      
      // Axis labels
      let axisLabels = '';
      const labelStep = 2;
      for (let i = 0; i <= gridCount; i += labelStep) {
        const pos = padding + i * gridStep;
        const value = ((i - gridCount / 2) / (gridCount / 2)).toFixed(1);
        // X axis labels (bottom)
        axisLabels += `<text x="${pos}" y="${size - padding + 20}" text-anchor="middle" font-size="12" fill="#333">${value}</text>`;
        // Y axis labels (left) - inverted because SVG Y is top-down
        const yValue = (-(i - gridCount / 2) / (gridCount / 2)).toFixed(1);
        axisLabels += `<text x="${padding - 10}" y="${pos + 4}" text-anchor="end" font-size="12" fill="#333">${yValue}</text>`;
      }
      
      // Plot shots as dots
      let shotDots = '';
      shots.forEach((shot, index) => {
        // Convert from 0-1 range to -1 to 1 range (center = 0)
        const normalizedX = (shot.x - 0.5) * 2;
        const normalizedY = (shot.y - 0.5) * 2;
        
        // Convert to SVG coordinates
        const svgX = center + normalizedX * (plotSize / 2);
        const svgY = center + normalizedY * (plotSize / 2);
        
        // Color based on ring score
        let dotColor = '#00a2e8'; // Blue for outer
        if (shot.ring >= 9) dotColor = '#FFD700'; // Gold for 9-10
        else if (shot.ring >= 7) dotColor = '#ed1c24'; // Red for 7-8
        
        shotDots += `<circle cx="${svgX}" cy="${svgY}" r="5" fill="${dotColor}" stroke="#000" stroke-width="1" opacity="0.85" />`;
      });
      
      // Calculate statistics for display
      const avgX = shots.reduce((sum, s) => sum + (s.x - 0.5) * 2, 0) / shots.length;
      const avgY = shots.reduce((sum, s) => sum + (s.y - 0.5) * 2, 0) / shots.length;
      const avgSvgX = center + avgX * (plotSize / 2);
      const avgSvgY = center + avgY * (plotSize / 2);
      
      // Mean point of impact marker
      const meanMarker = `
        <circle cx="${avgSvgX}" cy="${avgSvgY}" r="10" fill="none" stroke="#8B0000" stroke-width="3" />
        <line x1="${avgSvgX - 15}" y1="${avgSvgY}" x2="${avgSvgX + 15}" y2="${avgSvgY}" stroke="#8B0000" stroke-width="2" />
        <line x1="${avgSvgX}" y1="${avgSvgY - 15}" x2="${avgSvgX}" y2="${avgSvgY + 15}" stroke="#8B0000" stroke-width="2" />
      `;
      
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg">
          <!-- Background -->
          <rect x="${padding}" y="${padding}" width="${plotSize}" height="${plotSize}" fill="#fafafa" stroke="#ccc" stroke-width="1" />
          
          <!-- Grid lines -->
          ${gridLines}
          
          <!-- Axis labels -->
          ${axisLabels}
          
          <!-- X axis title -->
          <text x="${center}" y="${size - 15}" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">Horizontal (Left/Right)</text>
          
          <!-- Y axis title -->
          <text x="15" y="${center}" text-anchor="middle" font-size="14" font-weight="bold" fill="#333" transform="rotate(-90, 15, ${center})">Vertical (Up/Down)</text>
          
          <!-- Shot dots -->
          ${shotDots}
          
          <!-- Mean point of impact -->
          ${meanMarker}
          
          <!-- Legend -->
          <rect x="${size - 130}" y="${padding + 10}" width="120" height="90" fill="white" stroke="#ccc" rx="4" />
          <text x="${size - 120}" y="${padding + 28}" font-size="11" font-weight="bold" fill="#333">Legend</text>
          <circle cx="${size - 115}" cy="${padding + 45}" r="5" fill="#FFD700" stroke="#000" stroke-width="1" />
          <text x="${size - 105}" y="${padding + 49}" font-size="10" fill="#333">9-10 (Gold)</text>
          <circle cx="${size - 115}" cy="${padding + 62}" r="5" fill="#ed1c24" stroke="#000" stroke-width="1" />
          <text x="${size - 105}" y="${padding + 66}" font-size="10" fill="#333">7-8 (Red)</text>
          <circle cx="${size - 115}" cy="${padding + 79}" r="5" fill="#00a2e8" stroke="#000" stroke-width="1" />
          <text x="${size - 105}" y="${padding + 83}" font-size="10" fill="#333">≤6 (Blue)</text>
          
          <!-- Mean POI label -->
          <text x="${size - 120}" y="${padding + 95}" font-size="9" fill="#8B0000">● Mean POI: (${avgX.toFixed(2)}, ${(-avgY).toFixed(2)})</text>
        </svg>
      `;
    };

    // Generate scatter plot with target face as background
    const generateTargetFaceScatterSvg = (targetType: string, shots: { x: number; y: number; ring: number }[]) => {
      const size = 500;
      const center = size / 2;
      const maxRadius = size * 0.45;
      
      if (shots.length === 0) {
        return `
          <div style="width: 100%; height: ${size}px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #666; font-size: 16px;">No shot data available</span>
          </div>
        `;
      }
      
      // Generate target face rings based on target type
      let targetRings = '';
      if (targetType === 'vegas_3spot') {
        const ringSize = maxRadius;
        targetRings = `
          <circle cx="${center}" cy="${center}" r="${ringSize}" fill="#00a2e8" />
          <circle cx="${center}" cy="${center}" r="${ringSize * 0.7}" fill="#ed1c24" />
          <circle cx="${center}" cy="${center}" r="${ringSize * 0.4}" fill="#fff200" />
          <circle cx="${center}" cy="${center}" r="${ringSize * 0.2}" fill="#fff200" stroke="#000" stroke-width="1" />
        `;
      } else if (targetType === 'nfaa_indoor') {
        const ringSize = maxRadius;
        targetRings = `
          <circle cx="${center}" cy="${center}" r="${ringSize}" fill="#00a2e8" />
          <circle cx="${center}" cy="${center}" r="${ringSize * 0.75}" fill="#00a2e8" stroke="#fff" stroke-width="2" />
          <circle cx="${center}" cy="${center}" r="${ringSize * 0.5}" fill="#ed1c24" />
          <circle cx="${center}" cy="${center}" r="${ringSize * 0.3}" fill="#fff200" />
          <circle cx="${center}" cy="${center}" r="${ringSize * 0.15}" fill="#fff" stroke="#000" stroke-width="1" />
        `;
      } else {
        // WA Standard (default)
        const rings = [
          { r: 1.0, fill: '#FFFFFF', stroke: '#ccc' },
          { r: 0.9, fill: '#FFFFFF', stroke: '#ccc' },
          { r: 0.8, fill: '#000000', stroke: '#333' },
          { r: 0.7, fill: '#000000', stroke: '#333' },
          { r: 0.6, fill: '#00a2e8', stroke: '#0088cc' },
          { r: 0.5, fill: '#00a2e8', stroke: '#0088cc' },
          { r: 0.4, fill: '#ed1c24', stroke: '#cc0000' },
          { r: 0.3, fill: '#ed1c24', stroke: '#cc0000' },
          { r: 0.2, fill: '#fff200', stroke: '#cccc00' },
          { r: 0.1, fill: '#fff200', stroke: '#cccc00' },
        ];
        targetRings = rings.map(ring => 
          `<circle cx="${center}" cy="${center}" r="${maxRadius * ring.r}" fill="${ring.fill}" stroke="${ring.stroke}" stroke-width="1" />`
        ).join('\n');
      }
      
      // Plot shots on target
      let shotDots = '';
      shots.forEach((shot) => {
        const svgX = center + shot.x * maxRadius;
        const svgY = center + shot.y * maxRadius;
        shotDots += `<circle cx="${svgX}" cy="${svgY}" r="6" fill="#8B0000" stroke="#fff" stroke-width="2" opacity="0.9" />`;
      });
      
      // Calculate Mean Point of Impact
      const avgX = shots.reduce((sum, s) => sum + s.x, 0) / shots.length;
      const avgY = shots.reduce((sum, s) => sum + s.y, 0) / shots.length;
      const avgSvgX = center + avgX * maxRadius;
      const avgSvgY = center + avgY * maxRadius;
      
      const meanMarker = `
        <circle cx="${avgSvgX}" cy="${avgSvgY}" r="12" fill="none" stroke="#000" stroke-width="3" />
        <circle cx="${avgSvgX}" cy="${avgSvgY}" r="12" fill="none" stroke="#FFD700" stroke-width="2" />
        <line x1="${avgSvgX - 18}" y1="${avgSvgY}" x2="${avgSvgX + 18}" y2="${avgSvgY}" stroke="#000" stroke-width="3" />
        <line x1="${avgSvgX - 18}" y1="${avgSvgY}" x2="${avgSvgX + 18}" y2="${avgSvgY}" stroke="#FFD700" stroke-width="2" />
        <line x1="${avgSvgX}" y1="${avgSvgY - 18}" x2="${avgSvgX}" y2="${avgSvgY + 18}" stroke="#000" stroke-width="3" />
        <line x1="${avgSvgX}" y1="${avgSvgY - 18}" x2="${avgSvgX}" y2="${avgSvgY + 18}" stroke="#FFD700" stroke-width="2" />
      `;
      
      const poiDescription = `${avgX > 0 ? 'Right' : 'Left'} ${Math.abs(avgX * 100).toFixed(1)}%, ${avgY > 0 ? 'Low' : 'High'} ${Math.abs(avgY * 100).toFixed(1)}%`;
      
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg">
          <!-- Target Face Background -->
          <circle cx="${center}" cy="${center}" r="${maxRadius + 5}" fill="#1a1a1a" />
          ${targetRings}
          
          <!-- Shot markers -->
          ${shotDots}
          
          <!-- Mean Point of Impact -->
          ${meanMarker}
          
          <!-- Labels -->
          <text x="${center}" y="${size - 15}" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">Shot Distribution on Target - ${shots.length} arrows</text>
        </svg>
        <div style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">
          <strong>Mean Point of Impact:</strong> (${poiDescription})
        </div>
      `;
    };
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Arrow Tracker Report ${reportDate}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #ffffff;
              color: #000000;
              padding: 0;
              margin: 0;
            }
            .page {
              page-break-after: always;
              min-height: 100vh;
              padding: 40px;
              box-sizing: border-box;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            .page-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 20px;
              border-bottom: 2px solid #8B0000;
            }
            .page-header h2 {
              color: #8B0000;
              margin: 0;
              font-size: 28px;
            }
            .page-header p {
              color: #666;
              margin: 8px 0 0 0;
              font-size: 14px;
            }
            .header {
              text-align: center;
              margin-bottom: 32px;
            }
            .header h1 {
              color: #8B0000;
              margin: 0 0 8px 0;
              font-size: 32px;
            }
            .header p {
              color: #333;
              margin: 4px 0;
            }
            .equipment-info {
              color: #555;
              font-size: 14px;
              margin-top: 16px;
            }
            .card {
              background: #f9f9f9;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 12px;
              border: 1px solid #ddd;
            }
            .card h3 {
              color: #000;
              margin: 0 0 12px 0;
              font-size: 18px;
            }
            .stats-grid {
              display: flex;
              flex-wrap: wrap;
            }
            .stat-item {
              width: 50%;
              text-align: center;
              padding: 10px 0;
            }
            .stat-value {
              font-size: 32px;
              font-weight: bold;
              color: #8B0000;
            }
            .stat-label {
              font-size: 12px;
              color: #555;
              margin-top: 4px;
            }
            .avg-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #ddd;
              font-size: 14px;
            }
            .avg-label { color: #555; }
            .avg-value { font-weight: bold; font-size: 18px; color: #000; }
            .highlight-row {
              display: flex;
              gap: 12px;
            }
            .highlight-item {
              flex: 1;
              background: #fff;
              border-radius: 12px;
              padding: 14px;
              text-align: center;
              border: 1px solid #ddd;
            }
            .highlight-label {
              font-size: 12px;
              color: #555;
              margin-bottom: 8px;
            }
            .highlight-value {
              font-size: 24px;
              font-weight: bold;
              color: #2E7D32;
            }
            .highlight-value-low {
              font-size: 24px;
              font-weight: bold;
              color: #C62828;
            }
            .highlight-date {
              font-size: 11px;
              color: #666;
              margin-top: 8px;
            }
            .heatmap-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 80vh;
            }
            .heatmap-info {
              text-align: center;
              margin-bottom: 20px;
            }
            .heatmap-info p {
              color: #666;
              font-size: 16px;
              margin: 0;
            }
            .score-table {
              width: 100%;
              border-collapse: collapse;
            }
            .score-table td {
              color: #333;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <!-- Page 1: Overview & Stats -->
          <div class="page">
            <div class="header">
              <h1>Arrow Tracker Performance Report</h1>
              <p style="font-size: 16px;">${formatDateRange()}</p>
              <p style="font-size: 12px; color: #666;">Generated ${new Date().toLocaleDateString()}</p>
              <div class="equipment-info">
                ${usedBows.length > 0 ? `<div>Bow${usedBows.length > 1 ? 's' : ''}: ${usedBows.join(', ')}</div>` : ''}
                ${usedDistances.length > 0 ? `<div>Distance${usedDistances.length > 1 ? 's' : ''}: ${usedDistances.join(', ')}</div>` : ''}
                ${usedTargetTypes.length > 0 ? `<div>Target${usedTargetTypes.length > 1 ? 's' : ''}: ${usedTargetTypes.join(', ')}</div>` : ''}
              </div>
            </div>

            <div class="card">
              <h3>Overview</h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">${reportStats.totalSessions}</div>
                  <div class="stat-label">Sessions</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${reportStats.totalRounds}</div>
                  <div class="stat-label">Rounds</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${reportStats.totalArrows}</div>
                  <div class="stat-label">Arrows</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${reportStats.totalPoints}</div>
                  <div class="stat-label">Total Points</div>
                </div>
              </div>
            </div>

            <div class="card">
              <h3>Averages</h3>
              <div class="avg-row">
                <span class="avg-label">Per Arrow</span>
                <span class="avg-value">${reportStats.avgPerArrow}</span>
              </div>
              <div class="avg-row">
                <span class="avg-label">Per Round</span>
                <span class="avg-value">${reportStats.avgPerRound}</span>
              </div>
              <div class="avg-row">
                <span class="avg-label">Per Session</span>
                <span class="avg-value">${reportStats.avgPerSession}</span>
              </div>
            </div>

            ${reportStats.totalSessions > 0 ? `
              <div class="card">
                <h3>Highlights</h3>
                <div class="highlight-row">
                  <div class="highlight-item">
                    <div class="highlight-label">Best Session</div>
                    <div class="highlight-value">${reportStats.bestSession.score} pts</div>
                    <div class="highlight-date">${reportStats.bestSession.date}</div>
                  </div>
                  <div class="highlight-item">
                    <div class="highlight-label">Lowest Session</div>
                    <div class="highlight-value-low">${reportStats.worstSession.score} pts</div>
                    <div class="highlight-date">${reportStats.worstSession.date}</div>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Heatmap Pages - One per target type with scatter plot -->
          ${['wa_standard', 'vegas_3spot', 'nfaa_indoor'].map(targetType => {
            const shotsForType = shotsByTargetType[targetType] || [];
            if (shotsForType.length === 0) return '';
            return `
          <div class="page">
            <div class="page-header">
              <h2>${getTargetTypeName(targetType)} - Shot Analysis</h2>
              <p>${shotsForType.length} arrows</p>
            </div>
            <div style="text-align: center; margin-bottom: 30px;">
              <h3 style="color: #8B0000; margin-bottom: 10px; font-size: 18px;">Target Face Shot Map</h3>
              ${generateTargetFaceScatterSvg(targetType, shotsForType)}
            </div>
            <div style="display: flex; justify-content: space-around; align-items: flex-start; gap: 20px; flex-wrap: wrap;">
              <div style="text-align: center; flex: 1; min-width: 200px;">
                <h3 style="color: #8B0000; margin-bottom: 10px; font-size: 16px;">Heat Map</h3>
                ${generateHeatmapSvg(targetType, shotsForType)}
              </div>
              <div style="text-align: center; flex: 1; min-width: 200px;">
                <h3 style="color: #8B0000; margin-bottom: 10px; font-size: 16px;">Cartesian Distribution</h3>
                ${generateScatterPlotSvg(targetType, shotsForType)}
              </div>
            </div>
          </div>
            `;
          }).join('')}

          <!-- Page 3: Score Distribution -->
          ${reportStats.totalArrows > 0 ? `
          <div class="page">
            <div class="page-header">
              <h2>Score Distribution</h2>
              <p>${reportStats.totalArrows} total arrows</p>
            </div>
            <table class="score-table">
              ${ringDistributionRows}
            </table>
            <div class="footer">
              <p>Arrow Tracker - ${new Date().getFullYear()}</p>
            </div>
          </div>
          ` : ''}
        </body>
      </html>
    `;
  };

  // Handle PDF - create and open/share
  const handleDownloadPdf = async () => {
    // Generate filename with date in readable format
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).replace(/,/g, '').replace(/\s+/g, '_'); // "Feb_3_2025"
    const pdfFileName = `Arrow_Tracker_Report_${dateStr}.pdf`;
    
    if (Platform.OS === 'web') {
      // For web, open in new tab directly
      try {
        const html = generatePdfHtml();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (error) {
        console.error('Web PDF error:', error);
        alert('Failed to open PDF. Please try again.');
      }
    } else if (Platform.OS === 'android') {
      // Android - generate PDF and open with intent or share
      try {
        const html = generatePdfHtml();
        
        // Generate PDF
        const { uri } = await Print.printToFileAsync({ 
          html,
          base64: false,
        });
        
        // Copy to cache directory with proper name
        const newUri = FileSystem.cacheDirectory + pdfFileName;
        await FileSystem.copyAsync({ from: uri, to: newUri });
        
        // Get content URI for Android intent
        const contentUri = await FileSystem.getContentUriAsync(newUri);
        
        // Try to open with VIEW intent
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/pdf',
          });
        } catch (intentError: any) {
          // IntentLauncher failed - use share sheet instead
          console.log('IntentLauncher not available, using share:', intentError.message);
          await Sharing.shareAsync(newUri, {
            mimeType: 'application/pdf',
            dialogTitle: pdfFileName,
          });
        }
      } catch (error: any) {
        console.error('PDF generation error:', error);
        Alert.alert('Error', 'Failed to generate PDF: ' + error.message);
      }
    } else {
      // iOS - use share sheet
      try {
        const html = generatePdfHtml();
        const { uri } = await Print.printToFileAsync({ html });
        const newUri = FileSystem.cacheDirectory + pdfFileName;
        await FileSystem.copyAsync({ from: uri, to: newUri });
        
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } catch (error) {
        console.error('PDF error:', error);
        Alert.alert('Error', 'Failed to generate PDF');
      }
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

  // Ring colors for heatmap
  const ringColors = [
    '#f5f5f0', '#f5f5f0', '#2a2a2a', '#2a2a2a',
    '#00a2e8', '#00a2e8', '#ed1c24', '#ed1c24',
    '#fff200', '#fff200',
  ];

  // Heatmap Component - shows density of shots as a gradient overlay with target type support
  const HeatmapTargetMap = ({ size = 280, displayTargetType, shots: inputShots }: { size?: number, displayTargetType?: string, shots?: { x: number; y: number; ring: number }[] }) => {
    const shots = inputShots || allShots;
    const targetType = displayTargetType || 'wa_standard';
    
    if (shots.length === 0) {
      return (
        <View style={[heatmapStyles.emptyContainer, { width: size, height: size }]}>
          <Ionicons name="flame-outline" size={48} color="#888888" />
          <Text style={heatmapStyles.emptyText}>No shots in this period</Text>
        </View>
      );
    }

    const targetScale = 0.8;
    const targetSize = size * targetScale;
    
    // Spot radii for multi-spot targets
    const vegasSpotRadius = 0.19;
    const nfaaSpotRadius = 0.14;

    // Get spot centers in normalized coordinates (0-1) - MUST MATCH scoring.tsx
    const getSpotCentersNormalized = () => {
      if (targetType === 'vegas_3spot') {
        return [
          { x: 0.5, y: 0.28 },   // Top center
          { x: 0.29, y: 0.72 },  // Bottom left
          { x: 0.71, y: 0.72 },  // Bottom right
        ];
      } else if (targetType === 'nfaa_indoor') {
        return [
          { x: 0.5, y: 0.17 },   // Top
          { x: 0.5, y: 0.5 },    // Middle
          { x: 0.5, y: 0.83 },   // Bottom
        ];
      }
      return [{ x: 0.5, y: 0.5 }];
    };

    const spotCentersNormalized = getSpotCentersNormalized();
    const spotCenters = spotCentersNormalized.map(c => ({ x: c.x * size, y: c.y * size }));
    const spotRadius = targetType === 'vegas_3spot' ? vegasSpotRadius : nfaaSpotRadius;
    const spotSize = spotRadius * 2 * size;

    // Single spot component for multi-spot targets
    const SingleSpot = ({ centerX, centerY }: { centerX: number, centerY: number }) => {
      const currentSpotSize = targetType === 'vegas_3spot' ? size * 0.19 * 2 : size * 0.14 * 2;
      const spotRadiusPx = currentSpotSize / 2;
      return (
        <View
          style={{
            position: 'absolute',
            left: centerX - spotRadiusPx,
            top: centerY - spotRadiusPx,
            width: currentSpotSize,
            height: currentSpotSize,
          }}
        >
          <View style={[heatmapStyles.ring, {
            width: currentSpotSize, height: currentSpotSize, borderRadius: currentSpotSize / 2,
            backgroundColor: '#00a2e8', borderColor: '#0077b3', borderWidth: 1,
          }]}>
            <View style={[heatmapStyles.ring, {
              width: currentSpotSize * 0.65, height: currentSpotSize * 0.65, borderRadius: currentSpotSize * 0.325,
              backgroundColor: '#ed1c24', borderColor: '#b31217', borderWidth: 1,
            }]}>
              <View style={[heatmapStyles.ring, {
                width: currentSpotSize * 0.35, height: currentSpotSize * 0.35, borderRadius: currentSpotSize * 0.175,
                backgroundColor: '#fff200', borderColor: '#ccaa00', borderWidth: 1,
              }]} />
            </View>
          </View>
        </View>
      );
    };
    
    // Higher resolution grid for smoother heatmap
    const gridSize = 70;  // Increased for smoother appearance
    const cellSize = size / gridSize;
    const densityGrid: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    
    // Calculate density for each grid cell
    shots.forEach((shot) => {
      const gridX = Math.floor(shot.x * gridSize);
      const gridY = Math.floor(shot.y * gridSize);
      
      // Larger blur radius for smoother gradients
      const blurRadius = 8;  // Increased for smoother blending
      for (let dx = -blurRadius; dx <= blurRadius; dx++) {
        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          const nx = gridX + dx;
          const ny = gridY + dy;
          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Smoother gaussian falloff
            const weight = Math.exp(-distance * distance / 14);  // Gentler falloff
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
    
    // Generate heatmap colors
    const getHeatColor = (normalizedValue: number) => {
      if (normalizedValue === 0) return 'transparent';
      
      // Green → Yellow → Orange → Red color scale
      const colors = [
        { pos: 0, r: 0, g: 200, b: 0 },       // Green
        { pos: 0.33, r: 255, g: 255, b: 0 },  // Yellow
        { pos: 0.66, r: 255, g: 165, b: 0 },  // Orange
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

    // Create heatmap cells with smoother appearance
    const heatmapCells: { x: number; y: number; color: string; opacity: number }[] = [];
    densityGrid.forEach((row, y) => {
      row.forEach((density, x) => {
        if (density > 0.03) {  // Small threshold to reduce noise
          const normalizedDensity = maxDensity > 0 ? density / maxDensity : 0;
          const smoothedOpacity = Math.pow(normalizedDensity, 0.7);  // Smoother opacity curve
          heatmapCells.push({
            x: x * cellSize,
            y: y * cellSize,
            color: getHeatColor(normalizedDensity),
            opacity: smoothedOpacity,
          });
        }
      });
    });

    // Render multi-spot target (Vegas or NFAA)
    // For multi-spot targets, render a SINGLE large target with the heatmap overlay
    // Recalculate density for proper single-spot display
    if (targetType !== 'wa_standard') {
      // Render a single representative target face with heatmap
      const singleSpotSize = size * 0.75;
      const spotRadiusPx = singleSpotSize / 2;
      
      // Recalculate density grid specifically for single spot display - HIGH RES
      const spotGridSize = 55;  // Increased for smoother appearance
      const spotCellSize = singleSpotSize / spotGridSize;
      const spotDensityGrid: number[][] = Array(spotGridSize).fill(null).map(() => Array(spotGridSize).fill(0));
      
      // Calculate density using shot coordinates (which are relative to spot, 0-1)
      shots.forEach((shot) => {
        const gridX = Math.floor(shot.x * spotGridSize);
        const gridY = Math.floor(shot.y * spotGridSize);
        
        const blurRadius = 7;  // Larger blur for smoother gradients
        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            const nx = gridX + dx;
            const ny = gridY + dy;
            if (nx >= 0 && nx < spotGridSize && ny >= 0 && ny < spotGridSize) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              const weight = Math.exp(-distance * distance / 10);  // Smoother falloff
              spotDensityGrid[ny][nx] += weight;
            }
          }
        }
      });
      
      let spotMaxDensity = 0;
      spotDensityGrid.forEach(row => {
        row.forEach(val => {
          if (val > spotMaxDensity) spotMaxDensity = val;
        });
      });
      
      // Generate heatmap cells for this spot with smoother rendering
      const spotHeatmapCells: { x: number; y: number; color: string; opacity: number }[] = [];
      spotDensityGrid.forEach((row, y) => {
        row.forEach((density, x) => {
          if (density > 0.03) {  // Small threshold to reduce noise
            const normalizedDensity = spotMaxDensity > 0 ? density / spotMaxDensity : 0;
            const smoothedOpacity = Math.pow(normalizedDensity, 0.7);  // Smoother curve
            spotHeatmapCells.push({
              x: x * spotCellSize,
              y: y * spotCellSize,
              color: getHeatColor(normalizedDensity),
              opacity: smoothedOpacity,
            });
          }
        });
      });
      
      // Define 5 rings with proper colors - from outside to inside
      // Matches TARGET_CONFIGS in appStore.ts: Blue → Red → Red → Gold → Gold
      const ringDefinitions = [
        { radiusPercent: 1.0, fill: '#00a2e8', strokeColor: '#005090' },    // Ring 1 - Blue (6)
        { radiusPercent: 0.8, fill: '#ed1c24', strokeColor: '#901015' },    // Ring 2 - Red (7)
        { radiusPercent: 0.6, fill: '#ed1c24', strokeColor: '#901015' },    // Ring 3 - Red (8)
        { radiusPercent: 0.4, fill: '#fff200', strokeColor: '#907000' },    // Ring 4 - Gold (9)
        { radiusPercent: 0.2, fill: '#fff200', strokeColor: '#907000' },    // Ring 5 - Gold (10/X)
      ];
      
      const centerPos = singleSpotSize / 2;
      
      return (
        <View style={[heatmapStyles.container, { width: size, height: size }]}>
          {/* Single spot target centered with proper rings */}
          <View style={{ width: singleSpotSize, height: singleSpotSize }}>
            <Svg width={singleSpotSize} height={singleSpotSize}>
              {/* Ring backgrounds (from outside to inside) */}
              {ringDefinitions.map((ring, i) => (
                <Circle
                  key={`ring-bg-${i}`}
                  cx={centerPos}
                  cy={centerPos}
                  r={centerPos * ring.radiusPercent}
                  fill={ring.fill}
                />
              ))}
              
              {/* Heatmap overlay */}
              <Defs>
                {spotHeatmapCells.map((cell, index) => (
                  <RadialGradient
                    key={`grad-multi-${index}`}
                    id={`heatGradMulti-${targetType}-${index}`}
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
                {spotHeatmapCells.map((cell, index) => (
                  <Circle
                    key={`heat-multi-${index}`}
                    cx={cell.x + spotCellSize / 2}
                    cy={cell.y + spotCellSize / 2}
                    r={spotCellSize * 2.2}
                    fill={`url(#heatGradMulti-${targetType}-${index})`}
                  />
                ))}
              </G>
              
              {/* Ring separator lines (on top of heatmap) */}
              {ringDefinitions.map((ring, i) => (
                <Circle
                  key={`ring-line-${i}`}
                  cx={centerPos}
                  cy={centerPos}
                  r={centerPos * ring.radiusPercent}
                  fill="none"
                  stroke={ring.strokeColor}
                  strokeWidth={1.5}
                />
              ))}
            </Svg>
          </View>
        </View>
      );
    }

    // Render WA Standard single-spot target
    return (
      <View style={[heatmapStyles.container, { width: size, height: size }]}>
        {/* Target Background */}
        <View style={[heatmapStyles.targetBackground, { width: targetSize, height: targetSize, borderRadius: targetSize / 2 }]}>
          {/* Draw rings from outside to inside */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ringNum) => {
            const diameterPercent = (11 - ringNum) / 10;
            const ringSize = targetSize * diameterPercent;
            const bgColor = ringColors[ringNum - 1];
            return (
              <View
                key={`ring-${ringNum}`}
                style={[
                  heatmapStyles.ring,
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
          <View style={heatmapStyles.centerMark}>
            <View style={heatmapStyles.centerLine} />
            <View style={[heatmapStyles.centerLine, { transform: [{ rotate: '90deg' }] }]} />
          </View>
        </View>

        {/* Heatmap Overlay using SVG - clipped to target area */}
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: targetSize, height: targetSize, borderRadius: targetSize / 2, overflow: 'hidden' }}>
            <Svg width={targetSize} height={targetSize}>
              <Defs>
                {heatmapCells.map((cell, index) => (
                  <RadialGradient
                    key={`grad-${index}`}
                    id={`heatGradReport-${index}`}
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
                {heatmapCells.map((cell, index) => {
                  // Scale coordinates from full size to target size
                  const scaledX = (cell.x / size) * targetSize;
                  const scaledY = (cell.y / size) * targetSize;
                  const scaledCellSize = (cellSize / size) * targetSize;
                  return (
                    <Circle
                      key={`heat-${index}`}
                      cx={scaledX + scaledCellSize / 2}
                      cy={scaledY + scaledCellSize / 2}
                      r={scaledCellSize * 2.0}
                      fill={`url(#heatGradReport-${index})`}
                    />
                  );
                })}
              </G>
            </Svg>
          </View>
        </View>
      </View>
    );
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
            <Text style={styles.selectionTitle}>Configure Report</Text>
            <Text style={styles.selectionSubtitle}>
              Select time range and filters for your report
            </Text>
          </View>

          {/* Bow Filter */}
          {bows.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Filter by Bow</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedBow && styles.filterChipActive]}
                  onPress={() => setSelectedBow(null)}
                >
                  <Text style={[styles.filterChipText, !selectedBow && styles.filterChipTextActive]}>All Bows</Text>
                </TouchableOpacity>
                {bows.map((bow) => (
                  <TouchableOpacity
                    key={bow.id}
                    style={[styles.filterChip, selectedBow === bow.id && styles.filterChipActive]}
                    onPress={() => setSelectedBow(selectedBow === bow.id ? null : bow.id)}
                  >
                    <Text style={[styles.filterChipText, selectedBow === bow.id && styles.filterChipTextActive]}>
                      {bow.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Distance Filter */}
          {availableDistances.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Filter by Distance</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedDistance && styles.filterChipActive]}
                  onPress={() => setSelectedDistance(null)}
                >
                  <Text style={[styles.filterChipText, !selectedDistance && styles.filterChipTextActive]}>All Distances</Text>
                </TouchableOpacity>
                {availableDistances.map((distance) => (
                  <TouchableOpacity
                    key={distance}
                    style={[styles.filterChip, selectedDistance === distance && styles.filterChipActive]}
                    onPress={() => setSelectedDistance(selectedDistance === distance ? null : distance)}
                  >
                    <Text style={[styles.filterChipText, selectedDistance === distance && styles.filterChipTextActive]}>
                      {distance}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Target Type Filter */}
          {availableTargetTypes.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Filter by Target</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedTargetType && styles.filterChipActive]}
                  onPress={() => setSelectedTargetType(null)}
                >
                  <Text style={[styles.filterChipText, !selectedTargetType && styles.filterChipTextActive]}>All Targets</Text>
                </TouchableOpacity>
                {availableTargetTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, selectedTargetType === type && styles.filterChipActive]}
                    onPress={() => setSelectedTargetType(selectedTargetType === type ? null : type)}
                  >
                    <Text style={[styles.filterChipText, selectedTargetType === type && styles.filterChipTextActive]}>
                      {getTargetTypeName(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selection Mode Toggle */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>Select Sessions By</Text>
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeToggleButton, selectionMode === 'dateRange' && styles.modeToggleButtonActive]}
                onPress={() => setSelectionMode('dateRange')}
              >
                <Ionicons name="calendar" size={18} color={selectionMode === 'dateRange' ? '#fff' : '#8B0000'} />
                <Text style={[styles.modeToggleText, selectionMode === 'dateRange' && styles.modeToggleTextActive]}>
                  Date Range
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleButton, selectionMode === 'sessions' && styles.modeToggleButtonActive]}
                onPress={() => setSelectionMode('sessions')}
              >
                <Ionicons name="list" size={18} color={selectionMode === 'sessions' ? '#fff' : '#8B0000'} />
                <Text style={[styles.modeToggleText, selectionMode === 'sessions' && styles.modeToggleTextActive]}>
                  Individual Sessions
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Individual Session Selection */}
          {selectionMode === 'sessions' && (
            <View style={styles.sessionSelectionContainer}>
              <View style={styles.sessionSelectionHeader}>
                <Text style={styles.sectionLabel}>Select Sessions ({selectedSessionIds.size} selected)</Text>
                <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
                  <Text style={styles.selectAllText}>
                    {selectedSessionIds.size === sessions.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sessionsList}>
                {sessions.slice().reverse().map((session) => {
                  const isSelected = selectedSessionIds.has(session.id);
                  const sessionDate = new Date(session.created_at);
                  const bowName = session.bow_name || 'Unknown Bow';
                  const totalScore = session.total_score || 0;
                  const totalArrows = session.rounds.reduce((sum, r) => sum + (r.shots?.length || 0), 0);
                  
                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[styles.sessionSelectItem, isSelected && styles.sessionSelectItemActive]}
                      onPress={() => toggleSessionSelection(session.id)}
                    >
                      <View style={[styles.sessionCheckbox, isSelected && styles.sessionCheckboxChecked]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <View style={styles.sessionSelectInfo}>
                        <Text style={styles.sessionSelectDate}>
                          {sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <Text style={styles.sessionSelectDetails}>
                          {bowName} • {session.distance || 'No distance'} • {session.rounds.length} rounds
                        </Text>
                      </View>
                      <View style={styles.sessionSelectScore}>
                        <Text style={styles.sessionSelectScoreValue}>{totalScore}</Text>
                        <Text style={styles.sessionSelectScoreLabel}>pts</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quick Select Buttons and Custom Date Range - Only show in date range mode */}
          {selectionMode === 'dateRange' && (
            <>
              <View style={styles.quickSelectContainer}>
                <Text style={styles.sectionLabel}>Time Range</Text>
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
                <Text style={styles.sectionLabel}>Custom Date Range</Text>
            
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
            </>
          )}

          {/* Summary Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Report Preview</Text>
            <View style={styles.previewRow}>
              <Ionicons name="calendar" size={18} color="#888" />
              <Text style={styles.previewText}>{formatDateRange()}</Text>
            </View>
            <View style={styles.previewRow}>
              <Ionicons name="options" size={18} color="#888" />
              <Text style={styles.previewText}>{getFilterSummary()}</Text>
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
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Report Header */}
        <View style={styles.reportHeader}>
          <Ionicons name="document-text" size={32} color="#8B0000" />
          <Text style={styles.reportTitle}>Performance Report</Text>
          <Text style={styles.reportDate}>{formatDateRange()}</Text>
          {(selectedBow || selectedDistance || selectedTargetType) && (
            <View style={styles.filterBadge}>
              <Ionicons name="filter" size={14} color="#8B0000" />
              <Text style={styles.filterBadgeText}>{getFilterSummary()}</Text>
            </View>
          )}
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

        {/* Stats by Target Type */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="apps" size={18} color="#8B0000" /> By Target Type
          </Text>
          <View style={styles.targetTypeList}>
            {['wa_standard', 'vegas_3spot', 'nfaa_indoor'].map((targetType) => {
              const typeStats = statsByTargetType[targetType];
              if (!typeStats || typeStats.sessions === 0) return null;
              return (
                <View key={targetType} style={styles.targetTypeCard}>
                  <View style={styles.targetTypeHeaderRow}>
                    <Text style={styles.targetTypeTitleText}>{getTargetTypeName(targetType)}</Text>
                    <Text style={styles.targetTypeAvgText}>{typeStats.avgPerArrow}/arrow</Text>
                  </View>
                  <View style={styles.targetTypeStatsRow}>
                    <View style={styles.targetTypeStatBox}>
                      <Text style={styles.targetTypeStatValue}>{typeStats.sessions}</Text>
                      <Text style={styles.targetTypeStatLabel}>Sessions</Text>
                    </View>
                    <View style={styles.targetTypeStatBox}>
                      <Text style={styles.targetTypeStatValue}>{typeStats.rounds}</Text>
                      <Text style={styles.targetTypeStatLabel}>Rounds</Text>
                    </View>
                    <View style={styles.targetTypeStatBox}>
                      <Text style={styles.targetTypeStatValue}>{typeStats.arrows}</Text>
                      <Text style={styles.targetTypeStatLabel}>Arrows</Text>
                    </View>
                    <View style={styles.targetTypeStatBox}>
                      <Text style={styles.targetTypeStatValue}>{typeStats.points}</Text>
                      <Text style={styles.targetTypeStatLabel}>Points</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {Object.values(statsByTargetType).every(s => s.sessions === 0) && (
              <Text style={styles.noTargetDataText}>No data for any target type in selected period</Text>
            )}
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

        {/* Heatmap Cards - One per target type with data */}
        {['wa_standard', 'vegas_3spot', 'nfaa_indoor'].map((targetType) => {
          const shotsForType = shotsByTargetType[targetType] || [];
          if (shotsForType.length === 0) return null;
          
          return (
            <View key={`heatmap-${targetType}`} style={styles.card}>
              <Text style={styles.cardTitle}>
                <Ionicons name="flame" size={18} color="#8B0000" /> {getTargetTypeName(targetType)} Heatmap
              </Text>
              <Text style={styles.heatmapSubtitle}>
                {shotsForType.length} arrows
              </Text>
              <View style={styles.heatmapContainer}>
                <HeatmapTargetMap size={280} displayTargetType={targetType} shots={shotsForType} />
              </View>
            </View>
          );
        })}

        {/* Score Distribution */}
        {reportStats.totalArrows > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="bar-chart" size={18} color="#8B0000" /> Score Distribution
            </Text>
            <View style={styles.distributionList}>
              {((selectedTargetType || 'wa_standard') === 'wa_standard' 
                ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] 
                : [10, 9, 8, 7, 6, 0]
              ).map((ring) => {
                const count = reportStats.ringDistribution[ring] || 0;
                const percentage = reportStats.totalArrows > 0 ? (count / reportStats.totalArrows) * 100 : 0;
                return (
                  <View key={ring} style={styles.distributionRow}>
                    <Text style={styles.distributionLabel}>{ring === 0 ? 'M' : ring}</Text>
                    <View style={styles.distributionBarContainer}>
                      <View style={[styles.distributionBar, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.distributionCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty State */}
        {reportStats.totalSessions === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#888888" />
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptyText}>
              No sessions found for this period. Try selecting a different date range or filters.
            </Text>
          </View>
        )}

        {/* Save PDF Button */}
        <TouchableOpacity style={styles.downloadPdfButton} onPress={handleDownloadPdf}>
          <Ionicons name="download-outline" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>Save PDF</Text>
        </TouchableOpacity>

        {/* Edit Range Button */}
        <TouchableOpacity 
          style={styles.editRangeButton} 
          onPress={() => setShowReport(false)}
        >
          <Ionicons name="options-outline" size={20} color="#8B0000" />
          <Text style={styles.editRangeButtonText}>Change Filters</Text>
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
  selectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
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
  filterSection: {
    marginBottom: 20,
  },
  filterChip: {
    backgroundColor: '#111111',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterChipActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  filterChipText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  quickSelectContainer: {
    marginBottom: 20,
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
    marginBottom: 20,
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
    marginBottom: 20,
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
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
  },
  filterBadgeText: {
    color: '#8B0000',
    fontSize: 12,
    fontWeight: '600',
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
  heatmapSubtitle: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 16,
  },
  heatmapContainer: {
    alignItems: 'center',
  },
  distributionList: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distributionLabel: {
    width: 24,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    textAlign: 'center',
  },
  distributionBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: '#8B0000',
    borderRadius: 4,
  },
  distributionCount: {
    width: 30,
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
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
  downloadPdfButton: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
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
  targetTypeList: {
    gap: 12,
  },
  targetTypeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  targetTypeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  targetTypeTitleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  targetTypeAvgText: {
    color: '#8B0000',
    fontSize: 14,
    fontWeight: '600',
  },
  targetTypeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetTypeStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  targetTypeStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  targetTypeStatLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  noTargetDataText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  // Session selection styles
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  modeToggleButtonActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B0000',
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  sessionSelectionContainer: {
    marginBottom: 20,
  },
  sessionSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectAllText: {
    color: '#8B0000',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionsList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sessionSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sessionSelectItemActive: {
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
  },
  sessionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCheckboxChecked: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  sessionSelectInfo: {
    flex: 1,
  },
  sessionSelectDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  sessionSelectDetails: {
    fontSize: 12,
    color: '#888',
  },
  sessionSelectScore: {
    alignItems: 'flex-end',
  },
  sessionSelectScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  sessionSelectScoreLabel: {
    fontSize: 10,
    color: '#888',
  },
});

const heatmapStyles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBackground: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  multiSpotBackground: {
    position: 'absolute',
    backgroundColor: '#1a1a1a',
  },
  ring: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMark: {
    position: 'absolute',
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLine: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: '#000',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
  },
  emptyText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
