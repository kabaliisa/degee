package app.deegee.api.auth;

import app.deegee.api.common.ApiException;
import app.deegee.api.common.Hashing;
import app.deegee.api.config.SecurityProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Short-lived access tokens (JWT) and long-lived, rotating refresh tokens.
 * Reusing a refresh token that was already rotated revokes every token for that user,
 * because it means the token was copied.
 */
@Service
public class TokenService {

    public record Tokens(String accessToken, long expiresInSec, String refreshToken) {}

    private final JwtEncoder jwtEncoder;
    private final RefreshTokenRepository refreshTokens;
    private final SecurityProperties props;
    private final Clock clock;

    TokenService(JwtEncoder jwtEncoder, RefreshTokenRepository refreshTokens, SecurityProperties props, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.refreshTokens = refreshTokens;
        this.props = props;
        this.clock = clock;
    }

    @Transactional
    public Tokens issue(UUID userId) {
        Instant now = clock.instant();
        String access = accessToken(userId, now);
        String refresh = Hashing.randomToken(32);
        refreshTokens.save(new RefreshToken(userId, hash(refresh), now, now.plus(props.refreshTokenTtl())));
        return new Tokens(access, props.accessTokenTtl().toSeconds(), refresh);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Tokens rotate(String refreshToken) {
        Instant now = clock.instant();
        RefreshToken current = refreshTokens.findByTokenHash(hash(refreshToken))
                .orElseThrow(TokenService::invalid);
        if (current.isRevoked()) {
            refreshTokens.revokeAllForUser(current.getUserId(), now); // stolen token: sign the user out everywhere
            throw invalid();
        }
        if (current.isExpired(now)) throw invalid();
        current.revoke(now);
        return issue(current.getUserId());
    }

    private String accessToken(UUID userId, Instant now) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("deegee")
                .subject(userId.toString())
                .issuedAt(now)
                .expiresAt(now.plus(props.accessTokenTtl()))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private String hash(String token) {
        return Hashing.hmacHex(props.jwtSecret(), "refresh:" + token);
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Sign in again.");
    }
}
