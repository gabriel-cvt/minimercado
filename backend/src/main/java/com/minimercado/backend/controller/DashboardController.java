package com.minimercado.backend.controller;

import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO;
import com.minimercado.backend.dto.dashboard.DashboardSummaryDTO;
import com.minimercado.backend.service.dashboard.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.minimercado.backend.controller.ApiRoutes.API_DASHBOARD_ANALYTICS;
import static com.minimercado.backend.controller.ApiRoutes.API_DASHBOARD_SUMMARY;
import static com.minimercado.backend.controller.ApiRoutes.API_DASHBOARD_TOP_PRODUCTS;

@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping(API_DASHBOARD_SUMMARY)
    public ResponseEntity<DashboardSummaryDTO> getSummary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }

    @GetMapping(API_DASHBOARD_ANALYTICS)
    public ResponseEntity<DashboardAnalyticsDTO> getAnalytics() {
        return ResponseEntity.ok(dashboardService.getAnalytics());
    }

    @GetMapping(API_DASHBOARD_TOP_PRODUCTS)
    public ResponseEntity<List<DashboardAnalyticsDTO.TopProductDTO>> getTopProducts() {
        return ResponseEntity.ok(dashboardService.getTopProducts());
    }
}
