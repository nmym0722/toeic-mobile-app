# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Web PWA デプロイルール
ユーザーから「変更をデプロイして」や「デプロイして」と指示された場合は、以下のステップを自動的に実行してください：
1. `npm run build:web` を実行してWebアプリ（PWA）をビルドする。
2. `git add .` を実行し、変更内容に応じたコミットメッセージで `git commit` を作成する。
3. `git push origin main`（または現在の追従ブランチ）を実行してGitHubにプッシュし、Vercelの自動デプロイをトリガーする。
