// app/(tabs)/howto.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  SafeAreaView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import Toast from '@/components/Toast';
import type { Guide, Platform as OS } from '@/lib/guides';
import { getGuide, listCategories, triageGuides } from '@/lib/guides';

const DEVICE_OPTIONS: { key: OS; label: string }[] = [
  { key: 'windows', label: 'Windows' },
  { key: 'macos', label: 'macOS' },
  { key: 'ios', label: 'iPhone/iPad' },
  { key: 'android', label: 'Android' },
];

const STARTER_SUGGESTIONS = [
  'Wi-Fi connected but no internet',
  'Forgot my password',
  'Printer not showing up',
  'Can’t sign into email',
  'Slow laptop performance',
];

const AS_KEY_DEVICE = '@howto:lastDevice';
const AS_KEY_RECENTS = '@howto:recentQueries';
const AS_KEY_FAVS = '@howto:favorites';
const AS_KEY_RECENT_GUIDES = '@howto:recentGuides';

type RecentGuide = { id: string; at: number };

const colors = {
  bg: '#ffffff',
  text: '#0f172a',
  sub: '#475569',
  border: '#e5e7eb',
  chip: '#f1f5f9',
  chipBorder: '#e2e8f0',
  primary: '#2563eb',
  primaryText: '#ffffff',
  muted: '#64748b',
  gold: '#f59e0b',
};

export default function HowToPage() {
  const router = useRouter();

  const guessDevice = (): OS => {
    if (RNPlatform.OS === 'ios') return 'ios';
    if (RNPlatform.OS === 'android') return 'android';
    return 'windows';
  };

  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [device, setDevice] = useState<OS>(guessDevice());
  const [recents, setRecents] = useState<string[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [recentGuides, setRecentGuides] = useState<RecentGuide[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = listCategories();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 220);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    (async () => {
      const d = await AsyncStorage.getItem(AS_KEY_DEVICE);
      if (d) setDevice(d as OS);
      const r = await AsyncStorage.getItem(AS_KEY_RECENTS);
      if (r) setRecents(JSON.parse(r));
      const f = await AsyncStorage.getItem(AS_KEY_FAVS);
      if (f) setFavIds(new Set(JSON.parse(f) as string[]));
      const rg = await AsyncStorage.getItem(AS_KEY_RECENT_GUIDES);
      if (rg) setRecentGuides(JSON.parse(rg));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(AS_KEY_DEVICE, device).catch(() => {});
  }, [device]);

  const matches = useMemo(() => {
    if (!debounced) return [];
    try {
      const base = triageGuides({ text: debounced, device });
      return selectedCategory ? base.filter((g) => g.category === selectedCategory) : base;
    } catch {
      return [];
    }
  }, [debounced, device, selectedCategory]);

  const savedFavorites = useMemo<Guide[]>(() => {
    return Array.from(favIds)
      .map((id) => getGuide(id))
      .filter((g): g is Guide => !!g);
  }, [favIds]);

  const onShareGuide = async (id: string, title: string) => {
    const url = `studentitbuddy://howto/${id}`;
    await Share.share({ title, message: `${title}\nOpen: ${url}` });
    Haptics.selectionAsync();
    setToast('Share sheet opened');
  };

  const onCopyLink = async (id: string) => {
    const url = `studentitbuddy://howto/${id}`;
    await Clipboard.setStringAsync(url);
    Haptics.selectionAsync();
    setToast('Copied!');
  };

  const onUseSuggestion = (q: string) => setText(q);
  const onClear = () => setText('');

  const toggleFav = async (id: string) => {
    setFavIds((prev) => {
      const next = new Set(prev);
      const wasSaved = next.has(id);
      if (wasSaved) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(AS_KEY_FAVS, JSON.stringify(Array.from(next))).catch(() => {});
      Haptics.selectionAsync();
      setToast(wasSaved ? 'Removed from favorites' : 'Saved to favorites');
      return next;
    });
  };

  const openGuide = (id: string) => {
    if (debounced.length > 0) {
      const next = [debounced, ...recents.filter((r) => r !== debounced)].slice(0, 8);
      setRecents(next);
      AsyncStorage.setItem(AS_KEY_RECENTS, JSON.stringify(next)).catch(() => {});
    }
    (async () => {
      const now = Date.now();
      const merged = [{ id, at: now }, ...recentGuides.filter((g) => g.id !== id)].slice(0, 12);
      setRecentGuides(merged);
      await AsyncStorage.setItem(AS_KEY_RECENT_GUIDES, JSON.stringify(merged));
    })();

    router.push({ pathname: '/howto/[id]', params: { id, device } });
  };

  const recentCards = recentGuides;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ padding: 16, gap: 12 }}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Guided Fixer</Text>
              <Text style={{ color: colors.sub }}>
                Describe the problem and pick your device. We’ll suggest the right steps.
              </Text>

              {/* Device chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {DEVICE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setDevice(opt.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Device ${opt.label}`}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: device === opt.key ? colors.primary : colors.chip,
                      borderWidth: 1,
                      borderColor: device === opt.key ? colors.primary : colors.chipBorder,
                    }}
                  >
                    <Text style={{ color: device === opt.key ? colors.primaryText : colors.text, fontWeight: '600' }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Search */}
              <View
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <TextInput
                  placeholder="e.g., My laptop says Wi-Fi connected but no internet"
                  placeholderTextColor={colors.muted}
                  value={text}
                  onChangeText={setText}
                  multiline
                  style={{ color: colors.text, minHeight: 80 }}
                />
                {text.length > 0 && (
                  <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={onClear}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        backgroundColor: colors.chip,
                        borderWidth: 1,
                        borderColor: colors.chipBorder,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '600' }}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Category chips */}
              <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedCategory(null)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: selectedCategory === null ? colors.primary : colors.chip,
                    borderWidth: 1,
                    borderColor: selectedCategory === null ? colors.primary : colors.chipBorder,
                  }}
                >
                  <Text style={{ color: selectedCategory === null ? colors.primaryText : colors.text }}>All</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setSelectedCategory(c === selectedCategory ? null : c)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: selectedCategory === c ? colors.primary : colors.chip,
                      borderWidth: 1,
                      borderColor: selectedCategory === c ? colors.primary : colors.chipBorder,
                    }}
                  >
                    <Text style={{ color: selectedCategory === c ? colors.primaryText : colors.text }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Starters & recent searches */}
              {debounced.length === 0 && (
                <View style={{ marginTop: 6, gap: 8 }}>
                  <Text style={{ color: colors.muted, marginBottom: 4 }}>Try one:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {STARTER_SUGGESTIONS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => onUseSuggestion(s)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor: colors.chip,
                          borderWidth: 1,
                          borderColor: colors.chipBorder,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {recents.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ color: colors.muted, marginBottom: 4 }}>Recent searches</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {recents.map((r) => (
                          <TouchableOpacity
                            key={r}
                            onPress={() => setText(r)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              borderRadius: 12,
                              backgroundColor: '#fff',
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                          >
                            <Text style={{ color: colors.sub }}>{r}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Saved rail */}
            {debounced.length === 0 && savedFavorites.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Saved</Text>
                <FlatList
                  horizontal
                  data={savedFavorites}
                  keyExtractor={(g) => g.id}
                  showsHorizontalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
                  renderItem={({ item }) => (
                    <View
                      style={{
                        width: 280,
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{item.title}</Text>
                        <TouchableOpacity
                          onPress={() => toggleFav(item.id)}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.border,
                            marginLeft: 8,
                            backgroundColor: '#fff',
                          }}
                        >
                          <Text style={{ color: colors.gold }}>★ Saved</Text>
                        </TouchableOpacity>
                      </View>
                      <Text
                        style={{
                          marginTop: 6,
                          color: colors.sub,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: colors.chip,
                          borderWidth: 1,
                          borderColor: colors.chipBorder,
                          alignSelf: 'flex-start',
                          fontSize: 12,
                        }}
                      >
                        {item.category}{item.minutes ? ` • ~${item.minutes} min` : ''}
                      </Text>
                      {!!item.why && <Text style={{ color: colors.sub, marginTop: 6 }}>{item.why}</Text>}
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => openGuide(item.id)}
                          style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 10 }}
                        >
                          <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Open</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onShareGuide(item.id, item.title)}
                          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ color: colors.text, fontWeight: '700' }}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onCopyLink(item.id)}
                          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ color: colors.text, fontWeight: '700' }}>Copy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}

            {/* Recently viewed */}
            {debounced.length === 0 && recentCards.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Recently viewed</Text>
                <FlatList
                  horizontal
                  data={recentCards}
                  keyExtractor={(g) => g.id}
                  showsHorizontalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
                  renderItem={({ item }) => {
                    const g = getGuide(item.id);
                    const title = g?.title ?? item.id;
                    const cat = g?.category;
                    return (
                      <TouchableOpacity
                        onPress={() => openGuide(item.id)}
                        style={{
                          width: 280,
                          backgroundColor: '#fff',
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text, fontWeight: '700' }}>{title}</Text>
                        {cat ? (
                          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{cat}</Text>
                        ) : null}
                        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                          Opened {new Date(item.at).toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

            {/* Results */}
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              {debounced.length === 0 ? (
                <Text style={{ color: colors.muted, paddingHorizontal: 4 }}>Start typing to see possible fixes…</Text>
              ) : matches.length === 0 ? (
                <View style={{ paddingTop: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>No matches found</Text>
                  <Text style={{ color: colors.muted, marginTop: 4 }}>Try different words or change the category.</Text>
                </View>
              ) : (
                <FlatList
                  data={matches}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  renderItem={({ item }) => {
                    const isFav = favIds.has(item.id);
                    return (
                      <View
                        style={{
                          backgroundColor: '#fff',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        {/* top row: title + category + fav */}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>
                            {item.title}
                          </Text>
                          <TouchableOpacity
                            onPress={() => toggleFav(item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
                            style={{
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: colors.border,
                              marginLeft: 8,
                              backgroundColor: '#fff',
                            }}
                          >
                            <Text style={{ color: isFav ? colors.gold : colors.text }}>
                              {isFav ? '★ Saved' : '☆ Save'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* category + minutes */}
                        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            style={{
                              color: colors.sub,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 8,
                              backgroundColor: colors.chip,
                              borderWidth: 1,
                              borderColor: colors.chipBorder,
                              fontSize: 12,
                            }}
                          >
                            {item.category}
                          </Text>
                          {!!item?.minutes && (
                            <Text style={{ color: colors.muted, fontSize: 12 }}>~{item.minutes} min</Text>
                          )}
                        </View>

                        {!!item?.why && <Text style={{ color: colors.sub, marginTop: 6 }}>{item.why}</Text>}

                        {/* actions */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                          <TouchableOpacity
                            onPress={() => openGuide(item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${item.title}`}
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 14,
                              borderRadius: 10,
                              backgroundColor: colors.primary,
                            }}
                          >
                            <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Open</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => onShareGuide(item.id, item.title)}
                            accessibilityRole="button"
                            accessibilityLabel={`Share ${item.title}`}
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 14,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                          >
                            <Text style={{ color: colors.text, fontWeight: '700' }}>Share</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => onCopyLink(item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Copy link to ${item.title}`}
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 14,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                          >
                            <Text style={{ color: colors.text, fontWeight: '700' }}>Copy link</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>

            {/* Contact IT bar */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: 12,
                backgroundColor: colors.bg,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'center',
              }}
            >
              <TouchableOpacity
                onPress={() => Share.share({ message: 'Call IT: +1-555-123-4567' })}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>📞 Call IT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Share.share({ message: 'Email IT: helpdesk@example.edu' })}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>✉️ Email IT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Share.share({ message: 'Status Page: https://status.example.edu' })}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>🟢 Status</Text>
              </TouchableOpacity>
            </View>

            {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
