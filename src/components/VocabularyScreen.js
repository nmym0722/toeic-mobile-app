import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { getShuffledWords, levelMeta } from '../data/words';
import NeoButton from './NeoButton';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// 音声再生のためのベースURL取得ヘルパー
const getAudioBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return 'http://localhost:8081';
  } else {
    // ネイティブアプリプレビュー (Expo Go)
    const initialUrl = Linking.createURL('/');
    const match = initialUrl.match(/exp:\/\/([^/]+)/);
    if (match) {
      return `http://${match[1]}`;
    }
    const httpMatch = initialUrl.match(/(https?:\/\/[^/]+)/);
    if (httpMatch) {
      return httpMatch[1];
    }
    return 'http://localhost:8081';
  }
};

// 音声再生ヘルパー
const playAudio = async (path) => {
  if (!path) return;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const AUDIO_BASE_URL = getAudioBaseUrl();
  const url = `${AUDIO_BASE_URL}${cleanPath}`;

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (err) {
    console.log('Audio play error:', err);
  }
};

/* ==========================================
   単語カード（タップによるフリップ）
   ========================================== */
function SwipeCard({ wordData, isFlipped, setIsFlipped, autoPlay }) {
  // 自動再生
  useEffect(() => {
    if (autoPlay && wordData && wordData.audio_path) {
      const timer = setTimeout(() => {
        playAudio(wordData.audio_path);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [wordData, autoPlay]);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.95}
      onPress={() => setIsFlipped(!isFlipped)}
    >
      <View style={styles.cardContent}>
        {!isFlipped ? (
          /* ==================== 表面 (FRONT) ==================== */
          <View style={styles.cardSide}>
            <Text style={styles.cardBadge}>
              {wordData.part_of_speech || 'Vocabulary'}
            </Text>
            <Text style={styles.wordText}>{wordData.word}</Text>
            {wordData.phonetic && (
              <Text style={styles.phoneticText}>{wordData.phonetic}</Text>
            )}
            
            {/* 音声再生ボタン */}
            <TouchableOpacity
              style={styles.audioButton}
              onPress={(e) => {
                e.stopPropagation();
                playAudio(wordData.audio_path);
              }}
            >
              <Ionicons name="volume-high-outline" size={24} color="#7C756B" />
            </TouchableOpacity>

            <Text style={styles.revealHint}>タップして意味を表示</Text>
          </View>
        ) : (
          /* ==================== 裏面 (BACK) ==================== */
          <View style={styles.cardSide}>
            <Text style={styles.cardBadgeSuccess}>
              {wordData.part_of_speech || 'Vocabulary'} (意味)
            </Text>
            <Text style={styles.meaningText}>{wordData.meaning}</Text>

            {/* 例文と日本語訳 */}
            {wordData.example_sentence && (
              <View style={styles.exampleContainer}>
                <Text style={styles.exampleText}>
                  {wordData.example_sentence}
                </Text>
                {wordData.example_translation && (
                  <Text style={styles.translationText}>
                    {wordData.example_translation}
                  </Text>
                )}
              </View>
            )}

            {/* 音声再生ボタン */}
            <TouchableOpacity
              style={styles.audioButtonSmall}
              onPress={(e) => {
                e.stopPropagation();
                playAudio(wordData.audio_path);
              }}
            >
              <Ionicons name="volume-high-outline" size={20} color="#7C756B" />
            </TouchableOpacity>

            <Text style={styles.revealHint}>タップして戻す</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ==========================================
   VocabularyScreen メインコンポーネント
   ========================================== */
export default function VocabularyScreen({ onBackPortal }) {
  const navigation = useNavigation();
  const [level, setLevel] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [phase, setPhase] = useState('select'); // select | swipe | test_intro | test | result
  const [selectStep, setSelectStep] = useState(1); // 1: レベル選択 | 2: 問題数選択

  // スワイプタブ切り替えの動的制御（カードスワイプ等のジェスチャー干渉対策）
  useEffect(() => {
    navigation.setOptions({
      swipeEnabled: phase === 'select',
    });
  }, [phase, navigation]);

  const [words, setWords] = useState([]);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [swipeResults, setSwipeResults] = useState({});
  const [isFlipped, setIsFlipped] = useState(false); // カードの反転管理

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [options, setOptions] = useState([]);

  // 単語データのロード
  useEffect(() => {
    if (level !== null && phase === 'swipe') {
      const rawWords = getShuffledWords(level, questionCount);
      setWords(rawWords);
      setSwipeIndex(0);
      setQuizIndex(0);
      setSwipeResults({});
      setQuizResults([]);
      setIsFlipped(false);
    }
  }, [level, phase, questionCount]);

  // 4択テストの選択肢生成
  useEffect(() => {
    if (words.length > 0 && quizIndex < words.length && phase === 'test') {
      const currentWord = words[quizIndex];
      const opts = [...currentWord.options];
      // フィッシャー–イェーツのシャッフル
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      setOptions(opts);
      setSelectedOption(null);
      setIsSubmitted(false);
    }
  }, [words, quizIndex, phase]);

  const handleStart = (scoreLevel, count) => {
    setLevel(scoreLevel);
    setQuestionCount(count);
    setPhase('swipe');
    setSelectStep(1);
  };

  const handleSwipeRight = () => {
    const word = words[swipeIndex];
    setSwipeResults((prev) => ({ ...prev, [word.id]: 'KNOW' }));
    moveToNextSwipe();
  };

  const handleSwipeLeft = () => {
    const word = words[swipeIndex];
    setSwipeResults((prev) => ({ ...prev, [word.id]: 'LEARN' }));
    moveToNextSwipe();
  };

  const moveToNextSwipe = () => {
    setIsFlipped(false);
    if (swipeIndex + 1 >= words.length) {
      setPhase('test_intro');
    } else {
      setSwipeIndex((prev) => prev + 1);
    }
  };

  const handleSelectOption = (opt) => {
    if (isSubmitted) return;
    setSelectedOption(opt);
    setIsSubmitted(true);

    const currentWord = words[quizIndex];
    const isCorrect = opt === currentWord.options[0];

    setQuizResults((prev) => [
      ...prev,
      {
        word: currentWord.word,
        meaning: currentWord.options[0],
        selected: opt,
        correct: isCorrect,
        isLearnSwiped: swipeResults[currentWord.id] === 'LEARN',
      },
    ]);
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 >= words.length) {
      setPhase('result');
    } else {
      setQuizIndex((prev) => prev + 1);
    }
  };

  /* ==========================================
     A. 設定選択画面 (select)
     ========================================== */
  if (phase === 'select') {
    const renderHeader = () => (
      <View style={styles.header}>
        {selectStep === 1 ? (
          <View style={styles.headerRowSpace}>
            <Text style={styles.headerTitle}>Vocabulary</Text>
            <Text style={styles.headerBadge}>Word Bank</Text>
          </View>
        ) : (
          <View style={styles.headerRowSpace}>
            <TouchableOpacity
              onPress={() => setSelectStep(1)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerBadge}>
              Target: {levelMeta[level]?.label}
            </Text>
          </View>
        )}
      </View>
    );

    return (
      <View style={styles.container}>
        {selectStep === 1 ? (
          /* LEVEL SELECT */
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {renderHeader()}
            <View style={styles.titleSection}>
              <Text style={styles.sectionTitle}>Target Score Level</Text>
              <Text style={styles.sectionSubtitle}>
                Select the word level matching your target TOEIC score.
              </Text>
            </View>

            <View style={styles.btnGroup}>
              {Object.entries(levelMeta).map(([score, meta]) => (
                <NeoButton
                  key={score}
                  onPress={() => {
                    setLevel(Number(score));
                    setSelectStep(2);
                  }}
                  btnStyle={styles.levelBtnFront}
                >
                  <View style={styles.levelBtnContent}>
                    <View style={styles.btnLeft}>
                      <Text style={styles.btnLabel}>{meta.label}</Text>
                      <Text style={styles.btnTag}>{meta.description}</Text>
                    </View>
                    <Text style={styles.btnCount}>
                      {meta.wordCount} Words
                    </Text>
                  </View>
                </NeoButton>
              ))}
            </View>
          </ScrollView>
        ) : (
          /* WORD COUNT SELECT */
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {renderHeader()}
            <View style={styles.titleSection}>
              <Text style={styles.sectionTitle}>Number of Words</Text>
              <Text style={styles.sectionSubtitle}>
                Select the number of words to learn.
              </Text>
            </View>

            <View style={styles.btnGroup}>
              {[10, 30, 50].map((count) => (
                <NeoButton
                  key={count}
                  onPress={() => handleStart(level, count)}
                  btnStyle={styles.levelBtnFront}
                >
                  <View style={styles.levelBtnContent}>
                    <Text style={styles.btnLabel}>{count} Words</Text>
                    <Text style={styles.btnCount}>Start →</Text>
                  </View>
                </NeoButton>
              ))}
            </View>
          </ScrollView>
        )}

        {/* CLOSE BUTTON */}
        <View style={styles.closeFooterWrapper}>
          <NeoButton
            onPress={onBackPortal}
            btnStyle={styles.closeFooterBtn}
          >
            <Text style={styles.closeFooterText}>Back to Dashboard</Text>
          </NeoButton>
        </View>
        </View>
    );
  }

  /* ==========================================
     B. Swipe Learning Screen (swipe)
     ========================================== */
  if (phase === 'swipe') {
    const currentWord = words[swipeIndex];
    if (!currentWord) {
      return (
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color="#93C1C1" />
        </View>
      );
    }

    const progress = Math.round(((swipeIndex + 1) / words.length) * 100);

    return (
      <View style={styles.container}>
        {/* PROGRESS HEADER */}
        <View style={styles.progressHeader}>
          <TouchableOpacity
            onPress={() => setPhase('select')}
            style={styles.quitButton}
          >
            <Text style={styles.quitButtonText}>Quit</Text>
          </TouchableOpacity>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>

        {/* MAIN CARD */}
        <View style={styles.cardArea}>
          <SwipeCard
            wordData={currentWord}
            isFlipped={isFlipped}
            setIsFlipped={setIsFlipped}
            autoPlay={true}
          />
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.cardActions}>
          <View style={styles.actionBtnWrapper}>
            <NeoButton
              onPress={handleSwipeLeft}
              btnStyle={[styles.actionBtnFront, styles.btnLearn]}
            >
              <Text style={styles.actionBtnTextLearn}>Learn</Text>
            </NeoButton>
          </View>
          
          <View style={styles.actionBtnWrapper}>
            <NeoButton
              onPress={handleSwipeRight}
              btnStyle={[styles.actionBtnFront, styles.btnKnow]}
            >
              <Text style={styles.actionBtnTextKnow}>Know</Text>
            </NeoButton>
          </View>
        </View>
      </View>
    );
  }

  /* ==========================================
     C. Test Introduction Screen (test_intro)
     ========================================== */
  if (phase === 'test_intro') {
    return (
      <View style={styles.containerCenteredBg}>
        <View style={styles.introCard}>
          <Ionicons name="document-text-outline" size={48} color="#378F8F" style={{ marginBottom: 16 }} />
          <Text style={styles.introTitle}>Confirmation Test</Text>
          <Text style={styles.introDesc}>
            We will start a 4-choice test to check your retention of the sorted words. Are you ready?
          </Text>
          
          <NeoButton
            onPress={() => setPhase('test')}
            btnStyle={styles.introStartBtn}
            style={{ width: '100%' }}
          >
            <Text style={styles.introStartBtnText}>Start Test</Text>
          </NeoButton>
        </View>
      </View>
    );
  }

  /* ==========================================
     D. 4-Choice Test Screen (test)
     ========================================== */
  if (phase === 'test') {
    const currentWord = words[quizIndex];
    if (!currentWord) return null;

    const progress = Math.round(((quizIndex + 1) / words.length) * 100);

    return (
      <View style={styles.container}>
        {/* PROGRESS */}
        <View style={styles.progressHeader}>
          <TouchableOpacity
            onPress={() => setPhase('select')}
            style={styles.quitButton}
          >
            <Text style={styles.quitButtonText}>Quit</Text>
          </TouchableOpacity>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressPercentage}>
            {quizIndex + 1}/{words.length}
          </Text>
        </View>

        {/* QUESTION CARD */}
        <View style={styles.questionCard}>
          <Text style={styles.questionWord}>{currentWord.word}</Text>
          <TouchableOpacity
            style={styles.audioButtonSmallCenter}
            onPress={() => playAudio(currentWord.audio_path)}
          >
            <Ionicons name="volume-high-outline" size={20} color="#7C756B" />
          </TouchableOpacity>
        </View>

        {/* OPTIONS LIST */}
        <ScrollView contentContainerStyle={styles.optionsList}>
          {options.map((opt) => {
            const isCorrectAnswer = opt === currentWord.options[0];
            const isSelected = selectedOption === opt;

            let optBtnStyle = styles.optButton;
            let optTextStyle = styles.optText;
            let shadowColor = '#1C1C1E';

            if (isSubmitted) {
              if (isCorrectAnswer) {
                optBtnStyle = [styles.optButton, styles.optCorrect];
                optTextStyle = [styles.optText, styles.optTextCorrect];
                shadowColor = '#378F8F'; // 正解時は影も緑調
              } else if (isSelected) {
                optBtnStyle = [styles.optButton, styles.optWrong];
                optTextStyle = [styles.optText, styles.optTextWrong];
                shadowColor = '#CC2534'; // 不正解時は影も赤調
              } else {
                optBtnStyle = [styles.optButton, styles.optDisabled];
                optTextStyle = [styles.optText, styles.optTextDisabled];
              }
            } else if (isSelected) {
              optBtnStyle = [styles.optButton, styles.optSelected];
              optTextStyle = [styles.optText, styles.optTextSelected];
            }

            return (
              <NeoButton
                key={opt}
                onPress={() => handleSelectOption(opt)}
                disabled={isSubmitted}
                btnStyle={optBtnStyle}
                shadowColor={shadowColor}
              >
                <Text style={optTextStyle}>{opt}</Text>
              </NeoButton>
            );
          })}
        </ScrollView>

        {/* SUBMIT ACTIONS */}
        <View style={styles.testFooter}>
          {isSubmitted && (
            <NeoButton
              onPress={handleNextQuestion}
              btnStyle={styles.submitBtn}
            >
              <Text style={styles.submitBtnText}>
                {quizIndex + 1 >= words.length ? 'Show Results' : 'Next'}
              </Text>
            </NeoButton>
          )}
        </View>
      </View>
    );
  }

  /* ==========================================
     E. Test Results Screen (result)
     ========================================== */
  if (phase === 'result') {
    const correctCount = quizResults.filter((r) => r.correct).length;
    const score = Math.round((correctCount / words.length) * 100);

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* SCORE CARD */}
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Test Results</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreLabel}>%</Text>
            </View>
            <Text style={styles.resultSummary}>
              Correct: {correctCount} / {words.length} Questions
            </Text>
          </View>

          {/* WORD DETAILS */}
          <Text style={styles.listHeader}>Word Details</Text>
          <View style={styles.listContainer}>
            {quizResults.map((res, i) => (
              <View key={i} style={styles.resultItem}>
                <View style={styles.resultItemLeft}>
                  <Text style={styles.resultItemWord}>{res.word}</Text>
                  <Text style={styles.resultItemMeaning}>{res.meaning}</Text>
                </View>
                <View style={styles.resultItemRight}>
                  {res.correct ? (
                    <Text style={styles.badgeCorrect}>Correct</Text>
                  ) : (
                    <Text style={styles.badgeWrong}>Incorrect</Text>
                  )}
                  {res.isLearnSwiped && (
                    <Text style={styles.badgeReview}>Review</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* FINISH BUTTON */}
          <NeoButton
            onPress={() => setPhase('select')}
            btnStyle={styles.resultFinishBtn}
          >
            <Text style={styles.resultFinishBtnText}>Finish</Text>
          </NeoButton>
        </ScrollView>
      </View>
    );
  }

  return null;
}

/* ==========================================
   スタイルシート (vocabrary-taste.md 準拠)
   ========================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6', // ベージュ背景
    paddingHorizontal: 24,
  },
  containerCentered: {
    flex: 1,
    backgroundColor: '#F3EFE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerCenteredBg: {
    flex: 1,
    backgroundColor: '#F3EFE6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 24 : 16, // リーディング基準の上部安全余白に統一
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    fontFamily: 'MonaSans-Bold',
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#DFD8CC',
    color: '#7C756B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'uppercase',
    fontFamily: 'DMSans-Bold',
  },
  headerRowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 6,
    fontFamily: 'MonaSans-Bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#7C756B',
    lineHeight: 18,
    fontFamily: 'DMSans-Regular',
  },
  btnGroup: {
    gap: 12,
  },
  levelBtnFront: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 16,
    width: '100%',
  },
  levelBtnContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  btnLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  btnLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  btnTag: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#93C1C1',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
  },
  btnCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
  },
  closeFooterWrapper: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#DFD8CC',
    marginTop: 'auto',
    width: '100%',
  },
  closeFooterBtn: {
    width: '100%',
    backgroundColor: '#EBE5D8',
    borderColor: '#1C1C1E',
    borderWidth: 2,
  },
  closeFooterText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  /* スワイプ画面用 */
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 24 : 16, // リーディング基準の上部安全余白に統一
    marginBottom: 12,
    gap: 12,
  },
  quitButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quitButtonText: {
    color: '#7C756B',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'MonaSans-Bold',
  },
  testBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#93C1C1',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#DFD8CC',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#93C1C1',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 24,
  },
  cardSide: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    color: '#7C756B',
    textTransform: 'uppercase',
  },
  cardBadgeSuccess: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    color: '#93C1C1',
    textTransform: 'uppercase',
  },
  wordText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
    fontFamily: 'MonaSans-Bold',
  },
  phoneticText: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#7C756B',
    marginTop: -8,
  },
  audioButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F3EFE6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButtonSmall: {
    width: 40,
    height: 40,
    backgroundColor: '#F3EFE6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButtonSmallCenter: {
    width: 40,
    height: 40,
    backgroundColor: '#DFD8CC',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  audioIcon: {
    fontSize: 18,
  },
  audioIconSmall: {
    fontSize: 15,
  },
  revealHint: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  meaningText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
  exampleContainer: {
    width: '100%',
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  exampleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 16,
    fontFamily: 'DMSans-Regular',
  },
  translationText: {
    fontSize: 10,
    color: '#7C756B',
    marginTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#DFD8CC',
    paddingTop: 6,
    fontFamily: 'DMSans-Regular',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  actionBtnWrapper: {
    flex: 1,
  },
  actionBtnFront: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  btnLearn: {
    backgroundColor: '#EBE5D8',
  },
  btnKnow: {
    backgroundColor: '#93C1C1',
  },
  actionBtnTextLearn: {
    color: '#7C756B',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  actionBtnTextKnow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  /* イントロ画面 */
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  introIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: 'MonaSans-Bold',
  },
  introDesc: {
    fontSize: 14,
    color: '#7C756B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: 'DMSans-Regular',
  },
  introStartBtn: {
    backgroundColor: '#93C1C1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  introStartBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  /* テスト画面 */
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  questionWord: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    fontFamily: 'MonaSans-Bold',
  },
  optionsList: {
    gap: 12,
  },
  optButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  optText: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '600',
    fontFamily: 'DMSans-Regular',
  },
  optSelected: {
    backgroundColor: '#EBE5D8',
    borderColor: '#7C756B',
  },
  optTextSelected: {
    color: '#7C756B',
  },
  optCorrect: {
    backgroundColor: '#93C1C1',
    borderColor: '#93C1C1',
  },
  optTextCorrect: {
    color: '#FFFFFF',
  },
  optWrong: {
    backgroundColor: '#E88B8B',
    borderColor: '#E88B8B',
  },
  optTextWrong: {
    color: '#FFFFFF',
  },
  optDisabled: {
    opacity: 0.5,
  },
  testFooter: {
    marginVertical: 24,
  },
  submitBtn: {
    backgroundColor: '#93C1C1',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#DFD8CC',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  /* 結果画面 */
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16,
    fontFamily: 'MonaSans-Bold',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#93C1C1',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 36,
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
  resultSummary: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
  },
  listHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginVertical: 12,
    fontFamily: 'MonaSans-Bold',
  },
  listContainer: {
    gap: 12,
    marginBottom: 24,
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultItemLeft: {
    flex: 1,
  },
  resultItemWord: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  resultItemMeaning: {
    fontSize: 12,
    color: '#7C756B',
    marginTop: 4,
    fontFamily: 'DMSans-Regular',
  },
  resultItemRight: {
    flexDirection: 'row',
    gap: 8,
  },
  badgeCorrect: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#93C1C1',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeWrong: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#E88B8B',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeReview: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#EBE5D8',
    color: '#7C756B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  resultFinishBtn: {
    backgroundColor: '#93C1C1',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  resultFinishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
});
