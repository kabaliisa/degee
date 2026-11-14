import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PayWith } from '../../api/checkout';
import { formatPhone, guessProvider, normalizeUgPhone, type Provider } from '../../lib/phone';
import { colors, font, radius, space, type, withAlpha } from '../../lib/theme';
import { useSession } from '../../store/session';
import { tap } from '../ui';

const PROVIDERS: { name: Provider; tile: string; tileText: string; ink: string }[] = [
  { name: 'MTN MoMo', tile: colors.momo, tileText: 'MTN', ink: colors.ink },
  { name: 'Airtel Money', tile: colors.airtel, tileText: 'airtel', ink: '#FFFFFF' },
];

/**
 * Which mobile money account pays. Starts with the number they signed in with, since most people pay
 * from their own phone, and switches network by itself when the number's prefix says so.
 */
export function usePayWith() {
  const myPhone = useSession((s) => s.user?.phone);
  const [phone, setPhoneText] = useState(() => (myPhone ? formatPhone(myPhone) : ''));
  const [provider, setProvider] = useState<Provider>(() => (myPhone && guessProvider(myPhone)) || 'MTN MoMo');
  const e164 = normalizeUgPhone(phone);

  const setPhone = (text: string) => {
    setPhoneText(text);
    const n = normalizeUgPhone(text);
    const guess = n && guessProvider(n);
    if (guess) setProvider(guess);
  };
  const payWith: PayWith | null = e164 ? { provider, phone: e164 } : null;
  return { provider, setProvider, phone, setPhone, e164, payWith };
}

/** MTN MoMo or Airtel Money as two big choices, then the number the PIN prompt goes to. */
export function PayWithPicker({ state }: { state: ReturnType<typeof usePayWith> }) {
  return (
    <View style={styles.wrap}>
      <Text style={type.heading}>Pay with mobile money</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {PROVIDERS.map((p) => {
          const on = state.provider === p.name;
          return (
            <Pressable key={p.name} onPress={() => { tap(); state.setProvider(p.name); }} accessibilityRole="radio"
              accessibilityState={{ checked: on }} accessibilityLabel={p.name} style={[styles.option, on && styles.optionOn]}>
              <View style={[styles.tile, { backgroundColor: p.tile }]}>
                <Text style={[styles.tileText, { color: p.ink }]}>{p.tileText}</Text>
              </View>
              <Text style={[type.bodyBold, styles.flex]}>{p.name}</Text>
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.field}>
        <Text style={type.smallBold}>Number to pay from</Text>
        <TextInput value={state.phone} onChangeText={state.setPhone} placeholder="0772 123456" placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad" autoComplete="tel" accessibilityLabel="Mobile money number" style={styles.input} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  options: { gap: space.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  optionOn: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.06) },
  tile: { width: 52, height: 36, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: font.display, fontSize: 13 },
  flex: { flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  field: { gap: space.sm },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: space.lg, color: colors.text, fontSize: 18, fontFamily: font.semibold },
});
