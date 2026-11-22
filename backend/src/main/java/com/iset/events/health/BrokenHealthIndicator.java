package com.iset.events.health;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Indicateur de santé volontairement défaillant (v1.1.0) pour la démo de rollback.
 */
@Component
public class BrokenHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(BrokenHealthIndicator.class);

    @Override
    public Health health() {
        log.error("Healthcheck /health en echec simule (v1.1.0) : retour HTTP 500 (database=down)");
        return Health.down().withDetail("database", "down").build();
    }
}
