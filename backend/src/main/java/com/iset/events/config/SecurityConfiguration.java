package com.iset.events.config;

import com.iset.events.security.EventOwnerAuthorizationManager;
import com.iset.events.security.ActiveUserJwtAuthenticationConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    EventOwnerAuthorizationManager eventOwnerAuthorizationManager(JdbcTemplate jdbcTemplate) {
        return new EventOwnerAuthorizationManager(jdbcTemplate);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String configuredOrigins) {
        List<String> origins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();
        if (origins.isEmpty() || origins.contains("*")) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS doit contenir une ou plusieurs origines explicites.");
        }

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Payment-Secret"));
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            EventOwnerAuthorizationManager eventOwnerAuthorizationManager,
            ActiveUserJwtAuthenticationConverter activeUserJwtAuthenticationConverter,
            CorsConfigurationSource corsConfigurationSource
    ) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .oauth2ResourceServer(resourceServer -> resourceServer.jwt(jwt -> jwt.jwtAuthenticationConverter(activeUserJwtAuthenticationConverter)))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/teacher/**").hasRole("ENSEIGNANT")
                        .requestMatchers("/api/dashboard/admin", "/api/statistics/admin").hasRole("ADMIN")
                        .requestMatchers("/api/dashboard/teacher", "/api/statistics/teacher").hasRole("ENSEIGNANT")
                        .requestMatchers("/api/dashboard/student", "/api/statistics/student").hasRole("ETUDIANT")
                        .requestMatchers("/api/history").hasAnyRole("ADMIN", "ENSEIGNANT", "ETUDIANT")
                        .requestMatchers("/api/users/**")
                        .hasAnyRole("ADMIN", "ENSEIGNANT", "ETUDIANT")
                        .requestMatchers(HttpMethod.GET, "/api/events/{eventId}/participants/**", "/api/events/{eventId}/statistics")
                        .access(eventOwnerAuthorizationManager)
                        .requestMatchers(HttpMethod.GET, "/api/events/mine").hasRole("ENSEIGNANT")
                        .requestMatchers(HttpMethod.PUT, "/api/events/{eventId}", "/api/events/{eventId}/**")
                        .access(eventOwnerAuthorizationManager)
                        .requestMatchers(HttpMethod.PATCH, "/api/events/{eventId}", "/api/events/{eventId}/**")
                        .access(eventOwnerAuthorizationManager)
                        .requestMatchers(HttpMethod.DELETE, "/api/events/{eventId}", "/api/events/{eventId}/**")
                        .access(eventOwnerAuthorizationManager)
                        .requestMatchers(HttpMethod.POST, "/api/events").hasRole("ENSEIGNANT")
                        .requestMatchers(HttpMethod.POST, "/api/events/{eventId}/**").access(eventOwnerAuthorizationManager)
                        .requestMatchers(HttpMethod.POST, "/api/payments/*/result").permitAll()
                        .requestMatchers("/api/reservations/**", "/api/payments/**").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.GET, "/api/notifications/**")
                        .hasAnyRole("ADMIN", "ENSEIGNANT", "ETUDIANT")
                        .requestMatchers(HttpMethod.PATCH, "/api/notifications/{notificationId}/read")
                        .hasAnyRole("ADMIN", "ENSEIGNANT", "ETUDIANT")
                        .requestMatchers(HttpMethod.PATCH, "/api/notifications/read-all")
                        .hasAnyRole("ADMIN", "ENSEIGNANT", "ETUDIANT")
                        .requestMatchers(HttpMethod.GET, "/api/events", "/api/events/{eventId}", "/api/events/{eventId}/actions")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/events/**")
                        .hasAnyRole("ADMIN", "ENSEIGNANT", "ETUDIANT")
                        .anyRequest().denyAll()
                );
        return http.build();
    }
}
