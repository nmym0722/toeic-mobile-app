import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabLayout() {
  return (
    <MaterialTopTabs
      id="tab-navigator"
      tabBarPosition="bottom"
      screenOptions={{
        tabBarActiveTintColor: '#378F8F', // ミントグリーン
        tabBarInactiveTintColor: '#7C756B', // グレー・ベージュ
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowIcon: true, // アイコン表示を有効化
        tabBarIndicatorStyle: { height: 0 }, // 選択中のインジケータを非表示に
        tabBarPressColor: 'transparent', // タップ時の波紋を消す
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="words"
        options={{
          title: '単語',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={22} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="listening"
        options={{
          title: 'リスニング',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "headset" : "headset-outline"} size={22} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="reading"
        options={{
          title: 'リーディング',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "document-text" : "document-text-outline"} size={22} color={color} />
          ),
        }}
      />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 3,
    borderTopColor: '#1C1C1E', // 太枠境界線
    height: Platform.OS === 'ios' ? 90 : 75, // iOSの場合は高さを90にしてホームインジケータの干渉を防ぐ
    paddingBottom: Platform.OS === 'ios' ? 28 : 12, // iOSの下部余白を28に広げる
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
