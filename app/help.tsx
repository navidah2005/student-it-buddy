// app/help.tsx
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HelpScreen() {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f7f9fc' }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>Help & FAQ</Text>
        <Text style={styles.p}>• How to reset Wi-Fi: open Chat and ask “wifi not connecting”.</Text>
        <Text style={styles.p}>• Tutorials live on Home → Tutorials carousel.</Text>
        <Text style={styles.p}>• Need support? Email us:</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:support@example.com')}>
          <Text style={{ color:'#2b6ef2', fontWeight:'800' }}>support@example.com</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  p: { marginBottom: 8, color: '#444' },
});