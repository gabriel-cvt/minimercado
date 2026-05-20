package com.minimercado.backend.controller;

import com.minimercado.backend.dto.dashboard.DashboardSummaryDTO;
import com.minimercado.backend.service.dashboard.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.minimercado.backend.controller.ApiRoutes.API_DASHBOARD_SUMMARY;

@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping(API_DASHBOARD_SUMMARY)
    public ResponseEntity<DashboardSummaryDTO> getSummary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }
}
