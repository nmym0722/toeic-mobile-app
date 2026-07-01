import React from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet } from 'react-native';
import ListeningScreen from '../../src/components/ListeningScreen';

export default function ListeningTabScreen() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container}>
      <ListeningScreen onBackPortal={() => router.push('/')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
  },
});

