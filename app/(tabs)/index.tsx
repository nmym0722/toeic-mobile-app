import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import {
  loadUserStats,
  saveUserStats,
  calculateEstimatedScore,
  calculateWordMastery,
  calculateTotalTimeMinutes,
  calculateTotalQuestions,
} from '../../src/utils/statsHandler';
import NeoButton from '../../src/components/NeoButton';

export default function HomeDashboardScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  // 今日目標のチェックボックス状態 (絵文字を排除)
  const [todoList, setTodoList] = useState([
    { id: 1, text: '単語テストを1回解く (10単語)', completed: false },
    { id: 2, text: 'Part 5 短文穴埋めを10問解く', completed: false },
    { id: 3, text: 'リスニング問題に5問挑戦する', completed: false },
  ]);

  const toggleTodo = (id: number) => {
    setTodoList(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const fetchStats = async () => {
    setLoading(true);
    const data = await loadUserStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isFocused) {
      fetchStats();
    }
  }, [isFocused]);

  const handleTargetScoreChange = async (score: number) => {
    if (!stats) return;
    const updated = { ...stats, targetScore: score };
    setStats(updated);
    await saveUserStats(updated);
  };

  if (loading || !stats) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#93C1C1" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerBadge}>Dashboard</Text>
            <Text style={styles.headerTitle}>Home Dashboard</Text>
            <Text style={styles.headerDesc}>あなたの毎日の学習成果と今日の目標</Text>
          </View>

          {/* 今日の目標 (Todo List) */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>今日の学習目標</Text>
            <View style={styles.todoContainer}>
              {todoList.map(todo => (
                <NeoButton
                  key={todo.id}
                  onPress={() => toggleTodo(todo.id)}
                  btnStyle={[
                    styles.todoItem,
                    todo.completed && styles.todoItemCompleted,
                  ]}
                  shadowColor={todo.completed ? '#DFD8CC' : '#1C1C1E'}
                  borderRadius={12}
                >
                  <View style={styles.todoContent}>
                    <Text style={[styles.todoCheckbox, todo.completed && styles.todoCheckboxCompleted]}>
                      {todo.completed ? '✓' : ' '}
                    </Text>
                    <Text style={[styles.todoText, todo.completed && styles.todoTextCompleted]}>
                      {todo.text}
                    </Text>
                  </View>
                </NeoButton>
              ))}
            </View>
          </View>

          {/* Set Target Score */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Set Target Score (目標スコア)</Text>
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
              <Text style={styles.metricLabel}>Estimated Score (推定スコア)</Text>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{estimated.total}</Text>
                <Text style={styles.metricUnit}>pts</Text>
              </View>
              <Text style={styles.metricSub}>
                L: {estimated.listening} / R: {estimated.reading}
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Daily Streak (継続日数)</Text>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{stats.streak}</Text>
                <Text style={styles.metricUnit}>Days</Text>
              </View>
              <Text style={styles.metricSub}>Last: {stats.lastStudyDate || 'Today'}</Text>
            </View>
          </View>

          {/* Detail Stats */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Correct Rate (セクション正答率)</Text>
            <View style={styles.rateRow}>
              <View style={styles.rateBox}>
                <Text style={styles.rateLabel}>Listening (Part 1 - 4)</Text>
                <Text style={[styles.rateValue, styles.rateValueL]}>{listeningRate}%</Text>
              </View>
              <View style={styles.rateBox}>
                <Text style={styles.rateLabel}>Reading (Part 5 - 7)</Text>
                <Text style={[styles.rateValue, styles.rateValueR]}>{readingRate}%</Text>
              </View>
            </View>
          </View>

          {/* Summary Stats */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Progress (累計学習)</Text>
            <View style={styles.statsOverview}>
              <View style={styles.statLine}>
                <Text style={styles.statLabel}>回答済問題数</Text>
                <Text style={styles.statValue}>{totalQuestions} 問</Text>
              </View>
              <View style={styles.statLine}>
                <Text style={styles.statLabel}>累計学習時間</Text>
                <Text style={styles.statValue}>{totalMinutes} 分</Text>
              </View>
              <View style={styles.statLine}>
                <Text style={styles.statLabel}>習得単語数</Text>
                <Text style={styles.statValue}>{wordMastery} 単語</Text>
              </View>
            </View>
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
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
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 24 : 16, // リーディング基準の上部安全余白に統一
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 16,
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
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    marginTop: 8,
  },
  headerDesc: {
    fontSize: 13,
    color: '#7C756B',
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7C756B',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  targetBtnWrapper: {
    flex: 1,
  },
  targetBtnFront: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 12,
    width: '100%',
  },
  targetBtnActive: {
    backgroundColor: '#93C1C1',
    borderColor: '#1C1C1E',
  },
  targetBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  targetBtnTextActive: {
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
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
    marginBottom: 8,
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    marginLeft: 2,
  },
  metricSub: {
    fontSize: 11,
    color: '#7C756B',
    fontWeight: '600',
  },
  rateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rateBox: {
    flex: 1,
    backgroundColor: '#F3EFE6',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7C756B',
    marginBottom: 6,
  },
  rateValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  rateValueL: {
    color: '#378F8F',
  },
  rateValueR: {
    color: '#93C1C1',
  },
  statsOverview: {
    gap: 12,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  todoContainer: {
    gap: 12,
  },
  todoItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 12,
    width: '100%',
  },
  todoItemCompleted: {
    backgroundColor: '#F3EFE6',
    borderColor: '#DFD8CC',
    opacity: 0.8,
  },
  todoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  todoCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 6,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
  },
  todoCheckboxCompleted: {
    borderColor: '#378F8F',
    backgroundColor: '#93C1C1',
    color: '#FFFFFF',
  },
  todoText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'left',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#7C756B',
  },
});
