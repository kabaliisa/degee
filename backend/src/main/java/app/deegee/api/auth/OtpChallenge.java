package app.deegee.api.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "otp_challenges")
public class OtpChallenge {

    @Id
    private UUID id;

    @Column(nullable = false, length = 16)
    private String phone;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected OtpChallenge() {}

    public OtpChallenge(String phone, String codeHash, Instant now, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.phone = phone;
        this.codeHash = codeHash;
        this.createdAt = now;
        this.expiresAt = expiresAt;
    }

    public boolean isUsable(Instant now, int maxAttempts) {
        return consumedAt == null && now.isBefore(expiresAt) && attempts < maxAttempts;
    }

    public void recordAttempt() { attempts++; }
    public void consume(Instant now) { consumedAt = now; }

    public String getCodeHash() { return codeHash; }
    public int getAttempts() { return attempts; }
}
