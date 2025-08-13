// app/settings.tsx
import { useAuth } from '@/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIV_KEY = 'settings:privacy';

type Privacy = {
  showProfile: boolean;
  allowDMs: boolean;
};

export default function SettingsScreen() {
  const { session, updateProfile } = useAuth();

  const [firstName, setFirst] = useState(session?.firstName || '');
  const [lastName, setLast] = useState(session?.lastName || '');
  const [city, setCity] = useState(session?.city || '');
  const [email, setEmail] = useState(session?.email || '');
  const [phone, setPhone] = useState(session?.phone || '');
  const [avatarUri, setAvatarUri] = useState(session?.avatarUri || '');
  const [privacy, setPrivacy] = useState<Privacy>({ showProfile: true, allowDMs: false });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PRIV_KEY);
        if (raw) setPrivacy(JSON.parse(raw));
      } catch {}
    })();
  }, []);
  const savePrivacy = async (next: Privacy) => {
    setPrivacy(next);
    await AsyncStorage.setItem(PRIV_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    setFirst(session?.firstName || '');
    setLast(session?.lastName || '');
    setCity(session?.city || '');
    setEmail(session?.email || '');
    setPhone(session?.phone || '');
    setAvatarUri(session?.avatarUri || '');
  }, [session]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Please allow photo access.');
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setAvatarUri(res.assets[0].uri);
      await updateProfile({ avatarUri: res.assets[0].uri });
    }
  };

  const removePhoto = async () => {
    setAvatarUri('');
    await updateProfile({ avatarUri: '' });
  };

  const saveAll = async () => {
    if (!session) return Alert.alert('Not signed in', 'Sign in or create an account first.');
    await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      city: city.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    Alert.alert('Saved', 'Settings updated.');
  };

  if (!session) {
    return (
      <SafeAreaView style={{ flex:1, backgroundColor:'#f7f9fc' }}>
        <View style={{ flex:1, padding:16, justifyContent:'center' }}>
          <Text style={{ fontSize:22, fontWeight:'800', marginBottom:6 }}>Settings</Text>
          <Text style={{ color:'#555', marginBottom:14 }}>You’re not signed in.</Text>
          <View style={{ flexDirection:'row', gap:8 }}>
            <Link href='/(auth)/signin' asChild><TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></TouchableOpacity></Link>
            <Link href='/(auth)/signup' asChild><TouchableOpacity style={styles.grayBtn}><Text>Create account</Text></TouchableOpacity></Link>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f7f9fc' }}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.sub}>Change your profile details, avatar, and privacy.</Text>

          {/* avatar */}
          <View style={styles.row}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 26 }}>🧑‍💻</Text></View>
            )}
            <View style={{ gap: 8, marginLeft: 10 }}>
              <TouchableOpacity style={styles.linkBtn} onPress={pickImage}><Text style={styles.linkText}>Change photo</Text></TouchableOpacity>
              {avatarUri ? (
                <TouchableOpacity style={styles.linkBtn} onPress={removePhoto}><Text style={[styles.linkText, { color: '#c00' }]}>Remove photo</Text></TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* details */}
          <View style={styles.rowGap}>
            <TextInput style={[styles.input, styles.half]} placeholder="First name" value={firstName} onChangeText={setFirst} />
            <TextInput style={[styles.input, styles.half]} placeholder="Last name" value={lastName} onChangeText={setLast} />
          </View>
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          <TextInput style={styles.input} placeholder="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <TouchableOpacity style={styles.primary} onPress={saveAll}><Text style={styles.primaryText}>Save changes</Text></TouchableOpacity>

          <View style={styles.divider} />

          {/* privacy */}
          <Text style={styles.sectionTitle}>Privacy</Text>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => savePrivacy({ ...privacy, showProfile: !privacy.showProfile })}
          >
            <Text>Show my profile in Community</Text>
            <Text>{privacy.showProfile ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => savePrivacy({ ...privacy, allowDMs: !privacy.allowDMs })}
          >
            <Text>Allow direct messages</Text>
            <Text>{privacy.allowDMs ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* navigation */}
          <View style={styles.rowGap}>
            <Link href='/(tabs)/profile' asChild><TouchableOpacity style={styles.grayBtn}><Text>Open Profile</Text></TouchableOpacity></Link>
            <Link href='/(tabs)/community' asChild><TouchableOpacity style={styles.grayBtn}><Text>Go to Community</Text></TouchableOpacity></Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800' },
  sub: { color: '#555', marginBottom: 12 },

  row: { flexDirection:'row', alignItems:'center', marginBottom: 12 },
  rowGap: { flexDirection:'row', gap: 8, marginTop: 6 },
  half: { flex: 1 },

  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor:'#ddd' },
  avatarPlaceholder: { alignItems:'center', justifyContent:'center' },

  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, fontSize:16, marginBottom: 8 },

  primary: { backgroundColor:'#2b6ef2', padding:12, borderRadius:12, alignItems:'center', marginTop: 6 },
  primaryText: { color:'white', fontWeight:'700' },
  grayBtn: { backgroundColor:'#eee', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, alignItems:'center' },

  divider: { height: 1, backgroundColor: '#e9ecf3', marginVertical: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8, color: '#111' },

  linkBtn: { backgroundColor: '#eef6ff', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  linkText: { color: '#2b6ef2', fontWeight: '700' },

  toggleRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#fff', borderWidth:1, borderColor:'#e6eaf3', padding:12, borderRadius:10, marginBottom: 8 },
});