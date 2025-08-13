import React, { useEffect } from 'react';
import { Animated, Text, View } from 'react-native';

export default function Toast({ text, onDone }: { text: string; onDone?: () => void }) {
  const fade = new Animated.Value(0);
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start(onDone);
  }, []);
  return (
    <Animated.View style={{ position:'absolute', bottom: 24, left: 0, right: 0, alignItems:'center', opacity: fade }}>
      <View style={{ backgroundColor:'#111827', borderColor:'#334155', borderWidth:1, paddingHorizontal:12, paddingVertical:8, borderRadius:12 }}>
        <Text style={{ color:'#e5e7eb', fontWeight:'700' }}>{text}</Text>
      </View>
    </Animated.View>
  );
}
