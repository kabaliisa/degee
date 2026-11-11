import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Art } from '../components/Art';
import { Button, EmptyState } from '../components/ui';
import { getArtist } from '../data/catalog';
import { TERMS, formatUGX, splitGift } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { useWallet } from '../store/wallet';

const PRESETS = [1000, 2000, 5000, 10000];

export default function Gift() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const artist = getArtist(artistId);
  const balance = useWallet((s) => s.balance);
  const sendGift = useWallet((s) => s.sendGift);
  const [amount, setAmount] = useState('2000');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!artist) return <EmptyState icon="person-outline" title="Artist not found" body="Go back and try again." />;

  const value = parseInt(amount || '0', 10);
  const valid = value >= TERMS.minGift;
  const split = valid ? splitGift(value) : null;
  const shortBy = Math.max(0, value - balance);

  const send = () => {
    setError(null);
    const res = sendGift(artist.id, value, note);
    if (res.ok) setSent(true);
    else if (res.reason === 'TOO_SMALL') setError(`The smallest gift is ${formatUGX(TERMS.minGift)}.`);
    else if (res.reason === 'INSUFFICIENT_FUNDS') setError(`You need ${formatUGX(res.shortBy ?? 0)} more in your wallet.`);
    else setError('The gift was not sent. Try again.');
  };

  if (sent && split) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }}>
        <Ionicons name="gift" size={60} color={colors.accent} />
        <Text style={type.title}>Gift sent</Text>
        <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>
          {formatUGX(split.artist)} is on its way to {artist.name}.{note.trim() ? ' They’ll see your message too.' : ''}
        </Text>
        <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Art seed={artist.id} colors={artist.colors} size={88} round />
        <Text style={type.title}>{artist.name}</Text>
        <Text style={[type.small, { textAlign: 'center' }]}>A gift is a thank-you, separate from buying music.</Text>
      </View>

      <View>
        <Text style={[type.smallBold, { marginBottom: space.sm }]}>Amount</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {PRESETS.map((p) => {
            const on = value === p;
            return (
              <Pressable key={p} onPress={() => setAmount(String(p))} accessibilityState={{ selected: on }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: on ? colors.accent : colors.surfaceRaised }}>
                <Text style={{ fontFamily: font.bold, color: colors.text }}>{(p / 1000).toString()}k</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.lg }}>
          <Text style={[type.body, { color: colors.textMuted, marginRight: 6 }]}>UGX</Text>
          <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" accessibilityLabel="Other amount in Ugandan shillings"
            style={{ flex: 1, color: colors.text, fontFamily: font.bold, fontSize: 18, paddingVertical: 12 }} />
        </View>
      </View>

      <View>
        <Text style={[type.smallBold, { marginBottom: space.sm }]}>Message (optional)</Text>
        <TextInput value={note} onChangeText={setNote} maxLength={140} multiline placeholder={`Say something to ${artist.name}`} placeholderTextColor={colors.textFaint}
          style={{ minHeight: 80, textAlignVertical: 'top', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, color: colors.text, fontFamily: font.regular, fontSize: 15 }} />
        <Text style={[type.tiny, { textAlign: 'right', marginTop: 4, color: colors.textFaint }]}>{note.length}/140</Text>
      </View>

      {split ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={type.body}>{artist.name} gets</Text><Text style={type.bodyBold}>{formatUGX(split.artist)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[type.body, { color: colors.textMuted }]}>Deegee fee ({TERMS.giftPlatformPct}%)</Text><Text style={[type.body, { color: colors.textMuted }]}>{formatUGX(split.platform)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[type.body, { color: colors.textMuted }]}>Wallet balance</Text><Text style={[type.body, { color: colors.textMuted }]}>{formatUGX(balance)}</Text>
          </View>
        </View>
      ) : (
        <Text style={type.small}>The smallest gift is {formatUGX(TERMS.minGift)}.</Text>
      )}

      {error ? <Text style={{ color: colors.danger, fontFamily: font.medium }}>{error}</Text> : null}

      {valid && shortBy > 0 ? (
        <Button label={`Add ${formatUGX(Math.max(shortBy, TERMS.minTopUp))} to wallet`} icon="add"
          onPress={() => router.push({ pathname: '/topup', params: { amount: String(Math.max(shortBy, TERMS.minTopUp)) } })} />
      ) : (
        <Button label={valid ? `Send ${formatUGX(value)} gift` : 'Send gift'} icon="gift" disabled={!valid} onPress={send} />
      )}
    </ScrollView>
  );
}
