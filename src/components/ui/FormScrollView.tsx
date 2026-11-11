import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A scrolling screen with text fields that stay visible above the keyboard. iOS shrinks the scroll area
 * and scrolls the focused field into view; Android lifts the content by the keyboard's height.
 * Taps on buttons work while the keyboard is open, and dragging the content down dismisses it.
 */
export function FormScrollView({ children, contentContainerStyle }: { children: ReactNode; contentContainerStyle?: StyleProp<ViewStyle> }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'android' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
