package app.deegee.api.auth;

import app.deegee.api.common.ApiException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Extra rights a user can have. Being an artist isn't a role (it comes from owning an artist profile);
 * ADMIN is, and is granted to the phone numbers in {@code deegee.admin-phones} when they sign in.
 */
@Component
public class Roles {

    public static final String ADMIN = "ADMIN";

    private final JdbcTemplate jdbc;
    private final Set<String> adminPhones;

    Roles(JdbcTemplate jdbc, AdminProperties props) {
        this.jdbc = jdbc;
        this.adminPhones = props.adminPhones().stream()
                .map(p -> PhoneNumbers.normalize(p).orElseThrow(() -> new IllegalStateException("deegee.admin-phones: not a Ugandan mobile number: " + p)))
                .collect(Collectors.toUnmodifiableSet());
    }

    @Transactional(readOnly = true)
    public List<String> of(UUID userId) {
        return jdbc.queryForList("select role from user_roles where user_id = ? order by role", String.class, userId);
    }

    @Transactional(readOnly = true)
    public boolean isAdmin(UUID userId) {
        return of(userId).contains(ADMIN);
    }

    /** Throws 403 unless the user is an admin. */
    public void requireAdmin(UUID userId) {
        if (!isAdmin(userId)) throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ONLY", "Only Deegee admins can do this.");
    }

    /** Called at every sign-in, so adding or removing a number in config takes effect next time they sign in. */
    @Transactional
    void syncAdmin(User user) {
        if (adminPhones.contains(user.getPhone())) {
            jdbc.update("insert into user_roles (user_id, role) select ?, ? where not exists (select 1 from user_roles where user_id = ? and role = ?)",
                    user.getId(), ADMIN, user.getId(), ADMIN);
        } else {
            jdbc.update("delete from user_roles where user_id = ? and role = ?", user.getId(), ADMIN);
        }
    }
}
