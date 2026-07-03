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
import rawPart7Data from '../data/toeic_part7.json';
import NeoButton from './NeoButton';
import { loadUserStats, saveUserStats, updatePartStats } from '../utils/statsHandler';
import ErrorReportModal from './ErrorReportModal';

export default function Part7Screen({ onBackPortal }) {
  const quizStartTimeRef = useRef(null);
  const [passage, setPassage] = useState(null);
  const [phase, setPhase] = useState('quiz'); // quiz | result
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState([]);

  // 問題報告用ステート
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportData, setReportData] = useState(null);

  const loadPassage = () => {
    const randomPassage = rawPart7Data[Math.floor(Math.random() * rawPart7Data.length)];
    setPassage(randomPassage);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setQuizResults([]);
    setPhase('quiz');
    quizStartTimeRef.current = Date.now();
  };

  useEffect(() => {
    loadPassage();
  }, []);

  const handleSelectOption = (opt) => {
    if (isSubmitted) return;
    setSelectedOption(opt);
    setIsSubmitted(true);

    const currentQuestion = passage.questions[currentQIndex];
    const isCorrect = opt === currentQuestion.answer;

    setQuizResults((prev) => [
      ...prev,
      {
        questionNum: currentQuestion.id,
        correct: isCorrect,
        selected: opt,
        answer: currentQuestion.answer,
      },
    ]);
  };

  const savePart7Results = async (results) => {
    if (!passage) return;
    try {
      const correctCount = results.filter((r) => r.correct).length;
      const elapsedSec = quizStartTimeRef.current ? Math.round((Date.now() - quizStartTimeRef.current) / 1000) : 0;
      const stats = await loadUserStats();
      const testName = `Part 7 長文読解 (${passage.passage_type || 'シングル'} ${results.length}問)`;
      const updated = updatePartStats(stats, 'part7', correctCount, results.length, elapsedSec, testName);
      await saveUserStats(updated);
    } catch (e) {
      console.error('Failed to save Part 7 stats:', e);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 >= passage.questions.length) {
      savePart7Results(quizResults);
      setPhase('result');
    } else {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    }
  };

  if (!passage) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#93C1C1" />
        <Text style={styles.loadingText}>Loading Passage...</Text>
      </View>
    );
  }

  const currentQuestion = passage.questions[currentQIndex];
  const isCorrect = selectedOption === currentQuestion.answer;
  const totalQuestions = passage.questions.length;
  const progress = Math.round(((currentQIndex + 1) / totalQuestions) * 100);

  // 文書タイプアイコン取得
  const getDocIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('email') || t.includes('letter')) return '✉️';
    if (t.includes('article') || t.includes('report')) return '📄';
    if (t.includes('ad') || t.includes('advertisement')) return '📢';
    if (t.includes('chat') || t.includes('message')) return '💬';
    return '📝';
  };

  /* ==========================================
     A. Quiz Screen (quiz)
     ========================================== */
  if (phase === 'quiz') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onBackPortal}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Menu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setReportData({
                  questionId: `${passage.id}_q_${currentQuestion.id}`,
                  questionType: 'Part 7',
                  questionText: `【タイトル】: ${passage.title || 'No Title'}\n【設問】: ${currentQuestion.question_text || 'N/A'}\n【長文本文】: ${passage.passages?.map(p => p.content)?.join('\n')}`,
                });
                setReportModalVisible(true);
              }}
              style={styles.reportIconButton}
            >
              <Ionicons name="alert-circle-outline" size={24} color="#CC2534" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.headerBadgeContainer}>
                <Text style={styles.headerBadge}>
                  {getDocIcon(passage.document_type)} {passage.document_type || 'Reading'}
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

          {/* Passage Card */}
          <View style={styles.passageCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.passageTitle}>{passage.title || 'Reading Comprehension'}</Text>
              <Text style={styles.idBadge}>長文ID: {passage.id}</Text>
            </View>
            {passage.source && (
              <Text style={styles.passageSource}>
                {passage.source} {passage.date ? `· ${passage.date}` : ''}
              </Text>
            )}
            <View style={styles.passageDivider} />

            <View style={styles.passagesContainer}>
              {passage.passages.map((doc, idx) => (
                <View key={idx} style={styles.docParagraph}>
                  {doc.label && <Text style={styles.docLabel}>{doc.label}</Text>}
                  <Text style={styles.docContentText}>
                    {doc.content.replace(/\\n/g, '\n')}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Question Options Card */}
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
                <Text style={styles.questionLabel}>Question {currentQIndex + 1}</Text>
                <Text style={styles.idBadge}>設問ID: {passage.id}_q_{currentQuestion.id}</Text>
              </View>
              <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
              
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
                    labelContent = String.fromCharCode(65 + idx);
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

            {/* Explanation Box (Keep Japanese) */}
            {isSubmitted && (
              <View style={styles.explanationBox}>
                <Text style={styles.expHeader}>Explanation</Text>
                <Text style={styles.expText}>{currentQuestion.explanation}</Text>
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
                {currentQIndex + 1 >= totalQuestions ? 'Show Results' : 'Next'}
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
  const correctCount = quizResults.filter((r) => r.correct).length;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);

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
            Correct: {correctCount} / {totalQuestions} Questions
          </Text>
        </View>

        {/* Review List (Keep explanations in Japanese) */}
        <Text style={styles.reviewHeader}>Explanations & Review</Text>
        <View style={styles.reviewList}>
          {passage.questions.map((q, idx) => {
            const res = quizResults.find((r) => r.questionNum === q.id);
            const isCorrect = res && res.correct;

            return (
              <View key={idx} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Text
                    style={[
                      styles.resultBadge,
                      isCorrect ? styles.resultBadgeCorrect : styles.resultBadgeWrong,
                    ]}
                  >
                    {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                  </Text>
                  <Text style={styles.reviewTypeBadge}>Question {q.id}</Text>
                </View>

                <Text style={styles.reviewQuestionText}>{q.question_text}</Text>

                <View style={styles.reviewAnswersContainer}>
                  <Text style={styles.answerRowText}>
                    Your Answer: <Text style={isCorrect ? styles.textCorrect : styles.textWrong}>{res?.selected || 'Unanswered'}</Text>
                  </Text>
                  {!isCorrect && (
                    <Text style={styles.answerRowText}>
                      Correct Answer: <Text style={styles.textCorrect}>{q.answer}</Text>
                    </Text>
                  )}
                  <View style={styles.reviewDivider} />
                  <Text style={styles.reviewExpTextHeader}>Explanation</Text>
                  <Text style={styles.reviewExpText}>{q.explanation}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.resultActions}>
          <NeoButton
            onPress={loadPassage}
            btnStyle={styles.primaryActionBtn}
          >
            <Text style={styles.primaryActionBtnText}>Next Passage</Text>
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
  headerBadgeContainer: {
    alignSelf: 'flex-start',
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
  },
  passageSource: {
    fontSize: 11,
    color: '#7C756B',
    marginTop: 4,
    fontFamily: 'DMSans-Regular',
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
  docLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 4,
    fontFamily: 'MonaSans-Bold',
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
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 4,
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
});
