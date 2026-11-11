package app.deegee.api.payouts;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

interface WithdrawalRepository extends JpaRepository<Withdrawal, UUID> {

    Optional<Withdrawal> findByIdempotencyKey(String key);

    List<Withdrawal> findTop20ByArtistIdOrderByCreatedAtDesc(String artistId);

    List<Withdrawal> findByStatusOrderByCreatedAt(Withdrawal.Status status);

    boolean existsByArtistIdAndStatus(String artistId, Withdrawal.Status status);

    /** Locked, so a provider answer delivered twice is applied once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Withdrawal w where w.providerRef = :ref")
    Optional<Withdrawal> lockByProviderRef(String ref);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Withdrawal w where w.id = :id")
    Optional<Withdrawal> lockById(UUID id);
}
