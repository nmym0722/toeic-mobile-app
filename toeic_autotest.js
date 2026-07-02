/**
 * TOEIC App Automated Test - Final Version
 * フロー: 選択肢クリック → Nextボタン → 繰り返し → 全問完了でFinish
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const APP_URL = 'http://localhost:8081';
let screenshotIndex = 0;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function shot(page, name) {
  screenshotIndex++;
  const fname = `${String(screenshotIndex).padStart(2, '0')}_${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, fname), fullPage: true });
  console.log(`📸 ${fname}`);
}

async function clickText(page, text, timeout = 4000) {
  try {
    await page.getByText(text, { exact: false }).first().click({ timeout });
    return true;
  } catch { return false; }
}

// ===== メイン：1セッション分の問題を全問解答 =====
async function answerAllInSession(page, label) {
  console.log(`\n🎯 [${label}] Answering...`);
  let qCount = 0;

  for (let cycle = 0; cycle < 30; cycle++) {
    await sleep(700);

    // ─── 1. 「Finish」ボタン（全問完了）があればセッション終了 ───
    try {
      const finish = page.getByRole('button', { name: 'Finish' });
      if (await finish.isVisible({ timeout: 500 })) {
        console.log(`  🏁 Finish button found after ${qCount} Qs`);
        await finish.click();
        await sleep(2000);
        return qCount;
      }
    } catch {}

    // ─── 2. 「Next」ボタンがあれば押して次の問題へ ───
    try {
      const next = page.getByRole('button', { name: 'Next' });
      if (await next.isVisible({ timeout: 500 })) {
        await next.click();
        console.log(`  ⏭️  Next → Q${qCount + 1}`);
        await sleep(600);
        continue;
      }
    } catch {}

    // ─── 3. 選択肢をクリック（A./B./C./D. 形式） ───
    let answered = false;

    // 戦略A: "A. text" "B. text" パターンのボタン
    try {
      const btns = page.locator('[role="button"]');
      const count = await btns.count();
      for (let i = 0; i < count; i++) {
        const b = btns.nth(i);
        const txt = (await b.textContent().catch(() => '')).trim();
        if (/^[A-D][\.\)]\s+\S/.test(txt)) {
          if (await b.isVisible({ timeout: 300 })) {
            await b.click();
            qCount++;
            answered = true;
            process.stdout.write(`  ✔ Q${qCount}:"${txt.substring(0, 25)}" `);
            await sleep(400);
            break;
          }
        }
      }
    } catch {}

    // 戦略B: ラベル "A"/"B"/"C"/"D" 付き丸アイコン → 親コンテナクリック
    if (!answered) {
      try {
        for (const lbl of ['A', 'B', 'C', 'D']) {
          const candidates = page.locator(`text="${lbl}"`);
          const n = await candidates.count();
          for (let i = 0; i < n; i++) {
            const el = candidates.nth(i);
            const box = await el.boundingBox().catch(() => null);
            if (!box) continue;
            // 小さい丸ラベルである（幅・高さ 40px 以下）
            if (box.width <= 50 && box.height <= 50 && await el.isVisible({ timeout: 200 })) {
              // 親要素をクリック
              await el.locator('..').click().catch(() => el.click());
              qCount++;
              answered = true;
              process.stdout.write(`  ✔ Q${qCount}(lbl:${lbl}) `);
              await sleep(400);
              break;
            }
          }
          if (answered) break;
        }
      } catch {}
    }

    // 戦略C: Part5/6/7 のラジオ的選択肢（文章が長め）
    if (!answered) {
      try {
        const btns = page.locator('[role="button"]');
        const count = await btns.count();
        const skipWords = ['Menu', '← Menu', '学習', '単語', 'マイページ', 'Next', 'Finish',
          'ログイン', '戻る', 'Skip', 'ゲスト', '初期化', 'ログアウト', 'Start', 'スタート',
          'LISTENING', 'READING', 'TOEIC', 'Photographs', 'Question-Response', 'Conversations',
          'Talks', 'Sentence', 'Text Completion', 'Reading Comprehension', '1.0x'];
        for (let i = 0; i < count; i++) {
          const b = btns.nth(i);
          const txt = (await b.textContent().catch(() => '')).trim();
          const skip = skipWords.some(w => txt.includes(w));
          if (!skip && txt.length >= 5 && txt.length <= 250) {
            if (await b.isVisible({ timeout: 200 })) {
              await b.click();
              qCount++;
              answered = true;
              process.stdout.write(`  ✔ Q${qCount}(C:"${txt.substring(0, 20)}") `);
              await sleep(400);
              break;
            }
          }
        }
      } catch {}
    }

    if (!answered) {
      if (cycle % 5 === 4) console.log(`\n  ⚠️ cycle ${cycle + 1}: no action`);
      if (cycle > 28) break;
    }
  }

  console.log(`\n  📊 Done: ${qCount} answered`);
  return qCount;
}

async function goToTab(page, index) {
  try {
    const tabs = page.locator('[role="tab"]');
    await tabs.nth(index).click({ timeout: 3000 });
    await sleep(1500);
  } catch {}
}

async function setupReading(page) {
  await sleep(1000);
  await clickText(page, 'すべて (All)', 2000) ||
    await clickText(page, 'すべて', 2000);
  await sleep(500);
  await clickText(page, '10問', 2000) ||
    await clickText(page, '10', 2000);
  await sleep(500);
  await clickText(page, 'スタート', 2000) ||
    await clickText(page, 'Start', 2000);
  await sleep(1500);
}

async function returnToMenu(page) {
  for (const t of ['← Menu', 'Menu', 'ダッシュボードへ戻る', '学習メニューへ']) {
    if (await clickText(page, t, 1500)) { await sleep(1500); return; }
  }
  await goToTab(page, 0);
}

// ===================== MAIN =====================
async function main() {
  console.log('🚀 TOEIC Autotest – Final Version\n');

  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    // ── 1. アプリ起動 ──
    console.log('📱 Loading app...');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(9000);   // DB接続チェック完了を待機
    await shot(page, 'app_start');

    // ── 2. ゲストログイン ──
    console.log('\n👤 Guest login...');
    await clickText(page, 'ゲストとして続ける（登録なし）', 5000) ||
      await clickText(page, 'ゲストとして続ける', 5000) ||
      await clickText(page, 'Skip (Offline Mode)', 5000);
    await sleep(2500);
    await shot(page, 'after_guest');

    const menuOk = await page.getByText('学習メニュー').isVisible().catch(() => false);
    console.log(`  Study menu: ${menuOk ? '✅' : '⚠️ not visible'}`);

    // ── 3. データ初期化 ──
    console.log('\n🗑️  Reset data...');
    await goToTab(page, 2);   // マイページ (3番目タブ)
    await sleep(1500);
    await shot(page, 'profile_before_reset');
    if (await clickText(page, '学習データの初期化', 3000)) {
      await sleep(700);
      await clickText(page, '初期化', 2000) || await page.keyboard.press('Enter');
      await sleep(2500);
      console.log('  ✅ Reset OK');
    }
    await shot(page, 'analytics_zeroed');

    // ── 4. セッション群 ──
    const sessions = [
      { label: 'Part1 R1', tab: 0, click: 'Photographs (Part 1)' },
      { label: 'Part5 R1', tab: 0, click: 'Sentence Completion (Part 5)', reading: true },
      { label: 'Part2 R1', tab: 0, click: 'Question-Response (Part 2)' },
      { label: 'Part6 R1', tab: 0, click: 'Text Completion (Part 6)', reading: true },
      { label: 'Part1 R2', tab: 0, click: 'Photographs (Part 1)' },
      { label: 'Part5 R2', tab: 0, click: 'Sentence Completion (Part 5)', reading: true },
      { label: 'Part3 R1', tab: 0, click: 'Conversations (Part 3)' },
    ];

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      console.log(`\n📚 [${i+1}/${sessions.length}] ${s.label}`);

      await goToTab(page, s.tab);
      await sleep(800);
      await clickText(page, s.click, 5000);
      await sleep(1800);

      if (s.reading) await setupReading(page);
      await shot(page, `session_${i+1}_${s.label.replace(/\s/g,'_')}_start`);

      const answered = await answerAllInSession(page, s.label);
      await shot(page, `session_${i+1}_${s.label.replace(/\s/g,'_')}_end`);
      await returnToMenu(page);
    }

    // ── 5. アナリティクス確認 ──
    console.log('\n📊 Analytics check...');
    await goToTab(page, 2);
    await sleep(2500);

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(400);
    await shot(page, 'analytics_01_top');

    for (let s = 1; s <= 6; s++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await sleep(400);
      await shot(page, `analytics_0${s+1}_scroll`);
    }

    // テキスト抽出
    const txt = await page.evaluate(() => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const lines = [];
      while (w.nextNode()) {
        const t = w.currentNode.textContent.trim();
        if (t) lines.push(t);
      }
      return lines.join('\n');
    });

    console.log('\n' + '='.repeat(60));
    console.log('ANALYTICS TEXT:');
    console.log('='.repeat(60));
    console.log(txt.substring(0, 5000));
    console.log('='.repeat(60));

    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'analytics.txt'), txt, 'utf8');
    console.log('\n✅ All done!');
    console.log('📁', SCREENSHOTS_DIR);

  } catch (e) {
    console.error('❌', e.message);
    try { await shot(page, 'error'); } catch {}
  } finally {
    await sleep(5000);
    await browser.close();
  }
}

main().catch(console.error);
