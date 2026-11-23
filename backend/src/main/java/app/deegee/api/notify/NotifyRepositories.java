package app.deegee.api.notify;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface PushTokenRepository extends JpaRepository<PushToken, UUID> {

    List<PushToken> findByUserId(UUID userId);

    Optional<PushToken> findByToken(String token);

    void deleteByToken(String token);
}

interface NotificationPrefsRepository extends JpaRepository<NotificationPrefs, UUID> {}
