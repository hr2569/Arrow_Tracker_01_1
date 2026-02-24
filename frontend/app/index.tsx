import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../components/Icon';
import { useTranslation } from 'react-i18next';
import { getSessions, Session } from '../utils/localStorage';

interface QuickStats {
  totalSessions: number;
  recentAvg: number;
  bestScore: number;
  trend: 'up' | 'down' | 'neutral';
  trendPercent: number;
  arrowsShot: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [stats, setStats] = useState<QuickStats | null>(null);

  // Calculate quick stats from sessions
  const calculateStats = useCallback(async () => {
    try {
      const sessions = await getSessions();
      if (sessions.length === 0) {
        setStats(null);
        return;
      }

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Filter sessions by time periods
      const recentSessions = sessions.filter(s => new Date(s.created_at) >= oneWeekAgo);
      const previousSessions = sessions.filter(s => {
        const date = new Date(s.created_at);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      });

      // Calculate stats
      const totalSessions = sessions.length;
      const bestScore = Math.max(...sessions.map(s => s.total_score || 0));
      
      // Count total arrows
      let arrowsShot = 0;
      sessions.forEach(s => {
        s.rounds?.forEach(r => {
          arrowsShot += r.shots?.length || 0;
        });
      });

      // Calculate recent average (last 7 days)
      let recentAvg = 0;
      if (recentSessions.length > 0) {
        const recentTotal = recentSessions.reduce((sum, s) => sum + (s.total_score || 0), 0);
        recentAvg = Math.round(recentTotal / recentSessions.length);
      } else if (sessions.length > 0) {
        // Fall back to overall average if no recent sessions
        const total = sessions.reduce((sum, s) => sum + (s.total_score || 0), 0);
        recentAvg = Math.round(total / sessions.length);
      }

      // Calculate trend (comparing recent week to previous week)
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      let trendPercent = 0;
      
      if (recentSessions.length > 0 && previousSessions.length > 0) {
        const recentAvgScore = recentSessions.reduce((sum, s) => sum + (s.total_score || 0), 0) / recentSessions.length;
        const previousAvgScore = previousSessions.reduce((sum, s) => sum + (s.total_score || 0), 0) / previousSessions.length;
        
        if (previousAvgScore > 0) {
          trendPercent = Math.round(((recentAvgScore - previousAvgScore) / previousAvgScore) * 100);
          trend = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral';
        }
      }

      setStats({
        totalSessions,
        recentAvg,
        bestScore,
        trend,
        trendPercent: Math.abs(trendPercent),
        arrowsShot,
      });
    } catch (error) {
      console.error('Failed to calculate stats:', error);
    }
  }, []);

  // Refresh stats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      calculateStats();
    }, [calculateStats])
  );

  // Set dynamic title for the navigation header
  useEffect(() => {
    navigation.setOptions({
      title: t('app.name'),
    });
  }, [navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Settings Button - Top Right */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push('/settings')}
        activeOpacity={0.7}
      >
        <Icon name="settings-outline" size={22} color="#888" />
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Logo */}
        <View style={styles.hero}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('app.name')}</Text>
          <Text style={styles.subtitle}>
            {t('app.subtitle')}
          </Text>
        </View>

        {/* Quick Stats Widget */}
        {stats && (
          <TouchableOpacity 
            style={styles.statsWidget}
            onPress={() => router.push('/history')}
            activeOpacity={0.8}
          >
            <View style={styles.statsHeader}>
              <View style={styles.statsHeaderLeft}>
                <Icon name="stats-chart" size={18} color="#8B0000" />
                <Text style={styles.statsTitle}>{t('home.quickStats')}</Text>
              </View>
              {stats.trend !== 'neutral' && (
                <View style={[
                  styles.trendBadge,
                  stats.trend === 'up' ? styles.trendUp : styles.trendDown
                ]}>
                  <Icon 
                    name={stats.trend === 'up' ? 'trending-up' : 'trending-down'} 
                    size={14} 
                    color={stats.trend === 'up' ? '#4CAF50' : '#F44336'} 
                  />
                  <Text style={[
                    styles.trendText,
                    stats.trend === 'up' ? styles.trendTextUp : styles.trendTextDown
                  ]}>
                    {stats.trendPercent}%
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalSessions}</Text>
                <Text style={styles.statLabel}>{t('home.sessions')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.recentAvg}</Text>
                <Text style={styles.statLabel}>{t('home.avgScore')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.statValueGold]}>{stats.bestScore}</Text>
                <Text style={styles.statLabel}>{t('home.bestScore')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.arrowsShot}</Text>
                <Text style={styles.statLabel}>{t('home.arrows')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          {/* Two Primary Buttons Row */}
          <View style={styles.primaryRow}>
            <TouchableOpacity
              style={styles.primaryButtonHalf}
              onPress={() => router.push('/sessionSetup')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainerPrimary}>
                <Icon name="add-circle" size={36} color="#fff" />
              </View>
              <Text style={styles.primaryButtonTextSmall}>{t('home.newSession')}</Text>
              <Text style={styles.buttonSubtextSmall}>{t('home.practiceTraining')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.competitionButton}
              onPress={() => router.push('/competitionMenu')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainerCompetition}>
                <Icon name="trophy" size={36} color="#FFD700" />
              </View>
              <Text style={styles.competitionButtonText}>{t('home.competition')}</Text>
              <Text style={styles.competitionSubtext}>{t('home.officialScoring')}</Text>
            </TouchableOpacity>
          </View>

          {/* History and Bows side by side */}
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.secondaryButtonHalf}
              onPress={() => router.push('/history')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainerSmall}>
                <Icon name="time" size={36} color="#8B0000" />
              </View>
              <Text style={styles.secondaryButtonTextSmall}>{t('home.history')}</Text>
              <Text style={styles.buttonSubtextSecondarySmall}>
                {t('home.sessionsStats')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButtonHalf}
              onPress={() => router.push('/bows')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainerSmall}>
                <Image 
                  source={require('../assets/images/bow-icon.png')} 
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.secondaryButtonTextSmall}>{t('home.bows')}</Text>
              <Text style={styles.buttonSubtextSecondarySmall}>
                {t('home.equipment')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Version Number - Fixed at bottom */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>v2.1.21</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  backupButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    marginTop: 8,
  },
  actionsContainer: {
    gap: 16,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButtonHalf: {
    flex: 1,
    backgroundColor: '#8B0000',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIconContainerPrimary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryButtonTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  buttonSubtextSmall: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  competitionButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  competitionButtonDisabled: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  buttonIconContainerCompetitionDisabled: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(100,100,100,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  competitionButtonTextDisabled: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  competitionSubtextDisabled: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
    fontStyle: 'italic',
  },
  buttonIconContainerCompetition: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  competitionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  competitionSubtext: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#8B0000',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  buttonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#8B0000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtextSecondary: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  secondaryButtonHalf: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  buttonIconContainerSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryButtonTextSmall: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSubtextSecondarySmall: {
    color: '#888888',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  versionContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  versionText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  // Quick Stats Widget Styles
  statsWidget: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B0000',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendUp: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  trendDown: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  trendText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  trendTextUp: {
    color: '#4CAF50',
  },
  trendTextDown: {
    color: '#F44336',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statValueGold: {
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
