package app.deegee.api.wallet;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Credentials and terminal settings for DPO Pay.
 *
 * @param companyToken  the one credential DPO issues; it authenticates every call, so it is the
 *                      whole of the security on this integration and belongs nowhere near the repo
 * @param serviceType   DPO's code for what is being sold. Issued per merchant, so it cannot be
 *                      hard-coded: ask their team for Deegee's.
 * @param mtnMno        what DPO calls MTN Uganda on this merchant's terminal, e.g. MTN. Their
 * @param airtelMno     documentation says these depend on terminal settings and to ask their team,
 * @param mnoCountry    so all three are configuration. A guess means every payment is refused.
 * @param backUrl       where DPO calls when a payment finishes. Unsigned, so it is treated as a
 *                      hint to go and ask, never as the answer: see DpoCallbackController.
 * @param redirectUrl   where the customer's browser lands afterwards, when there is one
 * @param paymentTimeLimitMinutes how long DPO keeps the token alive. Long enough for someone to
 *                      find their phone and remember their PIN; short enough that an abandoned
 *                      order does not sit open all day.
 */
@ConfigurationProperties("deegee.payments.dpo")
public record DpoProperties(String baseUrl, String companyToken, String serviceType,
                            String mtnMno, String airtelMno, String mnoCountry,
                            String backUrl, String redirectUrl, int paymentTimeLimitMinutes) {}
