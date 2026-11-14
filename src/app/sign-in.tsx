import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listArtists } from '../api';
import { requestCode, verifyCode } from '../api/account';
import { Art } from '../components/Art';
import { Wordmark } from '../components/Wordmark';
import { Button } from '../components/ui';
import { formatPhone, normalizeUgPhone } from '../lib/phone';
import { colors, font, radius, space, type } from '../lib/theme';
import { useSession } from '../store/session';

const CODE_LENGTH = 6;

/** Phone number → 6-digit code → signed in. New numbers get an account automatically. */
export default function SignIn() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const codeInput = useRef<ComponentRef<typeof TextInput>>(null);

  const e164 = normalizeUgPhone(phone);

  const sendCode = async () => {
    setError(null);
    setNotice(null);
    if (!e164) return setError('Enter a Ugandan mobile number, e.g. 0772 123456.');
    setBusy(true);
    try {
      const sent = await requestCode(e164);
      setSentTo(sent.phone);
      setCode('');
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await requestCode(sentTo);
      setCode('');
      setNotice('We sent a new code.');
      codeInput.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== CODE_LENGTH || busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const s = await verifyCode(sentTo, value);
      useSession.getState().signIn(s); // the root layout swaps to the app
    } catch (e) {
      setError((e as Error).message);
      setCode('');
      setBusy(false);
    }
  };

  const onCode = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) void verify(digits);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'phone' ? <Collage /> : null}
          <Wordmark size={step === 'phone' ? 52 : 40} />

          {step === 'phone' ? (
            <>
              <View style={styles.copy}>
                <Text style={type.hero}>Own the music you love.</Text>
                <View style={styles.rule} />
                <Text style={[type.body, styles.muted]}>Buy direct from artists. Keep every song.</Text>
              </View>
              <View style={styles.phoneRow}>
                <View style={styles.prefix}><Text style={styles.prefixText}>🇺🇬 +256</Text></View>
                <TextInput value={phone} onChangeText={setPhone} onSubmitEditing={sendCode}
                  placeholder="7XX XXX XXX" placeholderTextColor={colors.textFaint} keyboardType="phone-pad"
                  autoComplete="tel" textContentType="telephoneNumber" returnKeyType="next"
                  accessibilityLabel="Mobile number" style={[styles.input, styles.phoneInput]} />
              </View>
              {error ? <Text style={[type.body, styles.error]}>{error}</Text> : null}
              <Button label="Send me a code" onPress={sendCode} loading={busy} disabled={!phone.trim()} />
              <Text style={[type.small, styles.centered]}>No password. No subscription. New here? This makes your account.</Text>
            </>
          ) : (
            <>
              <View style={styles.copy}>
                <Text style={type.display}>Enter your code</Text>
                <Text style={[type.body, styles.muted]}>Sent to {formatPhone(sentTo)}.</Text>
              </View>
              <TextInput ref={codeInput} value={code} onChangeText={onCode} autoFocus maxLength={CODE_LENGTH}
                keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode"
                accessibilityLabel="Sign-in code" style={[styles.input, styles.codeInput]} />
              {error ? <Text style={[type.body, styles.error]}>{error}</Text> : null}
              {notice ? <Text style={[type.body, styles.muted]}>{notice}</Text> : null}
              <Button label="Sign in" onPress={() => verify()} loading={busy} disabled={code.length !== CODE_LENGTH} />
              <View style={styles.links}>
                <Pressable onPress={resend} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.link}>Send a new code</Text>
                </Pressable>
                <Pressable onPress={() => { setStep('phone'); setError(null); setNotice(null); }} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.link}>Change number</Text>
                </Pressable>
              </View>
              {__DEV__ ? <Text style={[type.small, styles.devNote]}>Development: no SMS is sent. The code is in the API server’s log.</Text> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Three artists' photos, overlapping, above the welcome. */
function Collage() {
  const [a, b, c] = listArtists();
  if (!a || !b || !c) return null;
  return (
    <View style={styles.collage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.blob}><Art seed={b.id} colors={b.colors} size={92} style={styles.side} /></View>
      <View style={[styles.blob, styles.middle]}><Art seed={a.id} colors={a.colors} size={150} style={styles.center} /></View>
      <View style={styles.blob}><Art seed={c.id} colors={c.colors} size={92} style={styles.side} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: space.xl, gap: space.lg, justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  copy: { gap: space.md, marginTop: -space.sm },
  rule: { width: 56, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  centered: { textAlign: 'center' },
  phoneRow: { flexDirection: 'row', gap: space.sm },
  prefix: { justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  prefixText: { fontFamily: font.bold, fontSize: 17, color: colors.text },
  phoneInput: { flex: 1, minWidth: 0 },
  collage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  blob: { borderRadius: 40, borderWidth: 4, borderColor: colors.bg, overflow: 'hidden' },
  middle: { marginHorizontal: -18, zIndex: 1, backgroundColor: colors.accent },
  side: { borderRadius: 36 },
  center: { borderRadius: 40 },
  muted: { color: colors.textMuted },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: space.lg, color: colors.text, fontSize: 20, fontFamily: font.semibold },
  codeInput: { fontSize: 28, letterSpacing: 12, fontFamily: font.bold },
  error: { color: colors.danger },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: colors.accentText, fontFamily: font.bold, fontSize: 15 },
  devNote: { color: colors.textFaint, marginTop: space.lg },
});
