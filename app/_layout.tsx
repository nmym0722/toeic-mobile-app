import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { supabase } from '../src/services/supabase';
import NeoButton from '../src/components/NeoButton';
import { AuthProvider, useAuth } from '../src/services/authContext';
import AuthScreen from '../src/components/AuthScreen';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}

function RootLayoutContent() {
  const { user, loading: authLoading, isGuest } = useAuth();
  
  const [fontsLoaded, fontError] = useFonts({
    'MonaSans-Regular': require('../assets/fonts/MonaSans-Regular.ttf'),
    'MonaSans-Bold': require('../assets/fonts/MonaSans-Bold.ttf'),
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Bold': DMSans_700Bold,
  });

  const [screen, setScreen] = useState('check_connection'); // 'check_connection' | 'main'
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking' | 'success' | 'failed'
  const [errorMessage, setErrorMessage] = useState('');

  const checkConnection = async () => {
    setConnectionStatus('checking');
    setErrorMessage('');
    
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      if (!supabase) {
        throw new Error('Supabase configuration error. Please update src/services/supabase.js');
      }

      const { error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      setConnectionStatus('success');
      const timer = setTimeout(() => {
        setScreen('main');
      }, 1000);
      return () => clearTimeout(timer);
    } catch (err: any) {
      setConnectionStatus('failed');
      setErrorMessage(err.message || 'Database connection error.');
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.mainCentered}>
          <ActivityIndicator size="large" color="#93C1C1" />
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'check_connection') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.mainCentered}>
          <View style={styles.card}>
            <Text style={[
              styles.badge,
              connectionStatus === 'failed' && styles.badgeFailed,
              connectionStatus === 'success' && styles.badgeSuccess,
            ]}>
              {connectionStatus === 'checking' && 'Checking Connection'}
              {connectionStatus === 'success' && 'Connection Success'}
              {connectionStatus === 'failed' && 'Connection Error'}
            </Text>
            
            <Text style={styles.title}>TOEIC Mobile App</Text>
            
            <View style={styles.statusContainer}>
              {connectionStatus === 'checking' && (
                <View style={styles.statusInner}>
                  <ActivityIndicator size="large" color="#93C1C1" />
                  <Text style={styles.statusText}>Connecting to database...</Text>
                </View>
              )}
              
              {connectionStatus === 'success' && (
                <View style={styles.statusInner}>
                  <View style={[styles.statusIndicator, styles.indicatorSuccess]} />
                  <Text style={styles.statusDescription}>
                    Supabase connection established. Starting app...
                  </Text>
                </View>
              )}

              {connectionStatus === 'failed' && (
                <View style={styles.statusInner}>
                  <View style={[styles.statusIndicator, styles.indicatorFailed]} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}
            </View>

            {connectionStatus === 'failed' && (
              <View style={styles.errorActions}>
                <NeoButton
                  onPress={checkConnection}
                  btnStyle={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Retry Connection</Text>
                </NeoButton>

                <NeoButton
                  onPress={() => setScreen('main')}
                  btnStyle={styles.skipButton}
                >
                  <Text style={styles.skipButtonText}>Skip (Offline Mode)</Text>
                </NeoButton>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 接続チェック完了後の認証ガード（オンライン時のみ、ゲストモードでない場合）
  if (connectionStatus === 'success') {
    if (authLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.mainCentered}>
            <ActivityIndicator size="large" color="#93C1C1" />
          </View>
        </SafeAreaView>
      );
    }

    if (!user && !isGuest) {
      return <AuthScreen />;
    }
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6', // Beige background
  },
  mainCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  badge: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#7C756B',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  badgeSuccess: {
    color: '#378F8F',
  },
  badgeFailed: {
    color: '#CC2534',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 24,
    textAlign: 'center',
  },
  statusContainer: {
    width: '100%',
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  statusInner: {
    alignItems: 'center',
    width: '100%',
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7C756B',
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 16,
  },
  indicatorSuccess: {
    backgroundColor: '#93C1C1',
  },
  indicatorFailed: {
    backgroundColor: '#E88B8B',
  },
  statusDescription: {
    fontSize: 14,
    color: '#7C756B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#7C756B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  errorActions: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#93C1C1',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    width: '100%',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: '#EBE5D8',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    width: '100%',
  },
  skipButtonText: {
    color: '#7C756B',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
