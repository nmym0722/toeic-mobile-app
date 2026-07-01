import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabaseの接続情報（必要に応じて本番環境や.envの値に書き換えてください）
const supabaseUrl = 'https://fgxwlqqoqlldvvayzlgm.supabase.co';
const supabaseAnonKey = 'sb_publishable_PsAGQr2rASY0uLA41zXsOg_cVfEQGrS';

// SSR（サーバーサイドビルド時）で window が存在しない場合のエラーを回避するためのカスタムストレージ
const safeStorage = {
  getItem: async (key) => {
    if (typeof window === 'undefined') return null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (typeof window === 'undefined') return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (typeof window === 'undefined') return;
    return AsyncStorage.removeItem(key);
  },
};

// Supabaseクライアントの初期化
// 無効なプレースホルダーURLによるインポート時のクラッシュを避けるため、
// URLが 'http' から始まるときのみクライアントを作成します。
export const supabase = (supabaseUrl && supabaseUrl.startsWith('http'))
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // モバイルアプリ内でのURLからのセッション検出は不要なためfalseに設定
      },
    })
  : null;
