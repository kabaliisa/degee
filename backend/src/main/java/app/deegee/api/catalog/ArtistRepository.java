package app.deegee.api.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ArtistRepository extends JpaRepository<Artist, String> {

    @Query("select a from Artist a where lower(a.name) like lower(concat('%', :q, '%')) or lower(a.genres) like lower(concat('%', :q, '%')) order by a.name")
    List<Artist> search(String q);
}
