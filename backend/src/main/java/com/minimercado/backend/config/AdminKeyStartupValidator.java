package com.minimercado.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile({"prod", "docker"})
@RequiredArgsConstructor
public class AdminKeyStartupValidator {

    private final SettingsAdminAuthorizer authorizer;

    @PostConstruct
    void validate() {
        if (!authorizer.isConfigured()) {
            throw new IllegalStateException("APP_ADMIN_KEY deve ser configurada neste ambiente");
        }
    }
}
