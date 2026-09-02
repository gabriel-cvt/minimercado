package com.minimercado.backend.controller;

import com.minimercado.backend.dto.settings.AppSettingsResponseDTO;
import com.minimercado.backend.dto.settings.AppSettingsUpdateDTO;
import com.minimercado.backend.service.settings.AppSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static com.minimercado.backend.controller.ApiRoutes.*;

@RestController
@RequiredArgsConstructor
public class AppSettingsController {

    private final AppSettingsService service;

    @GetMapping(API_SETTINGS_PUBLIC)
    public AppSettingsResponseDTO getPublicSettings() {
        return service.getPublicSettings();
    }

    @PutMapping(API_SETTINGS)
    public AppSettingsResponseDTO update(@RequestBody @Valid AppSettingsUpdateDTO data) {
        return service.update(data);
    }

    @PostMapping(API_SETTINGS_RESET)
    public AppSettingsResponseDTO reset() {
        return service.reset();
    }
}
