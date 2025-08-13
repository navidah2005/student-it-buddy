// app/(auth)/signin.tsx
import { useAuth } from '@/lib/auth';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignIn() {
  const { localSignIn } = useAuth();
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [loading, setLoading] = useState(false);

  const onLocalSignIn = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    const { error } = await localSignIn(identifier.trim());
    setLoading(false);
    if (error) return Alert.alert('Sign in failed', error);
    router.replace('/(tabs)/index');
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f7f9fc' }}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.wrap}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to sync your chats & community on this device.</Text>

          <Text style={styles.label}>Email or phone</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com or 5551234567"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onLocalSignIn}
          />

          <TouchableOpacity style={[styles.primary, !identifier.trim() && { opacity: 0.5 }]} onPress={onLocalSignIn} disabled={!identifier.trim() || loading}>
            <Text style={styles.primaryText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: '#e9ecf3', marginVertical: 18 }} />

          <TouchableOpacity style={styles.google} onPress={() => Alert.alert('Coming soon', 'Google sign-in will work when the backend is connected.')}>
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.apple} onPress={() => Alert.alert('Coming soon', 'Apple sign-in will work when the backend is connected.')}>
            <Text style={styles.appleText}>Continue with Apple</Text>
          </TouchableOpacity>

          <View style={{ flexDirection:'row', justifyContent:'center', marginTop: 16 }}>
            <Text>New here? </Text>
            <Link href='/(auth)/signup' style={{ color:'#2b6ef2', fontWeight:'800' }}>Create an account</Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, padding: 16, gap: 10, justifyContent:'center' },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { color:'#555', marginBottom: 8 },
  label: { fontWeight: '700' },
  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, fontSize:16 },
  primary: { backgroundColor:'#2b6ef2', padding:12, borderRadius:12, alignItems:'center', marginTop:8 },
  primaryText: { color:'white', fontWeight:'700' },
  google: { backgroundColor:'#fff', borderWidth:1, borderColor:'#e0e0e0', padding:12, borderRadius:12, alignItems:'center', marginTop: 4 },
  googleText: { fontWeight:'700' },
  apple: { backgroundColor:'#000', padding:12, borderRadius:12, alignItems:'center', marginTop: 10 },
  appleText: { color:'#fff', fontWeight:'700' },
});