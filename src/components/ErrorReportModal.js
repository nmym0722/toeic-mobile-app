import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NeoButton from './NeoButton';
import { saveErrorReport } from '../services/errorReportService';

const REPORT_CATEGORIES = [
  { key: 'typo', label: '問題文・スペル・文法の誤り' },
  { key: 'option', label: '選択肢・正解の誤り' },
  { key: 'explanation', label: '解説・和訳の誤り' },
  { key: 'audio_media', label: '音声・画像の不具合' },
  { key: 'other', label: 'その他' },
];

export default function ErrorReportModal({ isVisible, onClose, questionData }) {
  const [selectedCategory, setSelectedCategory] = useState('typo');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // モーダルが開かれたらステートをリセット
  useEffect(() => {
    if (isVisible) {
      setSelectedCategory('typo');
      setDescription('');
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [isVisible]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const categoryLabel = REPORT_CATEGORIES.find(c => c.key === selectedCategory)?.label || 'その他';

    try {
      await saveErrorReport({
        questionId: questionData?.questionId || 'unknown',
        questionType: questionData?.questionType || 'unknown',
        questionText: questionData?.questionText || '',
        category: categoryLabel,
        description: description,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500); // 1.5秒後に閉じる
    } catch (e) {
      console.error('Failed to submit report:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="alert-circle-outline" size={24} color="#CC2534" style={styles.headerIcon} />
                <Text style={styles.headerTitle}>問題の間違い報告</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isSubmitting}>
                <Ionicons name="close-outline" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            {isSuccess ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle-outline" size={60} color="#378F8F" />
                <Text style={styles.successText}>ご報告ありがとうございました！</Text>
                <Text style={styles.successSubText}>内容を確認し、修正いたします。</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Question Info */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>問題ID:</Text>
                    <Text style={styles.infoValue}>{questionData?.questionId || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>パート:</Text>
                    <Text style={styles.infoValue}>{questionData?.questionType || 'N/A'}</Text>
                  </View>
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>対象問題文/内容:</Text>
                    <Text numberOfLines={3} style={styles.previewText}>
                      {questionData?.questionText || '問題文がありません。'}
                    </Text>
                  </View>
                </View>

                {/* Category Selection */}
                <Text style={styles.sectionLabel}>誤りの種類</Text>
                <View style={styles.categoryContainer}>
                  {REPORT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.categoryButton,
                          isSelected && styles.categoryButtonSelected,
                        ]}
                        onPress={() => setSelectedCategory(cat.key)}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            isSelected && styles.categoryButtonTextSelected,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Detail Input */}
                <Text style={styles.sectionLabel}>詳細な説明 (任意)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="誤りの詳細や、正しい解答・解説の提案などをご記入ください。"
                  placeholderTextColor="#9A948C"
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                  <NeoButton
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    btnStyle={styles.submitBtn}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.submitBtnInner}>
                        <Ionicons name="send-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.submitBtnText}>報告を送信する</Text>
                      </View>
                    )}
                  </NeoButton>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 450,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#F3EFE6', // ベージュ背景
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderColor: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#7C756B',
    width: 60,
    fontSize: 13,
  },
  infoValue: {
    color: '#1C1C1E',
    fontWeight: '600',
    fontSize: 13,
  },
  previewContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: '#DFD8CC',
    paddingTop: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9A948C',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: 'MonaSans-Bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryButtonSelected: {
    backgroundColor: '#93C1C1', // ミントグリーン
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  categoryButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 24,
  },
  actionsContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: '#CC2534', // 赤系のアクセント
    width: '100%',
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubText: {
    fontSize: 14,
    color: '#7C756B',
    textAlign: 'center',
  },
});
