package app.deegee.api.wallet;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Stand-in for a real provider until one is signed. With {@code mock-auto-approve} on, it "approves"
 * every top-up after a short delay, as if the user entered their PIN. Otherwise approve or decline a
 * top-up by calling the mock webhook (see WebhookController).
 */
@Component
class MockMobileMoneyGateway implements MobileMoneyGateway {

    private static final Logger log = LoggerFactory.getLogger(MockMobileMoneyGateway.class);

    private final PaymentsProperties props;
    private final ApplicationEventPublisher events;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "mock-mobile-money");
        t.setDaemon(true);
        return t;
    });

    MockMobileMoneyGateway(PaymentsProperties props, ApplicationEventPublisher events) {
        this.props = props;
        this.events = events;
    }

    @Override
    public void requestCollection(PaymentIntent intent) {
        log.info("Mock mobile money: PIN prompt for UGX {} sent to {} (ref {})", intent.getAmountUgx(), intent.getMsisdn(), intent.getProviderRef());
        answerLater(new CollectionResult(intent.getProviderRef(), true));
    }

    @Override
    public void requestDisbursement(String providerRef, String msisdn, long amountUgx) {
        log.info("Mock mobile money: sending UGX {} to {} (ref {})", amountUgx, msisdn, providerRef);
        answerLater(new DisbursementResult(providerRef, true));
    }

    /** With auto-approve on, "the provider" says yes after a short delay. Otherwise tests answer through the mock webhook. */
    private void answerLater(Object result) {
        if (!props.mockAutoApprove()) return;
        Runnable answer = () -> scheduler.schedule(() -> events.publishEvent(result), props.mockApproveDelay().toMillis(), TimeUnit.MILLISECONDS);
        // Only after the request is committed; otherwise the answer could arrive before the row exists.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() { answer.run(); }
            });
        } else {
            answer.run();
        }
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }
}
