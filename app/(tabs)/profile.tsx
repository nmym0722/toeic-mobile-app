import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/services/authContext';
import NeoButton from '../../src/components/NeoButton';
import AnalyticsScreen from '../../src/components/AnalyticsScreen';

export default function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？（ローカルデータは保持されます）',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (err: any) {
              Alert.alert('エラー', err.message || 'ログアウトに失敗しました。');
            }
          },
        },
      ]
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
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.profileHeaderCard}>
          <Text style={styles.headerBadge}>Account Connected</Text>
          <Text style={styles.profileTitle}>マイページ</Text>
          <Text style={styles.profileEmail}>ログイン中: {user.email}</Text>
          
          <View style={styles.profileActions}>
            <NeoButton
              onPress={handleSignOut}
              btnStyle={styles.logoutButton}
            >
              <Text style={styles.logoutButtonText}>ログアウト</Text>
            </NeoButton>
          </View>
        </View>

        {/* アナリティクスの埋め込み */}
        <View style={{ flex: 1 }}>
          <AnalyticsScreen onBackPortal={() => router.push('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  // 未ログイン（オフライン／ゲストモード）の場合
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileHeaderCard}>
        <Text style={[styles.headerBadge, styles.offlineBadge]}>Offline Mode</Text>
        <Text style={styles.profileTitle}>ゲストモード</Text>
        <Text style={styles.profileEmail}>
          現在オフラインモードで起動しています。データのクラウド同期機能を利用するには、インターネット接続を確認してアプリを再起動してください。
        </Text>
      </View>

      {/* オフラインでもローカルデータからアナリティクスは表示する */}
      <View style={{ flex: 1 }}>
        <AnalyticsScreen onBackPortal={() => router.push('/(tabs)')} />
      </View>
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
    margin: 16,
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
    width: '100%',
  },
  logoutButtonText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
