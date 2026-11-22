package com.iset.events.service;

import com.iset.events.dto.auth.ApproveUserRequest;
import com.iset.events.dto.auth.UpdateUserAccountRequest;
import com.iset.events.dto.auth.UserResponse;
import com.iset.events.entity.AuditLog;
import com.iset.events.entity.Notification;
import com.iset.events.entity.User;
import com.iset.events.entity.UserRole;
import com.iset.events.entity.UserStatus;
import com.iset.events.exception.InvalidAccountRoleException;
import com.iset.events.exception.InvalidAccountStateException;
import com.iset.events.exception.LastActiveAdminException;
import com.iset.events.exception.UserNotFoundException;
import com.iset.events.mapper.UserMapper;
import com.iset.events.repository.AuditLogRepository;
import com.iset.events.repository.NotificationRepository;
import com.iset.events.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserMapper userMapper;

    public AdminUserService(
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            AuditLogRepository auditLogRepository,
            UserMapper userMapper
    ) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.userMapper = userMapper;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(userMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findPending() {
        return userRepository.findAllByStatusOrderByCreatedAtDesc(UserStatus.EN_ATTENTE).stream()
                .map(userMapper::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse approve(Long administratorId, Long userId, ApproveUserRequest request) {
        if (request.role() != UserRole.ETUDIANT && request.role() != UserRole.ENSEIGNANT) {
            throw new InvalidAccountRoleException("Un compte approuvé doit avoir le rôle ETUDIANT ou ENSEIGNANT.");
        }
        User user = findUser(userId);
        requirePending(user);
        return updateAccount(administratorId, user, request.role(), UserStatus.ACTIF);
    }

    @Transactional
    public UserResponse reject(Long administratorId, Long userId) {
        User user = findUser(userId);
        requirePending(user);
        return updateAccount(administratorId, user, user.getRole(), UserStatus.REFUSE);
    }

    @Transactional
    public UserResponse activate(Long administratorId, Long userId) {
        User user = findUser(userId);
        if (user.getStatus() == UserStatus.ACTIF || user.getStatus() == UserStatus.EN_ATTENTE) {
            throw new InvalidAccountStateException("Seuls les comptes refusés ou désactivés peuvent être réactivés ici.");
        }
        return updateAccount(administratorId, user, user.getRole(), UserStatus.ACTIF);
    }

    @Transactional
    public UserResponse deactivate(Long administratorId, Long userId) {
        User user = findUser(userId);
        if (user.getStatus() == UserStatus.DESACTIVE) {
            throw new InvalidAccountStateException("Ce compte est déjà désactivé.");
        }
        return updateAccount(administratorId, user, user.getRole(), UserStatus.DESACTIVE);
    }

    @Transactional
    public UserResponse update(Long administratorId, Long userId, UpdateUserAccountRequest request) {
        User user = findUser(userId);
        return updateAccount(administratorId, user, request.role(), request.status());
    }

    private UserResponse updateAccount(Long administratorId, User user, UserRole role, UserStatus status) {
        if (role == UserRole.ADMIN && user.getRole() != UserRole.ADMIN) {
            throw new InvalidAccountRoleException("Le rôle ADMIN est réservé au compte administrateur initial.");
        }

        UserRole previousRole = user.getRole();
        UserStatus previousStatus = user.getStatus();
        boolean changed = previousRole != role || previousStatus != status;
        boolean removesLastActiveAdmin = previousRole == UserRole.ADMIN
                && previousStatus == UserStatus.ACTIF
                && (role != UserRole.ADMIN || status != UserStatus.ACTIF)
                && userRepository.countByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIF) <= 1;
        if (removesLastActiveAdmin) {
            throw new LastActiveAdminException();
        }

        if (!changed) {
            return userMapper.toResponse(user);
        }

        user.updateAccount(role, status);
        User savedUser = userRepository.save(user);
        String actionType = determineAction(previousRole, role, previousStatus, status);
        String description = "Rôle " + previousRole + " -> " + role + "; statut " + previousStatus + " -> " + status + ".";
        auditLogRepository.save(new AuditLog(administratorId, actionType, "USER", savedUser.getId(), description));
        notificationRepository.save(new Notification(
                savedUser.getId(),
                actionType,
                notificationTitle(actionType),
                notificationMessage(actionType, role)
        ));
        return userMapper.toResponse(savedUser);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
    }

    private void requirePending(User user) {
        if (user.getStatus() != UserStatus.EN_ATTENTE) {
            throw new InvalidAccountStateException("Cette opération est réservée aux demandes EN_ATTENTE.");
        }
    }

    private String determineAction(UserRole oldRole, UserRole newRole, UserStatus oldStatus, UserStatus newStatus) {
        if (oldStatus == UserStatus.EN_ATTENTE && newStatus == UserStatus.ACTIF) {
            return "USER_APPROVED";
        }
        if (oldStatus == UserStatus.EN_ATTENTE && newStatus == UserStatus.REFUSE) {
            return "USER_REJECTED";
        }
        if (oldStatus != UserStatus.ACTIF && newStatus == UserStatus.ACTIF) {
            return "USER_ACTIVATED";
        }
        if (oldStatus == UserStatus.ACTIF && newStatus != UserStatus.ACTIF) {
            return "USER_DEACTIVATED";
        }
        if (oldRole != newRole) {
            return "USER_ROLE_UPDATED";
        }
        return "USER_ACCOUNT_UPDATED";
    }

    private String notificationTitle(String actionType) {
        return switch (actionType) {
            case "USER_APPROVED" -> "Compte approuvé";
            case "USER_REJECTED" -> "Demande refusée";
            case "USER_ACTIVATED" -> "Compte activé";
            case "USER_DEACTIVATED" -> "Compte désactivé";
            case "USER_ROLE_UPDATED" -> "Rôle mis à jour";
            default -> "Compte mis à jour";
        };
    }

    private String notificationMessage(String actionType, UserRole role) {
        return switch (actionType) {
            case "USER_APPROVED" -> "Votre demande est approuvée. Votre rôle est " + role + ".";
            case "USER_REJECTED" -> "Votre demande de compte a été refusée.";
            case "USER_ACTIVATED" -> "Votre compte est maintenant actif.";
            case "USER_DEACTIVATED" -> "Votre compte a été désactivé.";
            case "USER_ROLE_UPDATED" -> "Votre rôle a été mis à jour : " + role + ".";
            default -> "Les informations de votre compte ont été mises à jour.";
        };
    }
}
