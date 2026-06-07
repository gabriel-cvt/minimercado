package com.minimercado.backend.service.dashboard;

import com.minimercado.backend.dto.dashboard.DashboardSummaryDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO;

import java.util.List;

public interface DashboardService {
    DashboardSummaryDTO getSummary();

    DashboardAnalyticsDTO getAnalytics();

    List<DashboardAnalyticsDTO.TopProductDTO> getTopProducts();
}
