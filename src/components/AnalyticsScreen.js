import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import {
  loadUserStats,
  saveUserStats,
  calculateEstimatedScore,
  calculateWordMastery,
  calculateAverageTimePerQuestion,
  calculateTotalTimeMinutes,
  calculateTotalQuestions,
} from '../utils/statsHandler';
import NeoButton from './NeoButton';

// 所要時間のフォーマット用ヘルパー
function formatTimeSpent(sec) {
  if (!sec || sec <= 0) return '0秒';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) {
    return `${m}分${s}秒`;
  }
  return `${s}秒`;
}

// 直近7日間の日付・曜日リストを取得
const getPast7Days = () => {
  const days = [];
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  // 今日を中心に前後3日ずつの計7日間を算出（過去3日〜今日〜未来3日）
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = dayLabels[d.getDay()];
    days.push({
      dateStr,
      dayOfWeek,
      label: d.getDate(),
      isToday: i === 0,
      isFuture: i > 0, // 未来日付フラグ
    });
  }
  return days;
};

export default function AnalyticsScreen({ onBackPortal, headerComponent }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('730');

  const fetchStats = async () => {
    setLoading(true);
    const data = await loadUserStats();
    setStats(data);
    if (data) {
      setInputText(data.targetScore?.toString() || '730');
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const updateTargetScore = async (val) => {
    if (!stats) return;
    let score = parseInt(val, 10);
    if (isNaN(score)) {
      setInputText(stats.targetScore?.toString() || '730');
      return;
    }
    
    // 10点〜990点の間で5点刻み
    score = Math.max(10, Math.min(990, score));
    score = Math.round(score / 5) * 5;
    
    setInputText(score.toString());
    const updated = { ...stats, targetScore: score };
    setStats(updated);
    await saveUserStats(updated);
  };

  const handleIncrement = () => {
    const current = parseInt(inputText, 10) || 730;
    updateTargetScore(current + 5);
  };

  const handleDecrement = () => {
    const current = parseInt(inputText, 10) || 730;
    updateTargetScore(current - 5);
  };

  if (loading || !stats) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#93C1C1" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  // 推定スコア計算
  const estimated = calculateEstimatedScore(stats);
  const totalMinutes = calculateTotalTimeMinutes(stats);
  const totalQuestions = calculateTotalQuestions(stats);
  const wordMastery = calculateWordMastery(stats);

  // 未受験かどうか（1問も解いていない状態）
  const hasNoData = totalQuestions === 0;

  // 目標スコア比
  const targetScore = stats.targetScore || 730;
  const progressRate = hasNoData ? 0 : Math.min(100, Math.round((estimated.total / targetScore) * 100));
  const scoreDiff = targetScore - estimated.total;

  // L / R 正答率 (リアルデータのみ)
  const getListeningRate = () => {
    let correct = 0;
    let total = 0;
    for (let i = 1; i <= 4; i++) {
      const p = stats.partStats[`part${i}`];
      if (p) {
        correct += p.correct || 0;
        total += p.total || 0;
      }
    }
    return total === 0 ? 0 : Math.round((correct / total) * 100);
  };

  const getReadingRate = () => {
    let correct = 0;
    let total = 0;
    for (let i = 5; i <= 7; i++) {
      const p = stats.partStats[`part${i}`];
      if (p) {
        correct += p.correct || 0;
        total += p.total || 0;
      }
    }
    return total === 0 ? 0 : Math.round((correct / total) * 100);
  };

  const listeningRate = getListeningRate();
  const readingRate = getReadingRate();

  // カレンダー用の過去7日間データ生成
  const pastDays = getPast7Days();
  const logs = stats.studyLogs || [];
  
  // 今日のログのフィルタリング
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(log => log.date === todayStr);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {headerComponent}
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBadge}>Analytics Dashboard</Text>
          <View style={styles.headerTitleRow}>
            <Ionicons name="bar-chart" size={22} color="#378F8F" style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>分析ダッシュボード</Text>
          </View>
          <Text style={styles.headerDesc}>学習状況とスコア予測のリアルタイム分析</Text>
        </View>

        {/* Set Target Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>目標スコアを設定</Text>
          <Text style={styles.cardDesc}>5点刻み（10〜990点）で任意の目標を設定できます</Text>
          
          <View style={styles.targetControlContainer}>
            <View style={styles.controlBtnWrapper}>
              <NeoButton
                onPress={handleDecrement}
                btnStyle={styles.controlBtn}
                borderRadius={12}
              >
                <Ionicons name="remove" size={20} color="#7C756B" />
              </NeoButton>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.scoreInput}
                value={inputText}
                onChangeText={(text) => setInputText(text.replace(/[^0-9]/g, ''))}
                onBlur={() => updateTargetScore(inputText)}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.scoreInputUnit}>点</Text>
            </View>

            <View style={styles.controlBtnWrapper}>
              <NeoButton
                onPress={handleIncrement}
                btnStyle={styles.controlBtn}
                borderRadius={12}
              >
                <Ionicons name="add" size={20} color="#7C756B" />
              </NeoButton>
            </View>
          </View>
        </View>

        {/* Block 1: 予測スコアと目標スコアの比較 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>予測スコアと目標の対比</Text>
          <Text style={styles.cardDesc}>現在のパフォーマンスから算出された予測スコア</Text>

          <View style={styles.scoreCompareContainer}>
            <View style={styles.scoreRow}>
              <View>
                <Text style={styles.scoreLabel}>予測スコア</Text>
                <Text style={styles.scoreValue}>
                  {hasNoData ? '---' : estimated.total}
                  {!hasNoData && <Text style={styles.scoreUnit}> pts</Text>}
                </Text>
                {hasNoData && (
                  <Text style={{ fontSize: 11, color: '#7C756B', marginTop: 2 }}>問題を解くと算出されます</Text>
                )}
              </View>
              <View style={styles.dividerVertical} />
              <View>
                <Text style={styles.scoreLabel}>目標スコア</Text>
                <Text style={[styles.scoreValue, { color: '#378F8F' }]}>{targetScore} <Text style={styles.scoreUnit}>pts</Text></Text>
              </View>
            </View>

            <View style={styles.messageBox}>
              <Text style={styles.messageText}>
                {hasNoData
                  ? 'まだ問題を解いていません。学習を開始すると予測スコアが算出されます。'
                  : scoreDiff <= 0
                  ? '目標スコアを達成しています！この調子で維持しましょう。'
                  : `目標達成まであと ${scoreDiff} 点です。日々の学習を継続しましょう！`
                }
              </Text>
            </View>

            {/* 進捗プログレスバー */}
            <View style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>目標達成度</Text>
                <Text style={styles.progressValueText}>{progressRate}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressRate}%`, backgroundColor: '#93C1C1' }]} />
              </View>
            </View>

            {/* L/R 別の目安比較 */}
            <View style={styles.lrProgressContainer}>
              {/* Listening 進捗 */}
              <View style={[styles.progressRow, { flex: 1 }]}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabelSub}>Listening (目安 {targetScore / 2}点)</Text>
                  <Text style={styles.progressValueTextSub}>{estimated.listening}点</Text>
                </View>
                <View style={[styles.progressBarBg, { height: 8 }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.round((estimated.listening / (targetScore / 2)) * 100))}%`,
                        backgroundColor: '#93C1C1',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Reading 進捗 */}
              <View style={[styles.progressRow, { flex: 1 }]}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabelSub}>Reading (目安 {targetScore / 2}点)</Text>
                  <Text style={[styles.progressValueTextSub, { color: '#E88B8B' }]}>{estimated.reading}点</Text>
                </View>
                <View style={[styles.progressBarBg, { height: 8 }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.round((estimated.reading / (targetScore / 2)) * 100))}%`,
                        backgroundColor: '#E88B8B',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Block 2: ストリークと週カレンダー */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>連続学習日数とカレンダー</Text>
          <Text style={styles.cardDesc}>毎日学習を継続して習慣化しましょう</Text>

          <View style={styles.streakContainerNew}>
            {/* カレンダーの枠外に配置する超拡大炎バッジ */}
            <View style={styles.megaFlameWrapper}>
              <Ionicons name="flame" size={82} color="#E88B8B" />
              <View style={styles.megaFlameTextWrapper}>
                <Text style={styles.megaFlameNumber}>{stats.streak || 0}</Text>
              </View>
            </View>

            {/* カレンダーの独立した枠（ベージュ背景・黒枠線） */}
            <View style={styles.calendarFrameCard}>
              <View style={styles.calendarRight}>
                {pastDays.map((day) => {
                  const studied = logs.some(log => log.date === day.dateStr);
                  return (
                    <View key={day.dateStr} style={[styles.calendarDayCol, day.isFuture && { opacity: 0.4 }]}>
                      <Text style={styles.calendarDayLabel}>{day.dayOfWeek}</Text>
                      <View
                        style={[
                          styles.calendarCircle,
                          studied && styles.calendarCircleActive,
                          day.isToday && styles.calendarCircleToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDateText,
                            studied && styles.calendarDateTextActive,
                            day.isToday && styles.calendarDateTextToday,
                          ]}
                        >
                          {studied ? '✓' : day.label}
                        </Text>
                      </View>
                      {day.isToday && <Text style={styles.todayIndicatorText}>Today</Text>}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Block 3: 今日どのテストをどれくらいやったのか */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>今日の学習実績</Text>
          <Text style={styles.cardDesc}>本日の解答記録と学習時間</Text>

          <View style={styles.todayStatsOverview}>
            <View style={styles.overviewBox}>
              <Text style={styles.overviewLabel}>解答問題数</Text>
              <Text style={styles.overviewValue}>
                {todayLogs.reduce((acc, curr) => acc + (curr.totalCount || 0), 0)} <Text style={styles.overviewUnit}>問</Text>
              </Text>
            </View>
            <View style={styles.overviewBox}>
              <Text style={styles.overviewLabel}>学習時間</Text>
              <Text style={styles.overviewValue}>
                {formatTimeSpent(todayLogs.reduce((acc, curr) => acc + (curr.timeSpentSec || 0), 0))}
              </Text>
            </View>
          </View>

          <View style={styles.todayLogsContainer}>
            {todayLogs.length > 0 ? (
              todayLogs.map((log) => {
                const isL = log.category === 'listening';
                const isR = log.category === 'reading';
                const iconName = isL ? 'headset' : isR ? 'document-text' : 'book';
                const iconColor = isL ? '#378F8F' : isR ? '#7C756B' : '#E88B8B';
                
                return (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.logLeft}>
                      <Ionicons name={iconName} size={20} color={iconColor} style={{ marginRight: 4 }} />
                      <View>
                        <Text style={styles.logTitle}>{log.testName}</Text>
                        <Text style={styles.logTime}>{log.part || 'Vocabulary'} ・ {formatTimeSpent(log.timeSpentSec)}</Text>
                      </View>
                    </View>
                    <View style={styles.logRight}>
                      <Text style={styles.logResultText}>
                        {log.correctCount}/{log.totalCount}
                      </Text>
                      <Text style={styles.logAccuracyText}>
                        {log.totalCount === 0 ? 0 : Math.round((log.correctCount / log.totalCount) * 100)}%正解
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyActivityBox}>
                <Ionicons name="document-text-outline" size={32} color="#7C756B" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyActivityText}>今日の学習実績はまだありません。</Text>
                <Text style={styles.emptyActivitySub}>テストや単語練習を開始しましょう！</Text>
              </View>
            )}
          </View>
        </View>

        {/* Block 4-A: パート別正答率 (縦棒グラフ) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>パート別正答率</Text>
          <Text style={styles.cardDesc}>各セクションごとの現在の正答率比較</Text>

          <View style={styles.chartContainerNew}>
            {/* 共通の白いグラフ背景エリア */}
            <View style={styles.chartCanvasNew}>
              {/* 左端: Y軸目盛り (正答率) */}
              <View style={styles.yAxisContainerNew}>
                <Text style={styles.yAxisTextNew}>100%</Text>
                <Text style={styles.yAxisTextNew}>75%</Text>
                <Text style={styles.yAxisTextNew}>50%</Text>
                <Text style={styles.yAxisTextNew}>25%</Text>
                <Text style={styles.yAxisTextNew}>0%</Text>
              </View>

              {/* Y軸境界線 */}
              <View style={styles.yAxisLineNew} />

              {/* 右側: グラフエリア (グリッド線背景と7つの縦棒) */}
              <View style={styles.chartMainAreaNew}>
                {/* 背景グリッド補助線 */}
                <View style={styles.gridLinesContainerNew}>
                  <View style={styles.gridLineNew} />
                  <View style={styles.gridLineNew} />
                  <View style={styles.gridLineNew} />
                  <View style={styles.gridLineNew} />
                  <View style={styles.gridLineNew} />
                </View>

                {/* 7本の縦棒グラフ */}
                <View style={styles.barsContainerNew}>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const partKey = `part${num}`;
                    const pData = stats.partStats[partKey] || { correct: 0, total: 0, totalTimeSec: 0 };
                    const accuracy = pData.total === 0 ? 0 : Math.round((pData.correct / pData.total) * 100);
                    
                    return (
                      <View key={num} style={styles.chartColNew}>
                        <Text style={styles.chartValTextNew}>{accuracy}%</Text>
                        {/* 共通背景の中での棒グラフ本体レール */}
                        <View style={styles.chartBarTrackNew}>
                          <View 
                            style={[
                              styles.chartBarFillSolidNew, 
                              { height: `${accuracy}%`, backgroundColor: '#1E6B6B' } // 濃いミントブルーで統一
                            ]} 
                          />
                        </View>
                        <Text style={styles.chartLabelNew}>P{num}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Block 4-B: 各パートの学習詳細 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>各パートの学習詳細</Text>
          <Text style={styles.cardDesc}>累計問題数と平均解答時間の詳細データ</Text>

          {/* グラフ下の詳細データリスト */}
          <View style={styles.chartDetailsContainer}>
            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const partKey = `part${num}`;
              const pData = stats.partStats[partKey] || { correct: 0, total: 0, totalTimeSec: 0 };
              const avgTime = calculateAverageTimePerQuestion(pData);
              const partLabels = [
                'Part 1 (写真描写)',
                'Part 2 (応答問題)',
                'Part 3 (会話問題)',
                'Part 4 (説明文問題)',
                'Part 5 (短文穴埋め)',
                'Part 6 (長文穴埋め)',
                'Part 7 (長文読解)',
              ];

              return (
                <View key={num} style={styles.detailRowNew}>
                  <Text style={styles.detailPartNameNew}>{partLabels[num - 1]}</Text>
                  <Text style={styles.detailStatsNew}>
                    {pData.correct}/{pData.total}問  ・  {pData.total === 0 ? '-' : `平均 ${avgTime}秒`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Predicted Score History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>予測スコア推移履歴</Text>
          <Text style={styles.cardDesc}>解答精度に基づいた推定スコア履歴</Text>

          <View style={styles.timeline}>
            {stats.scoreHistory && stats.scoreHistory.length > 0 ? (
              stats.scoreHistory.map((history, idx) => {
                const isTargetReached = history.score >= targetScore;
                const diff = history.score - targetScore;

                return (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, isTargetReached && { backgroundColor: '#378F8F' }]} />
                      {idx < stats.scoreHistory.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeaderRow}>
                        <Text style={styles.timelineDate}>{history.date}</Text>
                        <Text
                          style={[
                            styles.timelineDiff,
                            isTargetReached ? styles.diffGood : styles.diffAlert,
                          ]}
                        >
                          {isTargetReached ? '目標達成!' : `目標まであと ${Math.abs(diff)}点`}
                        </Text>
                      </View>
                      <Text style={styles.timelineScoreText}>
                        推定スコア:{' '}
                        <Text style={styles.timelineScoreNumber}>{history.score}</Text> 点
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyTimelineContainer}>
                <Text style={styles.emptyTimelineText}>履歴データがありません。</Text>
                <Text style={styles.emptyTimelineSub}>日々の学習データから予測の推移が自動記録されます。</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6', // ベージュ
    paddingHorizontal: 16,
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
    marginTop: 12,
    marginBottom: 20,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  headerDesc: {
    fontSize: 12,
    color: '#7C756B',
    marginTop: 4,
    fontFamily: 'DMSans-Regular',
  },

  /* Card Layout */
  card: {
    backgroundColor: '#FFFFFF', // ホワイト
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E', // 黒ボーダー
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'left',
    fontFamily: 'MonaSans-Bold',
  },
  cardDesc: {
    fontSize: 11,
    color: '#7C756B',
    marginTop: 2,
    marginBottom: 16,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    marginBottom: 12,
    textAlign: 'left',
    fontFamily: 'MonaSans-Bold',
  },

  /* Set Target Score */
  targetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetBtnWrapper: {
    flex: 1,
  },
  targetBtnFront: {
    backgroundColor: '#F3EFE6',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 10,
    width: '100%',
  },
  targetBtnActive: {
    backgroundColor: '#93C1C1', // ミントグリーン
  },
  targetBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  targetBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Score Comparison Block */
  scoreCompareContainer: {
    gap: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
  dividerVertical: {
    width: 1.5,
    height: '80%',
    backgroundColor: '#1C1C1E',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#7C756B',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'DMSans-Bold',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
    fontFamily: 'MonaSans-Bold',
  },
  scoreUnit: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
  },
  messageBox: {
    backgroundColor: '#F3EFE6',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  messageText: {
    fontSize: 11,
    color: '#7C756B',
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
    fontWeight: 'bold',
  },
  lrProgressContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },

  /* Progress Bar styles */
  progressRow: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  progressLabelSub: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
  },
  progressValueText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#378F8F',
    fontFamily: 'MonaSans-Bold',
  },
  progressValueTextSub: {
    fontSize: 11,
    fontWeight: '900',
    color: '#378F8F',
    fontFamily: 'MonaSans-Bold',
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#F3EFE6',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },

  /* Streak and Calendar */
  streakWrapper: {
    gap: 16,
  },
  streakCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3EFE6',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  streakSub: {
    fontSize: 10,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
  },
  calendarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  calendarDayCol: {
    alignItems: 'center',
    gap: 6,
  },
  calendarDayLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  calendarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCircleActive: {
    backgroundColor: '#93C1C1', // 学習済みはミントグリーン
  },
  calendarCircleToday: {
    borderColor: '#378F8F', // 今日は太めのミント枠線
    borderWidth: 3,
  },
  calendarDateText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'DMSans-Bold',
  },
  calendarDateTextActive: {
    color: '#FFFFFF',
  },
  calendarDateTextToday: {
    color: '#1C1C1E',
  },
  todayIndicatorText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#378F8F',
    marginTop: -2,
    fontFamily: 'DMSans-Bold',
  },

  /* Today Stats Overview */
  todayStatsOverview: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  overviewBox: {
    flex: 1,
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 10,
    color: '#7C756B',
    fontWeight: 'bold',
    fontFamily: 'DMSans-Bold',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  overviewUnit: {
    fontSize: 11,
    color: '#7C756B',
  },

  /* Today Logs List */
  todayLogsContainer: {
    gap: 8,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logEmoji: {
    fontSize: 20,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  logTime: {
    fontSize: 10,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logResultText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#378F8F',
    fontFamily: 'MonaSans-Bold',
  },
  logAccuracyText: {
    fontSize: 9,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
  },
  emptyActivityBox: {
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  emptyActivityEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyActivityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  emptyActivitySub: {
    fontSize: 10,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
    marginTop: 2,
  },

  /* Table Style for Part breakdown */
  table: {
    gap: 12,
  },
  partProgressRow: {
    gap: 4,
  },
  partInfoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partLabelName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  partStatsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partCountText: {
    fontSize: 11,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
  },
  partAvgTime: {
    fontSize: 10,
    color: '#7C756B',
    fontFamily: 'DMSans-Bold',
  },
  tableBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: 'DMSans-Bold',
    minWidth: 40,
    textAlign: 'center',
  },
  badgeGood: {
    backgroundColor: '#93C1C1', // ミント
    color: '#FFFFFF',
  },
  badgeNormal: {
    backgroundColor: '#DFD8CC', // トープ
    color: '#7C756B',
  },
  badgeAlert: {
    backgroundColor: '#E88B8B', // コーラル
    color: '#FFFFFF',
  },

  /* Timeline */
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DFD8CC',
    zIndex: 2,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    width: 1.5,
    top: 14,
    bottom: 0,
    backgroundColor: '#DFD8CC',
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
    paddingLeft: 8,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDate: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
  timelineDiff: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'DMSans-Regular',
  },
  diffGood: {
    color: '#378F8F',
  },
  diffAlert: {
    color: '#7C756B',
  },
  timelineScoreText: {
    fontSize: 13,
    color: '#1C1C1E',
    marginTop: 2,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },
  timelineScoreNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#378F8F',
    fontFamily: 'MonaSans-Bold',
  },
  emptyTimelineContainer: {
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  emptyTimelineText: {
    fontSize: 12,
    color: '#7C756B',
    fontWeight: 'bold',
    fontFamily: 'MonaSans-Bold',
  },
  emptyTimelineSub: {
    fontSize: 10,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
    marginTop: 2,
    textAlign: 'center',
  },
  streakRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: '#F3EFE6',
    borderRadius: 20,
    padding: 12,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  streakLeft: {
    alignItems: 'center',
    width: 76,
    borderRightWidth: 1.5,
    borderRightColor: '#DFD8CC',
    paddingRight: 8,
  },
  streakFlameContainer: {
    position: 'relative',
    width: 62,
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakFlameTextWrapper: {
    position: 'absolute',
    top: 24, // 炎のサイズアップに伴い、中央にきれいに乗るよう調整
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakFlameNumber: {
    fontSize: 18, // 数字をはっきり大きく表示
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'MonaSans-Bold',
  },
  streakLabelTiny: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#7C756B',
    marginTop: -2,
    fontFamily: 'MonaSans-Bold',
  },
  calendarRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
  },
  /* Target Score Spin Controls */
  targetControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 4,
  },
  controlBtnWrapper: {
    width: 60,
  },
  controlBtn: {
    backgroundColor: '#EBE5D8',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    minWidth: 110,
    justifyContent: 'center',
  },
  scoreInput: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
    minWidth: 50,
    fontFamily: 'MonaSans-Bold',
    padding: 0,
  },
  scoreInputUnit: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7C756B',
    marginLeft: 4,
    fontFamily: 'MonaSans-Bold',
  },
  /* Mega Flame and Frame Layout */
  streakContainerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  megaFlameWrapper: {
    position: 'relative',
    width: 82,
    height: 82,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -10,
    zIndex: 10,
  },
  megaFlameTextWrapper: {
    position: 'absolute',
    top: 34, // 文字を炎のくり抜き部分に配置するため少し下げる
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  megaFlameNumber: {
    fontSize: 20, // 炎の穴に収まるように少しスリムに
    fontWeight: '900',
    color: '#1C1C1E', // 白から黒色に変更し、白抜き背景と同化するのを防ぐ
    fontFamily: 'MonaSans-Bold',
  },
  calendarFrameCard: {
    flex: 1,
    backgroundColor: '#F3EFE6',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  /* Vertical Chart style (Row arrayed) */
  chartContainerNew: {
    marginVertical: 12,
  },
  chartCanvasNew: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    backgroundColor: '#FFFFFF', // 共通の白いグラフキャンバス背景
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  yAxisContainerNew: {
    height: 110,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    marginBottom: 20, // X軸ラベル (P1等) の位置と揃える
  },
  yAxisTextNew: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'DMSans-Bold',
  },
  yAxisLineNew: {
    width: 2,
    height: 110,
    backgroundColor: '#1C1C1E',
    marginBottom: 20,
    marginRight: 4,
  },
  chartMainAreaNew: {
    flex: 1,
    position: 'relative',
    height: '100%',
    justifyContent: 'flex-end',
  },
  gridLinesContainerNew: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 110,
    marginBottom: 20,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  gridLineNew: {
    height: 1,
    backgroundColor: '#DFD8CC',
    opacity: 0.6,
  },
  barsContainerNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    zIndex: 2,
  },
  chartColNew: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartValTextNew: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
    fontFamily: 'MonaSans-Bold',
  },
  chartBarTrackNew: {
    width: 20, // バーの太さ
    height: 110, // 縦棒の最大高さ
    backgroundColor: '#F3EFE6', // バーの背景レール (薄いベージュ)
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFillSolidNew: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabelNew: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    marginTop: 6,
    fontFamily: 'MonaSans-Bold',
  },
  /* Chart details table */
  chartDetailsContainer: {
    marginTop: 12,
    gap: 8,
  },
  detailRowNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
  },
  detailPartNameNew: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  detailStatsNew: {
    fontSize: 11,
    color: '#7C756B',
    fontFamily: 'DMSans-Regular',
  },
});
