package app.deegee.api.payouts;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param minWithdrawalUgx smallest withdrawal, so mobile money fees stay a small share
 * @param saleHold          how long sales and gifts wait before they can be withdrawn (refunds, disputes)
 * @param newArtistHold     the longer wait while an artist is new, so money is there if a rights claim turns up
 * @param newArtistPeriod   how long an artist counts as new after approval
 */
@ConfigurationProperties("deegee.payouts")
public record PayoutsProperties(long minWithdrawalUgx, Duration saleHold, Duration newArtistHold, Duration newArtistPeriod) {}
