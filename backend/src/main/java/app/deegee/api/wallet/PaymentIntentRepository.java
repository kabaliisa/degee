package app.deegee.api.wallet;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

interface PaymentIntentRepository extends JpaRepository<PaymentIntent, UUID> {

    Optional<PaymentIntent> findByIdempotencyKey(String idempotencyKey);

    /** Locked, so a webhook delivered twice at the same moment is applied once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PaymentIntent p where p.providerRef = :providerRef")
    Optional<PaymentIntent> lockByProviderRef(String providerRef);

    List<PaymentIntent> findTop50ByUserIdOrderByCreatedAtDesc(UUID userId);
}
