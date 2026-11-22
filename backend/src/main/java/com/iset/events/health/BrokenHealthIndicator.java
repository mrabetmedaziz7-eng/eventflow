package com.iset.events.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Indicateur de santé volontairement défaillant pour la démonstration CI rouge.
 */
@Component
public class BrokenHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        return Health.down().withDetail("database", "down").build();
    }
}
