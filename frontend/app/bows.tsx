import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Bow {
  id: string;
  name: string;
  bow_type: string;
  draw_weight: number | null;
  draw_length: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

const BOW_TYPES = [
  'Recurve',
  'Compound',
  'Longbow',
  'Barebow',
  'Traditional',
  'Olympic Recurve',
  'Other',
];

export default function BowsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const [bows, setBows] = useState<Bow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBow, setEditingBow] = useState<Bow | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Recurve');
  const [formDrawWeight, setFormDrawWeight] = useState('');
  const [formDrawLength, setFormDrawLength] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const fetchBows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/bows`);
      if (response.ok) {
        const data = await response.json();
        setBows(data);
      }
    } catch (error) {
      console.error('Error fetching bows:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBows();
    }, [])
  );

  const resetForm = () => {
    setFormName('');
    setFormType('Recurve');
    setFormDrawWeight('');
    setFormDrawLength('');
    setFormNotes('');
    setEditingBow(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (bow: Bow) => {
    setEditingBow(bow);
    setFormName(bow.name);
    setFormType(bow.bow_type);
    setFormDrawWeight(bow.draw_weight?.toString() || '');
    setFormDrawLength(bow.draw_length?.toString() || '');
    setFormNotes(bow.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter a bow name');
      return;
    }

    setSaving(true);
    try {
      const bowData = {
        name: formName.trim(),
        bow_type: formType,
        draw_weight: formDrawWeight ? parseFloat(formDrawWeight) : null,
        draw_length: formDrawLength ? parseFloat(formDrawLength) : null,
        notes: formNotes.trim(),
      };

      let response;
      if (editingBow) {
        response = await fetch(`${API_BASE}/api/bows/${editingBow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bowData),
        });
      } else {
        response = await fetch(`${API_BASE}/api/bows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bowData),
        });
      }

      if (response.ok) {
        setModalVisible(false);
        resetForm();
        fetchBows();
      } else {
        Alert.alert('Error', 'Failed to save bow');
      }
    } catch (error) {
      console.error('Error saving bow:', error);
      Alert.alert('Error', 'Failed to save bow');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (bow: Bow) => {
    Alert.alert(
      'Delete Bow',
      `Are you sure you want to delete "${bow.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE}/api/bows/${bow.id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                fetchBows();
              } else {
                Alert.alert('Error', 'Failed to delete bow');
              }
            } catch (error) {
              console.error('Error deleting bow:', error);
              Alert.alert('Error', 'Failed to delete bow');
            }
          },
        },
      ]
    );
  };

  const getBowIcon = (bowType: string) => {
    switch (bowType.toLowerCase()) {
      case 'compound':
        return 'git-network-outline';
      case 'longbow':
        return 'remove-outline';
      case 'traditional':
        return 'leaf-outline';
      default:
        return 'arrow-forward-outline';
    }
  };

  const renderBowCard = (bow: Bow) => (
    <TouchableOpacity
      key={bow.id}
      style={styles.bowCard}
      onPress={() => openEditModal(bow)}
      activeOpacity={0.8}
    >
      <View style={styles.bowCardHeader}>
        <View style={styles.bowIconContainer}>
          <Ionicons name={getBowIcon(bow.bow_type)} size={28} color="#8B0000" />
        </View>
        <View style={styles.bowInfo}>
          <Text style={styles.bowName}>{bow.name}</Text>
          <Text style={styles.bowType}>{bow.bow_type}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(bow)}
        >
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.bowSpecs}>
        {bow.draw_weight && (
          <View style={styles.specItem}>
            <Ionicons name="fitness-outline" size={16} color="#666" />
            <Text style={styles.specText}>{bow.draw_weight} lbs</Text>
          </View>
        )}
        {bow.draw_length && (
          <View style={styles.specItem}>
            <Ionicons name="resize-outline" size={16} color="#666" />
            <Text style={styles.specText}>{bow.draw_length}"</Text>
          </View>
        )}
      </View>
      
      {bow.notes ? (
        <Text style={styles.bowNotes} numberOfLines={2}>
          {bow.notes}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Bows</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading bows...</Text>
        </View>
      ) : bows.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-forward-outline" size={64} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bows Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add your first bow to track your equipment
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.emptyAddButtonText}>Add Bow</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {bows.map(renderBowCard)}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBow ? 'Edit Bow' : 'Add New Bow'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Bow Name */}
              <Text style={styles.inputLabel}>Bow Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g., My Competition Bow"
                placeholderTextColor="#666"
              />

              {/* Bow Type */}
              <Text style={styles.inputLabel}>Bow Type</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTypePicker(!showTypePicker)}
              >
                <Text style={styles.pickerButtonText}>{formType}</Text>
                <Ionicons
                  name={showTypePicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
              
              {showTypePicker && (
                <View style={styles.pickerOptions}>
                  {BOW_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pickerOption,
                        formType === type && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        setFormType(type);
                        setShowTypePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formType === type && styles.pickerOptionTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Draw Weight */}
              <Text style={styles.inputLabel}>Draw Weight (lbs)</Text>
              <TextInput
                style={styles.textInput}
                value={formDrawWeight}
                onChangeText={setFormDrawWeight}
                placeholder="e.g., 40"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />

              {/* Draw Length */}
              <Text style={styles.inputLabel}>Draw Length (inches)</Text>
              <TextInput
                style={styles.textInput}
                value={formDrawLength}
                onChangeText={setFormDrawLength}
                placeholder="e.g., 28"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder="Any additional notes about this bow..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {editingBow ? 'Update Bow' : 'Save Bow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 8,
    backgroundColor: '#8B0000',
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyAddButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  bowCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  bowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bowIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bowInfo: {
    flex: 1,
  },
  bowName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  bowType: {
    fontSize: 14,
    color: '#8B0000',
  },
  deleteButton: {
    padding: 8,
  },
  bowSpecs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specText: {
    fontSize: 14,
    color: '#888',
  },
  bowNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textAreaInput: {
    minHeight: 100,
  },
  pickerButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  pickerOptions: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  pickerOptionActive: {
    backgroundColor: '#8B0000',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  pickerOptionTextActive: {
    fontWeight: 'bold',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
