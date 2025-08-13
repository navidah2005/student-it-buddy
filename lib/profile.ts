// lib/profile.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_NAME_KEY = 'profile:name';
const PROFILE_AVATAR_KEY = 'profile:avatar'; // uri string

export async function getProfile() {
  const [name, avatarUri] = await Promise.all([
    AsyncStorage.getItem(PROFILE_NAME_KEY),
    AsyncStorage.getItem(PROFILE_AVATAR_KEY),
  ]);
  return { name: name || 'Guest', avatarUri: avatarUri || '' };
}

export async function setProfileName(name: string) {
  await AsyncStorage.setItem(PROFILE_NAME_KEY, name);
}

export async function setProfileAvatar(uri: string) {
  await AsyncStorage.setItem(PROFILE_AVATAR_KEY, uri);
}