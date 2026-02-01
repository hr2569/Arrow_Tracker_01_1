// Re-export legacy FileSystem API for backward compatibility
export {
  documentDirectory,
  cacheDirectory,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  copyAsync,
  moveAsync,
  downloadAsync,
  DownloadResumable,
  createDownloadResumable,
} from 'expo-file-system/src/legacy/FileSystem';
