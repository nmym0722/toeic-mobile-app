import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../services/authContext';
import { syncStatsOnLogin } from '../utils/statsHandler';
import NeoButton from './NeoButton';

export default function AuthScreen() {
  const { signIn, signUp, continueAsGuest } = useAuth();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleAuthSubmit = async () => {
    if (!email || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください。');
      return;
    }

    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isLoginTab) {
        await signIn(email, password);
        await syncStatsOnLogin();
      } else {
        await signUp(email, password);
        setSuccessMessage('アカウントが仮登録されました。確認用メールが送信された場合はメール内のリンクをご確認ください。');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || '認証に失敗しました。入力内容をご確認ください。');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerBadge}>Welcome</Text>
          <Text style={styles.headerTitle}>TOEIC Mobile App</Text>
          <Text style={styles.headerDesc}>
            アプリを利用するには、ログインまたはアカウント登録が必要です。
            登録すると学習履歴がクラウドに保存され、どの端末からでも同じ進捗で学習を再開・アナリティクスを確認できます。
          </Text>
        </View>

        <View style={styles.authCard}>
          <View style={styles.tabContainer}>
            <View style={styles.tabButtonWrapper}>
              <NeoButton
                onPress={() => {
                  setIsLoginTab(true);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                btnStyle={[styles.tabButton, isLoginTab && styles.tabButtonActive]}
                borderRadius={12}
              >
                <Text style={[styles.tabButtonText, isLoginTab && styles.tabButtonTextActive]}>
                  ログイン
                </Text>
              </NeoButton>
            </View>
            
            <View style={styles.tabButtonWrapper}>
              <NeoButton
                onPress={() => {
                  setIsLoginTab(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                btnStyle={[styles.tabButton, !isLoginTab && styles.tabButtonActive]}
                borderRadius={12}
              >
                <Text style={[styles.tabButtonText, !isLoginTab && styles.tabButtonTextActive]}>
                  新規登録
                </Text>
              </NeoButton>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successBoxText}>{successMessage}</Text>
            </View>
          ) : null}

          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>メールアドレス</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>パスワード</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <NeoButton
              onPress={handleAuthSubmit}
              btnStyle={styles.submitButton}
              borderRadius={16}
            >
              {authLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLoginTab ? 'ログインする' : '新規登録する'}
                </Text>
              )}
            </NeoButton>
          </View>
        </View>

        {/* ゲストとして続けるボタン */}
        <View style={styles.guestSection}>
          <View style={styles.guestDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>または</Text>
            <View style={styles.dividerLine} />
          </View>
          <NeoButton
            onPress={continueAsGuest}
            btnStyle={styles.guestButton}
            borderRadius={16}
          >
            <Text style={styles.guestButtonText}>ゲストとして続ける（登録なし）</Text>
          </NeoButton>
          <Text style={styles.guestNote}>
            ゲストモードでは学習データはこの端末にのみ保存されます。クラウド同期はできません。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 24,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 24 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
    paddingBottom: 20,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#DFD8CC',
    color: '#7C756B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1C1C1E',
    marginTop: 8,
  },
  headerDesc: {
    fontSize: 13,
    color: '#7C756B',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '600',
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    gap: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButtonWrapper: {
    flex: 1,
  },
  tabButton: {
    backgroundColor: '#F3EFE6',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 12,
    width: '100%',
  },
  tabButtonActive: {
    backgroundColor: '#93C1C1',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7C756B',
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  formContainer: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C756B',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  textInput: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1C1C1E',
  },
  submitButton: {
    backgroundColor: '#378F8F',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 14,
    marginTop: 16,
    width: '100%',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#E88B8B',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
  },
  errorBoxText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  successBox: {
    backgroundColor: '#93C1C1',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
  },
  successBoxText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  guestSection: {
    gap: 12,
    paddingBottom: 8,
  },
  guestDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DFD8CC',
  },
  dividerText: {
    fontSize: 12,
    color: '#7C756B',
    fontWeight: 'bold',
  },
  guestButton: {
    backgroundColor: '#EBE5D8',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 14,
    width: '100%',
  },
  guestButtonText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  guestNote: {
    fontSize: 11,
    color: '#7C756B',
    textAlign: 'center',
    lineHeight: 16,
  },
});
