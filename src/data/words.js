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

/**
 * 過去の学習履歴（wordProgress）に基づいて、単語の出題確率を重み付けしてランダムサンプリングする
 * @param {number} level - 目標スコア
 * @param {number} count - 出題数（0 = 全問）
 * @param {Object} wordProgress - 過去の単語進捗データ
 * @returns {Array} 重み付きでランダムサンプリングされた単語データ
 */
export const getWeightedWords = (level, count = 0, wordProgress = {}) => {
  const allWords = [...(wordsData[level] || [])];
  if (allWords.length === 0) return [];

  const weakWords = [];
  const normalWords = [];

  allWords.forEach(word => {
    const progress = wordProgress[word.id];
    let correctCount = 0;
    let incorrectCount = 0;
    let knowCount = 0;
    let learnCount = 0;

    if (typeof progress === 'number') {
      correctCount = progress;
    } else if (progress && typeof progress === 'object') {
      correctCount = progress.correctCount || 0;
      incorrectCount = progress.incorrectCount || 0;
      knowCount = progress.knowCount || 0;
      learnCount = progress.learnCount || 0;
    }

    // 苦手単語の判定条件：
    // 過去に「不正解」または「知らない (LEARN)」と回答した履歴があり、
    // かつ「正解」や「知っている (KNOW)」と回答した回数がそれを上回って克服していない場合
    const negativePoints = incorrectCount + learnCount;
    const positivePoints = correctCount + knowCount;

    if (negativePoints > 0 && positivePoints < negativePoints) {
      weakWords.push(word);
    } else {
      normalWords.push(word);
    }
  });

  // Fisher-Yates シャッフル
  const shuffle = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const shuffledWeak = shuffle(weakWords);
  const shuffledNormal = shuffle(normalWords);

  // 出題数が指定されていない場合は全件をマージしてシャッフルして返す
  if (count <= 0) {
    return shuffle([...weakWords, ...normalWords]);
  }

  // 苦手単語を優先して選択する（最大でも全体の70%までとする。残りは通常単語から選ぶことで、新しい単語も学べるようにする）
  const maxWeakCount = Math.min(shuffledWeak.length, Math.ceil(count * 0.7));
  const selectedWeak = shuffledWeak.slice(0, maxWeakCount);

  // 残りの枠を通常単語から補充する
  const remainingCount = count - selectedWeak.length;
  const selectedNormal = shuffledNormal.slice(0, remainingCount);

  // 合体させて最終的に再度シャッフル（苦手単語がテストの前半に固まるのを防ぐため）
  return shuffle([...selectedWeak, ...selectedNormal]);
};

export default wordsData;
