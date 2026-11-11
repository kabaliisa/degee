package app.deegee.api.catalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ArtistRepository extends JpaRepository<Artist, String> {

    /** Artists fans can see: approved ones. */
    @Query("select a from Artist a where a.status = app.deegee.api.catalog.Artist.Status.ACTIVE order by a.name")
    List<Artist> findPublic();

    @Query("select a from Artist a where a.id = :id and a.status = app.deegee.api.catalog.Artist.Status.ACTIVE")
    Optional<Artist> findPublicById(String id);

    @Query("""
            select a from Artist a where a.status = app.deegee.api.catalog.Artist.Status.ACTIVE
              and (lower(a.name) like lower(concat('%', :q, '%')) or lower(a.genres) like lower(concat('%', :q, '%')))
            order by a.name""")
    List<Artist> search(String q);

    Optional<Artist> findByOwnerUserId(UUID ownerUserId);

    boolean existsByNameIgnoreCase(String name);

    List<Artist> findByStatusOrderByCreatedAt(Artist.Status status);
}
