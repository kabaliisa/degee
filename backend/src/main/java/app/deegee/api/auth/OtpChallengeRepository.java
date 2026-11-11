package app.deegee.api.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface OtpChallengeRepository extends JpaRepository<OtpChallenge, UUID> {
    long countByPhoneAndCreatedAtAfter(String phone, Instant since);

    Optional<OtpChallenge> findFirstByPhoneOrderByCreatedAtDesc(String phone);
}
