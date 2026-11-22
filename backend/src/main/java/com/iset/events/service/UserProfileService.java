package com.iset.events.service;

import com.iset.events.dto.auth.ChangePasswordRequest;
import com.iset.events.dto.auth.UpdateProfileRequest;
import com.iset.events.dto.auth.UserResponse;
import com.iset.events.entity.AuditLog;
import com.iset.events.entity.User;
import com.iset.events.exception.EmailAlreadyRegisteredException;
import com.iset.events.exception.PasswordTooLongException;
import com.iset.events.exception.UserNotFoundException;
import com.iset.events.mapper.UserMapper;
import com.iset.events.repository.AuditLogRepository;
import com.iset.events.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class UserProfileService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public UserProfileService(
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            PasswordEncoder passwordEncoder,
            UserMapper userMapper
    ) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
    }

    @Transactional(readOnly = true)
    public UserResponse getProfile(Long userId) {
        return userMapper.toResponse(findUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUser(userId);
        String firstName = request.firstName().trim();
        String lastName = request.lastName().trim();
        String email = (request.email() != null && !request.email().isBlank())
                ? request.email().trim().toLowerCase(java.util.Locale.ROOT)
                : user.getEmail();
        if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailIgnoreCaseAndIdNot(email, userId)) {
            throw new EmailAlreadyRegisteredException();
        }

        if (!firstName.equals(user.getFirstName()) || !lastName.equals(user.getLastName()) || !email.equals(user.getEmail())) {
            user.updateProfile(firstName, lastName, email);
            userRepository.save(user);
            auditLogRepository.save(new AuditLog(userId, "USER_PROFILE_UPDATED", "USER", userId, "L'utilisateur a modifié son profil."));
        }
        return userMapper.toResponse(user);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = findUser(userId);
        if (request.currentPassword().getBytes(StandardCharsets.UTF_8).length > 72
                || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Le mot de passe actuel est invalide.");
        }
        if (request.newPassword().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new PasswordTooLongException();
        }

        user.updatePasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditLogRepository.save(new AuditLog(userId, "USER_PASSWORD_CHANGED", "USER", userId, "L'utilisateur a changé son mot de passe."));
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
    }
}
