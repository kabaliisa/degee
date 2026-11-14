import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { colors, font, radius, space, type } from '../../lib/theme';
import { tap } from '../ui';

/** A labelled text input used across the artist screens. */
export function Field({ label, value, onChangeText, placeholder, hint, keyboardType, multiline, maxLength, prefix }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; hint?: string;
  keyboardType?: KeyboardTypeOptions; multiline?: boolean; maxLength?: number; prefix?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[type.smallBold, styles.label]}>{label}</Text>
      <View style={[styles.inputWrap, multiline && styles.inputWrapTall]}>
        {prefix ? <Text style={[type.body, styles.prefix]}>{prefix}</Text> : null}
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType} multiline={multiline} maxLength={maxLength} accessibilityLabel={label}
          style={[styles.input, multiline && styles.inputTall]} />
      </View>
      {hint ? <Text style={[type.small, styles.hint]}>{hint}</Text> : null}
    </View>
  );
}

/** One choice from a few, as a row of pills. */
export function Choice<T extends string>({ label, options, value, onChange, hint }: {
  label?: string; options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void; hint?: string;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={[type.smallBold, styles.label]}>{label}</Text> : null}
      <View style={styles.choices}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => { tap(); onChange(o.value); }} accessibilityRole="radio" accessibilityState={{ checked: active }}
              style={[styles.choice, active && styles.choiceActive]}>
              <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={[type.small, styles.hint]}>{hint}</Text> : null}
    </View>
  );
}

/** A tick box with a sentence, for confirmations. */
export function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable onPress={() => { tap(); onChange(!checked); }} accessibilityRole="checkbox" accessibilityState={{ checked }} style={styles.check}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Text style={styles.tick}>✓</Text> : null}</View>
      <Text style={[type.body, styles.flex]}>{children}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={type.heading}>{children}</Text>
      {action}
    </View>
  );
}

/** Red text for the reason something can't go ahead, or nothing. */
export const ErrorText = ({ message }: { message?: string | null }) => (message ? <Text style={[type.body, styles.error]}>{message}</Text> : null);

/** Only digits, as a number (0 when empty). */
export const digits = (v: string) => v.replace(/\D/g, '');

const styles = StyleSheet.create({
  field: { gap: space.sm },
  label: {},
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: space.lg },
  inputWrapTall: { alignItems: 'flex-start', paddingVertical: space.sm },
  prefix: { color: colors.textMuted, marginRight: 6 },
  input: { flex: 1, minWidth: 0, color: colors.text, fontFamily: font.medium, fontSize: 16, paddingVertical: 14 },
  inputTall: { minHeight: 88, textAlignVertical: 'top', paddingVertical: 6 },
  hint: { color: colors.textFaint },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  choiceActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  choiceLabel: { color: colors.text, fontFamily: font.semibold, fontSize: 14 },
  choiceLabelActive: { color: colors.accentInk },
  check: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  box: { width: 24, height: 24, borderRadius: radius.xs, borderWidth: 2, borderColor: colors.textFaint, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tick: { color: colors.accentInk, fontFamily: font.bold, fontSize: 14, lineHeight: 16 },
  flex: { flex: 1 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  error: { color: colors.danger },
});
