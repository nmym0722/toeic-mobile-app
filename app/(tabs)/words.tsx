import React from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet } from 'react-native';
import VocabularyScreen from '../../src/components/VocabularyScreen';

export default function WordsTabScreen() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container}>
      <VocabularyScreen onBackPortal={() => router.push('/')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
  },
});

