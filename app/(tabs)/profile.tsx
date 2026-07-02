import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/services/authContext';
import NeoButton from '../../src/components/NeoButton';
import AnalyticsScreen from '../../src/components/AnalyticsScreen';
import { saveUserStats, generateInitialStats, resetAllStats } from '../../src/utils/statsHandler';

export default function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

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
      // Supabase・ローカル両方を完全にリセット
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
});
