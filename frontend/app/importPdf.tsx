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
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { getContentUriAsync } from 'expo-file-system';
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
  totalScore: number;
  xCount: number;
  rounds: number[][];
}

export default function ImportPdf() {
  const router = useRouter();
  const [importCode, setImportCode] = useState('');
  const [importedArchers, setImportedArchers] = useState<ImportedArcher[]>([]);
  const [competitionName, setCompetitionName] = useState('Competition Results');
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleImportCode = () => {
    if (!importCode.trim()) {
      Alert.alert('Error', 'Please enter import code(s)');
      return;
    }
    
    // Split by newlines to support batch import
    const codes = importCode.trim().split('\n').filter(c => c.trim());
    const newArchers: ImportedArcher[] = [];
    const errors: string[] = [];
    const duplicates: string[] = [];
    
    for (const code of codes) {
      try {
        // Decode base64 and parse JSON
        const decoded = atob(code.trim());
        const parsed = JSON.parse(decoded);
        
        // Validate it's an Arrow Tracker code
        if (parsed.t !== 'at_comp' || !parsed.n || !parsed.b || parsed.s === undefined) {
          errors.push(`Invalid code format`);
          continue;
        }
        
        // Check if archer already exists in current list or new imports
        const existsInList = importedArchers.some(a => a.name === parsed.n);
        const existsInNew = newArchers.some(a => a.name === parsed.n);
        
        if (existsInList || existsInNew) {
          duplicates.push(parsed.n);
          continue;
        }
        
        // Create archer object from imported data
        newArchers.push({
          id: `${parsed.n.replace(/\s+/g, '_')}_${Date.now()}_${Math.random()}`,
          name: parsed.n,
          bowType: parsed.b,
          totalScore: parsed.s,
          xCount: parsed.x || 0,
          rounds: parsed.r || [],
        });
      } catch (error) {
        errors.push(`Failed to parse code`);
      }
    }
    
    // Add all valid archers
    if (newArchers.length > 0) {
      setImportedArchers(prev => [...prev, ...newArchers]);
      setImportCode('');
      
      let message = `Successfully imported ${newArchers.length} archer${newArchers.length > 1 ? 's' : ''}:\n`;
      message += newArchers.map(a => `• ${a.name} (${BOW_TYPES[a.bowType] || a.bowType}): ${a.totalScore} pts`).join('\n');
      
      if (duplicates.length > 0) {
        message += `\n\nSkipped ${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''}: ${duplicates.join(', ')}`;
      }
      if (errors.length > 0) {
        message += `\n\n${errors.length} code${errors.length > 1 ? 's' : ''} failed to import`;
      }
      
      Alert.alert('Import Complete', message);
    } else if (duplicates.length > 0) {
      Alert.alert('Already Imported', `All archers are already in the list: ${duplicates.join(', ')}`);
    } else {
      Alert.alert('Import Failed', 'No valid import codes found. Make sure you copied the entire code from each PDF.');
    }
  };

  const removeArcher = (index: number) => {
    Alert.alert(
      'Remove Archer',
      `Remove ${importedArchers[index].name} from the list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setImportedArchers(prev => {
              const updated = [...prev];
              updated.splice(index, 1);
              return updated;
            });
          }
        },
      ]
    );
  };

  const getMedalEmoji = (place: number) => {
    if (place === 0) return '🥇';
    if (place === 1) return '🥈';
    if (place === 2) return '🥉';
    return '';
  };

  const generateResultsPdf = async () => {
    if (importedArchers.length === 0) return;

    setGenerating(true);

    try {
      // Group archers by bow type
      const archersByBowType: { [key: string]: ImportedArcher[] } = {};
      importedArchers.forEach(archer => {
        if (!archersByBowType[archer.bowType]) {
          archersByBowType[archer.bowType] = [];
        }
        archersByBowType[archer.bowType].push(archer);
      });

      // Sort each category by total score (descending), then by X count
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
          <title>${competitionName}</title>
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
            }
            .results-table th {
              background: #333;
              color: #fff;
              padding: 12px 8px;
              text-align: center;
            }
            .results-table td {
              padding: 12px 8px;
              text-align: center;
              border-bottom: 1px solid #ddd;
            }
            .results-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .place-cell { font-weight: bold; font-size: 18px; }
            .name-cell { text-align: left !important; font-weight: bold; }
            .total-cell { font-weight: bold; font-size: 18px; color: #8B0000; }
            .gold-row { background: rgba(255, 215, 0, 0.25) !important; }
            .silver-row { background: rgba(192, 192, 192, 0.35) !important; }
            .bronze-row { background: rgba(205, 127, 50, 0.25) !important; }
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
            <h1>🏆 ${competitionName}</h1>
            <div class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="date">${importedArchers.length} Archers</div>
          </div>

          ${Object.entries(archersByBowType).map(([bowType, categoryArchers]) => `
            <div class="category">
              <div class="category-header">${BOW_TYPES[bowType] || bowType} Division (${categoryArchers.length} archers)</div>
              <table class="results-table">
                <thead>
                  <tr>
                    <th style="width: 80px;">Place</th>
                    <th style="text-align: left;">Archer</th>
                    <th style="width: 100px;">Total Score</th>
                    <th style="width: 60px;">X's</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryArchers.map((archer, index) => {
                    const rowClass = index === 0 ? 'gold-row' : index === 1 ? 'silver-row' : index === 2 ? 'bronze-row' : '';
                    return `
                      <tr class="${rowClass}">
                        <td class="place-cell">${getMedalEmoji(index)} ${index + 1}</td>
                        <td class="name-cell">${archer.name}</td>
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
        name: competitionName,
        date: new Date().toISOString(),
        archers: importedArchers,
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
      } else if (Platform.OS === 'android') {
        const { uri } = await Print.printToFileAsync({ html });
        
        try {
          const contentUri = await getContentUriAsync(uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: 'application/pdf',
            packageName: 'com.google.android.apps.docs',
          });
        } catch (intentError) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Open Report',
            });
          }
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
        }
      }

      setShowPreview(false);
      setImportedArchers([]);
      router.push('/competitionHistory');

    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Preview screen
  if (showPreview) {
    const archersByBowType: { [key: string]: ImportedArcher[] } = {};
    importedArchers.forEach(archer => {
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
          <Text style={styles.headerTitle}>Preview Results</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{competitionName}</Text>
            <Text style={styles.previewSubtitle}>
              {importedArchers.length} archers • {Object.keys(archersByBowType).length} categories
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
                  key={archer.id} 
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
            onPress={generateResultsPdf}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#000" />
                <Text style={styles.generateButtonText}>Generate Results PDF</Text>
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
        <Text style={styles.headerTitle}>Import Scores</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Ionicons name="document-text" size={32} color="#2196F3" />
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionsTitle}>Batch Import Archer Scores</Text>
              <Text style={styles.instructionsText}>
                Copy the Import Codes from each archer's competition PDF and paste them all below (one code per line) to import all archers at once.
              </Text>
            </View>
          </View>

          {/* Import Code Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Import Codes (one per line for batch import)</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="Paste import codes here...&#10;Each code on a new line for batch import"
              placeholderTextColor="#666"
              value={importCode}
              onChangeText={setImportCode}
              multiline
              numberOfLines={6}
            />
            <TouchableOpacity
              style={[styles.importButton, !importCode.trim() && styles.importButtonDisabled]}
              onPress={handleImportCode}
              disabled={!importCode.trim()}
            >
              <Ionicons name="add-circle" size={24} color="#000" />
              <Text style={styles.importButtonText}>Import All Archers</Text>
            </TouchableOpacity>
          </View>

          {/* Imported Archers List */}
          {importedArchers.length > 0 && (
            <View style={styles.archersSection}>
              <Text style={styles.sectionTitle}>Imported Archers ({importedArchers.length})</Text>
              
              {importedArchers.map((archer, index) => (
                <View key={archer.id} style={styles.archerItem}>
                  <View style={styles.archerItemInfo}>
                    <Text style={styles.archerItemName}>{archer.name}</Text>
                    <Text style={styles.archerItemMeta}>
                      {BOW_TYPES[archer.bowType] || archer.bowType} • Score: {archer.totalScore} • X: {archer.xCount}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeArcher(index)} style={styles.removeButton}>
                    <Ionicons name="trash-outline" size={20} color="#ed1c24" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Generate Button */}
      {importedArchers.length > 0 && (
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setShowPreview(true)}
          >
            <Ionicons name="eye" size={20} color="#000" />
            <Text style={styles.previewButtonText}>
              Preview & Generate Results
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
  inputSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 8,
  },
  codeInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 150,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  importButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.6,
  },
  importButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  archersSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  archerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  archerItemInfo: { flex: 1 },
  archerItemName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  archerItemMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  removeButton: { padding: 8 },
  footerButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  previewButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  // Preview styles
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
  scoreInfo: { alignItems: 'flex-end' },
  totalScore: { fontSize: 18, fontWeight: 'bold', color: '#FFD700' },
  xCount: { fontSize: 12, color: '#888' },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
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
