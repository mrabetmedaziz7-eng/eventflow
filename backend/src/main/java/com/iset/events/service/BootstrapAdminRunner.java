package com.iset.events.service;

import com.iset.events.entity.User;
import com.iset.events.entity.UserRole;
import com.iset.events.entity.UserStatus;
import com.iset.events.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class BootstrapAdminRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public BootstrapAdminRunner(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin.email:}") String adminEmail,
            @Value("${app.bootstrap.admin.password:}") String adminPassword
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (adminEmail.isBlank() && adminPassword.isBlank()) {
            return;
        }
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            throw new IllegalStateException("ADMIN_EMAIL et ADMIN_PASSWORD doivent être configurés ensemble.");
        }
        if (adminPassword.length() < 12 || adminPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException("ADMIN_PASSWORD doit contenir de 12 à 72 octets UTF-8.");
        }

        String normalizedEmail = adminEmail.trim().toLowerCase(Locale.ROOT);
        userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresentOrElse(user -> {
            if (user.getRole() != UserRole.ADMIN) {
                throw new IllegalStateException("ADMIN_EMAIL correspond déjà à un compte non administrateur.");
            }
        }, () -> userRepository.save(new User(
                "Administrateur",
                "Eventflow",
                normalizedEmail,
                passwordEncoder.encode(adminPassword),
                UserRole.ADMIN,
                UserStatus.ACTIF
        )));
    }
}
