package app.deegee.api.studio;

/** Where an artist's money leaves to has been changed. Published only when the number actually moved. */
public record PayoutNumberChanged(String artistId, String msisdn) {}
