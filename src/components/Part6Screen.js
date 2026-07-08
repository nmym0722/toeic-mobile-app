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
import level500Data from '../data/toeic_reading_part6_level500.json';
import level700Data from '../data/toeic_reading_part6_level700.json';
import level900Data from '../data/toeic_reading_part6_level900.json';
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

export default function Part6Screen({ onBackPortal }) {
  const quizStartTimeRef = useRef(null);
  const [passages, setPassages] = useState([]);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [passage, setPassage] = useState(null);
  const [activeBlank, setActiveBlank] = useState('1'); // 現在アクティブな空所ID ("1"〜"4")
  const [answers, setAnswers] = useState({}); // { "1": "C", ... }
  const [submittedBlanks, setSubmittedBlanks] = useState({}); // { "1": true, ... }
  const [phase, setPhase] = useState('select_level'); // select_level | select_count | quiz | result
  const [selectedLevel, setSelectedLevel] = useState(500);
  const [selectedCount, setSelectedCount] = useState(1); // デフォルト1文書
  const [quizResults, setQuizResults] = useState([]); // [{ passageId, questionNumber, correct, selected, answer }]
  
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
      // bookmarks.tsx で Part 5 と同様に表示できるようにマッピングして保存
      const bookmarkQuestion = {
        id: bookmarkId,
        sentence: passage.passage_text, // 本文全体
        options: targetQ.options,
        correct_answer: targetQ.correct_answer,
        meaning: passage.passage_translation, // 全訳
        explanation: targetQ.explanation,
        options_explanations: targetQ.options_explanations
      };
      updatedList = await addBookmark(bookmarkQuestion, 6, selectedLevel);
    }
    setBookmarkedIds(new Set(updatedList.map(b => b.id)));
  };

  const setupPassage = (p) => {
    setPassage(p);
    setActiveBlank('1');
    setAnswers({});
    setSubmittedBlanks({});
  };

  // 指定されたレベルと問題数でランダム抽出 (新データ形式をそのまま使用)
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
    if (submittedBlanks[activeBlank]) return;
    setAnswers((prev) => ({ ...prev, [activeBlank]: optKey }));
    setSubmittedBlanks((prev) => ({ ...prev, [activeBlank]: true }));

    const activeQuestion = passage.questions.find(
      (q) => Number(q.question_number) === Number(activeBlank)
    );
    const isCorrect = optKey === activeQuestion.correct_answer;

    setQuizResults((prev) => [
      ...prev,
      {
        passageId: passage.passage_id,
        questionNumber: activeQuestion.question_number,
        correct: isCorrect,
        selected: optKey,
        answer: activeQuestion.correct_answer,
        explanation: activeQuestion.explanation,
        options_explanations: activeQuestion.options_explanations,
      },
    ]);
  };

  const savePart6Results = async (results) => {
    try {
      const totalCount = results.length;
      const correctCount = results.filter((r) => r.correct).length;
      const elapsedSec = quizStartTimeRef.current ? Math.round((Date.now() - quizStartTimeRef.current) / 1000) : 0;
      const stats = await loadUserStats();
      const testName = `Part 6 (${selectedLevel}点レベル ${totalCount}問)`;
      const updated = updatePartStats(stats, 'part6', correctCount, totalCount, elapsedSec, testName);
      await saveUserStats(updated);
    } catch (e) {
      console.error('Failed to save Part 6 stats:', e);
    }
  };

  const handleNextBlank = () => {
    const nextId = String(Number(activeBlank) + 1);
    if (Number(nextId) <= passage.questions.length) {
      setActiveBlank(nextId);
    } else {
      // 現在の大問が完了したかどうかをチェック
      const allDone = passage.questions.every((q) => submittedBlanks[String(q.question_number)]);
      if (allDone) {
        goToNextPassageOrResult();
      } else {
        const uncompleted = passage.questions.find((q) => !submittedBlanks[String(q.question_number)]);
        if (uncompleted) {
          setActiveBlank(String(uncompleted.question_number));
        } else {
          goToNextPassageOrResult();
        }
      }
    }
  };

  const goToNextPassageOrResult = () => {
    const nextIndex = currentPassageIndex + 1;
    if (nextIndex < passages.length) {
      setCurrentPassageIndex(nextIndex);
      setupPassage(passages[nextIndex]);
    } else {
      savePart6Results(quizResults);
      setPhase('result');
    }
  };

  // 本文をパースし、空欄部分 ( --- 1 --- ) をReact Nativeのインタラクティブなインラインボタンに変換
  const renderPassage = () => {
    if (!passage) return null;

    // 空所プレースホルダー ( --- 1 --- ) などでテキストを分割
    const parts = passage.passage_text.split(/(\(\s*---\s*\d+\s*---\s*\))/g);

    return (
      <Text style={styles.passageText}>
        {parts.map((part, idx) => {
          const blankMatch = part.match(/\(\s*---\s*(\d+)\s*---\s*\)/);
          if (blankMatch) {
            const qId = blankMatch[1];
            const q = passage.questions.find((item) => Number(item.question_number) === Number(qId));
            if (!q) return part; // 安全対策

            const selected = answers[qId];
            const isBlankSubmitted = submittedBlanks[qId];

            let btnStyle = styles.blankButton;
            let btnTextStyle = styles.blankButtonText;

            if (isBlankSubmitted) {
              const isCorrect = selected === q.correct_answer;
              btnStyle = [styles.blankButton, isCorrect ? styles.blankCorrect : styles.blankWrong];
              btnTextStyle = [styles.blankButtonText, styles.blankTextWhite];
            } else if (activeBlank === qId) {
              btnStyle = [styles.blankButton, styles.blankActive];
              btnTextStyle = [styles.blankButtonText, styles.blankTextActive];
            } else if (selected) {
              btnStyle = [styles.blankButton, styles.blankSelected];
              btnTextStyle = [styles.blankButtonText, styles.blankTextSelected];
            }

            return (
              <TouchableOpacity
                key={idx}
                disabled={isBlankSubmitted}
                onPress={() => setActiveBlank(qId)}
                style={btnStyle}
                activeOpacity={0.8}
              >
                <Text style={btnTextStyle}>
                  {selected ? `${qId}. ${selected}` : ` [${qId}] `}
                </Text>
              </TouchableOpacity>
            );
          }

          return part;
        })}
      </Text>
    );
  };

  /* ==========================================
     1. レベル選択画面 (select_level)
     ========================================== */
  if (phase === 'select_level') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.selectHeader}>
            <Text style={styles.selectWelcome}>Part 6 ・ Text Completion</Text>
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
      { value: 1, label: '1文書 (4問)' },
      { value: 2, label: '2文書 (8問)' },
      { value: 4, label: '4文書 (16問)' },
    ];

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.selectHeader}>
            <Text style={styles.selectWelcome}>Part 6 ・ Text Completion</Text>
            <Text style={styles.selectTitle}>問題数を選択</Text>
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

  const activeQuestion = passage.questions.find(
    (q) => Number(q.question_number) === Number(activeBlank)
  );

  const totalBlanks = passage.questions.length;

  /* ==========================================
     A. Quiz Screen (quiz)
     ========================================== */
  if (phase === 'quiz') {
    const currentSelected = answers[activeBlank];
    const isCorrect = currentSelected === activeQuestion.correct_answer;
    const isCurrentBlankSubmitted = submittedBlanks[activeBlank];

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
              <TouchableOpacity
                onPress={() => setPhase('select_level')}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Menu</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* Bookmark Button */}
                <TouchableOpacity
                  onPress={() => handleToggleBookmark(activeBlank)}
                  style={styles.reportIconButton}
                >
                  <Ionicons
                    name={bookmarkedIds.has(`${passage.passage_id}_${activeBlank}`) ? 'bookmark' : 'bookmark-outline'}
                    size={22}
                    color="#378F8F"
                  />
                </TouchableOpacity>

                {/* Report Button */}
                <TouchableOpacity
                  onPress={() => {
                    setReportData({
                      questionId: `${passage.passage_id}_blank_${activeBlank}`,
                      questionType: 'Part 6',
                      questionText: `【ジャンル】: ${passage.genre || 'No Genre'}\n【空所番号】: [${activeBlank}]\n【本文】: ${passage.passage_text}`,
                    });
                    setReportModalVisible(true);
                  }}
                  style={styles.reportIconButton}
                >
                  <Ionicons name="alert-circle-outline" size={24} color="#CC2534" />
                </TouchableOpacity>
              </View>

              <Text style={styles.headerBadge}>Part 6 ・ Text Completion</Text>
            </View>
            <Text style={styles.headerTitle}>{passage.genre || 'Passage'}</Text>
          </View>

          {/* Passage Card */}
          <View style={styles.passageCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.passageHeader}>
                Read the passage and select the most appropriate option for blanks [1] to [4].
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.idBadge}>長文ID: {passage.passage_id}</Text>
              <Text style={styles.idBadge}>設問ID: {passage.passage_id}_blank_{activeBlank}</Text>
            </View>
            <View style={styles.passageDivider} />
            {renderPassage()}
          </View>

          {/* Question Options Area */}
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.activeNumberCircle}>
                <Text style={styles.activeNumberText}>{activeBlank}</Text>
              </View>
              <Text style={styles.questionTitle}>Options for Blank [{activeBlank}]</Text>
              {isCurrentBlankSubmitted && (
                <Text
                  style={[
                    styles.resultBadge,
                    isCorrect ? styles.resultBadgeCorrect : styles.resultBadgeWrong,
                  ]}
                >
                  {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                </Text>
              )}
            </View>

            {/* Options List */}
            <View style={styles.optionsContainer}>
              {['A', 'B', 'C', 'D'].map((key, idx) => {
                const optText = activeQuestion.options[key];
                const isOptSelected = currentSelected === key;
                const isOptCorrect = key === activeQuestion.correct_answer;

                let btnStyle = styles.optButton;
                let labelStyle = styles.optLabelBg;
                let labelContent = key;
                let optTextStyle = styles.optText;
                let shadowColor = '#1C1C1E';

                if (isCurrentBlankSubmitted) {
                  if (isOptCorrect) {
                    btnStyle = [styles.optButton, styles.optCorrect];
                    labelStyle = [styles.optLabelBg, styles.labelCorrect];
                    optTextStyle = [styles.optText, styles.optTextCorrect];
                    labelContent = '✓';
                    shadowColor = '#1C1C1E';
                  } else if (isOptSelected && !isCorrect) {
                    btnStyle = [styles.optButton, styles.optWrong];
                    labelStyle = [styles.optLabelBg, styles.labelWrong];
                    optTextStyle = [styles.optText, styles.optTextWrong];
                    labelContent = '✗';
                    shadowColor = '#1C1C1E';
                  } else {
                    btnStyle = [styles.optButton, styles.optDisabled];
                    labelStyle = [styles.optLabelBg, styles.labelDisabled];
                    optTextStyle = [styles.optText, styles.optTextDisabled];
                    shadowColor = '#DFD8CC';
                  }
                } else if (isOptSelected) {
                  btnStyle = [styles.optButton, styles.optSelected];
                  labelStyle = [styles.optLabelBg, styles.labelSelected];
                  optTextStyle = [styles.optText, styles.optTextSelected];
                }

                return (
                  <NeoButton
                    key={idx}
                    onPress={() => handleSelectOption(key)}
                    disabled={isCurrentBlankSubmitted}
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
            {isCurrentBlankSubmitted && (
              <View style={styles.explanationBox}>
                <Text style={styles.expHeader}>Explanation</Text>
                <Text style={styles.expText}>{activeQuestion.explanation}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Navigation Footer */}
        {isCurrentBlankSubmitted && (
          <View style={styles.footer}>
            <NeoButton
              onPress={handleNextBlank}
              btnStyle={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {Number(activeBlank) >= totalBlanks
                  ? (currentPassageIndex + 1 < passages.length ? 'Next Passage' : 'Show Results')
                  : 'Next Blank'}
              </Text>
            </NeoButton>
          </View>
        )}
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
  const totalCount = quizResults.length;
  const correctCount = quizResults.filter((r) => r.correct).length;
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

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
            {scorePercent === 100 ? 'PERFECT!' : scorePercent >= 75 ? 'GREAT JOB!' : 'KEEP GOING!'}
          </Text>
          <Text style={styles.evaluationSub}>
            Correct: {correctCount} / {totalCount} Blanks
          </Text>
        </View>

        {/* Review List (Keep explanations in Japanese) */}
        <Text style={styles.reviewHeader}>Explanations & Review</Text>
        <View style={styles.reviewList}>
          {passages.map((p, pIdx) => (
            <View key={p.passage_id || pIdx} style={[styles.reviewCard, { marginBottom: 20 }]}>
              <Text style={[styles.reviewHeader, { marginTop: 0, fontSize: 15 }]}>
                文書 {pIdx + 1}: {p.genre} (ID: {p.passage_id})
              </Text>
              
              {/* 本文表示 */}
              <View style={[styles.explanationBox, { marginTop: 8, marginBottom: 12, backgroundColor: '#FFFFFF' }]}>
                <Text style={styles.expHeader}>本文 (Passage)</Text>
                <Text style={[styles.reviewExpText, { fontSize: 13, lineHeight: 22, color: '#1C1C1E' }]}>
                  {p.passage_text}
                </Text>
                <View style={styles.reviewDivider} />
                <Text style={styles.expHeader}>和訳 (Translation)</Text>
                <Text style={[styles.reviewExpText, { fontSize: 12, lineHeight: 20 }]}>
                  {p.passage_translation}
                </Text>
              </View>

              {/* 各小問の解説 */}
              <View style={{ gap: 12 }}>
                {p.questions.map((q) => {
                  const res = quizResults.find(
                    (r) => r.passageId === p.passage_id && Number(r.questionNumber) === Number(q.question_number)
                  );
                  const isCorrect = res ? res.correct : false;
                  const userAns = res ? res.selected : '未解答';

                  return (
                    <View key={q.question_number} style={styles.reviewAnswersContainer}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            style={[
                              styles.resultBadge,
                              isCorrect ? styles.resultBadgeCorrect : styles.resultBadgeWrong,
                            ]}
                          >
                            {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                          </Text>
                          <Text style={styles.reviewTypeBadge}>Blank [{q.question_number}]</Text>
                        </View>

                        {/* Bookmark Button in Review */}
                        <TouchableOpacity
                          onPress={() => handleToggleBookmark(q.question_number)}
                          style={{ padding: 4 }}
                        >
                          <Ionicons
                            name={bookmarkedIds.has(`${p.passage_id}_${q.question_number}`) ? 'bookmark' : 'bookmark-outline'}
                            size={18}
                            color="#378F8F"
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.answerRowText}>
                        Your Answer: <Text style={isCorrect ? styles.textCorrect : styles.textWrong}>{userAns}</Text>
                      </Text>
                      <Text style={styles.answerRowText}>
                        Correct Answer: <Text style={styles.textCorrect}>{q.correct_answer} ({q.options[q.correct_answer]})</Text>
                      </Text>

                      <View style={styles.reviewDivider} />
                      <Text style={styles.reviewExpTextHeader}>Explanation</Text>
                      <Text style={styles.reviewExpText}>{q.explanation}</Text>

                      {q.options_explanations && (
                        <>
                          <View style={styles.reviewDivider} />
                          <Text style={styles.reviewExpTextHeader}>選択肢の解説</Text>
                          {['A', 'B', 'C', 'D'].map((optKey) => (
                            <Text key={optKey} style={[styles.reviewExpText, { fontSize: 11, marginTop: 2 }]}>
                              <Text style={{ fontWeight: 'bold' }}>{optKey}:</Text> {q.options_explanations[optKey]}
                            </Text>
                          ))}
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.resultActions}>
          <NeoButton
            onPress={() => setPhase('select_level')}
            btnStyle={styles.primaryActionBtn}
          >
            <Text style={styles.primaryActionBtnText}>もう一度解く</Text>
          </NeoButton>
          <NeoButton
            onPress={onBackPortal}
            btnStyle={styles.secondaryActionBtn}
          >
            <Text style={styles.secondaryActionBtnText}>ダッシュボードに戻る</Text>
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
    paddingTop: Platform.OS === 'ios' ? 24 : 16, // リーディング基準の上部安全余白に統一
    marginBottom: 16,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#DFD8CC',
    color: '#7C756B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    fontFamily: 'DMSans-Bold',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    marginTop: 6,
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
  passageHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    lineHeight: 16,
    fontFamily: 'DMSans-Bold',
  },
  passageDivider: {
    height: 0.5,
    backgroundColor: '#DFD8CC',
    marginVertical: 12,
  },
  passageText: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 30,
    fontWeight: '600',
    fontFamily: 'DMSans-Regular',
  },
  /* Inline Blank Buttons */
  blankButton: {
    backgroundColor: '#DFD8CC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderBottomWidth: 4, // 立体感
  },
  blankButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  blankActive: {
    backgroundColor: '#EBE5D8',
    borderColor: '#378F8F',
  },
  blankTextActive: {
    color: '#1C1C1E',
  },
  blankSelected: {
    backgroundColor: '#EBE5D8',
    borderColor: '#7C756B',
  },
  blankTextSelected: {
    color: '#7C756B',
  },
  blankCorrect: {
    backgroundColor: '#93C1C1',
    borderColor: '#378F8F',
  },
  blankWrong: {
    backgroundColor: '#E88B8B',
    borderColor: '#CC2534',
  },
  blankTextWhite: {
    color: '#FFFFFF',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  activeNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  questionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
    flex: 1,
    fontFamily: 'DMSans-Regular',
  },
  resultBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
  },
  resultBadgeCorrect: {
    backgroundColor: '#378F8F',
    color: '#FFFFFF',
  },
  resultBadgeWrong: {
    backgroundColor: '#CC2534',
    color: '#FFFFFF',
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
    marginTop: 20,
  },
  expHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: 'MonaSans-Bold',
  },
  expText: {
    fontSize: 12,
    color: '#7C756B',
    lineHeight: 18,
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
  badgeWrong: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#CC2534',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
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
  secondaryActionBtn: {
    backgroundColor: '#EBE5D8',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    width: '100%',
  },
  secondaryActionBtnText: {
    color: '#7C756B',
    fontSize: 15,
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
});
