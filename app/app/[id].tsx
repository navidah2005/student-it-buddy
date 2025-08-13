// app/howto/[id].tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Linking,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Toast from '@/components/Toast';
import { logEvent, sendFeedback } from '@/lib/api';
import type { Platform as OS, Step } from '@/lib/guides';
import { buildHybridSteps, getGuide } from '@/lib/guides';

const progressKey = (id: string, device: OS) => `@howto:${id}:${device}:progress`;
const helpfulKey = (id: string, device: OS) => `@howto:${id}:${device}:helpful`;
const cursorKey = (id: string, device: OS) => `@howto:${id}:${device}:cursor`;
const AS_KEY_FAVS = '@howto:favorites';

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
  outline: '#e5e7eb',
};

export default function HowToDetail() {
  const { id, device: deviceParam } = useLocalSearchParams<{ id: string; device?: OS }>();
  const device: OS = (deviceParam as OS) || 'windows';

  const guide = useMemo(() => (id ? getGuide(id) : undefined), [id]);

  // Hybrid mode: base steps + related fixes (DNS flush, renew IP, etc.)
  const baseSteps = useMemo<Step[]>(() => {
    if (!guide) return [];
    return (guide.steps[device] || guide.steps.all || []) as Step[];
  }, [guide, device]);

  const [hybridOn, setHybridOn] = useState(true);
  const steps: Step[] = useMemo(
    () => (guide ? (hybridOn ? buildHybridSteps(guide.id, device, baseSteps) : baseSteps) : []),
    [guide, device, baseSteps, hybridOn]
  );

  const [checked, setChecked] = useState<boolean[]>([]);
  const [cursor, setCursor] = useState(0); // current step index in the big card
  const [helpful, setHelpful] = useState<null | boolean>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(AS_KEY_FAVS).then((f) => f && setFavIds(new Set(JSON.parse(f))));
  }, []);

  useEffect(() => {
    (async () => {
      if (!guide) return;
      // load progress list sized to current steps
      const saved = await AsyncStorage.getItem(progressKey(guide.id, device));
      if (saved) {
        const arr = JSON.parse(saved) as boolean[];
        setChecked(arr.slice(0, steps.length).concat(Array(Math.max(0, steps.length - arr.length)).fill(false)));
      } else {
        setChecked(Array(steps.length).fill(false));
      }
      // load cursor
      const cur = await AsyncStorage.getItem(cursorKey(guide.id, device));
      if (cur) setCursor(Math.min(parseInt(cur, 10) || 0, Math.max(steps.length - 1, 0)));
      // load helpful flag
      const h = await AsyncStorage.getItem(helpfulKey(guide.id, device));
      if (h) setHelpful(JSON.parse(h));
    })();
  }, [guide, device, steps.length]);

  // If hybrid toggle changes step count, make sure cursor is valid
  useEffect(() => {
    if (cursor > steps.length - 1) setCursor(Math.max(steps.length - 1, 0));
  }, [steps.length, cursor]);

  const progress = checked.filter(Boolean).length;
  const pct = steps.length ? Math.round((progress / steps.length) * 100) : 0;

  const isFav = guide ? favIds.has(guide.id) : false;
  const toggleFav = async () => {
    if (!guide) return;
    setFavIds((prev) => {
      const next = new Set(prev);
      let saved: boolean;
      if (next.has(guide.id)) {
        next.delete(guide.id);
        saved = false;
      } else {
        next.add(guide.id);
        saved = true;
      }
      AsyncStorage.setItem(AS_KEY_FAVS, JSON.stringify(Array.from(next))).catch(() => {});
      Haptics.selectionAsync();
      setToast(saved ? 'Saved to favorites' : 'Removed from favorites');
      logEvent('favorite_toggle', { id: guide.id, device, saved });
      return next;
    });
  };

  const saveProgress = (arr: boolean[]) =>
    AsyncStorage.setItem(progressKey(guide!.id, device), JSON.stringify(arr)).catch(() => {});
  const saveCursor = (i: number) =>
    AsyncStorage.setItem(cursorKey(guide!.id, device), String(i)).catch(() => {});

  const markWorkedAndNext = () => {
    setChecked((prev) => {
      const next = [...prev];
      if (!next[cursor]) next[cursor] = true;
      saveProgress(next);
      const newIndex = Math.min(cursor + 1, Math.max(steps.length - 1, 0));
      setCursor(newIndex);
      saveCursor(newIndex);
      AccessibilityInfo.announceForAccessibility(`Step marked worked. Progress ${pct}%`);
      return next;
    });
    Haptics.selectionAsync();
    logEvent('step_worked', { id: guide!.id, device, step: cursor });
  };

  const nextNotYet = () => {
    const newIndex = Math.min(cursor + 1, Math.max(steps.length - 1, 0));
    setCursor(newIndex);
    saveCursor(newIndex);
    Haptics.selectionAsync();
    logEvent('step_notyet', { id: guide!.id, device, step: cursor });
  };

  const toggleCheck = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      saveProgress(next);
      const done = next.filter(Boolean).length;
      const percent = steps.length ? Math.round((done / steps.length) * 100) : 0;
      AccessibilityInfo.announceForAccessibility(`Step ${i + 1} ${next[i] ? 'checked' : 'unchecked'}. Progress ${percent} percent.`);
      return next;
    });
    logEvent('toggle_step', { id: guide!.id, device, step: i });
  };

  const copyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.selectionAsync();
    setToast('Copied!');
    logEvent('copy_step', { id: guide!.id, device, textLength: text.length });
  };

  const copyAllCommands = async () => {
    const cmds = steps.map((s) => s.copy).filter(Boolean).join('\n');
    if (!cmds) return;
    await Clipboard.setStringAsync(cmds);
    Haptics.selectionAsync();
    setToast('All commands copied');
    logEvent('copy_all_commands', { id: guide!.id, device, count: steps.filter((s) => s.copy).length });
  };

  const openUrl = async (url: string) => {
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  };

  const onShare = async () => {
    const url = `studentitbuddy://howto/${guide!.id}`;
    await Share.share({ title: guide!.title, message: `${guide!.title}\nOpen: ${url}` });
    Haptics.selectionAsync();
    setToast('Share sheet opened');
    logEvent('share_detail', { id: guide!.id, device });
  };

  const setHelpfulPersist = async (val: boolean) => {
    setHelpful(val);
    await AsyncStorage.setItem(helpfulKey(guide!.id, device), JSON.stringify(val));
    logEvent('helpful_mark', { id: guide!.id, device, helpful: val });
  };

  const submitFeedback = async () => {
    const payload = {
      guideId: guide!.id,
      device,
      helpful: helpful ?? undefined,
      message: message.trim() || undefined,
    };
    const res = await sendFeedback(payload);
    Haptics.selectionAsync();
    if ((res as any)?.ok || (res as any)?.skipped) {
      setToast('Feedback sent. Thanks!');
      setMessage('');
    } else {
      setToast('Could not send feedback');
    }
    logEvent('feedback_submit', { id: guide!.id, device, helpful, hasMessage: !!message.trim() });
  };

  if (!guide) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.text, fontSize: 18, marginBottom: 16 }}>Guide not found.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 12, backgroundColor: colors.primary, borderRadius: 12 }}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageSource = (guide.media && (guide.media[device] || guide.media.all)) || null;
  const hasAnyCommands = steps.some((s) => !!s.copy);
  const current = steps[cursor];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      {/* Title row + favorite + hybrid toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', flex: 1 }}>{guide.title}</Text>
        <TouchableOpacity
          onPress={toggleFav}
          style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          accessibilityRole="button"
          accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Text style={{ color: isFav ? colors.gold : colors.text, fontWeight: '700' }}>
            {isFav ? '★ Saved' : '☆ Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setHybridOn((v) => !v)}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            marginLeft: 6,
            backgroundColor: hybridOn ? colors.chip : '#fff',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>{hybridOn ? 'Hybrid: ON' : 'Hybrid: OFF'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ marginTop: 6, color: colors.muted }}>{guide.category}</Text>

      {/* Illustration (optional) */}
      {imageSource ? (
        <View style={{ marginTop: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <Image source={imageSource} style={{ width: '100%', height: 220, resizeMode: 'cover' }} />
        </View>
      ) : null}

      {/* Big instruction card (like your screenshot) */}
      {current && (
        <View
          style={{
            marginTop: 14,
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 12 }}>
            {current.text}
          </Text>

          {/* Play voice + Copy (if command) */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                Speech.stop();
                Speech.speak(current.text, { rate: 1.0, pitch: 1.0 });
                Haptics.selectionAsync();
                logEvent('tts_play', { id: guide.id, device, step: cursor });
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.chip,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>🔊 Play Voice</Text>
            </TouchableOpacity>

            {current.copy ? (
              <TouchableOpacity
                onPress={() => copyText(current.copy!)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Copy command</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* CTA buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            <TouchableOpacity
              onPress={markWorkedAndNext}
              style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.primary, flex: 1 }}
            >
              <Text style={{ color: colors.primaryText, fontWeight: '800', textAlign: 'center' }}>Worked</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={nextNotYet}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: '#fff',
                borderWidth: 2,
                borderColor: colors.outline,
                flex: 1,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800', textAlign: 'center' }}>Not yet</Text>
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <Text style={{ color: colors.muted, marginTop: 10, textAlign: 'center' }}>
            Step {cursor + 1} of {steps.length}
          </Text>
        </View>
      )}

      {/* Progress bar + utilities */}
      <View
        style={{
          marginTop: 16,
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Progress: {pct}%</Text>
        <View style={{ height: 10, backgroundColor: colors.chip, borderRadius: 999, borderWidth: 1, borderColor: colors.chipBorder }}>
          <View style={{ height: 10, width: `${pct}%`, backgroundColor: colors.primary, borderRadius: 999 }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => {
              const blank = Array(steps.length).fill(false);
              setChecked(blank);
              AsyncStorage.setItem(progressKey(guide!.id, device), JSON.stringify(blank)).catch(() => {});
              setCursor(0);
              AsyncStorage.setItem(cursorKey(guide!.id, device), '0').catch(() => {});
              Haptics.selectionAsync();
              setToast('Progress cleared');
              logEvent('reset_progress', { id: guide!.id, device });
            }}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Reset</Text>
          </TouchableOpacity>

          {hasAnyCommands && (
            <TouchableOpacity
              onPress={copyAllCommands}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Copy all commands</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onShare}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* All steps checklist (optional, below the big card) */}
      <View
        style={{
          marginTop: 16,
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 }}>
            <TouchableOpacity
              onPress={() => toggleCheck(i)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!checked[i] }}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: checked[i] ? colors.primary : colors.border,
                backgroundColor: checked[i] ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {checked[i] ? <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text> : null}
            </TouchableOpacity>

            <Text style={{ flex: 1, color: colors.text, fontSize: 16 }} onPress={() => { setCursor(i); saveCursor(i); }}>
              {s.text}
            </Text>

            {s.copy ? (
              <TouchableOpacity
                onPress={() => copyText(s.copy!)}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.text }}>Copy</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </View>

      {/* Tips */}
      {guide.tips?.length ? (
        <View
          style={{
            marginTop: 16,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Tips</Text>
          {guide.tips.map((t, i) => (
            <Text key={i} style={{ color: colors.sub, marginBottom: 4 }}>
              • {t}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Links */}
      {guide.links?.length ? (
        <View
          style={{
            marginTop: 16,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Helpful Links</Text>
          {guide.links.map((l, idx) => (
            <TouchableOpacity key={idx} onPress={() => openUrl(l.url)} style={{ paddingVertical: 8 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{l.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{l.url}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Feedback */}
      <View
        style={{
          marginTop: 18,
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 10 }}>Was this helpful?</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setHelpfulPersist(true)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: helpful === true ? colors.primary : colors.border,
              backgroundColor: helpful === true ? colors.chip : '#fff',
            }}
          >
            <Text style={{ color: colors.text }}>👍 Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHelpfulPersist(false)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: helpful === false ? colors.primary : colors.border,
              backgroundColor: helpful === false ? colors.chip : '#fff',
            }}
          >
            <Text style={{ color: colors.text }}>👎 No</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.muted, marginBottom: 6 }}>
          Tell us what worked or what’s missing (optional)
        </Text>
        <TextInput
          placeholder="Your feedback…"
          placeholderTextColor={colors.muted}
          value={message}
          onChangeText={setMessage}
          multiline
          style={{
            color: colors.text,
            minHeight: 80,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#fff',
          }}
        />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity
            onPress={submitFeedback}
            style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.primary, borderRadius: 10 }}
          >
            <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Send feedback</Text>
          </TouchableOpacity>
        </View>
      </View>

      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </ScrollView>
  );
}
