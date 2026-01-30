import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createBackup, restoreBackup } from '../utils/googleDriveBackup';
import { getLastBackupDate, getSessions, getBows } from '../utils/localStorage';

export default function BackupScreen() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [dataStats, setDataStats] = useState({ sessions: 0, bows: 0 });

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await createBackup();
      if (result.success) {
        await loadStats();
        Alert.alert('Success', 'Backup file ready to save!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create backup');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await restoreBackup();
      
      if (result.canceled) {
        setIsImporting(false);
        return;
      }
      
      if (result.success) {
        await loadStats();
        Alert.alert(
          'Success',
          `Restored ${result.sessionsCount} sessions and ${result.bowsCount} bows!`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to restore backup');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import backup. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const confirmImport = () => {
    Alert.alert(
      'Import Backup',
      'This will REPLACE all your current data. Are you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', style: 'destructive', onPress: handleImport },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backup & Restore</Text>
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
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#4a90d9" />
          <Text style={styles.infoText}>
            All data is stored locally on your device. Export backups regularly to keep your data safe. Save to Google Drive, email, or any cloud storage.
          </Text>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Backup</Text>
          <Text style={styles.sectionDesc}>
            Save all your sessions and bow profiles to a file
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.exportButton]}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Export to File</Text>
              </>
            )}
          </TouchableOpacity>
          {lastBackup && (
            <Text style={styles.lastBackupText}>Last backup: {lastBackup}</Text>
          )}
        </View>

        {/* Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restore Backup</Text>
          <Text style={styles.sectionDesc}>
            Restore from a previously exported backup file
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.importButton]}
            onPress={confirmImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator color="#8B0000" />
            ) : (
              <>
                <Ionicons name="cloud-download" size={24} color="#8B0000" />
                <Text style={styles.importButtonText}>Import from File</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Export regularly to avoid data loss</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Save backups to Google Drive or iCloud</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Email yourself a backup for safekeeping</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="warning" size={16} color="#FFC107" />
            <Text style={styles.tipText}>Import will replace all current data</Text>
          </View>
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
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1a3a5c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#a0c4e8',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  exportButton: {
    backgroundColor: '#8B0000',
  },
  importButton: {
    backgroundColor: '#1e1e1e',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  importButtonText: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastBackupText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  tipsCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginTop: 'auto',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    color: '#aaa',
    fontSize: 13,
  },
});
