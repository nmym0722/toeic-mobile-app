import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ListeningScreen from '../src/components/ListeningScreen';

export default function ListeningDetailScreen() {
  const router = useRouter();
  const { part } = useLocalSearchParams();
  const partIdNum = part ? parseInt(part as string, 10) : null;
  
  return (
    <ListeningScreen initialPartId={partIdNum} onBackPortal={() => router.back()} />
  );
}
