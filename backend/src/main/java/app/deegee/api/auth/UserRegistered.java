package app.deegee.api.auth;

import java.util.UUID;

/** Published inside the sign-in transaction when a phone number signs in for the first time. */
public record UserRegistered(UUID userId) {}
