import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ERROR_REPORTS_KEY = 'error_reports_history';

/**
 * 問題の誤り報告を保存し、Supabaseが有効な場合は送信を試みる
 */
export const saveErrorReport = async (reportData) => {
  const timestamp = new Date().toISOString();
  const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const fullReport = {
    id,
    timestamp,
    ...reportData,
  };

  // 1. ローカルの AsyncStorage に保存
  try {
    const existingReportsStr = await AsyncStorage.getItem(ERROR_REPORTS_KEY);
    const existingReports = existingReportsStr ? JSON.parse(existingReportsStr) : [];
    existingReports.unshift(fullReport); // 最新が先頭に来るように
    await AsyncStorage.setItem(ERROR_REPORTS_KEY, JSON.stringify(existingReports));
  } catch (e) {
    console.error('Failed to save error report locally:', e);
  }

  // 2. Supabase が有効であれば送信を試みる
  if (supabase) {
    try {
      // ユーザーのログインセッション情報を取得
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const { error } = await supabase.from('question_reports').insert({
        question_id: fullReport.questionId,
        question_type: fullReport.questionType,
        question_text: fullReport.questionText,
        report_category: fullReport.category,
        description: fullReport.description,
        user_id: userId,
        created_at: timestamp,
      });

      if (error) {
        console.warn('Supabase insert warning (likely table does not exist yet):', error.message);
      }
    } catch (e) {
      console.warn('Failed to send error report to Supabase:', e);
    }
  }

  return fullReport;
};

/**
 * 保存された報告履歴をロードする
 */
export const getErrorReports = async () => {
  try {
    const existingReportsStr = await AsyncStorage.getItem(ERROR_REPORTS_KEY);
    return existingReportsStr ? JSON.parse(existingReportsStr) : [];
  } catch (e) {
    console.error('Failed to load error reports:', e);
    return [];
  }
};

/**
 * 報告履歴を全消去する
 */
export const clearErrorReports = async () => {
  try {
    await AsyncStorage.removeItem(ERROR_REPORTS_KEY);
  } catch (e) {
    console.error('Failed to clear error reports:', e);
  }
};

/**
 * Obsidian用のMarkdownテキストを生成する
 */
export const generateObsidianMarkdown = (report) => {
  const formattedDate = new Date(report.timestamp).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const sanitizedTag = (report.questionType || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  return `---
id: "${report.questionId || 'unknown'}"
type: "${report.questionType || 'unknown'}"
category: "${report.category || 'other'}"
created_at: "${report.timestamp}"
status: "new"
tags:
  - toeic-app/feedback
  - ${sanitizedTag}
---
# TOEIC 問題エラー報告: ${report.questionId || '不明'}

- **対象問題ID**: \`${report.questionId || '不明'}\` (${report.questionType || '未分類'})
- **報告カテゴリ**: ${report.category || 'その他'}
- **報告日時**: ${formattedDate}

## 問題内容
${report.questionText || '（問題文なし）'}

## 報告内容
> ${report.description ? report.description.replace(/\n/g, '\n> ') : '（詳細説明なし）'}
`;
};
