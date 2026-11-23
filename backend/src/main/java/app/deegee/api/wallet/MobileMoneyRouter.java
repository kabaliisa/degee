package app.deegee.api.wallet;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Chooses which provider takes money in and which sends it out, separately.
 *
 * <p>They were one setting until DPO, which collects but publishes no payout API. Deegee needs
 * both halves: a fan pays in and an artist withdraws, and a provider that can only do the first is
 * still worth using for the first. So collections and payouts are configured independently, and a
 * perfectly ordinary arrangement is DPO taking payments while someone else pays artists.
 *
 * <p>Everything else in the system still sees one {@link MobileMoneyGateway} and does not know
 * this is here.
 */
@Component
@Primary
class MobileMoneyRouter implements MobileMoneyGateway {

    private static final Logger log = LoggerFactory.getLogger(MobileMoneyRouter.class);

    private final Map<String, MobileMoneyGateway> gateways;
    private final String collectionsName;
    private final String payoutsName;

    MobileMoneyRouter(Map<String, MobileMoneyGateway> gateways,
                      @Qualifier("collectionsProvider") String collectionsName,
                      @Qualifier("payoutsProvider") String payoutsName) {
        this.gateways = gateways;
        this.collectionsName = collectionsName;
        this.payoutsName = payoutsName;
    }

    @EventListener(ApplicationReadyEvent.class)
    void announce() {
        // In the log on every boot, because "which provider is live" is the first thing anybody
        // asks when money is not arriving, and the answer is otherwise three files away.
        log.info("Mobile money: collections via {}, payouts via {}", collectionsName, payoutsName);
    }

    @Override
    public void requestCollection(PaymentIntent intent) {
        gateway(collectionsName, "collections").requestCollection(intent);
    }

    @Override
    public void requestDisbursement(String providerRef, String msisdn, long amountUgx) {
        gateway(payoutsName, "payouts").requestDisbursement(providerRef, msisdn, amountUgx);
    }

    private MobileMoneyGateway gateway(String name, String what) {
        MobileMoneyGateway chosen = gateways.get(name);
        if (chosen == null) {
            // Failing here beats falling back to the mock, which would mean a production Deegee
            // quietly approving every payment without anyone paying anything.
            throw new IllegalStateException("No mobile money provider named '%s' for %s. Known: %s"
                    .formatted(name, what, gateways.keySet()));
        }
        return chosen;
    }
}
