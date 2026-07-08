import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_KEY = 'toeic_bookmarked_questions';

/**
 * ブックマーク一覧を取得する
 * @returns {Promise<Array>}
 */
export async function getBookmarks() {
  try {
    const json = await AsyncStorage.getItem(BOOKMARKS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to get bookmarks:', e);
    return [];
  }
}

/**
 * 問題をブックマークに追加する
 * @param {Object} question - 問題データオブジェクト
 * @param {number} part - パート番号 (例: 5)
 * @param {number|string} level - 難易度レベル
 * @returns {Promise<Array>} 更新後のブックマーク一覧
 */
export async function addBookmark(question, part, level) {
  try {
    const bookmarks = await getBookmarks();
    if (bookmarks.some((b) => b.id === question.id)) {
      return bookmarks; // すでに登録されている場合はそのまま返す
    }
    const newBookmark = {
      id: question.id,
      part: part,
      level: level,
      question: question,
      timestamp: Date.now(),
    };
    const updated = [newBookmark, ...bookmarks];
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to add bookmark:', e);
    return [];
  }
}

/**
 * 指定されたIDの問題をブックマークから削除する
 * @param {string} questionId - 削除対象の問題ID
 * @returns {Promise<Array>} 更新後のブックマーク一覧
 */
export async function removeBookmark(questionId) {
  try {
    const bookmarks = await getBookmarks();
    const updated = bookmarks.filter((b) => b.id !== questionId);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove bookmark:', e);
    return [];
  }
}

/**
 * 指定されたIDの問題がブックマークされているか判定する
 * @param {string} questionId
 * @returns {Promise<boolean>}
 */
export async function isBookmarked(questionId) {
  try {
    const bookmarks = await getBookmarks();
    return bookmarks.some((b) => b.id === questionId);
  } catch (e) {
    console.error('Failed to check bookmark:', e);
    return false;
  }
}
