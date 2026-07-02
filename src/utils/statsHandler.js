import AsyncStorage from '@react-native-async-storage/async-storage';
import toeicWords from '../data/toeic_words.json';
import { supabase } from '../services/supabase';

const LOCAL_STORAGE_KEY = 'toeic_user_stats';

async function getUserId() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

function getPastDateString(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

export function generateInitialStats() {
  return {
    targetScore: 730, // デフォルト目標スコア
    streak: 0,
    lastStudyDate: '',
    scoreHistory: [],
    partStats: {
      part1: { correct: 0, total: 0, totalTimeSec: 0 },
      part2: { correct: 0, total: 0, totalTimeSec: 0 },
      part3: { correct: 0, total: 0, totalTimeSec: 0 },
      part4: { correct: 0, total: 0, totalTimeSec: 0 },
      part5: { correct: 0, total: 0, totalTimeSec: 0 },
      part6: { correct: 0, total: 0, totalTimeSec: 0 },
      part7: { correct: 0, total: 0, totalTimeSec: 0 },
    },
    wordProgress: {},
    studyLogs: [],
  };
}

/**
 * 完全なリセット用初期データを生成する（Supabase・ローカル両方を上書き）
 */
export async function resetAllStats() {
  const initial = generateInitialStats();
  try {
    // 1. ローカルを確実にクリア（removeしてからsetItemで二重担保）
    await AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
    await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    // 2. ログイン済みの場合はSupabaseも完全に上書き
    const userId = await getUserId();
    if (userId && supabase) {
      await supabase.from('user_stats').upsert({
        user_id: userId,
        stats: initial,
        updated_at: new Date().toISOString(),
      });
    }
    return initial;
  } catch (e) {
    console.error('resetAllStats error:', e);
    return initial;
  }
}

/**
 * ユーザー統計を読み込む (ログイン時はSupabase、未ログイン時はAsyncStorage)
 */
export async function loadUserStats() {
  try {
    const userId = await getUserId();
    let stats = null;

    if (userId) {
      const { data, error } = await supabase
        .from('user_stats')
        .select('stats')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          const localData = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
          stats = localData ? JSON.parse(localData) : generateInitialStats();
          await supabase.from('user_stats').upsert({ user_id: userId, stats });
          await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats));
          return stats;
        }
        throw error;
      }
      
      if (data && data.stats) {
        stats = data.stats;
      }
    }

    if (!stats) {
      const data = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
      stats = data ? JSON.parse(data) : generateInitialStats();
    }

    // 古いデータ構造に studyLogs 等がない場合のマイグレーション
    let needsSave = false;
    if (!stats.partStats) {
      stats.partStats = generateInitialStats().partStats;
      needsSave = true;
    }
    if (!stats.scoreHistory) {
      stats.scoreHistory = [];
      needsSave = true;
    }
    if (!stats.wordProgress) {
      stats.wordProgress = {};
      needsSave = true;
    }
    if (!stats.studyLogs) {
      stats.studyLogs = [];
      needsSave = true;
    }
    if (stats.streak === undefined) {
      stats.streak = 0;
      needsSave = true;
    }
    if (stats.targetScore === undefined) {
      stats.targetScore = 730;
      needsSave = true;
    }

    if (needsSave) {
      await saveUserStats(stats);
    }
    return stats;
  } catch (error) {
    console.error('Failed to load user stats:', error);
    try {
      const data = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : generateInitialStats();
    } catch {
      return generateInitialStats();
    }
  }
}

/**
 * ユーザー統計を保存する (ローカルに保存しつつ、ログイン時はSupabaseにも保存)
 */
export async function saveUserStats(stats) {
  try {
    await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats));
    
    const userId = await getUserId();
    if (userId) {
      const { error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          stats,
          updated_at: new Date().toISOString()
        });
      if (error) {
        console.error('Failed to save user stats to Supabase:', error);
      }
    }
  } catch (error) {
    console.error('Failed to save user stats:', error);
  }
}

/**
 * ログイン時にローカルデータとクラウドデータを同期する
 */
export async function syncStatsOnLogin() {
  try {
    const userId = await getUserId();
    if (!userId) return;

    const localDataStr = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
    const localStats = localDataStr ? JSON.parse(localDataStr) : null;

    const { data, error } = await supabase
      .from('user_stats')
      .select('stats')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      const statsToUpload = localStats || generateInitialStats();
      await supabase.from('user_stats').upsert({ user_id: userId, stats: statsToUpload });
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(statsToUpload));
      console.log('Synced local stats to Supabase successfully');
    } else if (data && data.stats) {
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.stats));
      console.log('Synced Supabase stats to local successfully');
    }
  } catch (error) {
    console.error('Failed to sync stats on login:', error);
  }
}

function calculateSectionScore(correct, total) {
  // 問題を1問も解いていない場合はスコアなし（0）を返す
  if (total === 0) return 0;
  const rate = correct / total;
  
  let score = 5;
  if (rate > 0.05) {
    if (rate <= 0.3) {
      score = 5 + (rate / 0.3) * 95;
    } else if (rate <= 0.7) {
      score = 100 + ((rate - 0.3) / 0.4) * 200;
    } else if (rate <= 0.9) {
      score = 300 + ((rate - 0.7) / 0.2) * 140;
    } else {
      score = 440 + ((rate - 0.9) / 0.1) * 55;
    }
  }
  
  return Math.round(score / 5) * 5;
}

export function calculateEstimatedScore(stats) {
  let lCorrect = 0;
  let lTotal = 0;
  for (let i = 1; i <= 4; i++) {
    const part = stats.partStats[`part${i}`];
    if (part) {
      lCorrect += part.correct;
      lTotal += part.total;
    }
  }
  
  let rCorrect = 0;
  let rTotal = 0;
  for (let i = 5; i <= 7; i++) {
    const part = stats.partStats[`part${i}`];
    if (part) {
      rCorrect += part.correct;
      rTotal += part.total;
    }
  }
  
  const listening = calculateSectionScore(lCorrect, lTotal);
  const reading = calculateSectionScore(rCorrect, rTotal);
  
  return {
    total: listening + reading,
    listening,
    reading,
  };
}

export function calculateWordMastery(stats) {
  const totalWords = toeicWords.length;
  if (totalWords === 0) return 0;
  
  const masteredCount = Object.values(stats.wordProgress || {}).filter((progress) => {
    if (typeof progress === 'number') {
      return progress >= 1;
    }
    if (progress && typeof progress === 'object') {
      return (progress.correctCount || 0) >= 1;
    }
    return false;
  }).length;
  return Math.min(100, Math.round((masteredCount / totalWords) * 1000) / 10);
}

export function calculateAverageTimePerQuestion(partStat) {
  if (!partStat || partStat.total === 0) return 0;
  return Math.round((partStat.totalTimeSec / partStat.total) * 10) / 10;
}

export function calculateTotalTimeMinutes(stats) {
  let totalSec = 0;
  for (const part of Object.values(stats.partStats || {})) {
    totalSec += part.totalTimeSec || 0;
  }
  // 学習ログからも念のため合算（あるいはログの合計時間を使う）
  return Math.round(totalSec / 60);
}

export function calculateTotalQuestions(stats) {
  let total = 0;
  for (const part of Object.values(stats.partStats || {})) {
    total += part.total || 0;
  }
  return total;
}

export function updateWordProgress(stats, wordId, isCorrect) {
  const updated = { ...stats };
  updated.wordProgress = { ...updated.wordProgress };
  const progress = updated.wordProgress[wordId];
  
  let current = { correctCount: 0, incorrectCount: 0, knowCount: 0, learnCount: 0 };
  if (typeof progress === 'number') {
    current.correctCount = progress;
  } else if (progress && typeof progress === 'object') {
    current = { ...current, ...progress };
  }

  if (isCorrect) {
    current.correctCount += 1;
  } else {
    current.incorrectCount += 1;
  }
  
  updated.wordProgress[wordId] = current;
  return updated;
}

/**
 * 単語テスト結果を一括保存し、学習ログも書き込む
 */
export function updateWordProgressBatch(stats, results, timeSpentSec, levelLabel) {
  const updated = { ...stats };
  updated.wordProgress = { ...updated.wordProgress };
  updated.studyLogs = updated.studyLogs ? [...updated.studyLogs] : [];

  let correctCount = 0;
  results.forEach(({ wordId, isCorrect, isLearnSwiped }) => {
    const progress = updated.wordProgress[wordId];
    let current = { correctCount: 0, incorrectCount: 0, knowCount: 0, learnCount: 0 };
    if (typeof progress === 'number') {
      current.correctCount = progress;
    } else if (progress && typeof progress === 'object') {
      current = { ...current, ...progress };
    }

    if (isCorrect) {
      current.correctCount += 1;
      correctCount++;
    } else {
      current.incorrectCount += 1;
    }

    if (isLearnSwiped !== undefined) {
      if (isLearnSwiped) {
        current.learnCount += 1;
      } else {
        current.knowCount += 1;
      }
    }

    updated.wordProgress[wordId] = current;
  });

  const todayStr = getPastDateString(0);

  // 1. 学習ログを追加
  const newLog = {
    id: Math.random().toString(36).substring(2, 11),
    date: todayStr,
    timestamp: new Date().toISOString(),
    category: 'vocabulary',
    part: 'Vocabulary',
    testName: `単語テスト (${levelLabel || 'レベル共通'})`,
    correctCount: correctCount,
    totalCount: results.length,
    timeSpentSec: timeSpentSec,
  };
  updated.studyLogs.push(newLog);

  // 2. ストリークの更新
  const yesterdayStr = getPastDateString(1);
  if (updated.lastStudyDate === yesterdayStr) {
    updated.streak = (updated.streak || 0) + 1;
  } else if (updated.lastStudyDate !== todayStr) {
    updated.streak = 1;
  }
  updated.lastStudyDate = todayStr;

  // 3. スコア履歴の更新（実際に問題を解いた場合のみ記録）
  const estimated = calculateEstimatedScore(updated);
  if (estimated.total > 0) {
    updated.scoreHistory = updated.scoreHistory ? [...updated.scoreHistory] : [];
    const historyIndex = updated.scoreHistory.findIndex((h) => h.date === todayStr);
    if (historyIndex >= 0) {
      updated.scoreHistory[historyIndex] = {
        ...updated.scoreHistory[historyIndex],
        score: estimated.total,
      };
    } else {
      updated.scoreHistory.push({ date: todayStr, score: estimated.total });
      if (updated.scoreHistory.length > 10) {
        updated.scoreHistory.shift();
      }
    }
  }

  return updated;
}

/**
 * 各Partのテスト結果を保存し、学習ログも書き込む
 */
export function updatePartStats(stats, partName, correctCount, totalCount, timeSec, testName) {
  const updated = { ...stats };
  updated.partStats = { ...updated.partStats };
  updated.studyLogs = updated.studyLogs ? [...updated.studyLogs] : [];
  
  const currentPart = updated.partStats[partName] || { correct: 0, total: 0, totalTimeSec: 0 };
  
  updated.partStats[partName] = {
    correct: currentPart.correct + correctCount,
    total: currentPart.total + totalCount,
    totalTimeSec: currentPart.totalTimeSec + timeSec,
  };
  
  const todayStr = getPastDateString(0);

  // 1. 学習ログを追加
  const isListening = ['part1', 'part2', 'part3', 'part4'].includes(partName);
  const partNum = partName.replace('part', '');
  const newLog = {
    id: Math.random().toString(36).substring(2, 11),
    date: todayStr,
    timestamp: new Date().toISOString(),
    category: isListening ? 'listening' : 'reading',
    part: `Part ${partNum}`,
    testName: testName || `Part ${partNum} 練習問題`,
    correctCount,
    totalCount,
    timeSpentSec: timeSec,
  };
  updated.studyLogs.push(newLog);
  
  // 2. ストリークの更新
  const yesterdayStr = getPastDateString(1);
  if (updated.lastStudyDate === yesterdayStr) {
    updated.streak = (updated.streak || 0) + 1;
  } else if (updated.lastStudyDate !== todayStr) {
    updated.streak = 1;
  }
  updated.lastStudyDate = todayStr;

  // 3. スコア履歴の更新（実際にスコアが計算できる場合のみ記録）
  const estimated = calculateEstimatedScore(updated);
  if (estimated.total > 0) {
    updated.scoreHistory = updated.scoreHistory ? [...updated.scoreHistory] : [];
    const historyIndex = updated.scoreHistory.findIndex((h) => h.date === todayStr);
    if (historyIndex >= 0) {
      updated.scoreHistory[historyIndex] = {
        ...updated.scoreHistory[historyIndex],
        score: estimated.total,
      };
    } else {
      updated.scoreHistory.push({ date: todayStr, score: estimated.total });
      if (updated.scoreHistory.length > 10) {
        updated.scoreHistory.shift();
      }
    }
  }
  
  return updated;
}

