package com.iset.events.controller;

import com.iset.events.dto.NotificationResponse;
import com.iset.events.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> findMine(Authentication authentication) {
        return notificationService.findForUser(currentUserId(authentication));
    }

    @PatchMapping("/{notificationId}/read")
    public NotificationResponse markRead(@PathVariable Long notificationId, Authentication authentication) {
        return notificationService.markRead(currentUserId(authentication), notificationId);
    }

    @PatchMapping("/read-all")
    public java.util.Map<String, Integer> markAllRead(Authentication authentication) {
        return java.util.Map.of("updatedCount", notificationService.markAllRead(currentUserId(authentication)));
    }

    private Long currentUserId(Authentication authentication) {
        return Long.valueOf(authentication.getName());
    }
}
