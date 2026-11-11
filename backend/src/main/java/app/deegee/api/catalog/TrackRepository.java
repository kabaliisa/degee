package app.deegee.api.catalog;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TrackRepository extends JpaRepository<Track, String> {

    List<Track> findByReleaseIdOrderByTrackNo(String releaseId);

    List<Track> findByArtistId(String artistId);

    List<Track> findAllByOrderByReleaseIdAscTrackNoAsc();

    List<Track> findByIdIn(Collection<String> ids);

    @Query("select t from Track t where lower(t.title) like lower(concat('%', :q, '%')) order by t.title")
    List<Track> search(String q);
}
