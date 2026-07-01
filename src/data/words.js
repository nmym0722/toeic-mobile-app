/**
 * TOEIC英単語データ
 * 動的に生成された toeic_words.json から各レベルの単語をロード
 */
import toeicWords from "./toeic_words.json";

// データをレベルごとにマッピング
const wordsData = {
  600: toeicWords.filter(w => w.target_score === 600),
  730: toeicWords.filter(w => w.target_score === 730),
  860: toeicWords.filter(w => w.target_score === 860),
  990: toeicWords.filter(w => w.target_score === 990),
};

/** レベル情報のメタデータ */
export const levelMeta = {
  600: {
    label: "Target 600",
    description: "Basic",
    tagline: "First step to business English",
    wordCount: wordsData[600].length,
  },
  730: {
    label: "Target 730",
    description: "Intermediate",
    tagline: "Practical business vocabulary",
    wordCount: wordsData[730].length,
  },
  860: {
    label: "Target 860",
    description: "Advanced",
    tagline: "Professional business expressions",
    wordCount: wordsData[860].length,
  },
  990: {
    label: "Target 990",
    description: "Master",
    tagline: "Native-level vocabulary",
    wordCount: wordsData[990].length,
  },
};

/**
 * 指定レベルの単語データを取得
 * @param {number} level - 目標スコア（600, 730, 860, 990）
 * @returns {Array} 単語データの配列
 */
export const getWordsByLevel = (level) => {
  return wordsData[level] || [];
};

/**
 * 指定レベルの単語をシャッフルして返す
 * @param {number} level - 目標スコア
 * @param {number} count - 出題数（0 = 全問）
 * @returns {Array} シャッフルされた単語データ
 */
export const getShuffledWords = (level, count = 0) => {
  const words = [...(wordsData[level] || [])];
  // Fisher-Yatesシャッフル
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  if (count > 0 && count < words.length) {
    return words.slice(0, count);
  }
  return words;
};

export default wordsData;
