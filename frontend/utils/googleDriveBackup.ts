import * as FileSystem from 'expo-file-system';
import { documentDirectory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getAllData, restoreAllData, setLastBackupDate } from './localStorage';

/**
 * Creates a backup of all data and opens the native share sheet
 * User can save to Google Drive, email, or any other app
 */
export const createBackup = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get all data from local storage
    const data = await getAllData();
    
    // Create backup object
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'Arrow Tracker',
      data: {
        sessions: data.sessions,
        bows: data.bows,
      },
    };
    
    // Create file name with date
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `arrow-tracker-backup-${dateStr}.json`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    
    // Write to file
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backup, null, 2));
    
    // Check if sharing is available
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      return { success: false, error: 'Sharing is not available on this device' };
    }
    
    // Open native share sheet
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Save Arrow Tracker Backup',
      UTI: 'public.json',
    });
    
    // Update last backup date
    await setLastBackupDate();
    
    return { success: true };
  } catch (error) {
    console.error('Backup error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Opens file picker to select a backup file and restores the data
 */
export const restoreBackup = async (): Promise<{ 
  success: boolean; 
  error?: string; 
  sessionsCount?: number; 
  bowsCount?: number;
  canceled?: boolean;
}> => {
  try {
    // Open file picker
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    
    // Check if user cancelled
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    const file = result.assets[0];
    
    // Read file content
    const content = await FileSystem.readAsStringAsync(file.uri);
    const backup = JSON.parse(content);
    
    // Validate backup format
    if (!backup.data || (!backup.data.sessions && !backup.data.bows)) {
      return { success: false, error: 'Invalid backup file format' };
    }
    
    // Restore data
    const restored = await restoreAllData({
      sessions: backup.data.sessions || [],
      bows: backup.data.bows || [],
    });
    
    if (!restored) {
      return { success: false, error: 'Failed to restore data' };
    }
    
    return {
      success: true,
      sessionsCount: backup.data.sessions?.length || 0,
      bowsCount: backup.data.bows?.length || 0,
    };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
