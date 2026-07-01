import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NeoButton from '../../src/components/NeoButton';

export default function ReadingMenuTabScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerBadge}>Reading Section</Text>
          <Text style={styles.headerTitle}>Reading (Part 5 - 7)</Text>
          <Text style={styles.headerDesc}>文法・長文読解問題のトレーニング</Text>
        </View>

        {/* Part 5 Button */}
        <NeoButton
          onPress={() => router.push('/reading/part5')}
          btnStyle={styles.menuBtn}
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="create-outline" size={32} color="#378F8F" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Sentence Completion (Part 5)</Text>
              <Text style={styles.menuDesc}>
                語彙や品詞、時制など問題タイプと問題数を選択して、短文穴埋め問題を練習します。
              </Text>
            </View>
          </View>
        </NeoButton>

        {/* Part 6 Button */}
        <NeoButton
          onPress={() => router.push('/reading/part6')}
          btnStyle={styles.menuBtn}
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="document-text-outline" size={32} color="#378F8F" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Text Completion (Part 6)</Text>
              <Text style={styles.menuDesc}>
                まとまった長文内の空欄に、適切な語句や文を挿入する長文穴埋め問題に挑戦します。
              </Text>
            </View>
          </View>
        </NeoButton>

        {/* Part 7 Button */}
        <NeoButton
          onPress={() => router.push('/reading/part7')}
          btnStyle={styles.menuBtn}
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="book-outline" size={32} color="#378F8F" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Reading Comprehension (Part 7)</Text>
              <Text style={styles.menuDesc}>
                Eメール、広告、記事などの様々な英文を読み、内容に関する読解問題に回答します。
              </Text>
            </View>
          </View>
        </NeoButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 24 : 16, // iOS上部のダイナミックアイランド対策
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
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
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    marginTop: 8,
  },
  headerDesc: {
    fontSize: 13,
    color: '#7C756B',
    marginTop: 4,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
    paddingBottom: 40,
  },
  menuBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 20,
    width: '100%',
  },
  menuBtnContent: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    alignItems: 'center',
  },
  menuLeft: {
    justifyContent: 'center',
    width: 40,
    alignItems: 'center',
  },
  menuRight: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'left',
  },
  menuDesc: {
    fontSize: 11,
    color: '#7C756B',
    lineHeight: 16,
    textAlign: 'left',
  },
});
