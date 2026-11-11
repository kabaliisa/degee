import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateMe } from '../api/account';
import { Button } from '../components/ui';
import { initials } from '../lib/format';
import { colors, font, radius, space, type } from '../lib/theme';
import { useSession } from '../store/session';

const MAX_NAME = 40;

/** Shown once after sign-in to anyone without a name, so their profile shows their initials. */
export default function Welcome() {
  const setUser = useSession((s) => s.setUser);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = name.trim();

  const save = async () => {
    if (!clean) return;
    setError(null);
    setBusy(true);
    try {
      setUser(await updateMe({ name: clean.slice(0, MAX_NAME) })); // the root layout then opens the app
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{clean ? initials(clean) : '♪'}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={type.display}>What should we call you?</Text>
            <Text style={[type.body, styles.muted]}>Your name shows on your profile. You can change it any time.</Text>
          </View>
          <TextInput value={name} onChangeText={setName} onSubmitEditing={save} autoFocus maxLength={MAX_NAME}
            placeholder="Your name" placeholderTextColor={colors.textFaint} autoComplete="name" textContentType="name"
            autoCapitalize="words" returnKeyType="done" accessibilityLabel="Your name" style={styles.input} />
          {error ? <Text style={[type.body, styles.error]}>{error}</Text> : null}
          <Button label="Continue" onPress={save} loading={busy} disabled={!clean} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  initials: { fontFamily: font.bold, fontSize: 34, color: colors.accentInk },
  copy: { gap: space.sm },
  muted: { color: colors.textMuted },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, color: colors.text, fontSize: 20, fontFamily: font.semibold },
  error: { color: colors.danger },
});
