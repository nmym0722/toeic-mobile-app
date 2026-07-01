import React from 'react';
import { useRouter } from 'expo-router';
import Part5Screen from '../../src/components/Part5Screen';

export default function Part5DetailScreen() {
  const router = useRouter();
  
  return (
    <Part5Screen onBackPortal={() => router.back()} />
  );
}
