package com.iset.events.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

import java.util.function.Supplier;

public class EventOwnerAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private final JdbcTemplate jdbcTemplate;

    public EventOwnerAuthorizationManager(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public AuthorizationDecision check(
            Supplier<Authentication> authenticationSupplier,
            RequestAuthorizationContext context
    ) {
        Authentication authentication = authenticationSupplier.get();
        String eventId = context.getVariables().get("eventId");
        if (eventId == null || !authentication.isAuthenticated()
                || !authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ENSEIGNANT"))) {
            return new AuthorizationDecision(false);
        }

        try {
            Long teacherId = Long.valueOf(authentication.getName());
            Long requestedEventId = Long.valueOf(eventId);
            Boolean ownsEvent = jdbcTemplate.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM events WHERE id = ? AND teacher_id = ?)",
                    Boolean.class,
                    requestedEventId,
                    teacherId
            );
            return new AuthorizationDecision(Boolean.TRUE.equals(ownsEvent));
        } catch (NumberFormatException exception) {
            return new AuthorizationDecision(false);
        }
    }
}
