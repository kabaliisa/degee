package app.deegee.api.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReleaseRepository extends JpaRepository<Release, String> {

    String PUBLISHED = "app.deegee.api.catalog.Release.Status.PUBLISHED";

    /** Newest first. Fans only ever see published releases. */
    @Query("select r from Release r where r.status = " + PUBLISHED + " order by r.publishedAt desc, r.id")
    List<Release> findPublished();

    @Query("select r from Release r where r.id = :id and r.status = " + PUBLISHED)
    Optional<Release> findPublishedById(String id);

    @Query("select r from Release r where r.artistId = :artistId and r.status = " + PUBLISHED + " order by r.publishedAt desc, r.id")
    List<Release> findPublishedByArtist(String artistId);

    @Query("select r from Release r where r.status = " + PUBLISHED + " and lower(r.title) like lower(concat('%', :q, '%')) order by r.title")
    List<Release> search(String q);

    /** Everything an artist has made, drafts included, newest first. */
    List<Release> findByArtistIdOrderByCreatedAtDesc(String artistId);

    List<Release> findByStatusOrderBySubmittedAt(Release.Status status);
}
