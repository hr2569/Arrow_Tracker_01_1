import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from '../utils/fileSystemCompat';
import { documentDirectory } from '../utils/fileSystemCompat';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BOW_TYPES: { [key: string]: string } = {
  recurve: 'Recurve',
  compound: 'Compound',
  barebow: 'Barebow',
  longbow: 'Longbow',
  traditional: 'Traditional',
};

interface ImportedArcher {
  id: string;
  name: string;
  bowType: string;
  rounds: number[][];
  totalScore: number;
  xCount: number;
  sourceFile?: string;
}

interface ImportedCompetition {
  version: string;
  type: string;
  name: string;
  date: string;
  rounds: number;
  arrowsPerRound: number;
  archers: ImportedArcher[];
}

interface ImportedFile {
  fileName: string;
  data: ImportedCompetition;
  selected: boolean;
}

const ROUNDS_COUNT = 10;
const ARROWS_PER_ROUND = 3;

export default function ImportPdf() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [mergedArchers, setMergedArchers] = useState<ImportedArcher[]>([]);
  const [newCompetitionName, setNewCompetitionName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Scan for existing Arrow Tracker files in documents directory
  const scanForFiles = async () => {
    if (Platform.OS === 'web') return;
    
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory || '');
      const arrowTrackerFiles = files.filter(f => f.endsWith('.arrowtracker.json'));
      
      const loadedFiles: ImportedFile[] = [];
      for (const fileName of arrowTrackerFiles) {
        try {
          const content = await FileSystem.readAsStringAsync(
            FileSystem.documentDirectory + fileName
          );
          const data = JSON.parse(content) as ImportedCompetition;
          if (data.type === 'arrowtracker_competition') {
            loadedFiles.push({
              fileName,
              data,
              selected: false,
            });
          }
        } catch (e) {
          console.log('Error reading file:', fileName, e);
        }
      }
      
      if (loadedFiles.length > 0) {
        setImportedFiles(prev => {
          // Merge without duplicates
          const existingNames = prev.map(f => f.fileName);
          const newFiles = loadedFiles.filter(f => !existingNames.includes(f.fileName));
          return [...prev, ...newFiles];
        });
      }
    } catch (error) {
      console.error('Error scanning for files:', error);
    }
  };

  useEffect(() => {
    scanForFiles();
  }, []);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) {
        return;
      }

      setImporting(true);

      const newFiles: ImportedFile[] = [];
      
      for (const asset of result.assets) {
        try {
          // Read the file content
          const content = await FileSystem.readAsStringAsync(asset.uri);
          const data = JSON.parse(content) as ImportedCompetition;
          
          // Validate it's an Arrow Tracker file
          if (data.type === 'arrowtracker_competition' && data.archers) {
            newFiles.push({
              fileName: asset.name,
              data,
              selected: true,
            });
          } else {
            Alert.alert('Invalid File', `${asset.name} is not a valid Arrow Tracker data file.`);
          }
        } catch (e) {
          console.error('Error parsing file:', asset.name, e);
          Alert.alert('Parse Error', `Could not parse ${asset.name}. Make sure it's a valid Arrow Tracker export file.`);
        }
      }

      if (newFiles.length > 0) {
        setImportedFiles(prev => {
          const existingNames = prev.map(f => f.fileName);
          const uniqueNew = newFiles.filter(f => !existingNames.includes(f.fileName));
          return [...prev, ...uniqueNew];
        });
      }

    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const toggleFileSelection = (index: number) => {
    setImportedFiles(prev => {
      const updated = [...prev];
      updated[index].selected = !updated[index].selected;
      return updated;
    });
  };

  const selectAll = () => {
    setImportedFiles(prev => prev.map(f => ({ ...f, selected: true })));
  };

  const deselectAll = () => {
    setImportedFiles(prev => prev.map(f => ({ ...f, selected: false })));
  };

  const removeFile = (index: number) => {
    setImportedFiles(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const previewMerge = () => {
    const selectedFiles = importedFiles.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      Alert.alert('No Files Selected', 'Please select at least one file to merge.');
      return;
    }

    // Merge all archers from selected files
    const allArchers: ImportedArcher[] = [];
    selectedFiles.forEach(file => {
      file.data.archers.forEach(archer => {
        allArchers.push({
          ...archer,
          sourceFile: file.data.name,
        });
      });
    });

    setMergedArchers(allArchers);
    setNewCompetitionName(
      selectedFiles.length === 1 
        ? selectedFiles[0].data.name 
        : `Merged Competition (${selectedFiles.length} files)`
    );
    setShowPreview(true);
  };

  const getPointValue = (score: number) => score === 11 ? 10 : score;

  const getRoundTotal = (round: number[]) => {
    return round.reduce((total, score) => total + (score !== null ? getPointValue(score) : 0), 0);
  };

  const getMedalEmoji = (place: number) => {
    if (place === 0) return '🥇';
    if (place === 1) return '🥈';
    if (place === 2) return '🥉';
    return '';
  };

  const generateMergedPdf = async () => {
    if (mergedArchers.length === 0) return;

    setGenerating(true);

    try {
      // Group archers by bow type
      const archersByBowType: { [key: string]: ImportedArcher[] } = {};
      mergedArchers.forEach(archer => {
        if (!archersByBowType[archer.bowType]) {
          archersByBowType[archer.bowType] = [];
        }
        archersByBowType[archer.bowType].push(archer);
      });

      // Sort each category by total score
      Object.keys(archersByBowType).forEach(bowType => {
        archersByBowType[bowType].sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return b.xCount - a.xCount;
        });
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${newCompetitionName} - Results</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 30px;
              color: #333;
              max-width: 900px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #8B0000;
            }
            .header h1 {
              color: #8B0000;
              margin: 0 0 10px 0;
              font-size: 32px;
            }
            .header .date {
              color: #666;
              font-size: 16px;
            }
            .category {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            .category-header {
              background: #8B0000;
              color: #fff;
              padding: 12px 20px;
              font-size: 20px;
              font-weight: bold;
              border-radius: 8px 8px 0 0;
            }
            .results-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .results-table th {
              background: #333;
              color: #fff;
              padding: 10px 8px;
              text-align: center;
              font-size: 12px;
            }
            .results-table td {
              padding: 8px;
              text-align: center;
              border-bottom: 1px solid #ddd;
              font-size: 12px;
            }
            .results-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .place-cell {
              font-weight: bold;
              font-size: 16px;
            }
            .name-cell {
              text-align: left !important;
              font-weight: bold;
            }
            .total-cell {
              font-weight: bold;
              font-size: 16px;
            }
            .gold-row { background: rgba(255, 215, 0, 0.2) !important; }
            .silver-row { background: rgba(192, 192, 192, 0.3) !important; }
            .bronze-row { background: rgba(205, 127, 50, 0.2) !important; }
            .footer {
              text-align: center;
              color: #888;
              font-size: 12px;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏆 ${newCompetitionName}</h1>
            <div class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="date">${mergedArchers.length} Archers • ${ROUNDS_COUNT} Rounds • ${ARROWS_PER_ROUND} Arrows/Round</div>
          </div>

          ${Object.entries(archersByBowType).map(([bowType, categoryArchers]) => `
            <div class="category">
              <div class="category-header">${BOW_TYPES[bowType] || bowType} Division (${categoryArchers.length} archers)</div>
              <table class="results-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">Place</th>
                    <th style="text-align: left;">Archer</th>
                    ${Array.from({ length: ROUNDS_COUNT }, (_, i) => `<th>R${i + 1}</th>`).join('')}
                    <th style="width: 60px;">Total</th>
                    <th style="width: 40px;">X's</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryArchers.map((archer, index) => {
                    const rowClass = index === 0 ? 'gold-row' : index === 1 ? 'silver-row' : index === 2 ? 'bronze-row' : '';
                    return `
                      <tr class="${rowClass}">
                        <td class="place-cell">${getMedalEmoji(index)} ${index + 1}</td>
                        <td class="name-cell">${archer.name}</td>
                        ${archer.rounds.map(round => `<td>${getRoundTotal(round)}</td>`).join('')}
                        <td class="total-cell">${archer.totalScore}</td>
                        <td>${archer.xCount}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}

          <div class="footer">
            Generated by Arrow Tracker • ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;

      // Save competition to history
      const competition = {
        id: Date.now().toString(),
        name: newCompetitionName,
        date: new Date().toISOString(),
        archers: mergedArchers,
        type: 'imported',
      };

      const existing = await AsyncStorage.getItem('manualCompetitions');
      const competitions = existing ? JSON.parse(existing) : [];
      competitions.unshift(competition);
      await AsyncStorage.setItem('manualCompetitions', JSON.stringify(competitions));

      if (Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        Alert.alert('Success', 'Competition saved and report generated!');
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const baseFileName = `${newCompetitionName.replace(/[^a-z0-9]/gi, '_')}_Results`;
        const pdfFileName = baseFileName + '.pdf';
        const jsonFileName = baseFileName + '.arrowtracker.json';
        const pdfDestination = FileSystem.documentDirectory + pdfFileName;
        const jsonDestination = FileSystem.documentDirectory + jsonFileName;
        
        await FileSystem.moveAsync({
          from: uri,
          to: pdfDestination,
        });

        // Save companion JSON
        const exportData = {
          version: '1.0',
          type: 'arrowtracker_competition',
          name: newCompetitionName,
          date: new Date().toISOString(),
          rounds: ROUNDS_COUNT,
          arrowsPerRound: ARROWS_PER_ROUND,
          archers: mergedArchers,
        };
        
        await FileSystem.writeAsStringAsync(jsonDestination, JSON.stringify(exportData, null, 2));

        Alert.alert('Success', `Competition saved!\nPDF: ${pdfFileName}`);
      }

      setShowPreview(false);
      setMergedArchers([]);
      router.push('/competitionHistory');

    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const selectedCount = importedFiles.filter(f => f.selected).length;

  if (showPreview) {
    // Group for preview
    const archersByBowType: { [key: string]: ImportedArcher[] } = {};
    mergedArchers.forEach(archer => {
      if (!archersByBowType[archer.bowType]) {
        archersByBowType[archer.bowType] = [];
      }
      archersByBowType[archer.bowType].push(archer);
    });

    Object.keys(archersByBowType).forEach(bowType => {
      archersByBowType[bowType].sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return b.xCount - a.xCount;
      });
    });

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowPreview(false)}>
            <Ionicons name="arrow-back" size={24} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Preview Merge</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{newCompetitionName}</Text>
            <Text style={styles.previewSubtitle}>
              {mergedArchers.length} archers • {Object.keys(archersByBowType).length} categories
            </Text>
          </View>

          {Object.entries(archersByBowType).map(([bowType, categoryArchers]) => (
            <View key={bowType} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>
                  {BOW_TYPES[bowType] || bowType} ({categoryArchers.length})
                </Text>
              </View>
              {categoryArchers.map((archer, index) => (
                <View 
                  key={archer.id + index} 
                  style={[
                    styles.archerRow,
                    index === 0 && styles.goldRow,
                    index === 1 && styles.silverRow,
                    index === 2 && styles.bronzeRow,
                  ]}
                >
                  <Text style={styles.placeText}>{getMedalEmoji(index)} {index + 1}</Text>
                  <View style={styles.archerInfo}>
                    <Text style={styles.archerName}>{archer.name}</Text>
                    {archer.sourceFile && (
                      <Text style={styles.sourceFile}>from: {archer.sourceFile}</Text>
                    )}
                  </View>
                  <View style={styles.scoreInfo}>
                    <Text style={styles.totalScore}>{archer.totalScore}</Text>
                    <Text style={styles.xCount}>X: {archer.xCount}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateMergedPdf}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#000" />
                <Text style={styles.generateButtonText}>Save & Generate PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Data</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <View style={styles.instructionsContent}>
            <Text style={styles.instructionsTitle}>Import Arrow Tracker Data Files</Text>
            <Text style={styles.instructionsText}>
              Select .arrowtracker.json files generated by this app. You can import multiple files and merge them into a single competition report.
            </Text>
          </View>
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
              <Ionicons name="folder-open" size={32} color="#000" />
              <Text style={styles.importButtonText}>Browse Files</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Scan Local Files Button */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={scanForFiles}
          >
            <Ionicons name="refresh" size={20} color="#2196F3" />
            <Text style={styles.scanButtonText}>Scan for Local Files</Text>
          </TouchableOpacity>
        )}

        {/* Imported Files List */}
        {importedFiles.length > 0 && (
          <View style={styles.filesSection}>
            <View style={styles.filesSectionHeader}>
              <Text style={styles.sectionTitle}>Available Files ({importedFiles.length})</Text>
              <View style={styles.selectButtons}>
                <TouchableOpacity onPress={selectAll} style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={deselectAll} style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>None</Text>
                </TouchableOpacity>
              </View>
            </View>

            {importedFiles.map((file, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.fileItem, file.selected && styles.fileItemSelected]}
                onPress={() => toggleFileSelection(index)}
              >
                <View style={styles.fileCheckbox}>
                  <Ionicons
                    name={file.selected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={file.selected ? '#4CAF50' : '#666'}
                  />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.data.name}</Text>
                  <Text style={styles.fileMeta}>
                    {file.data.archers.length} archers • {new Date(file.data.date).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeFileBtn}
                  onPress={() => removeFile(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#ed1c24" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Merge Button */}
      {selectedCount > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.mergeButton}
            onPress={previewMerge}
          >
            <Ionicons name="git-merge" size={20} color="#000" />
            <Text style={styles.mergeButtonText}>
              Merge {selectedCount} File{selectedCount > 1 ? 's' : ''} & Preview
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2196F3' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a2a3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  instructionsContent: { flex: 1 },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  instructionsText: {
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
    marginBottom: 12,
  },
  importButtonText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2a3a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  scanButtonText: { color: '#2196F3', fontSize: 16 },
  filesSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  filesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  selectButtons: { flexDirection: 'row', gap: 8 },
  selectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  selectBtnText: { color: '#fff', fontSize: 12 },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fileItemSelected: { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
  fileCheckbox: { marginRight: 12 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  fileMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  removeFileBtn: { padding: 4 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  mergeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  mergeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  previewTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFD700' },
  previewSubtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  categoryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryHeader: {
    backgroundColor: '#8B0000',
    padding: 12,
  },
  categoryTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  archerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  goldRow: { backgroundColor: 'rgba(255, 215, 0, 0.15)' },
  silverRow: { backgroundColor: 'rgba(192, 192, 192, 0.15)' },
  bronzeRow: { backgroundColor: 'rgba(205, 127, 50, 0.15)' },
  placeText: { width: 50, fontSize: 16, fontWeight: 'bold', color: '#fff' },
  archerInfo: { flex: 1 },
  archerName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  sourceFile: { fontSize: 10, color: '#666', marginTop: 2 },
  scoreInfo: { alignItems: 'flex-end' },
  totalScore: { fontSize: 18, fontWeight: 'bold', color: '#FFD700' },
  xCount: { fontSize: 12, color: '#888' },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  generateButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
});
