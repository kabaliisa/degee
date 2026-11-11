package app.deegee.api.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 16)
    private String phone;

    @Column(length = 40)
    private String name;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected User() {}

    public User(String phone, Instant now) {
        this.id = UUID.randomUUID();
        this.phone = phone;
        this.createdAt = now;
    }

    public UUID getId() { return id; }
    public String getPhone() { return phone; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Instant getCreatedAt() { return createdAt; }
}
