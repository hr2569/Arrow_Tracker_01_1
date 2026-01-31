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
import * as FileSystem from 'expo-file-system';
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

  // Filter sessions by date range, bow, distance, and target type
  const filteredSessions = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return sessions.filter((session) => {
      const sessionDate = new Date(session.created_at);
      if (sessionDate < start || sessionDate > end) return false;
      if (selectedBow && session.bow_id !== selectedBow) return false;
      if (selectedDistance && session.distance !== selectedDistance) return false;
      // Filter by target type (treat missing as 'wa_standard')
      const sessionTargetType = session.target_type || 'wa_standard';
      if (selectedTargetType && sessionTargetType !== selectedTargetType) return false;
      return true;
    });
  }, [sessions, startDate, endDate, selectedBow, selectedDistance, selectedTargetType]);

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
  const generateReportText = () => {
    let report = `🎯 ARCHERY REPORT\n`;
    report += `Period: ${formatDateRange()}\n`;
    if (selectedBow || selectedDistance) {
      report += `Filter: ${getFilterSummary()}\n`;
    }
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
          title: 'Arrow Tracker Report',
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Generate PDF HTML content
  const generatePdfHtml = () => {
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
      
      // Grid for density calculation
      const gridSize = 60;
      const cellSize = size / gridSize;
      const densityGrid: number[][] = [];
      for (let i = 0; i < gridSize; i++) {
        densityGrid[i] = [];
        for (let j = 0; j < gridSize; j++) {
          densityGrid[i][j] = 0;
        }
      }
      
      // Calculate density
      shots.forEach((shot) => {
        const gridX = Math.floor(shot.x * gridSize);
        const gridY = Math.floor(shot.y * gridSize);
        
        const blurRadius = 6;
        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            const nx = gridX + dx;
            const ny = gridY + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              const weight = Math.exp(-distance * distance / 6);
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

      // Generate heat circles
      let heatCircles = '';
      densityGrid.forEach((row, y) => {
        row.forEach((density, x) => {
          if (density > 0) {
            const normalizedDensity = maxDensity > 0 ? density / maxDensity : 0;
            const color = getHeatColor(normalizedDensity);
            if (color) {
              const cx = x * cellSize + cellSize / 2;
              const cy = y * cellSize + cellSize / 2;
              const r = cellSize * 1.5;
              heatCircles += `
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha * normalizedDensity})" />
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
        
        // Generate heatmap circles for the single spot
        const spotGridSize = 40;
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
          
          const blurRadius = 5;
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
              const nx = gridX + dx;
              const ny = gridY + dy;
              if (nx >= 0 && nx < spotGridSize && ny >= 0 && ny < spotGridSize) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                const weight = Math.exp(-distance * distance / 5);
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
            if (density > 0) {
              const normalizedDensity = spotMaxDensity > 0 ? density / spotMaxDensity : 0;
              const color = getHeatColor(normalizedDensity);
              if (color) {
                const cx = spotLeft + x * spotCellSize + spotCellSize / 2;
                const cy = spotTop + y * spotCellSize + spotCellSize / 2;
                const r = spotCellSize * 1.5;
                singleSpotHeatCircles += `
                  <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha * normalizedDensity})" />
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
          <!-- Target ring backgrounds -->
          ${targetRingBgs}
          <!-- Heatmap overlay -->
          ${heatCircles}
          <!-- Target ring lines (on top of heatmap) -->
          ${targetRingLines}
          <!-- Center cross -->
          <line x1="${size/2 - 12}" y1="${size/2}" x2="${size/2 + 12}" y2="${size/2}" stroke="#000" stroke-width="2" />
          <line x1="${size/2}" y1="${size/2 - 12}" x2="${size/2}" y2="${size/2 + 12}" stroke="#000" stroke-width="2" />
        </svg>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Arrow Tracker Report</title>
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

          <!-- Heatmap Pages - One per target type -->
          ${['wa_standard', 'vegas_3spot', 'nfaa_indoor'].map(targetType => {
            const shotsForType = shotsByTargetType[targetType] || [];
            if (shotsForType.length === 0) return '';
            return `
          <div class="page">
            <div class="page-header">
              <h2>${getTargetTypeName(targetType)} Heatmap</h2>
              <p>${shotsForType.length} arrows</p>
            </div>
            <div class="heatmap-container">
              ${generateHeatmapSvg(targetType, shotsForType)}
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

  // Handle PDF - open directly in Google Drive
  const handleDownloadPdf = async () => {
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
      // Android - open directly in Google Drive
      try {
        const html = generatePdfHtml();
        console.log('Generating PDF...');
        
        const { uri } = await Print.printToFileAsync({ html });
        console.log('PDF generated at:', uri);
        
        // Get content URI for Android
        const contentUri = await FileSystem.getContentUriAsync(uri);
        console.log('Content URI:', contentUri);
        
        // Try to open directly in Google Drive
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/pdf',
            packageName: 'com.google.android.apps.docs',
          });
        } catch (driveError) {
          console.log('Google Drive not available, trying default viewer...');
          // Fallback to any PDF viewer
          try {
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1,
              type: 'application/pdf',
            });
          } catch (viewerError) {
            console.log('No PDF viewer, using share sheet...');
            // Last resort - share sheet
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Open Report',
              });
            }
          }
        }
      } catch (error) {
        console.error('PDF error:', error);
        Alert.alert('Error', 'Failed to generate PDF');
      }
    } else {
      // iOS - use share sheet (can't force specific app on iOS)
      try {
        const html = generatePdfHtml();
        const { uri } = await Print.printToFileAsync({ html });
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
        }
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
    const gridSize = 56;
    const cellSize = size / gridSize;
    const densityGrid: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    
    // Calculate density for each grid cell
    shots.forEach((shot) => {
      const gridX = Math.floor(shot.x * gridSize);
      const gridY = Math.floor(shot.y * gridSize);
      
      // Larger blur radius for smoother gradients
      const blurRadius = 6;
      for (let dx = -blurRadius; dx <= blurRadius; dx++) {
        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          const nx = gridX + dx;
          const ny = gridY + dy;
          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Smoother gaussian falloff
            const weight = Math.exp(-distance * distance / 8);
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

    // Render multi-spot target (Vegas or NFAA)
    // For multi-spot targets, render a SINGLE large target with the heatmap overlay
    // Recalculate density for proper single-spot display
    if (targetType !== 'wa_standard') {
      // Render a single representative target face with heatmap
      const singleSpotSize = size * 0.75;
      const spotRadiusPx = singleSpotSize / 2;
      
      // Recalculate density grid specifically for single spot display
      const spotGridSize = 40;
      const spotCellSize = singleSpotSize / spotGridSize;
      const spotDensityGrid: number[][] = Array(spotGridSize).fill(null).map(() => Array(spotGridSize).fill(0));
      
      // Calculate density using shot coordinates (which are relative to spot, 0-1)
      shots.forEach((shot) => {
        const gridX = Math.floor(shot.x * spotGridSize);
        const gridY = Math.floor(shot.y * spotGridSize);
        
        const blurRadius = 4;
        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            const nx = gridX + dx;
            const ny = gridY + dy;
            if (nx >= 0 && nx < spotGridSize && ny >= 0 && ny < spotGridSize) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              const weight = Math.exp(-distance * distance / 5);
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
      
      // Generate heatmap cells for this spot
      const spotHeatmapCells: { x: number; y: number; color: string; opacity: number }[] = [];
      spotDensityGrid.forEach((row, y) => {
        row.forEach((density, x) => {
          if (density > 0) {
            const normalizedDensity = spotMaxDensity > 0 ? density / spotMaxDensity : 0;
            spotHeatmapCells.push({
              x: x * spotCellSize,
              y: y * spotCellSize,
              color: getHeatColor(normalizedDensity),
              opacity: normalizedDensity,
            });
          }
        });
      });
      
      // Define 5 rings with proper colors (same as PDF) - from outside to inside
      const ringDefinitions = [
        { radiusPercent: 1.0, fill: '#00a2e8', strokeColor: '#005090' },    // Ring 1 - outer blue (6/7)
        { radiusPercent: 0.8, fill: '#00a2e8', strokeColor: '#005090' },    // Ring 2 - blue (8)
        { radiusPercent: 0.6, fill: '#ed1c24', strokeColor: '#901015' },    // Ring 3 - red (9)
        { radiusPercent: 0.4, fill: '#ed1c24', strokeColor: '#901015' },    // Ring 4 - red (10)
        { radiusPercent: 0.2, fill: '#fff200', strokeColor: '#907000' },    // Ring 5 - yellow (X)
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
                    r={spotCellSize * 1.8}
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

        {/* Heatmap Overlay using SVG */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}>
          <Svg width={size} height={size}>
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
              {heatmapCells.map((cell, index) => (
                <Circle
                  key={`heat-${index}`}
                  cx={cell.x + cellSize / 2}
                  cy={cell.y + cellSize / 2}
                  r={cellSize * 1.5}
                  fill={`url(#heatGradReport-${index})`}
                />
              ))}
            </G>
          </Svg>
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

          {/* Quick Select Buttons */}
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

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButtonLarge} onPress={handleShare}>
          <Ionicons name="share-social" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>Share Report</Text>
        </TouchableOpacity>

        {/* Open PDF Button */}
        <TouchableOpacity style={styles.downloadPdfButton} onPress={handleDownloadPdf}>
          <Ionicons name="document-text-outline" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>Open PDF</Text>
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
