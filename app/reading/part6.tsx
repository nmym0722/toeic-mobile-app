import React from 'react';
import { useRouter } from 'expo-router';
import Part6Screen from '../../src/components/Part6Screen';

export default function Part6DetailScreen() {
  const router = useRouter();
  
  return (
    <Part6Screen onBackPortal={() => router.back()} />
  );
}
