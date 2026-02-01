// Compatibility layer for expo-file-system
// This handles the API changes in newer versions

import * as ExpoFileSystem from 'expo-file-system';

// Re-export everything from expo-file-system
export * from 'expo-file-system';

// For newer versions, documentDirectory might need to be accessed differently
// We try multiple approaches for compatibility
export const documentDirectory: string | null = 
  (ExpoFileSystem as any).documentDirectory || 
  ((ExpoFileSystem as any).Paths?.document?.uri) ||
  null;

export const cacheDirectory: string | null =
  (ExpoFileSystem as any).cacheDirectory ||
  ((ExpoFileSystem as any).Paths?.cache?.uri) ||
  null;
