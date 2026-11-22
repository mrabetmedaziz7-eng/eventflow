package com.iset.events.controller;

import com.iset.events.dto.AuditLogResponse;
import com.iset.events.service.AuditLogService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users/me/history")
public class UserHistoryController {

    private final AuditLogService auditLogService;

    public UserHistoryController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<AuditLogResponse> findMine(Authentication authentication) {
        return auditLogService.findMine(Long.valueOf(authentication.getName()));
    }
}
