import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { loadUserStats, saveUserStats, updatePartStats } from '../utils/statsHandler';
import NeoButton from './NeoButton';
import { useNavigation } from '@react-navigation/native';

// ローカルJSONのロード
import rawPart1Data from '../data/toeic_part1.json';
import rawPart2Data from '../data/toeic_part2.json';
import rawPart3Data from '../data/toeic_part3.json';
import rawPart4Data from '../data/toeic_part4.json';

// 音声再生のためのベースURL取得ヘルパー
const getAudioBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return 'http://localhost:8081';
  } else {
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

export default function ListeningScreen({ onBackPortal }) {
  const navigation = useNavigation();
  const [partId, setPartId] = useState(null); // null (menu) | 1 | 2 | 3 | 4
  const [questions, setQuestions] = useState([]);
  const [phase, setPhase] = useState('menu'); // menu | quiz | result

  // スワイプタブ切り替えの動的制御
  useEffect(() => {
    navigation.setOptions({
      swipeEnabled: phase === 'menu',
    });
  }, [phase, navigation]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 音声再生関連 (expo-av)
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // 解答ステート
  const [selectedOption, setSelectedOption] = useState(null); // Part 1/2 用
  const [selectedOptions, setSelectedOptions] = useState({}); // Part 3/4 用
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState([]);

  // 解答時間計測
  const startTimeRef = useRef(null);

  // 1. パートデータ選択時の初期化
  const startPartQuiz = (id) => {
    let data = [];
    if (id === 1) data = [...rawPart1Data];
    else if (id === 2) data = [...rawPart2Data];
    else if (id === 3) data = [...rawPart3Data];
    else if (id === 4) data = [...rawPart4Data];

    const shuffled = data.sort(() => 0.5 - Math.random());
    const sliceCount = (id === 1 || id === 2) ? 10 : 3;
    const finalQs = shuffled.slice(0, Math.min(sliceCount, data.length));

    setQuestions(finalQs);
    setPartId(id);
    setCurrentIndex(0);
    setSelectedOption(null);
    setSelectedOptions({});
    setIsSubmitted(false);
    setQuizResults([]);
    setPhase('quiz');
    startTimeRef.current = Date.now();
  };

  // 2. 音声のロードとアンロード管理
  useEffect(() => {
    if (phase === 'quiz' && questions.length > 0 && questions[currentIndex]) {
      const currentItem = questions[currentIndex];
      const audioUrl = currentItem.audio_file;
      const baseUrl = getAudioBaseUrl();
      const cleanPath = audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
      loadAudio(`${baseUrl}${cleanPath}`);
    }

    return () => {
      unloadAudio();
    };
  }, [currentIndex, questions, phase]);

  const loadAudio = async (url) => {
    await unloadAudio();

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false, rate: playbackSpeed, shouldCorrectPitch: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
    } catch (error) {
      console.log('Failed to load audio:', error);
    }
  };

  const unloadAudio = async () => {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (err) {
        // すでにアンロードされている場合の例外を無視
      }
      setSound(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
    }
  };

  const togglePlay = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const changeSpeed = async () => {
    const speeds = [1.0, 1.2, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);

    if (sound) {
      await sound.setRateAsync(newSpeed, true);
    }
  };

  const handleSelectOption = async (opt, qNum = null) => {
    if (isSubmitted) return;

    if (partId <= 2) {
      setSelectedOption(opt);
      setIsSubmitted(true);

      const currentItem = questions[currentIndex];
      const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000);
      const isCorrect = opt === currentItem.answer;

      const results = [
        ...quizResults,
        {
          questionId: currentItem.id,
          correct: isCorrect,
          selected: opt,
          answer: currentItem.answer,
          timeSec: elapsedSec,
        },
      ];
      setQuizResults(results);

      if (sound) {
        await sound.pauseAsync();
      }

      // 統計データの非同期更新
      try {
        const stats = await loadUserStats();
        const updated = updatePartStats(stats, `part${partId}`, isCorrect ? 1 : 0, 1, elapsedSec);
        await saveUserStats(updated);
      } catch (err) {
        console.log('Failed to save stats:', err);
      }
    } else {
      setSelectedOptions((prev) => ({
        ...prev,
        [qNum]: opt,
      }));
    }
  };

  const handleSubmitAnswer = async () => {
    if (isSubmitted) return;

    const currentItem = questions[currentIndex];
    const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000);

    if (partId >= 3) {
      if (Object.keys(selectedOptions).length < 3) return;
      setIsSubmitted(true);

      const itemResults = currentItem.questions.map((q) => {
        const sel = selectedOptions[q.id];
        return {
          id: q.id,
          correct: sel === q.answer,
          selected: sel,
          answer: q.answer,
        };
      });

      const results = [
        ...quizResults,
        {
          setId: currentItem.id,
          questions: itemResults,
          timeSec: elapsedSec,
        },
      ];
      setQuizResults(results);

      const correctCount = itemResults.filter((q) => q.correct).length;

      // 統計データの非同期更新
      try {
        const stats = await loadUserStats();
        const updated = updatePartStats(stats, `part${partId}`, correctCount, 3, elapsedSec);
        await saveUserStats(updated);
      } catch (err) {
        console.log('Failed to save stats:', err);
      }
    }

    if (sound) {
      await sound.pauseAsync();
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setSelectedOptions({});
      setIsSubmitted(false);
      startTimeRef.current = Date.now();
    }
  };

  const formatTime = (millis) => {
    if (isNaN(millis) || millis <= 0) return '00:00';
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /* ==========================================
     A. Part Menu Selection (menu)
     ========================================== */
  if (phase === 'menu') {
    const parts = [
      { id: 1, title: 'Part 1: Photographs', desc: 'Listen and select the sentence that best describes the picture.' },
      { id: 2, title: 'Part 2: Question-Response', desc: 'Listen and choose the best response to the question.' },
      { id: 3, title: 'Part 3: Conversations', desc: 'Listen to conversations and answer questions about them.' },
      { id: 4, title: 'Part 4: Talks', desc: 'Listen to talks (announcements/reports) and answer questions.' },
    ];

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuWelcome}>Listening Section</Text>
            <Text style={styles.menuTitle}>🎧 Select Listening Part</Text>
            <Text style={styles.menuDesc}>Practice listening skills for each TOEIC section.</Text>
          </View>

          <View style={styles.menuGrid}>
            {parts.map((p) => (
              <NeoButton
                key={p.id}
                onPress={() => startPartQuiz(p.id)}
                btnStyle={styles.menuBtnFront}
              >
                <View style={styles.menuBtnContent}>
                  <View style={styles.menuBtnHeader}>
                    <Text style={styles.menuBtnTitle}>{p.title}</Text>
                    <Text style={styles.menuBtnBadge}>PART {p.id}</Text>
                  </View>
                  <Text style={styles.menuBtnDesc}>{p.desc}</Text>
                </View>
              </NeoButton>
            ))}
          </View>
        </ScrollView>
        </View>
    );
  }

  /* ==========================================
     B. Quiz Screen (quiz)
     ========================================== */
  if (phase === 'quiz') {
    const currentItem = questions[currentIndex];
    const totalQuestions = questions.length;
    const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                unloadAudio();
                setPhase('menu');
              }}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Menu</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.headerBadge}>Part {partId} ・ Listening</Text>
              <Text style={styles.progressText}>
                {partId <= 2 ? `Q ${currentIndex + 1} / ${totalQuestions}` : `Set ${currentIndex + 1} / ${totalQuestions}`}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>

          {/* Custom Audio Player */}
          <View style={styles.audioPlayerCard}>
            <View style={styles.audioPlayerRow}>
              <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.audioProgressContainer}>
                <View style={styles.progressBarBgSmall}>
                  <View
                    style={[
                      styles.progressBarFillSmall,
                      { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' },
                    ]}
                  />
                </View>
                <View style={styles.audioTimeRow}>
                  <Text style={styles.audioTimeText}>{formatTime(position)}</Text>
                  <Text style={styles.audioTimeText}>{formatTime(duration)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.speedBtn} onPress={changeSpeed} activeOpacity={0.8}>
                <Text style={styles.speedBtnText}>{playbackSpeed.toFixed(1)}x</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Part Specific Media View */}
          {partId === 1 && (
            <View style={styles.mediaCard}>
              <Image
                source={{ uri: currentItem.image_url }}
                style={styles.part1Image}
                resizeMode="cover"
              />
              <Text style={styles.mediaInstruction}>
                Select the option that best describes the photograph.
              </Text>
            </View>
          )}

          {partId === 2 && (
            <View style={styles.mediaCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color="#7C756B" style={{ marginTop: 24, marginBottom: 8 }} />
              <Text style={styles.listeningPrompt}>Listen for the Response</Text>
              <Text style={styles.listeningSubPrompt}>
                No text is displayed. Listen to the audio and select the best response from (A) to (C).
              </Text>
            </View>
          )}

          {partId >= 3 && currentItem.visual_url && (
            <View style={styles.mediaCard}>
              <Text style={styles.visualTitleBadge}>
                {currentItem.visual_title || 'Visual Aid'}
              </Text>
              <Image
                source={{ uri: currentItem.visual_url }}
                style={styles.part3Image}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Quiz Selection Panel */}
          {partId <= 2 ? (
            // Part 1 / Part 2 (3/4 Options)
            <View style={styles.questionCard}>
              <Text style={styles.questionLabel}>Question {currentIndex + 1}</Text>
              <Text style={styles.questionText}>Select the best option.</Text>

              <View style={styles.optionsContainer}>
                {currentItem.options.map((opt, idx) => {
                  const isOptSelected = selectedOption === opt;
                  const isOptCorrect = opt === currentItem.answer;

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
                    } else if (isOptSelected) {
                      btnStyle = [styles.optButton, styles.optWrong];
                      labelStyle = [styles.optLabelBg, styles.labelWrong];
                      optTextStyle = [styles.optText, styles.optTextWrong];
                      labelContent = '✗';
                      shadowColor = '#CC2534';
                    } else {
                      btnStyle = [styles.optButton, styles.optDisabled];
                      labelStyle = [styles.optLabelBg, styles.labelDisabled];
                      optTextStyle = [styles.optText, styles.optTextDisabled];
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
                        <Text style={optTextStyle}>
                          {isSubmitted || partId === 1 ? opt : `Option (${String.fromCharCode(65 + idx)})`}
                        </Text>
                      </View>
                    </NeoButton>
                  );
                })}
              </View>
            </View>
          ) : (
            // Part 3 / Part 4 (3 Question Set)
            <View style={styles.multiQuestionsList}>
              {currentItem.questions.map((q) => {
                const selectedOpt = selectedOptions[q.id];
                const isOptCorrect = selectedOpt === q.answer;

                return (
                  <View key={q.id} style={styles.questionCard}>
                    <Text style={styles.questionLabel}>Question Q{q.id}</Text>
                    <Text style={styles.questionText}>{q.question_text}</Text>

                    <View style={styles.optionsContainer}>
                      {q.options.map((opt, idx) => {
                        const isOptSelected = selectedOpt === opt;
                        const isThisOptCorrect = opt === q.answer;

                        let btnStyle = styles.optButton;
                        let labelStyle = styles.optLabelBg;
                        let labelContent = String.fromCharCode(65 + idx);
                        let optTextStyle = styles.optText;
                        let shadowColor = '#1C1C1E';

                        if (isSubmitted) {
                          if (isThisOptCorrect) {
                            btnStyle = [styles.optButton, styles.optCorrect];
                            labelStyle = [styles.optLabelBg, styles.labelCorrect];
                            optTextStyle = [styles.optText, styles.optTextCorrect];
                            labelContent = '✓';
                            shadowColor = '#378F8F';
                          } else if (isOptSelected) {
                            btnStyle = [styles.optButton, styles.optWrong];
                            labelStyle = [styles.optLabelBg, styles.labelWrong];
                            optTextStyle = [styles.optText, styles.optTextWrong];
                            labelContent = '✗';
                            shadowColor = '#CC2534';
                          } else {
                            btnStyle = [styles.optButton, styles.optDisabled];
                            labelStyle = [styles.optLabelBg, styles.labelDisabled];
                            optTextStyle = [styles.optText, styles.optTextDisabled];
                          }
                        } else if (isOptSelected) {
                          btnStyle = [styles.optButton, styles.optSelected];
                          labelStyle = [styles.optLabelBg, styles.labelSelected];
                          optTextStyle = [styles.optText, styles.optTextSelected];
                        }

                        return (
                          <NeoButton
                            key={idx}
                            onPress={() => handleSelectOption(opt, q.id)}
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
                  </View>
                );
              })}
            </View>
          )}

          {/* Script & Explanation (Keep Japanese translation/explanation text) */}
          {isSubmitted && (
            <View style={styles.explanationCard}>
              <Text style={styles.expSectionTitle}>Script & Translation</Text>

              {partId === 1 && (
                <View style={styles.expScriptBox}>
                  <Text style={styles.scriptTextEnglish}>Correct: {currentItem.answer}</Text>
                  <Text style={styles.scriptTextJapanese}>
                    訳: {currentItem.translation[currentItem.options.indexOf(currentItem.answer)]}
                  </Text>
                </View>
              )}

              {partId === 2 && (
                <View style={styles.expScriptBox}>
                  <Text style={styles.scriptHeader}>Question</Text>
                  <Text style={styles.scriptTextEnglish}>{currentItem.question}</Text>
                  <Text style={styles.scriptTextJapanese}>{currentItem.question_translation}</Text>

                  <Text style={[styles.scriptHeader, { marginTop: 12 }]}>Correct Response</Text>
                  <Text style={styles.scriptTextEnglishCorrect}>{currentItem.answer}</Text>
                  <Text style={styles.scriptTextJapanese}>
                    訳: {currentItem.options_translation[currentItem.options.indexOf(currentItem.answer)]}
                  </Text>
                </View>
              )}

              {partId === 3 && (
                <View style={styles.expScriptBox}>
                  <Text style={styles.scriptHeader}>Dialogue Script</Text>
                  {currentItem.dialogue.map((d, dIdx) => (
                    <View key={dIdx} style={styles.dialogueRow}>
                      <Text style={styles.dialogueEnglish}>
                        <Text style={styles.speakerText}>{d.speaker}:</Text> {d.text}
                      </Text>
                      <Text style={styles.dialogueJapanese}>
                        {currentItem.translation_dialogue[dIdx]?.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {partId === 4 && (
                <View style={styles.expScriptBox}>
                  <Text style={styles.scriptHeader}>Talk Narration</Text>
                  <Text style={styles.scriptTextEnglish}>{currentItem.talk}</Text>
                  <View style={styles.scriptDivider} />
                  <Text style={styles.scriptTextJapanese}>{currentItem.translation_talk}</Text>
                </View>
              )}

              <View style={styles.expDividerLine} />
              <Text style={styles.expSectionTitle}>Explanation</Text>
              {partId <= 2 ? (
                <Text style={styles.expExplanationText}>{currentItem.explanation}</Text>
              ) : (
                <View style={styles.multiExplanations}>
                  {currentItem.questions.map((q) => (
                    <View key={q.id} style={styles.singleExpBox}>
                      <Text style={styles.singleExpTitle}>Q{q.id} (Correct: {q.answer})</Text>
                      <Text style={styles.expExplanationText}>{q.explanation}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer actions */}
        <View style={styles.footer}>
          {partId <= 2 ? (
            isSubmitted && (
              <NeoButton
                onPress={handleNextQuestion}
                btnStyle={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>
                  {currentIndex + 1 >= questions.length ? 'Show Results' : 'Next'}
                </Text>
              </NeoButton>
            )
          ) : (
            !isSubmitted ? (
              <NeoButton
                onPress={handleSubmitAnswer}
                disabled={Object.keys(selectedOptions).length < 3}
                btnStyle={[
                  styles.actionBtn,
                  Object.keys(selectedOptions).length < 3 && styles.actionBtnDisabled,
                ]}
                shadowColor={Object.keys(selectedOptions).length < 3 ? '#DFD8CC' : '#1C1C1E'}
              >
                <Text style={styles.actionBtnText}>Submit Answer</Text>
              </NeoButton>
            ) : (
              <NeoButton
                onPress={handleNextQuestion}
                btnStyle={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>
                  {currentIndex + 1 >= questions.length ? 'Show Results' : 'Next'}
                </Text>
              </NeoButton>
            )
          )}
        </View>
      </View>
    );
  }

  /* ==========================================
     C. Results Screen (result)
     ========================================== */
  const totalQuestionsCount = partId <= 2 ? questions.length : questions.length * 3;
  const correctCount = partId <= 2
    ? quizResults.filter((r) => r.correct).length
    : quizResults.reduce((acc, r) => acc + r.questions.filter((q) => q.correct).length, 0);

  const scorePercent = Math.round((correctCount / totalQuestionsCount) * 100);

  const getEvaluation = () => {
    if (scorePercent === 100) return { title: 'PERFECT!', sub: 'Outstanding! You have excellent listening comprehension.' };
    if (scorePercent >= 80) return { title: 'EXCELLENT!', sub: 'Great listening skills. Keep up the good work.' };
    if (scorePercent >= 60) return { title: 'GOOD JOB!', sub: 'Passed. Check explanations for the details.' };
    if (scorePercent >= 40) return { title: 'KEEP GOING!', sub: 'Keep practicing to catch sound linkages and liaisons.' };
    return { title: 'TRY AGAIN', sub: 'Repeat listening while checking the English script.' };
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

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statsBox}>
            <Text style={styles.statsLabel}>Questions</Text>
            <Text style={styles.statsValue}>{totalQuestionsCount}</Text>
          </View>
          <View style={styles.statsBox}>
            <Text style={styles.statsLabel}>Correct</Text>
            <Text style={[styles.statsValue, styles.statsValueCorrect]}>{correctCount}</Text>
          </View>
        </View>

        {/* Review List (Keep explanations in Japanese) */}
        <Text style={styles.reviewHeader}>Review Incorrect Questions</Text>
        {((partId <= 2 && quizResults.some((r) => !r.correct)) ||
          (partId >= 3 && quizResults.some((r) => r.questions.some((q) => !q.correct)))) ? (
          <View style={styles.reviewList}>
            {questions.map((item, idx) => {
              if (partId <= 2) {
                const res = quizResults.find((r) => r.questionId === item.id);
                if (!res || res.correct) return null;

                return (
                  <View key={idx} style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <Text style={styles.badgeWrong}>Incorrect ✗</Text>
                      <Text style={styles.reviewTypeBadge}>Question {idx + 1}</Text>
                    </View>

                    {partId === 1 && (
                      <View style={styles.part1ReviewImageContainer}>
                        <Image source={{ uri: item.image_url }} style={styles.part1ImageSmall} />
                        <Text style={styles.reviewAnswerRow}>
                          Your Answer: <Text style={styles.textWrong}>{res.selected}</Text>
                        </Text>
                        <Text style={styles.reviewAnswerRow}>
                          Correct Answer: <Text style={styles.textCorrect}>{res.answer}</Text>
                        </Text>
                      </View>
                    )}

                    {partId === 2 && (
                      <View style={styles.reviewPart2Box}>
                        <Text style={styles.reviewPromptText}>Q. {item.question}</Text>
                        <Text style={styles.reviewAnswerRow}>
                          Your Answer: <Text style={styles.textWrong}>{res.selected}</Text>
                        </Text>
                        <Text style={styles.reviewAnswerRow}>
                          Correct Answer: <Text style={styles.textCorrect}>{res.answer}</Text>
                        </Text>
                      </View>
                    )}

                    <View style={styles.reviewDivider} />
                    <Text style={styles.reviewExpTextHeader}>Explanation</Text>
                    <Text style={styles.reviewExpText}>{item.explanation}</Text>
                  </View>
                );
              } else {
                // Part 3 / Part 4
                const setRes = quizResults.find((r) => r.setId === item.id);
                if (!setRes || setRes.questions.every((q) => q.correct)) return null;

                return (
                  <View key={idx} style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <Text style={styles.badgeWrong}>Incorrect ✗</Text>
                      <Text style={styles.reviewTypeBadge}>Set {idx + 1}</Text>
                    </View>

                    <View style={styles.multiSetReviews}>
                      {item.questions.map((q) => {
                        const qRes = setRes.questions.find((qr) => qr.id === q.id);
                        if (!qRes || qRes.correct) return null;

                        return (
                          <View key={q.id} style={styles.singleSetReviewItem}>
                            <Text style={styles.reviewPromptText}>Q{q.id}. {q.question_text}</Text>
                            <Text style={styles.reviewAnswerRow}>
                              Your Answer: <Text style={styles.textWrong}>{qRes.selected}</Text> | Correct Answer: <Text style={styles.textCorrect}>{qRes.answer}</Text>
                            </Text>
                            <Text style={styles.reviewExpText}>{q.explanation}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              }
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
            onPress={() => startPartQuiz(partId)}
            btnStyle={styles.primaryActionBtn}
          >
            <Text style={styles.primaryActionBtnText}>Try Again</Text>
          </NeoButton>

          <NeoButton
            onPress={() => setPhase('menu')}
            btnStyle={styles.secondaryActionBtn}
          >
            <Text style={styles.secondaryActionBtnText}>Back to Parts</Text>
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
  /* Menu Layout Styles */
  menuHeader: {
    paddingTop: Platform.OS === 'ios' ? 24 : 16, // リーディング基準の上部安全余白に統一
    marginBottom: 24,
  },
  menuWelcome: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'MonaSans-Bold',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    marginTop: 4,
    fontFamily: 'MonaSans-Bold',
  },
  menuDesc: {
    fontSize: 12,
    color: '#7C756B',
    marginTop: 6,
    lineHeight: 18,
    fontFamily: 'DMSans-Regular',
  },
  menuGrid: {
    gap: 12,
    marginBottom: 24,
  },
  menuBtnFront: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 20,
    width: '100%',
  },
  menuBtnContent: {
    width: '100%',
    alignItems: 'stretch',
  },
  menuBtnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  menuBtnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  menuBtnBadge: {
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
  menuBtnDesc: {
    fontSize: 11,
    color: '#7C756B',
    lineHeight: 16,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },

  /* Quiz Layout Styles */
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
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#93C1C1',
    borderRadius: 3,
  },

  /* Custom Audio Player */
  audioPlayerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  audioPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#93C1C1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  audioProgressContainer: {
    flex: 1,
    gap: 6,
  },
  progressBarBgSmall: {
    height: 4,
    backgroundColor: '#DFD8CC',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFillSmall: {
    height: '100%',
    backgroundColor: '#93C1C1',
  },
  audioTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioTimeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
  },
  speedBtn: {
    backgroundColor: '#EBE5D8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
  speedBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },

  /* Media Card */
  mediaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    marginBottom: 16,
    alignItems: 'center',
  },
  part1Image: {
    width: '100%',
    height: 200,
  },
  mediaInstruction: {
    padding: 12,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
  listeningIcon: {
    fontSize: 40,
    marginTop: 24,
    marginBottom: 8,
  },
  listeningPrompt: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  listeningSubPrompt: {
    fontSize: 11,
    color: '#7C756B',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginTop: 8,
    fontFamily: 'DMSans-Regular',
  },
  visualTitleBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#EBE5D8',
    color: '#7C756B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 12,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
  },
  part3Image: {
    width: '90%',
    height: 160,
    marginBottom: 12,
  },

  /* Question Cards */
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
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
    marginBottom: 16,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
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
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },
  optLabelBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DFD8CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  /* Option States */
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
  multiQuestionsList: {
    gap: 16,
  },

  /* Explanation Layout */
  explanationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    marginTop: 16,
    marginBottom: 16,
  },
  expSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
    textTransform: 'uppercase',
    fontFamily: 'MonaSans-Bold',
  },
  expScriptBox: {
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DFD8CC',
    gap: 8,
  },
  scriptHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  scriptTextEnglish: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
    fontWeight: '600',
    fontFamily: 'DMSans-Regular',
  },
  scriptTextEnglishCorrect: {
    fontSize: 13,
    color: '#93C1C1',
    lineHeight: 18,
    fontWeight: 'bold',
    fontFamily: 'DMSans-Regular',
  },
  scriptTextJapanese: {
    fontSize: 12,
    color: '#7C756B',
    lineHeight: 16,
    fontFamily: 'DMSans-Regular',
  },
  scriptDivider: {
    height: 0.5,
    backgroundColor: '#DFD8CC',
    marginVertical: 4,
  },
  dialogueRow: {
    gap: 2,
    marginBottom: 8,
  },
  dialogueEnglish: {
    fontSize: 12,
    color: '#1C1C1E',
    lineHeight: 16,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },
  speakerText: {
    fontWeight: 'bold',
    color: '#378F8F',
    fontFamily: 'DMSans-Regular',
  },
  dialogueJapanese: {
    fontSize: 11,
    color: '#7C756B',
    lineHeight: 15,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },
  expDividerLine: {
    height: 0.5,
    backgroundColor: '#DFD8CC',
    marginVertical: 16,
  },
  expExplanationText: {
    fontSize: 13,
    color: '#7C756B',
    lineHeight: 20,
    fontFamily: 'DMSans-Regular',
  },
  multiExplanations: {
    gap: 12,
  },
  singleExpBox: {
    backgroundColor: '#F3EFE6',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DFD8CC',
    gap: 4,
  },
  singleExpTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
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

  /* Results Card */
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
    fontFamily: 'DMSans-Bold',
  },
  part1ReviewImageContainer: {
    gap: 8,
    alignItems: 'flex-start',
  },
  part1ImageSmall: {
    width: 120,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
  reviewAnswerRow: {
    fontSize: 12,
    color: '#7C756B',
    fontWeight: '600',
    fontFamily: 'DMSans-Regular',
  },
  reviewPart2Box: {
    gap: 6,
    alignItems: 'flex-start',
  },
  reviewPromptText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'DMSans-Regular',
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
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },
  multiSetReviews: {
    gap: 16,
  },
  singleSetReviewItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#CC2534',
    paddingLeft: 12,
    gap: 6,
    alignItems: 'flex-start',
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
