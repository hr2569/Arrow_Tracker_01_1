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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

const ROUNDS_COUNT = 10;
const ARROWS_PER_ROUND = 3;

export default function ImportPdf() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [importedArchers, setImportedArchers] = useState<ImportedArcher[]>([]);
  const [competitionName, setCompetitionName] = useState('Competition Results');
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanning(false);
    
    try {
      const parsed = JSON.parse(data);
      
      // Validate it's an Arrow Tracker QR code
      if (parsed.t !== 'at_comp' || !parsed.n || !parsed.b || parsed.s === undefined) {
        Alert.alert('Invalid QR Code', 'This is not a valid Arrow Tracker competition QR code.');
        return;
      }
      
      // Create archer object from QR data
      const newArcher: ImportedArcher = {
        id: `${parsed.n.replace(/\s+/g, '_')}_${Date.now()}`,
        name: parsed.n,
        bowType: parsed.b,
        totalScore: parsed.s,
        xCount: parsed.x || 0,
        rounds: parsed.r || [],
      };
      
      // Check if archer already exists
      const exists = importedArchers.some(a => a.name === newArcher.name);
      if (exists) {
        Alert.alert(
          'Duplicate Archer',
          `${newArcher.name} has already been imported. Do you want to replace their data?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Replace', 
              onPress: () => {
                setImportedArchers(prev => 
                  prev.map(a => a.name === newArcher.name ? newArcher : a)
                );
                Alert.alert('Updated', `${newArcher.name}'s data has been updated.`);
              }
            },
          ]
        );
      } else {
        setImportedArchers(prev => [...prev, newArcher]);
        Alert.alert(
          'Archer Imported!',
          `${newArcher.name} (${BOW_TYPES[newArcher.bowType] || newArcher.bowType})\nScore: ${newArcher.totalScore}`,
          [
            { text: 'Done', style: 'cancel' },
            { text: 'Scan Another', onPress: () => setScanning(true) },
          ]
        );
      }
    } catch (error) {
      console.error('QR Parse Error:', error);
      Alert.alert('Parse Error', 'Could not read the QR code data. Make sure it\'s a valid Arrow Tracker competition QR code.');
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

  // Camera permission handling
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      </SafeAreaView>
    );
  }

  // QR Scanner Modal
  const renderScanner = () => (
    <Modal visible={scanning} animationType="slide">
      <SafeAreaView style={styles.scannerContainer}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={() => setScanning(false)} style={styles.closeButton}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scan QR Code</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
          </View>
        </View>
        
        <View style={styles.scannerFooter}>
          <Text style={styles.scannerInstructions}>
            Point camera at the QR code on an archer's competition report
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );

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
      {renderScanner()}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Scores</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="qr-code" size={32} color="#2196F3" />
          <View style={styles.instructionsContent}>
            <Text style={styles.instructionsTitle}>Scan Competition QR Codes</Text>
            <Text style={styles.instructionsText}>
              Scan the QR code from each archer's competition report PDF. The app will automatically import their name, bow type, and scores.
            </Text>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            if (!permission.granted) {
              requestPermission();
            } else {
              setScanning(true);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="scan" size={48} color="#000" />
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
          <Text style={styles.scanButtonSubtext}>
            {importedArchers.length > 0 
              ? `${importedArchers.length} archer${importedArchers.length > 1 ? 's' : ''} imported`
              : 'Tap to start scanning'}
          </Text>
        </TouchableOpacity>

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

      {/* Generate Button */}
      {importedArchers.length > 0 && (
        <View style={styles.footer}>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  scanButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  scanButtonText: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  scanButtonSubtext: { fontSize: 14, color: '#000', opacity: 0.7 },
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
  footer: {
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
  // Scanner styles
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: { padding: 8 },
  scannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#2196F3',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scannerFooter: { padding: 20 },
  scannerInstructions: { color: '#fff', textAlign: 'center', fontSize: 14 },
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
