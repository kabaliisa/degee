import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestCode, verifyCode } from '../api/account';
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
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.wordmark}>Deegee</Text>

          {step === 'phone' ? (
            <>
              <View style={styles.copy}>
                <Text style={type.display}>Sign in with your phone</Text>
                <Text style={[type.body, styles.muted]}>We’ll text you a code. New here? This makes your account.</Text>
              </View>
              <TextInput value={phone} onChangeText={setPhone} onSubmitEditing={sendCode} autoFocus
                placeholder="0772 123456" placeholderTextColor={colors.textFaint} keyboardType="phone-pad"
                autoComplete="tel" textContentType="telephoneNumber" returnKeyType="next"
                accessibilityLabel="Mobile number" style={styles.input} />
              {error ? <Text style={[type.body, styles.error]}>{error}</Text> : null}
              <Button label="Send code" onPress={sendCode} loading={busy} disabled={!phone.trim()} />
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  wordmark: { fontFamily: font.display, fontSize: 44, letterSpacing: -1.5, color: colors.text, marginBottom: space.xxl },
  copy: { gap: space.sm },
  muted: { color: colors.textMuted },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, color: colors.text, fontSize: 20, fontFamily: font.semibold },
  codeInput: { fontSize: 28, letterSpacing: 12, fontFamily: font.bold },
  error: { color: colors.danger },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: colors.accent, fontFamily: font.semibold, fontSize: 15 },
  devNote: { color: colors.textFaint, marginTop: space.lg },
});
