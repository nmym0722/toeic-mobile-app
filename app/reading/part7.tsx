import React from 'react';
import { useRouter } from 'expo-router';
import Part7Screen from '../../src/components/Part7Screen';

export default function Part7DetailScreen() {
  const router = useRouter();
  
  return (
    <Part7Screen onBackPortal={() => router.back()} />
  );
}
