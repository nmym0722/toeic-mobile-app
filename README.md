# TOEIC Mobile App

TOEIC学習のためのクロスプラットフォーム・モバイルアプリケーションです。Expo (React Native) と Supabase を使用して構築されています。

## 技術スタック
- **フレームワーク**: Expo (React Native)
- **データベース & 認証**: Supabase
- **音声再生**: `expo-av`
- **ローカルストレージ**: `@react-native-async-storage/async-storage`

## 起動手順

### 1. 依存関係のインストール
初期セットアップは完了していますが、万が一クリーンインストールが必要な場合は以下を実行してください：
```bash
npm install
```

### 2. 環境設定
`src/services/supabase.js` にて、Supabaseの接続情報を設定してください。
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. 開発サーバーの起動
以下のコマンドでExpo開発サーバーを起動し、実機（Expo Goアプリ）やシミュレータで確認できます：
```bash
npx expo start
```
