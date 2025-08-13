// app/(auth)/signup.tsx
import { useAuth } from '@/lib/auth';
import * as ImagePicker from 'expo-image-picker';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUp() {
  const { localSignUp } = useAuth();

  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets?.[0]?.uri) setAvatarUri(res.assets[0].uri);
  };

  const removePhoto = () => setAvatarUri(undefined);

  const onCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !city.trim()) {
      return Alert.alert('Missing info', 'Please enter first name, last name, and city.');
    }
    if (!email.trim() && !phone.trim()) {
      return Alert.alert('Contact needed', 'Add at least an email or phone.');
    }
    setLoading(true);
    const { error } = await localSignUp({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      city: city.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      avatarUri,
    });
    setLoading(false);
    if (error) return Alert.alert('Error', error);
    router.replace('/(tabs)/index');
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f7f9fc' }}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.wrap}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.sub}>This creates a local account on this device (cloud later).</Text>

          {/* Avatar */}
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={pickImage}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avaPlaceholder]}><Text style={{ fontSize: 26 }}>🧑‍💻</Text></View>
              )}
            </TouchableOpacity>
            {avatarUri ? (
              <TouchableOpacity onPress={removePhoto} style={styles.smallBtn}><Text>Remove</Text></TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={pickImage} style={styles.smallBtn}><Text>Choose Photo</Text></TouchableOpacity>
            )}
          </View>

          {/* Form */}
          <View style={styles.rowGap}>
            <TextInput style={[styles.input, styles.half]} placeholder="First name" value={firstName} onChangeText={setFirst} returnKeyType="next" />
            <TextInput style={[styles.input, styles.half]} placeholder="Last name" value={lastName} onChangeText={setLast} returnKeyType="next" />
          </View>
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} returnKeyType="next" />
          <TextInput style={styles.input} placeholder="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <TouchableOpacity style={[styles.primary, !(firstName && lastName && city) && { opacity: 0.5 }]} onPress={onCreate} disabled={!firstName || !lastName || !city || loading}>
            <Text style={styles.primaryText}>{loading ? 'Creating…' : 'Create account'}</Text>
          </TouchableOpacity>

          <View style={{ flexDirection:'row', justifyContent:'center', marginTop: 16 }}>
            <Text>Already have an account? </Text>
            <Link href='/(auth)/signin' style={{ color:'#2b6ef2', fontWeight:'800' }}>Sign in</Link>
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
  avatarRow: { flexDirection:'row', alignItems:'center', gap:10, marginBottom: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor:'#ddd' },
  avaPlaceholder: { alignItems:'center', justifyContent:'center' },
  rowGap: { flexDirection:'row', gap: 8 },
  half: { flex:1 },
  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, fontSize:16, marginBottom: 8 },
  primary: { backgroundColor:'#2b6ef2', padding:12, borderRadius:12, alignItems:'center', marginTop:8 },
  primaryText: { color:'white', fontWeight:'700' },
  smallBtn: { backgroundColor:'#eee', paddingHorizontal:10, paddingVertical:8, borderRadius:10 },
});
