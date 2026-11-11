package app.deegee.api.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReleaseRepository extends JpaRepository<Release, String> {

    List<Release> findByArtistIdOrderByYearDesc(String artistId);

    List<Release> findAllByOrderByYearDescIdAsc();

    @Query("select r from Release r where lower(r.title) like lower(concat('%', :q, '%')) order by r.title")
    List<Release> search(String q);
}
