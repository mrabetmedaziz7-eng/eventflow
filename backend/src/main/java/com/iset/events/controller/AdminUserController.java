package com.iset.events.controller;

import com.iset.events.dto.auth.ApproveUserRequest;
import com.iset.events.dto.auth.UpdateUserAccountRequest;
import com.iset.events.dto.auth.UserResponse;
import com.iset.events.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public List<UserResponse> findAll() {
        return adminUserService.findAll();
    }

    @GetMapping("/pending")
    public List<UserResponse> findPending() {
        return adminUserService.findPending();
    }

    @PatchMapping("/{userId}")
    public UserResponse update(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserAccountRequest request,
            Authentication authentication
    ) {
        return adminUserService.update(currentUserId(authentication), userId, request);
    }

    @PatchMapping({"/{userId}/validate", "/{userId}/approve"})
    public UserResponse approve(
            @PathVariable Long userId,
            @Valid @RequestBody ApproveUserRequest request,
            Authentication authentication
    ) {
        return adminUserService.approve(currentUserId(authentication), userId, request);
    }

    @PatchMapping("/{userId}/status")
    public UserResponse updateStatus(
            @PathVariable Long userId,
            @Valid @RequestBody com.iset.events.dto.auth.UpdateUserStatusRequest request,
            Authentication authentication
    ) {
        if (request.status() == com.iset.events.entity.UserStatus.ACTIF) {
            return adminUserService.activate(currentUserId(authentication), userId);
        } else if (request.status() == com.iset.events.entity.UserStatus.DESACTIVE) {
            return adminUserService.deactivate(currentUserId(authentication), userId);
        } else if (request.status() == com.iset.events.entity.UserStatus.REFUSE) {
            return adminUserService.reject(currentUserId(authentication), userId);
        } else {
            return adminUserService.update(currentUserId(authentication), userId,
                    new UpdateUserAccountRequest(null, request.status()));
        }
    }

    @PatchMapping("/{userId}/reject")
    public UserResponse reject(@PathVariable Long userId, Authentication authentication) {
        return adminUserService.reject(currentUserId(authentication), userId);
    }

    @PatchMapping("/{userId}/activate")
    public UserResponse activate(@PathVariable Long userId, Authentication authentication) {
        return adminUserService.activate(currentUserId(authentication), userId);
    }

    @PatchMapping("/{userId}/deactivate")
    public UserResponse deactivate(@PathVariable Long userId, Authentication authentication) {
        return adminUserService.deactivate(currentUserId(authentication), userId);
    }

    private Long currentUserId(Authentication authentication) {
        return Long.valueOf(authentication.getName());
    }
}
