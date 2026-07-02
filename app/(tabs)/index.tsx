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

export default function StudyMenuScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBadge}>Study Portal</Text>
          <View style={styles.headerTitleRow}>
            <Ionicons name="school" size={24} color="#7C756B" style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>学習メニュー</Text>
          </View>
          <Text style={styles.headerDesc}>TOEIC® 各セクションの演習トレーニング</Text>
        </View>

        {/* --- LISTENING SECTION --- */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="headset" size={18} color="#7C756B" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>LISTENING (Part 1 - 4)</Text>
          </View>
        </View>

        {/* Part 1 */}
        <NeoButton
          onPress={() => router.push('/listening?part=1')}
          btnStyle={styles.menuBtn}
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="camera-outline" size={32} color="#7C756B" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Photographs (Part 1)</Text>
              <Text style={styles.menuDesc}>
                写真描写問題。提示された1枚の写真の内容を最も適切に描写している選択肢を選びます。
              </Text>
            </View>
          </View>
        </NeoButton>

        {/* Part 2 */}
        <NeoButton
          onPress={() => router.push('/listening?part=2')}
          btnStyle={styles.menuBtn}
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="chatbubbles-outline" size={32} color="#7C756B" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Question-Response (Part 2)</Text>
              <Text style={styles.menuDesc}>
                応答問題。短い質問や発言に対する最も適切な返答を3つの選択肢から選びます。
              </Text>
            </View>
          </View>
        </NeoButton>

        {/* Part 3 */}
        <NeoButton
          onPress={() => router.push('/listening?part=3')}
          btnStyle={styles.menuBtn}
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="people-outline" size={32} color="#7C756B" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Conversations (Part 3)</Text>
              <Text style={styles.menuDesc}>
                会話問題。2人または3人の人物による会話を聞き、印刷された質問に対する適切な解答を選びます。
              </Text>
            </View>
          </View>
        </NeoButton>

        {/* Part 4 */}
        <NeoButton
          onPress={() => router.push('/listening?part=4')}
          btnStyle={styles.menuBtn}
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="megaphone-outline" size={32} color="#7C756B" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Talks (Part 4)</Text>
              <Text style={styles.menuDesc}>
                説明文問題。アナウンスやナレーションなどの短い説明文を聞き、質問に解答します。
              </Text>
            </View>
          </View>
        </NeoButton>

        {/* --- READING SECTION --- */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="document-text" size={18} color="#7C756B" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>READING (Part 5 - 7)</Text>
          </View>
        </View>

        {/* Part 5 */}
        <NeoButton
          onPress={() => router.push('/reading/part5')}
          btnStyle={styles.menuBtn}
          shadowColor="#1C1C1E"
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="create-outline" size={32} color="#7C756B" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Sentence Completion (Part 5)</Text>
              <Text style={styles.menuDesc}>
                短文穴埋め問題。語彙や品詞、文法ルールなど問題タイプ別またはランダムで練習します。
              </Text>
            </View>
          </View>
        </NeoButton>

        {/* Part 6 */}
        <NeoButton
          onPress={() => router.push('/reading/part6')}
          btnStyle={styles.menuBtn}
          shadowColor="#1C1C1E"
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="document-text-outline" size={32} color="#7C756B" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Text Completion (Part 6)</Text>
              <Text style={styles.menuDesc}>
                長文穴埋め問題。文章の流れを理解し、適切な語句やセンテンスを挿入する練習をします。
              </Text>
            </View>
          </View>
        </NeoButton>

        {/* Part 7 */}
        <NeoButton
          onPress={() => router.push('/reading/part7')}
          btnStyle={styles.menuBtn}
          shadowColor="#1C1C1E"
        >
          <View style={styles.menuBtnContent}>
            <View style={styles.menuLeft}>
              <Ionicons name="book-outline" size={32} color="#7C756B" />
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuTitle}>Reading Comprehension (Part 7)</Text>
              <Text style={styles.menuDesc}>
                長文読解問題。ビジネス文書やEメール、マルチパッセージの読解スピードと正確性を鍛えます。
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
    paddingTop: Platform.OS === 'ios' ? 16 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DFD8CC',
    marginBottom: 8,
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
    fontFamily: 'DMSans-Bold',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    fontFamily: 'MonaSans-Bold',
  },
  headerDesc: {
    fontSize: 12,
    color: '#7C756B',
    marginTop: 4,
    fontFamily: 'DMSans-Regular',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7C756B',
    textTransform: 'uppercase',
    fontFamily: 'MonaSans-Bold',
  },
  menuBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    padding: 16,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'left',
    fontFamily: 'MonaSans-Bold',
  },
  menuDesc: {
    fontSize: 11,
    color: '#7C756B',
    lineHeight: 16,
    textAlign: 'left',
    fontFamily: 'DMSans-Regular',
  },
});
