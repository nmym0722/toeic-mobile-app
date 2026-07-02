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
import rawPart6Data from '../data/toeic_part6.json';
import NeoButton from './NeoButton';
import { loadUserStats, saveUserStats, updatePartStats } from '../utils/statsHandler';

export default function Part6Screen({ onBackPortal }) {
  const quizStartTimeRef = useRef(null);
  const [passage, setPassage] = useState(null);
  const [activeBlank, setActiveBlank] = useState('1'); // 現在アクティブな空所ID ("1"〜"4")
  const [answers, setAnswers] = useState({}); // { "1": "選択肢", ... }
  const [submittedBlanks, setSubmittedBlanks] = useState({}); // { "1": true, ... }
  const [phase, setPhase] = useState('quiz'); // quiz | result

  const loadPassage = () => {
    const randomPassage = rawPart6Data[Math.floor(Math.random() * rawPart6Data.length)];
    setPassage(randomPassage);
    setActiveBlank('1');
    setAnswers({});
    setSubmittedBlanks({});
    setPhase('quiz');
    quizStartTimeRef.current = Date.now();
  };

  useEffect(() => {
    loadPassage();
  }, []);

  const handleSelectOption = (option) => {
    if (submittedBlanks[activeBlank]) return;
    setAnswers((prev) => ({ ...prev, [activeBlank]: option }));
    setSubmittedBlanks((prev) => ({ ...prev, [activeBlank]: true }));
  };

  const savePart6Results = async () => {
    if (!passage) return;
    try {
      let correctCount = 0;
      passage.questions.forEach((q) => {
        if (answers[q.id] === q.answer) {
          correctCount++;
        }
      });
      const elapsedSec = quizStartTimeRef.current ? Math.round((Date.now() - quizStartTimeRef.current) / 1000) : 0;
      const stats = await loadUserStats();
      const testName = `Part 6 長文穴埋め (${passage.questions.length}問)`;
      const updated = updatePartStats(stats, 'part6', correctCount, passage.questions.length, elapsedSec, testName);
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
      const allDone = passage.questions.every((q) => submittedBlanks[String(q.id)]);
      if (allDone) {
        savePart6Results();
        setPhase('result');
      } else {
        const uncompleted = passage.questions.find((q) => !submittedBlanks[String(q.id)]);
        if (uncompleted) {
          setActiveBlank(String(uncompleted.id));
        } else {
          savePart6Results();
          setPhase('result');
        }
      }
    }
  };

  // 本文をパースし、空欄部分 [1]〜[4] をReact Nativeのインタラクティブなインラインボタンに変換
  const renderPassage = () => {
    if (!passage) return null;

    let cleanTemplate = passage.passage_template.replace(/<[^>]*>/g, '');
    
    // プレースホルダーの補完
    passage.questions.forEach((q) => {
      const idPattern = new RegExp(`\\[${q.id}\\]|___${q.id}___|__${q.id}__`);
      if (!idPattern.test(cleanTemplate)) {
        cleanTemplate += ` [${q.id}]`;
      }
    });

    const parts = cleanTemplate.split(/(\\n|\[\d+\]|___\[\d+\]___|__\[\d+\]__)/g);

    return (
      <Text style={styles.passageText}>
        {parts.map((part, idx) => {
          if (part === '\\n') {
            return '\n\n';
          }

          const blankMatch = part.match(/\[(\d+)\]/);
          if (blankMatch) {
            const qId = blankMatch[1];
            const q = passage.questions.find((item) => Number(item.id) === Number(qId));
            const selected = answers[qId];
            const isBlankSubmitted = submittedBlanks[qId];

            let btnStyle = styles.blankButton;
            let btnTextStyle = styles.blankButtonText;

            if (isBlankSubmitted) {
              const isCorrect = selected === q.answer;
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

  if (!passage) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#93C1C1" />
        <Text style={styles.loadingText}>Loading Passage...</Text>
      </View>
    );
  }

  const activeQuestion = passage.questions.find(
    (q) => Number(q.id) === Number(activeBlank)
  );

  const totalBlanks = passage.questions.length;

  /* ==========================================
     A. Quiz Screen (quiz)
     ========================================== */
  if (phase === 'quiz') {
    const currentSelected = answers[activeBlank];
    const isCorrect = currentSelected === activeQuestion.answer;
    const isCurrentBlankSubmitted = submittedBlanks[activeBlank];

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
              <TouchableOpacity
                onPress={onBackPortal}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Menu</Text>
              </TouchableOpacity>
              <Text style={styles.headerBadge}>Part 6 ・ Text Completion</Text>
            </View>
            <Text style={styles.headerTitle}>{passage.title || 'Passage'}</Text>
          </View>

          {/* Passage Card */}
          <View style={styles.passageCard}>
            <Text style={styles.passageHeader}>
              Read the passage and select the most appropriate option for blanks [1] to [4].
            </Text>
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
              {activeQuestion.options.map((opt, idx) => {
                const isOptSelected = currentSelected === opt;
                const isOptCorrect = opt === activeQuestion.answer;

                let btnStyle = styles.optButton;
                let labelStyle = styles.optLabelBg;
                let labelContent = String.fromCharCode(65 + idx);
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
                    onPress={() => handleSelectOption(opt)}
                    disabled={isCurrentBlankSubmitted}
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
                {Number(activeBlank) >= totalBlanks ? 'Show Results' : 'Next Blank'}
              </Text>
            </NeoButton>
          </View>
        )}
      </View>
    );
  }

  /* ==========================================
     B. Results Screen (result)
     ========================================== */
  const correctCount = passage.questions.filter(
    (q) => answers[String(q.id)] === q.answer
  ).length;
  const scorePercent = Math.round((correctCount / totalBlanks) * 100);

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
            Correct: {correctCount} / {totalBlanks} Blanks
          </Text>
        </View>

        {/* Review List (Keep explanations in Japanese) */}
        <Text style={styles.reviewHeader}>Explanations & Review</Text>
        <View style={styles.reviewList}>
          {passage.questions.map((q) => {
            const qId = String(q.id);
            const userAns = answers[qId];
            const isCorrect = userAns === q.answer;

            return (
              <View key={qId} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Text
                    style={[
                      styles.resultBadge,
                      isCorrect ? styles.resultBadgeCorrect : styles.resultBadgeWrong,
                    ]}
                  >
                    {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                  </Text>
                  <Text style={styles.reviewTypeBadge}>Blank [{qId}]</Text>
                </View>

                <View style={styles.reviewAnswersContainer}>
                  <Text style={styles.answerRowText}>
                    Your Answer: <Text style={isCorrect ? styles.textCorrect : styles.textWrong}>{userAns || 'Unanswered'}</Text>
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
});
