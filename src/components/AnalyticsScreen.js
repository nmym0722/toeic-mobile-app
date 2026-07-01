import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

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

export default function AnalyticsScreen({ onBackPortal }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const data = await loadUserStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleTargetScoreChange = async (score) => {
    if (!stats) return;
    const updated = { ...stats, targetScore: score };
    setStats(updated);
    await saveUserStats(updated);
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

  // L / R 正答率
  const getListeningRate = () => {
    let correct = 0;
    let total = 0;
    for (let i = 1; i <= 4; i++) {
      const p = stats.partStats[`part${i}`];
      if (p) {
        correct += p.correct;
        total += p.total;
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
        correct += p.correct;
        total += p.total;
      }
    }
    return total === 0 ? 0 : Math.round((correct / total) * 100);
  };

  const listeningRate = getListeningRate();
  const readingRate = getReadingRate();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerBadge}>Analytics Dashboard</Text>
            <Text style={styles.headerTitle}>📊 Analytics Dashboard</Text>
            <Text style={styles.headerDesc}>Real-time stats and score prediction</Text>
          </View>
        </View>

        {/* Set Target Score */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Set Target Score</Text>
          <View style={styles.targetRow}>
            {[600, 730, 860, 990].map((score) => {
              const active = stats.targetScore === score;
              return (
                <View key={score} style={styles.targetBtnWrapper}>
                  <NeoButton
                    onPress={() => handleTargetScoreChange(score)}
                    btnStyle={[
                      styles.targetBtnFront,
                      active && styles.targetBtnActive,
                    ]}
                    shadowColor={active ? '#378F8F' : '#1C1C1E'}
                    borderRadius={12}
                  >
                    <Text style={[styles.targetBtnText, active && styles.targetBtnTextActive]}>
                      {score} pts
                    </Text>
                  </NeoButton>
                </View>
              );
            })}
          </View>
        </View>

        {/* Summary Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Estimated Score</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{estimated.total}</Text>
              <Text style={styles.metricUnit}>pts</Text>
            </View>
            <Text style={styles.metricSub}>
              L: {estimated.listening} / R: {estimated.reading}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Daily Streak</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{stats.streak}</Text>
              <Text style={styles.metricUnit}>Days</Text>
            </View>
            <Text style={styles.metricSub}>Last: {stats.lastStudyDate || 'Today'}</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Questions Solved</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{totalQuestions}</Text>
              <Text style={styles.metricUnit}>Qs</Text>
            </View>
            <Text style={styles.metricSub}>
              Accuracy:{' '}
              {totalQuestions === 0
                ? 0
                : Math.round(
                    (Object.values(stats.partStats).reduce((acc, curr) => acc + curr.correct, 0) /
                      totalQuestions) *
                      100
                  )}
              %
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total Study Time</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{totalMinutes}</Text>
              <Text style={styles.metricUnit}>Mins</Text>
            </View>
            <Text style={styles.metricSub}>
              Approx. {(totalMinutes / 60).toFixed(1)} hrs
            </Text>
          </View>
        </View>

        {/* Section Balance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Section Balance</Text>
          <Text style={styles.cardDesc}>Comparison of Listening and Reading proficiency</Text>

          <View style={styles.balanceContainer}>
            {/* L */}
            <View style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>LISTENING (Part 1-4)</Text>
                <Text style={styles.progressValueText}>{listeningRate}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${listeningRate}%` }]} />
              </View>
            </View>

            {/* R */}
            <View style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>READING (Part 5-7)</Text>
                <Text style={[styles.progressValueText, { color: '#E88B8B' }]}>{readingRate}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${readingRate}%`, backgroundColor: '#E88B8B' },
                  ]}
                />
              </View>
            </View>

            {/* Vocabulary Mastery */}
            <View style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>📚 Vocabulary Mastery</Text>
                <Text style={styles.progressValueText}>{wordMastery}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${wordMastery}%` }]} />
              </View>
            </View>
          </View>

          {/* Advice Feedback Box (Keep Japanese content) */}
          <View style={styles.adviceBox}>
            <Text style={styles.adviceHeader}>💡 Analytics Advice</Text>
            <Text style={styles.adviceText}>
              {Math.abs(listeningRate - readingRate) <= 10 ? (
                'LとRのバランスが良好です。このまま偏りなく両セクションの学習を継続しましょう。'
              ) : listeningRate > readingRate ? (
                'リーディング（Part 5-7）の正答率が低めです。Part 5の文法ルールとPart 7の速読補強に注力しましょう。'
              ) : (
                'リスニング（Part 1-4）の正答率が低めです。Part 3・4の音声のシャドーイングや先読みスキルの向上を目指しましょう。'
              )}
            </Text>
          </View>
        </View>

        {/* Detailed Part Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detailed Part Breakdown</Text>
          <Text style={styles.cardDesc}>Solved questions and average time per part</Text>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Section</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: 'center' }]}>Correct/Solved</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: 'center' }]}>Accuracy</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Avg. Time</Text>
            </View>

            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const partKey = `part${num}`;
              const pData = stats.partStats[partKey] || { correct: 0, total: 0, totalTimeSec: 0 };
              const accuracy = pData.total === 0 ? 0 : Math.round((pData.correct / pData.total) * 100);
              const avgTime = calculateAverageTimePerQuestion(pData);

              const partLabels = [
                'Part 1 (Photos)',
                'Part 2 (Question-Response)',
                'Part 3 (Conversations)',
                'Part 4 (Talks)',
                'Part 5 (Sentence Completion)',
                'Part 6 (Text Completion)',
                'Part 7 (Reading Comprehension)',
              ];

              return (
                <View key={num} style={styles.tableRow}>
                  <Text style={[styles.tableCellName, { flex: 2 }]}>{partLabels[num - 1]}</Text>
                  <Text style={[styles.tableCell, { textAlign: 'center', color: '#7C756B' }]}>
                    {pData.correct}/{pData.total}
                  </Text>
                  <View style={[styles.tableCell, { alignItems: 'center' }]}>
                    <Text
                      style={[
                        styles.tableBadge,
                        accuracy >= 80
                          ? styles.badgeGood
                          : accuracy >= 60
                          ? styles.badgeNormal
                          : styles.badgeAlert,
                      ]}
                    >
                      {accuracy}%
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 'bold' }]}>
                    {pData.total === 0 ? '-' : `${avgTime}s`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Predicted Score History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Predicted Score History</Text>
          <Text style={styles.cardDesc}>History of estimated scores based on your performance</Text>

          <View style={styles.timeline}>
            {stats.scoreHistory && stats.scoreHistory.length > 0 ? (
              stats.scoreHistory.map((history, idx) => {
                const isTargetReached = history.score >= stats.targetScore;
                const scoreDiff = history.score - stats.targetScore;

                return (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={styles.timelineDot} />
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
                          {isTargetReached ? 'Target Reached!' : `${Math.abs(scoreDiff)} pts to target`}
                        </Text>
                      </View>
                      <Text style={styles.timelineScoreText}>
                        Predicted:{' '}
                        <Text style={styles.timelineScoreNumber}>{history.score}</Text> pts
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyTimelineText}>No history data available.</Text>
            )}
          </View>
        </View>

        {/* Back Action */}
        <NeoButton
          onPress={onBackPortal}
          btnStyle={styles.secondaryActionBtn}
        >
          <Text style={styles.secondaryActionBtnText}>Back to Dashboard</Text>
        </NeoButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6', // Beige background
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
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    marginTop: 6,
  },
  headerDesc: {
    fontSize: 12,
    color: '#7C756B',
    marginTop: 4,
  },

  /* Card Layout */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    marginBottom: 12,
    textAlign: 'left',
  },
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
    paddingHorizontal: 0,
    width: '100%',
  },
  targetBtnActive: {
    backgroundColor: '#93C1C1',
  },
  targetBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
  },
  targetBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Grid Metrics */
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'left',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginLeft: 2,
  },
  metricSub: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7C756B',
    textAlign: 'left',
  },

  /* Section Balance */
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'left',
  },
  cardDesc: {
    fontSize: 11,
    color: '#7C756B',
    marginTop: 2,
    marginBottom: 16,
    textAlign: 'left',
  },
  balanceContainer: {
    gap: 16,
  },
  progressRow: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
  },
  progressValueText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#378F8F',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#F3EFE6',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#93C1C1',
    borderRadius: 5,
  },
  adviceBox: {
    backgroundColor: '#F3EFE6',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DFD8CC',
    marginTop: 20,
    gap: 4,
    alignItems: 'flex-start',
  },
  adviceHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  adviceText: {
    fontSize: 12,
    color: '#7C756B',
    lineHeight: 18,
    textAlign: 'left',
  },

  /* Table Style */
  table: {
    gap: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3EFE6',
    paddingBottom: 8,
  },
  tableCellName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'left',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
  },
  tableBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeGood: {
    backgroundColor: '#93C1C1',
    color: '#FFFFFF',
  },
  badgeNormal: {
    backgroundColor: '#DFD8CC',
    color: '#7C756B',
  },
  badgeAlert: {
    backgroundColor: '#E88B8B',
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
    backgroundColor: '#93C1C1',
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
  },
  timelineDiff: {
    fontSize: 9,
    fontWeight: 'bold',
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
  },
  timelineScoreNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#378F8F',
  },
  emptyTimelineText: {
    fontSize: 12,
    color: '#7C756B',
    textAlign: 'center',
    paddingVertical: 12,
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
  },
});
