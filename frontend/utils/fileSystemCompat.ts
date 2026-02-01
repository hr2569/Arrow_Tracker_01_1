// Compatibility layer for expo-file-system
// Simple re-export with safe documentDirectory access

import * as ExpoFileSystem from 'expo-file-system';

// Get documentDirectory safely - the new API might have it in different places
export const documentDirectory: string | null = 
  (ExpoFileSystem as any).documentDirectory ?? null;

export const cacheDirectory: string | null = 
  (ExpoFileSystem as any).cacheDirectory ?? null;

// Re-export everything from expo-file-system
export * from 'expo-file-system';

// Also export as default for `import * as FileSystem` pattern
export default ExpoFileSystem;
