// Compatibility layer for expo-file-system
// This handles the API changes in newer versions

// Import the module
import * as ExpoFileSystem from 'expo-file-system';

// For backward compatibility, we need to access documentDirectory
// In newer versions, it might be in different locations
let _documentDirectory: string | null = null;
let _cacheDirectory: string | null = null;

// Try to get documentDirectory from various sources
try {
  // Try direct access (older API)
  if ((ExpoFileSystem as any).documentDirectory) {
    _documentDirectory = (ExpoFileSystem as any).documentDirectory;
  }
} catch (e) {
  console.log('Could not access documentDirectory directly');
}

try {
  // Try Paths.document (newer API)
  if ((ExpoFileSystem as any).Paths?.document?.uri) {
    _documentDirectory = (ExpoFileSystem as any).Paths.document.uri;
  }
} catch (e) {
  console.log('Could not access Paths.document');
}

try {
  if ((ExpoFileSystem as any).cacheDirectory) {
    _cacheDirectory = (ExpoFileSystem as any).cacheDirectory;
  }
} catch (e) {
  console.log('Could not access cacheDirectory directly');
}

try {
  if ((ExpoFileSystem as any).Paths?.cache?.uri) {
    _cacheDirectory = (ExpoFileSystem as any).Paths.cache.uri;
  }
} catch (e) {
  console.log('Could not access Paths.cache');
}

// Export the directories
export const documentDirectory = _documentDirectory;
export const cacheDirectory = _cacheDirectory;

// Re-export commonly used functions from expo-file-system
export const {
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  copyAsync,
  moveAsync,
} = ExpoFileSystem as any;

// Default export for compatibility with `import * as FileSystem`
export default ExpoFileSystem;
