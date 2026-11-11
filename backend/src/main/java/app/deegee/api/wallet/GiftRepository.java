package app.deegee.api.wallet;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface GiftRepository extends JpaRepository<Gift, UUID> {

    Optional<Gift> findByTransactionId(UUID transactionId);

    List<Gift> findByTransactionIdIn(Collection<UUID> transactionIds);
}
