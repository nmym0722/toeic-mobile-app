import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NeoButton from '../src/components/NeoButton';
import { getBookmarks, removeBookmark } from '../src/services/bookmarkService';

export default function BookmarksScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<'part_select' | 'question_list'>('part_select');
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadBookmarks = async () => {
    const data = await getBookmarks();
    setBookmarks(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const handleRemoveBookmark = async (id: string) => {
    const updated = await removeBookmark(id);
    setBookmarks(updated);
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const partCounts = {
    5: bookmarks.filter((b) => b.part === 5).length,
    6: bookmarks.filter((b) => b.part === 6).length,
    7: bookmarks.filter((b) => b.part === 7).length,
  };

  const handleBack = () => {
    if (phase === 'question_list') {
      setPhase('part_select');
      setSelectedPart(null);
      setExpandedId(null);
    } else {
      router.back();
    }
  };

  const handleSelectPart = (part: number) => {
    setSelectedPart(part);
    setPhase('question_list');
  };

  // パート名マッピング
  const PART_NAMES: Record<number, string> = {
    5: 'Part 5 ・ 短文穴埋め問題',
    6: 'Part 6 ・ 長文穴埋め問題',
    7: 'Part 7 ・ 読解問題',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {phase === 'part_select' ? 'ブックマーク' : `Part ${selectedPart} 一覧`}
        </Text>
        
        <View style={{ width: 60 }} /> {/* 左右バランス用のダミー */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {phase === 'part_select' ? (
          /* パート選択フェーズ */
          <View style={styles.partSelectContainer}>
            <View style={styles.selectHeader}>
              <Text style={styles.selectTitle}>パートを選択</Text>
              <Text style={styles.selectSubtitle}>
                復習したいパートを選択してください。
              </Text>
            </View>

            <View style={styles.partList}>
              {[5, 6, 7].map((part) => {
                const count = partCounts[part as keyof typeof partCounts];
                return (
                  <NeoButton
                    key={part}
                    onPress={() => handleSelectPart(part)}
                    btnStyle={styles.partBtn}
                  >
                    <View style={styles.partBtnContent}>
                      <Text style={styles.partBtnLabel}>{PART_NAMES[part]}</Text>
                      <Text style={styles.partBtnCount}>{count}問</Text>
                    </View>
                  </NeoButton>
                );
              })}
            </View>

            {bookmarks.length === 0 && (
              <View style={styles.emptyBookmarksCard}>
                <Text style={styles.emptyBookmarksText}>
                  現在、ブックマークされた問題はありません。演習中や結果画面の右上にあるブックマークアイコンをタップして保存できます。
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* 問題一覧フェーズ */
          <View style={styles.questionListContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{PART_NAMES[selectedPart || 5]}</Text>
              <Text style={styles.listSubtitle}>
                タップすると問題の詳細を展開して復習できます。
              </Text>
            </View>

            {bookmarks.filter((b) => b.part === selectedPart).length === 0 ? (
              <View style={styles.emptyBookmarksCard}>
                <Text style={styles.emptyBookmarksText}>
                  このパートにブックマークされた問題はありません。
                </Text>
              </View>
            ) : (
              bookmarks
                .filter((b) => b.part === selectedPart)
                .map((item) => {
                  const isExpanded = expandedId === item.id;
                  const q = item.question;

                  return (
                    <View key={item.id} style={styles.bookmarkCard}>
                      {/* ヘッダー部分（タップで開閉） */}
                      <TouchableOpacity
                        onPress={() => setExpandedId(isExpanded ? null : item.id)}
                        style={styles.bookmarkCardHeader}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, gap: 6, paddingRight: 8 }}>
                          <View style={styles.bookmarkCardTags}>
                            <Text style={styles.bookmarkLevelBadge}>{item.level}点レベル</Text>
                            <Text style={styles.bookmarkIdText}>ID: {item.id}</Text>
                          </View>
                          <Text style={styles.bookmarkQuestionTextSnippet} numberOfLines={1}>
                            {q.sentence}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <TouchableOpacity
                            onPress={() => handleRemoveBookmark(item.id)}
                            style={styles.bookmarkActionBtn}
                          >
                            <Ionicons name="bookmark" size={22} color="#378F8F" />
                          </TouchableOpacity>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#7C756B"
                          />
                        </View>
                      </TouchableOpacity>

                      {/* 展開時のコンテンツ */}
                      {isExpanded && (
                        <View style={styles.bookmarkDetails}>
                          <View style={styles.detailDivider} />
                          
                          {/* 問題文 */}
                          <Text style={styles.detailQuestionText}>{q.sentence}</Text>

                          {/* 選択肢 */}
                          <View style={styles.detailOptionsContainer}>
                            {['A', 'B', 'C', 'D'].map((key) => {
                              const isCorrect = key === q.correct_answer;
                              return (
                                <View
                                  key={key}
                                  style={[
                                    styles.detailOptionRow,
                                    isCorrect && styles.detailOptionRowCorrect
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.detailOptionLabel,
                                      isCorrect && styles.detailOptionLabelCorrect
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.detailOptionLabelText,
                                        isCorrect && styles.detailOptionLabelTextCorrect
                                      ]}
                                    >
                                      {isCorrect ? '✓' : key}
                                    </Text>
                                  </View>
                                  <Text
                                    style={[
                                      styles.detailOptionText,
                                      isCorrect && styles.detailOptionTextCorrect
                                    ]}
                                  >
                                    {q.options[key]}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>

                          {/* 和訳 */}
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionHeader}>和訳</Text>
                            <Text style={styles.detailSectionText}>{q.meaning}</Text>
                          </View>

                          {/* 解説 */}
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionHeader}>解説</Text>
                            <Text style={styles.detailSectionText}>{q.explanation}</Text>
                          </View>

                          {/* オプション解説 */}
                          {q.options_explanations && (
                            <View style={styles.detailSectionLast}>
                              <Text style={styles.detailSectionHeader}>選択肢の解説</Text>
                              {['A', 'B', 'C', 'D'].map((key) => (
                                <Text key={key} style={[styles.detailSectionText, { marginTop: 4 }]}>
                                  <Text style={{ fontWeight: 'bold' }}>{key}:</Text> {q.options_explanations[key]}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 16 : 16,
    paddingHorizontal: 24,
    height: 60,
    backgroundColor: '#F3EFE6',
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
  },
  backButton: {
    width: 60,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  partSelectContainer: {
    gap: 20,
  },
  selectHeader: {
    marginBottom: 8,
  },
  selectTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  selectSubtitle: {
    fontSize: 14,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
    marginTop: 4,
  },
  partList: {
    gap: 14,
  },
  partBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 18,
    width: '100%',
  },
  partBtnContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  partBtnLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  partBtnCount: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#93C1C1',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
  },
  emptyBookmarksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    alignItems: 'center',
  },
  emptyBookmarksText: {
    fontSize: 13,
    color: '#7C756B',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'DMSans-Regular',
  },
  questionListContainer: {
    gap: 20,
  },
  listHeader: {
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  listSubtitle: {
    fontSize: 13,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
    marginTop: 4,
  },
  bookmarkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    overflow: 'hidden',
  },
  bookmarkCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  bookmarkCardTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkLevelBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#93C1C1',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
  },
  bookmarkIdText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
  },
  bookmarkQuestionTextSnippet: {
    fontSize: 13,
    color: '#1C1C1E',
    fontFamily: 'DMSans-Regular',
    marginTop: 2,
  },
  bookmarkActionBtn: {
    padding: 4,
  },
  bookmarkDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#DFD8CC',
    marginBottom: 12,
  },
  detailQuestionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
    lineHeight: 22,
    fontFamily: 'DMSans-Regular',
    marginBottom: 12,
  },
  detailOptionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  detailOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F3EFE6',
  },
  detailOptionRowCorrect: {
    backgroundColor: 'rgba(55, 143, 143, 0.15)',
    borderWidth: 1,
    borderColor: '#378F8F',
  },
  detailOptionLabel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DFD8CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailOptionLabelCorrect: {
    backgroundColor: '#378F8F',
  },
  detailOptionLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
  },
  detailOptionLabelTextCorrect: {
    color: '#FFFFFF',
  },
  detailOptionText: {
    fontSize: 13,
    color: '#1C1C1E',
    flex: 1,
    fontFamily: 'DMSans-Regular',
  },
  detailOptionTextCorrect: {
    fontWeight: 'bold',
  },
  detailSection: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 12,
    marginBottom: 12,
  },
  detailSectionLast: {
    paddingBottom: 0,
  },
  detailSectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'MonaSans-Bold',
  },
  detailSectionText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
    fontFamily: 'DMSans-Regular',
  },
});
