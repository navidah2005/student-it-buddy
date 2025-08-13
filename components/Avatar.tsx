// components/Avatar.tsx
import React from 'react';
import { Text, View } from 'react-native';

export default function Avatar({
  handle, size = 36, color = '#94a3b8',
}: { handle: string; size?: number; color?: string }) {
  const initial = (handle?.[0] || '?').toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: 999, backgroundColor: color,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    }}>
      <Text style={{ color: 'white', fontWeight: '800' }}>{initial}</Text>
    </View>
  );
}
