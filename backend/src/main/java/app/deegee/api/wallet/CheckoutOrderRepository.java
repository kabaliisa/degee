package app.deegee.api.wallet;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

interface CheckoutOrderRepository extends JpaRepository<CheckoutOrder, UUID> {

    Optional<CheckoutOrder> findByIdempotencyKey(String idempotencyKey);

    /** Locked, so a payment result that arrives twice completes the order once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from CheckoutOrder o where o.paymentIntentId = :paymentIntentId")
    Optional<CheckoutOrder> lockByPaymentIntentId(UUID paymentIntentId);
}
