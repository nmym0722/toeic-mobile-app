import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import level500Data from '../data/toeic_reading_part7_level500.json';
import level700Data from '../data/toeic_reading_part7_level700.json';
import level900Data from '../data/toeic_reading_part7_level900.json';
import NeoButton from './NeoButton';
import { loadUserStats, saveUserStats, updatePartStats } from '../utils/statsHandler';
import ErrorReportModal from './ErrorReportModal';
import { getBookmarks, addBookmark, removeBookmark } from '../services/bookmarkService';

// 難易度データのマッピング
const LEVEL_DATA = {
  500: level500Data,
  700: level700Data,
  900: level900Data,
};

const LEVELS = [
  { key: 500, label: '500点レベル', count: level500Data.length },
  { key: 700, label: '700点レベル', count: level700Data.length },
  { key: 900, label: '900点レベル', count: level900Data.length },
];

// パッセージテキストを [Document X: ... ] のパターンで分割するヘルパー関数
const parsePassageText = (text) => {
  if (!text) return [];
  const regex = /(\[Document \d+:[^\]]+\])/g;
  const parts = text.split(regex);
  
  const docs = [];
  let currentLabel = 'Document 1';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    
    if (part.match(/^\[Document \d+:/)) {
      currentLabel = part.replace(/[\[\]]/g, '');
    } else {
      docs.push({
        label: currentLabel,
        content: part
      });
    }
  }
  
  if (docs.length === 0) {
    docs.push({
      label: 'Document 1',
      content: text
    });
  }
  
  return docs;
};

export default function Part7Screen({ onBackPortal }) {
  const quizStartTimeRef = useRef(null);
  const scrollViewRef = useRef(null);
  
  const [passages, setPassages] = useState([]);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [passage, setPassage] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // 'A', 'B', 'C', 'D' が入る
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phase, setPhase] = useState('select_level'); // select_level | select_count | quiz | result
  const [selectedLevel, setSelectedLevel] = useState(500);
  const [selectedCount, setSelectedCount] = useState(1); // デフォルト1文書
  const [quizResults, setQuizResults] = useState([]); // [{ questionId, correct, selected, answer }]

  // スワイプタブ用ステート
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);

  // ブックマーク管理用ステート
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  // 問題報告用ステート
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportData, setReportData] = useState(null);

  // 初回ロード時にブックマーク一覧を取得
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const list = await getBookmarks();
        setBookmarkedIds(new Set(list.map(b => b.id)));
      } catch (e) {
        console.error('Failed to load bookmarks:', e);
      }
    };
    loadBookmarks();
  }, []);

  // ブックマークの追加・削除トグル
  const handleToggleBookmark = async (qNumber) => {
    if (!passage) return;
    const targetQ = passage.questions.find(q => Number(q.question_number) === Number(qNumber));
    if (!targetQ) return;

    const bookmarkId = `${passage.passage_id}_${qNumber}`;
    const isBookmarked = bookmarkedIds.has(bookmarkId);
    let updatedList;

    if (isBookmarked) {
      updatedList = await removeBookmark(bookmarkId);
    } else {
      const bookmarkQuestion = {
        id: bookmarkId,
        sentence: passage.passage_text, // 本文全体
        options: targetQ.options,
        correct_answer: targetQ.correct_answer,
        meaning: passage.passage_translation, // 全訳
        explanation: targetQ.explanation,
        options_explanations: targetQ.options_explanations
      };
      updatedList = await addBookmark(bookmarkQuestion, 7, selectedLevel);
    }
    setBookmarkedIds(new Set(updatedList.map(b => b.id)));
  };

  const setupPassage = (p) => {
    setPassage(p);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setActiveTabIdx(0);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }, 50);
  };

  // 指定されたレベルと問題数（文書数）でランダム抽出
  useEffect(() => {
    if (phase === 'quiz') {
      const rawData = LEVEL_DATA[selectedLevel] || [];
      const shuffled = [...rawData].sort(() => 0.5 - Math.random());
      const actualCount = Math.min(selectedCount, shuffled.length);
      const selectedPassages = shuffled.slice(0, actualCount);

      setPassages(selectedPassages);
      setCurrentPassageIndex(0);
      setQuizResults([]);

      if (selectedPassages.length > 0) {
        setupPassage(selectedPassages[0]);
      }
      quizStartTimeRef.current = Date.now();
    }
  }, [phase, selectedLevel, selectedCount]);

  const handleSelectOption = (optKey) => {
    if (isSubmitted) return;
    setSelectedOption(optKey);
    setIsSubmitted(true);

    const currentQuestion = passage.questions[currentQIndex];
    const isCorrect = optKey === currentQuestion.correct_answer;

    setQuizResults((prev) => [
      ...prev,
      {
        questionId: `${passage.passage_id}_q_${currentQuestion.question_number}`,
        passageId: passage.passage_id,
        questionNumber: currentQuestion.question_number,
        correct: isCorrect,
        selected: optKey,
        answer: currentQuestion.correct_answer,
        explanation: currentQuestion.explanation,
        options_explanations: currentQuestion.options_explanations,
      },
    ]);
  };

  const savePart7Results = async (results) => {
    try {
      const totalCount = results.length;
      const correctCount = results.filter((r) => r.correct).length;
      const elapsedSec = quizStartTimeRef.current ? Math.round((Date.now() - quizStartTimeRef.current) / 1000) : 0;
      const stats = await loadUserStats();
      const testName = `Part 7 (${selectedLevel}点レベル ${totalCount}問)`;
      const updated = updatePartStats(stats, 'part7', correctCount, totalCount, elapsedSec, testName);
      await saveUserStats(updated);
    } catch (e) {
      console.error('Failed to save Part 7 stats:', e);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 >= passage.questions.length) {
      // 現在のパッセージの最後の設問だった場合
      goToNextPassageOrResult();
    } else {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    }
  };

  const goToNextPassageOrResult = () => {
    const nextIndex = currentPassageIndex + 1;
    if (nextIndex < passages.length) {
      setCurrentPassageIndex(nextIndex);
      setupPassage(passages[nextIndex]);
    } else {
      savePart7Results(quizResults);
      setPhase('result');
    }
  };

  // ドキュメントタイプのアイコン名を取得する（Ionicons対応）
  const getDocIconName = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('email') || t.includes('letter')) return 'mail-outline';
    if (t.includes('article') || t.includes('report')) return 'document-text-outline';
    if (t.includes('ad') || t.includes('advertisement')) return 'megaphone-outline';
    if (t.includes('chat') || t.includes('message')) return 'chatbubble-ellipses-outline';
    if (t.includes('invoice') || t.includes('bill')) return 'receipt-outline';
    return 'reader-outline';
  };

  /* ==========================================
     1. レベル選択画面 (select_level)
     ========================================== */
  if (phase === 'select_level') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.selectHeader}>
            <Text style={styles.selectWelcome}>Part 7 ・ Reading Comprehension</Text>
            <Text style={styles.selectTitle}>レベルを選択</Text>
          </View>

          <View style={styles.typeListContainer}>
            {LEVELS.map((level) => (
              <NeoButton
                key={level.key}
                onPress={() => {
                  setSelectedLevel(level.key);
                  setPhase('select_count');
                }}
                btnStyle={styles.typeBtn}
              >
                <View style={styles.typeBtnContent}>
                  <Text style={styles.typeBtnLabel}>{level.label}</Text>
                  <Text style={styles.typeBtnCount}>{level.count}文書</Text>
                </View>
              </NeoButton>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <NeoButton
            onPress={onBackPortal}
            btnStyle={styles.backBtn}
          >
            <Text style={styles.backBtnText}>ダッシュボードに戻る</Text>
          </NeoButton>
        </View>
      </View>
    );
  }

  /* ==========================================
     2. 問題数選択画面 (select_count)
     ========================================== */
  if (phase === 'select_count') {
    const total = LEVEL_DATA[selectedLevel]?.length || 0;
    const levelLabel = LEVELS.find(l => l.key === selectedLevel)?.label || `${selectedLevel}点レベル`;

    const countOptions = [
      { value: 1, label: '1文書' },
      { value: 2, label: '2文書' },
      { value: 3, label: '3文書' },
    ];

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.selectHeader}>
            <Text style={styles.selectWelcome}>Part 7 ・ Reading Comprehension</Text>
            <Text style={styles.selectTitle}>問題数（文書数）を選択</Text>
            <Text style={styles.selectSubtitle}>
              レベル: {levelLabel} ({total}文書中)
            </Text>
          </View>

          <View style={styles.countList}>
            {countOptions.map((option, index) => (
              <NeoButton
                key={index}
                onPress={() => {
                  setSelectedCount(option.value);
                  setPhase('quiz');
                }}
                btnStyle={styles.countBtn}
              >
                <Text style={styles.countBtnText}>{option.label}</Text>
              </NeoButton>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <NeoButton
            onPress={() => setPhase('select_level')}
            btnStyle={styles.backBtn}
          >
            <Text style={styles.backBtnText}>レベル選択に戻る</Text>
          </NeoButton>
        </View>
      </View>
    );
  }

  if (!passage) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#93C1C1" />
        <Text style={styles.loadingText}>Loading Passage...</Text>
      </View>
    );
  }

  const currentQuestion = passage.questions[currentQIndex];
  const isCorrect = selectedOption === currentQuestion.correct_answer;
  const totalQuestions = passage.questions.length;
  const progress = Math.round(((currentQIndex + 1) / totalQuestions) * 100);

  // パッセージをパースして分割したドキュメントの配列
  const docs = parsePassageText(passage.passage_text);

  /* ==========================================
     A. Quiz Screen (quiz)
     ========================================== */
  if (phase === 'quiz') {
    const bookmarkId = `${passage.passage_id}_${currentQuestion.question_number}`;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setPhase('select_level')}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Menu</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Bookmark Button */}
              <TouchableOpacity
                onPress={() => handleToggleBookmark(currentQuestion.question_number)}
                style={styles.reportIconButton}
              >
                <Ionicons
                  name={bookmarkedIds.has(bookmarkId) ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color="#378F8F"
                />
              </TouchableOpacity>

              {/* Report Button */}
              <TouchableOpacity
                onPress={() => {
                  setReportData({
                    questionId: `${passage.passage_id}_q_${currentQuestion.question_number}`,
                    questionType: 'Part 7',
                    questionText: `【タイトル】: ${passage.title || 'No Title'}\n【設問】: ${currentQuestion.question_text || 'N/A'}\n【本文】: ${passage.passage_text}`,
                  });
                  setReportModalVisible(true);
                }}
                style={styles.reportIconButton}
              >
                <Ionicons name="alert-circle-outline" size={24} color="#CC2534" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.headerBadgeWrapper}>
                <Ionicons name={getDocIconName(passage.document_type)} size={14} color="#7C756B" style={{ marginRight: 4 }} />
                <Text style={styles.headerBadgeText}>
                  {passage.document_type || 'Reading'}
                </Text>
              </View>
              <Text style={styles.progressText}>
                Q {currentQIndex + 1} / {totalQuestions}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>

          {/* Document Status Header (Passage Count) */}
          <Text style={styles.passageCountLabel}>
            パッセージ {currentPassageIndex + 1} / {passages.length}
          </Text>

          {/* Passage Card with Tab Switching / Swipe */}
          <View
            style={styles.passageCard}
            onLayout={(e) => {
              setLayoutWidth(e.nativeEvent.layout.width - 40); // 左右padding 20px分の計40pxを引く
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.passageTitle}>{passage.title || 'Reading Comprehension'}</Text>
              <Text style={styles.idBadge}>長文ID: {passage.passage_id}</Text>
            </View>
            <View style={styles.passageDivider} />

            {/* ダブル/トリプルパッセージの場合のタブヘッダー */}
            {docs.length > 1 && (
              <View style={styles.tabHeaderContainer}>
                {docs.map((doc, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setActiveTabIdx(idx);
                      scrollViewRef.current?.scrollTo({ x: idx * layoutWidth, animated: true });
                    }}
                    style={[styles.tabButton, activeTabIdx === idx && styles.tabButtonActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabButtonText, activeTabIdx === idx && styles.tabButtonTextActive]}>
                      文書 {idx + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.passagesContainer}>
              {layoutWidth > 0 ? (
                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const contentOffset = e.nativeEvent.contentOffset.x;
                    const index = Math.round(contentOffset / layoutWidth);
                    if (index !== activeTabIdx && index >= 0 && index < docs.length) {
                      setActiveTabIdx(index);
                    }
                  }}
                  contentContainerStyle={{ width: layoutWidth * docs.length }}
                >
                  {docs.map((doc, idx) => (
                    <View key={idx} style={{ width: layoutWidth, paddingRight: 8 }}>
                      <Text style={styles.docLabelText}>{doc.label}</Text>
                      <View style={styles.passageDivider} />
                      <Text style={styles.docContentText}>
                        {doc.content.replace(/\\n/g, '\n')}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <ActivityIndicator size="small" color="#93C1C1" />
              )}
            </View>
          </View>

          {/* Question Options Card */}
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
                <Text style={styles.questionLabel}>Question {currentQuestion.question_number}</Text>
                <Text style={styles.idBadge}>設問ID: {passage.passage_id}_q_{currentQuestion.question_number}</Text>
              </View>
              <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
              
              {isSubmitted && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ionicons
                    name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={isCorrect ? '#378F8F' : '#CC2534'}
                  />
                  <Text
                    style={[
                      styles.resultBadge,
                      isCorrect ? styles.resultBadgeCorrect : styles.resultBadgeWrong,
                    ]}
                  >
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </Text>
                </View>
              )}
            </View>

            {/* Options List */}
            <View style={styles.optionsContainer}>
              {['A', 'B', 'C', 'D'].map((optKey, idx) => {
                const optText = currentQuestion.options[optKey];
                const isOptSelected = selectedOption === optKey;
                const isOptCorrect = optKey === currentQuestion.correct_answer;

                let btnStyle = styles.optButton;
                let labelStyle = styles.optLabelBg;
                let labelContent = optKey;
                let optTextStyle = styles.optText;
                let shadowColor = '#1C1C1E';

                if (isSubmitted) {
                  if (isOptCorrect) {
                    btnStyle = [styles.optButton, styles.optCorrect];
                    labelStyle = [styles.optLabelBg, styles.labelCorrect];
                    optTextStyle = [styles.optText, styles.optTextCorrect];
                    labelContent = '✓';
                    shadowColor = '#378F8F';
                  } else if (isOptSelected && !isCorrect) {
                    btnStyle = [styles.optButton, styles.optWrong];
                    labelStyle = [styles.optLabelBg, styles.labelWrong];
                    optTextStyle = [styles.optText, styles.optTextWrong];
                    labelContent = '✗';
                    shadowColor = '#CC2534';
                  } else {
                    btnStyle = [styles.optButton, styles.optDisabled];
                    labelStyle = [styles.optLabelBg, styles.labelDisabled];
                    optTextStyle = [styles.optText, styles.optTextDisabled];
                    labelContent = optKey;
                  }
                } else if (isOptSelected) {
                  btnStyle = [styles.optButton, styles.optSelected];
                  labelStyle = [styles.optLabelBg, styles.labelSelected];
                  optTextStyle = [styles.optText, styles.optTextSelected];
                }

                return (
                  <NeoButton
                    key={idx}
                    onPress={() => handleSelectOption(optKey)}
                    disabled={isSubmitted}
                    btnStyle={btnStyle}
                    shadowColor={shadowColor}
                  >
                    <View style={styles.optBtnInner}>
                      <View style={labelStyle}>
                        <Text style={styles.optLabelText}>{labelContent}</Text>
                      </View>
                      <Text style={optTextStyle}>{optText}</Text>
                    </View>
                  </NeoButton>
                );
              })}
            </View>

            {/* Explanation Box (Keep Japanese) */}
            {isSubmitted && (
              <View style={styles.explanationBox}>
                <Text style={styles.expHeader}>Explanation</Text>
                <Text style={styles.expText}>{currentQuestion.explanation}</Text>
                
                {currentQuestion.options_explanations && (
                  <View style={{ marginTop: 12, gap: 6 }}>
                    {['A', 'B', 'C', 'D'].map((key) => {
                      const exp = currentQuestion.options_explanations[key];
                      if (!exp) return null;
                      return (
                        <Text key={key} style={styles.optExpText}>
                          <Text style={{ fontWeight: 'bold' }}>{key}:</Text> {exp}
                        </Text>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.footer}>
          {isSubmitted && (
            <NeoButton
              onPress={handleNextQuestion}
              btnStyle={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {currentQIndex + 1 >= totalQuestions && currentPassageIndex + 1 >= passages.length
                  ? 'Show Results'
                  : currentQIndex + 1 >= totalQuestions
                  ? 'Next Passage'
                  : 'Next'}
              </Text>
            </NeoButton>
          )}
        </View>
        <ErrorReportModal
          isVisible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          questionData={reportData}
        />
      </View>
    );
  }

  /* ==========================================
     B. Results Screen (result)
     ========================================== */
  const totalCorrect = quizResults.filter((r) => r.correct).length;
  const scorePercent = Math.round((totalCorrect / quizResults.length) * 100) || 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Test Results</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{scorePercent}</Text>
            <Text style={styles.scoreLabel}>%</Text>
          </View>
          <Text style={styles.evaluationTitle}>
            {scorePercent === 100 ? 'PERFECT!' : scorePercent >= 66 ? 'GREAT JOB!' : 'KEEP GOING!'}
          </Text>
          <Text style={styles.evaluationSub}>
            Correct: {totalCorrect} / {quizResults.length} Questions
          </Text>
        </View>

        {/* Review List (Keep explanations in Japanese) */}
        <Text style={styles.reviewHeader}>Explanations & Review</Text>
        <View style={styles.reviewList}>
          {quizResults.map((res, idx) => {
            const isCorrect = res.correct;
            const bookmarkId = `${res.passageId}_${res.questionNumber}`;

            return (
              <View key={idx} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={isCorrect ? '#378F8F' : '#CC2534'}
                    />
                    <Text
                      style={[
                        styles.resultBadge,
                        isCorrect ? styles.resultBadgeCorrect : styles.resultBadgeWrong,
                      ]}
                    >
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Text>
                  </View>
                  <Text style={styles.reviewTypeBadge}>Question {res.questionNumber}</Text>
                  
                  {/* Bookmark Button in Review */}
                  <TouchableOpacity
                    onPress={() => handleToggleBookmark(res.questionNumber)}
                    style={{ marginLeft: 'auto', padding: 4 }}
                  >
                    <Ionicons
                      name={bookmarkedIds.has(bookmarkId) ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      color="#378F8F"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.reviewAnswersContainer}>
                  <Text style={styles.answerRowText}>
                    Your Answer: <Text style={isCorrect ? styles.textCorrect : styles.textWrong}>{res.selected}</Text>
                  </Text>
                  {!isCorrect && (
                    <Text style={styles.answerRowText}>
                      Correct Answer: <Text style={styles.textCorrect}>{res.answer}</Text>
                    </Text>
                  )}
                  <View style={styles.reviewDivider} />
                  <Text style={styles.reviewExpTextHeader}>Explanation</Text>
                  <Text style={styles.reviewExpText}>{res.explanation}</Text>
                  
                  {res.options_explanations && (
                    <View style={{ marginTop: 8, gap: 4 }}>
                      {['A', 'B', 'C', 'D'].map((key) => {
                        const exp = res.options_explanations[key];
                        if (!exp) return null;
                        return (
                          <Text key={key} style={styles.optExpTextSmall}>
                            <Text style={{ fontWeight: 'bold' }}>{key}:</Text> {exp}
                          </Text>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.resultActions}>
          <NeoButton
            onPress={() => setPhase('select_level')}
            btnStyle={styles.primaryActionBtn}
          >
            <Text style={styles.primaryActionBtnText}>レベル選択に戻る</Text>
          </NeoButton>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6', // Beige background
    paddingHorizontal: 24,
  },
  containerCentered: {
    flex: 1,
    backgroundColor: '#F3EFE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 24 : 16, // リーディング基準の上部安全余白に統一
    marginBottom: 8,
  },
  headerBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DFD8CC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    fontFamily: 'DMSans-Bold',
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#DFD8CC',
    borderRadius: 3,
    width: '100%',
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#93C1C1',
    borderRadius: 3,
  },
  passageCountLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    marginBottom: 6,
    fontFamily: 'MonaSans-Bold',
  },
  /* Passage Card */
  passageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    marginBottom: 20,
  },
  passageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    lineHeight: 24,
    fontFamily: 'MonaSans-Bold',
    flex: 1,
  },
  passageDivider: {
    height: 0.5,
    backgroundColor: '#DFD8CC',
    marginVertical: 12,
  },
  passagesContainer: {
    gap: 16,
  },
  docParagraph: {
    gap: 6,
  },
  docContentText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 22,
    fontWeight: '500',
    fontFamily: 'DMSans-Regular',
  },
  /* Question Card */
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    marginBottom: 20,
  },
  questionHeader: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 16,
    marginBottom: 16,
  },
  questionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#93C1C1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'MonaSans-Bold',
  },
  questionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: 'DMSans-Regular',
  },
  resultBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'DMSans-Bold',
  },
  resultBadgeCorrect: {
    color: '#378F8F',
  },
  resultBadgeWrong: {
    color: '#CC2534',
  },
  optionsContainer: {
    gap: 12,
  },
  optButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 0,
    width: '100%',
  },
  optBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 10,
  },
  optText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },
  optLabelBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DFD8CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optLabelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  /* Option State Styles */
  optSelected: {
    backgroundColor: '#EBE5D8',
  },
  labelSelected: {
    backgroundColor: '#7C756B',
  },
  optTextSelected: {
    color: '#1C1C1E',
  },
  optCorrect: {
    borderColor: '#378F8F',
    backgroundColor: '#93C1C1',
  },
  labelCorrect: {
    backgroundColor: '#FFFFFF',
  },
  optTextCorrect: {
    color: '#FFFFFF',
  },
  optWrong: {
    borderColor: '#CC2534',
    backgroundColor: '#E88B8B',
  },
  labelWrong: {
    backgroundColor: '#FFFFFF',
  },
  optTextWrong: {
    color: '#FFFFFF',
  },
  optDisabled: {
    opacity: 0.4,
  },
  labelDisabled: {
    opacity: 0.4,
  },
  optTextDisabled: {
    color: '#7C756B',
  },
  /* Explanation Box */
  explanationBox: {
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DFD8CC',
    marginTop: 16,
  },
  expHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: 'MonaSans-Bold',
  },
  expText: {
    fontSize: 12,
    color: '#1C1C1E',
    lineHeight: 18,
    fontFamily: 'DMSans-Regular',
  },
  optExpText: {
    fontSize: 11,
    color: '#7C756B',
    lineHeight: 16,
    fontFamily: 'DMSans-Regular',
  },
  optExpTextSmall: {
    fontSize: 11,
    color: '#7C756B',
    lineHeight: 15,
    fontFamily: 'DMSans-Regular',
  },
  footer: {
    paddingVertical: 16,
  },
  actionBtn: {
    backgroundColor: '#93C1C1',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    width: '100%',
  },
  actionBtnDisabled: {
    backgroundColor: '#DFD8CC',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  /* Results Screen */
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16,
    fontFamily: 'MonaSans-Bold',
  },
  scoreCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 6,
    borderColor: '#93C1C1',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: 'bold',
    marginLeft: 2,
    fontFamily: 'MonaSans-Bold',
  },
  evaluationTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: 'MonaSans-Bold',
  },
  evaluationSub: {
    fontSize: 12,
    color: '#7C756B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
    fontFamily: 'DMSans-Regular',
  },
  reviewHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginVertical: 12,
    fontFamily: 'MonaSans-Bold',
  },
  reviewList: {
    gap: 16,
    marginBottom: 24,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewTypeBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7C756B',
    backgroundColor: '#EBE5D8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
  },
  reviewAnswersContainer: {
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  answerRowText: {
    fontSize: 12,
    color: '#7C756B',
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'DMSans-Regular',
  },
  textWrong: {
    color: '#CC2534',
    fontWeight: 'bold',
  },
  textCorrect: {
    color: '#378F8F',
    fontWeight: 'bold',
  },
  reviewDivider: {
    height: 0.5,
    backgroundColor: '#DFD8CC',
    marginVertical: 12,
  },
  reviewExpTextHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: 'MonaSans-Bold',
  },
  reviewExpText: {
    fontSize: 12,
    color: '#7C756B',
    lineHeight: 18,
    fontFamily: 'DMSans-Regular',
  },
  resultActions: {
    gap: 12,
  },
  primaryActionBtn: {
    backgroundColor: '#93C1C1',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    width: '100%',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  backButton: {
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  reportIconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#EBE5D8',
    color: '#7C756B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
  },
  /* Select Screen Styles */
  selectHeader: {
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 24 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
    marginBottom: 20,
  },
  selectWelcome: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'MonaSans-Bold',
  },
  selectTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    marginTop: 4,
    fontFamily: 'MonaSans-Bold',
  },
  selectSubtitle: {
    fontSize: 14,
    color: '#7C756B',
    marginTop: 6,
    fontWeight: '600',
    fontFamily: 'DMSans-Regular',
  },
  typeListContainer: {
    gap: 14,
    paddingBottom: 20,
  },
  typeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 18,
    width: '100%',
  },
  typeBtnContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  typeBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  typeBtnCount: {
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
  countList: {
    gap: 16,
    paddingBottom: 20,
  },
  countBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 18,
    width: '100%',
  },
  countBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    fontFamily: 'MonaSans-Bold',
  },
  backBtn: {
    backgroundColor: '#EBE5D8',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    width: '100%',
  },
  backBtnText: {
    color: '#7C756B',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  /* Tab and Multi-Passage Styles */
  tabHeaderContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
    marginBottom: 12,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#93C1C1',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  tabButtonTextActive: {
    color: '#378F8F',
  },
  docLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
    marginBottom: 4,
  },
});
