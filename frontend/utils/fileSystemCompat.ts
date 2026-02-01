// Compatibility layer for expo-file-system
// This provides a safe way to access documentDirectory and other APIs

import { Platform } from 'react-native';

// For web, we'll use a mock path. For native, we need the real path.
// The documentDirectory will be set at runtime when the module loads on native.
export let documentDirectory: string | null = null;
export let cacheDirectory: string | null = null;

// Dynamically import and set the directories
const initFileSystem = async () => {
  try {
    const FileSystem = await import('expo-file-system');
    
    // Try to access documentDirectory
    if ((FileSystem as any).documentDirectory) {
      documentDirectory = (FileSystem as any).documentDirectory;
    }
    
    if ((FileSystem as any).cacheDirectory) {
      cacheDirectory = (FileSystem as any).cacheDirectory;
    }
  } catch (e) {
    console.warn('Could not initialize FileSystem directories:', e);
  }
};

// Initialize on module load (non-blocking)
if (Platform.OS !== 'web') {
  initFileSystem();
}

// Re-export the full module for other functions
export * from 'expo-file-system';
