package app.deegee.api.demo;

import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;

/**
 * Puts the demo catalogue into a database that has none.
 *
 * <p>This used to be two Flyway migrations, which meant every database got five invented artists
 * and sixteen AI-generated songs whether or not anybody wanted them, and a real visitor's first
 * sight of Deegee was music nobody made. It is now one setting, off by default: on for a laptop or
 * a demo, off for anything a stranger can reach.
 *
 * <p>It only ever adds to an empty catalogue. Running against a database where a real artist has
 * published would mix invented acts in among them with no way to tell which was which, so it
 * checks first and does nothing.
 */
@Component
@ConditionalOnProperty(name = "deegee.demo.catalogue", havingValue = "true")
class DemoCatalogue {

    private static final Logger log = LoggerFactory.getLogger(DemoCatalogue.class);
    private static final String SCRIPT = "demo/catalogue.sql";

    private final JdbcTemplate jdbc;

    DemoCatalogue(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    /**
     * After the app is up rather than during startup: a demo catalogue is never worth refusing to
     * boot over, so a failure here is logged and the app serves an empty catalogue instead.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void load() {
        try {
            Integer artists = jdbc.queryForObject("SELECT count(*) FROM artists", Integer.class);
            if (artists != null && artists > 0) {
                log.info("demo catalogue: {} artists already here, leaving them alone", artists);
                return;
            }
            String sql = StreamUtils.copyToString(new ClassPathResource(SCRIPT).getInputStream(), StandardCharsets.UTF_8);
            jdbc.execute(sql);
            log.info("demo catalogue loaded: deegee.demo.catalogue is on, so this database is not production");
        } catch (Exception e) {
            log.warn("demo catalogue not loaded: {}", e.getMessage());
        }
    }
}
