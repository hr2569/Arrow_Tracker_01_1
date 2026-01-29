import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';

const API_BASE = Constants.expoConfig?.extra?.backendUrl || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  '';

export default function BackupScreen() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const exportData = async () => {
    setIsExporting(true);
    try {
      // Fetch all data from the backend
      const [sessionsRes, bowsRes] = await Promise.all([
        fetch(`${API_BASE}/api/sessions`),
        fetch(`${API_BASE}/api/bows`),
      ]);

      if (!sessionsRes.ok || !bowsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const sessions = await sessionsRes.json();
      const bows = await bowsRes.json();

      // Create backup object
      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          sessions,
          bows,
        },
      };

      // Create file
      const fileName = `archery-backup-${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backup, null, 2));

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Save Archery Backup',
          UTI: 'public.json',
        });
        setLastBackup(new Date().toLocaleString());
        Alert.alert('Success', 'Backup file ready to save or share!');
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const importData = async () => {
    setIsImporting(true);
    try {
      // Pick a file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsImporting(false);
        return;
      }

      const file = result.assets[0];
      
      // Read file content
      const content = await FileSystem.readAsStringAsync(file.uri);
      const backup = JSON.parse(content);

      // Validate backup format
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format');
      }

      // Confirm import
      Alert.alert(
        'Import Backup',
        `This backup contains ${backup.data.sessions?.length || 0} sessions and ${backup.data.bows?.length || 0} bows.\n\nThis will ADD to your existing data. Continue?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsImporting(false) },
          {
            text: 'Import',
            onPress: async () => {
              try {
                // Import bows first
                if (backup.data.bows && backup.data.bows.length > 0) {
                  for (const bow of backup.data.bows) {
                    const { id, ...bowData } = bow;
                    await fetch(`${API_BASE}/api/bows`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(bowData),
                    });
                  }
                }

                // Import sessions
                if (backup.data.sessions && backup.data.sessions.length > 0) {
                  for (const session of backup.data.sessions) {
                    const { id, ...sessionData } = session;
                    await fetch(`${API_BASE}/api/sessions`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(sessionData),
                    });
                  }
                }

                Alert.alert('Success', 'Data imported successfully!');
              } catch (err) {
                console.error('Import error:', err);
                Alert.alert('Error', 'Failed to import some data. Please try again.');
              } finally {
                setIsImporting(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to read backup file. Make sure it\'s a valid backup.');
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backup & Restore</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#4a90d9" />
          <Text style={styles.infoText}>
            Export your data to save it safely. You can share the backup file via email, save to cloud storage, or transfer to another device.
          </Text>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <Text style={styles.sectionDesc}>
            Save all your sessions and bow profiles to a file
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.exportButton]}
            onPress={exportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Export Backup</Text>
              </>
            )}
          </TouchableOpacity>
          {lastBackup && (
            <Text style={styles.lastBackupText}>Last backup: {lastBackup}</Text>
          )}
        </View>

        {/* Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import Data</Text>
          <Text style={styles.sectionDesc}>
            Restore from a previously exported backup file
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.importButton]}
            onPress={importData}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator color="#8B0000" />
            ) : (
              <>
                <Ionicons name="cloud-download" size={24} color="#8B0000" />
                <Text style={styles.importButtonText}>Import Backup</Text>
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
