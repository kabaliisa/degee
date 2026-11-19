import { Redirect, useLocalSearchParams } from 'expo-router';
import { getArtist } from '../../api';
import { EmptyState } from '../../components/ui';
import { artistSlug } from '../../lib/slug';

/**
 * Where artist pages used to live. Links were shared from here before artists had a handle, and the
 * database still speaks in ids, so this keeps working and sends you to the page's real address.
 */
export default function LegacyArtistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artist = getArtist(id);
  if (!artist) return <EmptyState icon="person-outline" title="Artist not found" body="This page may have moved." />;
  return <Redirect href={`/${artistSlug(artist)}`} />;
}
