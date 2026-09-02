package com.minimercado.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class SettingsAdminAuthorizer {

    private final String configuredKey;

    public SettingsAdminAuthorizer(@Value("${app.admin-key:}") String configuredKey) {
        this.configuredKey = configuredKey;
    }

    public void authorize(String suppliedKey) {
        if (configuredKey == null || configuredKey.isBlank()) return;
        byte[] expected = configuredKey.getBytes(StandardCharsets.UTF_8);
        byte[] supplied = (suppliedKey == null ? "" : suppliedKey).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, supplied)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chave administrativa invalida");
        }
    }

    public boolean isConfigured() {
        return configuredKey != null && !configuredKey.isBlank();
    }
}
