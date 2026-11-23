package app.deegee.api.notify;

import java.util.List;

/** Puts a notification on somebody's phone. */
public interface PushSender {

    /**
     * Sends what it can and reports the tokens that are dead, so the caller can forget them. Never
     * throws: a notification that can't be delivered must not disturb whatever caused it.
     *
     * @return the tokens the push service says are no longer registered
     */
    List<String> send(List<Push> pushes);

    /** One notification bound for one phone. */
    record Push(String token, Notification notification) {}
}
