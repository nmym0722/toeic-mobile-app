const fs = require('fs');
const path = require('path');

// コマンドライン引数の解析
const args = process.argv.slice(2);
let vaultPath = '';
let jsonPath = '';

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--vault' || args[i] === '-v') && args[i + 1]) {
    vaultPath = args[i + 1];
    i++;
  } else if ((args[i] === '--json' || args[i] === '-j') && args[i + 1]) {
    jsonPath = args[i + 1];
    i++;
  }
}

if (!vaultPath) {
  console.error('エラー: Obsidian保管庫のパスが指定されていません。');
  console.log('\n使用方法:');
  console.log('  node scripts/sync_reports_to_obsidian.js --vault <Obsidianのフォルダパス>');
  console.log('\nオプション:');
  console.log('  --vault, -v   : 出力先のObsidianのフォルダパス（必須）');
  console.log('  --json, -j    : エクスポートした報告履歴JSONファイルからインポートする場合のパス（オプション）');
  process.exit(1);
}

// フォルダの存在確認
if (!fs.existsSync(vaultPath)) {
  console.error(`エラー: 指定されたObsidianフォルダが存在しません: ${vaultPath}`);
  process.exit(1);
}

// マークダウンファイル生成ヘルパー
function writeReportToMarkdown(report, outputDir) {
  const dateObj = new Date(report.created_at || report.timestamp);
  const formattedDate = dateObj.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const fileDateStr = dateObj.toISOString().replace(/[:.]/g, '-');
  const filename = `TOEIC_Feedback_${report.question_id || report.questionId || 'unknown'}_${fileDateStr}.md`;
  const fullPath = path.join(outputDir, filename);

  const sanitizedTag = (report.question_type || report.questionType || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  const markdownContent = `---
id: "${report.question_id || report.questionId || 'unknown'}"
type: "${report.question_type || report.questionType || 'unknown'}"
category: "${report.report_category || report.category || 'other'}"
created_at: "${report.created_at || report.timestamp}"
status: "new"
tags:
  - toeic-app/feedback
  - ${sanitizedTag}
---
# TOEIC 問題エラー報告: ${report.question_id || report.questionId || '不明'}

- **対象問題ID**: \`${report.question_id || report.questionId || '不明'}\` (${report.question_type || report.questionType || '未分類'})
- **報告カテゴリ**: ${report.report_category || report.category || 'その他'}
- **報告日時**: ${formattedDate}

## 問題内容
${report.question_text || report.questionText || '（問題文なし）'}

## 報告内容
> ${report.description ? report.description.replace(/\n/g, '\n> ') : '（詳細説明なし）'}
`;

  fs.writeFileSync(fullPath, markdownContent, 'utf8');
  console.log(`保存完了: ${filename}`);
}

// メイン同期処理
async function run() {
  // 1. JSONファイルからインポートする場合
  if (jsonPath) {
    if (!fs.existsSync(jsonPath)) {
      console.error(`エラー: 指定されたJSONファイルが見つかりません: ${jsonPath}`);
      return;
    }

    try {
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const reports = JSON.parse(rawData);
      console.log(`JSONから ${reports.length} 件の報告を読み込みました。`);
      
      let count = 0;
      for (const report of reports) {
        writeReportToMarkdown(report, vaultPath);
        count++;
      }
      console.log(`\n同期成功: ${count} 件のマークダウンファイルを ${vaultPath} に作成しました。`);
    } catch (e) {
      console.error('JSONパースエラー:', e);
    }
    return;
  }

  // 2. Supabaseから動的に同期する場合
  console.log('Supabase接続情報を解析中...');
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  
  try {
    const supabaseJsPath = path.join(__dirname, '../src/services/supabase.js');
    if (fs.existsSync(supabaseJsPath)) {
      const content = fs.readFileSync(supabaseJsPath, 'utf8');
      const urlMatch = content.match(/const\s+supabaseUrl\s*=\s*['"]([^'"]+)['"]/);
      const keyMatch = content.match(/const\s+supabaseAnonKey\s*=\s*['"]([^'"]+)['"]/);
      if (urlMatch) supabaseUrl = urlMatch[1];
      if (keyMatch) supabaseAnonKey = keyMatch[1];
    }
  } catch (e) {
    console.warn('supabase.js の解析に失敗しました:', e.message);
  }

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    console.error('エラー: Supabaseへの有効な接続情報が supabase.js から検出できませんでした。');
    console.log('代わりにアプリからエクスポートしたJSONファイルを使用して同期してください。');
    console.log('使用例: node scripts/sync_reports_to_obsidian.js --vault <Vaultパス> --json <JSONファイルパス>');
    return;
  }

  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log('Supabaseから問題報告データをダウンロード中...');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: reports, error } = await supabase
      .from('question_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!reports || reports.length === 0) {
      console.log('同期する報告データはありませんでした。');
      return;
    }

    console.log(`${reports.length} 件の報告を取得しました。Obsidianに保存中...`);
    
    let count = 0;
    for (const report of reports) {
      writeReportToMarkdown(report, vaultPath);
      count++;
    }
    console.log(`\n同期成功: ${count} 件のマークダウンファイルを ${vaultPath} に作成しました。`);

  } catch (e) {
    console.error('Supabaseからの同期中にエラーが発生しました:', e.message);
    console.log('\n※ 注意: @supabase/supabase-js がローカルの node_modules にインストールされている必要があります。');
    console.log('インストールされていない場合は、`npm install` を実行してください。');
    console.log('\nまたは、JSONファイルを使用したローカルインポートを利用してください。');
  }
}

run();
