import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllData, restoreAllData, setLastBackupDate } from './localStorage';

const BACKUP_FILENAME = 'archery_tracker_backup.json';

// Export data to a file and open share sheet (for Google Drive)
export const backupToGoogleDrive = async (): Promise<boolean> => {
  try {
    const data = await getAllData();
    const jsonString = JSON.stringify(data, null, 2);
    
    const fileUri = `${FileSystem.cacheDirectory}${BACKUP_FILENAME}`;
    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    if (Platform.OS === 'web') {
      // Web download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = BACKUP_FILENAME;
      a.click();
      URL.revokeObjectURL(url);
      await setLastBackupDate();
      return true;
    }
    
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save backup to Google Drive',
        UTI: 'public.json',
      });
      await setLastBackupDate();
      return true;
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }
  } catch (error) {
    console.error('Backup error:', error);
    Alert.alert('Backup Failed', 'Could not create backup file');
    return false;
  }
};

// Restore data from a file (from Google Drive or local)
export const restoreFromGoogleDrive = async (): Promise<boolean> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    
    if (result.canceled) {
      return false;
    }
    
    const file = result.assets[0];
    const content = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    const data = JSON.parse(content);
    
    // Validate backup file structure
    if (!data.sessions && !data.bows) {
      Alert.alert('Invalid Backup', 'This file does not contain valid backup data');
      return false;
    }
    
    // Confirm restore
    return new Promise((resolve) => {
      Alert.alert(
        'Restore Backup',
        `This will replace all current data with:\n• ${data.sessions?.length || 0} sessions\n• ${data.bows?.length || 0} bows\n\nBackup date: ${data.exportDate ? new Date(data.exportDate).toLocaleDateString() : 'Unknown'}\n\nContinue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              const success = await restoreAllData(data);
              if (success) {
                Alert.alert('Success', 'Data restored successfully');
                resolve(true);
              } else {
                Alert.alert('Error', 'Failed to restore data');
                resolve(false);
              }
            },
          },
        ]
      );
    });
  } catch (error) {
    console.error('Restore error:', error);
    Alert.alert('Restore Failed', 'Could not read backup file. Make sure it is a valid JSON file.');
    return false;
  }
};

// Auto backup reminder (call this on app start)
export const checkBackupReminder = async (): Promise<void> => {
  try {
    const lastBackup = await AsyncStorage.getItem('last_backup_date');
    if (!lastBackup) {
      // Never backed up - don't show on first launch
      return;
    }
    
    const lastBackupDate = new Date(lastBackup);
    const daysSinceBackup = Math.floor((Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceBackup >= 7) {
      Alert.alert(
        'Backup Reminder',
        `It's been ${daysSinceBackup} days since your last backup. Would you like to backup now?`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Backup Now', onPress: backupToGoogleDrive },
        ]
      );
    }
  } catch (error) {
    console.error('Backup reminder error:', error);
  }
};
