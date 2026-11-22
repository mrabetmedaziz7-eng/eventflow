package com.iset.events.controller;

import com.iset.events.dto.AuditLogResponse;
import com.iset.events.service.AuditLogService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final AuditLogService auditLogService;

    public HistoryController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<AuditLogResponse> getHistory(Authentication authentication) {
        Long userId = Long.valueOf(authentication.getName());
        boolean isAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        if (isAdmin) {
            return auditLogService.findAll();
        }
        boolean isTeacher = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ENSEIGNANT"::equals);
        if (isTeacher) {
            return auditLogService.findForTeacher(userId);
        }
        return auditLogService.findMine(userId);
    }
}
