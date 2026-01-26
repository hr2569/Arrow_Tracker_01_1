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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Defs, RadialGradient, Stop, Circle, G } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type ReportPeriod = 'week' | 'month' | 'year' | 'custom' | 'all';

interface Session {
  id: string;
  name: string;
  total_score: number;
  rounds: any[];
  created_at: string;
  bow_name?: string;
  bow_id?: string;
  distance?: string;
}

interface Bow {
  id: string;
  name: string;
  bow_type: string;
}

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
      const [sessionsRes, bowsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sessions`),
        axios.get(`${API_URL}/api/bows`),
      ]);
      setSessions(sessionsRes.data);
      setBows(bowsRes.data);
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

  // Filter sessions by date range, bow, and distance
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
      return true;
    });
  }, [sessions, startDate, endDate, selectedBow, selectedDistance]);

  // Get all shots for heatmap
  const allShots = useMemo(() => {
    const shots: { x: number; y: number; ring: number }[] = [];
    filteredSessions.forEach((session) => {
      session.rounds?.forEach((round) => {
        round.shots?.forEach((shot: any) => {
          if (shot.x !== undefined && shot.y !== undefined) {
            shots.push({
              x: shot.x,
              y: shot.y,
              ring: shot.ring || 0,
            });
          }
        });
      });
    });
    return shots;
  }, [filteredSessions]);

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
          title: 'Archery Report',
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Generate PDF HTML content
  const generatePdfHtml = () => {
    // Score distribution with larger bars for full page
    const ringDistributionRows = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
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

    // Get unique bows and distances used in filtered sessions
    const usedBows = [...new Set(filteredSessions.filter(s => s.bow_name).map(s => s.bow_name))];
    const usedDistances = [...new Set(filteredSessions.filter(s => s.distance).map(s => s.distance))];

    // Generate heatmap SVG for PDF - full page
    const generateHeatmapSvg = () => {
      if (allShots.length === 0) {
        return `
          <div style="width: 100%; height: 500px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 1px solid #ddd;">
            <span style="color: #666; font-size: 18px;">No shots in this period</span>
          </div>
        `;
      }

      const size = 600;
      const targetScale = 0.9;
      const targetSize = size * targetScale;
      
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
      allShots.forEach((shot) => {
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

      // Target rings colors
      const ringColorsPdf = ['#f5f5f0', '#f5f5f0', '#2a2a2a', '#2a2a2a', '#00a2e8', '#00a2e8', '#ed1c24', '#ed1c24', '#fff200', '#fff200'];
      
      // Generate target rings
      let targetRings = '';
      for (let ringNum = 1; ringNum <= 10; ringNum++) {
        const diameterPercent = (11 - ringNum) / 10;
        const ringSize = targetSize * diameterPercent;
        const bgColor = ringColorsPdf[ringNum - 1];
        const borderColor = ringNum <= 2 ? '#ccc' : ringNum <= 4 ? '#444' : ringNum <= 6 ? '#0077b3' : ringNum <= 8 ? '#b31217' : '#ccaa00';
        targetRings += `
          <circle cx="${size/2}" cy="${size/2}" r="${ringSize/2}" fill="${bgColor}" stroke="${borderColor}" stroke-width="1.5" />
        `;
      }

      return `
        <svg width="100%" viewBox="0 0 ${size} ${size}" style="display: block; margin: 0 auto;">
          <!-- Target rings -->
          ${targetRings}
          <!-- Center cross -->
          <line x1="${size/2 - 12}" y1="${size/2}" x2="${size/2 + 12}" y2="${size/2}" stroke="#000" stroke-width="2" />
          <line x1="${size/2}" y1="${size/2 - 12}" x2="${size/2}" y2="${size/2 + 12}" stroke="#000" stroke-width="2" />
          <!-- Heatmap overlay -->
          ${heatCircles}
        </svg>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Archery Report</title>
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
              padding: 24px;
              margin-bottom: 20px;
              border: 1px solid #ddd;
            }
            .card h3 {
              color: #000;
              margin: 0 0 20px 0;
              font-size: 20px;
            }
            .stats-grid {
              display: flex;
              flex-wrap: wrap;
            }
            .stat-item {
              width: 50%;
              text-align: center;
              padding: 16px 0;
            }
            .stat-value {
              font-size: 42px;
              font-weight: bold;
              color: #8B0000;
            }
            .stat-label {
              font-size: 14px;
              color: #555;
              margin-top: 8px;
            }
            .avg-row {
              display: flex;
              justify-content: space-between;
              padding: 16px 0;
              border-bottom: 1px solid #ddd;
              font-size: 18px;
            }
            .avg-label { color: #555; }
            .avg-value { font-weight: bold; font-size: 22px; color: #000; }
            .highlight-row {
              display: flex;
              gap: 16px;
            }
            .highlight-item {
              flex: 1;
              background: #fff;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              border: 1px solid #ddd;
            }
            .highlight-label {
              font-size: 14px;
              color: #555;
              margin-bottom: 12px;
            }
            .highlight-value {
              font-size: 32px;
              font-weight: bold;
              color: #2E7D32;
            }
            .highlight-value-low {
              font-size: 32px;
              font-weight: bold;
              color: #C62828;
            }
            .highlight-date {
              font-size: 12px;
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
              <h1>Archery Performance Report</h1>
              <p style="font-size: 16px;">${formatDateRange()}</p>
              <p style="font-size: 12px; color: #666;">Generated ${new Date().toLocaleDateString()}</p>
              <div class="equipment-info">
                ${usedBows.length > 0 ? `<div>Bow${usedBows.length > 1 ? 's' : ''}: ${usedBows.join(', ')}</div>` : ''}
                ${usedDistances.length > 0 ? `<div>Distance${usedDistances.length > 1 ? 's' : ''}: ${usedDistances.join(', ')}</div>` : ''}
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

          <!-- Page 2: Shot Distribution Heatmap -->
          <div class="page">
            <div class="page-header">
              <h2>Shot Distribution Heatmap</h2>
              <p>${allShots.length} arrows from ${reportStats.totalSessions} session${reportStats.totalSessions !== 1 ? 's' : ''}</p>
            </div>
            <div class="heatmap-container">
              ${generateHeatmapSvg()}
            </div>
          </div>

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
              <p>Archery Scoring App - ${new Date().getFullYear()}</p>
            </div>
          </div>
          ` : ''}
        </body>
      </html>
    `;
  };

  // Handle PDF with options
  const handleDownloadPdf = async () => {
    if (Platform.OS === 'web') {
      // For web, open in new tab directly
      try {
        const html = generatePdfHtml();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (error) {
        alert('Failed to open PDF. Please try again.');
      }
    } else {
      // For native, show options
      Alert.alert(
        'Open Report',
        'How would you like to open the report?',
        [
          {
            text: 'Print / Preview',
            onPress: async () => {
              try {
                const html = generatePdfHtml();
                await Print.printAsync({ html });
              } catch (error) {
                Alert.alert('Error', 'Failed to open print preview');
              }
            },
          },
          {
            text: 'Save & Share',
            onPress: async () => {
              try {
                const html = generatePdfHtml();
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                  await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save Archery Report',
                    UTI: 'com.adobe.pdf',
                  });
                } else {
                  Alert.alert('PDF Saved', `File saved to: ${uri}`);
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to save PDF');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
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

  // Heatmap Component - shows density of shots as a gradient overlay (same as stats)
  const HeatmapTargetMap = ({ size = 280 }: { size?: number }) => {
    const shots = allShots;
    
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
    const centerOffset = (size - targetSize) / 2;
    
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
          {(selectedBow || selectedDistance) && (
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

        {/* Heatmap Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="flame" size={18} color="#8B0000" /> Shot Distribution Heatmap
          </Text>
          <Text style={styles.heatmapSubtitle}>
            {allShots.length} arrows from {reportStats.totalSessions} session{reportStats.totalSessions !== 1 ? 's' : ''}
          </Text>
          <View style={styles.heatmapContainer}>
            <HeatmapTargetMap size={280} />
          </View>
        </View>

        {/* Score Distribution */}
        {reportStats.totalArrows > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="bar-chart" size={18} color="#8B0000" /> Score Distribution
            </Text>
            <View style={styles.distributionList}>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((ring) => {
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
