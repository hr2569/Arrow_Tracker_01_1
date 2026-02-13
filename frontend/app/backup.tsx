import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { createBackup, restoreBackup } from '../utils/googleDriveBackup';
import { getLastBackupDate, getSessions, getBows } from '../utils/localStorage';

export default function BackupScreen() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [dataStats, setDataStats] = useState({ sessions: 0, bows: 0 });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [sessions, bows, lastDate] = await Promise.all([
      getSessions(),
      getBows(),
      getLastBackupDate(),
    ]);
    setDataStats({ sessions: sessions.length, bows: bows.length });
    if (lastDate) {
      setLastBackup(new Date(lastDate).toLocaleString());
    }
  };

  const handleBackupToDrive = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const result = await createBackup();
      if (result.success) {
        await loadStats();
        setStatusMessage('✓ Backup ready - select Google Drive to save');
      } else {
        setStatusMessage('✗ ' + (result.error || 'Failed to create backup'));
      }
    } catch (error) {
      setStatusMessage('✗ Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    setIsImporting(true);
    setStatusMessage(null);
    try {
      const result = await restoreBackup();
      
      if (result.canceled) {
        setIsImporting(false);
        return;
      }
      
      if (result.success) {
        await loadStats();
        setStatusMessage(`✓ Restored ${result.sessionsCount} sessions, ${result.bowsCount} bows`);
      } else {
        setStatusMessage('✗ ' + (result.error || 'Failed to restore backup'));
      }
    } catch (error) {
      setStatusMessage('✗ Failed to import backup');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Google Drive Sync</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Data Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Data</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{dataStats.sessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{dataStats.bows}</Text>
              <Text style={styles.statLabel}>Bows</Text>
            </View>
          </View>
          {lastBackup && (
            <Text style={styles.lastBackupText}>Last backup: {lastBackup}</Text>
          )}
        </View>

        {/* Status Message */}
        {statusMessage && (
          <View style={[
            styles.statusCard,
            statusMessage.startsWith('✓') ? styles.statusSuccess : styles.statusError
          ]}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        {/* Backup Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.backupButton]}
          onPress={handleBackupToDrive}
          disabled={isExporting || isImporting}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="cloud-upload" size={28} color="#fff" />
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>Backup to Google Drive</Text>
                <Text style={styles.buttonSubtitle}>Save your data to the cloud</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Restore Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.restoreButton]}
          onPress={handleRestoreFromDrive}
          disabled={isExporting || isImporting}
        >
          {isImporting ? (
            <ActivityIndicator color="#8B0000" size="small" />
          ) : (
            <>
              <Icon name="cloud-download" size={28} color="#8B0000" />
              <View style={styles.buttonTextContainer}>
                <Text style={styles.restoreButtonTitle}>Restore from Google Drive</Text>
                <Text style={styles.buttonSubtitle}>Load data from a backup file</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Info Note */}
        <View style={styles.infoCard}>
          <Icon name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Backups are saved automatically after each session. Tap "Backup" to manually save, or "Restore" to recover your data.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
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
  content: {
    flex: 1,
    padding: 20,
  },
  statsCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#333',
  },
  lastBackupText: {
    color: '#666',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  statusCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  statusSuccess: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  statusError: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
    gap: 16,
  },
  backupButton: {
    backgroundColor: '#8B0000',
  },
  restoreButton: {
    backgroundColor: '#1e1e1e',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButtonTitle: {
    color: '#8B0000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 'auto',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
  },
});
