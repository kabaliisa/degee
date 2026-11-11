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
        if (!props.mockAutoApprove()) return;
        String ref = intent.getProviderRef();
        Runnable approve = () -> scheduler.schedule(
                () -> events.publishEvent(new CollectionResult(ref, true)),
                props.mockApproveDelay().toMillis(), TimeUnit.MILLISECONDS);
        // Only after the intent is committed; otherwise the approval could arrive before the row exists.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() { approve.run(); }
            });
        } else {
            approve.run();
        }
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }
}
