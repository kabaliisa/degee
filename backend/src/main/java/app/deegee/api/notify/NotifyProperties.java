package app.deegee.api.notify;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param provider "log" writes notifications to the log and sends nothing; "expo" sends them
 * @param expoUrl  Expo's send endpoint, overridable so a test can point it somewhere it controls
 */
@ConfigurationProperties(prefix = "deegee.notify")
public record NotifyProperties(String provider, String expoUrl) {

    /** The Android channel. The app creates it under this name; Expo messages name it. */
    public static final String CHANNEL = "deegee-money";
}
