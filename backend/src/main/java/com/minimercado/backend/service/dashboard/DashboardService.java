package com.minimercado.backend.service.dashboard;

import com.minimercado.backend.dto.dashboard.DashboardSummaryDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO;

public interface DashboardService {
    DashboardSummaryDTO getSummary();

    DashboardAnalyticsDTO getAnalytics();
}
