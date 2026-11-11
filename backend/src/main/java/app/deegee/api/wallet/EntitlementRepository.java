package app.deegee.api.wallet;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface EntitlementRepository extends JpaRepository<Entitlement, Entitlement.Key> {

    @Query("select e.key.trackId from Entitlement e where e.key.userId = :userId order by e.createdAt")
    List<String> trackIdsOwnedBy(UUID userId);

    @Query("select e.key.trackId from Entitlement e where e.transactionId = :transactionId")
    List<String> trackIdsFrom(UUID transactionId);
}
