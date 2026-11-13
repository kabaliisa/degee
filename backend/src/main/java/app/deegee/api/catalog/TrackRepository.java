package app.deegee.api.catalog;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TrackRepository extends JpaRepository<Track, String> {

    String PUBLISHED_RELEASE = "t.releaseId in (select r.id from Release r where r.status = app.deegee.api.catalog.Release.Status.PUBLISHED)";

    /** All songs of a release, whatever its status. Callers check the release first. */
    List<Track> findByReleaseIdOrderByTrackNo(String releaseId);

    @Query("select t from Track t where t.artistId = :artistId and " + PUBLISHED_RELEASE + " order by t.releaseId, t.trackNo")
    List<Track> findPublishedByArtist(String artistId);

    @Query("select t from Track t where " + PUBLISHED_RELEASE + " order by t.releaseId, t.trackNo")
    List<Track> findPublished();

    @Query("select t from Track t where t.id in :ids and " + PUBLISHED_RELEASE)
    List<Track> findPublishedByIdIn(Collection<String> ids);

    @Query("select t from Track t where " + PUBLISHED_RELEASE + " and lower(t.title) like lower(concat('%', :q, '%')) order by t.title")
    List<Track> search(String q);

    List<Track> findByAudioStatus(Track.AudioStatus status);

    int countByReleaseId(String releaseId);
}
