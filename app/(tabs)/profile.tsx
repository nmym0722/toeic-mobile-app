import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
  Share,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/services/authContext';
import NeoButton from '../../src/components/NeoButton';
import AnalyticsScreen from '../../src/components/AnalyticsScreen';
import { resetAllStats } from '../../src/utils/statsHandler';
import { getErrorReports, generateObsidianMarkdown, clearErrorReports } from '../../src/services/errorReportService';
import { getBookmarks, removeBookmark } from '../../src/services/bookmarkService';

export default function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [reports, setReports] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  const loadReports = async () => {
    const data = await getErrorReports();
    setReports(data);
  };

  const loadBookmarks = async () => {
    const data = await getBookmarks();
    setBookmarks(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadReports();
      loadBookmarks();
    }, [])
  );

  const handleResetStats = () => {
    const message = 'これまでのテストスコア、単語進捗、学習履歴を含むすべての統計データを初期化します。よろしいですか？この操作は取り消せません。';
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        executeReset();
      }
    } else {
      Alert.alert(
        'データの初期化',
        message,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '初期化',
            style: 'destructive',
            onPress: executeReset,
          },
        ]
      );
    }
  };

  const executeReset = async () => {
    try {
      await resetAllStats();
      setRefreshKey(prev => prev + 1);
      if (Platform.OS === 'web') {
        window.alert('学習データを初期化しました。');
      } else {
        Alert.alert('完了', '学習データを初期化しました。');
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('データの初期化に失敗しました。');
      } else {
        Alert.alert('エラー', 'データの初期化に失敗しました。');
      }
    }
  };

  const handleSignOut = async () => {
    const message = 'ログアウトしますか？（ローカルデータは保持されます）';
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        executeSignOut();
      }
    } else {
      Alert.alert(
        'ログアウト',
        message,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'ログアウト',
            style: 'destructive',
            onPress: executeSignOut,
          },
        ]
      );
    }
  };

  const executeSignOut = async () => {
    try {
      await signOut();
      router.replace('/(tabs)');
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('ログアウトに失敗しました。');
      } else {
        Alert.alert('エラー', 'ログアウトに失敗しました。');
      }
    }
  };

  const handleShareReport = async (report) => {
    const markdown = generateObsidianMarkdown(report);
    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(markdown);
          window.alert('Obsidian用のMarkdownをクリップボードにコピーしました！\nObsidianにそのままペーストして保存できます。');
        } else {
          window.alert('お使いのブラウザはクリップボードへのコピーに対応していません。');
        }
      } else {
        await Share.share({
          message: markdown,
          title: `TOEIC Error Report - ${report.questionId}`,
        });
      }
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const downloadAllMarkdown = () => {
    if (Platform.OS !== 'web') return;
    const content = reports.map(generateObsidianMarkdown).join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TOEIC_Reports_${new Date().toISOString().split('T')[0]}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearReports = () => {
    const message = 'これまでに作成されたすべての間違い報告履歴を削除します。よろしいですか？（Supabase上のデータは削除されません）';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        executeClearReports();
      }
    } else {
      Alert.alert(
        '報告履歴の削除',
        message,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '削除', style: 'destructive', onPress: executeClearReports },
        ]
      );
    }
  };

  const executeClearReports = async () => {
    await clearErrorReports();
    loadReports();
  };

  const renderBookmarksSection = () => {
    return (
      <View style={styles.bookmarksSection}>
        <TouchableOpacity
          onPress={() => router.push('/bookmarks')}
          style={styles.bookmarkMenuBtn}
          activeOpacity={0.7}
        >
          <View style={styles.bookmarkMenuContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.bookmarkMenuIconBg}>
                <Ionicons name="bookmark" size={18} color="#378F8F" />
              </View>
              <Text style={styles.bookmarkMenuText}>ブックマークした問題</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.bookmarkMenuCount}>{bookmarks.length}件</Text>
              <Ionicons name="chevron-forward" size={16} color="#7C756B" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderReportsSection = () => {
    if (reports.length === 0) return null;

    return (
      <View style={styles.reportsSection}>
        <View style={styles.reportsHeaderRow}>
          <Text style={styles.reportsSectionTitle}>間違い報告履歴 ({reports.length}件)</Text>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={downloadAllMarkdown} style={styles.downloadAllBtn}>
              <Ionicons name="download-outline" size={16} color="#378F8F" />
              <Text style={styles.downloadAllText}>一括DL (.md)</Text>
            </TouchableOpacity>
          )}
        </View>

        {reports.map((report) => {
          const dateStr = new Date(report.timestamp).toLocaleDateString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportCardHeader}>
                <View style={styles.reportCardTags}>
                  <Text style={styles.reportPartBadge}>{report.questionType}</Text>
                  <Text style={styles.reportCategoryBadge}>{report.category}</Text>
                </View>
                <Text style={styles.reportDateText}>{dateStr}</Text>
              </View>

              <Text style={styles.reportIdText}>問題ID: {report.questionId}</Text>
              
              <Text style={styles.reportQuestionText} numberOfLines={2}>
                {report.questionText}
              </Text>

              {report.description ? (
                <View style={styles.reportDescBox}>
                  <Text style={styles.reportDescText} numberOfLines={3}>
                    {report.description}
                  </Text>
                </View>
              ) : null}

              <View style={styles.reportCardActions}>
                <NeoButton
                  onPress={() => handleShareReport(report)}
                  btnStyle={styles.shareBtn}
                  style={{ flex: 1 }}
                >
                  <View style={styles.shareBtnInner}>
                    <Ionicons name="share-social-outline" size={14} color="#7C756B" style={{ marginRight: 4 }} />
                    <Text style={styles.shareBtnText}>Obsidian用コピー/共有</Text>
                  </View>
                </NeoButton>
              </View>
            </View>
          );
        })}

        <NeoButton
          onPress={handleClearReports}
          btnStyle={styles.clearReportsBtn}
          style={{ marginTop: 16 }}
        >
          <Text style={styles.clearReportsBtnText}>報告履歴をクリア</Text>
        </NeoButton>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#93C1C1" />
      </View>
    );
  }

  // ログイン済み（オンライン）の場合
  if (user) {
    const profileHeader = (
      <View style={{ width: '100%' }}>
        <View style={styles.profileHeaderCard}>
          <Text style={styles.headerBadge}>Account Connected</Text>
          <Text style={styles.profileTitle}>マイページ</Text>
          <Text style={styles.profileEmail}>ログイン中: {user.email}</Text>
          
          <View style={styles.profileActions}>
            <NeoButton
              onPress={handleSignOut}
              style={{ width: '100%' }}
              btnStyle={styles.logoutButton}
            >
              <Text style={styles.logoutButtonText}>ログアウト</Text>
            </NeoButton>
            <NeoButton
              onPress={handleResetStats}
              style={{ width: '100%', marginTop: 16 }}
              btnStyle={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>学習データの初期化</Text>
            </NeoButton>
          </View>
        </View>
        {renderBookmarksSection()}
        {renderReportsSection()}
      </View>
    );

    return (
      <SafeAreaView style={styles.container}>
        <AnalyticsScreen
          key={refreshKey}
          headerComponent={profileHeader}
          onBackPortal={() => router.push('/(tabs)')}
        />
      </SafeAreaView>
    );
  }

  // 未ログイン（オフライン／ゲストモード）の場合
  const guestHeader = (
    <View style={{ width: '100%' }}>
      <View style={styles.profileHeaderCard}>
        <Text style={[styles.headerBadge, styles.offlineBadge]}>Offline Mode</Text>
        <Text style={styles.profileTitle}>ゲストモード</Text>
        <Text style={styles.profileEmail}>
          現在オフラインモードで起動しています。データのクラウド同期機能を利用するには、インターネット接続を確認してアプリを再起動してください。
        </Text>
        
        <View style={styles.profileActions}>
          <NeoButton
            onPress={handleResetStats}
            style={{ width: '100%' }}
            btnStyle={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>学習データの初期化</Text>
          </NeoButton>
        </View>
      </View>
      {renderBookmarksSection()}
      {renderReportsSection()}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AnalyticsScreen
        key={refreshKey}
        headerComponent={guestHeader}
        onBackPortal={() => router.push('/(tabs)')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
  },
  containerCentered: {
    flex: 1,
    backgroundColor: '#F3EFE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    gap: 8,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#93C1C1',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
  },
  offlineBadge: {
    backgroundColor: '#E88B8B',
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7C756B',
    lineHeight: 20,
  },
  profileActions: {
    marginTop: 12,
  },
  logoutButton: {
    backgroundColor: '#EBE5D8',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#E88B8B',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  reportsSection: {
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  reportsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#378F8F',
  },
  downloadAllText: {
    fontSize: 12,
    color: '#378F8F',
    fontWeight: 'bold',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    gap: 8,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportCardTags: {
    flexDirection: 'row',
    gap: 6,
  },
  reportPartBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#EBE5D8',
    color: '#7C756B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  reportCategoryBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#F7D6D6',
    color: '#CC2534',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  reportDateText: {
    fontSize: 11,
    color: '#9A948C',
    fontWeight: '600',
  },
  reportIdText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  reportQuestionText: {
    fontSize: 13,
    color: '#7C756B',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  reportDescBox: {
    backgroundColor: '#F3EFE6',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  reportDescText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
  },
  reportCardActions: {
    marginTop: 4,
    flexDirection: 'row',
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 8,
  },
  shareBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#7C756B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearReportsBtn: {
    backgroundColor: '#EBE5D8',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 12,
    width: '100%',
  },
  clearReportsBtnText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bookmarksSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  bookmarkMenuBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    overflow: 'hidden',
  },
  bookmarkMenuContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  bookmarkMenuIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(55, 143, 143, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkMenuText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  bookmarkMenuCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7C756B',
    fontFamily: 'MonaSans-Bold',
  },
});
