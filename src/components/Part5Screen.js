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
import rawPart5Data from '../data/toeic_part5.json';
import NeoButton from './NeoButton';
import { loadUserStats, saveUserStats, updatePartStats } from '../utils/statsHandler';
import ErrorReportModal from './ErrorReportModal';

// 問題タイプの定義
const QUESTION_TYPES = [
  { key: 'all', label: 'すべて (All)', count: rawPart5Data.length },
  { key: '語彙問題 (Vocabulary)', label: '語彙問題 (Vocabulary)', count: rawPart5Data.filter(q => q.question_type === '語彙問題 (Vocabulary)').length },
  { key: '品詞問題 (Part of Speech)', label: '品詞問題 (Part of Speech)', count: rawPart5Data.filter(q => q.question_type === '品詞問題 (Part of Speech)').length },
  { key: '動詞問題 (Verb - Tense/Voice)', label: '動詞・時制問題 (Verb / Tense)', count: rawPart5Data.filter(q => q.question_type === '動詞問題 (Verb - Tense/Voice)').length },
  { key: '接続詞問題 (Conjunction)', label: '接続詞問題 (Conjunction)', count: rawPart5Data.filter(q => q.question_type === '接続詞問題 (Conjunction)').length },
  { key: '前置詞問題 (Preposition)', label: '前置詞問題 (Preposition)', count: rawPart5Data.filter(q => q.question_type === '前置詞問題 (Preposition)').length },
  { key: '副詞問題 (Adverb)', label: '副詞問題 (Adverb)', count: rawPart5Data.filter(q => q.question_type === '副詞問題 (Adverb)').length },
  { key: '代名詞問題 (Pronoun - Case)', label: '代名詞問題 (Pronoun)', count: rawPart5Data.filter(q => q.question_type === '代名詞問題 (Pronoun - Case)').length },
];

export default function Part5Screen({ onBackPortal }) {
  const quizStartTimeRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [phase, setPhase] = useState('select_type'); // select_type | select_count | quiz | result
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCount, setSelectedCount] = useState(10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState([]);

  // 問題報告用ステート
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportData, setReportData] = useState(null);

  // 問題数選択肢の動的取得
  // 指定されたタイプと問題数でランダム抽出
  useEffect(() => {
    if (phase === 'quiz') {
      let filtered = [...rawPart5Data];
      if (selectedType !== 'all') {
        filtered = rawPart5Data.filter((q) => q.question_type === selectedType);
      }
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      const actualCount = Math.min(selectedCount, filtered.length);
      setQuestions(shuffled.slice(0, actualCount));
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsSubmitted(false);
      setQuizResults([]);
      quizStartTimeRef.current = Date.now();
    }
  }, [phase, selectedType, selectedCount]);

  const handleSelectOption = (opt) => {
    if (isSubmitted) return;
    setSelectedOption(opt);
    setIsSubmitted(true);

    const currentQuestion = questions[currentIndex];
    const isCorrect = opt === currentQuestion.answer;

    setQuizResults((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        correct: isCorrect,
        selected: opt,
        answer: currentQuestion.answer,
      },
    ]);
  };

  const savePart5Results = async (results) => {
    try {
      const correctCount = results.filter((r) => r.correct).length;
      const elapsedSec = quizStartTimeRef.current ? Math.round((Date.now() - quizStartTimeRef.current) / 1000) : 0;
      const stats = await loadUserStats();
      const typeLabel = QUESTION_TYPES.find((t) => t.key === selectedType)?.label || 'すべて';
      const testName = `Part 5 (${typeLabel} ${results.length}問)`;
      const updated = updatePartStats(stats, 'part5', correctCount, results.length, elapsedSec, testName);
      await saveUserStats(updated);
    } catch (e) {
      console.error('Failed to save Part 5 stats:', e);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      savePart5Results(quizResults);
      setPhase('result');
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    }
  };

  /* ==========================================
     1. 問題タイプ選択画面 (select_type)
     ========================================== */
  if (phase === 'select_type') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.selectHeader}>
            <Text style={styles.selectWelcome}>Part 5 ・ Sentence Completion</Text>
            <Text style={styles.selectTitle}>問題タイプを選択</Text>
          </View>
          
          <View style={styles.typeListContainer}>
            {QUESTION_TYPES.map((type) => (
              <NeoButton
                key={type.key}
                onPress={() => {
                  setSelectedType(type.key);
                  setPhase('select_count');
                }}
                btnStyle={styles.typeBtn}
              >
                <View style={styles.typeBtnContent}>
                  <Text style={styles.typeBtnLabel}>{type.label}</Text>
                  <Text style={styles.typeBtnCount}>{type.count}問</Text>
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
    const total = selectedType === 'all'
      ? rawPart5Data.length
      : rawPart5Data.filter((q) => q.question_type === selectedType).length;
    const typeLabel = QUESTION_TYPES.find(t => t.key === selectedType)?.label || selectedType;
    
    const countOptions = [
      { value: 5, label: '5問' },
      { value: 10, label: '10問' },
      { value: 20, label: '20問' },
      { value: total, label: `Custom (全${total}問)` },
    ];

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.selectHeader}>
            <Text style={styles.selectWelcome}>Part 5 ・ Sentence Completion</Text>
            <Text style={styles.selectTitle}>問題数を選択</Text>
            <Text style={styles.selectSubtitle}>
              タイプ: {typeLabel} ({total}問中)
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
            onPress={() => setPhase('select_type')}
            btnStyle={styles.backBtn}
          >
            <Text style={styles.backBtnText}>タイプ選択に戻る</Text>
          </NeoButton>
        </View>
      </View>
    );
  }

  /* ==========================================
     Loading Screen (quiz)
     ========================================== */
  if (phase === 'quiz' && questions.length === 0) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#93C1C1" />
        <Text style={styles.loadingText}>Loading Questions...</Text>
      </View>
    );
  }

  /* ==========================================
     A. Quiz Screen (quiz)
     ========================================== */
  if (phase === 'quiz') {
    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedOption === currentQuestion.answer;
    const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setPhase('select_type')}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Menu</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setReportData({
                  questionId: currentQuestion.id,
                  questionType: 'Part 5',
                  questionText: currentQuestion.question,
                });
                setReportModalVisible(true);
              }}
              style={styles.reportIconButton}
            >
              <Ionicons name="alert-circle-outline" size={24} color="#CC2534" />
            </TouchableOpacity>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.headerBadge}>Part 5 ・ Sentence Completion</Text>
              <Text style={styles.progressText}>
                Q {currentIndex + 1} / {questions.length}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {currentQuestion.question_type && (
                  <Text style={styles.typeBadge}>
                    {currentQuestion.question_type}
                  </Text>
                )}
                <Text style={styles.idBadge}>
                  ID: {currentQuestion.id}
                </Text>
              </View>
              {isSubmitted && (
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
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          {/* Options List */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((opt, idx) => {
              const isOptSelected = selectedOption === opt;
              const isOptCorrect = opt === currentQuestion.answer;

              let btnStyle = styles.optButton;
              let labelStyle = styles.optLabelBg;
              let labelContent = String.fromCharCode(65 + idx);
              let optTextStyle = styles.optText;
              let shadowColor = '#1C1C1E';

              if (isSubmitted) {
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
                  onPress={() => handleSelectOption(opt)}
                  disabled={isSubmitted}
                  btnStyle={btnStyle}
                  shadowColor={shadowColor}
                >
                  <View style={styles.optBtnInner}>
                    <View style={labelStyle}>
                      <Text style={styles.optLabelText}>{labelContent}</Text>
                    </View>
                    <Text style={optTextStyle}>{opt}</Text>
                  </View>
                </NeoButton>
              );
            })}
          </View>

          {/* Explanations (Keep Japanese translations & explanations) */}
          {isSubmitted && (
            <View style={styles.explanationCard}>
              <View style={styles.expSection}>
                <Text style={styles.expSectionHeader}>Translation</Text>
                <Text style={styles.expText}>{currentQuestion.meaning}</Text>
              </View>

              <View style={styles.expSectionLast}>
                <Text style={styles.expSectionHeader}>Explanation</Text>
                <Text style={styles.expText}>{currentQuestion.explanation}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {isSubmitted && (
            <NeoButton
              onPress={handleNextQuestion}
              btnStyle={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {currentIndex + 1 >= questions.length ? 'Show Results' : 'Next'}
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
  const totalQuestions = questions.length;
  const correctCount = quizResults.filter((r) => r.correct).length;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);

  const getEvaluation = () => {
    if (scorePercent === 100) return { title: 'PERFECT!', sub: "Amazing! You've mastered Part 5 grammar." };
    if (scorePercent >= 80) return { title: 'EXCELLENT!', sub: 'You have strong grammar and vocabulary skills.' };
    if (scorePercent >= 60) return { title: 'GOOD JOB!', sub: 'Nice score. Review the questions you missed.' };
    if (scorePercent >= 40) return { title: 'KEEP GOING!', sub: 'Review grammar rules and try again.' };
    return { title: 'TRY AGAIN', sub: 'Read explanations carefully and build your foundation.' };
  };

  const evalInfo = getEvaluation();

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
          <Text style={styles.evaluationTitle}>{evalInfo.title}</Text>
          <Text style={styles.evaluationSub}>{evalInfo.sub}</Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statsBox}>
            <Text style={styles.statsLabel}>Questions</Text>
            <Text style={styles.statsValue}>{totalQuestions}</Text>
          </View>
          <View style={styles.statsBox}>
            <Text style={styles.statsLabel}>Correct</Text>
            <Text style={[styles.statsValue, styles.statsValueCorrect]}>
              {correctCount}
            </Text>
          </View>
        </View>

        {/* Review List (Keep explanations in Japanese) */}
        <Text style={styles.reviewHeader}>Review Incorrect Questions</Text>
        {quizResults.some((r) => !r.correct) ? (
          <View style={styles.reviewList}>
            {questions.map((q, idx) => {
              const res = quizResults.find((r) => r.questionId === q.id);
              if (!res || res.correct) return null;

              return (
                <View key={idx} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <Text style={styles.badgeWrong}>Incorrect ✗</Text>
                    {q.question_type && (
                      <Text style={styles.reviewTypeBadge}>{q.question_type}</Text>
                    )}
                  </View>

                  <Text style={styles.reviewQuestionText}>{q.question}</Text>

                  <View style={styles.reviewAnswersContainer}>
                    <Text style={styles.answerRowText}>
                      Your Answer: <Text style={styles.textWrong}>{res.selected}</Text>
                    </Text>
                    <Text style={styles.answerRowText}>
                      Correct Answer: <Text style={styles.textCorrect}>{res.answer}</Text>
                    </Text>
                    <View style={styles.reviewDivider} />
                    <Text style={styles.reviewExpTextHeader}>Explanation</Text>
                    <Text style={styles.reviewExpText}>{q.explanation}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.perfectCard}>
            <Text style={styles.perfectText}>Perfect! You got all questions correct!</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.resultActions}>
          <NeoButton
            onPress={() => setPhase('quiz')}
            btnStyle={styles.primaryActionBtn}
          >
            <Text style={styles.primaryActionBtnText}>Try Again</Text>
          </NeoButton>

          <NeoButton
            onPress={() => setPhase('select_type')}
            btnStyle={styles.secondaryActionBtn}
          >
            <Text style={styles.secondaryActionBtnText}>別のタイプを選ぶ</Text>
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
  headerBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#DFD8CC',
    color: '#7C756B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#DFD8CC',
    color: '#7C756B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
  },
  resultBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  resultBadgeCorrect: {
    backgroundColor: '#378F8F',
    color: '#FFFFFF',
  },
  resultBadgeWrong: {
    backgroundColor: '#CC2534',
    color: '#FFFFFF',
  },
  questionText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1C1C1E',
    lineHeight: 26,
    fontFamily: 'DMSans-Regular',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 0, // NeoButtonがパディングを持つため
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
    borderColor: '#1C1C1E',
    backgroundColor: 'rgba(55, 143, 143, 0.15)',
  },
  labelCorrect: {
    backgroundColor: '#378F8F',
  },
  optTextCorrect: {
    color: '#1C1C1E',
  },
  optWrong: {
    borderColor: '#1C1C1E',
    backgroundColor: 'rgba(204, 37, 52, 0.15)',
  },
  labelWrong: {
    backgroundColor: '#CC2534',
  },
  optTextWrong: {
    color: '#CC2534',
  },
  optDisabled: {
    borderColor: '#DFD8CC',
    backgroundColor: '#FFFFFF',
  },
  labelDisabled: {
    backgroundColor: '#DFD8CC',
    opacity: 0.5,
  },
  optTextDisabled: {
    color: '#7C756B',
    opacity: 0.5,
  },
  /* Explanation Card */
  explanationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    marginBottom: 12,
  },
  expSection: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 16,
    marginBottom: 16,
  },
  expSectionLast: {
    paddingBottom: 0,
  },
  expSectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: 'MonaSans-Bold',
  },
  expText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 20,
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statsBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: 'MonaSans-Bold',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  statsValueCorrect: {
    color: '#378F8F',
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
  reviewQuestionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: 'DMSans-Regular',
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
  perfectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  perfectText: {
    fontSize: 13,
    color: '#7C756B',
    fontWeight: 'bold',
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
  /* Select Screen Styles */
  selectHeader: {
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 24 : 16, // リーディング基準の上部安全余白に統一
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
});
