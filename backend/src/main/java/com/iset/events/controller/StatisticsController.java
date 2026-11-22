package com.iset.events.controller;

import com.iset.events.dto.statistics.AdminStatisticsResponse;
import com.iset.events.dto.statistics.StudentStatisticsResponse;
import com.iset.events.dto.statistics.TeacherStatisticsResponse;
import com.iset.events.service.StatisticsService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/dashboard", "/api/statistics"})
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/admin")
    public AdminStatisticsResponse admin() {
        return statisticsService.admin();
    }

    @GetMapping("/teacher")
    public TeacherStatisticsResponse teacher(Authentication authentication) {
        return statisticsService.teacher(Long.valueOf(authentication.getName()));
    }

    @GetMapping("/student")
    public StudentStatisticsResponse student(Authentication authentication) {
        return statisticsService.student(Long.valueOf(authentication.getName()));
    }
}
