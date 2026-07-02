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
  const todayStr = getPastDateString(0);

  // 初回表示で見栄えがするように、w0001〜w0350 (350単語) が正解した状態にする
  const initialWordProgress = {};
  for (let i = 1; i <= 350; i++) {
    const idStr = `w${String(i).padStart(4, '0')}`;
    initialWordProgress[idStr] = 1;
  }

  return {
    targetScore: 730,
    streak: 5,
    lastStudyDate: todayStr,
    scoreHistory: [
      { date: getPastDateString(6), score: 600 },
      { date: getPastDateString(5), score: 610 },
      { date: getPastDateString(4), score: 605 },
      { date: getPastDateString(3), score: 620 },
      { date: getPastDateString(2), score: 630 },
      { date: getPastDateString(1), score: 645 },
      { date: todayStr, score: 650 },
    ],
    partStats: {
      part1: { correct: 18, total: 20, totalTimeSec: 360 },      // 正答率90%, 平均18秒
      part2: { correct: 28, total: 35, totalTimeSec: 700 },      // 正答率80%, 平均20秒
      part3: { correct: 32, total: 45, totalTimeSec: 1350 },     // 正答率71%, 平均30秒
      part4: { correct: 24, total: 30, totalTimeSec: 900 },      // 正答率80%, 平均30秒
      part5: { correct: 42, total: 50, totalTimeSec: 1250 },     // 正答率84%, 平均25秒
      part6: { correct: 16, total: 20, totalTimeSec: 800 },      // 正答率80%, 平均40秒
      part7: { correct: 35, total: 48, totalTimeSec: 2880 },     // 正答率73%, 平均60秒
    },
    wordProgress: initialWordProgress,
  };
}

/**
 * ユーザー統計を読み込む (ログイン時はSupabase、未ログイン時はAsyncStorage)
 */
export async function loadUserStats() {
  try {
    const userId = await getUserId();
    if (userId) {
      const { data, error } = await supabase
        .from('user_stats')
        .select('stats')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          const localData = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
          const stats = localData ? JSON.parse(localData) : generateInitialStats();
          await supabase.from('user_stats').upsert({ user_id: userId, stats });
          await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats));
          return stats;
        }
        throw error;
      }
      
      if (data && data.stats) {
        const stats = data.stats;
        if (!stats.partStats || !stats.scoreHistory || !stats.wordProgress) {
          const initial = generateInitialStats();
          await supabase.from('user_stats').upsert({ user_id: userId, stats: initial });
          await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
          return initial;
        }
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats));
        return stats;
      }
    }

    const data = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      const initial = generateInitialStats();
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const stats = JSON.parse(data);
    if (!stats.partStats || !stats.scoreHistory || !stats.wordProgress) {
      const initial = generateInitialStats();
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
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
  if (total === 0) return 200;
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
  
  const masteredCount = Object.values(stats.wordProgress).filter((count) => count >= 1).length;
  return Math.min(100, Math.round((masteredCount / totalWords) * 1000) / 10);
}

export function calculateAverageTimePerQuestion(partStat) {
  if (!partStat || partStat.total === 0) return 0;
  return Math.round((partStat.totalTimeSec / partStat.total) * 10) / 10;
}

export function calculateTotalTimeMinutes(stats) {
  let totalSec = 0;
  for (const part of Object.values(stats.partStats)) {
    totalSec += part.totalTimeSec;
  }
  return Math.round(totalSec / 60);
}

export function calculateTotalQuestions(stats) {
  let total = 0;
  for (const part of Object.values(stats.partStats)) {
    total += part.total;
  }
  return total;
}

export function updateWordProgress(stats, wordId, isCorrect) {
  const updated = { ...stats };
  updated.wordProgress = { ...updated.wordProgress };
  const currentCount = updated.wordProgress[wordId] || 0;
  if (isCorrect) {
    updated.wordProgress[wordId] = currentCount + 1;
  } else {
    updated.wordProgress[wordId] = currentCount;
  }
  return updated;
}

export function updatePartStats(stats, partName, correctCount, totalCount, timeSec) {
  const updated = { ...stats };
  updated.partStats = { ...updated.partStats };
  const currentPart = updated.partStats[partName] || { correct: 0, total: 0, totalTimeSec: 0 };
  
  updated.partStats[partName] = {
    correct: currentPart.correct + correctCount,
    total: currentPart.total + totalCount,
    totalTimeSec: currentPart.totalTimeSec + timeSec,
  };
  
  const estimated = calculateEstimatedScore(updated);
  const todayStr = getPastDateString(0);
  
  updated.scoreHistory = [...updated.scoreHistory];
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
  
  const yesterdayStr = getPastDateString(1);
  if (updated.lastStudyDate === yesterdayStr) {
    updated.streak += 1;
  } else if (updated.lastStudyDate !== todayStr) {
    updated.streak = 1;
  }
  updated.lastStudyDate = todayStr;
  
  return updated;
}
