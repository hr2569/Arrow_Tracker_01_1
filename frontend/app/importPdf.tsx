import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

export default function ImportPdf() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [importedFiles, setImportedFiles] = useState<string[]>([]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) {
        return;
      }

      setImporting(true);

      // Process selected files
      const fileNames = result.assets.map(asset => asset.name);
      setImportedFiles(prev => [...prev, ...fileNames]);

      // TODO: Implement actual PDF parsing and score extraction
      Alert.alert(
        'PDFs Selected',
        `Selected ${fileNames.length} file(s):\n${fileNames.join('\n')}\n\nPDF score extraction coming soon!`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const clearImported = () => {
    setImportedFiles([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import PDFs</Text>
        {importedFiles.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearImported}>
            <Ionicons name="trash-outline" size={24} color="#ed1c24" />
          </TouchableOpacity>
        )}
        {importedFiles.length === 0 && <View style={styles.placeholder} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <Text style={styles.instructionsText}>
            Import score sheets from PDF files. Select one or more PDF files containing archery scores to extract and process them.
          </Text>
        </View>

        {/* Import Button */}
        <TouchableOpacity
          style={styles.importButton}
          onPress={handlePickDocument}
          disabled={importing}
          activeOpacity={0.8}
        >
          {importing ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={32} color="#000" />
              <Text style={styles.importButtonText}>Select PDF Files</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Imported Files List */}
        {importedFiles.length > 0 && (
          <View style={styles.filesSection}>
            <Text style={styles.sectionTitle}>Selected Files ({importedFiles.length})</Text>
            {importedFiles.map((fileName, index) => (
              <View key={index} style={styles.fileItem}>
                <Ionicons name="document-text" size={20} color="#2196F3" />
                <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Coming Soon Notice */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="construct" size={24} color="#FF9800" />
          <Text style={styles.comingSoonText}>
            PDF score extraction feature is under development. Stay tuned for automatic score parsing from competition score sheets!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  clearButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a2a3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  importButton: {
    backgroundColor: '#2196F3',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  filesSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
  },
  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#3a2a1a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  comingSoonText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9800',
    lineHeight: 20,
  },
});
