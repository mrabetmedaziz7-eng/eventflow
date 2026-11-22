package com.iset.events.service;

import com.iset.events.dto.auth.AuthResponse;
import com.iset.events.dto.auth.LoginRequest;
import com.iset.events.dto.auth.RegisterRequest;
import com.iset.events.dto.auth.UserResponse;
import com.iset.events.entity.User;
import com.iset.events.entity.Notification;
import com.iset.events.entity.UserRole;
import com.iset.events.entity.UserStatus;
import com.iset.events.exception.AccountNotActiveException;
import com.iset.events.exception.EmailAlreadyRegisteredException;
import com.iset.events.exception.PasswordTooLongException;
import com.iset.events.exception.RegistrationRoleNotAllowedException;
import com.iset.events.mapper.UserMapper;
import com.iset.events.repository.UserRepository;
import com.iset.events.repository.NotificationRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final UserMapper userMapper;

    public AuthService(
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            UserMapper userMapper
    ) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.userMapper = userMapper;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (request.role() == UserRole.ADMIN) {
            throw new RegistrationRoleNotAllowedException();
        }
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new PasswordTooLongException();
        }

        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyRegisteredException();
        }

        User user = new User(
                request.firstName().trim(),
                request.lastName().trim(),
                email,
                passwordEncoder.encode(request.password()),
                request.role(),
                UserStatus.EN_ATTENTE
        );
        User savedUser = userRepository.save(user);
        userRepository.findAllByRole(UserRole.ADMIN).forEach(administrator ->
                notificationRepository.save(new Notification(
                        administrator.getId(),
                        "REGISTRATION_REQUEST",
                        "Nouvelle demande de compte",
                        savedUser.getFirstName() + " " + savedUser.getLastName() + " demande un compte " + savedUser.getRole() + "."
                ))
        );
        return userMapper.toResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Email ou mot de passe invalide."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Email ou mot de passe invalide.");
        }
        if (user.getStatus() != UserStatus.ACTIF) {
            throw new AccountNotActiveException();
        }

        return jwtTokenService.issueFor(user);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
