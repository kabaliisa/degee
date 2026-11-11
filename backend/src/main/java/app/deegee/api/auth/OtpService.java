package app.deegee.api.auth;

import app.deegee.api.common.ApiException;
import app.deegee.api.common.Hashing;
import app.deegee.api.config.SecurityProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Phone sign-in: send a 6-digit code, then exchange the right code for tokens. */
@Service
public class OtpService {

    public record CodeSent(String phone, long expiresInSec) {}

    public record SignedIn(User user, TokenService.Tokens tokens, boolean isNewUser) {}

    private final OtpChallengeRepository challenges;
    private final UserRepository users;
    private final TokenService tokens;
    private final OtpSender sender;
    private final OtpProperties otp;
    private final SecurityProperties security;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    OtpService(OtpChallengeRepository challenges, UserRepository users, TokenService tokens, OtpSender sender,
               OtpProperties otp, SecurityProperties security, ApplicationEventPublisher events, Clock clock) {
        this.challenges = challenges;
        this.users = users;
        this.tokens = tokens;
        this.sender = sender;
        this.otp = otp;
        this.security = security;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public CodeSent requestCode(String rawPhone) {
        String phone = normalize(rawPhone);
        Instant now = clock.instant();
        if (challenges.countByPhoneAndCreatedAtAfter(phone, now.minus(Duration.ofHours(1))) >= otp.maxRequestsPerHour()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_CODES", "Too many codes requested. Try again in an hour.");
        }
        String code = Hashing.randomDigits(6);
        challenges.save(new OtpChallenge(phone, hash(phone, code), now, now.plus(otp.ttl())));
        sender.send(phone, code);
        return new CodeSent(phone, otp.ttl().toSeconds());
    }

    /** Wrong codes still count as attempts even though the request fails, hence noRollbackFor. */
    @Transactional(noRollbackFor = ApiException.class)
    public SignedIn verify(String rawPhone, String code) {
        String phone = normalize(rawPhone);
        Instant now = clock.instant();
        OtpChallenge challenge = challenges.findFirstByPhoneOrderByCreatedAtDesc(phone)
                .filter(c -> c.isUsable(now, otp.maxAttempts()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "CODE_EXPIRED", "That code has expired. Request a new one."));

        challenge.recordAttempt();
        if (code == null || !Hashing.constantTimeEquals(challenge.getCodeHash(), hash(phone, code.trim()))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "WRONG_CODE", "That code isn't right. Check the SMS and try again.");
        }
        challenge.consume(now);

        User existing = users.findByPhone(phone).orElse(null);
        boolean isNew = existing == null;
        User user = isNew ? users.save(new User(phone, now)) : existing;
        if (isNew) events.publishEvent(new UserRegistered(user.getId()));
        return new SignedIn(user, tokens.issue(user.getId()), isNew);
    }

    private static String normalize(String rawPhone) {
        return PhoneNumbers.normalize(rawPhone)
                .orElseThrow(() -> ApiException.badRequest("INVALID_PHONE", "Enter a valid Ugandan mobile number, e.g. 0772 123456."));
    }

    private String hash(String phone, String code) {
        return Hashing.hmacHex(security.jwtSecret(), "otp:" + phone + ":" + code);
    }
}
