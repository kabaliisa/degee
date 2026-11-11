import { Text, View } from 'react-native';
import { colors, font } from '../lib/theme';
import { initials, useProfile } from '../store/profile';

/** The signed-in user's avatar: their initials on Deegee blue. */
export function Avatar({ size = 34 }: { size?: number }) {
  const name = useProfile((s) => s.name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.bold, fontSize: size * 0.4, color: colors.accentInk }}>{initials(name)}</Text>
    </View>
  );
}
